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

import fs from 'node:fs';

import type { ShieldedWalletAPI } from '@midnight-ntwrk/wallet-sdk-shielded';
import pino from 'pino';

import { getWalletStateFilename, WalletSaveStateProvider } from '@/wallet/wallet-state-provider';

vi.mock('node:fs');
vi.mock('@/wallet/gzip-file');

const logger = pino({ level: 'silent' });

describe('[Unit tests] WalletSaveStateProvider', () => {
  describe('save', () => {
    it('should propagate errors when mkdirSync fails', async () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('EACCES');
      });

      const provider = new WalletSaveStateProvider(logger, 'test-seed', '/tmp/test-states');
      const mockWallet = {
        serializeState: vi.fn()
      } as unknown as ShieldedWalletAPI;

      await expect(provider.save(mockWallet)).rejects.toThrow('EACCES');
    });
  });

  describe('getWalletStateFilename', () => {
    it('should produce correct filename with seed', () => {
      const filename = getWalletStateFilename('my-seed');

      expect(filename).toMatch(/^wallet\..+\.my-seed\.state\.gz$/);
    });

    it('should produce correct filename without seed', () => {
      const filename = getWalletStateFilename(undefined);

      expect(filename).toMatch(/^wallet\..+\.state\.gz$/);
      expect(filename).not.toContain('undefined');
    });
  });
});
