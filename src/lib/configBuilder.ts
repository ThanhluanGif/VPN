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
    final: string;
    rules: Array<Record<string, unknown>>;
  };
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
        server: 'sg-node.example.com',
        server_port: 443,
        uuid: '00000000-0000-4000-8000-000000000000',
      };

  const dnsRules: Array<Record<string, unknown>> = [
    {
      outbound: ['any'],
      server: 'local-dns',
    },
  ];

  if (routing.mode === 'split' && domains.length > 0) {
    dnsRules.push({
      domain_suffix: domains,
      server: 'proxy-dns',
    });
  }

  const routeRules: Array<Record<string, unknown>> = [
    {
      protocol: 'dns',
      outbound: 'dns-out',
    },
    {
      ip_is_private: true,
      outbound: 'direct',
    },
  ];

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
          tag: 'proxy-dns',
          address: routing.tun.proxyDns,
          detour: 'proxy-outbound',
        },
        {
          tag: 'local-dns',
          address: routing.tun.localDns,
          detour: 'direct',
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
        interface_name: routing.tun.interfaceName,
        address: [routing.tun.address],
        mtu: routing.tun.mtu,
        auto_route: routing.tun.autoRoute,
        strict_route: routing.tun.strictRoute,
        stack: routing.tun.stack,
        sniff: routing.tun.sniff,
        sniff_override_destination: routing.tun.sniff,
      },
    ],
    outbounds: [
      proxyOutbound as unknown as Record<string, unknown>,
      {
        type: 'direct',
        tag: 'direct',
      },
      {
        type: 'block',
        tag: 'block',
      },
      {
        type: 'dns',
        tag: 'dns-out',
      },
    ],
    route: {
      auto_detect_interface: true,
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
