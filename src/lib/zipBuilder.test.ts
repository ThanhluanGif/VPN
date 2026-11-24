import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCrc32, createZipArchive } from './zipBuilder';
import { buildDesktopBundleFiles } from './pythonTemplates';
import { createDefaultProfilesData } from './profiles';
import { parseProxyUri } from './uriParser';

test('computeCrc32 matches standard IEEE 802.3 test vector', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(computeCrc32(bytes), 0xcbf43926);
});

test('createZipArchive outputs valid PKZIP headers and EOCD record', () => {
  const archive = createZipArchive([
    { name: 'hello.txt', content: 'Hello PingGate' },
    { name: 'bin/run.sh', content: '#!/bin/sh\necho ok\n', unixPermissions: 0o100755 },
  ]);

  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  // Local file header signature PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // End of central directory signature PK\x05\x06 at archive.length - 22
  const eocdOffset = archive.length - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  // Entry count = 2
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
  assert.equal(view.getUint16(eocdOffset + 10, true), 2);
});

test('buildDesktopBundleFiles packages all launchers, Python modules, config.json, and profiles.json', () => {
  const parsed = parseProxyUri(
    'vless://3f9c6b12-8b7d-4e92-a31f-6e24d90c8f11@1.1.1.1:443?encryption=none&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=abc123pubkey&sid=01ab&type=tcp&flow=xtls-rprx-vision#Live%20Node',
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const profiles = createDefaultProfilesData();
  profiles.nodes = [parsed.node];
  profiles.activeNodeId = parsed.node.id;

  const files = buildDesktopBundleFiles(profiles, parsed.node);

  const names = files.map((f) => f.name);
  assert.ok(names.includes('PingGate-Desktop/PingGate-Windows.bat'));
  assert.ok(names.includes('PingGate-Desktop/PingGate-macOS.command'));
  assert.ok(names.includes('PingGate-Desktop/build_exe.bat'));
  assert.ok(names.includes('PingGate-Desktop/parser.py'));
  assert.ok(names.includes('PingGate-Desktop/config_builder.py'));
  assert.ok(names.includes('PingGate-Desktop/core_manager.py'));
  assert.ok(names.includes('PingGate-Desktop/main_ui.py'));
  assert.ok(names.includes('PingGate-Desktop/local_bridge.py'));
  assert.ok(names.includes('PingGate-Desktop/config.json'));
  assert.ok(names.includes('PingGate-Desktop/profiles.json'));

  const cfgEntry = files.find((f) => f.name === 'PingGate-Desktop/config.json');
  assert.ok(cfgEntry && typeof cfgEntry.content === 'string');
  const parsedCfg = JSON.parse(cfgEntry.content);
  assert.equal(parsedCfg.inbounds[0].type, 'tun');
  assert.equal(parsedCfg.inbounds[0].interface_name, undefined);
  assert.equal(parsedCfg.dns.servers[0].type, 'https');
  assert.equal(parsedCfg.route.default_domain_resolver, 'local-dns');
  assert.equal(parsedCfg.route.final, 'direct');

  const zipBytes = createZipArchive(files);
  assert.ok(zipBytes.byteLength > 5000);

  const winFiles = buildDesktopBundleFiles(profiles, parsed.node, 'windows');
  assert.ok(winFiles.some((f) => f.name === 'PingGate-Windows/PingGate-Windows.bat'));
  assert.ok(!winFiles.some((f) => f.name.endsWith('.command')));

  const macFiles = buildDesktopBundleFiles(profiles, parsed.node, 'macos');
  const macLauncher = macFiles.find((f) => f.name === 'PingGate-macOS/PingGate-macOS.command');
  assert.ok(macLauncher && typeof macLauncher.content === 'string');
  assert.ok(macLauncher.content.includes('curl -fsSL'));
  assert.ok(macLauncher.content.includes('python3 -m venv'));
  assert.ok(!macLauncher.content.includes('urllib.request'));
  assert.ok(!macFiles.some((f) => f.name.endsWith('.bat')));
});
