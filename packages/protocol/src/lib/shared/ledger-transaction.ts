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

import type {
  Binding,
  FinalizedTransaction,
  PreBinding,
  PreProof,
  Proof,
  SignatureEnabled,
  Transaction as Ledger9TransactionAt,
  UnprovenTransaction
} from '@midnightntwrk/ledger-v9';
import { Transaction as Ledger9Transaction } from '@midnightntwrk/ledger-v9';

import {
  InvalidArgumentError,
  PayloadNotATransactionError,
  TRANSACTION_TAG_PREFIX,
  UnknownLedgerVersionError
} from '../../errors';
import type * as Ledger8 from '../../v8.js';
import { type Ledger8Protocol, loadedLedger8Protocol, loadLedger8Protocol } from '../v8/load';
import { LEDGER_VERSIONS, type LedgerVersion } from './ledger-version';

/** The point in its life a transaction has reached: before proving, after proving, after binding. */
export type TransactionStage = 'Unproven' | 'Unbound' | 'Finalized';

/** The ledger transaction class of each era at each {@link TransactionStage}. */
export interface LedgerTransactionTypes {
  v8: {
    Unproven: Ledger8.UnprovenTransaction;
    Unbound: Ledger8.Transaction<Ledger8.SignatureEnabled, Ledger8.Proof, Ledger8.PreBinding>;
    Finalized: Ledger8.FinalizedTransaction;
  };
  v9: {
    Unproven: UnprovenTransaction;
    Unbound: Ledger9TransactionAt<SignatureEnabled, Proof, PreBinding>;
    Finalized: FinalizedTransaction;
  };
}

/**
 * Whether a value is a transaction of the ledger copy this framework loaded:
 * `'own'` when it is, `'foreign-instance'` when it is a transaction object of
 * another WASM instance of the same package, `'not-a-transaction'` when it is
 * not a transaction object at all (bytes, `undefined`, a plain object), and
 * `'ledger8-not-loaded'` when the v8 ledger has not been loaded yet, so no
 * answer is possible.
 */
export type FrameworkInstanceCheck = 'own' | 'foreign-instance' | 'not-a-transaction' | 'ledger8-not-loaded';

type Assert<T extends true> = T;
type _EveryEraHasTransactionTypes = Assert<
  [Exclude<LedgerVersion, keyof LedgerTransactionTypes>] extends [never] ? true : false
>;
type _NoTransactionTypesOutsideTheEraSet = Assert<
  [Exclude<keyof LedgerTransactionTypes, LedgerVersion>] extends [never] ? true : false
>;

const TRANSACTION_STAGES: readonly string[] = Object.freeze(['Unproven', 'Unbound', 'Finalized'] satisfies TransactionStage[]);

type StageDecoders<E extends LedgerVersion> = {
  readonly [S in TransactionStage]: (bytes: Uint8Array) => LedgerTransactionTypes[E][S];
};

const ledger9Decoders: StageDecoders<'v9'> = Object.freeze({
  Unproven: (bytes) =>
    Ledger9Transaction.deserialize<SignatureEnabled, PreProof, PreBinding>('signature', 'pre-proof', 'pre-binding', bytes),
  Unbound: (bytes) =>
    Ledger9Transaction.deserialize<SignatureEnabled, Proof, PreBinding>('signature', 'proof', 'pre-binding', bytes),
  Finalized: (bytes) =>
    Ledger9Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', bytes)
});

const ledger8DecodersOf = ({ Transaction }: Ledger8Protocol): StageDecoders<'v8'> => ({
  Unproven: (bytes) =>
    Transaction.deserialize<Ledger8.SignatureEnabled, Ledger8.PreProof, Ledger8.PreBinding>(
      'signature',
      'pre-proof',
      'pre-binding',
      bytes
    ),
  Unbound: (bytes) =>
    Transaction.deserialize<Ledger8.SignatureEnabled, Ledger8.Proof, Ledger8.PreBinding>(
      'signature',
      'proof',
      'pre-binding',
      bytes
    ),
  Finalized: (bytes) =>
    Transaction.deserialize<Ledger8.SignatureEnabled, Ledger8.Proof, Ledger8.Binding>(
      'signature',
      'proof',
      'binding',
      bytes
    )
});

const decodersOf: { readonly [E in LedgerVersion]: () => Promise<StageDecoders<E>> } = Object.freeze({
  v8: async () => ledger8DecodersOf(await loadLedger8Protocol()),
  v9: () => Promise.resolve(ledger9Decoders)
});

const TRANSACTION_TAG_PREFIX_BYTES = Uint8Array.from(TRANSACTION_TAG_PREFIX, (character) => character.charCodeAt(0));

