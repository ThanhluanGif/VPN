import { useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react';
import { getLatencyTier } from '../lib/profiles';
import type { ConnectionState, ProxyNode } from '../types/network';

interface FreeServersSectionProps {
  nodes: ProxyNode[];
  activeNodeId: string | null;
  connectionState: ConnectionState;
  testingNodeIds: Record<string, boolean>;
  onSelectAndConnect: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddUri: (uri: string) => { ok: boolean; message: string };
  onTestAllPings: () => void;
  onSelectLowestPing: () => void;
}

type RegionFilter = 'all' | 'sea' | 'east-asia' | 'custom';

const SAMPLE_BYON_URIS: Array<{ label: string; uri: string }> = [
  {
    label: 'Thử link Trojan Hong Kong',
    uri: 'trojan://gamePass2026Hk@hk-vip.game-relay.net:443?security=tls&sni=hk-vip.game-relay.net&type=ws&path=%2Fws&host=hk-vip.game-relay.net#Hong%20Kong%20VIP',
  },
  {
    label: 'Thử link VLESS Singapore',
    uri: 'vless://7a1e2c3d-4b5f-4c6a-9d8e-1f2a3b4c5d6e@sg-edge.game-relay.net:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=9xQ2mN7vB4cK1wR8tL5yP3dF6hJ0sA2uE9rG7nM4vC1&sid=a1b2c3d4&type=tcp&flow=xtls-rprx-vision#Singapore%20Pro',
  },
];

function matchesRegionFilter(node: ProxyNode, filter: RegionFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'custom') return !node.isFreeTier;
  if (filter === 'sea') {
    return node.region === 'Singapore' || node.region === 'Việt Nam';
  }
  if (filter === 'east-asia') {
    return (
      node.region === 'Hong Kong' ||
      node.region === 'Nhật Bản' ||
      node.region === 'Hàn Quốc' ||
      node.region === 'Đài Loan'
    );
  }
  return true;
}

export function FreeServersSection({
  nodes,
  activeNodeId,
  connectionState,
  testingNodeIds,
  onSelectAndConnect,
  onDeleteNode,
  onAddUri,
  onTestAllPings,
  onSelectLowestPing,
}: FreeServersSectionProps) {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [uriInput, setUriInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const isAnyTesting = Object.values(testingNodeIds).some(Boolean);
  const filteredNodes = nodes.filter((node) => matchesRegionFilter(node, regionFilter));

  function handleSubmitUri(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddUri(uriInput);
    if (res.ok) {
      setUriInput('');
      setRegionFilter('all');
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
              Mạng lưới máy chủ miễn phí & VPS cá nhân
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Chọn ngay một máy chủ Châu Á tối ưu cho game hoặc dán link VPS riêng (VLESS, Trojan, VMess, Shadowsocks). Mọi thay đổi được lưu sẵn khi bạn tải bộ cài đặt.
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
              disabled={nodes.length === 0 || isAnyTesting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.06] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isAnyTesting ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isAnyTesting ? 'Đang đo Ping...' : 'Đo Ping tất cả'}</span>
            </button>
          </div>
        </div>

        {/* Server Directory Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131722] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3.5 bg-[#171C2B]">
            <div
              role="group"
              aria-label="Lọc máy chủ theo khu vực"
              className="flex flex-wrap items-center gap-1 rounded-lg bg-[#0E111B] p-1 border border-white/[0.06]"
            >
              {(
                [
                  { id: 'all', label: `Tất cả (${nodes.length})` },
                  { id: 'sea', label: 'Đông Nam Á' },
                  { id: 'east-asia', label: 'Đông Á' },
                  { id: 'custom', label: 'VPS cá nhân' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegionFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    regionFilter === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400">
              Hỗ trợ UDP Gaming · Không giới hạn thiết lập Split-Tunneling
            </span>
          </div>

          {filteredNodes.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-200">
                Chưa có máy chủ nào trong nhóm này
              </p>
              <p className="text-xs text-slate-400">
                Bạn có thể dán link VPS riêng ở ô bên dưới hoặc chuyển về danh sách Tất cả.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-400">
                    <th className="py-3.5 pl-6 pr-3">Máy chủ & Khu vực</th>
                    <th className="py-3.5 px-3">Giao thức</th>
                    <th className="py-3.5 px-3">Tải máy chủ</th>
                    <th className="py-3.5 px-3 text-right">Độ trễ</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Kết nối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {filteredNodes.map((node) => {
                    const isActive = node.id === activeNodeId;
                    const isRunningHere = isActive && connectionState === 'connected';
                    const isTesting = Boolean(testingNodeIds[node.id]);
                    const tier = getLatencyTier(node.latencyMs);
                    const load = node.loadPercent ?? 30;
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
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{node.name}</span>
                            <span className="text-xs text-slate-400">
                              · {node.isFreeTier ? 'Miễn phí' : 'VPS riêng'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {node.region} ·{' '}
                            <span className="font-mono text-slate-500">
                              {node.server}:{node.port}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-300 whitespace-nowrap">
                          <span className="uppercase font-medium">{node.protocol}</span>
                          <span className="mx-1.5 text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400">{node.security}</span>
                        </td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full ${
                                  load < 45
                                    ? 'bg-emerald-400'
                                    : load < 70
                                      ? 'bg-amber-400'
                                      : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(8, load))}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs tabular-nums text-slate-300">
                              {load}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-right whitespace-nowrap">
                          {isTesting ? (
                            <span className="text-xs text-slate-400">Đang đo...</span>
                          ) : node.latencyMs !== null ? (
                            <div>
                              <span
                                className={`font-mono text-sm font-semibold tabular-nums ${pingColor}`}
                              >
                                {node.latencyMs} ms
                              </span>
                              <span className="ml-2 text-xs text-slate-400">{tier.label}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Chưa đo</span>
                          )}
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectAndConnect(node.id)}
                              aria-label={`Kết nối máy chủ ${node.name}`}
                              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                isRunningHere
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : isActive
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                                    : 'bg-white/[0.07] text-slate-100 hover:bg-indigo-500 hover:text-white'
                              }`}
                            >
                              {isRunningHere ? 'Đang kết nối' : 'Kết nối'}
                            </button>
                            {!node.isFreeTier && (
                              <button
                                type="button"
                                onClick={() => onDeleteNode(node.id)}
                                aria-label={`Xóa máy chủ ${node.name}`}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
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
                Có sẵn VPS hoặc link proxy riêng? (BYON)
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {SAMPLE_BYON_URIS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setUriInput(sample.uri);
                      setFeedback(null);
                    }}
                    className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-indigo-300 transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
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
                placeholder="Dán link vless://, trojan://, vmess:// hoặc ss:// để thêm vào bộ cài đặt..."
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
                  <span>Thêm máy chủ</span>
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
              Lưu ý: Danh sách máy chủ miễn phí hiển thị sẵn là cấu hình mẫu để kiểm thử nhanh. Để chơi game ổn định lâu dài ở tốc độ cao, hãy thêm link VPS/node đang hoạt động của bạn rồi tải bộ cài đặt Desktop bên dưới.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
