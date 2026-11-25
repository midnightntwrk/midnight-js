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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { LEDGER_ERAS, type LedgerEra } from '@midnightntwrk/midnight-js-protocol/version';
import { type LoggerProvider } from '@midnightntwrk/midnight-js-types';
import { assertNever } from '@midnightntwrk/midnight-js-utils';

import { type Ledger9CallResult } from '../call';
import { type Ledger9ContractProviders } from '../contract-providers';
import { EraMismatchError } from '../errors';
import type * as Transaction from '../transaction';
import { type Ledger9FinalizedCallTxData } from '../tx-model';
import { type BreadcrumbSink, emitHeadResolution } from './breadcrumbs';
import {
  acquireHeadEra,
  type HeadEraReading,
  type HeadVersionSource,
  readHeadEra,
  type ResolvedOperationEra
} from './era';
import { LastCallResult, RecordCall, ScopeEra, Submit, TransactionContextImpl, TypeId } from './ledger9-scope';

export {
  assertNoOneTimeKeys,
  CacheStates,
  GetCurrentStatesForIdentity,
  LastCallResult,
  PinnedBlockHash,
  PublicStatesOf,
  RecordCall,
  recordScopedCall,
  ScopeEra,
  type ScopeStateCache,
  scopeStateCacheOf,
  Submit,
  TransactionContextImpl,
  TypeId,
  withOwnTransaction
} from './ledger9-scope';
export { assembleLedger9CallTx } from './ledger9-scope-build';
export {
  type AnyLedger9ExecutedCall,
  type CachedStateIdentity,
  contractAddressKey,
  type Ledger9CallAssembly,
  type Ledger9CallEncryption,
  type Ledger9ExecutedCall,
  type PinnedContractStates,
  type PrivateStateTarget,
  type ScopeContractStates
} from './ledger9-scope-states';

/**
 * Makes the ONE head read of a scope and breadcrumbs it, before any refusal.
 *
 * @internal
 */
export const readScopeHead = async (pdp: HeadVersionSource, logger?: BreadcrumbSink): Promise<HeadEraReading> => {
  const reading = await readHeadEra(pdp);
  emitHeadResolution(logger, reading, 'operation-start');
  return reading;
};

/**
 * The refusal of a scope function bound to one ledger era, run on a head of another.
 *
 * @internal
 */
export const scopeEraMismatch = (
  entryPoint: 'withLedger8ContractScopedTransaction' | 'withLedger9ContractScopedTransaction',
  head: LedgerEra
): EraMismatchError =>
  new EraMismatchError('scope-era-mismatch', { detail: `Function: ${entryPoint}. Network version: '${head}'.` });

/**
 * Resolves the ONE era reading a ledger 9 scope runs under, and refuses a head of another era.
 *
 * Read once, when the scope is created, and threaded down as a value. Nothing is
 * cached ACROSS scopes.
 *
 * KEEP THE REFUSAL HERE. It is the earliest point it can be made: before the
 * scope body runs, and before the head era's own runtime is acquired, so a
 * refused scope pays for no era load and its refusal cannot be replaced by one
 * failing.
 *
 * The reading is breadcrumbed BEFORE the refusal below, so a refused scope
 * still says in the log which head it was refused on.
 *
 * @internal
 * @param pdp The read surface, for the single head read.
 * @param logger The optional logger the network-version-read breadcrumb is written to.
 * @returns The era facts the scope runs under.
 * @throws EraMismatchError with reason `'scope-era-mismatch'` if the head is not on ledger 9.
 * @throws UnknownProtocolVersionError if the head integer is off the era timeline.
 * @see {@link ForkCrossedRemediation} for why both properties of this placement
 *      are load-bearing.
 */
