import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#090B11] py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col sm:flex-row items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="flex items-center gap-2.5 text-slate-200 font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>PingGate</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#servers" className="hover:text-white transition-colors">
            Máy chủ miễn phí
          </a>
          <a href="#split-tunneling" className="hover:text-white transition-colors">
            Split-Tunneling
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Tính năng
          </a>
          <a href="#download" className="hover:text-white transition-colors">
            Tải ứng dụng
          </a>
        </div>

        <p className="text-slate-500">© 2026 PingGate · Định tuyến sing-box TUN</p>
      </div>
    </footer>
  );
}
