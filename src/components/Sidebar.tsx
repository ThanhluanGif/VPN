import {
  Code2,
  GitBranch,
  Power,
  Server,
  Shield,
  X,
} from 'lucide-react';
import type { ActiveView, RoutingMode } from '../types/network';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  nodeCount: number;
  routingMode: RoutingMode;
  enabledGameCount: number;
  isConnected: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveView;
  label: string;
  icon: typeof Power;
}> = [
  { id: 'connect', label: 'Kết nối', icon: Power },
  { id: 'nodes', label: 'Danh sách Node', icon: Server },
  { id: 'routing', label: 'Định tuyến & Config', icon: GitBranch },
  { id: 'python', label: 'Mã nguồn Python', icon: Code2 },
];

export function Sidebar({
  activeView,
  onSelectView,
  nodeCount,
  routingMode,
  enabledGameCount,
  isConnected,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col bg-[#0F1520] border-r border-slate-800/80">
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            PingGate
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Đóng thanh điều hướng"
          className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                active
                  ? 'bg-slate-800/90 text-slate-50'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'nodes' && (
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {nodeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 px-5 py-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Trạng thái</span>
          <span className={isConnected ? 'font-medium text-emerald-400' : 'text-slate-300'}>
            {isConnected ? 'Đang định tuyến' : 'Chờ kết nối'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Chế độ</span>
          <span className="text-slate-200 font-medium">
            {routingMode === 'split' ? 'Riêng Game' : 'Toàn bộ máy'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Game áp dụng</span>
          <span className="font-mono tabular-nums text-slate-300">
            {routingMode === 'split' ? `${enabledGameCount} tựa game` : 'Tất cả ứng dụng'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-68 max-w-[82vw] h-full">{content}</div>
        </div>
      )}
    </>
  );
}
