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

import {
  MIDNIGHT_JS_ERROR_CATEGORIES,
  MidnightJsError,
  type MidnightJsErrorCategory
} from '@midnight-ntwrk/midnight-js-protocol/errors';
import type { FrameworkInstanceCheck } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import { LEDGER_STATE_KINDS, type LedgerStateKind, type LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol/version';

/**
 * The provider methods that carry a transaction handle.
 *
 * Closed rather than a bare `string` so a caught error can be switched on
 * exhaustively, and so a typo in a throw site is a compile error.
 */
export type TransactionMethod = 'proveTx' | 'balanceTx' | 'submitTx';

/**
 * The {@link PublicDataProvider} methods that report an era-tagged
 * finalized-transaction record.
 *
 * Declared here, alongside the interface that owns those methods, rather than
 * in a consuming package — otherwise every consumer outside that package falls
 * back to `string` and the closure is lost exactly where it is needed.
 */
export type ReadMethod = 'watchForTxData' | 'watchForDeployTxData';

/**
 * The {@link PublicDataProvider} methods that report a contract state with
 * its era.
 */
export type StateReadMethod = 'queryDeployContractState';

/**
 * Every provider method at which a payload's ledger era is resolved or
 * narrowed — the three transaction methods, the two record reads and the
 * state read.
 *
 * This is the vocabulary to type a caught error's `method` against when the
 * error can come from either surface.
 */
export type ProviderMethod = TransactionMethod | ReadMethod | StateReadMethod;

/**
 * Stable error-code strings for the providers.
 *
 * Most of the group belongs to the provider methods. Two sets do not, and are here
 * because this is the one provider-scoped group there is: `PRIVATE_STATE_NOT_SERIALIZABLE`
 * belongs to the private-state provider, and `INVALID_LEDGER_STATE`,
 * `LEDGER_STATE_DECODER_MISSING` and `LEDGER_STATE_DECODE_FAILED` belong to `LedgerState`.
 *
 * Declared in this package because this is where the provider interfaces and the
 * transaction handle are defined, and where most of the classes live; two others
 * come from
 * `@midnight-ntwrk/midnight-js-indexer-public-data-provider`, which depends on
 * this package. `@midnight-ntwrk/midnight-js-utils` re-exports the group and
 * folds it into the registry `hasErrorCode` consults.
 */
export const PROVIDER_ERROR_CODES = Object.freeze({
  DECODER_ERA_UNSUPPORTED: 'MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED',
  UNKNOWN_RECORD_ERA: 'MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA',
  // Distinct from DECODER_ERA_UNSUPPORTED above, which belongs to the READ surface:
  // that one means "this record cannot be decoded", raised while decoding. This
  // one means "this provider does not serve that era", raised from its declaration
  // or from its method before any work.
  PROVIDER_ERA_UNSUPPORTED: 'MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED',
  PRIVATE_STATE_NOT_SERIALIZABLE: 'MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE',
  INVALID_PROTOCOL_SCHEME: 'MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME',
  ARTIFACT_RUNTIME_VERSION_UNAVAILABLE: 'MIDNIGHT_JS_PR_ARTIFACT_RUNTIME_VERSION_UNAVAILABLE',
  ZK_ARTIFACT_NOT_FOUND: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND',
  ZK_ARTIFACT_FETCH_FAILED: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED',
  ZK_ARTIFACT_NOT_SERVED: 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED',
  PROOF_SERVER_UNAVAILABLE: 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE',
  PROOF_SERVER_REFUSED: 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED',
  PRIVATE_STATE_EXPORT_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_EXPORT_FAILED',
  SIGNING_KEY_EXPORT_FAILED: 'MIDNIGHT_JS_PR_SIGNING_KEY_EXPORT_FAILED',
  PRIVATE_STATE_IMPORT_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_IMPORT_FAILED',
  EXPORT_DECRYPTION_FAILED: 'MIDNIGHT_JS_PR_EXPORT_DECRYPTION_FAILED',
  INVALID_EXPORT_FORMAT: 'MIDNIGHT_JS_PR_INVALID_EXPORT_FORMAT',
  IMPORT_CONFLICT: 'MIDNIGHT_JS_PR_IMPORT_CONFLICT',
  PRIVATE_STATE_DECRYPTION_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED',
  PRIVATE_STATE_STORAGE_FAILED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED',
  PRIVATE_STATE_LIMIT_EXCEEDED: 'MIDNIGHT_JS_PR_PRIVATE_STATE_LIMIT_EXCEEDED',
  STORED_SIGNING_KEY_INVALID: 'MIDNIGHT_JS_PR_STORED_SIGNING_KEY_INVALID',
  INDEXER_GRAPHQL_FAILED: 'MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED',
  INDEXER_QUERY_FAILED: 'MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED',
  INDEXER_DATA_INVALID: 'MIDNIGHT_JS_PR_INDEXER_DATA_INVALID',
  INDEXER_SUBSCRIPTION_DATA_INVALID: 'MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID',
  INDEXER_CONFIG_INVALID: 'MIDNIGHT_JS_PR_INDEXER_CONFIG_INVALID',
  INDEXER_INVARIANT_VIOLATED: 'MIDNIGHT_JS_PR_INDEXER_INVARIANT_VIOLATED',
  INDEXER_PAYLOAD_TOO_LARGE: 'MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE',
  UNUSABLE_ERA_ENTRY: 'MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY',
  FOREIGN_LEDGER_TRANSACTION: 'MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION',
  INVALID_TRANSACTION_HANDLE: 'MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE',
  TRANSACTION_ERA_MISMATCH: 'MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH',
  INVALID_LEDGER_STATE: 'MIDNIGHT_JS_PR_INVALID_LEDGER_STATE',
  LEDGER_STATE_DECODER_MISSING: 'MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING',
  LEDGER_STATE_DECODE_FAILED: 'MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED'
} as const);
/** The union of every value in {@link PROVIDER_ERROR_CODES}. */
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[keyof typeof PROVIDER_ERROR_CODES];

const { USAGE, ENVIRONMENT, TRANSIENT, INTEGRITY, INTERNAL } = MIDNIGHT_JS_ERROR_CATEGORIES;

export const PROVIDER_ERROR_CATEGORIES: Readonly<Record<ProviderErrorCode, MidnightJsErrorCategory>> = Object.freeze({
  [PROVIDER_ERROR_CODES.DECODER_ERA_UNSUPPORTED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.UNKNOWN_RECORD_ERA]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PROVIDER_ERA_UNSUPPORTED]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_NOT_SERIALIZABLE]: USAGE,
  [PROVIDER_ERROR_CODES.INVALID_PROTOCOL_SCHEME]: USAGE,
  [PROVIDER_ERROR_CODES.ARTIFACT_RUNTIME_VERSION_UNAVAILABLE]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_FOUND]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_FETCH_FAILED]: TRANSIENT,
  [PROVIDER_ERROR_CODES.ZK_ARTIFACT_NOT_SERVED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PROOF_SERVER_UNAVAILABLE]: TRANSIENT,
  [PROVIDER_ERROR_CODES.PROOF_SERVER_REFUSED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_EXPORT_FAILED]: USAGE,
  [PROVIDER_ERROR_CODES.SIGNING_KEY_EXPORT_FAILED]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_IMPORT_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.EXPORT_DECRYPTION_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INVALID_EXPORT_FORMAT]: INTEGRITY,
  [PROVIDER_ERROR_CODES.IMPORT_CONFLICT]: USAGE,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_DECRYPTION_FAILED]: INTEGRITY,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_STORAGE_FAILED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.PRIVATE_STATE_LIMIT_EXCEEDED]: USAGE,
  [PROVIDER_ERROR_CODES.STORED_SIGNING_KEY_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_GRAPHQL_FAILED]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.INDEXER_QUERY_FAILED]: TRANSIENT,
  [PROVIDER_ERROR_CODES.INDEXER_DATA_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_SUBSCRIPTION_DATA_INVALID]: INTEGRITY,
  [PROVIDER_ERROR_CODES.INDEXER_CONFIG_INVALID]: USAGE,
  [PROVIDER_ERROR_CODES.INDEXER_INVARIANT_VIOLATED]: INTERNAL,
  [PROVIDER_ERROR_CODES.INDEXER_PAYLOAD_TOO_LARGE]: INTEGRITY,
  [PROVIDER_ERROR_CODES.UNUSABLE_ERA_ENTRY]: USAGE,
  [PROVIDER_ERROR_CODES.FOREIGN_LEDGER_TRANSACTION]: ENVIRONMENT,
  [PROVIDER_ERROR_CODES.INVALID_TRANSACTION_HANDLE]: USAGE,
  [PROVIDER_ERROR_CODES.TRANSACTION_ERA_MISMATCH]: USAGE,
  [PROVIDER_ERROR_CODES.INVALID_LEDGER_STATE]: USAGE,
  [PROVIDER_ERROR_CODES.LEDGER_STATE_DECODER_MISSING]: USAGE,
  [PROVIDER_ERROR_CODES.LEDGER_STATE_DECODE_FAILED]: INTEGRITY
});

