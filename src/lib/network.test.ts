import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProxyUri } from './uriParser';
import { buildSingBoxConfig, collectActiveRoutingTargets } from './configBuilder';
import {
  createDefaultProfilesData,
  getLatencyTier,
  validateProfilesImport,
} from './profiles';

const SAMPLE_VLESS_URI =
  'vless://3f9c6b12-8b7d-4e92-a31f-6e24d90c8f11@1.1.1.1:443?encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=abc123pubkey&sid=01ab&type=tcp&flow=xtls-rprx-vision#Singapore%20Game';

test('parses VLESS Reality URI into valid sing-box outbound', () => {
  const result = parseProxyUri(SAMPLE_VLESS_URI);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.node.protocol, 'vless');
    assert.equal(result.node.name, 'Singapore Game');
    assert.equal(result.node.region, 'Singapore');
    assert.equal(result.node.outbound.type, 'vless');
    assert.equal(result.node.outbound.server, '1.1.1.1');
    assert.equal(result.node.outbound.server_port, 443);
    assert.equal(result.node.outbound.flow, 'xtls-rprx-vision');
    assert.equal(result.node.outbound.tls?.reality?.enabled, true);
    assert.equal(result.node.outbound.tls?.reality?.public_key, 'abc123pubkey');
    assert.equal(result.node.outbound.tls?.utls?.fingerprint, 'chrome');
    assert.equal(result.node.exitIp, '1.1.1.1');
  }
});

test('parses Trojan WebSocket TLS URI without fabricating exit IP for domain hosts', () => {
  const uri =
    'trojan://secretPass99@hk01.example.com:8443?security=tls&sni=cdn.example.com&type=ws&path=%2Fws-game&host=cdn.example.com#Hong%20Kong%20Fast';
  const result = parseProxyUri(uri);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.node.protocol, 'trojan');
    assert.equal(result.node.region, 'Hong Kong');
    assert.equal(result.node.outbound.password, 'secretPass99');
    assert.equal(result.node.outbound.transport?.type, 'ws');
    assert.equal(result.node.outbound.transport?.path, '/ws-game');
    assert.equal(result.node.outbound.tls?.server_name, 'cdn.example.com');
    assert.equal(result.node.exitIp, '');
  }
});

test('parses VMess base64 JSON URI into valid sing-box outbound', () => {
  const payload = Buffer.from(
    JSON.stringify({
      v: '2',
      ps: 'Tokyo VMess',
      add: 'jp.example.com',
      port: '443',
      id: '11111111-2222-4333-8444-555555555555',
      aid: '0',
      net: 'ws',
      host: 'jp.example.com',
      path: '/vm',
      tls: 'tls',
    }),
  ).toString('base64');

  const result = parseProxyUri(`vmess://${payload}`);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.node.protocol, 'vmess');
    assert.equal(result.node.region, 'Nhật Bản');
    assert.equal(result.node.outbound.server_port, 443);
    assert.equal(result.node.outbound.transport?.type, 'ws');
    assert.equal(result.node.outbound.tls?.enabled, true);
  }
});

test('parses Shadowsocks SIP002 URI into valid sing-box outbound', () => {
  const creds = Buffer.from('aes-256-gcm:myStrongPass').toString('base64');
  const result = parseProxyUri(`ss://${creds}@sg2.example.com:9443#SG%20SS`);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.node.protocol, 'shadowsocks');
    assert.equal(result.node.outbound.method, 'aes-256-gcm');
    assert.equal(result.node.outbound.password, 'myStrongPass');
    assert.equal(result.node.outbound.server_port, 9443);
  }
});

test('rejects invalid URIs with clear validation errors', () => {
  const badScheme = parseProxyUri('https://example.com');
  assert.equal(badScheme.ok, false);

  const badUuid = parseProxyUri('vless://not-a-uuid@sg.example.com:443#Bad');
  assert.equal(badUuid.ok, false);

  const missingRealityKey = parseProxyUri(
    'vless://3f9c6b12-8b7d-4e92-a31f-6e24d90c8f11@sg.example.com:443?security=reality#NoKey',
  );
  assert.equal(missingRealityKey.ok, false);
});

test('builds split-tunneling sing-box config with Roblox process rules and direct final', () => {
  const parsed = parseProxyUri(SAMPLE_VLESS_URI);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const defaults = createDefaultProfilesData();
  assert.equal(defaults.nodes.length, 0);
  defaults.routing.mode = 'split';
  defaults.routing.customProcesses = ['Minecraft.exe'];

  const targets = collectActiveRoutingTargets(defaults.routing);
  assert.ok(targets.processes.includes('RobloxPlayerBeta.exe'));
  assert.ok(targets.processes.includes('Minecraft.exe'));

  const cfg = buildSingBoxConfig(parsed.node, defaults.routing);
  assert.equal(cfg.route.final, 'direct');
  assert.equal(cfg.inbounds[0].type, 'tun');
  const proxyProcessRule = cfg.route.rules.find(
    (r) => r.outbound === 'proxy-outbound' && Array.isArray(r.process_name),
  );
  assert.ok(proxyProcessRule);
  assert.ok((proxyProcessRule.process_name as string[]).includes('RobloxPlayerBeta.exe'));
  assert.ok((proxyProcessRule.process_name as string[]).includes('Minecraft.exe'));
});

test('builds global VPN sing-box config with proxy-outbound final', () => {
  const parsed = parseProxyUri(SAMPLE_VLESS_URI);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const defaults = createDefaultProfilesData();
  defaults.routing.mode = 'global';
  const cfg = buildSingBoxConfig(parsed.node, defaults.routing);
  assert.equal(cfg.route.final, 'proxy-outbound');
  assert.equal(cfg.dns.final, 'proxy-dns');
});

test('validates profiles.json export/import roundtrip and latency tier thresholds', () => {
  const parsed = parseProxyUri(SAMPLE_VLESS_URI);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const defaults = createDefaultProfilesData();
  defaults.nodes = [parsed.node];
  defaults.activeNodeId = parsed.node.id;

  const serialized = JSON.stringify(defaults);
  const imported = validateProfilesImport(serialized);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.data.nodes.length, 1);
  }

  const badImport = validateProfilesImport('{ invalid json');
  assert.equal(badImport.ok, false);

  assert.equal(getLatencyTier(45).tone, 'good');
  assert.equal(getLatencyTier(150).tone, 'fair');
  assert.equal(getLatencyTier(260).tone, 'high');
  assert.equal(getLatencyTier(null).tone, 'idle');
});
