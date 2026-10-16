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

/**
 * Prove, balance and submit, once per PAYLOAD era: the only place in this package that calls the
 * three transaction methods.
 *
 * Named after the era of the payload that crosses the providers, never after the contract or the
 * pipeline that built it. A contract compiled for the v8 toolchain still crosses as a v9 payload on
 * a post-fork head.
 *
 * Every rejection from a provider becomes {@link ProviderFailedError}, with the provider's own
 * failure sanitized onto `cause`, whichever era and whichever entry point. The callers own the
 * preconditions: the provider-era and config checks run before these, once.
 */

import type { Transaction, UnprovenTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightConfig,
  MidnightProvider,
  ProofProvider,
  ProviderMethod,
  WalletProvider
} from '@midnight-ntwrk/midnight-js-types';
import { hasErrorCode, intentTtl } from '@midnight-ntwrk/midnight-js-utils';

import { ProviderFailedError } from '../errors';
import { unwrapLedger8ProviderResult, unwrapLedger9ProviderResult } from './era';

declare const __DEBUG__: boolean;

/** The circuit, or circuits, a transaction runs, when known. Named in every refusal. */
type CircuitIds = string | readonly string[] | undefined;

/** The providers the three transaction methods are called on. */
export interface PayloadSubmitProviders {
  readonly proofProvider: ProofProvider;
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
  readonly config: MidnightConfig;
}

/**
 * The three shapes transaction and witness material takes inside an error
 * message: a long run of hex, a long run of base64 or base64url, or a long list
 * of decimal byte values.
 *
 * Matched by SHAPE, not by any provider's message format. Every floor and every
 * lookahead here is load-bearing: each one keeps a high-value diagnostic — a
 * URL path, a class name — from being eaten as if it were a payload. DO NOT
 * widen or "simplify" an alternative without reading why its floor is where it
 * is. A secret shorter than 12 bytes is NOT redacted; see
 * {@link ProviderFailedError} for why this is best effort, not a guarantee.
 *
 * @see {@link KeepStatePipeline} for each alternative's floor, what it catches
 * and what it misses.
 */
const PAYLOAD_SHAPED = new RegExp(
  [
    '[0-9a-fA-F]{24,}',
    '(?=[A-Za-z0-9+/_-]*[a-z])(?=[A-Za-z0-9+/_-]*[A-Z])(?=[A-Za-z0-9+/_-]*[0-9])[A-Za-z0-9+/_-]{40,}={0,2}',
    '(?:\\d{1,3}\\s*,\\s*){12,}\\d{1,3}'
  ].join('|'),
  'g'
);
const REDACTED = '[redacted]';

/**
 * How much of a provider's message is copied onto the sanitized cause.
 *
 * An unbounded copy ends up in `error.stack` and from there in every log sink
 * the caller has. A provider that renders a whole transaction in a shape no
 * alternative above matches would otherwise put all of it there.
 */
const MAX_PROVIDER_MESSAGE_LENGTH = 2_000;

/** How many links of a `cause` chain are rebuilt before the walk stops. */
const MAX_PROVIDER_CAUSE_DEPTH = 5;

/** How many members of an `AggregateError` are rebuilt. */
const MAX_PROVIDER_AGGREGATE = 5;

/**
 * Whether a value is an `Error`, including one minted in another realm.
 *
 * `instanceof` is realm-sensitive: an `Error` from a worker, a `vm` context or
 * a WASM module fails it and would be reported as `object: ...`, losing both
 * the class name and the message.
 *
 * @param value The rejection to classify.
 * @returns `true` if the value is an `Error` from any realm.
 */
const isErrorLike = (value: unknown): value is Error =>
  value instanceof Error || Object.prototype.toString.call(value) === '[object Error]';

/**
 * The class name to report for a rejection.
 *
 * `name` is only correct when a subclass assigns it — this repo's own errors do,
 * third-party provider errors routinely do not, and for those `name` reads
 * `'Error'`. The constructor name is the fallback, so a
 * `ProofServerHttpError` is still named one.
 *
 * @param cause The rejection to name.
 * @returns The most specific class name available, or the `typeof` for a
 * non-error rejection.
 */
const describeCauseKind = (cause: unknown): string => {
  if (!isErrorLike(cause)) {
    return typeof cause;
  }
  const constructorName = cause.constructor?.name;
  return cause.name !== 'Error' || constructorName === undefined ? cause.name : constructorName;
};