const {
  PROVIDER_ERA_UNSUPPORTED,
  PRIVATE_STATE_NOT_SERIALIZABLE,
  INVALID_PROTOCOL_SCHEME,
  ARTIFACT_RUNTIME_VERSION_UNAVAILABLE,
  PRIVATE_STATE_EXPORT_FAILED,
  SIGNING_KEY_EXPORT_FAILED,
  PRIVATE_STATE_IMPORT_FAILED,
  EXPORT_DECRYPTION_FAILED,
  INVALID_EXPORT_FORMAT,
  IMPORT_CONFLICT,
  PRIVATE_STATE_DECRYPTION_FAILED,
  PRIVATE_STATE_STORAGE_FAILED,
  PRIVATE_STATE_LIMIT_EXCEEDED,
  ZK_ARTIFACT_FETCH_FAILED,
  ZK_ARTIFACT_NOT_SERVED,
  PROOF_SERVER_UNAVAILABLE,
  PROOF_SERVER_REFUSED,
  UNUSABLE_ERA_ENTRY,
  FOREIGN_LEDGER_TRANSACTION,
  INVALID_TRANSACTION_HANDLE,
  TRANSACTION_ERA_MISMATCH,
  INVALID_LEDGER_STATE,
  LEDGER_STATE_DECODER_MISSING,
  LEDGER_STATE_DECODE_FAILED
} = PROVIDER_ERROR_CODES;

