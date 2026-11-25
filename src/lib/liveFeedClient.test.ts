import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveServersWithFallback, type FetchLike } from './liveFeedClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function htmlResponse(status = 404): Response {
  return new Response('<!doctype html><html><body>Not found</body></html>', {
    status,
    headers: { 'content-type': 'text/html' },
  });
}

const SAMPLE_FEED_TEXT = [
  'ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpwYXNzMQ@198.51.100.10:443#SG-Fast',
  'trojan://secretpass@203.0.113.20:443?security=tls&sni=example.com#HK-Node',
].join('\n');

test('returns backend-tcp nodes with real latencies when /api/servers/live succeeds', async () => {
  const mockFetch: FetchLike = async (input) => {
    if (String(input).startsWith('/api/servers/live')) {
      return jsonResponse({
        ok: true,
        verifiedAt: '2026-11-25T00:00:00.000Z',
        nodes: [
          {
            id: 'live-1',
            name: 'Singapore SS #01',
            protocol: 'shadowsocks',
            server: '198.51.100.10',
            port: 443,
            region: 'Singapore',
            security: 'chacha20-ietf-poly1305',
            transport: 'TCP/UDP',
            rawUri: 'ss://example',
            outbound: { type: 'shadowsocks', tag: 'proxy-outbound', server: '198.51.100.10', server_port: 443 },
            latencyMs: 42,
            lastTestedAt: '2026-11-25T00:00:00.000Z',
            exitIp: '198.51.100.10',
            addedAt: '2026-11-25T00:00:00.000Z',
            isFreeTier: true,
          },
        ],
      });
    }
    return htmlResponse(404);
  };

  const result = await fetchLiveServersWithFallback(false, mockFetch);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'backend-tcp');
  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].latencyMs, 42);
});

test('recovers real TCP pings via /api/servers/ping when /api/servers/live fails transiently', async () => {
  const mockFetch: FetchLike = async (input, init) => {
    const url = String(input);
    if (url.startsWith('/api/servers/live')) {
      return htmlResponse(502);
    }
    if (url.startsWith('https://raw.githubusercontent.com/')) {
      return new Response(SAMPLE_FEED_TEXT, { status: 200 });
    }
    if (url === '/api/servers/ping' && init?.method === 'POST') {
      const parsedBody = JSON.parse(String(init.body)) as {
        targets: Array<{ id: string; server: string }>;
      };
      return jsonResponse({
        ok: true,
        measuredAt: '2026-11-25T00:01:00.000Z',
        results: parsedBody.targets.map((t) => ({
          id: t.id,
          latencyMs: t.server === '203.0.113.20' ? 35 : 120,
          resolvedIp: t.server,
          reachable: true,
        })),
      });
    }
    return htmlResponse(404);
  };

  const result = await fetchLiveServersWithFallback(false, mockFetch);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'backend-tcp');
  assert.equal(result.nodes.length, 2);
  // Sorted fastest first
  assert.equal(result.nodes[0].server, '203.0.113.20');
  assert.equal(result.nodes[0].latencyMs, 35);
  assert.equal(result.nodes[1].latencyMs, 120);
});

test('returns direct-feed with null latencyMs (never fake pings) when backend is absent', async () => {
  const mockFetch: FetchLike = async (input) => {
    const url = String(input);
    if (url.startsWith('/api/')) {
      return htmlResponse(404);
    }
    if (url.startsWith('https://raw.githubusercontent.com/')) {
      return new Response(SAMPLE_FEED_TEXT, { status: 200 });
    }
    return htmlResponse(404);
  };

  const result = await fetchLiveServersWithFallback(false, mockFetch);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'direct-feed');
  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0].latencyMs, null);
  assert.equal(result.nodes[1].latencyMs, null);
});