export const resolveScopeEra = async (pdp: HeadVersionSource, logger?: BreadcrumbSink): Promise<ResolvedOperationEra> => {
  const reading = await readScopeHead(pdp, logger);
  // REFUSED FROM THE READING ALONE, before any era is acquired. Acquiring first would make every
  // refused scope pay to instantiate a ledger it is about to be refused on -- and would make the
  // refusal depend on that instantiation succeeding.
  // eslint-disable-next-line no-restricted-syntax -- fail-closed guard: a ledger 9 path refuses every other era
  if (reading.head !== 'v9') {
    throw scopeEraMismatch('withLedger9ContractScopedTransaction', reading.head);
  }

  return acquireHeadEra(reading);
};

/**
 * Whether `u` carries the scope brand `TypeId`, of either era.
 *
 * Type-parameterised so a caller can narrow to ITS OWN context type instead of
 * the widest one. Both parameters default to the widest, so supplying none
 * behaves exactly as before.
 *
 * @internal
 * @see {@link OverloadTyping} for why the internal call sites supply them.
 */
export const isTransactionContext = <
  C extends Contract.Any = Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
>(
  u: unknown
): u is Transaction.Ledger9TransactionContext<C, PCK> => typeof u === "object" && u != null && TypeId in u;

/** @internal The entry points that take a transaction context, named in a refusal. */
export type ScopeEntryPoint =
  | 'submitCallTx'
  | 'createUnprovenCallTx'
  | 'createLedger8UnprovenCallTx'
  | 'createLedger9UnprovenCallTx'
  | 'withContractScopedTransaction'
  | 'withLedger8ContractScopedTransaction'
  | 'withLedger9ContractScopedTransaction'
  | 'callTx';

/**
 * The era a value's scope brand names: `undefined` when it carries no brand, `'unrecognised'`
 * when the brand names no era this version knows. Read through `Symbol.for` keys, so a context
 * made by another copy of this package reads the same.
 *
 * @internal
 */
export const readScopeEra = (u: unknown): LedgerEra | 'unrecognised' | undefined => {
  if (!isTransactionContext(u)) {
    return undefined;
  }
  const era: unknown = Reflect.get(u, ScopeEra);
  return LEDGER_ERAS.find((known) => known === era) ?? 'unrecognised';
};

/** @internal Whether `u` is a scope context of the ledger 9 era. */
export const isLedger9ScopeContext = <
  C extends Contract.Any = Contract.Any,
  PCK extends Contract.ProvableCircuitId<C> = Contract.ProvableCircuitId<C>
>(
  u: unknown
// eslint-disable-next-line no-restricted-syntax -- a predicate for one named era: every other era answers false
): u is Transaction.Ledger9TransactionContext<C, PCK> => readScopeEra(u) === 'v9';

/** @internal The refusal of a value passed where a transaction context goes that is not one. */
export const notATransactionContext = (entryPoint: ScopeEntryPoint, value: unknown): InvalidArgumentError =>
  new InvalidArgumentError(
    `${entryPoint} was passed a third argument that is not a transaction context (received ` +
      `${value === null ? 'null' : typeof value}). A transaction context comes ` +
      `from the callback withContractScopedTransaction runs; pass that value, or omit the argument to ` +
      `run this call as its own transaction.`
  );

/** @internal The refusal of a scope context whose brand names no era this version knows. */
export const unrecognisedScopeContext = (entryPoint: ScopeEntryPoint): InvalidArgumentError =>
  new InvalidArgumentError(
    `${entryPoint} was passed a transaction context that names no ledger era this version of midnight-js ` +
      'knows. Pass the context withContractScopedTransaction hands to its function.'
  );

const LEDGER_NUMBER: Readonly<Record<LedgerEra, number>> = { v8: 8, v9: 9 };

/** @internal The refusal of a scope context made by another copy of this package that it cannot use. */
export const foreignScopeContext = (entryPoint: ScopeEntryPoint, era: LedgerEra): InvalidArgumentError =>
  new InvalidArgumentError(
    `${entryPoint} was passed a ledger ${LEDGER_NUMBER[era]} transaction context made by another copy of ` +
      '@midnightntwrk/midnight-js-contracts. Install one copy of the package.'
  );

