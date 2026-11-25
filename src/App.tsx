import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, Download } from 'lucide-react';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { DownloadSection } from './components/DownloadSection';
import { Footer } from './components/Footer';
import { FreeServersSection } from './components/FreeServersSection';
import { HeroClientCard } from './components/HeroClientCard';
import { Navbar } from './components/Navbar';
import { SplitTunnelSection } from './components/SplitTunnelSection';
import { buildSingBoxConfig, formatSingBoxConfigJson } from './lib/configBuilder';
import { copyToClipboard, downloadBinaryFile, downloadTextFile } from './lib/download';
import {
  measureRealPingViaAgent,
  probeLocalAgent,
  startLocalAgentTunnel,
  stopLocalAgentTunnel,
  type LocalAgentHealth,
} from './lib/localBridge';
import {
  fetchLiveServersWithFallback,
  fetchWithTimeout,
} from './lib/liveFeedClient';
import {
  detectCurrentDevice,
  refineDeviceWithHighEntropy,
  type DesktopPlatform,
  type DetectedDevice,
} from './lib/platformDetect';
import { loadProfilesFromStorage, saveProfilesToStorage } from './lib/profiles';
import { buildDesktopBundleFiles } from './lib/pythonTemplates';
import { parseProxyUri } from './lib/uriParser';
import { createZipArchive } from './lib/zipBuilder';
import type {
  AppProfilesData,
  ConnectionState,
  ProxyNode,
  RoutingMode,
} from './types/network';

interface BackendPingResponse {
  ok: boolean;
  results?: Array<{
    id: string;
    latencyMs: number | null;
    resolvedIp: string | null;
    reachable: boolean;
  }>;
  measuredAt?: string;
}

