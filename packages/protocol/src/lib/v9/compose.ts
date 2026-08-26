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

import * as ledgerV9 from '@midnightntwrk/ledger-v9';

import { ComposeFailedError, ComposeOptionError, NO_CIRCUIT } from '../../errors';
import { assembleCallPrototype } from '../shared/assemble-call';
import { assertComposeEnvelope } from '../shared/compose-options';
import type { ComposeCallOptions, ComposeDeployOptions, DeployResultPojo } from '../shared/compose-types';
import { aggregateUnshieldedOffers } from '../shared/unshielded';
import { entryPointName, resolveVerifierKeyRegistrations } from '../shared/verifier-keys';

/**
 * Bridges a raw, serialized contract state into the v9 era, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape.
 */
const readContractState = (raw: Uint8Array): ledgerV9.ContractState => {
  try {
    return ledgerV9.ContractState.deserialize(raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', 'contractState', cause);
  }
};

/**
 * Reads a serialized Zswap offer, reporting bytes this era cannot decode as
 * {@link ComposeOptionError}. An absent offer is the normal shape of a call
 * that moved no shielded coins, and stays absent.
 */
const readZswapOffer = (raw: Uint8Array | undefined): ledgerV9.UnprovenOffer | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return ledgerV9.ZswapOffer.deserialize('pre-proof', raw);
  } catch (cause) {
    throw new ComposeOptionError('v9', 'zswapOffer', cause);
  }
};

/**
 * Composes a v9-native call transaction from one or more contract calls and
 * immediately serializes it.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called. Proving needs a proving provider and a
 * running proof server, neither of which this seam has.
 *
 * Uses `Transaction.fromPartsRandomized`, so the intent lands at a random
 * segment id and stays mergeable with other calls. Only deploys use a fixed
 * segment.
 *
 * The transaction-wide options are all checked before anything is composed: the
 * envelope first, then the call list, then both offers — so a caller handed bad
 * offer bytes learns that instead of paying for a full assembly first. Each
 * call's own contract state is read as that call is assembled, so a bad state
 * late in a tree is reported after the earlier calls have been built. Nothing is
 * emitted either way: the throw discards the whole intent.
 *
 * Every failure a caller can cause is coded. An empty call list is refused with
 * {@link ComposeFailedError} at stage `'call-empty'`, and an unreadable contract
 * state, Zswap offer, network id or ttl with {@link ComposeOptionError}. The
 * shared assembler contributes stages `'call-operation'`, `'call-verifier-key'`,
 * `'call-contract-state'`, `'call-transcript-empty'`, `'call-partition'` and
 * `'call-prototype'`; a payout the transaction cannot settle surfaces as
 * `'call-dust-payout'` or `'call-unsupported-payout'`.
 *
 * The transaction's two unshielded offers aggregate the user-addressed outputs
 * of EVERY call in the tree, not just the root — see
 * {@link aggregateUnshieldedOffers}.
 */
export const composeV9CallTx = (options: ComposeCallOptions): Uint8Array => {
  const { calls, networkId, ttl, guaranteedZswapOffer, fallibleZswapOffer } = options;
  assertComposeEnvelope(options, 'v9');
  if (calls.length === 0) {
    throw new ComposeFailedError('v9', 'call-empty', NO_CIRCUIT);
  }

  // Read both offers before composing anything, so a caller handed bad offer
  // bytes learns that instead of paying for a full assembly first.
  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer);
  const fallibleOffer = readZswapOffer(fallibleZswapOffer);

  let intent = ledgerV9.Intent.new(ttl);
  for (const call of calls) {
    intent = intent.addCall(
      assembleCallPrototype(ledgerV9, {
        circuitId: call.circuitId,
        contractAddress: call.contractAddress,
        transcript: call.transcript,
        privateTranscriptOutputs: call.privateTranscriptOutputs,
        input: call.input,
        output: call.output,
        communicationCommitmentRandomness: call.communicationCommitmentRandomness,
        operations: readContractState(call.contractState),
        stage: 'call-operation',
        version: 'v9'
      })
    );
  }

  // Read the partitioned pairs back off the intent rather than re-deriving
  // them: these are the exact transcripts the transaction now carries, so the
  // offers cannot describe a different partition than the calls do.
  const unshielded = aggregateUnshieldedOffers(
    intent.actions
      .filter((action) => action instanceof ledgerV9.ContractCall)
      .map((call) => ({
        circuitId: entryPointName(call.entryPoint),
        guaranteed: call.guaranteedTranscript,
        fallible: call.fallibleTranscript
      })),
    ledgerV9,
    'v9'
  );
  if (unshielded.guaranteed !== undefined) {
    intent.guaranteedUnshieldedOffer = unshielded.guaranteed;
  }
  if (unshielded.fallible !== undefined) {
    intent.fallibleUnshieldedOffer = unshielded.fallible;
  }

  return ledgerV9.Transaction.fromPartsRandomized(networkId, guaranteedOffer, fallibleOffer, intent).serialize();
};

