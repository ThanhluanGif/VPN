import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { isPublicIpAddress, isValidPort } from './src/lib/netSecurity.ts';
import { parseProxyUri } from './src/lib/uriParser.ts';
import type { ProxyNode } from './src/types/network.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURATED_PUBLIC_FEEDS: ReadonlyArray<{ url: string; source: string }> = [
  {
    url: 'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Sub1.txt',
    source: 'barry-far/Sub1',
  },
  {
    url: 'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Sub2.txt',
    source: 'barry-far/Sub2',
  },
  {
    url: 'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Splitted-By-Protocol/trojan.txt',
    source: 'barry-far/trojan',
  },
  {
    url: 'https://raw.githubusercontent.com/mahdibland/V2RayAggregator/master/sub/sub_merge.txt',
    source: 'V2RayAggregator',
  },
];

const CACHE_TTL_MS = 3 * 60 * 1000;
let liveNodesCache: { fetchedAt: number; nodes: ProxyNode[] } | null = null;
let inFlightLiveFetch: Promise<ProxyNode[]> | null = null;

async function resolvePublicIp(host: string): Promise<string | null> {
  const cleaned = host.trim().replace(/^\[|\]$/g, '');
  if (!cleaned || cleaned.length > 253) return null;
  if (net.isIP(cleaned)) {
    return isPublicIpAddress(cleaned) ? cleaned : null;
  }
  try {
    const record = await dns.lookup(cleaned, { family: 4 });
    return isPublicIpAddress(record.address) ? record.address : null;
  } catch {
    return null;
  }
}

async function measurePublicTcpPing(
  host: string,
  port: number,
  timeoutMs = 1700,
): Promise<{ latencyMs: number | null; resolvedIp: string | null }> {
  if (!isValidPort(port)) {
    return { latencyMs: null, resolvedIp: null };
  }
  const resolvedIp = await resolvePublicIp(host);
  if (!resolvedIp) {
    return { latencyMs: null, resolvedIp: null };
  }

  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host: resolvedIp, port, timeout: timeoutMs });
    let settled = false;

    const done = (latencyMs: number | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ latencyMs, resolvedIp });
    };

    socket.on('connect', () => {
      done(Math.max(1, Date.now() - start));
    });
    socket.on('timeout', () => done(null));
    socket.on('error', () => done(null));
  });
}

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
  ['🇸🇪', 'Thụy Điển'],
  ['🇨🇭', 'Thụy Sĩ'],
  ['🇵🇱', 'Ba Lan'],
  ['🇹🇷', 'Thổ Nhĩ Kỳ'],
];

