import { useState } from 'react';
import {
  ArrowRight,
  Globe,
  Plus,
  ShieldCheck,
  Split,
  X,
} from 'lucide-react';
import { collectActiveRoutingTargets } from '../lib/configBuilder';
import type { ProxyNode, RoutingMode, RoutingProfile } from '../types/network';

interface SplitTunnelSectionProps {
  activeNode: ProxyNode | null;
  routing: RoutingProfile;
  onChangeMode: (mode: RoutingMode) => void;
  onToggleGame: (gameId: string) => void;
  onAddCustomProcess: (processName: string) => { ok: boolean; error?: string };
  onRemoveCustomProcess: (processName: string) => void;
}

export function SplitTunnelSection({
  activeNode,
  routing,
  onChangeMode,
  onToggleGame,
  onAddCustomProcess,
  onRemoveCustomProcess,
}: SplitTunnelSectionProps) {
  const [processInput, setProcessInput] = useState('');
  const [processError, setProcessError] = useState<string | null>(null);
  const targets = collectActiveRoutingTargets(routing);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = onAddCustomProcess(processInput);
    if (res.ok) {
      setProcessInput('');
      setProcessError(null);
    } else {
      setProcessError(res.error ?? 'Tên tiến trình không hợp lệ.');
    }
  }

  return (
    <section
      id="split-tunneling"
      className="scroll-mt-20 py-16 sm:py-20 border-t border-white/[0.06]"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              Tách luồng riêng cho Game, không làm chậm Discord hay trình duyệt
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Chọn các tựa game cần giảm ping hoặc vượt rào cản khu vực. Tùy chọn của bạn được tự động tích hợp vào bộ cài đặt khi tải về.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Chế độ định tuyến mạng"
            className="inline-flex rounded-xl bg-[#131722] p-1 border border-white/[0.08] shrink-0 self-start md:self-auto"
          >
            <button
              type="button"
              role="radio"
              aria-checked={routing.mode === 'split'}
              onClick={() => onChangeMode('split')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                routing.mode === 'split'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Split className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chỉ định tuyến riêng Game</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={routing.mode === 'global'}
              onClick={() => onChangeMode('global')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                routing.mode === 'global'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Toàn bộ máy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Game Selector & Custom Game Process */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#131722] overflow-hidden">
            <div className="border-b border-white/[0.07] bg-[#171C2B] px-6 py-4">
              <h3 className="text-sm font-semibold text-white">
                Chọn tựa game áp dụng đường truyền tối ưu
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tự động nhận diện tiến trình và gói tin UDP của từng tựa game
              </p>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {routing.games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {game.name}
                      </span>
                      <span className="text-xs text-slate-400">· {game.category}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 truncate">
                      {game.processes.join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={game.enabled}
                    aria-label={`Bật tối ưu cho ${game.name}`}
                    onClick={() => onToggleGame(game.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                      game.enabled ? 'bg-emerald-500' : 'bg-white/[0.14]'
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

            {/* Add custom game executable */}
            <div className="border-t border-white/[0.07] bg-[#0E111B] p-5 space-y-3">
              <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
                <label htmlFor="custom-game-exe" className="sr-only">
                  Thêm tên tiến trình game khác
                </label>
                <input
                  id="custom-game-exe"
                  type="text"
                  value={processInput}
                  onChange={(e) => {
                    setProcessInput(e.target.value);
                    if (processError) setProcessError(null);
                  }}
                  placeholder="Thêm game khác (ví dụ: Minecraft.exe, ApexLegends.exe)"
                  className="h-10 flex-1 min-w-0 rounded-lg border border-white/[0.1] bg-[#131722] px-3.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] px-4 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm game</span>
                </button>
              </form>
              {processError && (
                <p role="alert" className="text-xs text-red-400">
                  {processError}
                </p>
              )}
              {routing.customProcesses.length > 0 && (
                <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06] pt-1">
                  {routing.customProcesses.map((proc) => (
                    <li
                      key={proc}
                      className="flex items-center justify-between py-2 text-xs"
                    >
                      <span className="font-mono text-slate-200">{proc}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomProcess(proc)}
                        aria-label={`Xóa game ${proc}`}
                        className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Live Split-Route Outcome Preview */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#131722] overflow-hidden divide-y divide-white/[0.07]">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Đi qua máy chủ {activeNode?.region ?? 'VPN'}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {activeNode?.latencyMs !== null && activeNode?.latencyMs !== undefined
                    ? `${activeNode.latencyMs} ms`
                    : 'TUN'}
                </span>
              </div>

              {routing.mode === 'global' ? (
                <p className="text-sm text-slate-300 leading-relaxed">
                  Toàn bộ ứng dụng và trình duyệt trên máy sẽ đi qua{' '}
                  <span className="font-semibold text-white">
                    {activeNode?.name ?? 'máy chủ đang chọn'}
                  </span>
                  .
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {targets.processes.slice(0, 6).map((proc) => (
                    <div
                      key={proc}
                      className="flex items-center justify-between py-2.5 text-xs"
                    >
                      <span className="font-mono text-slate-200 truncate pr-2">{proc}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 shrink-0">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{activeNode?.name ?? 'Proxy'}</span>
                      </span>
                    </div>
                  ))}
                  {targets.processes.length === 0 && (
                    <p className="py-3 text-xs text-amber-300">
                      Hãy bật ít nhất một tựa game bên trái để áp dụng tách luồng.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 space-y-3 bg-[#0E111B]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-200">
                  Giữ nguyên mạng nội địa tốc độ gốc
                </span>
                <span className="text-xs text-slate-400">Trực tiếp</span>
              </div>
              {routing.mode === 'global' ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đang ở chế độ Toàn bộ máy — chỉ kết nối mạng nội bộ LAN đi thẳng. Chuyển sang{' '}
                  <span className="text-slate-200">Chỉ định tuyến riêng Game</span> nếu bạn muốn xem YouTube và gọi Discord bằng đường truyền gốc.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] border-t border-white/[0.06] text-xs text-slate-400">
                  {routing.bypassProcesses.map((proc) => (
                    <div key={proc} className="flex items-center justify-between py-2">
                      <span className="font-mono text-slate-300">{proc}</span>
                      <span>Không qua VPN</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-300">Trình duyệt, nhạc, tải file khác</span>
                    <span>Không qua VPN</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