export default function App() {
  const [profiles, setProfiles] = useState<AppProfilesData>(() => loadProfilesFromStorage());
  const [detectedDevice, setDetectedDevice] = useState<DetectedDevice>(() =>
    detectCurrentDevice(),
  );
  const [liveNodes, setLiveNodes] = useState<ProxyNode[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const [testingNodeIds, setTestingNodeIds] = useState<Record<string, boolean>>({});
  const [agentHealth, setAgentHealth] = useState<LocalAgentHealth | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState(false);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const [agentNotice, setAgentNotice] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void refineDeviceWithHighEntropy().then((refined) => {
      if (active) {
        setDetectedDevice(refined);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

  const fetchLiveNodes = useCallback(async (forceRefresh = false) => {
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const result = await fetchLiveServersWithFallback(forceRefresh);
      if (!result.ok || result.nodes.length === 0) {
        setLiveError(
          result.error ||
            'Tạm thời chưa tìm thấy máy chủ công cộng nào. Bạn có thể bấm Quét lại hoặc dán link VPS cá nhân.',
        );
        return;
      }
      setLiveNodes(result.nodes);
      setVerifiedAt(result.verifiedAt);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveNodes(false);
  }, [fetchLiveNodes]);

  const allNodes = useMemo(
    () => [...profiles.nodes, ...liveNodes],
    [profiles.nodes, liveNodes],
  );

  const activeNode = useMemo(
    () => allNodes.find((n) => n.id === profiles.activeNodeId) ?? allNodes[0] ?? null,
    [allNodes, profiles.activeNodeId],
  );

  useEffect(() => {
    if (connectionState !== 'connected') {
      setConnectedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setConnectedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [connectionState]);

  const pingNodesReal = useCallback(
    async (targets: ProxyNode[]) => {
      if (targets.length === 0) return;
      const flags: Record<string, boolean> = {};
      for (const node of targets) {
        flags[node.id] = true;
      }
      setTestingNodeIds((prev) => ({ ...prev, ...flags }));

      const now = new Date().toISOString();
      const latencyMap = new Map<string, { latencyMs: number | null; resolvedIp: string | null }>();

      try {
        if (agentHealth?.ok) {
          const results = await Promise.all(
            targets.map(async (node) => ({
              id: node.id,
              res: await measureRealPingViaAgent(node.server, node.port),
            })),
          );
          for (const item of results) {
            latencyMap.set(item.id, {
              latencyMs: item.res.latencyMs,
              resolvedIp: null,
            });
          }
        } else {
          const res = await fetchWithTimeout(
            '/api/servers/ping',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targets: targets.slice(0, 20).map((n) => ({
                  id: n.id,
                  server: n.server,
                  port: n.port,
                })),
              }),
            },
            15000,
          );
          if (res.ok) {
            const data = (await res.json()) as BackendPingResponse;
            if (data.ok && Array.isArray(data.results)) {
              for (const item of data.results) {
                latencyMap.set(item.id, {
                  latencyMs: item.latencyMs,
                  resolvedIp: item.resolvedIp,
                });
              }
            }
          }
        }

        const applyUpdate = (list: ProxyNode[]) =>
          list.map((node) => {
            const hit = latencyMap.get(node.id);
            if (!hit) return node;
            return {
              ...node,
              latencyMs: hit.latencyMs,
              exitIp: hit.resolvedIp ?? node.exitIp,
              lastTestedAt: now,
            };
          });

        setLiveNodes((prev) => applyUpdate(prev));
        setProfiles((prev) => ({
          ...prev,
          nodes: applyUpdate(prev.nodes),
        }));
        setVerifiedAt(now);
      } finally {
        setTestingNodeIds((prev) => {
          const next = { ...prev };
          for (const node of targets) {
            delete next[node.id];
          }
          return next;
        });
      }
    },
    [agentHealth?.ok],
  );

  async function connectToNode(targetNode: ProxyNode) {
    if (agentHealth?.ok) {
      setConnectionState('connecting');
      const cfg = buildSingBoxConfig(targetNode, profiles.routing);
      const res = await startLocalAgentTunnel(cfg, targetNode.name);
      if (res.ok) {
        setConnectionState('connected');
        setAgentNotice({ type: 'success', text: res.message });
      } else {
        setConnectionState('disconnected');
        setAgentNotice({ type: 'error', text: res.message });
      }
      return;
    }

    setAgentNotice({
      type: 'info',
      text: `Đã chọn máy chủ thật "${targetNode.name}" (${targetNode.exitIp || targetNode.server}:${targetNode.port}). Trình duyệt web không thể tự tạo card mạng TUN cho game trên Windows/macOS — hãy tải bộ cài PingGate bên dưới (đã nạp sẵn máy chủ này) hoặc sao chép link để chạy ngay trên máy tính.`,
    });
  }

  async function handleToggleConnect() {
    if (!activeNode) return;

    if (!agentHealth?.ok) {
      if (detectedDevice.os === 'linux') {
        handleDownloadConfigOnly();
        setAgentNotice({
          type: 'info',
          text: 'Đã nhận diện máy chạy Linux — đã xuất sẵn tệp config.json kèm máy chủ đang chọn để bạn chạy trực tiếp bằng lệnh sing-box run -c config.json.',
        });
        return;
      }
      handleDownloadInstaller(detectedDevice.recommendedBundle);
      return;
    }

    if (connectionState === 'connected') {
      setConnectionState('disconnecting');
      const res = await stopLocalAgentTunnel();
      setConnectionState('disconnected');
      setAgentNotice({
        type: res.ok ? 'info' : 'error',
        text: res.message,
      });
      return;
    }

    if (connectionState === 'disconnected') {
      await connectToNode(activeNode);
    }
  }

  async function handleSelectNode(nodeId: string) {
    const target = allNodes.find((n) => n.id === nodeId);
    if (!target) return;
    setProfiles((prev) => ({ ...prev, activeNodeId: nodeId }));

    if (agentHealth?.ok) {
      if (activeNode?.id === nodeId && connectionState === 'connected') {
        return;
      }
      await connectToNode(target);
      return;
    }

    setAgentNotice({
      type: 'info',
      text: `Đã chọn "${target.name}" làm máy chủ mặc định cho bộ cài Desktop và tệp config.json.`,
    });
  }

  async function handleCopyNodeUri(node: ProxyNode) {
    const ok = await copyToClipboard(node.rawUri);
    if (ok) {
      setCopiedNodeId(node.id);
      window.setTimeout(() => {
        setCopiedNodeId((current) => (current === node.id ? null : current));
      }, 2000);
    }
  }

  async function handleProbeLocalAgent() {
    setIsProbingAgent(true);
    const res = await probeLocalAgent();
    setIsProbingAgent(false);
    if (res.connected) {
      setAgentHealth(res.health);
      if (res.health.running) {
        setConnectionState('connected');
      }
      setAgentNotice({
        type: 'success',
        text: `Đã liên kết với ứng dụng PingGate trên máy tính (${res.health.platform}). Bạn có thể bật/tắt VPN thật cho game ngay trên website này.`,
      });
    } else {
      setAgentHealth(null);
      setConnectionState('disconnected');
      setAgentNotice({ type: 'error', text: res.error });
    }
  }

  function handleDownloadInstaller(platform: DesktopPlatform) {
    const bundleProfiles: AppProfilesData = {
      ...profiles,
      activeNodeId: activeNode?.id ?? null,
      nodes: allNodes,
    };
    const entries = buildDesktopBundleFiles(bundleProfiles, activeNode, platform);
    const zipBytes = createZipArchive(entries);
    const filename =
      platform === 'windows' ? 'PingGate-Setup-Windows.zip' : 'PingGate-Setup-macOS.zip';
    downloadBinaryFile(filename, zipBytes, 'application/zip');
    setAgentNotice({
      type: 'success',
      text: `Đã tải ${filename} kèm ${allNodes.length} máy chủ đã kiểm tra TCP (mặc định: ${
        activeNode?.name ?? 'tự chọn'
      }). Giải nén và nhấp đúp ${
        platform === 'windows' ? 'PingGate-Windows.bat' : 'PingGate-macOS.command'
      } để chạy sing-box TUN thật trên máy tính.`,
    });
  }

  function handleDownloadConfigOnly() {
    const json = formatSingBoxConfigJson(activeNode, profiles.routing);
    downloadTextFile('config.json', json, 'application/json;charset=utf-8');
  }

  function handleAddUri(rawUri: string): { ok: boolean; message: string } {
    const parsed = parseProxyUri(rawUri);
    if (!parsed.ok) {
      return { ok: false, message: parsed.error };
    }
    const newNode: ProxyNode = {
      ...parsed.node,
      isFreeTier: false,
    };
    setProfiles((prev) => ({
      ...prev,
      activeNodeId: newNode.id,
      nodes: [newNode, ...prev.nodes],
    }));
    void pingNodesReal([newNode]);
    return {
      ok: true,
      message: `Đã thêm máy chủ "${newNode.name}" (${newNode.protocol.toUpperCase()}) và đang đo TCP thực tế...`,
    };
  }

  function handleDeleteNode(nodeId: string) {
    setProfiles((prev) => {
      const remaining = prev.nodes.filter((n) => n.id !== nodeId);
      const nextActive =
        prev.activeNodeId === nodeId
          ? (remaining[0]?.id ?? liveNodes[0]?.id ?? null)
          : prev.activeNodeId;
      return {
        ...prev,
        activeNodeId: nextActive,
        nodes: remaining,
      };
    });
  }

  async function handleTestAllPings() {
    await pingNodesReal(allNodes);
  }

  function handleSelectLowestPing() {
    const measured = allNodes.filter((n) => n.latencyMs !== null);
    if (measured.length === 0) return;
    const best = measured.reduce((min, cur) =>
      (cur.latencyMs ?? Infinity) < (min.latencyMs ?? Infinity) ? cur : min,
    );
    setProfiles((prev) => ({ ...prev, activeNodeId: best.id }));
  }

  function handleChangeMode(mode: RoutingMode) {
    setProfiles((prev) => ({
      ...prev,
      routing: { ...prev.routing, mode },
    }));
  }

  function handleToggleGame(gameId: string) {
    setProfiles((prev) => ({
      ...prev,
      routing: {
        ...prev.routing,
        games: prev.routing.games.map((g) =>
          g.id === gameId ? { ...g, enabled: !g.enabled } : g,
        ),
      },
    }));
  }

  function handleAddCustomProcess(raw: string): { ok: boolean; error?: string } {
    const cleaned = raw.trim();
    if (!cleaned) {
      return { ok: false, error: 'Vui lòng nhập tên tệp game (ví dụ: Minecraft.exe).' };
    }
    if (
      profiles.routing.customProcesses.some(
        (p) => p.toLowerCase() === cleaned.toLowerCase(),
      )
    ) {
      return { ok: false, error: 'Game này đã có trong danh sách tách luồng.' };
    }
    setProfiles((prev) => ({
      ...prev,
      routing: {
        ...prev.routing,
        customProcesses: [...prev.routing.customProcesses, cleaned],
      },
    }));
    return { ok: true };
  }

  function handleRemoveCustomProcess(processName: string) {
    setProfiles((prev) => ({
      ...prev,
      routing: {
        ...prev.routing,
        customProcesses: prev.routing.customProcesses.filter((p) => p !== processName),
      },
    }));
  }

  function scrollToDownload() {
    const el = document.getElementById('download');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const liveAliveCount = allNodes.filter((n) => n.latencyMs !== null).length;

  return (
    <div id="top" className="min-h-screen bg-[#0B0D14] text-slate-100">
      <Navbar
        onDownloadClick={scrollToDownload}
        downloadLabel={detectedDevice.shortDownloadLabel}
      />

      <main>
        {/* Proton-inspired Split Hero Section */}
        <section className="relative overflow-hidden py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Clear Value Proposition & Auto-Detected Primary CTA */}
              <div className="lg:col-span-6 space-y-6">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                  Giảm ping game, tách luồng mượt bằng sing-box TUN
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  Tự động quét và kiểm tra TCP thực tế các máy chủ miễn phí còn sống, hỗ trợ dán link VPS riêng và nạp thẳng vào bộ cài Desktop để định tuyến riêng game (Roblox, Valorant, Genshin Impact) mà không làm chậm trình duyệt hay Discord.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (detectedDevice.os === 'linux') {
                        handleDownloadConfigOnly();
                      } else {
                        handleDownloadInstaller(detectedDevice.recommendedBundle);
                      }
                    }}
                    className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>{detectedDevice.ctaLabel}</span>
                  </button>
                  <a
                    href="#download"
                    className="inline-flex h-12 items-center gap-1.5 px-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <span>{detectedDevice.otherPlatformLabel}</span>
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>

                {/* Unboxed quiet metadata trust line (Zero-Pill Discipline) */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-xs text-slate-400">
                  <span>Tự nhận diện: {detectedDevice.osLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isLoadingLive
                      ? 'Đang kiểm tra TCP máy chủ trực tiếp...'
                      : `${liveAliveCount} máy chủ đã xác thực TCP sống`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Windows & macOS</span>
                </div>
              </div>

              {/* Right Column: Honest Live Server Control Widget */}
              <div className="lg:col-span-6">
                <HeroClientCard
                  nodes={allNodes}
                  activeNode={activeNode}
                  routing={profiles.routing}
                  connectionState={connectionState}
                  connectedSeconds={connectedSeconds}
                  agentHealth={agentHealth}
                  isProbingAgent={isProbingAgent}
                  isLoadingLive={isLoadingLive}
                  copiedNodeId={copiedNodeId}
                  recommendedPlatformLabel={
                    detectedDevice.os === 'linux'
                      ? 'Xuất config.json'
                      : detectedDevice.shortDownloadLabel
                  }
                  onToggleConnect={handleToggleConnect}
                  onSelectNode={handleSelectNode}
                  onCopyNodeUri={handleCopyNodeUri}
                  onProbeAgent={handleProbeLocalAgent}
                />
              </div>
            </div>
          </div>
        </section>

        <FreeServersSection
          nodes={allNodes}
          activeNodeId={activeNode?.id ?? null}
          connectionState={connectionState}
          agentConnected={Boolean(agentHealth?.ok)}
          testingNodeIds={testingNodeIds}
          isLoadingLive={isLoadingLive}
          liveError={liveError}
          verifiedAt={verifiedAt}
          copiedNodeId={copiedNodeId}
          onSelectNode={handleSelectNode}
          onCopyNodeUri={handleCopyNodeUri}
          onDeleteNode={handleDeleteNode}
          onAddUri={handleAddUri}
          onTestAllPings={handleTestAllPings}
          onRefreshLiveNodes={() => void fetchLiveNodes(true)}
          onSelectLowestPing={handleSelectLowestPing}
        />

        <SplitTunnelSection
          activeNode={activeNode}
          routing={profiles.routing}
          onChangeMode={handleChangeMode}
          onToggleGame={handleToggleGame}
          onAddCustomProcess={handleAddCustomProcess}
          onRemoveCustomProcess={handleRemoveCustomProcess}
        />

        <CapabilitiesSection />

        <DownloadSection
          activeNode={activeNode}
          routing={profiles.routing}
          detectedDevice={detectedDevice}
          agentHealth={agentHealth}
          isProbingAgent={isProbingAgent}
          agentNotice={agentNotice}
          onDownloadInstaller={handleDownloadInstaller}
          onDownloadConfigOnly={handleDownloadConfigOnly}
          onProbeAgent={handleProbeLocalAgent}
        />
      </main>

      <Footer />
    </div>
  );
}
