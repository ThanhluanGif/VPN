import type {
  AppProfilesData,
  GamePreset,
  ProxyNode,
  RoutingProfile,
} from '../types/network';
import { parseProxyUri } from './uriParser';

export const PROFILES_STORAGE_KEY = 'pinggate_profiles_v2';

export const DEFAULT_GAME_PRESETS: GamePreset[] = [
  {
    id: 'roblox',
    name: 'Roblox',
    category: 'Sandbox / UDP',
    enabled: true,
    processes: ['RobloxPlayerBeta.exe', 'RobloxPlayer', 'RobloxStudioBeta.exe'],
    domains: ['roblox.com', 'rbxcdn.com', 'robloxlabs.com', 'rbxinfra.net'],
  },
  {
    id: 'valorant',
    name: 'Valorant',
    category: 'FPS / Riot',
    enabled: false,
    processes: ['VALORANT-Win64-Shipping.exe', 'RiotClientServices.exe'],
    domains: ['riotgames.com', 'valorant.com', 'pvp.net'],
  },
  {
    id: 'lol',
    name: 'League of Legends',
    category: 'MOBA',
    enabled: false,
    processes: ['League of Legends.exe', 'LeagueClientUx.exe'],
    domains: ['leagueoflegends.com', 'riotcdn.net'],
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    category: 'Action RPG',
    enabled: false,
    processes: ['GenshinImpact.exe', 'YuanShen.exe'],
    domains: ['hoyoverse.com', 'mihoyo.com', 'yuanshen.com'],
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    category: 'FPS / Valve',
    enabled: false,
    processes: ['cs2.exe'],
    domains: ['steampowered.com', 'steamserver.net'],
  },
];

export const DEFAULT_ROUTING_PROFILE: RoutingProfile = {
  mode: 'split',
  games: DEFAULT_GAME_PRESETS,
  customProcesses: [],
  customDomains: [],
  bypassProcesses: ['Discord.exe', 'chrome.exe', 'msedge.exe', 'firefox.exe'],
  tun: {
    interfaceName: 'pinggate-tun',
    address: '172.19.0.1/30',
    mtu: 9000,
    stack: 'system',
    strictRoute: true,
    autoRoute: true,
    sniff: true,
    proxyDns: 'https://1.1.1.1/dns-query',
    localDns: '1.1.1.1',
  },
};

const STARTER_NODE_URIS: Array<{
  uri: string;
  initialLatency: number;
  loadPercent: number;
}> = [
  {
    uri: 'vless://3f9c6b12-8b7d-4e92-a31f-6e24d90c8f11@sg01.pinggate-free.net:443?encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=4mK9zX2pQ7vR8tW1yL6nB3cV5dF0hJ8kM2sP9uE4rA0&sid=6ba85179e30d4fc2&type=tcp&flow=xtls-rprx-vision#Singapore%20SG-01',
    initialLatency: 32,
    loadPercent: 28,
  },
  {
    uri: 'vless://8d2a1f44-9c3e-4b71-a82c-1f5e7d9b0a22@sg02.pinggate-free.net:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=9xQ2mN7vB4cK1wR8tL5yP3dF6hJ0sA2uE9rG7nM4vC1&sid=12ab34cd&type=tcp&flow=xtls-rprx-vision#Singapore%20SG-02',
    initialLatency: 37,
    loadPercent: 41,
  },
  {
    uri: 'trojan://pg_hk_88219a4f7c@hk01.pinggate-free.net:443?security=tls&sni=hk01.pinggate-free.net&type=ws&path=%2Fgame-ws&host=hk01.pinggate-free.net#Hong%20Kong%20HK-01',
    initialLatency: 44,
    loadPercent: 35,
  },
  {
    uri: 'vmess://eyJ2IjoiMiIsInBzIjoiVGFpcGVpIFRXLTAxIiwiYWRkIjoidHcwMS5waW5nZ2F0ZS1mcmVlLm5ldCIsInBvcnQiOiI0NDMiLCJpZCI6IjIyMjIyMjIyLTMzMzMtNDQ0NC04NTU1LTY2NjY2NjY2NjY2NiIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJob3N0IjoidHcwMS5waW5nZ2F0ZS1mcmVlLm5ldCIsInBhdGgiOiIvdm0iLCJ0bHMiOiJ0bHMifQ==',
    initialLatency: 53,
    loadPercent: 39,
  },
  {
    uri: 'ss://YWVzLTI1Ni1nY206cGdfanBfdG9reW9fOTQxMg==@jp01.pinggate-free.net:8443#Tokyo%20JP-01',
    initialLatency: 65,
    loadPercent: 48,
  },
  {
    uri: 'trojan://pg_kr_seoul_7731@kr01.pinggate-free.net:443?security=tls&sni=kr01.pinggate-free.net&type=tcp#Seoul%20KR-01',
    initialLatency: 74,
    loadPercent: 52,
  },
];

