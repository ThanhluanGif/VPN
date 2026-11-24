import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  Laptop,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import type { LocalAgentHealth } from '../lib/localBridge';
import type { DesktopPlatform, DetectedDevice } from '../lib/platformDetect';
import type { ProxyNode, RoutingProfile } from '../types/network';
import { collectActiveRoutingTargets } from '../lib/configBuilder';

interface DownloadSectionProps {
  activeNode: ProxyNode | null;
  routing: RoutingProfile;
  detectedDevice: DetectedDevice;
  agentHealth: LocalAgentHealth | null;
  isProbingAgent: boolean;
  agentNotice: { type: 'info' | 'error' | 'success'; text: string } | null;
  onDownloadInstaller: (platform: DesktopPlatform) => void;
  onDownloadConfigOnly: () => void;
  onProbeAgent: () => void;
}

export function DownloadSection({
  activeNode,
  routing,
  detectedDevice,
  agentHealth,
  isProbingAgent,
  agentNotice,
  onDownloadInstaller,
  onDownloadConfigOnly,
  onProbeAgent,
}: DownloadSectionProps) {
  const [platform, setPlatform] = useState<DesktopPlatform>(detectedDevice.recommendedBundle);
  const [userOverrodeOs, setUserOverrodeOs] = useState(false);
  const targets = collectActiveRoutingTargets(routing);

  useEffect(() => {
    if (!userOverrodeOs) {
      setPlatform(detectedDevice.recommendedBundle);
    }
  }, [detectedDevice.recommendedBundle, userOverrodeOs]);

  function handleSelectPlatform(next: DesktopPlatform) {
    setUserOverrodeOs(true);
    setPlatform(next);
  }

  return (
    <section
      id="download"
      className="scroll-mt-20 py-16 sm:py-24 border-t border-white/[0.06]"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/[0.1] bg-[#131722] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
            {/* Left: Primary Download Action */}
            <div className="lg:col-span-7 p-7 sm:p-10 space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                  Tải PingGate và bật VPN thật cho game chỉ trong 1 phút
                </h2>
                <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
                  Gói cài đặt tự động đóng gói sẵn máy chủ{' '}
                  <span className="font-semibold text-slate-200">
                    {activeNode?.name ?? 'mặc định'}
                  </span>{' '}
                  cùng{' '}
                  <span className="font-semibold text-slate-200">
                    {routing.mode === 'split'
                      ? `${targets.enabledGameNames.length} tựa game tách luồng`
                      : 'chế độ Toàn bộ máy'}
                  </span>{' '}
                  mà bạn vừa chọn trên website.
                </p>
              </div>

              {/* Auto-detected machine info */}
              <div className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    detectedDevice.isDesktopSupported ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{detectedDevice.compatibilityNote}</span>
              </div>

              {/* OS Selector Tabs */}
              <div
                role="tablist"
                aria-label="Chọn hệ điều hành tải bộ cài"
                className="inline-flex rounded-xl bg-[#0E111B] p-1 border border-white/[0.08]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={platform === 'windows'}
                  onClick={() => handleSelectPlatform('windows')}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                    platform === 'windows'
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Windows 10 / 11
                    {detectedDevice.os === 'windows' ? ' (Máy này)' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={platform === 'macos'}
                  onClick={() => handleSelectPlatform('macos')}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                    platform === 'macos'
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Laptop className="h-4 w-4" aria-hidden="true" />
                  <span>
                    macOS
                    {detectedDevice.os === 'macos' ? ' (Máy này)' : ''}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onDownloadInstaller(platform)}
                  className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {platform === 'windows'
                      ? 'Tải bộ cài cho Windows (.zip)'
                      : 'Tải bộ cài cho macOS (.zip)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onProbeAgent}
                  disabled={isProbingAgent}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 hover:bg-white/[0.08] transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isProbingAgent ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {agentHealth?.ok
                      ? `Đã kết nối (${agentHealth.platform})`
                      : isProbingAgent
                        ? 'Đang dò ứng dụng...'
                        : 'Đã cài? Kết nối với Web'}
                  </span>
                </button>
              </div>

              {agentNotice && (
                <div
                  role={agentNotice.type === 'error' ? 'alert' : 'status'}
                  className={`flex items-start gap-2 text-xs leading-relaxed ${
                    agentNotice.type === 'error'
                      ? 'text-amber-300'
                      : agentNotice.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                  }`}
                >
                  {agentNotice.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>{agentNotice.text}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <span>
                  {platform === 'windows'
                    ? 'Tự động tải lõi sing-box chính thức & xin quyền quản trị khi mở lần đầu.'
                    : 'Hỗ trợ cả chip Apple Silicon (M1–M4) và Intel macOS.'}
                </span>
                <button
                  type="button"
                  onClick={onDownloadConfigOnly}
                  className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Xuất riêng config.json</span>
                </button>
              </div>
            </div>

            {/* Right: 3 Plain-Language Install Steps */}
            <div className="lg:col-span-5 bg-[#0E111B] p-7 sm:p-10 flex flex-col justify-center space-y-6">
              <h3 className="text-sm font-semibold text-white">
                3 bước cài đặt và kết nối ngay
              </h3>
              <ol className="space-y-5">
                <li className="flex gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-mono text-xs font-semibold text-indigo-300">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Tải về và giải nén thư mục
                    </p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Mọi máy chủ và game bạn chọn trên website đã được lưu sẵn bên trong bộ cài.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-mono text-xs font-semibold text-indigo-300">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Nhấp đúp tệp khởi chạy tự động
                    </p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Mở{' '}
                      <code className="text-slate-200">
                        {platform === 'windows'
                          ? 'PingGate-Windows.bat'
                          : 'PingGate-macOS.command'}
                      </code>{' '}
                      và xác nhận quyền quản trị để khởi tạo card mạng ảo TUN.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-mono text-xs font-semibold text-indigo-300">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Nhấn 1 nút Kết nối & vào game
                    </p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Dùng trực tiếp trên cửa sổ ứng dụng vừa mở hoặc nhấn Kết nối ngay tại website này.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
