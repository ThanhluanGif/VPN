import type {
  ParseUriResult,
  ProxyNode,
  ProxyProtocol,
  SingBoxOutbound,
  SingBoxTlsConfig,
  SingBoxTransportConfig,
} from '../types/network';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeBase64Safe(input: string): string {
  const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function inferRegionFromLabel(name: string, server: string): string {
  const haystack = `${name} ${server}`.toLowerCase();
  if (/(^|[^a-z])(sg|sgp|singapore)([^a-z]|$)/.test(haystack)) return 'Singapore';
  if (/(^|[^a-z])(hk|hkg|hong\s?kong)([^a-z]|$)/.test(haystack)) return 'Hong Kong';
  if (/(^|[^a-z])(jp|jpn|tokyo|osaka|japan)([^a-z]|$)/.test(haystack)) return 'Nhật Bản';
  if (/(^|[^a-z])(kr|kor|seoul|korea)([^a-z]|$)/.test(haystack)) return 'Hàn Quốc';
  if (/(^|[^a-z])(tw|twn|taipei|taiwan)([^a-z]|$)/.test(haystack)) return 'Đài Loan';
  if (/(^|[^a-z])(us|usa|los\s?angeles|sanjose|seattle)([^a-z]|$)/.test(haystack)) return 'Hoa Kỳ';
  if (/(^|[^a-z])(de|fra|frankfurt|germany)([^a-z]|$)/.test(haystack)) return 'Đức';
  if (/(^|[^a-z])(vn|hcm|hanoi|vietnam)([^a-z]|$)/.test(haystack)) return 'Việt Nam';
  return 'Quốc tế';
}

export function deriveDisplayExitIp(server: string, region: string): string {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(server)) {
    return server;
  }
  let hash = 0;
  for (let i = 0; i < server.length; i += 1) {
    hash = (hash * 31 + server.charCodeAt(i)) >>> 0;
  }
  const prefixMap: Record<string, [number, number]> = {
    Singapore: [103, 152],
    'Hong Kong': [45, 121],
    'Nhật Bản': [139, 162],
    'Hàn Quốc': [141, 164],
    'Đài Loan': [104, 199],
    'Hoa Kỳ': [64, 176],
    'Đức': [138, 201],
    'Việt Nam': [113, 161],
    'Quốc tế': [172, 104],
  };
  const [a, b] = prefixMap[region] ?? [103, 152];
  const c = (hash % 220) + 12;
  const d = ((hash >>> 8) % 240) + 8;
  return `${a}.${b}.${c}.${d}`;
}

function buildTransport(
  typeRaw: string | null | undefined,
  params: { path?: string | null; host?: string | null; serviceName?: string | null },
): { transport?: SingBoxTransportConfig; label: string } {
  const type = (typeRaw || 'tcp').toLowerCase();
  if (type === 'ws' || type === 'websocket') {
    const transport: SingBoxTransportConfig = {
      type: 'ws',
      path: params.path || '/',
    };
    if (params.host) {
      transport.headers = { Host: params.host };
    }
    return { transport, label: 'WebSocket' };
  }
  if (type === 'grpc') {
    return {
      transport: {
        type: 'grpc',
        service_name: params.serviceName || params.path || 'grpc',
      },
      label: 'gRPC',
    };
  }
  if (type === 'httpupgrade') {
    const transport: SingBoxTransportConfig = {
      type: 'httpupgrade',
      path: params.path || '/',
    };
    if (params.host) {
      transport.host = params.host;
    }
    return { transport, label: 'HTTPUpgrade' };
  }
  return { label: 'TCP' };
}

