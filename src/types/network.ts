export type ProxyProtocol = 'vless' | 'vmess' | 'trojan' | 'shadowsocks';

export type RoutingMode = 'split' | 'global';

export type TunStack = 'system' | 'gvisor' | 'mixed';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

export type ActiveView = 'connect' | 'nodes' | 'routing' | 'python';

export interface SingBoxTlsConfig {
  enabled: boolean;
  server_name?: string;
  insecure?: boolean;
  alpn?: string[];
  utls?: {
    enabled: boolean;
    fingerprint: string;
  };
  reality?: {
    enabled: boolean;
    public_key: string;
    short_id?: string;
  };
}

export interface SingBoxTransportConfig {
  type: 'ws' | 'grpc' | 'http' | 'httpupgrade';
  path?: string;
  headers?: Record<string, string>;
  service_name?: string;
  host?: string;
}

export interface SingBoxOutbound {
  type: ProxyProtocol;
  tag: string;
  server: string;
  server_port: number;
  uuid?: string;
  password?: string;
  method?: string;
  flow?: string;
  security?: string;
  alter_id?: number;
  packet_encoding?: string;
  tls?: SingBoxTlsConfig;
  transport?: SingBoxTransportConfig;
}

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  server: string;
  port: number;
  region: string;
  security: string;
  transport: string;
  rawUri: string;
  outbound: SingBoxOutbound;
  latencyMs: number | null;
  lastTestedAt: string | null;
  exitIp: string;
  addedAt: string;
  loadPercent?: number;
  isFreeTier?: boolean;
}

export interface GamePreset {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  processes: string[];
  domains: string[];
}

export interface TunSettings {
  interfaceName: string;
  address: string;
  mtu: number;
  stack: TunStack;
  strictRoute: boolean;
  autoRoute: boolean;
  sniff: boolean;
  proxyDns: string;
  localDns: string;
}

export interface RoutingProfile {
  mode: RoutingMode;
  games: GamePreset[];
  customProcesses: string[];
  customDomains: string[];
  bypassProcesses: string[];
  tun: TunSettings;
}

export interface AppProfilesData {
  version: number;
  activeNodeId: string | null;
  nodes: ProxyNode[];
  routing: RoutingProfile;
}

export type ParseUriResult =
  | { ok: true; node: ProxyNode }
  | { ok: false; error: string };
