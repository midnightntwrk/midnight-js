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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { deserializeTransactionAtStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import type { CoinPublicKey, EncPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LedgerTransaction, type LoggerProvider, type PrivateStateId, type UnprovenTx } from '@midnight-ntwrk/midnight-js-types';

import { ScopedTransactionIdentityMismatchError } from '../errors';
import type { AnyLedger8FinalizedCallTxData, AnyLedger8UnsubmittedCallTxData } from '../ledger8-contract';
import type * as Transaction from '../transaction';
import type { HeadEraReading } from './era';
import {
  acquireLedger8RuntimeForReading,
  assertLedger8RecordEra,
  assertLedger8TxSucceeded,
  buildLedger8CallTx,
  type Ledger8CallEntryOptions,
  type Ledger8CallEntryProviders,
  type Ledger8CallIdentity,
  type Ledger8CallScope,
  type Ledger8Runtime,
  type Ledger8ScopeStates,
  submitLedger8Tx
} from './ledger8-entry';
import { assertScopeAdmitsLedger8Call, logScopeFailure, type PrivateStateTarget, ScopeEra, Submit, TypeId } from './transaction';

const mergeUnproven = async (current: UnprovenTx | undefined, next: UnprovenTx): Promise<UnprovenTx> => {
  if (current === undefined) {
    return next;
  }
  const [left, right] = await Promise.all([
    deserializeTransactionAtStage('v8', 'Unproven', current.serialize()),
    deserializeTransactionAtStage('v8', 'Unproven', next.serialize())
  ]);
  return LedgerTransaction.seal('v8', 'Unproven', left.merge(right));
};

/**
 * The states a call ended on, as the states the next call in the scope runs against. The snapshot's
 * bytes stay as read: the composer reads only the operation registry out of them, and the call binds
 * to `encoded`. The balance stays as read too, as the ledger 9 scope keeps it.
 */
const statesAfter = (states: Ledger8ScopeStates, callTxData: AnyLedger8UnsubmittedCallTxData): Ledger8ScopeStates => {
  const next = callTxData.public.nextContractStateEncoded;
  return {
    snapshot: { ...states.snapshot, encoded: next, decoded: { ...states.snapshot.decoded, state: next } },
    privateState: callTxData.private.nextPrivateState
  };
};

/** @internal */
export class Ledger8TransactionContextImpl implements Transaction.AnyLedger8TransactionContext, Ledger8CallScope {
  readonly [TypeId]: Transaction.TypeId = TypeId;
  readonly [ScopeEra] = 'v8';

  #states: { readonly identity: Ledger8CallIdentity; readonly states: Ledger8ScopeStates } | undefined;
  #merged: UnprovenTx | undefined;
  readonly #circuitIds: string[] = [];
  #lastCall:
    | {
        readonly callTxData: AnyLedger8UnsubmittedCallTxData;
        readonly circuitId: string;
        readonly privateStateTarget?: PrivateStateTarget;
      }
    | undefined;

  constructor(
    readonly providers: Ledger8CallEntryProviders,
    readonly runtime: Ledger8Runtime,
    readonly options?: Transaction.ScopedTransactionOptions
  ) {}

  getAdditionalMappings(): ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined {
    return this.options?.additionalCoinEncPublicKeyMappings;
  }

  getLastUnsubmittedCallTxDataToTransact(): [AnyLedger8UnsubmittedCallTxData, PrivateStateId?] | undefined {
    return this.#lastCall === undefined
      ? undefined
      : [this.#lastCall.callTxData, this.#lastCall.privateStateTarget?.privateStateId];
  }

  statesFor(identity: Ledger8CallIdentity): Ledger8ScopeStates | undefined {
    if (this.#states === undefined) {
      return undefined;
    }
    const held = this.#states.identity;
    if (held.contractAddress !== identity.contractAddress || held.privateStateId !== identity.privateStateId) {
      throw new ScopedTransactionIdentityMismatchError(
        { contractAddress: held.contractAddress, privateStateId: held.privateStateId },
        { contractAddress: identity.contractAddress, privateStateId: identity.privateStateId }
      );
    }
    return this.#states.states;
  }

  keepStates(identity: Ledger8CallIdentity, states: Ledger8ScopeStates): void {
    this.#states = { identity, states };
  }

  /** Adds a built call to the scope's transaction and advances the scope's states past it. */
  async merge(circuitId: string, callTxData: AnyLedger8UnsubmittedCallTxData, privateStateTarget?: PrivateStateTarget): Promise<void> {
    this.#merged = await mergeUnproven(this.#merged, callTxData.private.unprovenTx);
    this.#circuitIds.push(circuitId);
    this.#lastCall = { callTxData, circuitId, privateStateTarget };
    if (this.#states !== undefined) {
      this.#states = { identity: this.#states.identity, states: statesAfter(this.#states.states, callTxData) };
    }
  }

  async [Submit](): Promise<AnyLedger8FinalizedCallTxData> {
    const last = this.#lastCall;
    const merged = this.#merged;
    const identity = this.#states?.identity;
    if (last === undefined || merged === undefined || identity === undefined) {
      throw new InvalidArgumentError('No calls were submitted.');
    }
    const { head } = this.runtime.resolved;
    const circuitIds = this.#circuitIds.join(', ');
    const txId = await submitLedger8Tx(this.providers, merged, {
      networkVersion: head,
      kind: 'call',
      circuitId: circuitIds,
      contractAddress: identity.contractAddress
    });
    const record = await this.providers.publicDataProvider.watchForTxData(txId);
    assertLedger8RecordEra(record, head, circuitIds, 'watchForTxData');
    assertLedger8TxSucceeded(record, circuitIds, identity.contractAddress);
    const target = last.privateStateTarget;
    if (target !== undefined && this.providers.privateStateProvider !== undefined) {
      await this.providers.privateStateProvider
        .forContract(target.contractAddress)
        .set(target.privateStateId, last.callTxData.private.nextPrivateState);
    }
    return {
      era: 'v8',
      circuitId: last.circuitId,
      public: { ...record, ...last.callTxData.public },
      private: last.callTxData.private,
      calls: last.callTxData.calls
    };
  }
}

/**
 * Whether `u` is a scope context of the ledger 8 era.
 *
 * @internal
 */
export const isLedger8ScopeContext = (u: unknown): u is Ledger8TransactionContextImpl =>
  u instanceof Ledger8TransactionContextImpl;

/**
 * The ledger 8 scope a ledger 8 call was handed, or `undefined` when it was handed none.
 *
 * @internal
 * @throws EraMismatchError with reason `'ledger8-call-in-scope'` if it was handed a ledger 9 scope.
 * @throws InvalidArgumentError if it was handed a third argument that is not a scope.
 */
export const ledger8ScopeOf = (
  circuitId: string,
  transactionContext: unknown,
  entryPoint: 'submitCallTx' | 'createUnprovenCallTx' | 'createLedger8UnprovenCallTx'
): Ledger8TransactionContextImpl | undefined => {
  if (isLedger8ScopeContext(transactionContext)) {
    return transactionContext;
  }
  assertScopeAdmitsLedger8Call(circuitId, transactionContext, entryPoint);
  return undefined;
};

/**
 * Builds one ledger 8 call against the scope's states and adds it to the scope's transaction.
 * Nothing is submitted: the scope submits once its body returns.
 *
 * @internal
 */
export const joinLedger8Scope = async (
  providers: Ledger8CallEntryProviders,
  options: Ledger8CallEntryOptions,
  scope: Ledger8TransactionContextImpl
): Promise<AnyLedger8UnsubmittedCallTxData> => {
  const { data } = await buildLedger8CallTx(providers, options, scope);
  const privateStateTarget =
    options.privateStateId === undefined
      ? undefined
      : { contractAddress: options.contractAddress, privateStateId: options.privateStateId };
  await scope.merge(options.circuitId, data, privateStateTarget);
  return data;
};

/**
 * Runs `fn` inside `outer`, a scope already running. The outer scope submits.
 *
 * @internal
 * @returns The execution data of the last call made in the scope so far.
 */
export const nestLedger8Scope = async (
  fn: (txCtx: Transaction.AnyLedger8TransactionContext) => Promise<void>,
  outer: Ledger8TransactionContextImpl
): Promise<AnyLedger8UnsubmittedCallTxData> => {
  await fn(outer);
  const [last] = outer.getLastUnsubmittedCallTxDataToTransact() ?? [];
  if (last === undefined) {
    throw new InvalidArgumentError('No calls were submitted.');
  }
  return last;
};

/**
 * Runs `fn` as a ledger 8 scope on a head reading already admitted as ledger 8, then submits every
 * call it made as one transaction.
 *
 * @internal
 */
export const runLedger8Scope = async (
  providers: Ledger8CallEntryProviders & { readonly loggerProvider?: LoggerProvider },
  fn: (txCtx: Transaction.AnyLedger8TransactionContext) => Promise<void>,
  options: Transaction.ScopedTransactionOptions | undefined,
  reading: HeadEraReading
): Promise<AnyLedger8FinalizedCallTxData> => {
  const runtime = await acquireLedger8RuntimeForReading(reading, providers, 'call', { logger: providers.loggerProvider });
  const context = new Ledger8TransactionContextImpl(providers, runtime, options);
  try {
    await fn(context);
  } catch (err: unknown) {
    throw logScopeFailure(providers, undefined, options, 'executing', err);
  }
  try {
    return await context[Submit]();
  } catch (err: unknown) {
    throw logScopeFailure(providers, undefined, options, 'submitting', err);
  }
};
