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

import type { DustSecretKey, ZswapSecretKeys } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { V8PayloadUnsupportedError } from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { UnshieldedKeystore, WalletFacade } from '@midnightntwrk/wallet-sdk';
import type { Logger } from 'pino';

import type { EnvironmentConfiguration } from '@/test-environment/environment-configuration';
import { MidnightWalletProvider } from '@/wallet/midnight-wallet-provider';

// The v8 arm is rejected before the wallet is touched, so the wallet facade
// only needs the two methods this suite asserts are never reached.
const createWalletStub = () =>
  ({
    balanceUnboundTransaction: vi.fn(),
    submitTransaction: vi.fn()
  }) as Pick<WalletFacade, 'balanceUnboundTransaction' | 'submitTransaction'> as WalletFacade;

const createProvider = async (wallet: WalletFacade): Promise<MidnightWalletProvider> =>
  MidnightWalletProvider.withWallet(
    {} as Logger,
    {} as EnvironmentConfiguration,
    wallet,
    {} as ZswapSecretKeys,
    {} as DustSecretKey,
    {} as UnshieldedKeystore
  );

describe('MidnightWalletProvider', () => {
  describe('balanceTx with a v8 payload', () => {
    it('rejects with the registered unsupported-payload code and never balances through the wallet', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.balanceTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });
  });

  describe('submitTx with a v8 payload', () => {
    it('rejects with the registered unsupported-payload code and never submits through the wallet', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider.submitTx({ version: 'v8', txBytes: new Uint8Array([1, 2, 3]) }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(V8PayloadUnsupportedError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED)).toBe(true);
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });
  });
});