/**
 * Registers a verifier key for every entry point the state declares, against
 * the map validated by {@link resolveVerifierKeyRegistrations} — the shared
 * resolver both eras' deploy legs use, so the two cannot drift on which checks
 * run or in what order.
 */
const registerVerifierKeys = (
  contractState: ledgerV9.ContractState,
  verifierKeys: ReadonlyMap<string, Uint8Array>
): void => {
  for (const { entryPoint, circuitId, verifierKey } of resolveVerifierKeyRegistrations(
    contractState.operations(),
    verifierKeys,
    'v9'
  )) {
    const operation = new ledgerV9.ContractOperation();
    try {
      operation.verifierKey = verifierKey;
    } catch (cause) {
      throw new ComposeFailedError('v9', 'deploy-verifier-key-blob', circuitId, cause);
    }
    contractState.setOperation(entryPoint, operation);
  }
};

/**
 * Refuses a state that still declares an entry point with a blank verifier key
 * when no key map was supplied.
 *
 * `verifierKeys` is optional so that a state which ALREADY carries its keys can
 * be deployed as-is. Omitting it for a constructor-built state is a different
 * thing entirely: every entry point is declared blank, the deploy derives its
 * address from that blank state, and the contract lands on chain unable to
 * verify any call against it. Nothing fails until the first call, which reports
 * `'call-verifier-key'` a long way from the cause. The v8 arm refuses the
 * omission outright; this makes the two arms agree without taking away the one
 * case the optionality exists for.
 */
const assertStateCarriesKeys = (contractState: ledgerV9.ContractState): void => {
  for (const entryPoint of contractState.operations()) {
    // `?.` collapses "no operation resolves" into "operation has a blank key",
    // which `../era/contract-state.ts` deliberately refuses to do for the same
    // call. It is safe here because both answers have the one remediation this
    // function exists to demand — supply the map — whereas a decoded state hands
    // its caller a verifierKey field whose absence means "never deployed".
    //
    // Raised as the OPTION error, not as `ComposeFailedError`'s
    // `'deploy-verifier-key'` stage, even though that stage means exactly this
    // condition and would name the offending entry point. The v8 arm refuses the
    // same omission as `ComposeOptionError('v8', 'verifierKeys')`, and a caller
    // writing one handler across both eras matters more than naming which of a
    // contract's slots was blank. Naming it as well needs a `circuitId` on
    // `ComposeOptionError`, which is a wider change than this seam should make.
    if (contractState.operation(entryPoint)?.verifierKey === undefined) {
      throw new ComposeOptionError('v9', 'verifierKeys');
    }
  }
};

/**
 * Composes a v9-native deploy transaction from a serialized initial contract
 * state and immediately serializes it, returning the transaction together with
 * the address the deployment will have and the initial state that address is
 * derived from.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called.
 *
 * Uses `Transaction.fromParts`, not `fromPartsRandomized`, so the intent lands
 * at a fixed segment id. Only calls randomize their segment, to stay mergeable.
 *
 * With `verifierKeys` supplied, every declared entry point is registered before
 * the address is derived — see {@link registerVerifierKeys} for the checks that
 * run first. Without it, the state is deployed exactly as given, which is right
 * only for a state that already carries its keys — and that is checked rather
 * than assumed, see {@link assertStateCarriesKeys}.
 */
export const composeV9DeployTx = (options: ComposeDeployOptions): DeployResultPojo => {
  const { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  assertComposeEnvelope(options, 'v9');

  const guaranteedOffer = readZswapOffer(guaranteedZswapOffer);
  const state = readContractState(contractState);
  if (verifierKeys === undefined) {
    assertStateCarriesKeys(state);
  } else {
    registerVerifierKeys(state, verifierKeys);
  }

  const deploy = new ledgerV9.ContractDeploy(state);
  const intent = ledgerV9.Intent.new(ttl).addDeploy(deploy);

  return {
    transaction: ledgerV9.Transaction.fromParts(networkId, guaranteedOffer, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialState: deploy.initialState.serialize()
  };
};
