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
import {
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  type VersionedFinalizedTransaction,
  type VersionedUnboundTransaction
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { UnshieldedKeystore, WalletFacade } from '@midnightntwrk/wallet-sdk';
import { pino } from 'pino';

import type { EnvironmentConfiguration } from '../src/test-environment/environment-configuration';
import { MidnightWalletProvider } from '../src/wallet/midnight-wallet-provider';

// The payload is rejected before the wallet is touched, so the facade only
// needs the methods this suite asserts are never reached. A single
// `Partial<WalletFacade> as WalletFacade` step rather than a double assertion
// through `Pick`, which is the same escape hatch as `as unknown as`.
const createWalletStub = (): WalletFacade => {
  const stub: Partial<WalletFacade> = {
    balanceUnboundTransaction: vi.fn(),
    submitTransaction: vi.fn()
  };
  return stub as WalletFacade;
};

// A real pino logger rather than `{}`: `withWallet` only stores it today, but a
// stub that is not a logger turns any future log call in this path into an
// unreadable TypeError instead of a failed assertion.
const createProvider = async (wallet: WalletFacade): Promise<MidnightWalletProvider> =>
  MidnightWalletProvider.withWallet(
    pino({ enabled: false }),
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
      // Without this the test passes even if balanceTx names the wrong seam.
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('balanceTx');
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
      expect((rejection as V8PayloadUnsupportedError).seam).toBe('submitTx');
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });
  });

  // The likely 5.0.0 migration failure: a consumer built against the pre-5.0.0
  // seam passes a bare transaction. It must fail with a coded, actionable error
  // rather than a TypeError inside the wallet SDK.
  describe('a payload with no recognised version discriminant', () => {
    // These payloads are unrepresentable in the seam types on purpose — that is
    // the property under test. This helper is the one place the type system is
    // stepped around, rather than an `as unknown as` at each call site.
    const untagged = <T>(payload: object): T => payload as T;

    it('rejects on balanceTx with the untagged-payload code and never balances', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider
        .balanceTx(untagged<VersionedUnboundTransaction>({ prove: () => undefined }))
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(UntaggedPayloadError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
      expect((rejection as UntaggedPayloadError).seam).toBe('balanceTx');
      expect(wallet.balanceUnboundTransaction).not.toHaveBeenCalled();
    });

    it('rejects on submitTx with the untagged-payload code and never submits', async () => {
      const wallet = createWalletStub();
      const provider = await createProvider(wallet);

      const rejection = await provider
        .submitTx(untagged<VersionedFinalizedTransaction>({ version: 'v10' }))
        .then(
          () => undefined,
          (error: unknown) => error
        );

      expect(rejection).toBeInstanceOf(UntaggedPayloadError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.UNTAGGED_PAYLOAD)).toBe(true);
      expect((rejection as UntaggedPayloadError).received).toBe("'v10'");
      expect(wallet.submitTransaction).not.toHaveBeenCalled();
    });
  });
});