/**
 * The ledger 9 scope a ledger 9 call was handed, or `undefined` when it was handed none.
 *
 * @internal
 * @throws EraMismatchError with reason `'ledger9-artifact-on-ledger8-network'` for a ledger 8 scope.
 * @throws InvalidArgumentError for a value that is not a scope context, or one of an unknown era, or a
 *         ledger 9 one made by a copy of this package that records its calls another way.
 */
export const ledger9ScopeOf = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  transactionContext: unknown,
  circuitId: string,
  entryPoint: ScopeEntryPoint
): Transaction.Ledger9TransactionContext<C, PCK> | undefined => {
  if (transactionContext === undefined) {
    return undefined;
  }
  if (isLedger9ScopeContext<C, PCK>(transactionContext)) {
    // A copy of this package that records calls another way has no member to record through.
    if (typeof Reflect.get(transactionContext, RecordCall) !== 'function') {
      throw foreignScopeContext(entryPoint, 'v9');
    }
    return transactionContext;
  }
  switch (readScopeEra(transactionContext)) {
    case 'v8':
      throw new EraMismatchError('ledger9-artifact-on-ledger8-network', { detail: `Circuit: '${circuitId}'.`, circuitId });
    case 'unrecognised':
      throw unrecognisedScopeContext(entryPoint);
    default:
      throw notATransactionContext(entryPoint, transactionContext);
  }
};

/**
 * Refuses a ledger 8 call that was handed something other than a ledger 8 scope of this copy of
 * midnight-js. No third argument passes.
 *
 * @internal
 * @param circuitId The circuit whose call was made.
 * @param transactionContext The value the caller passed. Typed as `unknown`: a JavaScript caller
 * can pass anything at all here.
 * @param entryPoint The public function the caller called, named in the refusal.
 * @throws EraMismatchError with reason `'ledger8-call-in-scope'` for a ledger 9 scope.
 * @throws InvalidArgumentError for anything else that was passed.
 * @see {@link ForkCrossedRemediation} for why a ledger 8 call cannot join a ledger 9 scope.
 */
export const assertScopeAdmitsLedger8Call = (
  circuitId: string,
  transactionContext: unknown,
  entryPoint: ScopeEntryPoint
): void => {
  switch (readScopeEra(transactionContext)) {
    case 'v9':
      throw new EraMismatchError('ledger8-call-in-scope', { detail: `Circuit: '${circuitId}'.`, circuitId });
    case 'v8':
      throw foreignScopeContext(entryPoint, 'v8');
    case 'unrecognised':
      throw unrecognisedScopeContext(entryPoint);
    default:
      if (transactionContext !== undefined) {
        throw notATransactionContext(entryPoint, transactionContext);
      }
  }
};

/**
 * Logs a failure of the root scope, naming the scope, and returns it unchanged for the caller to
 * rethrow. A nested scope logs nothing: its failure reaches the root, which logs it once.
 *
 * The error object itself is logged under `err`, so a pino logger records its stack and `cause`
 * chain, not only the one-line message.
 */
export const logScopeFailure = (
  providers: { readonly loggerProvider?: LoggerProvider } | undefined,
  outerTxCtx: unknown,
  txOptions: Transaction.ScopedTransactionOptions | undefined,
  phase: 'executing' | 'submitting',
  err: unknown
): unknown => {
  if (outerTxCtx === undefined) {
    const scopeName = txOptions?.scopeName ?? '<unnamed>';
    providers?.loggerProvider?.error?.call(
      providers.loggerProvider,
      { err, scopeName, phase },
      `Scoped transaction '${scopeName}' failed while ${phase}: ${String(err)}`
    );
  }
  return err;
};

/**
 * Refuses the options only a ledger 9 scope that builds and submits acts on, given to a scope that
 * would drop them, before any call runs: the caller would believe them in force. The message names
 * the options given, never their values.
 *
 * @internal
 * @param scope `'nested'` for a scope run inside another, `'ledger8'` for a scope on a ledger 8 head.
 * @throws InvalidArgumentError if `beforeSubmit` or `spentHere` is given.
 */
