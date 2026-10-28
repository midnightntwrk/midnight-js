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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { COMMON_ERROR_CODES, InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  InvalidTransactionHandleError,
  type KeyMaterialProvider,
  LedgerTransaction,
  type UnboundTransaction,
  type UnprovenTx,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import type { ProvingProvider } from '@midnightntwrk/dapp-connector-api';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { dappConnectorProofProvider } from '../dapp-connector-proof-provider';
import type { DAppConnectorProvingAPI } from '../dapp-connector-proving-provider';

/**
 * The `namespace:type-descriptor:` tag a serialized transaction opens with,
 * read as a raw prefix. Never `parseSerializedTag`: that parser scans only the
 * first 64 bytes for its second colon, and transaction tags run past that.
 */
const txTag = (bytes: Uint8Array): string => {
  const head = Buffer.from(bytes.subarray(0, 96)).toString('latin1');
  const end = head.indexOf('):');
  // Without this, a vendor bump that pushed the terminator past 96 bytes would
  // make `indexOf` return -1, collapse every tag to 'm', and let the assertions
  // that use this pass while comparing nothing.
  if (end === -1) {
    throw new Error(`No transaction tag terminator within the first 96 bytes of a ${bytes.byteLength}-byte payload.`);
  }
  return head.slice(0, end + 2);
};

const unprovenLedger9Handle = (): UnprovenTx => LedgerTransaction.seal('v9', 'Unproven', Transaction.fromParts('undeployed'));

const spyOnLedger9Prove = () => vi.spyOn(Transaction.prototype, 'prove');

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('dappConnectorProofProvider', () => {
  let provenLedger9Tx: UnboundTransaction;

  beforeAll(async () => {
    provenLedger9Tx = await Transaction.fromParts('undeployed').prove(
      { check: () => Promise.resolve([]), prove: () => Promise.resolve(new Uint8Array()), lookupKey: () => Promise.resolve(undefined) },
      CostModel.initialCostModel()
    );
  });

  const mockProvingProvider: ProvingProvider = {
    check: vi.fn(),
    prove: vi.fn()
  };

  const mockKeyMaterialProvider: KeyMaterialProvider = {
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn()
  };

  const costModel = CostModel.initialCostModel();

  let mockApi: DAppConnectorProvingAPI;
  let mockZkConfigProvider: ZKConfigProvider<string>;
  let ledger9Prove: ReturnType<typeof spyOnLedger9Prove>;

  beforeEach(() => {
    // `mockProvingProvider` is a file-level const that individual tests replace
    // members on, so its methods are restored here rather than only reset. The
    // vitest config sets no `restoreMocks`, and without this the file would be
    // order-dependent for anything added after a test that stubs one.
    mockProvingProvider.check = vi.fn();
    mockProvingProvider.prove = vi.fn();

    mockApi = {
      getProvingProvider: vi.fn().mockResolvedValue(mockProvingProvider)
    };

    const zkConfigProviderOverrides: Partial<ZKConfigProvider<string>> = {
      asKeyMaterialProvider: vi.fn().mockReturnValue(mockKeyMaterialProvider)
    };
    mockZkConfigProvider = zkConfigProviderOverrides as ZKConfigProvider<string>;

    ledger9Prove = spyOnLedger9Prove();
    ledger9Prove.mockResolvedValue(provenLedger9Tx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a ProofProvider with proveTx method', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    expect(proofProvider).toHaveProperty('proveTx');
    expect(typeof proofProvider.proveTx).toBe('function');
  });

  // Set equality rather than `toContain`: this provider serves both eras, and
  // an era silently dropped from the declaration would have a retained-era
  // operation refused before it started -- which `toContain` would not catch.
  it('declares both eras, matching the two handlers it is built from', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    expect([...proofProvider.supportedEras].sort()).toEqual(['v8', 'v9']);
  });

  it('proves a v9 handle with the injected cost model and answers the proven transaction as an unbound v9 handle', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    const result = await proofProvider.proveTx(unprovenLedger9Handle());

    expect(ledger9Prove).toHaveBeenCalledWith(
      expect.objectContaining({
        check: expect.any(Function),
        prove: expect.any(Function),
        lookupKey: expect.any(Function)
      }),
      costModel
    );
    expect([result.era, result.stage]).toEqual(['v9', 'Unbound']);
    // Identity, not structural equality: ledger objects from different WASM
    // instances must not be interchanged, so a structurally-equal copy must fail.
    expect(LedgerTransaction.unwrap(result, 'v9')).toBe(provenLedger9Tx);
  });

  describe('proveTxConfig.timeout', () => {
    it('refuses a v9 proof with a timeout before the wallet is asked to prove', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      const rejection = await proofProvider.proveTx(unprovenLedger9Handle(), { timeout: 5_000 }).then(
        () => undefined,
        (error: unknown) => error
      );

      expect(rejection).toBeInstanceOf(InvalidArgumentError);
      expect(hasErrorCode(rejection, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
      expect(ledger9Prove).not.toHaveBeenCalled();
    });

    it('refuses a zero timeout as well, since any timeout would be ignored', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      await expect(proofProvider.proveTx(unprovenLedger9Handle(), { timeout: 0 })).rejects.toBeInstanceOf(
        InvalidArgumentError
      );
      expect(ledger9Prove).not.toHaveBeenCalled();
    });

    it('proves a v9 transaction when the config carries no timeout', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      const result = await proofProvider.proveTx(unprovenLedger9Handle(), {});

      expect(LedgerTransaction.unwrap(result, 'v9')).toBe(provenLedger9Tx);
    });

    it('proves a v9 transaction when the timeout key is present but undefined', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      const result = await proofProvider.proveTx(unprovenLedger9Handle(), { timeout: undefined });

      expect(LedgerTransaction.unwrap(result, 'v9')).toBe(provenLedger9Tx);
    });
  });

  describe('v8 handle', () => {
    let unprovenLedger8Handle: () => UnprovenTx;
    let circuitDrivingLedger8Handle: () => UnprovenTx;

    beforeAll(async () => {
      const v8 = await loadLedger8Protocol();
      unprovenLedger8Handle = () => LedgerTransaction.seal('v8', 'Unproven', v8.Transaction.fromParts('undeployed'));

      // Carries one Zswap output, so proving it drives a real circuit. The
      // empty transaction above has nothing to prove, so it cannot show which
      // proving provider -- if any -- the provider handed to the runtime.
      const rawTokenType = v8.sampleRawTokenType();
      const output = v8.ZswapOutput.new(
        v8.createShieldedCoinInfo(rawTokenType, 100n),
        1,
        v8.sampleCoinPublicKey(),
        v8.sampleEncryptionPublicKey()
      );
      circuitDrivingLedger8Handle = () =>
        LedgerTransaction.seal(
          'v8',
          'Unproven',
          v8.Transaction.fromParts('undeployed', v8.ZswapOffer.fromOutput(output, rawTokenType, 100n))
        );
    });

    it('proves a v8 handle with the v8 cost model and answers an unbound v8 handle', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);
      const unproven = unprovenLedger8Handle();

      const result = await proofProvider.proveTx(unproven);

      // `costModel` is a ledger 9 `CostModel`. The v8 runtime type-checks that
      // argument across the WASM boundary and throws for anything else, so
      // this call SUCCEEDING shows the caller's cost model was not forwarded.
      expect([result.era, result.stage]).toEqual(['v8', 'Unbound']);
      const expectedTag = txTag(unproven.serialize()).replace('proof-preimage', 'proof');
      // Without this, a vendor rename of the stage marker would make `replace`
      // a no-op and invert the assertion below into "the same bytes came back".
      expect(expectedTag).not.toBe(txTag(unproven.serialize()));
      expect(txTag(result.serialize())).toBe(expectedTag);
    });

    it("drives the v8 runtime through the WALLET's proving provider", async () => {
      const keyLocations: string[] = [];
      mockProvingProvider.prove = vi.fn((_preimage: Uint8Array, keyLocation: string) => {
        keyLocations.push(keyLocation);
        return Promise.reject(new Error('wallet declined'));
      });
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      // The wallet declines, so the call rejects. What this measures is that
      // the provider obtained from the wallet is the one the v8 runtime consults.
      await proofProvider.proveTx(circuitDrivingLedger8Handle()).catch(() => undefined);

      expect(keyLocations).toEqual(['midnight/zswap/output']);
    });

    it('refuses a v8 proof with a timeout before the wallet is asked to prove', async () => {
      const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

      const rejection = await rejectionOf(proofProvider.proveTx(circuitDrivingLedger8Handle(), { timeout: 5_000 }));

      expect(rejection).toBeInstanceOf(InvalidArgumentError);
      expect(hasErrorCode(rejection, COMMON_ERROR_CODES.INVALID_ARGUMENT)).toBe(true);
      expect(mockProvingProvider.prove).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['the pre-handle version-tagged payload', () => ({ version: 'v9', tx: Transaction.fromParts('undeployed') })],
    ['a raw ledger transaction', () => Transaction.fromParts('undeployed')],
    ['null', () => null]
  ])('refuses %s as not a handle, before any proving', async (_label, value) => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    // @ts-expect-error the value is not a transaction handle
    const rejection = await rejectionOf(proofProvider.proveTx(value()));

    expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
    expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
    expect(rejection).toMatchObject({ method: 'proveTx', reason: 'not-a-handle' });
    expect(ledger9Prove).not.toHaveBeenCalled();
  });

  it('should obtain the ProvingProvider once at setup, not per proveTx call', async () => {
    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    await proofProvider.proveTx(unprovenLedger9Handle());
    await proofProvider.proveTx(unprovenLedger9Handle());

    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors from getProvingProvider during setup', async () => {
    const error = new Error('Wallet connection failed');
    mockApi.getProvingProvider = vi.fn().mockRejectedValue(error);

    await expect(
      dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel)
    ).rejects.toThrow('Wallet connection failed');
  });

  it('should allow transient-failure recovery: a second invocation after a rejection succeeds', async () => {
    // Documents the recovery model: the factory holds no state between calls,
    // so callers can retry after a wallet failure simply by invoking again.
    // Protects against a future refactor that caches the rejected promise.
    mockApi.getProvingProvider = vi
      .fn()
      .mockRejectedValueOnce(new Error('Wallet locked'))
      .mockResolvedValueOnce(mockProvingProvider);

    await expect(
      dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel)
    ).rejects.toThrow('Wallet locked');

    const proofProvider = await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    expect(proofProvider).toHaveProperty('proveTx');
    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });

  it('should call getProvingProvider once per factory invocation (independent providers)', async () => {
    // "Single fetch" is scoped to a single ProofProvider instance. Two
    // separate factory calls must each obtain their own ProvingProvider —
    // never share a cached one across instances.
    await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);
    await dappConnectorProofProvider(mockApi, mockZkConfigProvider, costModel);

    expect(mockApi.getProvingProvider).toHaveBeenCalledTimes(2);
  });
});