const assertSerializedTransaction = (bytes: unknown): void => {
  if (!(bytes instanceof Uint8Array)) {
    throw PayloadNotATransactionError.notBytes(bytes);
  }
  const matchesPrefix =
    bytes.byteLength >= TRANSACTION_TAG_PREFIX_BYTES.length &&
    TRANSACTION_TAG_PREFIX_BYTES.every((byte, index) => bytes[index] === byte);
  if (!matchesPrefix) {
    throw PayloadNotATransactionError.wrongTag(bytes.byteLength);
  }
};

const isTransactionShaped = (value: unknown): value is { serialize(): Uint8Array } =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'serialize') === 'function';

const assertKnownEra = (era: string): void => {
  if (!LEDGER_VERSIONS.some((version) => version === era)) {
    throw new UnknownLedgerVersionError(era);
  }
};

/**
 * Reads serialized bytes as a transaction of the given era at the given stage.
 *
 * A v8 transaction is read through {@link loadLedger8Protocol}, so the result
 * is an object of the ledger copy this framework loaded.
 *
 * @param era The ledger era that wrote the bytes.
 * @param stage The stage the bytes were serialized at.
 * @param bytes The serialized transaction.
 * @returns The live transaction object.
 * @throws PayloadNotATransactionError If `bytes` is not a serialized
 *   transaction, or the era's runtime cannot read it at `stage`; the runtime's
 *   refusal is on `cause`.
 * @throws UnknownLedgerVersionError If `era` is not a ledger version.
 * @throws InvalidArgumentError If `stage` is not a transaction stage.
 * @throws Ledger8RuntimeMissingError If the v8 runtime cannot be loaded.
 */
export const deserializeTransactionAtStage = async <E extends LedgerVersion, S extends TransactionStage>(
  era: E,
  stage: S,
  bytes: Uint8Array
): Promise<LedgerTransactionTypes[E][S]> => {
  assertKnownEra(era);
  if (!TRANSACTION_STAGES.includes(stage)) {
    throw new InvalidArgumentError(`Unknown transaction stage; expected one of ${TRANSACTION_STAGES.join(', ')}.`);
  }
  assertSerializedTransaction(bytes);
  const decoders = await decodersOf[era]();
  try {
    return decoders[stage](bytes);
  } catch (error: unknown) {
    throw PayloadNotATransactionError.undecodable(era, stage, bytes.byteLength, error);
  }
};

/**
 * Checks, synchronously, whether `value` is a transaction of the ledger copy
 * this framework loaded for `era`.
 *
 * A v8 value cannot be judged before {@link loadLedger8Protocol} has resolved,
 * because the framework's v8 class does not exist yet; the answer is then
 * `'ledger8-not-loaded'`.
 *
 * @param era The era the value claims to belong to.
 * @param value The value to check.
 * @returns See {@link FrameworkInstanceCheck}.
 * @throws UnknownLedgerVersionError If `era` is not a ledger version.
 */
export const isFrameworkLedgerTransaction = (era: LedgerVersion, value: unknown): FrameworkInstanceCheck => {
  assertKnownEra(era);
  if (!isTransactionShaped(value)) {
    return 'not-a-transaction';
  }
  switch (era) {
    case 'v9':
      return value instanceof Ledger9Transaction ? 'own' : 'foreign-instance';
    case 'v8': {
      const v8 = loadedLedger8Protocol();
      if (v8 === undefined) {
        return 'ledger8-not-loaded';
      }
      return value instanceof v8.Transaction ? 'own' : 'foreign-instance';
    }
  }
};

const STAGE_OF_MARKERS: Readonly<Record<string, TransactionStage>> = Object.freeze({
  'proof-preimage,embedded-fr': 'Unproven',
  'proof,embedded-fr': 'Unbound',
  'proof,pedersen-schnorr': 'Finalized'
});

const TAG_MARKERS = /^midnight:transaction\[v\d+\]\([^,()]+,([a-z-]+)(?:\[v\d+\])?,([a-z-]+)(?:\[v\d+\])?\):/;

const TAG_READ_LENGTH = 128;

/**
 * Reads the stage a transaction object is at from the proof and binding
 * markers in its serialized tag.
 *
 * @param tx The transaction object, of either era.
 * @returns The stage, or `undefined` when the markers name no
 *   {@link TransactionStage} (for example a bound transaction with no proofs).
 */
export const transactionStageOf = (tx: { serialize(): Uint8Array }): TransactionStage | undefined => {
  const head = String.fromCharCode(...tx.serialize().subarray(0, TAG_READ_LENGTH));
  const markers = TAG_MARKERS.exec(head);
  return markers === null ? undefined : STAGE_OF_MARKERS[`${markers[1]},${markers[2]}`];
};