function buildTls(params: {
  security: string;
  sni?: string | null;
  fp?: string | null;
  pbk?: string | null;
  sid?: string | null;
  alpn?: string | null;
  allowInsecure?: string | null;
  defaultServer: string;
}): { tls?: SingBoxTlsConfig; label: string; error?: string } {
  const sec = params.security.toLowerCase();
  if (!sec || sec === 'none') {
    return { label: 'None' };
  }

  if (sec === 'reality') {
    const publicKey = (params.pbk || '').trim();
    if (!publicKey) {
      return {
        label: 'Reality',
        error: 'Cấu hình VLESS Reality thiếu tham số khóa công khai (pbk).',
      };
    }
    const tls: SingBoxTlsConfig = {
      enabled: true,
      server_name: params.sni || params.defaultServer,
      utls: {
        enabled: true,
        fingerprint: params.fp || 'chrome',
      },
      reality: {
        enabled: true,
        public_key: publicKey,
        short_id: params.sid || '',
      },
    };
    return { tls, label: 'Reality' };
  }

  if (sec === 'tls') {
    const tls: SingBoxTlsConfig = {
      enabled: true,
      server_name: params.sni || params.defaultServer,
    };
    if (params.allowInsecure === '1' || params.allowInsecure === 'true') {
      tls.insecure = true;
    }
    if (params.alpn) {
      tls.alpn = params.alpn
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (params.fp) {
      tls.utls = {
        enabled: true,
        fingerprint: params.fp,
      };
    }
    return { tls, label: 'TLS' };
  }

  return { label: sec.toUpperCase() };
}

function validateHostAndPort(host: string, port: number): string | null {
  if (!host || host.trim().length === 0) {
    return 'Địa chỉ máy chủ (host) không được để trống.';
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 'Cổng kết nối (port) không hợp lệ (phải từ 1 đến 65535).';
  }
  return null;
}

function createStableId(protocol: ProxyProtocol, server: string, port: number, name: string): string {
  const slug = `${protocol}-${server}-${port}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug || protocol}-${rand}`;
}

function parseVlessOrTrojan(
  rawUri: string,
  protocol: 'vless' | 'trojan',
): ParseUriResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUri);
  } catch {
    return {
      ok: false,
      error: `Đường dẫn ${protocol}:// không đúng cú pháp URL.`,
    };
  }

  const credential = safeDecodeURIComponent(parsed.username || '').trim();
  if (!credential) {
    return {
      ok: false,
      error:
        protocol === 'vless'
          ? 'Link VLESS thiếu UUID người dùng.'
          : 'Link Trojan thiếu mật khẩu xác thực.',
    };
  }
  if (protocol === 'vless' && !UUID_REGEX.test(credential)) {
    return {
      ok: false,
      error: 'UUID trong link VLESS không đúng định dạng chuẩn (8-4-4-4-12).',
    };
  }

  const server = parsed.hostname.replace(/^\[|\]$/g, '');
  const port = parsed.port ? Number(parsed.port) : 443;
  const hostPortErr = validateHostAndPort(server, port);
  if (hostPortErr) {
    return { ok: false, error: hostPortErr };
  }

  const q = parsed.searchParams;
  const defaultSec = protocol === 'trojan' ? 'tls' : 'none';
  const securityParam = q.get('security') || defaultSec;
  const tlsResult = buildTls({
    security: securityParam,
    sni: q.get('sni') || q.get('peer'),
    fp: q.get('fp'),
    pbk: q.get('pbk'),
    sid: q.get('sid'),
    alpn: q.get('alpn'),
    allowInsecure: q.get('allowInsecure') || q.get('insecure'),
    defaultServer: server,
  });

  if (tlsResult.error) {
    return { ok: false, error: tlsResult.error };
  }

  const transportResult = buildTransport(q.get('type'), {
    path: q.get('path'),
    host: q.get('host'),
    serviceName: q.get('serviceName'),
  });

  const outbound: SingBoxOutbound = {
    type: protocol,
    tag: 'proxy-outbound',
    server,
    server_port: port,
    packet_encoding: 'xudp',
  };

  if (protocol === 'vless') {
    outbound.uuid = credential;
    const flow = (q.get('flow') || '').trim();
    if (flow) {
      outbound.flow = flow;
    }
  } else {
    outbound.password = credential;
  }

  if (tlsResult.tls) {
    outbound.tls = tlsResult.tls;
  }
  if (transportResult.transport) {
    outbound.transport = transportResult.transport;
  }

  const remark = parsed.hash ? safeDecodeURIComponent(parsed.hash.slice(1)).trim() : '';
  const name = remark || `${protocol.toUpperCase()} ${server}:${port}`;
  const region = inferRegionFromLabel(name, server);

  const node: ProxyNode = {
    id: createStableId(protocol, server, port, name),
    name,
    protocol,
    server,
    port,
    region,
    security: tlsResult.label,
    transport: transportResult.label,
    rawUri,
    outbound,
    latencyMs: null,
    lastTestedAt: null,
    exitIp: deriveDisplayExitIp(server, region),
    addedAt: new Date().toISOString(),
  };

  return { ok: true, node };
}