/**
 * Thrown when the provider behind one of the three transaction methods does
 * not serve the ledger era a transaction needs.
 *
 * Raised in two places, with the same remedy — wire a provider that serves the
 * era:
 *
 * - by `assertProvidersSupportEra`, from the providers' `supportedEras` alone,
 *   before an operation starts, so a transaction the set cannot carry end to
 *   end is refused before its proof is paid for;
 * - by a provider built with a `create*FromHandlers` factory, when a handle
 *   arrives in an era it has no handler for. A declaration is a claim nothing
 *   verifies, so the method refuses again before doing any work.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class ProviderEraUnsupportedError extends MidnightJsError {
  readonly code = PROVIDER_ERA_UNSUPPORTED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PROVIDER_ERA_UNSUPPORTED];

  /**
   * @param method The method whose provider does not declare `era`. Reported
   *               in pipeline order, so this names the first method the
   *               operation would have reached.
   * @param era The ledger era the operation needs every provider to serve.
   * @param declared What that provider does declare. An empty list is the
   *                 honest reading of a provider carrying no declaration at all
   *                 — which a JavaScript caller, or a consumer built against an
   *                 older `midnight-js-types`, really can supply.
   */
  constructor(
    readonly method: TransactionMethod,
    readonly era: string,
    readonly declared: readonly string[]
  ) {
    super(
      `This operation runs on the ${era} ledger era, but the provider wired to ${method} declares that it serves ` +
        `${declared.length === 0 ? 'no era at all' : declared.join(', ')}. ` +
        (method === 'proveTx'
          ? `Refused before any proof was requested, because a transaction this set cannot carry end to end is not ` +
            `worth proving. `
          : `Refused before ${method} did any work. `) +
        `Wire a provider that serves ${era} for ${method}, or run this operation on an era the ` +
        `whole set serves.`
    );
    this.name = 'ProviderEraUnsupportedError';
  }
}

/**
 * The shape a provider factory needs for each era entry — the value passed
 * under an era key such as `v8`: a `handler` function
 * for the `…FromHandlers` factories, a `proving-provider` with callable
 * `check` and `prove` for `createProofProviderFromProvingProviders`.
 */
export type EraEntryShape = 'handler' | 'proving-provider';

const ERA_ENTRY_SHAPE_DESCRIPTIONS: Readonly<Record<EraEntryShape, string>> = {
  handler: 'a function',
  'proving-provider': "a ProvingProvider with callable 'check' and 'prove'"
};

/**
 * Thrown by a provider factory given an era entry that is neither `undefined`
 * nor the {@link EraEntryShape} the factory needs. Raised at construction, so
 * `supportedEras` never claims an era no entry can serve.
 *
 * The types rule these entries out, so it is reachable only from JavaScript or
 * across an untyped boundary. The factory checks shape only: an entry built for
 * the wrong era, such as a `ProvingProvider` with the other era's key
 * material, still passes.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class UnusableEraEntryError extends MidnightJsError {
  readonly code = UNUSABLE_ERA_ENTRY;
  readonly category = PROVIDER_ERROR_CATEGORIES[UNUSABLE_ERA_ENTRY];

  /**
   * @param method The provider method the rejected entry would have served.
   * @param era The ledger era whose entry was rejected.
   * @param expected The shape the factory needs for that entry.
   * @param received What was passed instead, for the message only: for example
   *                 `'null'`, `'a class'`, `'an instance of Map'`, or
   *                 `"an object without callable 'prove'"`.
   */
  constructor(
    readonly method: TransactionMethod,
    readonly era: LedgerVersion,
    readonly expected: EraEntryShape,
    readonly received: string
  ) {
    const shape = ERA_ENTRY_SHAPE_DESCRIPTIONS[expected];
    super(
      `Cannot use the ${era} entry passed for ${method}: expected ${shape}, got ${received}. ` +
        `Pass ${shape} as ${era}, or set ${era} to undefined if this provider does not serve that era.`
    );
    this.name = 'UnusableEraEntryError';
  }
}

