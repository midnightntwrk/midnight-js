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

import { rm } from 'node:fs/promises';

import { buildUrlWithPath, tryDeleteDirectory } from '@/utils';

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
  });

  describe('tryDeleteDirectory', () => {
    it('should swallow errors from rm and not throw', async () => {
      mockedRm.mockRejectedValue(new Error('EPERM'));

      await expect(tryDeleteDirectory('/some/path')).resolves.toBeUndefined();
    });
  });
});
