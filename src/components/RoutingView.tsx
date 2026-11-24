import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Globe,
  Plus,
  Split,
  X,
} from 'lucide-react';
import { formatSingBoxConfigJson } from '../lib/configBuilder';
import { copyToClipboard } from '../lib/download';
import type {
  ProxyNode,
  RoutingMode,
  RoutingProfile,
  TunSettings,
  TunStack,
} from '../types/network';

interface RoutingViewProps {
  activeNode: ProxyNode | null;
  routing: RoutingProfile;
  onChangeMode: (mode: RoutingMode) => void;
  onToggleGame: (gameId: string) => void;
  onAddCustomProcess: (processName: string) => { ok: boolean; error?: string };
  onRemoveCustomProcess: (processName: string) => void;
  onAddCustomDomain: (domain: string) => { ok: boolean; error?: string };
  onRemoveCustomDomain: (domain: string) => void;
  onUpdateTun: (patch: Partial<TunSettings>) => void;
  onDownloadConfig: () => void;
}

export function RoutingView({
  activeNode,
  routing,
  onChangeMode,
  onToggleGame,
  onAddCustomProcess,
  onRemoveCustomProcess,
  onAddCustomDomain,
  onRemoveCustomDomain,
  onUpdateTun,
  onDownloadConfig,
}: RoutingViewProps) {
  const [processInput, setProcessInput] = useState('');
  const [processError, setProcessError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const generatedConfig = formatSingBoxConfigJson(activeNode, routing);

  function handleAddProcess(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddCustomProcess(processInput);
    if (res.ok) {
      setProcessInput('');
      setProcessError(null);
    } else {
      setProcessError(res.error ?? 'Tên tiến trình không hợp lệ.');
    }
  }

  function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddCustomDomain(domainInput);
    if (res.ok) {
      setDomainInput('');
      setDomainError(null);
    } else {
      setDomainError(res.error ?? 'Tên miền không hợp lệ.');
    }
  }

  async function handleCopyConfig() {
    const ok = await copyToClipboard(generatedConfig);
    if (ok) {
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 1800);
    }
  }

  return (
    <div className="space-y-6">
      {/* Routing Mode Switcher */}
      <section
        aria-label="Chế độ định tuyến"
        className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden"
      >
        <div className="border-b border-slate-800/80 px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-100">
            Cấu hình định tuyến & Split-Tunneling
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Chọn cách sing-box xử lý lưu lượng qua card mạng ảo TUN và xem trước config.json được sinh tự động
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Chế độ định tuyến mạng"
          className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/80"
        >
          <button
            type="button"
            role="radio"
            aria-checked={routing.mode === 'split'}
            onClick={() => onChangeMode('split')}
            className={`text-left px-6 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400 ${
              routing.mode === 'split'
                ? 'bg-emerald-500/[0.08]'
                : 'bg-[#0E1420] hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-2 text-sm font-semibold ${routing.mode === 'split' ? 'text-emerald-300' : 'text-slate-100'}`}>
                <Split className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                Chỉ định tuyến riêng Game (Split-Tunneling)
              </span>
              <span className="font-mono text-xs text-slate-400 shrink-0">final: direct</span>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Chỉ bắt lưu lượng của các tiến trình game và domain game đi qua Proxy Node. Trình duyệt, Discord và các ứng dụng khác giữ nguyên mạng nội địa.
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={routing.mode === 'global'}
            onClick={() => onChangeMode('global')}
            className={`text-left px-6 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400 ${
              routing.mode === 'global'
                ? 'bg-emerald-500/[0.08]'
                : 'bg-[#0E1420] hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center gap-2 text-sm font-semibold ${routing.mode === 'global' ? 'text-emerald-300' : 'text-slate-100'}`}>
                <Globe className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                Toàn bộ máy (Global VPN)
              </span>
              <span className="font-mono text-xs text-slate-400 shrink-0">final: proxy-outbound</span>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Định tuyến toàn bộ kết nối TCP/UDP của hệ điều hành qua Proxy Node (trừ địa chỉ LAN nội bộ). Phù hợp khi cần đổi IP toàn hệ thống.
            </p>
          </button>
        </div>
      </section>

      {/* Main 2-Column Workspace: Rules Left, Live config.json Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-6 space-y-6">
          {/* Built-in Game Presets */}
          <section
            aria-label="Danh sách tựa game mục tiêu"
            className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden"
          >
            <div className="border-b border-slate-800/80 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-100">
                Tựa game áp dụng Split-Tunneling
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {routing.mode === 'split'
                  ? 'Bật tựa game bạn muốn tối ưu để tự động thêm process_name và domain_suffix'
                  : 'Đang ở chế độ Toàn bộ máy — toàn bộ ứng dụng đều đi qua Proxy Node'}
              </p>
            </div>
            <div className="divide-y divide-slate-800/70">
              {routing.games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-start justify-between gap-4 px-6 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100">{game.name}</span>
                      <span className="text-xs text-slate-500">· {game.category}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400 truncate">
                      {game.processes.join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={game.enabled}
                    aria-label={`Định tuyến cho ${game.name}`}
                    onClick={() => onToggleGame(game.id)}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                      game.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        game.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Process & Domain Rules */}
          <section
            aria-label="Tiến trình và tên miền tùy chỉnh"
            className="rounded-xl border border-slate-800/80 bg-[#111827] p-6 space-y-5"
          >
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">
                Thêm tiến trình game tùy chỉnh (process_name)
              </h2>
              <form onSubmit={handleAddProcess} className="flex gap-2">
                <label htmlFor="custom-process-input" className="sr-only">
                  Tên tiến trình game (ví dụ Minecraft.exe)
                </label>
                <input
                  id="custom-process-input"
                  type="text"
                  value={processInput}
                  onChange={(e) => {
                    setProcessInput(e.target.value);
                    if (processError) setProcessError(null);
                  }}
                  placeholder="Ví dụ: Minecraft.exe hoặc FortniteClient-Win64.exe"
                  className="h-10 flex-1 min-w-0 rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm tiến trình</span>
                </button>
              </form>
              {processError && (
                <p role="alert" className="text-xs text-red-400">
                  {processError}
                </p>
              )}
              {routing.customProcesses.length > 0 && (
                <ul className="divide-y divide-slate-800/70 border-t border-slate-800/70 pt-1">
                  {routing.customProcesses.map((proc) => (
                    <li
                      key={proc}
                      className="flex items-center justify-between py-2 text-xs"
                    >
                      <span className="font-mono text-slate-200">{proc}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomProcess(proc)}
                        aria-label={`Xóa tiến trình ${proc}`}
                        className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">
                Thêm tên miền tùy chỉnh (domain_suffix)
              </h2>
              <form onSubmit={handleAddDomain} className="flex gap-2">
                <label htmlFor="custom-domain-input" className="sr-only">
                  Tên miền game (ví dụ epicgames.com)
                </label>
                <input
                  id="custom-domain-input"
                  type="text"
                  value={domainInput}
                  onChange={(e) => {
                    setDomainInput(e.target.value);
                    if (domainError) setDomainError(null);
                  }}
                  placeholder="Ví dụ: epicgames.com"
                  className="h-10 flex-1 min-w-0 rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm domain</span>
                </button>
              </form>
              {domainError && (
                <p role="alert" className="text-xs text-red-400">
                  {domainError}
                </p>
              )}
              {routing.customDomains.length > 0 && (
                <ul className="divide-y divide-slate-800/70 border-t border-slate-800/70 pt-1">
                  {routing.customDomains.map((dom) => (
                    <li
                      key={dom}
                      className="flex items-center justify-between py-2 text-xs"
                    >
                      <span className="font-mono text-slate-200">{dom}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomDomain(dom)}
                        aria-label={`Xóa domain ${dom}`}
                        className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* TUN Interface Settings */}
          <section
            aria-label="Thông số card mạng ảo TUN"
            className="rounded-xl border border-slate-800/80 bg-[#111827] p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-slate-100">
              Cấu hình TUN Interface (sing-box)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tun-stack-select" className="block text-xs text-slate-400 mb-1.5">
                  TUN Stack
                </label>
                <select
                  id="tun-stack-select"
                  value={routing.tun.stack}
                  onChange={(e) => onUpdateTun({ stack: e.target.value as TunStack })}
                  className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="system">system (Hiệu năng cao nhất)</option>
                  <option value="mixed">mixed (Cân bằng TCP/UDP)</option>
                  <option value="gvisor">gvisor (Tương thích rộng)</option>
                </select>
              </div>
              <div>
                <label htmlFor="tun-mtu-input" className="block text-xs text-slate-400 mb-1.5">
                  MTU Size
                </label>
                <input
                  id="tun-mtu-input"
                  type="number"
                  min={1280}
                  max={9000}
                  value={routing.tun.mtu}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (Number.isFinite(num) && num >= 1280 && num <= 9000) {
                      onUpdateTun({ mtu: num });
                    }
                  }}
                  className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0B0F17] px-3 font-mono tabular-nums text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routing.tun.strictRoute}
                  onChange={(e) => onUpdateTun({ strictRoute: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-[#0B0F17] accent-emerald-500"
                />
                <span>strict_route (Chống rò rỉ DNS/UDP)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routing.tun.sniff}
                  onChange={(e) => onUpdateTun({ sniff: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-[#0B0F17] accent-emerald-500"
                />
                <span>sniff (Nhận diện domain tự động)</span>
              </label>
            </div>
          </section>
        </div>

        {/* Live sing-box config.json Preview */}
        <section
          aria-label="Xem trước tệp config.json cho sing-box"
          className="xl:col-span-6 rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden xl:sticky xl:top-20"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4 bg-[#0D131F]">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100 font-mono">
                config.json
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Sinh tự động từ Node & bộ quy tắc
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                {copiedJson ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{copiedJson ? 'Đã chép' : 'Sao chép'}</span>
              </button>
              <button
                type="button"
                onClick={onDownloadConfig}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải config.json</span>
              </button>
            </div>
          </div>

          <pre
            data-testid="singbox-config-preview"
            className="max-h-[640px] overflow-auto bg-[#080C12] p-5 font-mono text-xs text-slate-200 leading-relaxed"
          >
            {generatedConfig}
          </pre>
        </section>
      </div>
    </div>
  );
}