/**
 * Why `LedgerTransaction.seal` refused a transaction object: it belongs to
 * another WASM instance of the ledger package, or the framework has not loaded
 * its v8 ledger yet, so no v8 object can be judged.
 */
export type ForeignLedgerTransactionReason = Exclude<FrameworkInstanceCheck, 'own' | 'not-a-transaction'>;

const FOREIGN_LEDGER_TRANSACTION_REMEDIES: Readonly<Record<ForeignLedgerTransactionReason, (era: LedgerVersion) => string>> = {
  'foreign-instance': (era) =>
    `The ${era} transaction is not an object of the ledger copy this framework loaded: it was built by a ` +
    `duplicate install of the ledger package (another WASM instance), or it is not a ledger transaction at all. ` +
    `Build it with the ledger module the framework uses, and make sure only one copy of that ledger package is installed.`,
  'ledger8-not-loaded': (era) =>
    `A ${era} transaction cannot be checked before the framework has loaded its v8 ledger. ` +
    `Call and await loadLedger8Protocol() from @midnight-ntwrk/midnight-js-protocol first, and build the ` +
    `transaction with the module it returns. Import it from the same copy of @midnight-ntwrk/midnight-js-protocol ` +
    `that @midnight-ntwrk/midnight-js-types depends on: a separately installed version has its own load flag, so ` +
    `loading it does not load the framework's v8 ledger.`
};

/**
 * Thrown by `LedgerTransaction.seal` when the transaction object is not one of
 * the ledger copy this framework loaded for its era.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class ForeignLedgerTransactionError extends MidnightJsError {
  readonly code = FOREIGN_LEDGER_TRANSACTION;
  readonly category = PROVIDER_ERROR_CATEGORIES[FOREIGN_LEDGER_TRANSACTION];

  /**
   * @param era The era the object was sealed as.
   * @param reason Why the object was refused.
   * @param method The provider method whose answer was sealed, or
   *               `LedgerTransaction.seal` when it was sealed directly.
   */
  constructor(
    readonly era: LedgerVersion,
    readonly reason: ForeignLedgerTransactionReason,
    readonly method: TransactionHandleMethod = 'LedgerTransaction.seal'
  ) {
    super(`${method} cannot seal a ${era} transaction. ${FOREIGN_LEDGER_TRANSACTION_REMEDIES[reason](era)}`);
    this.name = 'ForeignLedgerTransactionError';
  }
}

/**
 * Why a value was refused as a transaction handle, or as the object to seal
 * into one:
 *
 * - `'not-a-handle'`: the value is not a handle made by `LedgerTransaction.seal`.
 * - `'wrong-stage'`: the handle is at another stage than the method takes.
 * - `'invalid-stage'`: the stage to seal at is not a transaction stage.
 * - `'not-a-transaction'`: the value to seal is not a ledger transaction object.
 * - `'stage-mismatch'`: the object to seal is at another stage than the one it
 *   is sealed as.
 */
export type InvalidTransactionHandleReason =
  | 'not-a-handle'
  | 'wrong-stage'
  | 'invalid-stage'
  | 'not-a-transaction'
  | 'stage-mismatch';

/** The methods that check transaction handles, named in a refusal. */
export type TransactionHandleMethod = TransactionMethod | ReadMethod | 'LedgerTransaction.seal' | 'LedgerTransaction.unwrap';

const INVALID_TRANSACTION_HANDLE_REMEDIES: Readonly<Record<InvalidTransactionHandleReason, string>> = {
  'not-a-handle':
    'Pass the handle made by LedgerTransaction.seal itself. A copy is not a handle: structuredClone, ' +
    'postMessage, JSON and object spread all drop it, so pass the original, or pass handle.serialize() and seal ' +
    'the bytes again after deserializeTransactionAtStage. A handle that is passed on unchanged and still refused ' +
    'was most likely sealed by a duplicate midnight-js-types install: make sure only one copy of ' +
    '@midnight-ntwrk/midnight-js-types is installed.',
  'wrong-stage': 'Pass the handle at the stage this method takes.',
  'invalid-stage': 'Use one of the transaction stages: Unproven, Unbound, Finalized.',
  'not-a-transaction':
    'Pass a ledger transaction object. Serialized bytes are not one: decode them with deserializeTransactionAtStage ' +
    'from @midnight-ntwrk/midnight-js-protocol/transaction, taking the era and stage from the request.',
  'stage-mismatch':
    'Seal the object at the stage it is at: a proveTx answer is Unbound, and only bind() makes it Finalized.'
};

