import net from 'node:net';

export function isValidPort(port: unknown): port is number {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Returns true only for globally routable public IPv4 or IPv6 addresses.
 * Rejects loopback, RFC1918 private, link-local/cloud metadata, CGNAT, multicast, and reserved ranges.
 */
export function isPublicIpAddress(ip: string): boolean {
  const cleaned = ip.trim().toLowerCase();
  const version = net.isIP(cleaned);

  if (version === 4) {
    const parts = cleaned.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return false;
    }
    const [a, b] = parts;
    if (a === 0) return false; // 0.0.0.0/8
    if (a === 10) return false; // 10.0.0.0/8 private
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 CGNAT
    if (a === 127) return false; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return false; // 169.254.0.0/16 link-local & cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return false; // 192.168.0.0/16 private
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmark
    if (a >= 224) return false; // multicast & reserved
    return true;
  }

  if (version === 6) {
    if (cleaned === '::' || cleaned === '::1') return false;
    if (cleaned.startsWith('::ffff:')) {
      return isPublicIpAddress(cleaned.slice('::ffff:'.length));
    }
    if (cleaned.startsWith('fc') || cleaned.startsWith('fd')) return false; // ULA private
    if (
      cleaned.startsWith('fe8') ||
      cleaned.startsWith('fe9') ||
      cleaned.startsWith('fea') ||
      cleaned.startsWith('feb')
    ) {
      return false; // link-local fe80::/10
    }
    if (cleaned.startsWith('ff')) return false; // multicast
    return true;
  }

  return false;
}
