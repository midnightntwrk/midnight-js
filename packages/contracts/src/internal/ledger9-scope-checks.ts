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
  ContractDeploy,
  type FinalizedTransaction,
  type LedgerParameters,
  MaintenanceUpdate,
  type SyntheticCost,
  Transaction
} from '@midnightntwrk/midnight-js-protocol/v9';
import type { ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import { type FinalizedTx, LedgerTransaction } from '@midnightntwrk/midnight-js-types';

import { type Ledger9ScopeCheckStage, Ledger9ScopeFalliblePartError, Ledger9ScopeOutsideTimeToDismissError } from '../errors';

type ContractCall = ContractExecutable.ContractExecutable.ContractCall;

/**
 * Whether the partitioner placed a call tree wholly in the fallible half: no transcript of it is
 * guaranteed and some transcript of it is fallible.
 *
 * The partitioner places a call wholly in the fallible half when even its part before the first
 * checkpoint (all of it, for a call with no checkpoint) costs more, by its estimate, than the budget it
 * gives the call in the guaranteed half: the time to dismiss the call's own size allows, and a share of
 * what the minimum time to dismiss leaves spare.
 *
 * @param tree The calls one circuit call made, callees before the root, as its execution left them.
 */
export const isWhollyFallible = (tree: readonly ContractCall[]): boolean =>
  tree.every(({ public: { partitionedTranscript } }) => partitionedTranscript[0] === undefined) &&
  tree.some(({ public: { partitionedTranscript } }) => partitionedTranscript[1] !== undefined);

/**
 * The call tree of one call with its transcripts moved whole into the guaranteed half, when the
 * partitioner placed the whole tree in the fallible half ({@link isWhollyFallible}).
 *
 * The transcripts are the same in either half, and a transaction that must land whole cannot have a
 * fallible half, so the tree moves, root and callees together: a callee claimed from a guaranteed
 * transcript is guaranteed too. A tree with a guaranteed transcript is returned as it is; any fallible
 * transcript left in it is refused by {@link refuseFallibleCalls}. Moving a tree adds to what
 * dismissing the transaction costs, which {@link assertWithinTimeToDismiss} checks.
 *
 * @param tree The calls one circuit call made, callees before the root, as its execution left them.
 */
export const guaranteedWhole = (tree: readonly ContractCall[]): readonly ContractCall[] => {
  if (!isWhollyFallible(tree)) {
    return tree;
  }
  return tree.map((call) => ({
    ...call,
    public: { ...call.public, partitionedTranscript: [call.public.partitionedTranscript[1], undefined] }
  }));
};

/** A call by its circuit and contract, as every refusal of a scope names it. */
export const callName = ({ circuitId, contractAddress }: ContractCall): string =>
  `'${String(circuitId)}' of contract '${String(contractAddress)}'`;

/**
 * Refuses calls that still have a fallible transcript: a transcript split at a checkpoint into both
 * halves, or a fallible transcript in a tree that also has a guaranteed one.
 *
 * @throws Ledger9ScopeFalliblePartError naming each such call's circuit and contract.
 */
export const refuseFallibleCalls = (calls: readonly ContractCall[]): void => {
  const fallible = calls.filter(({ public: { partitionedTranscript } }) => partitionedTranscript[1] !== undefined);
  if (fallible.length === 0) {
    return;
  }
  throw new Ledger9ScopeFalliblePartError(
    'unproven',
    fallible.map((call) => `a fallible transcript of ${callName(call)}`)
  );
};

/** The parts of a ledger transaction that make it partly fallible, at any stage. */
export interface FallibleParts {
  readonly fallibleOffer: ReadonlyMap<number, unknown> | undefined;
  readonly intents:
    ReadonlyMap<number, { readonly fallibleUnshieldedOffer: unknown; readonly actions: readonly object[] }> | undefined;
}

/** The fallible parts of one intent's actions: fallible transcripts, and deploys and maintenance updates. */
const fallibleActionsOf = (segment: number, actions: readonly object[]): string[] => {
  const transcripts = actions.filter(
    (action) => 'fallibleTranscript' in action && action.fallibleTranscript !== undefined
  ).length;
  // The ledger applies a deploy and a maintenance update only with the fallible parts.
  const deploys = actions.filter((action) => action instanceof ContractDeploy).length;
  const updates = actions.filter((action) => action instanceof MaintenanceUpdate).length;
  return [
    ...(transcripts > 0 ? [`${transcripts} fallible transcript(s) in segment ${segment}`] : []),
    ...(deploys > 0 ? [`${deploys} contract deploy(s) in segment ${segment}`] : []),
    ...(updates > 0 ? [`${updates} maintenance update(s) in segment ${segment}`] : [])
  ];
};

/**
 * Refuses a transaction that holds a fallible coin (a fallible Zswap offer), a fallible unshielded
 * offer, a fallible transcript, or a contract deploy or maintenance update, which the ledger applies
 * only with the fallible parts. The check runs on the transaction before proving and on the one the
 * wallet balanced: a wallet adds a fallible part only to balance one the transaction already has, and
 * the second check covers a wallet that adds one otherwise.
 *
 * @param balancedTransaction At `'balanced'`, the transaction the wallet balanced, carried on the error.
 * @throws Ledger9ScopeFalliblePartError naming each fallible part and its segment.
 */
export const refuseFallibleTransaction = (
  tx: FallibleParts,
  stage: Ledger9ScopeCheckStage,
  balancedTransaction?: FinalizedTx
): void => {
  const parts: string[] = [];
  for (const segment of tx.fallibleOffer?.keys() ?? []) {
    parts.push(`fallible coins in segment ${segment}`);
  }
  for (const [segment, intent] of tx.intents ?? []) {
    if (intent.fallibleUnshieldedOffer !== undefined) {
      parts.push(`a fallible unshielded offer in segment ${segment}`);
    }
    parts.push(...fallibleActionsOf(segment, intent.actions));
  }
  if (parts.length > 0) {
    throw new Ledger9ScopeFalliblePartError(stage, parts, { balancedTransaction });
  }
};

/** A ledger transaction as the time to dismiss is checked on it, at any stage. */
export interface PricedTransaction {
  cost(params: LedgerParameters, enforceTimeToDismiss?: boolean): SyntheticCost;
}

/**
 * How the ledger words its refusal when a transaction costs more to dismiss than its size allows.
 * The ledger raises a plain `Error` carrying only that text, so the refusal is recognised by it; a
 * ledger release that words it otherwise has its refusal passed on as the ledger raised it.
 */
const OUTSIDE_TIME_TO_DISMISS =
  /exceeded the maximum time to dismiss for transaction size; this transaction would take (\S+) to dismiss, but given its size of (\d+) bytes, it may take at most (\S+)$/;

/**
 * Checks a transaction, before proving, against the ledger's time to dismiss, with the ledger's own
 * pricing (`Transaction.cost` with the time to dismiss enforced) under the given ledger parameters:
 * what validating it, applying its guaranteed half and walking its effects costs, against the time its
 * size allows. The transaction has no Dust spend yet and is priced at the ledger's estimate of its
 * proven size, so the figure is an estimate. The transaction the wallet balances is not priced again:
 * the node refuses one over its time to dismiss at no fee, and the wallet releases what it booked.
 *
 * The ledger charges a verifier key's read in whole 4,096-byte blocks. Here it assumes each key fits
 * one block; the ledger's own check on submission reads each key's real size, so it can be stricter
 * only for a verifier key over 4,096 bytes.
 *
 * @param movedCalls Each call {@link guaranteedWhole} moved out of the fallible half, named on the error.
 * @throws Ledger9ScopeOutsideTimeToDismissError if the ledger prices it outside its time to dismiss.
 * @throws Error the ledger's own refusal, as it raised it, for a transaction that repeats an entry no
 *         valid transaction repeats.
 */
export const assertWithinTimeToDismiss = (
  tx: PricedTransaction,
  ledgerParameters: LedgerParameters,
  movedCalls: readonly string[]
): void => {
  try {
    tx.cost(ledgerParameters, true);
  } catch (error: unknown) {
    const figures = error instanceof Error ? OUTSIDE_TIME_TO_DISMISS.exec(error.message) : null;
    if (figures === null) {
      // The ledger's own error passes through: the node refuses the same transaction with it.
      throw error;
    }
    const [, timeToDismiss, size, allowedTimeToDismiss] = figures;
    throw new Ledger9ScopeOutsideTimeToDismissError(Number(size), { timeToDismiss, allowedTimeToDismiss }, movedCalls, {
      cause: error
    });
  }
};

/** The ledger 9 transaction a balanced transaction handle carries. */
export const ledgerTransactionOf = (balanced: FinalizedTx): FinalizedTransaction =>
  LedgerTransaction.fromBytes('v9', 'Finalized', balanced.serialize()).deserialize({ v9: Transaction });

/**
 * The check a ledger 9 scope of two or more calls runs on the transaction the wallet balanced, before
 * it is submitted, unless its calls are placed in the fallible section: no fallible part. A refusal
 * carries the balanced transaction, so the caller can have its wallet release what it booked for it.
 */
export const refuseFallibleBalanced = (balanced: FinalizedTx): void => {
  refuseFallibleTransaction(ledgerTransactionOf(balanced), 'balanced', balanced);
};