/**
 * Thrown when a value reaching a method that takes a transaction handle is not
 * a usable one, or when `LedgerTransaction.seal` is given a value it cannot
 * seal at the stage it is asked for.
 *
 * The types rule these values out, so it is reachable only from JavaScript,
 * across an untyped boundary, or from a second copy of this package.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class InvalidTransactionHandleError extends MidnightJsError {
  readonly code = INVALID_TRANSACTION_HANDLE;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_TRANSACTION_HANDLE];

  /**
   * @param method The method the value reached.
   * @param reason Why the value was refused.
   * @param detail What arrived, for the message only, for example `'null'` or
   *               `'an object'`. Never the value's contents.
   */
  constructor(
    readonly method: TransactionHandleMethod,
    readonly reason: InvalidTransactionHandleReason,
    readonly detail: string
  ) {
    super(`${method} refused a transaction (${reason}: ${detail}). ${INVALID_TRANSACTION_HANDLE_REMEDIES[reason]}`);
    this.name = 'InvalidTransactionHandleError';
  }
}

/**
 * Thrown by `LedgerTransaction.unwrap` when the handle carries a transaction of
 * another era than the one asked for.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from
 * `@midnight-ntwrk/midnight-js-utils`.
 */
export class TransactionEraMismatchError extends MidnightJsError {
  readonly code = TRANSACTION_ERA_MISMATCH;
  readonly category = PROVIDER_ERROR_CATEGORIES[TRANSACTION_ERA_MISMATCH];

  /**
   * @param expected The era the caller asked for.
   * @param actual The era the handle carries.
   */
  constructor(
    readonly expected: LedgerVersion,
    readonly actual: LedgerVersion
  ) {
    super(
      `Expected a ${expected} transaction, but the handle carries a ${actual} one. ` +
        `Read the handle's era before unwrapping it, and route it to the code that serves that era.`
    );
    this.name = 'TransactionEraMismatchError';
  }
}

/**
 * Why {@link InvalidLedgerStateError} refused a value.
 *
 * - `'unknown-kind'`: the kind is not a {@link LedgerStateKind}.
 * - `'not-bytes'`: the value is not a `Uint8Array`.
 * - `'tag-mismatch'`: the bytes do not start with the tag the ledger of that era writes for that
 *   kind.
 * - `'not-from-bytes'`: the value was constructed without `LedgerState.fromBytes`.
 */
export type InvalidLedgerStateReason = 'unknown-kind' | 'not-bytes' | 'tag-mismatch' | 'not-from-bytes';

const INVALID_LEDGER_STATE_MESSAGES: Readonly<
  Record<InvalidLedgerStateReason, (kind: string, era: string) => string>
> = {
  'unknown-kind': (kind) =>
    `Cannot build a LedgerState of kind '${kind}'. Use one of ${LEDGER_STATE_KINDS.map((known) => `'${known}'`).join(', ')}.`,
  'not-bytes': (kind) => `Cannot build a ${kind} LedgerState: the value is not a Uint8Array.`,
  'tag-mismatch': (kind, era) =>
    `The bytes are not a ${kind} written by the ${era} ledger. ` +
    `Pass the era of the ledger that wrote them, and check they hold a ${kind}.`,
  'not-from-bytes': () => 'A LedgerState can only be made by LedgerState.fromBytes.'
};

/**
 * Thrown by `LedgerState.fromBytes` when the bytes are not a value of the given kind written by the
 * ledger of the given era, and by the `LedgerState` constructor when it is called without
 * `LedgerState.fromBytes`. The bytes are never quoted in the message.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.
 */
export class InvalidLedgerStateError extends MidnightJsError {
  readonly code = INVALID_LEDGER_STATE;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_LEDGER_STATE];

  /**
   * @param kind The kind the caller named, or `undefined` when the constructor was called directly.
   * @param era The ledger era the caller named, or `undefined` when the constructor was called
   *   directly.
   * @param reason Why the value was refused.
   */
  constructor(
    readonly kind: string | undefined,
    readonly era: LedgerVersion | undefined,
    readonly reason: InvalidLedgerStateReason
  ) {
    super(INVALID_LEDGER_STATE_MESSAGES[reason](String(kind), String(era)));
    this.name = 'InvalidLedgerStateError';
  }
}

