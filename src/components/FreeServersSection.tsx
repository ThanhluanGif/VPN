import { useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Copy,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import type { LiveFeedSource } from '../lib/liveFeedClient';
import { getLatencyTier } from '../lib/profiles';
import type { ConnectionState, ProxyNode } from '../types/network';

interface FreeServersSectionProps {
  nodes: ProxyNode[];
  activeNodeId: string | null;
  connectionState: ConnectionState;
  agentConnected: boolean;
  testingNodeIds: Record<string, boolean>;
  isLoadingLive: boolean;
  liveFeedSource: LiveFeedSource;
  liveError: string | null;
  verifiedAt: string | null;
  copiedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onCopyNodeUri: (node: ProxyNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddUri: (uri: string) => { ok: boolean; message: string };
  onTestAllPings: () => void;
  onRefreshLiveNodes: () => void;
  onSelectLowestPing: () => void;
}

type ServerFilter = 'all' | 'vless' | 'trojan' | 'other' | 'custom';

function matchesFilter(node: ProxyNode, filter: ServerFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'custom') return !node.isFreeTier;
  if (filter === 'vless') return node.protocol === 'vless';
  if (filter === 'trojan') return node.protocol === 'trojan';
  if (filter === 'other') return node.protocol === 'vmess' || node.protocol === 'shadowsocks';
  return true;
}

function formatVerifiedTime(iso: string | null): string {
  if (!iso) return 'Chưa kiểm tra';
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Vừa xong';
  }
}