/**
 * Renders a rejection as text without being able to throw.
 *
 * `String(value)` throws for a null-prototype object and for anything with a
 * throwing `toString` or `Symbol.toPrimitive` — shapes that RPC bridges and
 * WASM glue do produce. Unguarded, that `TypeError` would propagate FROM THE
 * CATCH BLOCK and replace the provider's rejection entirely, losing the method,
 * the circuit and the original value.
 *
 * @param cause The rejection to render.
 * @returns Its message, its string form, or a placeholder naming its shape.
 */
const renderProviderCause = (cause: unknown): string => {
  try {
    return isErrorLike(cause) ? cause.message : String(cause);
  } catch {
    return `<unrenderable ${Object.prototype.toString.call(cause)}>`;
  }
};

/** Redacts payload-shaped runs and caps the length of a copied message. */
const redact = (text: string): string => {
  const redacted = text.replace(PAYLOAD_SHAPED, REDACTED);
  return redacted.length <= MAX_PROVIDER_MESSAGE_LENGTH
    ? redacted
    : `${redacted.slice(0, MAX_PROVIDER_MESSAGE_LENGTH)}... [truncated]`;
};

/**
 * Rebuilds an external failure as a plain {@link Error} carrying its class
 * name, a redacted message, a redacted stack and a redacted `cause` chain.
 *
 * The provider's ENUMERABLE PROPERTIES are the one thing DROPPED. Everything
 * else — class name, message, stack and `cause` chain — is kept REDACTED.
 *
 * @param cause Whatever the provider rejected with — `unknown`, because a
 * rejection is not obliged to be an `Error`.
 * @param depth How many links have already been rebuilt.
 * @returns A plain error safe to hand to a logger.
 * @see {@link KeepStatePipeline} for why that split is where it is, and why
 * neither the stack nor the chain may be truncated.
 */
const sanitizeProviderCause = (cause: unknown, depth = 0): Error => {
  const nested = isErrorLike(cause) ? (cause as Error).cause : undefined;
  // eslint-disable-next-line no-restricted-syntax -- a redacted copy carried as a cause, never thrown
  const rebuilt = new Error(
    `${describeCauseKind(cause)}: ${redact(renderProviderCause(cause))}`,
    depth < MAX_PROVIDER_CAUSE_DEPTH && nested !== undefined
      ? { cause: sanitizeProviderCause(nested, depth + 1) }
      : undefined
  );
  if (isErrorLike(cause) && typeof cause.stack === 'string') {
    rebuilt.stack = redact(cause.stack);
  }
  // `AggregateError.errors` is where `fetch` reports the per-address failures
  // behind a connection error, and it is an own property, so it does not travel
  // with the message or the cause chain.
  if (cause instanceof AggregateError && depth < MAX_PROVIDER_CAUSE_DEPTH) {
    Object.defineProperty(rebuilt, 'errors', {
      value: cause.errors
        .slice(0, MAX_PROVIDER_AGGREGATE)
        .map((member: unknown) => sanitizeProviderCause(member, depth + 1)),
      enumerable: true
    });
  }
  return rebuilt;
};

/**
 * Runs one provider method call, converting a rejection from the provider into
 * {@link ProviderFailedError} with the failure sanitized onto `cause`.
 *
 * This framework's OWN coded errors pass through UNCHANGED when they carry no
 * `cause`: a caller narrowing on `Ledger8PayloadUnsupportedError` or
 * {@link EraInvariantViolationError} has to keep seeing them. One that carries a
 * `cause` -- a transport failure under `ProofServerError`, say -- holds external
 * material and is sanitized like any other rejection. `hasErrorCode` is the
 * registry-backed test, so a foreign coded error is always sanitized.
 *
 * @param method The provider method being called.
 * @param circuitId The circuit this flow is running.
 * @param call The provider call to run.
 * @returns Whatever the provider returned.
 * @throws ProviderFailedError for any external rejection.
 */
export const atProviderMethod = async <T>(
  method: ProviderMethod,
  circuitId: CircuitIds,
  call: () => Promise<T>
): Promise<T> => {
  try {
    return await call();
  } catch (cause) {
    if (hasErrorCode(cause) && cause.cause === undefined) {
      throw cause;
    }
    throw new ProviderFailedError(method, circuitId, sanitizeProviderCause(cause));
  }
};