const DECODER_SOURCE: Readonly<Record<LedgerStateKind, Readonly<Record<LedgerVersion, string>>>> = {
  ContractState: {
    v8: '`ContractState` from a ledger 8 `@midnight-ntwrk/compact-runtime` (0.16), such as the copy a ledger 8 contract was compiled against',
    v9: '`ContractState` from the `@midnight-ntwrk/compact-runtime` copy your contract was compiled against'
  },
  LedgerParameters: {
    v8: '`LedgerParameters` from `@midnightntwrk/ledger-v8`',
    v9: '`LedgerParameters` from `@midnightntwrk/ledger-v9`'
  },
  ZswapChainState: {
    v8: '`ZswapChainState` from `@midnightntwrk/ledger-v8`',
    v9: '`ZswapChainState` from `@midnightntwrk/ledger-v9`'
  }
};

/**
 * Thrown by `LedgerState.deserialize` when the decoders passed in have none for the era of the
 * value. The message names the class to import.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.
 */
export class LedgerStateDecoderMissingError extends MidnightJsError {
  readonly code = LEDGER_STATE_DECODER_MISSING;
  readonly category = PROVIDER_ERROR_CATEGORIES[LEDGER_STATE_DECODER_MISSING];

  /**
   * @param kind The kind of the value.
   * @param era The ledger era that wrote the value.
   */
  constructor(
    readonly kind: LedgerStateKind,
    readonly era: LedgerVersion
  ) {
    super(
      `No decoder for a ${kind} written by the ${era} ledger. ` +
        `Pass { ${era}: ${kind} }, with ${DECODER_SOURCE[kind][era]}.`
    );
    this.name = 'LedgerStateDecoderMissingError';
  }
}

/**
 * Thrown by `LedgerState.deserialize` when the decoder for the era of the value throws an error
 * that is not a `MidnightJsError`. The bytes carry the right tag, so either the bytes after the tag
 * are corrupt or the decoder is the wrong one (it decodes another kind, or comes from a runtime that
 * cannot read this era). Categorised `INTEGRITY`: the data and its decoder do not match. The
 * decoder's failure is the `cause`.
 *
 * Catch it via its stable `code`, using `hasErrorCode` from `@midnight-ntwrk/midnight-js-utils`.
 */
export class LedgerStateDecodeFailedError extends MidnightJsError {
  readonly code = LEDGER_STATE_DECODE_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[LEDGER_STATE_DECODE_FAILED];

  /**
   * @param kind The kind of the value.
   * @param era The ledger era that wrote the value.
   * @param options Carries the decoder's failure as `cause`.
   */
  constructor(
    readonly kind: LedgerStateKind,
    readonly era: LedgerVersion,
    options: { readonly cause: unknown }
  ) {
    super(
      `The decoder passed for ${era} could not decode a ${kind} written by the ${era} ledger. ` +
        `Check that you pass { ${era}: ${kind} }, with ${DECODER_SOURCE[kind][era]}; ` +
        `if you do, the bytes are corrupt.`,
      options
    );
    this.name = 'LedgerStateDecodeFailedError';
  }
}

/**
 * An error describing an invalid protocol scheme.
 */
export class InvalidProtocolSchemeError extends MidnightJsError {
  readonly code = INVALID_PROTOCOL_SCHEME;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_PROTOCOL_SCHEME];

  /**
   * @param invalidScheme The invalid scheme.
   * @param allowableSchemes The valid schemes that are allowed.
   */
  constructor(
    public readonly invalidScheme: string,
    public readonly allowableSchemes: string[]
  ) {
    super(`Invalid protocol scheme: '${invalidScheme}'. Allowable schemes are one of: ${allowableSchemes.join(',')}`);
  }
}

/**
 * An error indicating that a {@link ZKConfigProvider} cannot report which `compact-runtime` its
 * artifact set was compiled against.
 *
 * The retained-era pipeline establishes an artifact's era from that declared version, so a provider
 * that cannot serve it cannot be used with retained-era artifacts. Every provider this framework
 * ships can serve it; a provider written outside it may not, which is the case named here.
 *
 * Raised rather than answered with a default, because every default would be a guess about which
 * ledger era a caller's artifacts belong to.
 */
export class ArtifactRuntimeVersionUnavailableError extends MidnightJsError {
  readonly code = ARTIFACT_RUNTIME_VERSION_UNAVAILABLE;
  readonly category = PROVIDER_ERROR_CATEGORIES[ARTIFACT_RUNTIME_VERSION_UNAVAILABLE];

