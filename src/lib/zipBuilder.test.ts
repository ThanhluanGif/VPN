import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCrc32, createZipArchive } from './zipBuilder';
import { buildDesktopBundleFiles } from './pythonTemplates';
import { createDefaultProfilesData } from './profiles';

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
  const profiles = createDefaultProfilesData();
  const activeNode = profiles.nodes[0];
  const files = buildDesktopBundleFiles(profiles, activeNode);

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
  assert.equal(parsedCfg.route.final, 'direct');

  const zipBytes = createZipArchive(files);
  assert.ok(zipBytes.byteLength > 5000);

  const winFiles = buildDesktopBundleFiles(profiles, activeNode, 'windows');
  assert.ok(winFiles.some((f) => f.name === 'PingGate-Windows/PingGate-Windows.bat'));
  assert.ok(!winFiles.some((f) => f.name.endsWith('.command')));

  const macFiles = buildDesktopBundleFiles(profiles, activeNode, 'macos');
  assert.ok(macFiles.some((f) => f.name === 'PingGate-macOS/PingGate-macOS.command'));
  assert.ok(!macFiles.some((f) => f.name.endsWith('.bat')));
});
