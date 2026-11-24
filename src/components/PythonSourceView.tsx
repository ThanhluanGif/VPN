import { useState } from 'react';
import { Check, Copy, Download, Package, Terminal } from 'lucide-react';
import { copyToClipboard, downloadTextFile } from '../lib/download';
import { PYTHON_MODULES } from '../lib/pythonTemplates';

interface PythonSourceViewProps {
  onDownloadConfig: () => void;
  onExportProfiles: () => void;
  onDownloadDesktopBundle: () => void;
}

export function PythonSourceView({
  onDownloadConfig,
  onExportProfiles,
  onDownloadDesktopBundle,
}: PythonSourceViewProps) {
  const [selectedId, setSelectedId] = useState(PYTHON_MODULES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeModule =
    PYTHON_MODULES.find((m) => m.id === selectedId) ?? PYTHON_MODULES[0];

  async function handleCopy() {
    const ok = await copyToClipboard(activeModule.code);
    if (ok) {
      setCopiedId(activeModule.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  }

  function handleDownloadActive() {
    downloadTextFile(activeModule.filename, activeModule.code, 'text/x-python;charset=utf-8');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-100">
                Gói chạy ngay trên Desktop & Mã nguồn Python
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Tải 1 tệp ZIP duy nhất chứa đủ 5 module Python, bộ khởi chạy tự tải sing-box (<code className="text-slate-200">PingGate-Windows.bat</code> / <code className="text-slate-200">PingGate-macOS.command</code>), trình đóng gói <code className="text-slate-200">build_exe.bat</code>, cùng <code className="text-slate-200">profiles.json</code> và <code className="text-slate-200">config.json</code> bạn vừa cấu hình.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportProfiles}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải profiles.json</span>
              </button>
              <button
                type="button"
                onClick={onDownloadConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải config.json</span>
              </button>
              <button
                type="button"
                onClick={onDownloadDesktopBundle}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
              >
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải trọn gói Desktop (.zip)</span>
              </button>
            </div>
          </div>

          {/* 3-Step Instant Setup Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-800/80 rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800/80 bg-[#0D131F]">
            <div className="p-4">
              <p className="text-xs font-semibold text-emerald-400">Bước 1 · Tải & giải nén</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Bấm <span className="font-medium text-slate-100">Tải trọn gói Desktop (.zip)</span> và giải nén ra thư mục bất kỳ trên máy tính.
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-emerald-400">Bước 2 · Nhấp đúp khởi chạy</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Mở <code className="text-slate-100">PingGate-Windows.bat</code> (hoặc <code className="text-slate-100">.command</code> trên macOS) — tự xin quyền Admin và tải <code className="text-slate-100">sing-box</code>.
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-emerald-400">Bước 3 · Bật & vào game</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Bấm bật kết nối trực tiếp trên cửa sổ Desktop hoặc nhấn <span className="font-medium text-slate-100">Kết nối Local Agent</span> trên trang web này.
              </p>
            </div>
          </div>

          {/* 5-Module Selector */}
          <div
            role="tablist"
            aria-label="Các giai đoạn mã nguồn Python"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
          >
            {PYTHON_MODULES.map((mod) => {
              const active = mod.id === activeModule.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(mod.id)}
                  className={`rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                    active
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-100'
                      : 'border-slate-800 bg-[#0B0F17] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-medium text-emerald-400">{mod.stage}</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-slate-100 truncate">
                    {mod.filename}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Module Viewer */}
      <section
        aria-label={`Mã nguồn ${activeModule.filename}`}
        className="rounded-xl border border-slate-800/80 bg-[#111827] overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-[#0D131F] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100">
              {activeModule.stage}: {activeModule.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{activeModule.summary}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              {copiedId === activeModule.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copiedId === activeModule.id ? 'Đã chép' : 'Sao chép mã'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadActive}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tải {activeModule.filename}</span>
            </button>
          </div>
        </div>

        <pre className="max-h-[540px] overflow-auto bg-[#080C12] p-5 font-mono text-xs text-slate-200 leading-relaxed">
          {activeModule.code}
        </pre>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-[#0D131F] px-6 py-3.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              Muốn đóng gói thành file <code className="text-slate-200">.exe</code> độc lập? Chạy <code className="text-slate-200">PingGate-Windows.bat</code> 1 lần rồi nhấp đúp <code className="text-slate-200">build_exe.bat</code> trong gói tải về.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