  /**
   * @param providerName The runtime name of the provider that could not answer.
   */
  constructor(public readonly providerName: string) {
    super(
      `The ZK config provider '${providerName}' does not report the compact-runtime version its ` +
        `artifacts were compiled against, so the era of those artifacts cannot be established. ` +
        `Override getArtifactRuntimeVersion() on it to read the runtime-version from the ` +
        `contract-info.json the compiler emits beside the keys, or use a provider that already does.`
    );
    this.name = 'ArtifactRuntimeVersionUnavailableError';
  }
}

/**
 * An error thrown when exporting private states fails.
 */
export class PrivateStateExportError extends MidnightJsError {
  readonly code = PRIVATE_STATE_EXPORT_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_EXPORT_FAILED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateExportError';
  }
}

/**
 * The reasons a private state cannot be stored.
 *
 * Each names what storage would do to the member rather than what the member is,
 * so the remedy follows from the reason.
 */
export type PrivateStateSerializationFailure =
  | 'function'
  | 'symbol'
  | 'symbol_keyed_property'
  | 'class_instance'
  | 'binary_buffer'
  | 'invalid_date'
  | 'sparse_array'
  | 'dropped_property';

const SERIALIZATION_FAILURE_DESCRIPTIONS: Readonly<Record<PrivateStateSerializationFailure, string>> =
  Object.freeze({
    function: 'is a function, and a live function cannot be stored',
    symbol: 'is a symbol, which storage discards',
    symbol_keyed_property: 'has symbol-keyed properties, which storage discards',
    class_instance:
      'is an instance of a type storage cannot restore: it would be read back without its prototype, ' +
      'and so without its methods',
    binary_buffer:
      'is an ArrayBuffer or a DataView, which storage writes as an empty object; ' +
      'convert it first, with Buffer.from(buffer) or new Uint8Array(buffer)',
    invalid_date: 'is an invalid Date, which storage writes as null',
    sparse_array: 'is a sparse array, whose holes storage writes as null',
    dropped_property: 'is an own property that storage does not persist'
  });

/**
 * The value of {@link PrivateStateSerializationError.path} when the private state
 * itself, rather than a member of it, is what cannot be stored.
 */
export const PRIVATE_STATE_ROOT_PATH = '<root>';

/**
 * An error thrown when a private state holds something that cannot survive being
 * stored, raised by an implementation of {@link PrivateStateProvider.set} before
 * anything is written.
 *
 * Private state must be plain data. The exact set of values a given implementation
 * stores faithfully depends on how it serializes, so that set is documented by the
 * implementation rather than here.
 */
export class PrivateStateSerializationError extends MidnightJsError {
  readonly code = PRIVATE_STATE_NOT_SERIALIZABLE;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_NOT_SERIALIZABLE];

  /**
   * @param path Where the offending value sits inside the private state, as a
   *             property path (`registry.findPathForLeaf`, `witnesses[1]`), or
   *             {@link PRIVATE_STATE_ROOT_PATH} for the private state itself.
   * @param reason What storage would do to it.
   * @param privateStateId The state being written, when the caller knows it.
   */
  constructor(
    public readonly path: string,
    public readonly reason: PrivateStateSerializationFailure,
    public readonly privateStateId?: string
  ) {
    super(
      `Private state at '${path}' ${SERIALIZATION_FAILURE_DESCRIPTIONS[reason]}. ` +
        (privateStateId === undefined ? '' : `Writing private state '${privateStateId}'. `) +
        'Private state must be plain data; nothing was written.'
    );
    this.name = 'PrivateStateSerializationError';
  }
}

/**
 * An error thrown when exporting signing keys fails.
 */
export class SigningKeyExportError extends MidnightJsError {
  readonly code = SIGNING_KEY_EXPORT_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[SIGNING_KEY_EXPORT_FAILED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SigningKeyExportError';
  }
}

/**
 * Cause types for private state import errors.
 */
export type PrivateStateImportErrorCause =
  | 'decryption_failed'
  | 'invalid_format'
  | 'conflict'
  | 'unknown';

type PrivateStateImportErrorCode =
  | typeof PRIVATE_STATE_IMPORT_FAILED
  | typeof EXPORT_DECRYPTION_FAILED
  | typeof INVALID_EXPORT_FORMAT
  | typeof IMPORT_CONFLICT;

/**
 * Base error thrown when importing private states fails.
 */
export class PrivateStateImportError extends MidnightJsError {
  readonly code: PrivateStateImportErrorCode = PRIVATE_STATE_IMPORT_FAILED;
  readonly category: MidnightJsErrorCategory = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_IMPORT_FAILED];

  constructor(
    message: string,
    public readonly cause?: PrivateStateImportErrorCause
  ) {
    super(message);
    this.name = 'PrivateStateImportError';
  }
}

/**
 * Error thrown when decryption of export data fails.
 * This could be due to wrong password, corrupted data, or tampered content.
 * The specific cause is intentionally not disclosed to prevent oracle attacks.
 */