export const assertSubmitOptionsHonoured = (
  options: Transaction.ScopedTransactionOptions | undefined,
  scope: 'nested' | 'ledger8'
): void => {
  const given = (['beforeSubmit', 'spentHere'] as const).filter((name) => options?.[name] !== undefined);
  if (given.length === 0) {
    return;
  }
  const names = given.map((name) => `'${name}'`).join(' and ');
  throw new InvalidArgumentError(
    scope === 'nested'
      ? `${names} given to a scoped transaction nested in another. A nested scope builds and submits nothing: ` +
          `the scope it joins does, with its own options. Give ${names} to the outermost scope.`
      : `${names} given to a scoped transaction on a ledger 8 network, whose scope does not act on ` +
          `${given.length === 1 ? 'it' : 'them'}. Omit ${given.length === 1 ? 'it' : 'them'} from a scope on a ledger 8 network.`
  );
};

/**
 * The body every scope runs, with its inputs already separated: the outer
 * context if this is a nested call, the scope options, and the era reading if
 * this scope has one.
 *
 * Split out from {@link scoped} so the two entry points below differ in exactly
 * ONE thing -- whether an era was resolved for the scope -- rather than each
 * re-implementing the execute-then-submit-or-return logic here.
 */
const runScope = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.Ledger9TransactionContext<C, PCK>) => Promise<void>,
  outerTxCtx: Transaction.Ledger9TransactionContext<C, PCK> | undefined,
  txOptions: Transaction.ScopedTransactionOptions | undefined,
  scopeEra: ResolvedOperationEra | undefined
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (outerTxCtx !== undefined) {
    assertSubmitOptionsHonoured(txOptions, 'nested');
  }
  const innerTxCtx = outerTxCtx ?? new TransactionContextImpl<C, PCK>(providers, txOptions, scopeEra);

  try {
    await fn(innerTxCtx);
  } catch (err: unknown) {
    throw logScopeFailure(providers, outerTxCtx, txOptions, 'executing', err);
  }
  try {
    // Only submit when there is no outer transaction context (i.e., no parent transaction context, meaning
    // that this is the root transaction context).
    if (!outerTxCtx) {
      return await innerTxCtx[Submit]();
    }

    // ...otherwise, return the `Ledger9CallResult` of the last call recorded into the scope. Nothing is
    // built here: the scope that submits builds one transaction of all its calls.
    const lastCallResult: Ledger9CallResult<C, PCK> | undefined = innerTxCtx[LastCallResult]();
    if (!lastCallResult) {
      throw new InvalidArgumentError('No calls were submitted.');
    }
    return lastCallResult;
  } catch (err: unknown) {
    throw logScopeFailure(providers, outerTxCtx, txOptions, 'submitting', err);
  }
};

/**
 * Runs `fn` against a transaction context, WITHOUT resolving an era of its own.
 *
 * This is the single-call entry point, plus the nested form a call inside a
 * user scope takes. It resolves no era deliberately: the current-era
 * single-call path asks no era question, and reading the head here would add a
 * network round trip to every call in the framework. A call nested inside a
 * user scope inherits that scope's reading through `outerTxCtx`, so the scope
 * is still read once and only once.
 *
 * @internal
 */
