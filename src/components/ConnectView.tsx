import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  Laptop,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  Split,
} from 'lucide-react';
import { collectActiveRoutingTargets } from '../lib/configBuilder';
import type { LocalAgentHealth } from '../lib/localBridge';
import { getLatencyTier } from '../lib/profiles';
import type {
  ConnectionState,
  ProxyNode,
  RoutingMode,
  RoutingProfile,
} from '../types/network';

interface ConnectViewProps {
  nodes: ProxyNode[];
  activeNode: ProxyNode | null;
  routing: RoutingProfile;
  connectionState: ConnectionState;
  connectedSeconds: number;
  isTestingPing: boolean;
  agentHealth: LocalAgentHealth | null;
  isProbingAgent: boolean;
  agentNotice: { type: 'info' | 'error' | 'success'; text: string } | null;
  onToggleConnect: () => void;
  onSelectNode: (nodeId: string) => void;
  onChangeMode: (mode: RoutingMode) => void;
  onTestActivePing: () => void;
  onProbeAgent: () => void;
  onDownloadDesktopBundle: () => void;
  onGoToNodes: () => void;
  onGoToRouting: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export function ConnectView({
  nodes,
  activeNode,
  routing,
  connectionState,
  connectedSeconds,
  isTestingPing,
  agentHealth,
  isProbingAgent,
  agentNotice,
  onToggleConnect,
  onSelectNode,
  onChangeMode,
  onTestActivePing,
  onProbeAgent,
  onDownloadDesktopBundle,
  onGoToNodes,
  onGoToRouting,
}: ConnectViewProps) {
  const isConnected = connectionState === 'connected';
  const isBusy = connectionState === 'connecting' || connectionState === 'disconnecting';
  const targets = collectActiveRoutingTargets(routing);
  const latencyTier = getLatencyTier(activeNode?.latencyMs ?? null);

  const latencyColorClass =
    latencyTier.tone === 'good'
      ? 'text-emerald-400'
      : latencyTier.tone === 'fair'
        ? 'text-amber-400'
        : latencyTier.tone === 'high'
          ? 'text-red-400'
          : 'text-slate-400';

  const buttonLabel =
    connectionState === 'connected'
      ? 'Ngắt kết nối'
      : connectionState === 'connecting'
        ? 'Đang khởi tạo TUN...'
        : connectionState === 'disconnecting'
          ? 'Đang ngắt...'
          : 'Bật kết nối';

  const statusHeadline =
    connectionState === 'connected'
      ? agentHealth?.ok
        ? 'Đã bật TUN thật trên máy tính'
        : 'Đang mô phỏng kết nối trên Web'
      : connectionState === 'connecting'
        ? 'Đang nạp cấu hình sing-box và khởi tạo định tuyến...'
        : connectionState === 'disconnecting'
          ? 'Đang đóng tiến trình và khôi phục mạng mặc định...'
          : agentHealth?.ok
            ? 'Đã nối Local Agent — Sẵn sàng bật VPN thật'
            : 'Sẵn sàng cấu hình đường truyền game';

  return (
    <div className="space-y-8">
      {/* Focal Anchor: 1-Click Connection Hub */}
      <section
        aria-label="Điều khiển kết nối chính"
        className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          {/* Left: Central 1-Click Action */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center px-6 py-10 text-center">
            <button
              type="button"
              onClick={onToggleConnect}
              disabled={isBusy || !activeNode}
              aria-pressed={isConnected}
              className={`group relative flex h-40 w-40 flex-col items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                isConnected
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
                  : isBusy
                    ? 'border-amber-400/70 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700 bg-slate-900/90 text-slate-100 hover:border-emerald-500/70 hover:text-emerald-300'
              }`}
            >
              {isBusy ? (
                <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
              ) : (
                <Power className="h-10 w-10 transition-transform duration-150 group-hover:scale-105" aria-hidden="true" />
              )}
              <span className="mt-3 text-sm font-semibold whitespace-nowrap">
                {buttonLabel}
              </span>
            </button>

            <h1 className="mt-6 text-xl font-semibold text-slate-100 text-balance">
              {statusHeadline}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-sm">
              {isConnected ? (
                <>
                  {agentHealth?.ok ? 'TUN thật' : 'Xem trước Web'} · Phiên{' '}
                  <span className="font-mono tabular-nums text-slate-200">
                    {formatDuration(connectedSeconds)}
                  </span>{' '}
                  ·{' '}
                  <span className="uppercase text-slate-200">{activeNode?.protocol}</span>
                </>
              ) : activeNode ? (
                agentHealth?.ok
                  ? 'Nhấn một lần để khởi chạy lõi sing-box thật trên máy tính của bạn.'
                  : 'Bản web giúp cấu hình & xem trước. Tải gói Desktop (.zip) bên dưới để chạy TUN thật cho game.'
              ) : (
                'Chưa có node proxy nào. Hãy thêm link cấu hình trước khi kết nối.'
              )}
            </p>
          </div>

          {/* Right: Node Picker & Routing Mode Controls */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 lg:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Máy chủ đích (BYON Node)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chọn node nước ngoài có ping thấp nhất để định tuyến lưu lượng game
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoToNodes}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400 rounded"
                >
                  Quản lý danh sách Node
                </button>
              </div>

              {nodes.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="active-node-select" className="sr-only">
                      Chọn máy chủ Proxy đang sử dụng
                    </label>
                    <select
                      id="active-node-select"
                      value={activeNode?.id ?? ''}
                      onChange={(e) => onSelectNode(e.target.value)}
                      className="w-full h-11 rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.name} — {node.region} ({node.protocol.toUpperCase()}
                          {node.latencyMs !== null ? ` · ${node.latencyMs} ms` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={onTestActivePing}
                    disabled={!activeNode || isTestingPing}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isTestingPing ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{isTestingPing ? 'Đang đo...' : 'Đo Ping'}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-400">
                    Danh sách node đang trống. Dán link VLESS, Trojan, VMess hoặc Shadowsocks để bắt đầu.
                  </p>
                  <button
                    type="button"
                    onClick={onGoToNodes}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap shrink-0"
                  >
                    Thêm Node
                  </button>
                </div>
              )}

              {activeNode && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="font-mono text-slate-300">
                    {activeNode.server}:{activeNode.port}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNode.region}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNode.security}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNode.transport}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-200">
                  Chế độ định tuyến lưu lượng
                </span>
                <button
                  type="button"
                  onClick={onGoToRouting}
                  className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Tùy chỉnh tiến trình
                </button>
              </div>
              <div
                role="radiogroup"
                aria-label="Chọn chế độ định tuyến"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1 rounded-lg bg-[#0B0F17] border border-slate-800"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={routing.mode === 'split'}
                  onClick={() => onChangeMode('split')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    routing.mode === 'split'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Split className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Chỉ định tuyến riêng Game</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={routing.mode === 'global'}
                  onClick={() => onChangeMode('global')}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    routing.mode === 'global'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Toàn bộ máy (Global)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Flat KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-800/80 divide-y lg:divide-y-0 divide-x divide-slate-800/80 bg-[#0D131F]">
          <div className="p-5">
            <p className="text-xs text-slate-400">IP đầu ra của Game</p>
            <p className="mt-1.5 text-base font-mono font-semibold tabular-nums text-slate-100">
              {isConnected && activeNode ? activeNode.exitIp : '113.161.48.20'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {isConnected && activeNode
                ? `Qua node ${activeNode.region}`
                : 'Mạng nội địa (Direct)'}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs text-slate-400">Độ trễ tới Node</p>
            <p className={`mt-1.5 text-base font-mono font-semibold tabular-nums ${latencyColorClass}`}>
              {activeNode?.latencyMs !== null && activeNode?.latencyMs !== undefined
                ? `${activeNode.latencyMs} ms`
                : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {latencyTier.label} · TCP/UDP
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs text-slate-400">Card mạng ảo TUN</p>
            <p className="mt-1.5 text-base font-mono font-semibold text-slate-100 truncate">
              {routing.tun.interfaceName}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {isConnected ? `Đang chạy · ${routing.tun.stack}` : `Chờ bật · MTU ${routing.tun.mtu}`}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs text-slate-400">Quy tắc định tuyến</p>
            <p className="mt-1.5 text-base font-semibold tabular-nums text-slate-100">
              {routing.mode === 'split'
                ? `${targets.processes.length} tiến trình`
                : 'Toàn hệ thống'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {routing.mode === 'split'
                ? `${targets.domains.length} domain game · final: direct`
                : 'final: proxy-outbound'}
            </p>
          </div>
        </div>
      </section>

      {/* Desktop 1-Click Runtime & Local Agent Bridge */}
      <section
        aria-label="Chạy thật trên máy tính Windows và macOS"
        className="rounded-xl border border-slate-800/80 bg-[#111827] px-6 py-5 space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                agentHealth?.ok
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Laptop className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <h2 className="text-sm font-semibold text-slate-100">
                  {agentHealth?.ok
                    ? `Đã kết nối PingGate Desktop (${agentHealth.platform})`
                    : 'Chạy VPN thật cho game cài trên máy tính (1-Click)'}
                </h2>
                <span className="text-xs text-slate-400">
                  {agentHealth?.ok
                    ? `· ${agentHealth.isAdmin ? 'Có quyền Admin' : 'Thiếu quyền Admin'} · ${agentHealth.singBoxFound ? 'Đã có sing-box' : 'Thiếu sing-box'}`
                    : '· Tự động tải sing-box & xin quyền Admin'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {agentHealth?.ok
                  ? 'Mọi thao tác Bật/Tắt kết nối và Đo Ping trên giao diện web này đang điều khiển trực tiếp sing-box trên máy tính của bạn.'
                  : 'Trình duyệt không thể tự tạo card mạng ảo TUN cho game cài trên máy. Tải gói Desktop bên cạnh, giải nén rồi nhấp đúp PingGate-Windows.bat (hoặc PingGate-macOS.command) để chạy ngay với cấu hình bạn vừa thiết lập.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onProbeAgent}
              disabled={isProbingAgent}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isProbingAgent ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {isProbingAgent
                  ? 'Đang kiểm tra...'
                  : agentHealth?.ok
                    ? 'Kiểm tra lại Agent'
                    : 'Kết nối Local Agent'}
              </span>
            </button>
            <button
              type="button"
              onClick={onDownloadDesktopBundle}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tải gói chạy ngay (.zip)</span>
            </button>
          </div>
        </div>

        {agentNotice && (
          <div
            role={agentNotice.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-2 border-t border-slate-800/80 pt-3 text-xs ${
              agentNotice.type === 'error'
                ? 'text-amber-300'
                : agentNotice.type === 'success'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
            }`}
          >
            {agentNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{agentNotice.text}</span>
          </div>
        )}
      </section>

      {/* Split-Tunneling Traffic Separation Breakdown */}
      <section aria-label="Phân luồng lưu lượng mạng" className="rounded-xl border border-slate-800/80 bg-[#111827]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Sơ đồ phân luồng Split-Tunneling
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bắt gói tin UDP/TCP của game ở tầng TUN để giảm ping, đồng thời giữ kết nối gốc cho ứng dụng nền
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>
              {routing.mode === 'split'
                ? 'Chế độ tách luồng đang kích hoạt'
                : 'Chế độ toàn hệ thống đang kích hoạt'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          {/* Proxy Route Column */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Đẩy qua Proxy Node</span>
              </div>
              <span className="font-mono text-xs text-slate-400">proxy-outbound</span>
            </div>

            {routing.mode === 'global' ? (
              <p className="text-sm text-slate-300 leading-relaxed">
                Toàn bộ lưu lượng TCP/UDP từ máy tính (bao gồm game, trình duyệt và ứng dụng khác) sẽ đi qua{' '}
                <span className="font-medium text-slate-100">
                  {activeNode?.name ?? 'Proxy Node'}
                </span>
                .
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  Tựa game áp dụng:{' '}
                  <span className="text-slate-200 font-medium">
                    {targets.enabledGameNames.length > 0
                      ? targets.enabledGameNames.join(', ')
                      : 'Chưa chọn tựa game nào'}
                  </span>
                </div>
                <div className="divide-y divide-slate-800/70 border-t border-b border-slate-800/70">
                  {targets.processes.slice(0, 6).map((proc) => (
                    <div
                      key={proc}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-mono text-xs text-slate-200">{proc}</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{activeNode?.region ?? 'Proxy'}</span>
                      </span>
                    </div>
                  ))}
                  {targets.processes.length === 0 && (
                    <p className="py-3 text-xs text-amber-400">
                      Chưa có tiến trình game nào được bật. Hãy bật Roblox hoặc thêm tiến trình ở mục Định tuyến.
                    </p>
                  )}
                </div>
                {targets.domains.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Domain bổ sung:{' '}
                    <span className="font-mono text-slate-300">
                      {targets.domains.slice(0, 5).join(', ')}
                      {targets.domains.length > 5 ? ` (+${targets.domains.length - 5})` : ''}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Direct Route Column */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-200">
                Giữ nguyên mạng nội địa
              </span>
              <span className="font-mono text-xs text-slate-400">direct</span>
            </div>

            {routing.mode === 'global' ? (
              <p className="text-sm text-slate-400 leading-relaxed">
                Chỉ mạng nội bộ LAN (<span className="font-mono text-slate-300">ip_is_private</span>) đi thẳng. Chuyển sang chế độ{' '}
                <span className="text-slate-200">Chỉ định tuyến riêng Game</span> nếu bạn muốn xem YouTube, gọi Discord và tải web bằng băng thông gốc.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Các tiến trình dưới đây và mọi lưu lượng không thuộc game (<span className="font-mono text-slate-300">final: direct</span>) đi thẳng qua nhà mạng trong nước:
                </p>
                <div className="divide-y divide-slate-800/70 border-t border-b border-slate-800/70">
                  {routing.bypassProcesses.map((proc) => (
                    <div
                      key={proc}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-mono text-xs text-slate-300">{proc}</span>
                      <span className="text-xs text-slate-400">Kết nối trực tiếp</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-xs text-slate-300">Mọi ứng dụng & website còn lại</span>
                    <span className="text-xs text-slate-400">Kết nối trực tiếp</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
