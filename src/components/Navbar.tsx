import { useState } from 'react';
import { Download, Menu, Shield, X } from 'lucide-react';

interface NavbarProps {
  onDownloadClick: () => void;
}

const NAV_LINKS = [
  { href: '#servers', label: 'Máy chủ miễn phí' },
  { href: '#split-tunneling', label: 'Split-Tunneling' },
  { href: '#features', label: 'Tính năng' },
  { href: '#download', label: 'Tải ứng dụng' },
];

export function Navbar({ onDownloadClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0D14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-400 rounded"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>PingGate</span>
        </a>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-400 rounded"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 Primary CTA Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onDownloadClick}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-500 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Tải ứng dụng</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
            aria-expanded={mobileOpen}
            className="md:hidden rounded-lg p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-400"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Điều hướng di động"
          className="md:hidden border-t border-white/[0.08] bg-[#0F121C] px-4 py-3 space-y-1"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