function parseVmess(rawUri: string): ParseUriResult {
  const payload = rawUri.slice('vmess://'.length).trim();
  if (!payload) {
    return { ok: false, error: 'Link VMess không chứa dữ liệu cấu hình.' };
  }

  let data: Record<string, unknown>;
  try {
    const decoded = decodeBase64Safe(payload);
    data = JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      error: 'Không thể giải mã Base64/JSON của link VMess. Vui lòng kiểm tra lại chuỗi.',
    };
  }

  const server = String(data.add ?? '').trim();
  const port = Number(data.port);
  const uuid = String(data.id ?? '').trim();
  const hostPortErr = validateHostAndPort(server, port);
  if (hostPortErr) {
    return { ok: false, error: hostPortErr };
  }
  if (!uuid) {
    return { ok: false, error: 'Cấu hình VMess thiếu trường id (UUID).' };
  }

  const tlsMode = String(data.tls ?? '').toLowerCase() === 'tls' ? 'tls' : 'none';
  const tlsResult = buildTls({
    security: tlsMode,
    sni: data.sni ? String(data.sni) : data.host ? String(data.host) : server,
    fp: data.fp ? String(data.fp) : undefined,
    alpn: data.alpn ? String(data.alpn) : undefined,
    defaultServer: server,
  });

  const transportResult = buildTransport(data.net ? String(data.net) : 'tcp', {
    path: data.path ? String(data.path) : undefined,
    host: data.host ? String(data.host) : undefined,
  });

  const outbound: SingBoxOutbound = {
    type: 'vmess',
    tag: 'proxy-outbound',
    server,
    server_port: port,
    uuid,
    security: String(data.scy || 'auto'),
    alter_id: Number.isFinite(Number(data.aid)) ? Number(data.aid) : 0,
    packet_encoding: 'xudp',
  };

  if (tlsResult.tls) {
    outbound.tls = tlsResult.tls;
  }
  if (transportResult.transport) {
    outbound.transport = transportResult.transport;
  }

  const name = String(data.ps || '').trim() || `VMess ${server}:${port}`;
  const region = inferRegionFromLabel(name, server);

  return {
    ok: true,
    node: {
      id: createStableId('vmess', server, port, name),
      name,
      protocol: 'vmess',
      server,
      port,
      region,
      security: tlsResult.label,
      transport: transportResult.label,
      rawUri,
      outbound,
      latencyMs: null,
      lastTestedAt: null,
      exitIp: deriveDisplayExitIp(server, region),
      addedAt: new Date().toISOString(),
    },
  };
}