export function createDefaultProfilesData(): AppProfilesData {
  const nodes: ProxyNode[] = [];
  for (const seed of STARTER_NODE_URIS) {
    const parsed = parseProxyUri(seed.uri);
    if (parsed.ok) {
      nodes.push({
        ...parsed.node,
        id: `free-${nodes.length + 1}`,
        latencyMs: seed.initialLatency,
        loadPercent: seed.loadPercent,
        isFreeTier: true,
        lastTestedAt: '2026-11-24T08:30:00.000Z',
      });
    }
  }

  return {
    version: 1,
    activeNodeId: nodes[0]?.id ?? null,
    nodes,
    routing: structuredClone(DEFAULT_ROUTING_PROFILE),
  };
}

export function loadProfilesFromStorage(): AppProfilesData {
  if (typeof window === 'undefined') {
    return createDefaultProfilesData();
  }
  try {
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      return createDefaultProfilesData();
    }
    const parsed = JSON.parse(raw) as Partial<AppProfilesData>;
    if (!parsed || !Array.isArray(parsed.nodes) || !parsed.routing) {
      return createDefaultProfilesData();
    }
    const defaults = createDefaultProfilesData();
    return {
      version: 1,
      activeNodeId:
        parsed.activeNodeId && parsed.nodes.some((n) => n.id === parsed.activeNodeId)
          ? parsed.activeNodeId
          : parsed.nodes[0]?.id ?? null,
      nodes: parsed.nodes,
      routing: {
        ...defaults.routing,
        ...parsed.routing,
        tun: {
          ...defaults.routing.tun,
          ...(parsed.routing.tun ?? {}),
        },
        games:
          Array.isArray(parsed.routing.games) && parsed.routing.games.length > 0
            ? parsed.routing.games
            : defaults.routing.games,
        customProcesses: Array.isArray(parsed.routing.customProcesses)
          ? parsed.routing.customProcesses
          : [],
        customDomains: Array.isArray(parsed.routing.customDomains)
          ? parsed.routing.customDomains
          : [],
        bypassProcesses: Array.isArray(parsed.routing.bypassProcesses)
          ? parsed.routing.bypassProcesses
          : defaults.routing.bypassProcesses,
      },
    };
  } catch {
    return createDefaultProfilesData();
  }
}

export function saveProfilesToStorage(data: AppProfilesData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors safely
  }
}

export function measureDeterministicLatencyMs(node: ProxyNode, attemptSeed = 0): number {
  const baseByRegion: Record<string, number> = {
    'Việt Nam': 16,
    Singapore: 31,
    'Hong Kong': 42,
    'Đài Loan': 54,
    'Nhật Bản': 64,
    'Hàn Quốc': 74,
    'Hoa Kỳ': 152,
    'Đức': 178,
    'Quốc tế': 86,
  };
  let hash = attemptSeed * 17;
  for (let i = 0; i < node.server.length; i += 1) {
    hash = (hash * 33 + node.server.charCodeAt(i)) >>> 0;
  }
  const base = baseByRegion[node.region] ?? 75;
  const jitter = (hash % 13) - 4;
  return Math.max(12, base + jitter);
}

export function getLatencyTier(latencyMs: number | null): {
  label: string;
  tone: 'good' | 'fair' | 'high' | 'idle';
} {
  if (latencyMs === null) {
    return { label: 'Chưa đo', tone: 'idle' };
  }
  if (latencyMs <= 55) {
    return { label: 'Rất tốt', tone: 'good' };
  }
  if (latencyMs <= 110) {
    return { label: 'Ổn định', tone: 'fair' };
  }
  return { label: 'Ping cao', tone: 'high' };
}

export function validateProfilesImport(rawJson: string):
  | { ok: true; data: AppProfilesData }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<AppProfilesData>;
    if (!parsed || !Array.isArray(parsed.nodes)) {
      return { ok: false, error: 'Tệp profiles.json thiếu danh sách nodes hợp lệ.' };
    }
    const validNodes: ProxyNode[] = [];
    for (const item of parsed.nodes) {
      if (item && typeof item.rawUri === 'string') {
        const reparsed = parseProxyUri(item.rawUri);
        if (reparsed.ok) {
          validNodes.push({
            ...reparsed.node,
            id: typeof item.id === 'string' && item.id ? item.id : reparsed.node.id,
            name: typeof item.name === 'string' && item.name ? item.name : reparsed.node.name,
            latencyMs: typeof item.latencyMs === 'number' ? item.latencyMs : null,
          });
        }
      }
    }
    if (validNodes.length === 0) {
      return { ok: false, error: 'Không tìm thấy node hợp lệ nào trong tệp profiles.json.' };
    }
    const defaults = createDefaultProfilesData();
    return {
      ok: true,
      data: {
        version: 1,
        activeNodeId:
          parsed.activeNodeId && validNodes.some((n) => n.id === parsed.activeNodeId)
            ? parsed.activeNodeId
            : validNodes[0].id,
        nodes: validNodes,
        routing: parsed.routing
          ? {
              ...defaults.routing,
              ...parsed.routing,
              tun: { ...defaults.routing.tun, ...(parsed.routing.tun ?? {}) },
            }
          : defaults.routing,
      },
    };
  } catch {
    return { ok: false, error: 'Nội dung JSON của profiles.json không đúng cú pháp.' };
  }
}
