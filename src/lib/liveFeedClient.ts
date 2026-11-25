import { parseProxyUri } from './uriParser';
import type { ProxyNode } from '../types/network';

const DIRECT_BROWSER_FEEDS: ReadonlyArray<string> = [
  'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Sub1.txt',
  'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/trojan.txt',
  'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Sub2.txt',
];

const FLAG_REGION_MAP: ReadonlyArray<[string, string]> = [
  ['🇸🇬', 'Singapore'],
  ['🇭🇰', 'Hong Kong'],
  ['🇯🇵', 'Nhật Bản'],
  ['🇰🇷', 'Hàn Quốc'],
  ['🇹🇼', 'Đài Loan'],
  ['🇻🇳', 'Việt Nam'],
  ['🇺🇸', 'Hoa Kỳ'],
  ['🇩🇪', 'Đức'],
  ['🇳🇱', 'Hà Lan'],
  ['🇬🇧', 'Anh'],
  ['🇫🇷', 'Pháp'],
  ['🇫🇮', 'Phần Lan'],
  ['🇦🇹', 'Áo'],
  ['🇨🇦', 'Canada'],
];

export interface LiveServersFetchResult {
  ok: boolean;
  nodes: ProxyNode[];
  verifiedAt: string;
  source: 'backend-tcp' | 'direct-feed';
  error?: string;
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function safeDecode(raw: string): string {
  let out = raw;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

function cleanDisplayName(rawName: string, protocol: string, region: string, idx: number): string {
  const protoLabel = protocol === 'shadowsocks' ? 'SS' : protocol.toUpperCase();
  const decoded = safeDecode(rawName);
  const spam =
    /telegram|join|channel|t\.me|http|@|free\s*vpn|sub|config|bot|vip|[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF]/i.test(
      decoded,
    );
  if (!spam) {
    const cleaned = decoded
      .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/[_|+•·:]+/g, ' ')
      .replace(/[^A-Za-z0-9\s.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 5 && cleaned.length <= 24 && /[A-Za-z]{2,}/.test(cleaned)) {
      return cleaned;
    }
  }
  const regionTag = region !== 'Quốc tế' ? region : 'Public';
  return `${regionTag} ${protoLabel} #${String(idx + 1).padStart(2, '0')}`;
}

function inferRegion(rawName: string, existing: string): string {
  if (existing && existing !== 'Quốc tế') return existing;
  const decoded = safeDecode(rawName);
  for (const [flag, region] of FLAG_REGION_MAP) {
    if (decoded.includes(flag)) return region;
  }
  return 'Quốc tế';
}

function extractUriLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^(vless|trojan|vmess|ss):\/\//i.test(l));
  if (lines.length > 0) return lines;

  try {
    const compact = text.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=_-]+$/.test(compact) && compact.length > 32) {
      const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
      const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = atob(normalized + pad);
      return decoded
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => /^(vless|trojan|vmess|ss):\/\//i.test(l));
    }
  } catch {
    // Ignore non-base64 content
  }
  return [];
}

async function fetchDirectPublicNodesFromBrowser(): Promise<ProxyNode[]> {
  const rawLines: string[] = [];
  await Promise.all(
    DIRECT_BROWSER_FEEDS.map(async (url) => {
      try {
        const res = await fetchWithTimeout(url, { method: 'GET' }, 8000);
        if (!res.ok) return;
        const text = await res.text();
        rawLines.push(...extractUriLines(text).slice(0, 25));
      } catch {
        // Ignore single feed failure
      }
    }),
  );

  const nodes: ProxyNode[] = [];
  const seen = new Set<string>();
  for (const line of rawLines) {
    const parsed = parseProxyUri(line);
    if (!parsed.ok) continue;
    const key = `${parsed.node.server}:${parsed.node.port}`;
    if (seen.has(key)) continue;
    if (
      parsed.node.outbound.transport?.type &&
      !['ws', 'grpc', 'httpupgrade'].includes(parsed.node.outbound.transport.type)
    ) {
      continue;
    }
    seen.add(key);
    const region = inferRegion(parsed.node.name, parsed.node.region);
    nodes.push({
      ...parsed.node,
      id: `direct-${parsed.node.protocol}-${parsed.node.server.replace(/[^a-z0-9]/gi, '')}-${parsed.node.port}`,
      region,
      name: cleanDisplayName(parsed.node.name, parsed.node.protocol, region, nodes.length),
      isFreeTier: true,
    });
    if (nodes.length >= 10) break;
  }

  return nodes;
}

export async function fetchLiveServersWithFallback(
  forceRefresh = false,
): Promise<LiveServersFetchResult> {
  const endpoint = forceRefresh ? '/api/servers/live?refresh=1' : '/api/servers/live';

  // Attempt 1 & 2: Express backend with real TCP handshake verification
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        },
        22000,
      );
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = (await res.json()) as {
          ok?: boolean;
          nodes?: ProxyNode[];
          verifiedAt?: string;
        };
        if (data.ok && Array.isArray(data.nodes) && data.nodes.length > 0) {
          return {
            ok: true,
            nodes: data.nodes,
            verifiedAt: data.verifiedAt ?? new Date().toISOString(),
            source: 'backend-tcp',
          };
        }
      }
    } catch {
      // Retry transiently (e.g. cold server start)
    }

    if (attempt === 0) {
      await new Promise((r) => window.setTimeout(r, 900));
    }
  }

  // Fallback: fetch the same real live community GitHub feeds directly in browser (CORS *)
  const directNodes = await fetchDirectPublicNodesFromBrowser();
  if (directNodes.length > 0) {
    return {
      ok: true,
      nodes: directNodes,
      verifiedAt: new Date().toISOString(),
      source: 'direct-feed',
    };
  }

  return {
    ok: false,
    nodes: [],
    verifiedAt: new Date().toISOString(),
    source: 'backend-tcp',
    error:
      'Không tải được danh sách máy chủ công cộng lúc này. Vui lòng thử bấm Quét lại sau vài giây hoặc dán link VPS riêng của bạn.',
  };
}