export class ExportDecryptionError extends PrivateStateImportError {
  readonly code = EXPORT_DECRYPTION_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[EXPORT_DECRYPTION_FAILED];

  constructor() {
    super(
      'Failed to decrypt export data. The password may be incorrect or the data may be corrupted.',
      'decryption_failed'
    );
    this.name = 'ExportDecryptionError';
  }
}

/**
 * Error thrown when the export data format is invalid.
 */
export class InvalidExportFormatError extends PrivateStateImportError {
  readonly code = INVALID_EXPORT_FORMAT;
  readonly category = PROVIDER_ERROR_CATEGORIES[INVALID_EXPORT_FORMAT];

  constructor(message = 'Invalid export format') {
    super(message, 'invalid_format');
    this.name = 'InvalidExportFormatError';
  }
}

/**
 * Error thrown when import conflicts with existing data and conflictStrategy is 'error'.
 */
export class ImportConflictError extends PrivateStateImportError {
  readonly code = IMPORT_CONFLICT;
  readonly category = PROVIDER_ERROR_CATEGORIES[IMPORT_CONFLICT];

  constructor(
    public readonly conflictCount: number,
    entityName = 'private state'
  ) {
    super(
      `Import conflicts with ${conflictCount} existing ${entityName}${conflictCount === 1 ? '' : 's'}`,
      'conflict'
    );
    this.name = 'ImportConflictError';
  }
}

const isTransientHttpStatus = (status: number | undefined): boolean =>
  status === undefined || status >= 500 || status === 408 || status === 429;

/**
 * A ZK artifact could not be fetched. `status` is the HTTP status, absent when the request itself failed.
 * A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.
 */
export class ZkArtifactFetchError extends MidnightJsError {
  readonly code: typeof ZK_ARTIFACT_FETCH_FAILED | typeof ZK_ARTIFACT_NOT_SERVED;
  readonly category: MidnightJsErrorCategory;

  /**
   * @param status The HTTP status, absent when the request itself failed.
   * @param options `notServed` marks an answer that is not the artifact although its status is 2xx
   *   (an HTML fallback page).
   */
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown; notServed?: boolean }
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ZkArtifactFetchError';
    this.code =
      options?.notServed !== true && isTransientHttpStatus(status)
        ? ZK_ARTIFACT_FETCH_FAILED
        : ZK_ARTIFACT_NOT_SERVED;
    this.category = PROVIDER_ERROR_CATEGORIES[this.code];
  }
}

/**
 * The proof server could not be reached or did not accept the request.
 * A network failure, HTTP 408, 429 or 5xx is TRANSIENT; any other status is ENVIRONMENT.
 */
export class ProofServerError extends MidnightJsError {
  readonly code: typeof PROOF_SERVER_UNAVAILABLE | typeof PROOF_SERVER_REFUSED;
  readonly category: MidnightJsErrorCategory;

  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ProofServerError';
    this.code = isTransientHttpStatus(status) ? PROOF_SERVER_UNAVAILABLE : PROOF_SERVER_REFUSED;
    this.category = PROVIDER_ERROR_CATEGORIES[this.code];
  }
}

/**
 * Why stored private state could not be decrypted: `wrong-key` when it was encrypted with a different key
 * or modified (the two cannot be told apart), `malformed` when it is not readable encrypted data at all.
 */
export type PrivateStateDecryptionReason = 'wrong-key' | 'malformed';

/** Stored private state could not be decrypted. */
export class PrivateStateDecryptionError extends MidnightJsError {
  readonly code = PRIVATE_STATE_DECRYPTION_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_DECRYPTION_FAILED];

  constructor(
    message: string,
    readonly reason: PrivateStateDecryptionReason,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'PrivateStateDecryptionError';
  }
}

/**
 * Reading or writing the private-state store failed. `cause` is the failure; `closeError` is set when
 * closing the database afterwards failed too.
 */
export class PrivateStateStorageError extends MidnightJsError {
  readonly code = PRIVATE_STATE_STORAGE_FAILED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_STORAGE_FAILED];
  readonly closeError?: unknown;

  constructor(message: string, options?: ErrorOptions & { readonly closeError?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PrivateStateStorageError';
    if (options?.closeError !== undefined) {
      this.closeError = options.closeError;
    }
  }
}

/** More private-state entries than the configured maximum were processed. */
export class PrivateStateLimitExceededError extends MidnightJsError {
  readonly code = PRIVATE_STATE_LIMIT_EXCEEDED;
  readonly category = PROVIDER_ERROR_CATEGORIES[PRIVATE_STATE_LIMIT_EXCEEDED];

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrivateStateLimitExceededError';
  }
}
