import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIpAddress, isValidPort } from './netSecurity';

test('isPublicIpAddress blocks private, loopback, CGNAT, and metadata IPs', () => {
  assert.equal(isPublicIpAddress('127.0.0.1'), false);
  assert.equal(isPublicIpAddress('10.0.0.5'), false);
  assert.equal(isPublicIpAddress('172.16.0.1'), false);
  assert.equal(isPublicIpAddress('192.168.1.1'), false);
  assert.equal(isPublicIpAddress('169.254.169.254'), false);
  assert.equal(isPublicIpAddress('100.64.0.1'), false);
  assert.equal(isPublicIpAddress('::1'), false);
  assert.equal(isPublicIpAddress('fe80::1'), false);
  assert.equal(isPublicIpAddress('fc00::1'), false);
  assert.equal(isPublicIpAddress('::ffff:127.0.0.1'), false);
  assert.equal(isPublicIpAddress('not-an-ip'), false);
});

test('isPublicIpAddress allows globally routable public IPs', () => {
  assert.equal(isPublicIpAddress('1.1.1.1'), true);
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('45.144.112.55'), true);
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
});

test('isValidPort checks integer bounds 1..65535', () => {
  assert.equal(isValidPort(443), true);
  assert.equal(isValidPort(8443), true);
  assert.equal(isValidPort(0), false);
  assert.equal(isValidPort(70000), false);
  assert.equal(isValidPort('443'), false);
});
