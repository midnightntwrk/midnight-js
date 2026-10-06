/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { rm } from 'node:fs/promises';

import { buildUrlWithPath, redactedJson, redactUrl, tryDeleteDirectory } from '../src/utils';

vi.mock('node:fs/promises', () => ({
  rm: vi.fn()
}));

const mockedRm = vi.mocked(rm);

describe('[Unit tests] Utils', () => {
  describe('buildUrlWithPath', () => {
    it('should preserve http protocol', () => {
      expect(buildUrlWithPath('http://localhost:3000/api/v1', '/health')).toBe('http://localhost:3000/health');
    });

    it('should preserve https protocol', () => {
      expect(buildUrlWithPath('https://indexer.preview.midnight.network/api/v4/graphql', '/ready')).toBe(
        'https://indexer.preview.midnight.network/ready'
      );
    });

    it('should handle URL without port', () => {
      expect(buildUrlWithPath('https://example.com/path', '/status')).toBe('https://example.com/status');
    });

    it('should keep the query string so credentials reach the endpoint', () => {
      expect(buildUrlWithPath('https://midnight-preview.blockfrost.io/api/v0?project_id=secret', '/ready')).toBe(
        'https://midnight-preview.blockfrost.io/ready?project_id=secret'
      );
    });
  });

  describe('redactUrl', () => {
    it('should hide the query string', () => {
      expect(redactUrl('wss://midnight-preview.blockfrost.io/api/v0/ws?project_id=secret')).toBe(
        'wss://midnight-preview.blockfrost.io/api/v0/ws?<redacted>'
      );
    });

    it('should hide user info', () => {
      expect(redactUrl('https://user:secret@example.com/path')).toBe('https://<redacted>@example.com/path');
    });

    it('should leave a URL without credentials unchanged', () => {
      expect(redactUrl('http://localhost:8088/api/v4/graphql')).toBe('http://localhost:8088/api/v4/graphql');
    });

    it('should leave a value that is not a URL unchanged', () => {
      expect(redactUrl('preview')).toBe('preview');
    });
  });

  describe('redactedJson', () => {
    it('should redact every URL in the serialized object', () => {
      const json = redactedJson({
        networkId: 'preview',
        indexer: 'https://midnight-preview.blockfrost.io/api/v0?project_id=secret',
        nested: { node: 'https://rpc.midnight-preview.blockfrost.io?project_id=secret' }
      });

      expect(json).not.toContain('secret');
      expect(JSON.parse(json)).toEqual({
        networkId: 'preview',
        indexer: 'https://midnight-preview.blockfrost.io/api/v0?<redacted>',
        nested: { node: 'https://rpc.midnight-preview.blockfrost.io/?<redacted>' }
      });
    });
  });

  describe('tryDeleteDirectory', () => {
    it('should swallow errors from rm and not throw', async () => {
      mockedRm.mockRejectedValue(new Error('EPERM'));

      await expect(tryDeleteDirectory('/some/path')).resolves.toBeUndefined();
    });
  });
});
