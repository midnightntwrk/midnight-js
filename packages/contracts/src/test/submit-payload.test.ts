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

import type { LedgerTransactionTypes } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';
import {
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  InvalidTransactionHandleError,
  LedgerTransaction,
  type ProofProvider,
  type UnprovenTx,
  type WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { EraInvariantViolationError } from '../errors';
import { submitLedger8Tx } from '../internal/ledger8-entry';
import { type PayloadSubmitProviders, proveBalanceSubmit } from '../internal/submit-payload';
import { handles } from './ledger-transaction-fixtures';
import { createMockCoinPublicKey, createMockEncryptionPublicKey, createMockProviders, MOCK_CONFIG } from './test-mocks';

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

interface RecordingProviders {
  readonly providers: PayloadSubmitProviders;
  readonly seen: { proveTx: LedgerVersion[]; balanceTx: LedgerVersion[]; submitTx: LedgerVersion[] };
}

const unboundOf = async <E extends LedgerVersion>(era: E): Promise<LedgerTransactionTypes[E]['Unbound']> =>
  LedgerTransaction.unwrap(await handles[era].Unbound(), era);

const finalizedOf = async <E extends LedgerVersion>(era: E): Promise<LedgerTransactionTypes[E]['Finalized']> =>
  LedgerTransaction.unwrap(await handles[era].Finalized(), era);

const recordingProviders = (): RecordingProviders => {
  const seen: RecordingProviders['seen'] = { proveTx: [], balanceTx: [], submitTx: [] };
  const providers: PayloadSubmitProviders = {
    config: MOCK_CONFIG,
    proofProvider: createProofProviderFromHandlers({
      v8: async () => {
        seen.proveTx.push('v8');
        return unboundOf('v8');
      },
      v9: async () => {
        seen.proveTx.push('v9');
        return unboundOf('v9');
      }
    }),
    walletProvider: createWalletProviderFromHandlers({
      v8: async () => {
        seen.balanceTx.push('v8');
        return finalizedOf('v8');
      },
      v9: async () => {
        seen.balanceTx.push('v9');
        return finalizedOf('v9');
      },
      getCoinPublicKey: createMockCoinPublicKey,
      getEncryptionPublicKey: createMockEncryptionPublicKey
    }),
    midnightProvider: createMidnightProviderFromHandlers({
      v8: () => {
        seen.submitTx.push('v8');
        return Promise.resolve('v8-tx-id');
      },
      v9: () => {
        seen.submitTx.push('v9');
        return Promise.resolve('v9-tx-id');
      }
    })
  };
  return { providers, seen };
};

const unprovenOf = (era: LedgerVersion): Promise<UnprovenTx> =>
  era === 'v9' ? Promise.resolve(handles.v9.Unproven()) : handles.v8.Unproven();

describe('proveBalanceSubmit', () => {
  it.each(['v8', 'v9'] as const)('carries a %s handle through the handlers of its own era', async (era) => {
    const { providers, seen } = recordingProviders();
    const unprovenTx = await unprovenOf(era);

    const txId = await proveBalanceSubmit(providers, unprovenTx, 'testCircuit');

    expect(txId).toBe(`${era}-tx-id`);
    expect(seen).toEqual({ proveTx: [era], balanceTx: [era], submitTx: [era] });
  });

  describe('a provider answering with a handle of the other era', () => {
    it('is refused at proveTx with EraInvariantViolationError naming the method, and is never balanced', async () => {
      const { providers } = recordingProviders();
      const balanceTx = vi.spyOn(providers.walletProvider, 'balanceTx');
      const proofProvider: ProofProvider = {
        supportedEras: ['v8', 'v9'],
        proveTx: () => handles.v8.Unbound()
      };

      const rejection = await rejectionOf(
        proveBalanceSubmit({ ...providers, proofProvider }, handles.v9.Unproven(), 'testCircuit')
      );

      expect(rejection).toBeInstanceOf(EraInvariantViolationError);

      expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
      expect(rejection).toMatchObject({ method: 'proveTx', expected: 'v9', received: 'v8', circuitId: 'testCircuit' });
      expect((rejection as Error).message).toContain('proveTx');
      expect(balanceTx).not.toHaveBeenCalled();
    });

    it('is refused at balanceTx with EraInvariantViolationError naming the method, and is never submitted', async () => {
      const { providers, seen } = recordingProviders();
      const walletProvider: WalletProvider = {
        ...providers.walletProvider,
        balanceTx: () => handles.v9.Finalized()
      };
      const unprovenTx = await handles.v8.Unproven();

      const rejection = await rejectionOf(proveBalanceSubmit({ ...providers, walletProvider }, unprovenTx, 'testCircuit'));

      expect(rejection).toBeInstanceOf(EraInvariantViolationError);

      expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
      expect(rejection).toMatchObject({ method: 'balanceTx', expected: 'v8', received: 'v9' });
      expect(seen.submitTx).toEqual([]);
    });
  });

  describe('a provider answering with something other than a handle at the next stage', () => {
    it('refuses an unproven handle back from proveTx as wrong-stage, and never balances it', async () => {
      const { providers, seen } = recordingProviders();
      const proofProvider: ProofProvider = {
        supportedEras: ['v9'],
        // @ts-expect-error a third-party provider answering at the wrong stage
        proveTx: (tx: UnprovenTx) => Promise.resolve(tx)
      };

      const rejection = await rejectionOf(
        proveBalanceSubmit({ ...providers, proofProvider }, handles.v9.Unproven(), 'testCircuit')
      );

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'proveTx', reason: 'wrong-stage' });
      expect(seen.balanceTx).toEqual([]);
    });

    it.each([
      ['the pre-handle tagged record', async () => ({ version: 'v9', tx: await unboundOf('v9') })],
      ['a raw ledger transaction', () => unboundOf('v9')],
      ['null', () => Promise.resolve(null)],
      ['undefined', () => Promise.resolve(undefined)]
    ])('refuses %s back from proveTx as not-a-handle, and never balances it', async (_label, answer) => {
      const { providers, seen } = recordingProviders();
      const proofProvider: ProofProvider = {
        supportedEras: ['v9'],
        // @ts-expect-error a third-party provider answering with something that is not a handle
        proveTx: answer
      };

      const rejection = await rejectionOf(
        proveBalanceSubmit({ ...providers, proofProvider }, handles.v9.Unproven(), 'testCircuit')
      );

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'proveTx', reason: 'not-a-handle' });
      expect(seen.balanceTx).toEqual([]);
    });

    it('refuses an unbound handle back from balanceTx as wrong-stage, and never submits it', async () => {
      const { providers, seen } = recordingProviders();
      const walletProvider: WalletProvider = {
        ...providers.walletProvider,
        // @ts-expect-error a third-party provider answering at the wrong stage
        balanceTx: () => handles.v9.Unbound()
      };

      const rejection = await rejectionOf(
        proveBalanceSubmit({ ...providers, walletProvider }, handles.v9.Unproven(), 'testCircuit')
      );

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'balanceTx', reason: 'wrong-stage' });
      expect(seen.submitTx).toEqual([]);
    });
  });
});

describe('submitLedger8Tx', () => {
  it.each([
    ['v8', 'v9'],
    ['v9', 'v8']
  ] as const)(
    'refuses a %s handle on a %s head with EraInvariantViolationError, before any provider is called',
    async (era, head) => {
      const { providers, seen } = recordingProviders();
      const { publicDataProvider } = createMockProviders();
      const unprovenTx = await unprovenOf(era);

      const rejection = await rejectionOf(
        submitLedger8Tx({ ...providers, publicDataProvider }, unprovenTx, {
          head,
          kind: 'call',
          circuitId: 'testCircuit',
          contractAddress: 'contract-address'
        })
      );

      expect(rejection).toBeInstanceOf(EraInvariantViolationError);
      expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
      expect(rejection).toMatchObject({ expected: head, received: era, circuitId: 'testCircuit' });
      expect(seen).toEqual({ proveTx: [], balanceTx: [], submitTx: [] });
    }
  );
});
