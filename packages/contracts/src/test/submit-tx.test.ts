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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { UnknownLedgerVersionError } from '@midnight-ntwrk/midnight-js-protocol';
import {
  InvalidArgumentError,
  PROTOCOL_ERROR_CODES,
  UnknownProtocolVersionError
} from '@midnight-ntwrk/midnight-js-protocol/errors';
import {
  type AnyProvableCircuitId,
  type FinalizedTx,
  InvalidTransactionHandleError,
  LedgerTransaction,
  ProviderEraUnsupportedError,
  TransactionEraMismatchError,
  type UnboundTx
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EraInvariantViolationError,
  EraMismatchError,
  ForkCrossedDuringOperationError,
  ProviderFailedError,
  SubmitRejectionUndiagnosedError
} from '../errors';
import { submitLedger9Payload, submitTx, submitTxAsync, type SubmitTxOptions } from '../submit-tx';
import { handles } from './ledger-transaction-fixtures';
import { createMockFinalizedTxData, createMockLedger8FinalizedTxData, createMockProviders, createMockUnprovenTx } from './test-mocks';

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('submit-tx', () => {
  it('submit-tx.ts imports no filesystem API', () => {
    const source = readFileSync(fileURLToPath(new URL('../submit-tx.ts', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/(?:from|require\(|import\()\s*['"](?:node:)?fs(?:\/promises)?['"]/);
  });

  describe('submitTx', () => {
    let mockProviders: ReturnType<typeof createMockProviders>;
    let unprovenTx: ReturnType<typeof createMockUnprovenTx>;
    let unboundTx: UnboundTx;
    let finalizedTx: FinalizedTx;
    let originalMnDebug: string | undefined;

    beforeEach(async () => {
      vi.clearAllMocks();

      mockProviders = createMockProviders();
      unprovenTx = createMockUnprovenTx();
      unboundTx = await handles.v9.Unbound();
      finalizedTx = await handles.v9.Finalized();
      originalMnDebug = process.env.MN_DEBUG;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (originalMnDebug === undefined) {
        delete process.env.MN_DEBUG;
      } else {
        process.env.MN_DEBUG = originalMnDebug;
      }
    });

    describe('happy path', () => {
      it.each([undefined, 'testCircuit'])('proves, balances and submits the handles with circuit %s', async (circuitId) => {
        const mockFinalizedTxData = createMockFinalizedTxData();
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);
        const options: SubmitTxOptions<AnyProvableCircuitId> = { unprovenTx, circuitId };

        const result = await submitTx(mockProviders, options);

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(unprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(unboundTx, expect.any(Date));
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalledWith(finalizedTx);
        expect(mockProviders.publicDataProvider.watchForTxData).toHaveBeenCalledWith('test-tx-id');
        expect(result).toBe(mockFinalizedTxData);
      });

      it('submits successfully with debug logging enabled even if serialization throws', async () => {
        // __DEBUG__ is compiled to `true` in this package's vitest config, so MN_DEBUG=true
        // forces the debug-logging branch in logTransaction to run. That branch must never
        // break submission.
        process.env.MN_DEBUG = 'true';
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const serialize = vi.spyOn(LedgerTransaction.prototype, 'serialize').mockImplementation(() => {
          throw new Error('serialize boom');
        });
        const mockFinalizedTxData = createMockFinalizedTxData();
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(mockFinalizedTxData);

        const result = await submitTx(mockProviders, { unprovenTx, circuitId: 'testCircuit' });

        expect(serialize).toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalled();
        expect(result).toBe(mockFinalizedTxData);
      });
    });
  });

  describe('submitTxAsync', () => {
    let mockProviders: ReturnType<typeof createMockProviders>;
    let unprovenTx: ReturnType<typeof createMockUnprovenTx>;
    let unboundTx: UnboundTx;
    let finalizedTx: FinalizedTx;

    beforeEach(async () => {
      vi.clearAllMocks();
      mockProviders = createMockProviders();
      unprovenTx = createMockUnprovenTx();
      unboundTx = await handles.v9.Unbound();
      finalizedTx = await handles.v9.Finalized();
    });

    describe('successful submission', () => {
      it.each([undefined, 'testCircuit'])('returns the txId without waiting for finalization, circuit %s', async (circuitId) => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');

        const result = await submitTxAsync(mockProviders, { unprovenTx, circuitId });

        expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(unprovenTx);
        expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(unboundTx, expect.any(Date));
        expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalledWith(finalizedTx);
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
        expect(result).toBe('test-tx-id');
      });
    });

    describe('config', () => {
      it('passes the configured TTL to the wallet', async () => {
        const providers = { ...mockProviders, config: { networkId: 'preview', ttlSeconds: 45 } };
        providers.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        providers.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        providers.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        const before = Date.now();

        await submitTxAsync(providers, { unprovenTx });

        const ttl = vi.mocked(providers.walletProvider.balanceTx).mock.calls[0]?.[1];
        expect(ttl?.getTime()).toBeGreaterThanOrEqual(before + 45_000);
        expect(ttl?.getTime()).toBeLessThanOrEqual(Date.now() + 45_000);
      });

      it('rejects an invalid TTL before proving', async () => {
        const providers = { ...mockProviders, config: { networkId: 'preview', ttlSeconds: 0 } };
        providers.proofProvider.proveTx = vi.fn();

        await expect(submitTxAsync(providers, { unprovenTx })).rejects.toThrow(InvalidArgumentError);
        expect(providers.proofProvider.proveTx).not.toHaveBeenCalled();
      });
    });

    describe('v8 handles back from a provider on a v9 transaction', () => {
      it('rejects a v8 proveTx answer with the era-invariant code and never balances it', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v8.Unbound());

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(EraInvariantViolationError);
        expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
        expect(rejection).toMatchObject({ method: 'proveTx', expected: 'v9', received: 'v8' });
        expect(mockProviders.walletProvider.balanceTx).not.toHaveBeenCalled();
      });

      it('rejects a v8 balanceTx answer with the era-invariant code and never submits it', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(await handles.v8.Finalized());

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(EraInvariantViolationError);
        expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
        expect(rejection).toMatchObject({ method: 'balanceTx', expected: 'v9', received: 'v8' });
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('carries the circuitId so a dApp firing many circuits can tell which call broke', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v8.Unbound());

        const rejection = await rejectionOf(
          submitTxAsync(mockProviders, { unprovenTx, circuitId: 'increment' as AnyProvableCircuitId })
        );

        expect(rejection).toMatchObject({ circuitId: 'increment' });
        expect((rejection as Error).message).toContain('increment');
      });

      it('names every circuit of a merged transaction, each quoted separately', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v8.Unbound());
        const circuitId: AnyProvableCircuitId[] = ['increment', 'reset'];

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx, circuitId }));

        expect((rejection as Error).message).toContain("circuits 'increment', 'reset'");
      });
    });

    describe('a provider answering with something other than a handle', () => {
      it.each([
        ['the pre-handle tagged record', () => ({ version: 'v9', tx: {} })],
        ['undefined', () => undefined],
        ['null', () => null]
      ])('rejects %s from proveTx with InvalidTransactionHandleError, and never balances it', async (_label, answer) => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(answer());

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

        expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
        expect(rejection).toMatchObject({ method: 'proveTx', reason: 'not-a-handle' });
        expect(mockProviders.walletProvider.balanceTx).not.toHaveBeenCalled();
      });

      it('rejects an unproven handle from proveTx as wrong-stage, and never balances it', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(createMockUnprovenTx());

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

        expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
        expect(rejection).toMatchObject({ method: 'proveTx', reason: 'wrong-stage' });
        expect(mockProviders.walletProvider.balanceTx).not.toHaveBeenCalled();
      });

      it('rejects a non-handle balanceTx answer and never submits it', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(undefined);

        const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

        expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
        expect(rejection).toMatchObject({ method: 'balanceTx', reason: 'not-a-handle' });
        expect(mockProviders.midnightProvider.submitTx).not.toHaveBeenCalled();
      });

      it('rejects an untagged watchForTxData record', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        const { era: _dropped, ...untaggedRecord } = createMockFinalizedTxData();
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(untaggedRecord);

        const rejection = await rejectionOf(submitTx(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(UnknownLedgerVersionError);
        expect(hasErrorCode(rejection, PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION)).toBe(true);
      });
    });

    describe('v8 records from the read surface', () => {
      it('rejects a v8 watchForTxData record with the era-invariant code', async () => {
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockLedger8FinalizedTxData());

        const rejection = await rejectionOf(submitTx(mockProviders, { unprovenTx }));

        expect(rejection).toBeInstanceOf(EraInvariantViolationError);
        expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
        expect(rejection).toMatchObject({ method: 'watchForTxData' });
      });

      it('returns the v9 record unchanged when the read surface reports v9', async () => {
        const finalized = createMockFinalizedTxData();
        mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
        mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
        mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
        mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(finalized);

        await expect(submitTx(mockProviders, { unprovenTx })).resolves.toBe(finalized);
      });
    });
  });

  describe('routing on the network head', () => {
    const LEDGER8_HEAD = 1_000_000;
    const LEDGER9_HEAD = 2_000_000;

    let mockProviders: ReturnType<typeof createMockProviders>;

    const onHead = (protocolVersion: number): void => {
      mockProviders.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockResolvedValue(protocolVersion);
    };

    const answerInEra = async (era: 'v8' | 'v9'): Promise<void> => {
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles[era].Unbound());
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(await handles[era].Finalized());
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockProviders = createMockProviders();
    });

    it('proves, balances and submits a v8 handle on a v8 head, and returns the v8 record', async () => {
      onHead(LEDGER8_HEAD);
      const unprovenTx = await handles.v8.Unproven();
      const unboundTx = await handles.v8.Unbound();
      const finalizedTx = await handles.v8.Finalized();
      const record = createMockLedger8FinalizedTxData();
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(unboundTx);
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(finalizedTx);
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(record);

      const result = await submitTx(mockProviders, { unprovenTx, circuitId: 'testCircuit' });

      expect(mockProviders.proofProvider.proveTx).toHaveBeenCalledWith(unprovenTx);
      expect(mockProviders.walletProvider.balanceTx).toHaveBeenCalledWith(unboundTx, expect.any(Date));
      expect(mockProviders.midnightProvider.submitTx).toHaveBeenCalledWith(finalizedTx);
      expect(result).toBe(record);
    });

    it.each([
      ['submitTx', submitTx],
      ['submitTxAsync', submitTxAsync]
    ] as const)('%s refuses a v8 handle on a v9 head before proving it', async (_name, submit) => {
      onHead(LEDGER9_HEAD);

      const rejection = await rejectionOf(submit(mockProviders, { unprovenTx: await handles.v8.Unproven() }));

      expect(rejection).toBeInstanceOf(EraMismatchError);
      expect(rejection).toMatchObject({ reason: 'ledger8-transaction-on-ledger9-network' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it.each([
      ['submitTx', submitTx],
      ['submitTxAsync', submitTxAsync]
    ] as const)('%s refuses a v9 handle on a v8 head before proving it', async (_name, submit) => {
      onHead(LEDGER8_HEAD);

      const rejection = await rejectionOf(submit(mockProviders, { unprovenTx: createMockUnprovenTx() }));

      expect(rejection).toBeInstanceOf(EraMismatchError);
      expect(rejection).toMatchObject({ reason: 'ledger9-transaction-on-ledger8-network' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    describe.each([
      ['submitTx', submitTx],
      ['submitTxAsync', submitTxAsync]
    ] as const)('%s with a value that is not a handle', (_name, submit) => {
      it.each([
        ['the pre-handle { version, tx } record', () => ({ version: 'v9', tx: LedgerTransaction.unwrap(createMockUnprovenTx(), 'v9') })],
        ['a raw ledger transaction', () => LedgerTransaction.unwrap(createMockUnprovenTx(), 'v9')],
        ['null', () => null]
      ])('refuses %s with InvalidTransactionHandleError before reading the head', async (_label, value) => {
        onHead(LEDGER9_HEAD);

        // @ts-expect-error none of these values is an UnprovenTx
        const rejection = await rejectionOf(submit(mockProviders, { unprovenTx: value() }));

        expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

        expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
        expect(rejection).toMatchObject({ method: 'submitTx', reason: 'not-a-handle' });
        expect(mockProviders.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
        expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
      });

      it('refuses a handle at another stage with wrong-stage before reading the head', async () => {
        onHead(LEDGER9_HEAD);

        // @ts-expect-error a finalized handle is not an UnprovenTx
        const rejection = await rejectionOf(submit(mockProviders, { unprovenTx: await handles.v9.Finalized() }));

        expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);

        expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
        expect(rejection).toMatchObject({ method: 'submitTx', reason: 'wrong-stage' });
        expect(mockProviders.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
      });
    });

    describe.each([
      { era: 'v9', head: LEDGER9_HEAD },
      { era: 'v8', head: LEDGER8_HEAD }
    ] as const)('a provider rejection on a $era transaction', ({ era, head }) => {
      it.each(['proveTx', 'balanceTx', 'submitTx'] as const)(
        'is reported from %s as ProviderFailedError with the failure sanitized onto cause',
        async (method) => {
          onHead(head);
          await answerInEra(era);
          const failure = new Error(`${method} failed for 0x${'ab'.repeat(32)}`);
          const rejectAt = {
            proveTx: () => {
              mockProviders.proofProvider.proveTx = vi.fn().mockRejectedValue(failure);
            },
            balanceTx: () => {
              mockProviders.walletProvider.balanceTx = vi.fn().mockRejectedValue(failure);
            },
            submitTx: () => {
              mockProviders.midnightProvider.submitTx = vi.fn().mockRejectedValue(failure);
            }
          };
          rejectAt[method]();
          const unprovenTx = era === 'v9' ? createMockUnprovenTx() : await handles.v8.Unproven();

          const rejection = await rejectionOf(submitTxAsync(mockProviders, { unprovenTx, circuitId: 'testCircuit' }));

          expect(rejection).toBeInstanceOf(ProviderFailedError);
          expect(hasErrorCode(rejection, CONTRACTS_ERROR_CODES.PROVIDER_FAILED)).toBe(true);
          expect(rejection).toMatchObject({
            method,
            circuitId: 'testCircuit',
            cause: { message: `Error: ${method} failed for 0x[redacted]` }
          });
        }
      );
    });

    it('keeps the code of a coded provider rejection on the sanitized cause, redacting its message', async () => {
      const decodeFailure = Object.assign(new Error(`wallet answered 0x${'cd'.repeat(32)}`), {
        code: PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE,
        cause: new Error('runtime refusal')
      });
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v9.Unbound());
      mockProviders.walletProvider.balanceTx = vi.fn().mockRejectedValue(decodeFailure);

      const rejection = await rejectionOf(submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx() }));

      expect(rejection).toBeInstanceOf(ProviderFailedError);
      expect(rejection).toMatchObject({ method: 'balanceTx', cause: { message: 'Error: wallet answered 0x[redacted]' } });
      expect(hasErrorCode(Reflect.get(Object(rejection), 'cause'), PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
    });

    it('drops a code that is not one of this framework\'s from the sanitized cause', async () => {
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v9.Unbound());
      mockProviders.walletProvider.balanceTx = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('refused'), { code: 'SECRET_0xabcdef' }));

      const rejection = await rejectionOf(submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx() }));

      expect(rejection).toBeInstanceOf(ProviderFailedError);
      expect(Reflect.get(Object(Reflect.get(Object(rejection), 'cause')), 'code')).toBeUndefined();
    });

    it('wraps a provider rejection on the pipelines\' v9 path the same way', async () => {
      mockProviders.proofProvider.proveTx = vi.fn().mockRejectedValue(new Error('proof server down'));

      const rejection = submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx() });

      await expect(rejection).rejects.toBeInstanceOf(ProviderFailedError);
      await expect(rejection).rejects.toMatchObject({ method: 'proveTx', cause: { message: 'Error: proof server down' } });
    });

    it('refuses providers that do not serve the head era before proving', async () => {
      mockProviders = { ...mockProviders, proofProvider: { ...mockProviders.proofProvider, supportedEras: ['v9'] } };
      onHead(LEDGER8_HEAD);

      const rejection = submitTx(mockProviders, { unprovenTx: await handles.v8.Unproven() });

      await expect(rejection).rejects.toBeInstanceOf(ProviderEraUnsupportedError);
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('treats a record from a different era than the head as an invariant violation', async () => {
      onHead(LEDGER8_HEAD);
      await answerInEra('v8');
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockFinalizedTxData());

      const rejection = submitTx(mockProviders, { unprovenTx: await handles.v8.Unproven() });

      await expect(rejection).rejects.toBeInstanceOf(EraInvariantViolationError);
      await expect(rejection).rejects.toMatchObject({
        method: 'watchForTxData',
        expected: 'v8',
        received: 'v9',
        txId: 'test-tx-id'
      });
    });

    it('treats a v8 record on a v9 head as an invariant violation', async () => {
      onHead(LEDGER9_HEAD);
      await answerInEra('v9');
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockLedger8FinalizedTxData());

      const rejection = submitTx(mockProviders, { unprovenTx: createMockUnprovenTx() });

      await expect(rejection).rejects.toBeInstanceOf(EraInvariantViolationError);
      await expect(rejection).rejects.toMatchObject({
        method: 'watchForTxData',
        expected: 'v9',
        received: 'v8',
        txId: 'test-tx-id'
      });
    });

    it('propagates a failed head read before proving', async () => {
      const networkVersionReadFailure = new Error('indexer unreachable');
      mockProviders.publicDataProvider.queryLatestProtocolVersion = vi.fn().mockRejectedValue(networkVersionReadFailure);

      const rejection = submitTx(mockProviders, { unprovenTx: createMockUnprovenTx() });

      await expect(rejection).rejects.toBe(networkVersionReadFailure);
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('refuses a head this build cannot place on the era timeline before proving', async () => {
      onHead(99_000_000);

      const rejection = submitTx(mockProviders, { unprovenTx: createMockUnprovenTx() });

      await expect(rejection).rejects.toBeInstanceOf(UnknownProtocolVersionError);
      await expect(rejection).rejects.toMatchObject({ path: 'construct', reason: 'unknown' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('returns the transaction id of a v8 submission without waiting for it', async () => {
      onHead(LEDGER8_HEAD);
      await answerInEra('v8');

      const txId = await submitTxAsync(mockProviders, { unprovenTx: await handles.v8.Unproven() });

      expect(txId).toBe('test-tx-id');
      expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
    });

    describe('a submission the node rejects', () => {
      const rejectedOnV8Head = async (secondRead: () => Promise<number>): Promise<void> => {
        await answerInEra('v8');
        mockProviders.midnightProvider.submitTx = vi.fn().mockRejectedValue(new Error('node refused the transaction'));
        mockProviders.publicDataProvider.queryLatestProtocolVersion = vi
          .fn()
          .mockResolvedValueOnce(LEDGER8_HEAD)
          .mockImplementationOnce(secondRead);
      };

      it('reports a fork crossing when the head moved forward between the head read and the submit', async () => {
        await rejectedOnV8Head(() => Promise.resolve(LEDGER9_HEAD));

        const rejection = await submitTx(mockProviders, {
          unprovenTx: await handles.v8.Unproven(),
          circuitId: 'increment'
        }).catch((error: unknown) => error);

        expect(rejection).toBeInstanceOf(ForkCrossedDuringOperationError);
        expect(rejection).toMatchObject({
          kind: 'transaction',
          startEra: 'v8',
          freshEra: 'v9',
          circuitId: 'increment',
          contractAddress: undefined
        });
        expect((rejection as ForkCrossedDuringOperationError).message).not.toContain('undefined');
        expect((rejection as ForkCrossedDuringOperationError).cause).toBeInstanceOf(ProviderFailedError);
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
      });

      it('reports a fork crossing from submitTxAsync too, still without waiting for a record', async () => {
        await rejectedOnV8Head(() => Promise.resolve(LEDGER9_HEAD));

        const rejection = await submitTxAsync(mockProviders, { unprovenTx: await handles.v8.Unproven() }).catch(
          (error: unknown) => error
        );

        expect(rejection).toBeInstanceOf(ForkCrossedDuringOperationError);
        expect(rejection).toMatchObject({ kind: 'transaction', circuitId: undefined });
        expect(mockProviders.publicDataProvider.watchForTxData).not.toHaveBeenCalled();
      });

      it('keeps the rejection as it is when the head has not moved', async () => {
        await rejectedOnV8Head(() => Promise.resolve(LEDGER8_HEAD));

        const rejection = await submitTx(mockProviders, { unprovenTx: await handles.v8.Unproven() }).catch(
          (error: unknown) => error
        );

        expect(rejection).toBeInstanceOf(ProviderFailedError);
        expect(mockProviders.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(2);
      });

      it('reports the rejection as undiagnosed when the head cannot be read again', async () => {
        await rejectedOnV8Head(() => Promise.reject(new Error('indexer unreachable')));

        const rejection = await submitTx(mockProviders, { unprovenTx: await handles.v8.Unproven() }).catch(
          (error: unknown) => error
        );

        expect(rejection).toBeInstanceOf(SubmitRejectionUndiagnosedError);
        expect(rejection).toMatchObject({ reason: 'network-version-read-failed', kind: 'transaction' });
        expect((rejection as SubmitRejectionUndiagnosedError).message).not.toContain('undefined');
      });

      it('does not claim a fork when the head moved backwards', async () => {
        await answerInEra('v9');
        mockProviders.midnightProvider.submitTx = vi.fn().mockRejectedValue(new Error('node refused the transaction'));
        mockProviders.publicDataProvider.queryLatestProtocolVersion = vi
          .fn()
          .mockResolvedValueOnce(LEDGER9_HEAD)
          .mockResolvedValueOnce(LEDGER8_HEAD);

        const rejection = await submitTx(mockProviders, { unprovenTx: await handles.v9.Unproven() }).catch(
          (error: unknown) => error
        );

        expect(rejection).toBeInstanceOf(SubmitRejectionUndiagnosedError);
        expect(rejection).toMatchObject({ reason: 'network-version-went-backwards', kind: 'transaction' });
        expect((rejection as SubmitRejectionUndiagnosedError).message).toContain("now reports ledger 'v8', an EARLIER ledger era");
      });

      it('does not read the head again when proving fails', async () => {
        await rejectedOnV8Head(() => Promise.resolve(LEDGER9_HEAD));
        mockProviders.proofProvider.proveTx = vi.fn().mockRejectedValue(new Error('prover down'));

        const rejection = await submitTx(mockProviders, { unprovenTx: await handles.v8.Unproven() }).catch(
          (error: unknown) => error
        );

        expect(rejection).toBeInstanceOf(ProviderFailedError);
        expect(mockProviders.publicDataProvider.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('submitLedger9Payload, the pipelines\' v9 path', () => {
    let mockProviders: ReturnType<typeof createMockProviders>;

    beforeEach(async () => {
      vi.clearAllMocks();
      mockProviders = createMockProviders();
      mockProviders.proofProvider.proveTx = vi.fn().mockResolvedValue(await handles.v9.Unbound());
      mockProviders.walletProvider.balanceTx = vi.fn().mockResolvedValue(await handles.v9.Finalized());
      mockProviders.midnightProvider.submitTx = vi.fn().mockResolvedValue('test-tx-id');
    });

    it('submits as v9 without reading the head and returns the v9 record', async () => {
      const record = createMockFinalizedTxData();
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(record);

      const result = await submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx() });

      expect(result).toBe(record);
      expect(mockProviders.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    });

    it('refuses a v8 handle before proving it', async () => {
      const rejection = await rejectionOf(submitLedger9Payload(mockProviders, { unprovenTx: await handles.v8.Unproven() }));

      expect(rejection).toBeInstanceOf(TransactionEraMismatchError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.TRANSACTION_ERA_MISMATCH)).toBe(true);
      expect(rejection).toMatchObject({ expected: 'v9', actual: 'v8' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('refuses a handle at another stage with wrong-stage before proving it', async () => {
      const unbound = await handles.v9.Unbound();

      // @ts-expect-error an unbound handle is not an unproven one
      const rejection = await rejectionOf(submitLedger9Payload(mockProviders, { unprovenTx: unbound }));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(rejection).toMatchObject({ method: 'submitTx', reason: 'wrong-stage' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it.each([
      ['the pre-handle { version, tx } record', () => ({ version: 'v9', tx: LedgerTransaction.unwrap(createMockUnprovenTx(), 'v9') })],
      ['null', () => null]
    ])('refuses %s with InvalidTransactionHandleError before proving it', async (_label, value) => {
      // @ts-expect-error neither value is an UnprovenTx
      const rejection = await rejectionOf(submitLedger9Payload(mockProviders, { unprovenTx: value() }));

      expect(rejection).toBeInstanceOf(InvalidTransactionHandleError);
      expect(hasErrorCode(rejection, PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE)).toBe(true);
      expect(rejection).toMatchObject({ method: 'submitTx', reason: 'not-a-handle' });
      expect(mockProviders.proofProvider.proveTx).not.toHaveBeenCalled();
    });

    it('treats a v8 record as an invariant violation', async () => {
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(createMockLedger8FinalizedTxData());

      const rejection = submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx(), circuitId: 'testCircuit' });

      await expect(rejection).rejects.toBeInstanceOf(EraInvariantViolationError);
    });

    it('refuses an untagged record', async () => {
      const { era: _dropped, ...untagged } = createMockFinalizedTxData();
      mockProviders.publicDataProvider.watchForTxData = vi.fn().mockResolvedValue(untagged);

      await expect(submitLedger9Payload(mockProviders, { unprovenTx: createMockUnprovenTx() })).rejects.toBeInstanceOf(
        UnknownLedgerVersionError
      );
    });
  });
});