export function FreeServersSection({
  nodes,
  activeNodeId,
  connectionState,
  agentConnected,
  testingNodeIds,
  isLoadingLive,
  liveFeedSource,
  liveError,
  verifiedAt,
  copiedNodeId,
  onSelectNode,
  onCopyNodeUri,
  onDeleteNode,
  onAddUri,
  onTestAllPings,
  onRefreshLiveNodes,
  onSelectLowestPing,
}: FreeServersSectionProps) {
  const [filter, setFilter] = useState<ServerFilter>('all');
  const [uriInput, setUriInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const isAnyTesting = Object.values(testingNodeIds).some(Boolean);
  const filteredNodes = nodes.filter((node) => matchesFilter(node, filter));
  const showDirectFeedNotice =
    !liveError &&
    liveFeedSource === 'direct-feed' &&
    nodes.length > 0 &&
    nodes.every((n) => n.latencyMs === null);

  function handleSubmitUri(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddUri(uriInput);
    if (res.ok) {
      setUriInput('');
      setFilter('all');
      setFeedback({ type: 'success', text: res.message });
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  }

  async function handlePasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setFeedback({ type: 'error', text: 'Clipboard hiện đang trống.' });
        return;
      }
      setUriInput(text.trim());
      setFeedback(null);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Trình duyệt chặn đọc Clipboard tự động. Bạn có thể nhấn Ctrl+V trực tiếp vào ô nhập.',
      });
    }
  }

  return (
    <section id="servers" className="scroll-mt-20 py-16 sm:py-20 border-t border-white/[0.06]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              Danh sách máy chủ sống đã kiểm tra TCP & VPS riêng
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Toàn bộ máy chủ miễn phí bên dưới được quét trực tiếp từ nguồn cộng đồng và kiểm tra bắt tay TCP thật trước khi hiển thị. Bạn có thể sao chép link thật để kiểm chứng ngay hoặc nạp thẳng vào bộ cài Desktop.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onSelectLowestPing}
              disabled={!nodes.some((n) => n.latencyMs !== null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 text-xs font-semibold text-emerald-300 hover:bg-white/[0.06] transition-colors whitespace-nowrap disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chọn Ping thấp nhất</span>
            </button>
            <button
              type="button"
              onClick={onTestAllPings}
              disabled={nodes.length === 0 || isAnyTesting || isLoadingLive}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.06] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isAnyTesting ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isAnyTesting ? 'Đang đo TCP...' : 'Đo Ping thật'}</span>
            </button>
            <button
              type="button"
              onClick={onRefreshLiveNodes}
              disabled={isLoadingLive}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-500/15 border border-indigo-400/25 px-3.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Radar
                className={`h-3.5 w-3.5 ${isLoadingLive ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isLoadingLive ? 'Đang quét...' : 'Quét máy chủ mới'}</span>
            </button>
          </div>
        </div>

        {/* Server Directory Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131722] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5 bg-[#171C2B]">
            <div
              role="group"
              aria-label="Lọc máy chủ theo giao thức"
              className="flex flex-wrap items-center gap-1 rounded-lg bg-[#0E111B] p-1 border border-white/[0.06]"
            >
              {(
                [
                  { id: 'all', label: `Tất cả (${nodes.length})` },
                  { id: 'vless', label: 'VLESS' },
                  { id: 'trojan', label: 'Trojan' },
                  { id: 'other', label: 'VMess / SS' },
                  { id: 'custom', label: 'VPS cá nhân' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Xác thực TCP lúc: {formatVerifiedTime(verifiedAt)}
            </span>
          </div>

          {liveError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3 text-xs text-amber-200"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{liveError}</span>
              </span>
              <button
                type="button"
                onClick={onRefreshLiveNodes}
                className="rounded-md bg-amber-400/20 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-400/30"
              >
                Thử quét lại
              </button>
            </div>
          )}

          {showDirectFeedNotice && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-xs text-indigo-200"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                <span>
                  Đang tải danh sách máy chủ thật trực tiếp từ nguồn cộng đồng. Phiên bản web tĩnh không có dịch vụ TCP nền để đo ping thay trình duyệt — hãy bấm &ldquo;Đo Ping thật&rdquo; sau khi mở PingGate Desktop trên máy để xem ping (ms) chính xác từ mạng nhà bạn.
                </span>
              </span>
            </div>
          )}

          {isLoadingLive && nodes.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-200">
                Đang quét và kiểm tra TCP tới các máy chủ cộng đồng còn hoạt động...
              </p>
              <p className="text-xs text-slate-400">
                Chỉ những máy chủ phản hồi cổng TCP thật mới được hiển thị trong danh sách này.
              </p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-200">
                Chưa có máy chủ nào trong nhóm lọc này
              </p>
              <p className="text-xs text-slate-400">
                Bạn có thể bấm &ldquo;Quét máy chủ mới&rdquo;, chuyển sang &ldquo;Tất cả&rdquo;, hoặc dán link VPS cá nhân bên dưới.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-400">
                    <th className="py-3.5 pl-5 pr-3">Máy chủ</th>
                    <th className="py-3.5 px-3">Giao thức</th>
                    <th className="py-3.5 px-3">IP xác thực</th>
                    <th className="py-3.5 px-3 text-right">TCP Ping</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {filteredNodes.map((node) => {
                    const isActive = node.id === activeNodeId;
                    const isRunningHere =
                      agentConnected && isActive && connectionState === 'connected';
                    const isTesting = Boolean(testingNodeIds[node.id]);
                    const isCopied = copiedNodeId === node.id;
                    const tier = getLatencyTier(node.latencyMs);
                    const protoLabel =
                      node.protocol === 'shadowsocks' ? 'SS' : node.protocol.toUpperCase();
                    const shortSecurity =
                      node.security.length > 14 ? 'AEAD' : node.security;
                    const pingColor =
                      tier.tone === 'good'
                        ? 'text-emerald-400'
                        : tier.tone === 'fair'
                          ? 'text-amber-400'
                          : tier.tone === 'high'
                            ? 'text-red-400'
                            : 'text-slate-400';

                    return (
                      <tr
                        key={node.id}
                        className={`transition-colors ${
                          isActive ? 'bg-indigo-500/[0.07]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3.5 pl-5 pr-3 max-w-[270px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-slate-100 truncate">
                              {node.name}
                            </span>
                            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                              · {node.isFreeTier ? 'Miễn phí' : 'VPS riêng'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400 truncate">
                            {node.region} ·{' '}
                            <span className="font-mono text-slate-500">
                              {node.server}:{node.port}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-300 whitespace-nowrap">
                          <span className="font-semibold">{protoLabel}</span>
                          <span className="mx-1.5 text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400">{shortSecurity}</span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isTesting
                                  ? 'bg-indigo-400 animate-pulse'
                                  : node.latencyMs !== null
                                    ? 'bg-emerald-400'
                                    : node.lastTestedAt
                                      ? 'bg-red-400'
                                      : 'bg-slate-500'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="font-mono tabular-nums text-slate-300">
                              {node.exitIp || '—'}
                            </span>
                            <span className="text-slate-500 hidden xl:inline">
                              {isTesting
                                ? 'Đang đo'
                                : node.latencyMs !== null
                                  ? 'Sống'
                                  : node.lastTestedAt
                                    ? 'Timeout'
                                    : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {isTesting ? (
                            <span className="text-xs text-slate-400">Đang đo...</span>
                          ) : node.latencyMs !== null ? (
                            <span
                              className={`font-mono text-sm font-semibold tabular-nums ${pingColor}`}
                            >
                              {node.latencyMs} ms
                            </span>
                          ) : node.lastTestedAt ? (
                            <span className="text-xs text-red-400">Timeout</span>
                          ) : (
                            <span className="text-xs text-slate-400">Chưa đo</span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onCopyNodeUri(node)}
                              aria-label={`Sao chép link máy chủ ${node.name}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0E111B] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors whitespace-nowrap"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              )}
                              <span>{isCopied ? 'Đã chép' : 'Chép link'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectNode(node.id)}
                              aria-label={`Chọn máy chủ ${node.name}`}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                                isRunningHere
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : isActive
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                                    : 'bg-white/[0.07] text-slate-100 hover:bg-indigo-500 hover:text-white'
                              }`}
                            >
                              {isRunningHere
                                ? 'Đang chạy'
                                : agentConnected
                                  ? 'Kết nối'
                                  : isActive
                                    ? 'Đã chọn'
                                    : 'Chọn'}
                            </button>
                            {!node.isFreeTier && (
                              <button
                                type="button"
                                onClick={() => onDeleteNode(node.id)}
                                aria-label={`Xóa máy chủ ${node.name}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Integrated BYON Custom Link Importer */}
          <div className="border-t border-white/[0.07] bg-[#0E111B] p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">
                Dán link VPS hoặc proxy riêng của bạn (BYON)
              </p>
              <span className="text-xs text-slate-400">
                Tự động kiểm tra TCP thật ngay sau khi thêm
              </span>
            </div>

            <form onSubmit={handleSubmitUri} className="flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="byon-uri-input" className="sr-only">
                Dán link máy chủ vless, trojan, vmess hoặc ss
              </label>
              <input
                id="byon-uri-input"
                type="text"
                value={uriInput}
                onChange={(e) => {
                  setUriInput(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="Dán link vless://, trojan://, vmess:// hoặc ss:// đang hoạt động của bạn..."
                className="h-11 flex-1 min-w-0 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] whitespace-nowrap"
                >
                  <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                  <span>Dán</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Thêm & đo TCP</span>
                </button>
              </div>
            </form>

            {feedback && (
              <div
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className={`flex items-center gap-2 text-xs ${
                  feedback.type === 'error' ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <p className="text-xs text-slate-500 pt-1">
              Mẹo thực tế: Máy chủ cộng đồng miễn phí có thể thay đổi độ ổn định tùy thời điểm. Để chơi game ổn định lâu dài ở ping thấp, bạn có thể dán link VPS riêng ở trên rồi tải bộ cài PingGate Desktop bên dưới để chạy sing-box TUN trực tiếp trên Windows/macOS.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