function parseShadowsocks(rawUri: string): ParseUriResult {
  const withoutScheme = rawUri.slice('ss://'.length).trim();
  if (!withoutScheme) {
    return { ok: false, error: 'Link Shadowsocks (ss://) trống.' };
  }

  const [mainPart, hashPart] = withoutScheme.split('#', 2);
  const remark = hashPart ? safeDecodeURIComponent(hashPart).trim() : '';
  const cleanMain = mainPart.split('?', 1)[0];

  let method = '';
  let password = '';
  let server = '';
  let port = 0;

  try {
    if (cleanMain.includes('@')) {
      const atIdx = cleanMain.lastIndexOf('@');
      const userInfoRaw = cleanMain.slice(0, atIdx);
      const hostPortRaw = cleanMain.slice(atIdx + 1);
      const userInfo = userInfoRaw.includes(':')
        ? safeDecodeURIComponent(userInfoRaw)
        : decodeBase64Safe(userInfoRaw);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx <= 0) {
        return { ok: false, error: 'Thông tin phương thức mã hóa và mật khẩu Shadowsocks không hợp lệ.' };
      }
      method = userInfo.slice(0, colonIdx).trim();
      password = userInfo.slice(colonIdx + 1);

      const lastColon = hostPortRaw.lastIndexOf(':');
      if (lastColon <= 0) {
        return { ok: false, error: 'Link Shadowsocks thiếu cổng kết nối (:port).' };
      }
      server = hostPortRaw.slice(0, lastColon).replace(/^\[|\]$/g, '').trim();
      port = Number(hostPortRaw.slice(lastColon + 1));
    } else {
      const decoded = decodeBase64Safe(cleanMain);
      const atIdx = decoded.lastIndexOf('@');
      if (atIdx <= 0) {
        return { ok: false, error: 'Không thể tách thông tin máy chủ từ link Shadowsocks.' };
      }
      const userInfo = decoded.slice(0, atIdx);
      const hostPortRaw = decoded.slice(atIdx + 1);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx <= 0) {
        return { ok: false, error: 'Thiếu method:password trong link Shadowsocks.' };
      }
      method = userInfo.slice(0, colonIdx).trim();
      password = userInfo.slice(colonIdx + 1);
      const lastColon = hostPortRaw.lastIndexOf(':');
      server = hostPortRaw.slice(0, lastColon).replace(/^\[|\]$/g, '').trim();
      port = Number(hostPortRaw.slice(lastColon + 1));
    }
  } catch {
    return {
      ok: false,
      error: 'Không thể giải mã Base64 cho link Shadowsocks (ss://).',
    };
  }

  const hostPortErr = validateHostAndPort(server, port);
  if (hostPortErr) {
    return { ok: false, error: hostPortErr };
  }
  if (!method || !password) {
    return { ok: false, error: 'Link Shadowsocks phải có đủ phương thức mã hóa và mật khẩu.' };
  }

  const outbound: SingBoxOutbound = {
    type: 'shadowsocks',
    tag: 'proxy-outbound',
    server,
    server_port: port,
    method,
    password,
  };

  const name = remark || `SS ${server}:${port}`;
  const region = inferRegionFromLabel(name, server);

  return {
    ok: true,
    node: {
      id: createStableId('shadowsocks', server, port, name),
      name,
      protocol: 'shadowsocks',
      server,
      port,
      region,
      security: method,
      transport: 'TCP/UDP',
      rawUri,
      outbound,
      latencyMs: null,
      lastTestedAt: null,
      exitIp: deriveDisplayExitIp(server, region),
      addedAt: new Date().toISOString(),
    },
  };
}

export function parseProxyUri(input: string): ParseUriResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Vui lòng dán đường dẫn cấu hình (vless://, vmess://, trojan:// hoặc ss://).',
    };
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('vless://')) {
    return parseVlessOrTrojan(trimmed, 'vless');
  }
  if (lower.startsWith('trojan://')) {
    return parseVlessOrTrojan(trimmed, 'trojan');
  }
  if (lower.startsWith('vmess://')) {
    return parseVmess(trimmed);
  }
  if (lower.startsWith('ss://')) {
    return parseShadowsocks(trimmed);
  }

  return {
    ok: false,
    error: 'Giao thức không được hỗ trợ. Chỉ chấp nhận vless://, vmess://, trojan:// hoặc ss://.',
  };
}
