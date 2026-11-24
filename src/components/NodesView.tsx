import { Fragment, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Code,
  Download,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { getLatencyTier } from '../lib/profiles';
import type { ProxyNode, ProxyProtocol } from '../types/network';

interface NodesViewProps {
  nodes: ProxyNode[];
  activeNodeId: string | null;
  testingNodeIds: Record<string, boolean>;
  onAddUri: (uri: string) => { ok: boolean; message: string };
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onTestSinglePing: (nodeId: string) => void;
  onTestAllPings: () => void;
  onSelectLowestPing: () => void;
  onExportProfiles: () => void;
  onImportProfiles: (rawJson: string) => { ok: boolean; message: string };
}

type ProtocolFilter = 'all' | ProxyProtocol;

const SAMPLE_URIS: Array<{ label: string; uri: string }> = [
  {
    label: 'Mẫu VLESS Reality (SG)',
    uri: 'vless://7a1e2c3d-4b5f-4c6a-9d8e-1f2a3b4c5d6e@sg-edge02.game-relay.net:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=9xQ2mN7vB4cK1wR8tL5yP3dF6hJ0sA2uE9rG7nM4vC1&sid=a1b2c3d4&type=tcp&flow=xtls-rprx-vision#Singapore%20Edge%2002',
  },
  {
    label: 'Mẫu Trojan WS (HK)',
    uri: 'trojan://gamePass2026Hk@hk-vip.game-relay.net:443?security=tls&sni=hk-vip.game-relay.net&type=ws&path=%2Fws&host=hk-vip.game-relay.net#Hong%20Kong%20VIP%20WS',
  },
  {
    label: 'Mẫu VMess TLS (TW)',
    uri: 'vmess://eyJ2IjoiMiIsInBzIjoiVGFpcGVpIFRXLTAxIiwiYWRkIjoidHcwMS5nYW1lLXJlbGF5Lm5ldCIsInBvcnQiOiI0NDMiLCJpZCI6IjIyMjIyMjIyLTMzMzMtNDQ0NC04NTU1LTY2NjY2NjY2NjY2NiIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJob3N0IjoidHcwMS5nYW1lLXJlbGF5Lm5ldCIsInBhdGgiOiIvdm0iLCJ0bHMiOiJ0bHMifQ==',
  },
];

export function NodesView({
  nodes,
  activeNodeId,
  testingNodeIds,
  onAddUri,
  onSelectNode,
  onDeleteNode,
  onTestSinglePing,
  onTestAllPings,
  onSelectLowestPing,
  onExportProfiles,
  onImportProfiles,
}: NodesViewProps) {
  const [uriInput, setUriInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAnyTesting = Object.values(testingNodeIds).some(Boolean);

  const filteredNodes = nodes.filter((node) => {
    if (protocolFilter !== 'all' && node.protocol !== protocolFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.name.toLowerCase().includes(q) ||
      node.server.toLowerCase().includes(q) ||
      node.region.toLowerCase().includes(q) ||
      node.protocol.toLowerCase().includes(q)
    );
  });

  function handleSubmitUri(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddUri(uriInput);
    if (res.ok) {
      setUriInput('');
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
        text: 'Trình duyệt chặn đọc Clipboard tự động. Hãy nhấn Ctrl+V trực tiếp vào ô nhập.',
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const res = onImportProfiles(text);
      setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      {/* BYON Import Panel */}
      <section
        aria-label="Nhập link cấu hình Node"
        className="rounded-xl border border-slate-800/80 bg-[#111827] p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              Nhập cấu hình Node (BYON)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ chuẩn vless://, trojan://, vmess:// và ss:// — tự động phân tích thành outbound của sing-box
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Tải lên tệp profiles.json"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nhập profiles.json</span>
            </button>
            <button
              type="button"
              onClick={onExportProfiles}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Xuất profiles.json</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitUri} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="proxy-uri-input" className="sr-only">
              Đường dẫn cấu hình Proxy URI
            </label>
            <input
              id="proxy-uri-input"
              type="text"
              value={uriInput}
              onChange={(e) => {
                setUriInput(e.target.value);
                if (feedback) setFeedback(null);
              }}
              placeholder="Dán link vless://, trojan://, vmess:// hoặc ss:// tại đây..."
              className="h-11 w-full rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3.5 text-sm font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
            >
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              <span>Dán</span>
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Thêm Node</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
          <span>Điền nhanh link kiểm thử:</span>
          {SAMPLE_URIS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setUriInput(sample.uri);
                setFeedback(null);
              }}
              className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-emerald-400 hover:decoration-emerald-400 transition-colors whitespace-nowrap"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-2 text-sm ${
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
      </section>

      {/* Saved Nodes Table */}
      <section
        aria-label="Danh sách Node đã lưu"
        className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <label htmlFor="node-search" className="sr-only">
                Tìm kiếm Node
              </label>
              <input
                id="node-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, khu vực, máy chủ..."
                className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#0B0F17] pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Lọc theo giao thức"
              className="flex items-center gap-1 rounded-lg bg-[#0B0F17] p-1 border border-slate-800"
            >
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'vless', label: 'VLESS' },
                  { id: 'trojan', label: 'Trojan' },
                  { id: 'vmess', label: 'VMess' },
                  { id: 'shadowsocks', label: 'SS' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProtocolFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    protocolFilter === tab.id
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSelectLowestPing}
              disabled={!nodes.some((n) => n.latencyMs !== null)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-xs font-medium text-emerald-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chọn Ping thấp nhất</span>
            </button>
            <button
              type="button"
              onClick={onTestAllPings}
              disabled={nodes.length === 0 || isAnyTesting}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isAnyTesting ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isAnyTesting ? 'Đang đo Ping...' : 'Đo tất cả Ping'}</span>
            </button>
          </div>
        </div>

        {filteredNodes.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-200">
              {nodes.length === 0
                ? 'Chưa có Node nào được lưu trong profiles.json'
                : 'Không tìm thấy Node nào khớp bộ lọc hiện tại'}
            </p>
            <p className="text-xs text-slate-400">
              {nodes.length === 0
                ? 'Dán link cấu hình VLESS, Trojan, VMess hoặc Shadowsocks ở khung phía trên để thêm node đầu tiên.'
                : 'Thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc về Tất cả.'}
            </p>
            {nodes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setProtocolFilter('all');
                }}
                className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs font-medium text-slate-400 bg-[#0D131F]">
                  <th className="py-3 pl-6 pr-3">Tên Node & Máy chủ</th>
                  <th className="py-3 px-3">Giao thức</th>
                  <th className="py-3 px-3">Khu vực</th>
                  <th className="py-3 px-3 text-right">Độ trễ</th>
                  <th className="py-3 pl-3 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredNodes.map((node) => {
                  const isActive = node.id === activeNodeId;
                  const isTesting = Boolean(testingNodeIds[node.id]);
                  const tier = getLatencyTier(node.latencyMs);
                  const isExpanded = expandedNodeId === node.id;

                  const tierColor =
                    tier.tone === 'good'
                      ? 'text-emerald-400'
                      : tier.tone === 'fair'
                        ? 'text-amber-400'
                        : tier.tone === 'high'
                          ? 'text-red-400'
                          : 'text-slate-400';

                  return (
                    <Fragment key={node.id}>
                      <tr
                        className={`transition-colors ${
                          isActive ? 'bg-emerald-500/[0.05]' : 'hover:bg-slate-800/35'
                        }`}
                      >
                        <td className="py-3.5 pl-6 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100">{node.name}</span>
                            {isActive && (
                              <span className="text-xs font-medium text-emerald-400">
                                · Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-slate-400">
                            {node.server}:{node.port}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-300 whitespace-nowrap">
                          <span className="font-medium uppercase">{node.protocol}</span>
                          <span className="mx-1.5 text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400">{node.security}</span>
                          <span className="mx-1.5 text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400">{node.transport}</span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-300 whitespace-nowrap">
                          {node.region}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {isTesting ? (
                            <span className="text-xs text-slate-400">Đang đo...</span>
                          ) : node.latencyMs !== null ? (
                            <div>
                              <span className={`font-mono text-sm font-semibold tabular-nums ${tierColor}`}>
                                {node.latencyMs} ms
                              </span>
                              <span className="ml-2 text-xs text-slate-400">{tier.label}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Chưa đo</span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectNode(node.id)}
                              disabled={isActive}
                              aria-label={`Chọn node ${node.name}`}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                              }`}
                            >
                              {isActive ? 'Đang dùng' : 'Chọn'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onTestSinglePing(node.id)}
                              disabled={isTesting}
                              aria-label={`Đo Ping node ${node.name}`}
                              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`}
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNodeId(isExpanded ? null : node.id)
                              }
                              aria-expanded={isExpanded}
                              aria-label={`Xem JSON outbound của ${node.name}`}
                              className={`rounded-md p-2 transition-colors ${
                                isExpanded
                                  ? 'bg-slate-800 text-emerald-400'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                              }`}
                            >
                              <Code className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteNode(node.id)}
                              aria-label={`Xóa node ${node.name}`}
                              className="rounded-md p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#0B0F17]">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-300">
                                Đối tượng outbound sing-box đã giải mã từ URI
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                parser.py → outbounds[0]
                              </span>
                            </div>
                            <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080C12] p-4 font-mono text-xs text-slate-200 leading-relaxed">
                              {JSON.stringify(node.outbound, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