function safeDecodeRepeated(raw: string): string {
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

function inferRegionWithFlags(rawName: string, existingRegion: string): string {
  if (existingRegion && existingRegion !== 'Quốc tế') return existingRegion;
  const decoded = safeDecodeRepeated(rawName);
  for (const [flag, region] of FLAG_REGION_MAP) {
    if (decoded.includes(flag)) return region;
  }
  const lower = decoded.toLowerCase();
  if (/(^|[^a-z])(nl|netherlands|amsterdam)([^a-z]|$)/.test(lower)) return 'Hà Lan';
  if (/(^|[^a-z])(uk|gb|london|england)([^a-z]|$)/.test(lower)) return 'Anh';
  if (/(^|[^a-z])(fr|france|paris)([^a-z]|$)/.test(lower)) return 'Pháp';
  if (/(^|[^a-z])(fi|finland|helsinki)([^a-z]|$)/.test(lower)) return 'Phần Lan';
  if (/(^|[^a-z])(at|austria|vienna)([^a-z]|$)/.test(lower)) return 'Áo';
  if (/(^|[^a-z])(ca|canada|toronto)([^a-z]|$)/.test(lower)) return 'Canada';
  return 'Quốc tế';
}

function cleanNodeDisplayName(
  rawName: string,
  protocol: string,
  region: string,
  index: number,
): string {
  const protoLabel = protocol === 'shadowsocks' ? 'SS' : protocol.toUpperCase();
  const decoded = safeDecodeRepeated(rawName);

  // Reject Telegram promos, non-ASCII spam scripts, or URL-encoded leftovers
  const looksLikeSpam =
    /telegram|join|channel|t\.me|http|@|free\s*vpn|sub|config|bot|vip|[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF]/i.test(
      decoded,
    );

  if (!looksLikeSpam) {
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
  return `${regionTag} ${protoLabel} #${String(index + 1).padStart(2, '0')}`;
}

function extractCandidateLines(rawText: string): string[] {
  const directLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^(vless|trojan|vmess|ss):\/\//i.test(l));

  if (directLines.length > 0) {
    return directLines;
  }

  // Some community feeds distribute base64-encoded line lists
  try {
    const compact = rawText.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=_-]+$/.test(compact) && compact.length > 32) {
      const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
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

async function fetchAndVerifyLiveNodes(forceRefresh = false): Promise<ProxyNode[]> {
  if (
    !forceRefresh &&
    liveNodesCache &&
    Date.now() - liveNodesCache.fetchedAt < CACHE_TTL_MS &&
    liveNodesCache.nodes.length > 0
  ) {
    return liveNodesCache.nodes;
  }

  if (!forceRefresh && inFlightLiveFetch) {
    return inFlightLiveFetch;
  }

  const job = runLiveNodeVerification();
  if (!forceRefresh) {
    inFlightLiveFetch = job;
  }
  try {
    return await job;
  } finally {
    if (inFlightLiveFetch === job) {
      inFlightLiveFetch = null;
    }
  }
}

async function runLiveNodeVerification(): Promise<ProxyNode[]> {

  const candidateLines: string[] = [];
  await Promise.all(
    CURATED_PUBLIC_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'PingGate-Verifier/1.0' },
        });
        if (!res.ok) return;
        const text = await res.text();
        const lines = extractCandidateLines(text);
        candidateLines.push(...lines.slice(0, 35));
      } catch {
        // Ignore individual upstream feed failures
      }
    }),
  );

  // Deduplicate by server:port and parse with our strict sing-box parser
  const parsedCandidates: ProxyNode[] = [];
  const seenHostPort = new Set<string>();

  for (const line of candidateLines) {
    const parsed = parseProxyUri(line);
    if (!parsed.ok) continue;
    const key = `${parsed.node.server}:${parsed.node.port}`;
    if (seenHostPort.has(key)) continue;
    if (
      parsed.node.outbound.transport?.type &&
      !['ws', 'grpc', 'httpupgrade'].includes(parsed.node.outbound.transport.type)
    ) {
      continue;
    }
    seenHostPort.add(key);
    parsedCandidates.push(parsed.node);
    if (parsedCandidates.length >= 60) break;
  }

  // Run bounded concurrent real TCP handshake verification
  const verified: ProxyNode[] = [];
  const batchSize = 15;

  for (let i = 0; i < parsedCandidates.length && verified.length < 10; i += batchSize) {
    const batch = parsedCandidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (node) => {
        const check = await measurePublicTcpPing(node.server, node.port, 1600);
        if (check.latencyMs === null || !check.resolvedIp) return null;
        const resolvedRegion = inferRegionWithFlags(node.name, node.region);
        return {
          ...node,
          id: `live-${node.protocol}-${node.server.replace(/[^a-z0-9]/gi, '')}-${node.port}`,
          region: resolvedRegion,
          latencyMs: check.latencyMs,
          exitIp: check.resolvedIp,
          isFreeTier: true,
          lastTestedAt: new Date().toISOString(),
        } satisfies ProxyNode;
      }),
    );

    for (const item of results) {
      if (item && verified.length < 10) {
        verified.push(item);
      }
    }
  }

  verified.sort((a, b) => (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999));

  const polished = verified.map((node, idx) => ({
    ...node,
    name: cleanNodeDisplayName(node.name, node.protocol, node.region, idx),
  }));

  if (polished.length > 0) {
    liveNodesCache = {
      fetchedAt: Date.now(),
      nodes: polished,
    };
  }

  return polished;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/servers/live', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const forceRefresh = req.query.refresh === '1';
      const nodes = await fetchAndVerifyLiveNodes(forceRefresh);
      res.json({
        ok: true,
        nodes,
        verifiedAt: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({
        ok: false,
        error: 'Không thể tải danh sách máy chủ cộng đồng lúc này.',
      });
    }
  });

  app.post('/api/servers/ping', async (req, res) => {
    const targets = req.body?.targets;
    if (!Array.isArray(targets) || targets.length === 0 || targets.length > 20) {
      res.status(400).json({
        ok: false,
        error: 'Danh sách máy chủ cần đo ping không hợp lệ (tối đa 20 máy chủ mỗi lượt).',
      });
      return;
    }

    const results = await Promise.all(
      targets.map(async (item: unknown) => {
        if (!item || typeof item !== 'object') {
          return { id: '', latencyMs: null, resolvedIp: null, reachable: false };
        }
        const rec = item as { id?: unknown; server?: unknown; port?: unknown };
        const id = typeof rec.id === 'string' ? rec.id : '';
        const server = typeof rec.server === 'string' ? rec.server : '';
        const port = Number(rec.port);
        if (!id || !server || !isValidPort(port)) {
          return { id, latencyMs: null, resolvedIp: null, reachable: false };
        }
        const check = await measurePublicTcpPing(server, port, 2000);
        return {
          id,
          latencyMs: check.latencyMs,
          resolvedIp: check.resolvedIp,
          reachable: check.latencyMs !== null,
        };
      }),
    );

    res.json({
      ok: true,
      results,
      measuredAt: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const portArgIdx = process.argv.indexOf('--port');
  const cliPort =
    portArgIdx !== -1 && process.argv[portArgIdx + 1]
      ? Number(process.argv[portArgIdx + 1])
      : NaN;
  const PORT = Number.isInteger(cliPort) && cliPort > 0
    ? cliPort
    : process.env.NODE_ENV === 'production'
      ? Number(process.env.PORT || 3000)
      : 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PingGate server listening on http://0.0.0.0:${PORT}`);
    // Pre-warm TCP-verified live community nodes so first visitor load is instant
    void fetchAndVerifyLiveNodes(false).catch(() => {});
  });
}

startServer();
