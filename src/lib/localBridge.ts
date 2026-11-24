import type { SingBoxConfig } from './configBuilder';

export const DEFAULT_LOCAL_AGENT_URL = 'http://127.0.0.1:17890';

export interface LocalAgentHealth {
  ok: boolean;
  running: boolean;
  isAdmin: boolean;
  platform: string;
  singBoxFound: boolean;
  activeNodeName?: string | null;
}

export interface LocalAgentActionResult {
  ok: boolean;
  message: string;
  running?: boolean;
}

export interface LocalAgentPingResult {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function probeLocalAgent(
  baseUrl = DEFAULT_LOCAL_AGENT_URL,
): Promise<{ connected: true; health: LocalAgentHealth } | { connected: false; error: string }> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`, { method: 'GET' }, 1800);
    if (!res.ok) {
      return {
        connected: false,
        error: `Local Agent phản hồi mã lỗi ${res.status}.`,
      };
    }
    const data = (await res.json()) as LocalAgentHealth;
    return { connected: true, health: data };
  } catch {
    return {
      connected: false,
      error:
        'Chưa thấy PingGate Local Agent trên máy tính (127.0.0.1:17890). Hãy tải gói chạy ngay (.zip) và mở PingGate-Windows.bat (hoặc PingGate-macOS.command).',
    };
  }
}

export async function startLocalAgentTunnel(
  config: SingBoxConfig,
  nodeName: string,
  baseUrl = DEFAULT_LOCAL_AGENT_URL,
): Promise<LocalAgentActionResult> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/connect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, nodeName }),
      },
      5000,
    );
    const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: data.error || data.message || 'Không thể khởi chạy sing-box trên máy tính.',
      };
    }
    return {
      ok: true,
      running: true,
      message: data.message || 'Đã bật TUN interface thật qua sing-box trên máy tính.',
    };
  } catch {
    return {
      ok: false,
      message: 'Mất kết nối tới PingGate Local Agent trên máy tính.',
    };
  }
}

export async function stopLocalAgentTunnel(
  baseUrl = DEFAULT_LOCAL_AGENT_URL,
): Promise<LocalAgentActionResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/disconnect`, { method: 'POST' }, 3000);
    const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    return {
      ok: Boolean(res.ok && data.ok),
      running: false,
      message: data.message || data.error || 'Đã dừng sing-box và khôi phục mạng gốc.',
    };
  } catch {
    return {
      ok: false,
      message: 'Không thể liên hệ Local Agent để ngắt kết nối.',
    };
  }
}

export async function measureRealPingViaAgent(
  host: string,
  port: number,
  baseUrl = DEFAULT_LOCAL_AGENT_URL,
): Promise<LocalAgentPingResult> {
  try {
    const res = await fetchWithTimeout(
      `${baseUrl}/ping`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
      },
      4000,
    );
    const data = (await res.json()) as { ok?: boolean; latencyMs?: number | null; error?: string };
    return {
      ok: Boolean(res.ok && data.ok),
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : null,
      error: data.error,
    };
  } catch {
    return {
      ok: false,
      latencyMs: null,
      error: 'Không đo được TCP Ping qua Local Agent.',
    };
  }
}
