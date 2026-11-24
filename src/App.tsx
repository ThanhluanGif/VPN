import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, Download } from 'lucide-react';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { DownloadSection } from './components/DownloadSection';
import { Footer } from './components/Footer';
import { FreeServersSection } from './components/FreeServersSection';
import { HeroClientCard } from './components/HeroClientCard';
import { Navbar } from './components/Navbar';
import { SplitTunnelSection } from './components/SplitTunnelSection';
import { buildSingBoxConfig, formatSingBoxConfigJson } from './lib/configBuilder';
import { downloadBinaryFile, downloadTextFile } from './lib/download';
import {
  measureRealPingViaAgent,
  probeLocalAgent,
  startLocalAgentTunnel,
  stopLocalAgentTunnel,
  type LocalAgentHealth,
} from './lib/localBridge';
import {
  loadProfilesFromStorage,
  measureDeterministicLatencyMs,
  saveProfilesToStorage,
} from './lib/profiles';
import { buildDesktopBundleFiles } from './lib/pythonTemplates';
import { parseProxyUri } from './lib/uriParser';
import { createZipArchive } from './lib/zipBuilder';
import type {
  AppProfilesData,
  ConnectionState,
  ProxyNode,
  RoutingMode,
} from './types/network';

export default function App() {
  const [profiles, setProfiles] = useState<AppProfilesData>(() => loadProfilesFromStorage());
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const [testingNodeIds, setTestingNodeIds] = useState<Record<string, boolean>>({});
  const [agentHealth, setAgentHealth] = useState<LocalAgentHealth | null>(null);
  const [isProbingAgent, setIsProbingAgent] = useState(false);
  const [agentNotice, setAgentNotice] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);
  const pingAttemptRef = useRef(1);

  useEffect(() => {
    saveProfilesToStorage(profiles);
  }, [profiles]);

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

  const activeNode = useMemo(
    () => profiles.nodes.find((n) => n.id === profiles.activeNodeId) ?? profiles.nodes[0] ?? null,
    [profiles.nodes, profiles.activeNodeId],
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

    setConnectionState('connecting');
    window.setTimeout(() => {
      setConnectionState('connected');
    }, 380);
  }

  async function handleToggleConnect() {
    if (!activeNode) return;

    if (connectionState === 'connected') {
      if (agentHealth?.ok) {
        setConnectionState('disconnecting');
        const res = await stopLocalAgentTunnel();
        setConnectionState('disconnected');
        setAgentNotice({
          type: res.ok ? 'info' : 'error',
          text: res.message,
        });
        return;
      }
      setConnectionState('disconnecting');
      window.setTimeout(() => {
        setConnectionState('disconnected');
      }, 260);
      return;
    }

    if (connectionState === 'disconnected') {
      await connectToNode(activeNode);
    }
  }

  async function handleSelectAndConnect(nodeId: string) {
    const target = profiles.nodes.find((n) => n.id === nodeId);
    if (!target) return;
    setProfiles((prev) => ({ ...prev, activeNodeId: nodeId }));
    if (activeNode?.id === nodeId && connectionState === 'connected') {
      return;
    }
    await connectToNode(target);
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
        text: `Đã kết nối thành công với ứng dụng PingGate trên máy tính (${res.health.platform}). Bạn có thể bật/tắt VPN thật ngay trên web.`,
      });
    } else {
      setAgentHealth(null);
      setAgentNotice({ type: 'error', text: res.error });
    }
  }

  function handleDownloadInstaller(platform: 'windows' | 'macos') {
    const entries = buildDesktopBundleFiles(profiles, activeNode, platform);
    const zipBytes = createZipArchive(entries);
    const filename =
      platform === 'windows' ? 'PingGate-Setup-Windows.zip' : 'PingGate-Setup-macOS.zip';
    downloadBinaryFile(filename, zipBytes, 'application/zip');
    setAgentNotice({
      type: 'success',
      text: `Đã tải ${filename} (kèm sẵn máy chủ ${activeNode?.name ?? 'mặc định'} và thiết lập game). Giải nén và nhấp đúp ${
        platform === 'windows' ? 'PingGate-Windows.bat' : 'PingGate-macOS.command'
      } để cài đặt tự động.`,
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
      loadPercent: 18,
    };
    setProfiles((prev) => ({
      ...prev,
      activeNodeId: newNode.id,
      nodes: [newNode, ...prev.nodes],
    }));
    return {
      ok: true,
      message: `Đã thêm máy chủ cá nhân "${newNode.name}" (${newNode.protocol.toUpperCase()}).`,
    };
  }

  function handleDeleteNode(nodeId: string) {
    setProfiles((prev) => {
      const remaining = prev.nodes.filter((n) => n.id !== nodeId);
      const nextActive =
        prev.activeNodeId === nodeId ? (remaining[0]?.id ?? null) : prev.activeNodeId;
      if (remaining.length === 0) {
        setConnectionState('disconnected');
      }
      return {
        ...prev,
        activeNodeId: nextActive,
        nodes: remaining,
      };
    });
  }

  async function handleTestAllPings() {
    if (profiles.nodes.length === 0) return;
    const allFlags: Record<string, boolean> = {};
    for (const node of profiles.nodes) {
      allFlags[node.id] = true;
    }
    setTestingNodeIds(allFlags);

    if (agentHealth?.ok) {
      const results = await Promise.all(
        profiles.nodes.map(async (node) => ({
          id: node.id,
          res: await measureRealPingViaAgent(node.server, node.port),
        })),
      );
      const map = new Map(results.map((r) => [r.id, r.res.latencyMs]));
      const now = new Date().toISOString();
      setProfiles((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => ({
          ...node,
          latencyMs: map.get(node.id) ?? null,
          lastTestedAt: now,
        })),
      }));
      setTestingNodeIds({});
      return;
    }

    const attempt = pingAttemptRef.current++;
    window.setTimeout(() => {
      const now = new Date().toISOString();
      setProfiles((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node, index) => ({
          ...node,
          latencyMs: measureDeterministicLatencyMs(node, attempt + index),
          lastTestedAt: now,
        })),
      }));
      setTestingNodeIds({});
    }, 420);
  }

  function handleSelectLowestPing() {
    const measured = profiles.nodes.filter((n) => n.latencyMs !== null);
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

  return (
    <div id="top" className="min-h-screen bg-[#0B0D14] text-slate-100">
      <Navbar onDownloadClick={scrollToDownload} />

      <main>
        {/* Proton-inspired Split Hero Section */}
        <section className="relative overflow-hidden py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Clear Value Proposition & Single Primary CTA */}
              <div className="lg:col-span-6 space-y-6">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                  Giảm ping game, kết nối mượt chỉ với 1 chạm
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  Chọn sẵn máy chủ miễn phí tại Singapore, Hong Kong, Nhật Bản để chơi Roblox, Genshin Impact hay Valorant mượt mà — trong khi giữ nguyên tốc độ mạng nội địa cho trình duyệt và Discord.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadInstaller('windows')}
                    className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Tải PingGate cho Windows</span>
                  </button>
                  <a
                    href="#download"
                    className="inline-flex h-12 items-center gap-1.5 px-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                  >
                    <span>Phiên bản macOS & hướng dẫn</span>
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>

                {/* Unboxed quiet metadata trust line (Zero-Pill Discipline) */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-xs text-slate-400">
                  <span>6 máy chủ Châu Á sẵn sàng</span>
                  <span aria-hidden="true">·</span>
                  <span>Không cần đăng ký tài khoản</span>
                  <span aria-hidden="true">·</span>
                  <span>Hỗ trợ Windows & macOS</span>
                </div>
              </div>

              {/* Right Column: Interactive Proton-style 1-Click VPN Client Widget */}
              <div className="lg:col-span-6">
                <HeroClientCard
                  nodes={profiles.nodes}
                  activeNode={activeNode}
                  routing={profiles.routing}
                  connectionState={connectionState}
                  connectedSeconds={connectedSeconds}
                  agentHealth={agentHealth}
                  isProbingAgent={isProbingAgent}
                  onToggleConnect={handleToggleConnect}
                  onSelectAndConnect={handleSelectAndConnect}
                  onProbeAgent={handleProbeLocalAgent}
                />
              </div>
            </div>
          </div>
        </section>

        <FreeServersSection
          nodes={profiles.nodes}
          activeNodeId={activeNode?.id ?? null}
          connectionState={connectionState}
          testingNodeIds={testingNodeIds}
          onSelectAndConnect={handleSelectAndConnect}
          onDeleteNode={handleDeleteNode}
          onAddUri={handleAddUri}
          onTestAllPings={handleTestAllPings}
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
