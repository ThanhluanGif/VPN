export type DesktopPlatform = 'windows' | 'macos';
export type DeviceOs = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
export type CpuArch = 'arm64' | 'x64' | 'unknown';

export interface DeviceDetectionSignals {
  userAgent: string;
  platform: string;
  uaDataPlatform?: string;
  uaDataArch?: string;
  maxTouchPoints?: number;
}

export interface DetectedDevice {
  os: DeviceOs;
  recommendedBundle: DesktopPlatform;
  isDesktopSupported: boolean;
  arch: CpuArch;
  osLabel: string;
  ctaLabel: string;
  shortDownloadLabel: string;
  otherPlatform: DesktopPlatform;
  otherPlatformLabel: string;
  compatibilityNote: string;
}

interface NavigatorUADataLike {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    architecture?: string;
    platform?: string;
  }>;
}

function normalizeArch(rawArch: string | undefined, ua: string): CpuArch {
  const combined = `${rawArch ?? ''} ${ua}`.toLowerCase();
  if (/(arm64|aarch64|\barm\b|apple silicon)/.test(combined)) {
    return 'arm64';
  }
  if (/(x86_64|x86|win64|wow64|amd64|intel|x64)/.test(combined)) {
    return 'x64';
  }
  return 'unknown';
}

export function detectDeviceFromSignals(signals: DeviceDetectionSignals): DetectedDevice {
  const ua = signals.userAgent || '';
  const uaLower = ua.toLowerCase();
  const platformLower = (signals.uaDataPlatform || signals.platform || '').toLowerCase();
  const touchPoints = signals.maxTouchPoints ?? 0;

  let os: DeviceOs = 'unknown';

  // Detect mobile first because Android/iOS UAs contain Linux/Mac OS X tokens
  if (/android/.test(uaLower) || platformLower === 'android') {
    os = 'android';
  } else if (
    /iphone|ipad|ipod/.test(uaLower) ||
    platformLower === 'ios' ||
    (platformLower.includes('mac') && touchPoints > 1)
  ) {
    os = 'ios';
  } else if (/win/.test(platformLower) || /windows/.test(uaLower)) {
    os = 'windows';
  } else if (/mac/.test(platformLower) || /macintosh|mac os x/.test(uaLower)) {
    os = 'macos';
  } else if (/linux|x11|cros/.test(platformLower) || /linux|cros/.test(uaLower)) {
    os = 'linux';
  }

  const arch = normalizeArch(signals.uaDataArch, ua);

  if (os === 'macos') {
    const archSuffix =
      arch === 'arm64' ? ' (Apple Silicon)' : arch === 'x64' ? ' (Intel)' : '';
    return {
      os: 'macos',
      recommendedBundle: 'macos',
      isDesktopSupported: true,
      arch,
      osLabel: `macOS${archSuffix}`,
      ctaLabel: 'Tải PingGate cho macOS',
      shortDownloadLabel: 'Tải cho macOS',
      otherPlatform: 'windows',
      otherPlatformLabel: 'Phiên bản Windows & cách bật',
      compatibilityNote: `Đã nhận diện máy của bạn chạy macOS${archSuffix} — tự chọn sẵn bộ cài PingGate-Setup-macOS.zip.`,
    };
  }

  if (os === 'windows') {
    const archSuffix = arch === 'arm64' ? ' (ARM64)' : arch === 'x64' ? ' (64-bit)' : '';
    return {
      os: 'windows',
      recommendedBundle: 'windows',
      isDesktopSupported: true,
      arch,
      osLabel: `Windows${archSuffix}`,
      ctaLabel: 'Tải PingGate cho Windows',
      shortDownloadLabel: 'Tải cho Windows',
      otherPlatform: 'macos',
      otherPlatformLabel: 'Phiên bản macOS & cách bật',
      compatibilityNote: `Đã nhận diện máy của bạn chạy Windows${archSuffix} — tự chọn sẵn bộ cài PingGate-Setup-Windows.zip.`,
    };
  }

  if (os === 'android' || os === 'ios') {
    const mobileName = os === 'android' ? 'Android' : 'iOS / iPadOS';
    return {
      os,
      recommendedBundle: os === 'ios' ? 'macos' : 'windows',
      isDesktopSupported: false,
      arch,
      osLabel: mobileName,
      ctaLabel: os === 'ios' ? 'Tải bản macOS (PC)' : 'Tải bản Windows (PC)',
      shortDownloadLabel: 'Tải bản PC',
      otherPlatform: os === 'ios' ? 'windows' : 'macos',
      otherPlatformLabel:
        os === 'ios' ? 'Phiên bản Windows & hướng dẫn' : 'Phiên bản macOS & hướng dẫn',
      compatibilityNote: `Bạn đang mở trên ${mobileName}. Bộ cài TUN tự động dành cho Windows/macOS — trên điện thoại bạn có thể bấm "Chép link" ở bảng máy chủ rồi dán vào ứng dụng sing-box hoặc Hiddify.`,
    };
  }

  if (os === 'linux') {
    return {
      os: 'linux',
      recommendedBundle: 'windows',
      isDesktopSupported: false,
      arch,
      osLabel: arch === 'arm64' ? 'Linux (ARM64)' : 'Linux',
      ctaLabel: 'Xuất config.json cho Linux',
      shortDownloadLabel: 'Tải ứng dụng',
      otherPlatform: 'macos',
      otherPlatformLabel: 'Bản Windows & macOS',
      compatibilityNote:
        'Đã nhận diện máy chạy Linux. Bộ cài tự động hỗ trợ Windows & macOS — trên Linux bạn có thể bấm "Xuất riêng config.json" để chạy trực tiếp với sing-box CLI.',
    };
  }

  return {
    os: 'unknown',
    recommendedBundle: 'windows',
    isDesktopSupported: true,
    arch: 'unknown',
    osLabel: 'Máy tính (mặc định Windows)',
    ctaLabel: 'Tải PingGate cho Windows',
    shortDownloadLabel: 'Tải ứng dụng',
    otherPlatform: 'macos',
    otherPlatformLabel: 'Phiên bản macOS & cách bật',
    compatibilityNote: 'Chọn hệ điều hành máy tính của bạn bên dưới để tải đúng bộ cài đặt.',
  };
}

export function detectCurrentDevice(): DetectedDevice {
  if (typeof navigator === 'undefined') {
    return detectDeviceFromSignals({ userAgent: '', platform: '' });
  }
  const nav = navigator as Navigator & { userAgentData?: NavigatorUADataLike };
  return detectDeviceFromSignals({
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    uaDataPlatform: nav.userAgentData?.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
}

export async function refineDeviceWithHighEntropy(): Promise<DetectedDevice> {
  if (typeof navigator === 'undefined') {
    return detectCurrentDevice();
  }
  const nav = navigator as Navigator & { userAgentData?: NavigatorUADataLike };
  const baseSignals: DeviceDetectionSignals = {
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    uaDataPlatform: nav.userAgentData?.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  };

  if (typeof nav.userAgentData?.getHighEntropyValues === 'function') {
    try {
      const hints = await nav.userAgentData.getHighEntropyValues(['architecture', 'platform']);
      return detectDeviceFromSignals({
        ...baseSignals,
        uaDataPlatform: hints.platform || baseSignals.uaDataPlatform,
        uaDataArch: hints.architecture,
      });
    } catch {
      return detectDeviceFromSignals(baseSignals);
    }
  }

  return detectDeviceFromSignals(baseSignals);
}
