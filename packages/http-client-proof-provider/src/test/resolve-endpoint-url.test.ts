/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { describe, expect, it } from 'vitest';

import { resolveEndpointUrl } from '../resolve-endpoint-url';

describe('resolveEndpointUrl', () => {
  describe('base URL with no path', () => {
    it('should append path to origin', () => {
      expect(resolveEndpointUrl('https://localhost:6300', '/check').href).toBe(
        'https://localhost:6300/check'
      );
    });

    it('should handle http with default port', () => {
      expect(resolveEndpointUrl('http://localhost', '/prove').href).toBe('http://localhost/prove');
    });
  });

  describe('base URL with path segments', () => {
    it('should preserve path segments without trailing slash', () => {
      expect(
        resolveEndpointUrl('https://example.com/midnight/zkpaas/testnet/abc123', '/check').href
      ).toBe('https://example.com/midnight/zkpaas/testnet/abc123/check');
    });

    it('should preserve path segments with trailing slash', () => {
      expect(
        resolveEndpointUrl('https://example.com/midnight/zkpaas/testnet/abc123/', '/prove').href
      ).toBe('https://example.com/midnight/zkpaas/testnet/abc123/prove');
    });

    it('should handle single path segment', () => {
      expect(resolveEndpointUrl('https://example.com/api', '/check').href).toBe(
        'https://example.com/api/check'
      );
    });
  });

  describe('trailing slash handling', () => {
    it('should not produce double slashes from trailing slash on base', () => {
      const result = resolveEndpointUrl('https://example.com/api/', '/check');
      expect(result.href).toBe('https://example.com/api/check');
      expect(result.pathname).not.toContain('//');
    });

    it('should handle multiple trailing slashes on base', () => {
      const result = resolveEndpointUrl('https://example.com/api///', '/prove');
      expect(result.href).toBe('https://example.com/api/prove');
    });

    it('should handle root path with trailing slash', () => {
      expect(resolveEndpointUrl('https://example.com/', '/check').href).toBe(
        'https://example.com/check'
      );
    });
  });

  describe('query params and fragments on base URL', () => {
    it('should preserve query params from base URL', () => {
      const result = resolveEndpointUrl('https://example.com/api?key=val', '/check');
      expect(result.pathname).toBe('/api/check');
      expect(result.search).toBe('?key=val');
    });

    it('should preserve fragment from base URL', () => {
      const result = resolveEndpointUrl('https://example.com/api#section', '/prove');
      expect(result.pathname).toBe('/api/prove');
      expect(result.hash).toBe('#section');
    });
  });

  describe('port handling', () => {
    it('should preserve custom port', () => {
      const result = resolveEndpointUrl('http://localhost:8080', '/check');
      expect(result.port).toBe('8080');
      expect(result.href).toBe('http://localhost:8080/check');
    });

    it('should preserve port with path segments', () => {
      const result = resolveEndpointUrl('https://example.com:443/api/v1', '/prove');
      expect(result.href).toBe('https://example.com/api/v1/prove');
    });
  });

  describe('invalid URLs', () => {
    it('should throw for non-URL strings', () => {
      expect(() => resolveEndpointUrl('not-a-url', '/check')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => resolveEndpointUrl('', '/check')).toThrow();
    });
  });
});
