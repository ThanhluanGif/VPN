import type { ProxyNode, RoutingProfile, SingBoxOutbound } from '../types/network';

export interface SingBoxConfig {
  log: {
    level: string;
    timestamp: boolean;
  };
  dns: {
    servers: Array<Record<string, unknown>>;
    rules: Array<Record<string, unknown>>;
    strategy: string;
    final: string;
  };
  inbounds: Array<Record<string, unknown>>;
  outbounds: Array<Record<string, unknown>>;
  route: {
    auto_detect_interface: boolean;
    default_domain_resolver: string;
    final: string;
    rules: Array<Record<string, unknown>>;
  };
}

function parseDnsServerSpec(rawAddress: string): { type: 'https' | 'udp'; server: string } {
  const trimmed = rawAddress.trim();
  if (/^https:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return { type: 'https', server: parsed.hostname || '1.1.1.1' };
    } catch {
      return { type: 'https', server: '1.1.1.1' };
    }
  }
  return { type: 'udp', server: trimmed || '1.1.1.1' };
}

export function collectActiveRoutingTargets(routing: RoutingProfile): {
  processes: string[];
  domains: string[];
  enabledGameNames: string[];
} {
  const processSet = new Set<string>();
  const domainSet = new Set<string>();
  const enabledGameNames: string[] = [];

  for (const game of routing.games) {
    if (!game.enabled) continue;
    enabledGameNames.push(game.name);
    for (const proc of game.processes) {
      const cleaned = proc.trim();
      if (cleaned) processSet.add(cleaned);
    }
    for (const domain of game.domains) {
      const cleaned = domain.trim().toLowerCase();
      if (cleaned) domainSet.add(cleaned);
    }
  }

  for (const proc of routing.customProcesses) {
    const cleaned = proc.trim();
    if (cleaned) processSet.add(cleaned);
  }

  for (const domain of routing.customDomains) {
    const cleaned = domain.trim().toLowerCase();
    if (cleaned) domainSet.add(cleaned);
  }

  return {
    processes: Array.from(processSet),
    domains: Array.from(domainSet),
    enabledGameNames,
  };
}

export function buildSingBoxConfig(
  node: ProxyNode | null,
  routing: RoutingProfile,
): SingBoxConfig {
  const { processes, domains } = collectActiveRoutingTargets(routing);

  const proxyOutbound: SingBoxOutbound = node
    ? { ...node.outbound, tag: 'proxy-outbound' }
    : {
        type: 'vless',
        tag: 'proxy-outbound',
        server: '1.1.1.1',
        server_port: 443,
        uuid: '00000000-0000-4000-8000-000000000000',
      };

  const proxyDnsSpec = parseDnsServerSpec(routing.tun.proxyDns);
  const localDnsSpec = parseDnsServerSpec(routing.tun.localDns);

  const dnsRules: Array<Record<string, unknown>> = [];
  if (routing.mode === 'split' && domains.length > 0) {
    dnsRules.push({
      domain_suffix: domains,
      server: 'proxy-dns',
    });
  }

  const routeRules: Array<Record<string, unknown>> = [];
  if (routing.tun.sniff) {
    routeRules.push({ action: 'sniff' });
  }
  routeRules.push(
    {
      protocol: 'dns',
      action: 'hijack-dns',
    },
    {
      ip_is_private: true,
      outbound: 'direct',
    },
  );

  if (routing.mode === 'split') {
    if (routing.bypassProcesses.length > 0) {
      routeRules.push({
        process_name: routing.bypassProcesses,
        outbound: 'direct',
      });
    }
    if (processes.length > 0) {
      routeRules.push({
        process_name: processes,
        outbound: 'proxy-outbound',
      });
    }
    if (domains.length > 0) {
      routeRules.push({
        domain_suffix: domains,
        outbound: 'proxy-outbound',
      });
    }
  }

  return {
    log: {
      level: 'info',
      timestamp: true,
    },
    dns: {
      servers: [
        {
          type: proxyDnsSpec.type,
          tag: 'proxy-dns',
          server: proxyDnsSpec.server,
          detour: 'proxy-outbound',
        },
        {
          type: localDnsSpec.type,
          tag: 'local-dns',
          server: localDnsSpec.server,
        },
      ],
      rules: dnsRules,
      strategy: 'ipv4_only',
      final: routing.mode === 'global' ? 'proxy-dns' : 'local-dns',
    },
    inbounds: [
      {
        type: 'tun',
        tag: 'tun-in',
        address: [routing.tun.address],
        mtu: routing.tun.mtu,
        auto_route: routing.tun.autoRoute,
        strict_route: routing.tun.strictRoute,
        stack: routing.tun.stack,
      },
    ],
    outbounds: [
      proxyOutbound as unknown as Record<string, unknown>,
      {
        type: 'direct',
        tag: 'direct',
      },
    ],
    route: {
      auto_detect_interface: true,
      default_domain_resolver: 'local-dns',
      rules: routeRules,
      final: routing.mode === 'global' ? 'proxy-outbound' : 'direct',
    },
  };
}

export function formatSingBoxConfigJson(
  node: ProxyNode | null,
  routing: RoutingProfile,
): string {
  return JSON.stringify(buildSingBoxConfig(node, routing), null, 2);
}
