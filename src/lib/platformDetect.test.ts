import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDeviceFromSignals } from './platformDetect';

test('detects Windows 64-bit desktop and recommends Windows installer', () => {
  const res = detectDeviceFromSignals({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    platform: 'Win32',
    uaDataPlatform: 'Windows',
    uaDataArch: 'x86',
  });
  assert.equal(res.os, 'windows');
  assert.equal(res.recommendedBundle, 'windows');
  assert.equal(res.isDesktopSupported, true);
  assert.equal(res.arch, 'x64');
  assert.equal(res.ctaLabel, 'Tải PingGate cho Windows');
  assert.equal(res.otherPlatform, 'macos');
});

test('detects macOS Apple Silicon via Client Hints and recommends macOS installer', () => {
  const res = detectDeviceFromSignals({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    uaDataPlatform: 'macOS',
    uaDataArch: 'arm',
  });
  assert.equal(res.os, 'macos');
  assert.equal(res.recommendedBundle, 'macos');
  assert.equal(res.isDesktopSupported, true);
  assert.equal(res.arch, 'arm64');
  assert.equal(res.osLabel, 'macOS (Apple Silicon)');
  assert.equal(res.ctaLabel, 'Tải PingGate cho macOS');
  assert.equal(res.otherPlatform, 'windows');
});

test('detects iPadOS desktop-mode Safari as iOS mobile rather than macOS', () => {
  const res = detectDeviceFromSignals({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  });
  assert.equal(res.os, 'ios');
  assert.equal(res.isDesktopSupported, false);
});

test('detects Android mobile before Linux fallback', () => {
  const res = detectDeviceFromSignals({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
  });
  assert.equal(res.os, 'android');
  assert.equal(res.isDesktopSupported, false);
});

test('detects Linux desktop and suggests config.json export', () => {
  const res = detectDeviceFromSignals({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    platform: 'Linux x86_64',
    uaDataPlatform: 'Linux',
  });
  assert.equal(res.os, 'linux');
  assert.equal(res.isDesktopSupported, false);
  assert.match(res.compatibilityNote, /config\.json/);
});
