import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Globe,
  Laptop,
  Loader2,
  Power,
  ShieldCheck,
  Split,
} from 'lucide-react';
import { collectActiveRoutingTargets } from '../lib/configBuilder';
import type { LiveFeedSource } from '../lib/liveFeedClient';
import type { LocalAgentHealth } from '../lib/localBridge';
import { getLatencyTier } from '../lib/profiles';
import type {
  ConnectionState,
  ProxyNode,
  RoutingProfile,
} from '../types/network';

interface HeroClientCardProps {
  nodes: ProxyNode[];
  activeNode: ProxyNode | null;
  routing: RoutingProfile;
  connectionState: ConnectionState;
  connectedSeconds: number;
  agentHealth: LocalAgentHealth | null;
  isProbingAgent: boolean;
  isLoadingLive: boolean;
  liveFeedSource: LiveFeedSource;
  copiedNodeId: string | null;
  recommendedPlatformLabel: string;
  onToggleConnect: () => void;
  onSelectNode: (nodeId: string) => void;
  onCopyNodeUri: (node: ProxyNode) => void;
  onProbeAgent: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export function HeroClientCard({
  nodes,
  activeNode,
  routing,
  connectionState,
  connectedSeconds,
  agentHealth,
  isProbingAgent,
  isLoadingLive,
  liveFeedSource,
  copiedNodeId,
  recommendedPlatformLabel,
  onToggleConnect,
  onSelectNode,
  onCopyNodeUri,
  onProbeAgent,
}: HeroClientCardProps) {
  const isAgentReady = Boolean(agentHealth?.ok);
  const isConnected = isAgentReady && connectionState === 'connected';
  const isBusy = connectionState === 'connecting' || connectionState === 'disconnecting';
  const targets = collectActiveRoutingTargets(routing);
  const tier = getLatencyTier(activeNode?.latencyMs ?? null);
  const quickNodes = nodes.slice(0, 3);
  const isCopied = Boolean(activeNode && copiedNodeId === activeNode.id);

  const pingColor =
    tier.tone === 'good'
      ? 'text-emerald-400'
      : tier.tone === 'fair'
        ? 'text-amber-400'
        : tier.tone === 'high'
          ? 'text-red-400'
          : 'text-slate-400';

  return (
    <div
      aria-label="Bảng chọn máy chủ thật và điều khiển PingGate"
      className="rounded-2xl border border-white/[0.1] bg-[#131722] overflow-hidden shadow-2xl shadow-black/40"
    >
      {/* App Window Top Strip */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#171C2B] px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200 min-w-0">
          {isConnected ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          ) : isLoadingLive ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" aria-hidden="true" />
          ) : (
            <Globe className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">
            {isConnected
              ? `Đang bật TUN thật (${agentHealth?.platform})`
              : isAgentReady
                ? `Sẵn sàng bật VPN thật (${agentHealth?.platform})`
                : isLoadingLive
                  ? 'Đang kiểm tra TCP máy chủ sống...'
                  : 'Cần mở ứng dụng máy tính để chạy TUN thật'}
          </span>
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
          {routing.mode === 'split' ? 'Split-Tunneling' : 'Global VPN'}
        </span>
      </div>

      {/* Main Active Server & Action Panel */}
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left min-w-0 flex-1">
            <p className="text-xs text-slate-400">Máy chủ thật đang chọn</p>
            <h2 className="mt-1 text-xl font-bold text-white truncate">
              {isLoadingLive && !activeNode
                ? 'Đang quét máy chủ...'
                : activeNode?.name ?? 'Chưa có máy chủ'}
            </h2>
            <p className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
              {activeNode ? (
                <>
                  <span>{activeNode.region}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">
                    {activeNode.protocol === 'shadowsocks' ? 'SS' : activeNode.protocol}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${pingColor}`}>
                    {activeNode.latencyMs !== null
                      ? `${activeNode.latencyMs} ms`
                      : liveFeedSource === 'direct-feed'
                        ? 'Chưa đo TCP'
                        : 'Chưa phản hồi'}
                  </span>
                </>
              ) : (
                'Đang tải danh sách máy chủ cộng đồng...'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeNode && (
              <button
                type="button"
                onClick={() => onCopyNodeUri(activeNode)}
                title="Sao chép đường dẫn máy chủ thật để dùng ngay"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#0E111B] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] transition-colors whitespace-nowrap"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-300" aria-hidden="true" />
                )}
                <span>{isCopied ? 'Đã chép' : 'Chép link'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleConnect}
              disabled={isBusy || !activeNode}
              aria-pressed={isConnected}
              className={`inline-flex h-12 min-w-[152px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-60 ${
                isConnected
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400'
              }`}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : isAgentReady ? (
                <Power className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {!isAgentReady
                  ? recommendedPlatformLabel
                  : connectionState === 'connected'
                    ? 'Ngắt kết nối'
                    : connectionState === 'connecting'
                      ? 'Đang kết nối...'
                      : connectionState === 'disconnecting'
                        ? 'Đang ngắt...'
                        : 'Kết nối thật'}
              </span>
            </button>
          </div>
        </div>

        {/* Real Verified Telemetry (No Fabricated Local/Exit IP) */}
        <div className="grid grid-cols-3 border-y border-white/[0.07] py-4 divide-x divide-white/[0.07]">
          <div className="pr-3">
            <p className="text-xs text-slate-400">IP máy chủ xác thực</p>
            <p className="mt-1 font-mono text-xs sm:text-sm font-semibold tabular-nums text-slate-100 truncate">
              {activeNode?.exitIp || activeNode?.server || '—'}
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-slate-400">TCP Ping thật</p>
            <p className={`mt-1 font-mono text-xs sm:text-sm font-semibold tabular-nums ${pingColor}`}>
              {activeNode?.latencyMs !== null && activeNode?.latencyMs !== undefined
                ? `${activeNode.latencyMs} ms`
                : liveFeedSource === 'direct-feed'
                  ? 'Chưa đo TCP'
                  : '—'}
            </p>
          </div>
          <div className="pl-3">
            <p className="text-xs text-slate-400">
              {isConnected ? 'Thời gian bật' : 'Định tuyến'}
            </p>
            <p className="mt-1 font-mono text-xs sm:text-sm font-semibold tabular-nums text-slate-100 truncate">
              {isConnected
                ? formatDuration(connectedSeconds)
                : routing.mode === 'split'
                  ? `${targets.enabledGameNames.length} game`
                  : 'Toàn máy'}
            </p>
          </div>
        </div>

        {/* Live Verified Quick Server List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Máy chủ sống nhanh nhất vừa đo</span>
            <a
              href="#servers"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Xem tất cả ({nodes.length})
            </a>
          </div>
          <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-[#0E111B]">
            {isLoadingLive && quickNodes.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Đang kiểm tra kết nối TCP tới các máy chủ công cộng...
              </div>
            ) : quickNodes.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Chưa có máy chủ nào. Kéo xuống mục Máy chủ để quét lại hoặc dán link VPS của bạn.
              </div>
            ) : (
              quickNodes.map((node) => {
                const selected = node.id === activeNode?.id;
                const nodeTier = getLatencyTier(node.latencyMs);
                const color =
                  nodeTier.tone === 'good'
                    ? 'text-emerald-400'
                    : nodeTier.tone === 'fair'
                      ? 'text-amber-400'
                      : nodeTier.tone === 'high'
                        ? 'text-red-400'
                        : 'text-slate-400';

                return (
                  <div
                    key={node.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {node.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        <span className="uppercase">{node.protocol}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-500">
                          {node.exitIp || node.server}:{node.port}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono text-xs font-semibold tabular-nums ${color}`}>
                        {node.latencyMs !== null ? `${node.latencyMs} ms` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectNode(node.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          selected && isConnected
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : selected
                              ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                              : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
                        }`}
                      >
                        {selected && isConnected
                          ? 'Đang chạy'
                          : isAgentReady
                            ? 'Kết nối'
                            : selected
                              ? 'Đã chọn'
                              : 'Chọn'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Strip: Split-Tunneling + Local Desktop Bridge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Split className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>
              {routing.mode === 'split'
                ? `Riêng game: ${targets.enabledGameNames.slice(0, 2).join(', ') || 'Tùy chỉnh'}`
                : 'Định tuyến toàn hệ thống'}
            </span>
          </span>

          <button
            type="button"
            onClick={onProbeAgent}
            disabled={isProbingAgent}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {agentHealth?.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Laptop className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            )}
            <span>
              {isProbingAgent
                ? 'Đang dò app máy tính...'
                : agentHealth?.ok
                  ? `Đã nối ${agentHealth.platform}`
                  : 'Nối app máy tính'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
