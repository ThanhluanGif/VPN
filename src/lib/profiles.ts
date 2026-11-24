import type {
  AppProfilesData,
  GamePreset,
  ProxyNode,
  RoutingProfile,
} from '../types/network';
import { parseProxyUri } from './uriParser';

export const PROFILES_STORAGE_KEY = 'pinggate_profiles_v3';

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

export function createDefaultProfilesData(): AppProfilesData {
  return {
    version: 1,
    activeNodeId: null,
    nodes: [],
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
    const customNodes = parsed.nodes.filter((n) => n && !n.isFreeTier);
    return {
      version: 1,
      activeNodeId: typeof parsed.activeNodeId === 'string' ? parsed.activeNodeId : null,
      nodes: customNodes,
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

export function getLatencyTier(latencyMs: number | null): {
  label: string;
  tone: 'good' | 'fair' | 'high' | 'idle';
} {
  if (latencyMs === null) {
    return { label: 'Chưa đo', tone: 'idle' };
  }
  if (latencyMs <= 90) {
    return { label: 'Nhanh', tone: 'good' };
  }
  if (latencyMs <= 200) {
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