/**
 * How the `submitTx` call is run.
 *
 * Taken as a parameter so a caller that can diagnose a fork crossing wraps the ONE call where a
 * crossing shows, and every other caller gets the same sanitizing wrapper by default. Two copies
 * of the submit step are how failure handling drifts apart.
 */
export type SubmitRunner = (call: () => Promise<string>) => Promise<string>;

const sanitizedSubmit =
  (circuitId: CircuitIds): SubmitRunner =>
  (call) =>
    atProviderMethod('submitTx', circuitId, call);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logTransaction = (circuitId: CircuitIds, tx: Transaction<any, any, any>): void => {
  if (process.env.MN_DEBUG?.toLowerCase() !== 'true') {
    return;
  }
  const circuitIds = Array.isArray(circuitId) ? circuitId.join('-') : circuitId ?? 'unknown-circuit';
  try {
    console.log(`Submit tx: ${circuitIds} : ${tx}`);
    console.log(`Serialized tx has length ${tx.serialize().length}`);
  } catch (error) {
    console.error('Failed to write debug transaction logs:', error instanceof Error ? error.message : String(error));
  }
};

/**
 * Proves, balances and submits a v9 transaction as `{ version: 'v9', tx }` payloads.
 *
 * @param providers The proof, wallet and submission providers.
 * @param unprovenTx The live v9 transaction.
 * @param circuitId The circuit, or circuits, named in any refusal.
 * @param submit How the `submitTx` call is run. Defaults to the sanitizing wrapper.
 * @returns The transaction id the network assigned.
 * @throws ProviderFailedError if a provider rejects.
 * @throws EraInvariantViolationError if a provider answers with a v8 payload.
 */
export const proveBalanceSubmitLedger9Payload = async (
  providers: PayloadSubmitProviders,
  unprovenTx: UnprovenTransaction,
  circuitId: CircuitIds,
  submit: SubmitRunner = sanitizedSubmit(circuitId)
): Promise<string> => {
  const proven = unwrapLedger9ProviderResult(
    await atProviderMethod('proveTx', circuitId, () => providers.proofProvider.proveTx({ version: 'v9', tx: unprovenTx })),
    'proveTx',
    circuitId
  );
  const balanceTtl = intentTtl(providers.config);
  const balanced = unwrapLedger9ProviderResult(
    await atProviderMethod('balanceTx', circuitId, () => providers.walletProvider.balanceTx({ version: 'v9', tx: proven }, balanceTtl)),
    'balanceTx',
    circuitId
  );
  if (__DEBUG__) {
    logTransaction(circuitId, balanced);
  }
  return submit(() => providers.midnightProvider.submitTx({ version: 'v9', tx: balanced }));
};

/**
 * Proves, balances and submits a v8 transaction as `{ version: 'v8', txBytes }` payloads.
 *
 * @param providers The proof, wallet and submission providers.
 * @param txBytes The serialized v8 transaction.
 * @param circuitId The circuit, or circuits, named in any refusal.
 * @param submit How the `submitTx` call is run. Defaults to the sanitizing wrapper.
 * @returns The transaction id the network assigned.
 * @throws ProviderFailedError if a provider rejects.
 * @throws EraInvariantViolationError if a provider answers with a v9 payload.
 */
export const proveBalanceSubmitLedger8Payload = async (
  providers: PayloadSubmitProviders,
  txBytes: Uint8Array,
  circuitId: CircuitIds,
  submit: SubmitRunner = sanitizedSubmit(circuitId)
): Promise<string> => {
  const proven = unwrapLedger8ProviderResult(
    await atProviderMethod('proveTx', circuitId, () => providers.proofProvider.proveTx({ version: 'v8', txBytes })),
    'proveTx',
    circuitId
  );
  const balanceTtl = intentTtl(providers.config);
  const balanced = unwrapLedger8ProviderResult(
    await atProviderMethod('balanceTx', circuitId, () => providers.walletProvider.balanceTx({ version: 'v8', txBytes: proven }, balanceTtl)),
    'balanceTx',
    circuitId
  );
  return submit(() => providers.midnightProvider.submitTx({ version: 'v8', txBytes: balanced }));
};