export const scoped: {
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: Ledger9ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.Ledger9TransactionContext<C, PCK>) => Promise<void>,
    options?: Transaction.ScopedTransactionOptions,
  ): Promise<Ledger9FinalizedCallTxData<C, PCK>>,
  <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
    providers: Ledger9ContractProviders<C, PCK>,
    fn: (txCtx: Transaction.Ledger9TransactionContext<C, PCK>) => Promise<void>,
    txCtx: Transaction.Ledger9TransactionContext<C, PCK>,
    options?: Transaction.ScopedTransactionOptions
  ): Promise<Ledger9CallResult<C, PCK>>
} = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.Ledger9TransactionContext<C, PCK>) => Promise<void>,
  txCtxOrOptions?: Transaction.Ledger9TransactionContext<C, PCK> | Transaction.ScopedTransactionOptions,
  options?: Transaction.ScopedTransactionOptions
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const outerTxCtx = isLedger9ScopeContext<C, PCK>(txCtxOrOptions) ? txCtxOrOptions : undefined;
  const txOptions = isLedger9ScopeContext<C, PCK>(txCtxOrOptions)
    ? options
    : txCtxOrOptions as Transaction.ScopedTransactionOptions | undefined;

  return runScope<C, PCK>(providers, fn, outerTxCtx, txOptions, undefined);
};

/**
 * Runs `fn` as a USER ledger 9 scope: one head read up front, unless the caller
 * hands in a reading it already took, and a refusal if the head is not on ledger 9.
 *
 * The era read happens BEFORE the context exists, so a scope on a head of another
 * era is refused before any circuit runs -- see {@link resolveScopeEra}. Every call
 * recorded into the scope afterwards inherits that one reading, which is what makes
 * the head read once per scope rather than once per call.
 *
 * @internal
 * @throws EraMismatchError with reason `'scope-era-mismatch'` for a ledger 8 scope passed as the
 * outer scope, or a head that is not on ledger 9.
 * @throws InvalidArgumentError for a scope context of an unknown era.
 */
export const scopedTransaction = async <
  C extends Contract.Any,
  PCK extends Contract.ProvableCircuitId<C>
> (
  providers: Ledger9ContractProviders<C, PCK>,
  fn: (txCtx: Transaction.Ledger9TransactionContext<C, PCK>) => Promise<void>,
  txCtxOrOptions?: Transaction.Ledger9TransactionContext<C, PCK> | Transaction.ScopedTransactionOptions,
  ledger9Reading?: HeadEraReading & { readonly head: 'v9' }
): Promise<Ledger9FinalizedCallTxData<C, PCK>> => {
  // The third argument is DISCRIMINATED, not assumed to be options, and the
  // guard is not decorative: this parameter is declared as options on the
  // public entry point, so a JavaScript caller passing a transaction context
  // here -- which the entry point accepted before these era rules, by nesting
  // into it -- would otherwise have it read as an options bag. A fresh scope
  // would be created and the transaction the caller believed was nested would
  // be submitted on its own. That is the same "silently ran outside the scope
  // it was handed" failure `'ledger8-call-in-scope'` exists to stop, one case over.
  const outerEra = readScopeEra(txCtxOrOptions);
  switch (outerEra) {
    case 'v8':
      throw scopeEraMismatch('withLedger9ContractScopedTransaction', 'v8');
    case 'unrecognised':
      throw unrecognisedScopeContext('withLedger9ContractScopedTransaction');
    case 'v9':
    case undefined:
      break;
    default:
      return assertNever(outerEra, 'withLedger9ContractScopedTransaction');
  }
  const outerTxCtx = isLedger9ScopeContext<C, PCK>(txCtxOrOptions) ? txCtxOrOptions : undefined;
  if (outerTxCtx !== undefined) {
    // Nested: no head read of its own. The scope this joins already made one,
    // which is what keeps it at one read per scope, and the outer scope is the
    // one that submits -- so this returns that scope's `Ledger9CallResult`, exactly as
    // it did before.
    return runScope<C, PCK>(providers, fn, outerTxCtx, undefined, undefined);
  }

  const options = txCtxOrOptions as Transaction.ScopedTransactionOptions | undefined;
  // A reading the caller already took and admitted as ledger 9 is acquired, not read again.
  const scopeEra =
    ledger9Reading === undefined
      ? await resolveScopeEra(providers.publicDataProvider, providers.loggerProvider)
      : await acquireHeadEra(ledger9Reading);

  return runScope<C, PCK>(providers, fn, undefined, options, scopeEra);
};
