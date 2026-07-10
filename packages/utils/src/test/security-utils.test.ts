/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { assertSafeName, assertSemVer, MAX_SAFE_NAME_LENGTH, warnIfInsecureRemoteUrl } from '../security-utils';

describe('assertSafeName', () => {
  describe('accepts valid names', () => {
    it.each([
      'set_topic',
      'increment',
      'transfer',
      'a',
      'A1',
      'snake_case',
      'kebab-case',
      'dot.segment',
      'mixed_123-NAME.v2'
    ])('accepts %s', (name) => {
      expect(() => assertSafeName(name, 'circuitId')).not.toThrow();
    });
  });

  describe('rejects path-traversal payloads', () => {
    it.each([
      '..',
      '.',
      '../etc/passwd',
      '../../etc/passwd',
      '..\\..\\Windows\\System32',
      '/etc/passwd',
      './foo',
      'foo/bar',
      'foo\\bar'
    ])('rejects %s', (name) => {
      expect(() => assertSafeName(name, 'circuitId')).toThrow(/Invalid circuitId/);
    });
  });

  describe('rejects URL-encoded traversal', () => {
    it.each([
      '%2e%2e%2fpasswd',
      '%2E%2E',
      'foo%2Fbar'
    ])('rejects %s', (name) => {
      expect(() => assertSafeName(name, 'circuitId')).toThrow(/Invalid circuitId/);
    });
  });

  describe('rejects malformed input', () => {
    it('rejects empty string', () => {
      expect(() => assertSafeName('', 'circuitId')).toThrow(/Invalid circuitId/);
    });

    it('rejects null byte', () => {
      expect(() => assertSafeName(`foo${String.fromCharCode(0)}bar`, 'circuitId')).toThrow(/Invalid circuitId/);
    });

    it('rejects whitespace', () => {
      expect(() => assertSafeName('foo bar', 'circuitId')).toThrow(/Invalid circuitId/);
    });

    it('rejects names exceeding MAX_SAFE_NAME_LENGTH', () => {
      const oversized = 'a'.repeat(MAX_SAFE_NAME_LENGTH + 1);
      expect(() => assertSafeName(oversized, 'circuitId')).toThrow(/Invalid circuitId/);
    });

    it('accepts names exactly at MAX_SAFE_NAME_LENGTH', () => {
      const atLimit = 'a'.repeat(MAX_SAFE_NAME_LENGTH);
      expect(() => assertSafeName(atLimit, 'circuitId')).not.toThrow();
    });
  });

  describe('error message uses the supplied label', () => {
    it('includes the label in the error', () => {
      expect(() => assertSafeName('..', 'version')).toThrow(/Invalid version/);
    });
  });
});

describe('assertSemVer', () => {
  describe('accepts valid versions', () => {
    it.each([
      '0.20.0',
      '1.2.3',
      '10.20.30',
      '0.21.0-snapshot.123',
      '1.0.0-rc.1',
      '2.0.0-alpha'
    ])('accepts %s', (version) => {
      expect(() => assertSemVer(version, 'version')).not.toThrow();
    });
  });

  describe('rejects non-semver strings', () => {
    it.each([
      '..',
      '.',
      '',
      '1',
      '1.2',
      'v1.2.3',
      '1.2.3.4',
      '1.2.x',
      '../1.0.0',
      '1.0.0/../etc',
      '1.0.0 '
    ])('rejects %s', (version) => {
      expect(() => assertSemVer(version, 'version')).toThrow(/Invalid version/);
    });
  });

  describe('error message uses the supplied label', () => {
    it('includes the label in the error', () => {
      expect(() => assertSemVer('not-a-version', 'compactc version')).toThrow(/Invalid compactc version/);
    });
  });
});

describe('warnIfInsecureRemoteUrl', () => {
  let warnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('does not warn for encrypted schemes', () => {
    it.each([
      'https://example.com',
      'https://indexer.testnet.midnight.network/graphql',
      'wss://example.com',
      'wss://indexer.testnet.midnight.network/graphql'
    ])('does not warn for %s', (url) => {
      warnIfInsecureRemoteUrl(url, 'test URL');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('does not warn for unknown schemes', () => {
    it.each([
      'file:///tmp/foo',
      'ftp://example.com',
      'data:text/plain,hello'
    ])('does not warn for %s', (url) => {
      warnIfInsecureRemoteUrl(url, 'test URL');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('does not warn for malformed input', () => {
    it.each([
      'not a url',
      '',
      '://missing-scheme'
    ])('does not throw and does not warn for %s', (url) => {
      expect(() => warnIfInsecureRemoteUrl(url, 'test URL')).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('does not warn for loopback hosts on plain schemes', () => {
    it.each([
      'http://localhost:8080/graphql',
      'http://localhost/',
      'http://127.0.0.1/',
      'http://127.0.0.1:6300/check',
      'http://[::1]/',
      'http://[::1]:8080/graphql',
      'ws://localhost:8080/',
      'ws://127.0.0.1/',
      'ws://[::1]/'
    ])('does not warn for %s', (url) => {
      warnIfInsecureRemoteUrl(url, 'test URL');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('warns for non-loopback hosts on plain schemes', () => {
    it.each([
      'http://indexer.testnet.midnight.network',
      'http://indexer.testnet.midnight.network/graphql',
      'http://proof.testnet.midnight.network/',
      'http://192.168.1.5',
      'http://10.0.0.1/',
      'ws://indexer.testnet.midnight.network',
      'ws://indexer.testnet.midnight.network/graphql'
    ])('warns for %s', (url) => {
      warnIfInsecureRemoteUrl(url, 'test URL');
      expect(warnSpy).toHaveBeenCalledOnce();
    });
  });

  it('warning includes the supplied label and the host', () => {
    warnIfInsecureRemoteUrl('http://indexer.testnet.midnight.network/graphql', 'indexer query URL');
    expect(warnSpy).toHaveBeenCalledOnce();
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain('indexer query URL');
    expect(message).toContain('indexer.testnet.midnight.network');
  });

  it('warning for http:// suggests https:// as the secure replacement', () => {
    warnIfInsecureRemoteUrl('http://indexer.testnet.midnight.network', 'indexer query URL');
    expect(warnSpy).toHaveBeenCalledOnce();
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain('http://');
    expect(message).toContain('https://');
    expect(message).not.toContain('wss://');
  });

  it('warning for ws:// suggests wss:// as the secure replacement', () => {
    warnIfInsecureRemoteUrl('ws://indexer.testnet.midnight.network', 'indexer subscription URL');
    expect(warnSpy).toHaveBeenCalledOnce();
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain('ws://');
    expect(message).toContain('wss://');
    expect(message).not.toContain('https://');
  });
});
