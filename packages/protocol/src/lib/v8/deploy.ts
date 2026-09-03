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

import { ComposeFailedError, ComposeOptionError } from '../../errors';
import type { UnprovenOffer } from '../../v8.js';
import { assertComposeEnvelope } from '../shared/compose-options';
import type { DeployResultPojo } from '../shared/compose-types';
import { resolveVerifierKeyRegistrations } from '../shared/verifier-keys';
import type { ProtocolV8 } from './load';

/**
 * The minimal shape a pre-fork (`compact-runtime@0.16`) `ContractState` is used
 * through here: just `.serialize()`. It is what {@link executeConstructor}
 * returns on its result, and `.serialize()` is how a caller turns that handle
 * into the bytes every deploy leg takes.
 *
 * Crossing the era boundary by bytes rather than by handle is deliberate — it
 * is the one crossing in this engine that cannot be affected by a
 * dual-instantiation of the WASM, because no object is handed between the two
 * copies.
 *
 * Structurally loose enough that unrelated serializables satisfy it, which is
 * what lets tests substitute a fake instead of invoking real WASM (the same
 * pattern `Ledger8ContractLike` in `./execute.ts` uses). The type
 * therefore does not enforce that the bytes are a contract state at all;
 * whichever deploy leg receives them turns that residual risk into a legible
 * error rather than a raw decoder failure.
 */
export interface Ledger8DeployableContractState {
  readonly serialize: () => Uint8Array;
}

/** What a pre-fork `contract.initialState(constructorContext, ...args)` call returns. */
export interface Ledger8ConstructorResult {
  readonly currentContractState: Ledger8DeployableContractState;
  readonly currentPrivateState: unknown;
}

/**
 * The subset of a compiled pre-fork (`compact-runtime@0.16`) contract module
 * {@link executeConstructor} needs: only `initialState`, the constructor
 * every generated contract exposes to build its initial ledger state.
 */
export interface Ledger8ConstructorContractLike {
  readonly initialState: (constructorContext: unknown, ...args: readonly unknown[]) => Ledger8ConstructorResult;
}

/**
 * The subset of the pre-fork `compact-runtime@0.16` glue {@link executeConstructor}
 * needs to build a constructor context. Injected — like `Ledger8ExecutionRuntime`
 * (`./execute.ts`) — so callers target a specific WASM-backed instance and
 * tests can substitute a controlled fake.
 */
export interface Ledger8ConstructorRuntime {
  readonly createConstructorContext: (privateState: unknown, coinPk: string) => unknown;
}

/** Everything {@link executeConstructor} needs to run one contract constructor. */
export interface ExecuteConstructorOptions {
  readonly contract: Ledger8ConstructorContractLike;
  readonly args: readonly unknown[];
  readonly privateState: unknown;
  readonly coinPk: string;
}

/**
 * The result of running a pre-fork constructor: the freshly built contract
 * state (still carrying blank verifier keys on every operation slot — see
 * {@link composeV8DeployTx}) and the resulting private state.
 */
export interface ConstructorResultPojo {
  readonly contractState: Ledger8DeployableContractState;
  readonly privateState: unknown;
}

/**
 * Runs a pre-fork (`compact-runtime@0.16`) contract's constructor
 * (`initialState`), following the `createConstructorContext` /
 * `contract.initialState(cc, ...args)` sequence the retained toolchain
 * expects, and packages the result into a {@link ConstructorResultPojo}.
 *
 * `contractState` on that result is a pre-fork handle, so it does not go
 * straight into a deploy: both {@link composeV8DeployTx} and the era facade's
 * `composeDeployTx` take the state as BYTES, which is what `.serialize()` on
 * that handle produces.
 *
 * Produces no proof: proving applies only to the deploy transaction
 * {@link composeV8DeployTx} serializes, and not even there — see that
 * function's docs.
 */
export const executeConstructor = (options: ExecuteConstructorOptions, runtime: Ledger8ConstructorRuntime): ConstructorResultPojo => {
  const { contract, args, privateState, coinPk } = options;
  const constructorContext = runtime.createConstructorContext(privateState, coinPk);
  const result = contract.initialState(constructorContext, ...args);

  return {
    contractState: result.currentContractState,
    privateState: result.currentPrivateState
  };
};

/**
 * Everything {@link composeV8DeployTx} needs to assemble one v8-native
 * deploy transaction. `verifierKeys` maps entry-point name -> raw, tagged
 * verifier key bytes (`keys/<id>.verifier`): the compiled contract's
 * `initialState` declares an operation slot per circuit but leaves its
 * verifier key blank, so the deploy must carry real keys or a ledger refuses
 * it. The map must name exactly the entry points the contract state declares
 * — no more, no fewer; see {@link composeV8DeployTx}.
 *
 * `networkId` and `ttl` carry the caller's policy decisions (which network,
 * how long the transaction lives), but their well-formedness is checked here
 * — see `assertComposeEnvelope` (`../shared/compose-options.ts`).
 */
export interface ComposeV8DeployOptions {
  readonly contractState: Uint8Array;
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
  /**
   * A v8-native offer HANDLE, for the same reason `ComposeV8CallOptions`
   * carries handles: the era arm has already read the caller's bytes with the
   * module this leg is about to compose against.
   */
  readonly guaranteedZswapOffer?: UnprovenOffer;
}

/**
 * Bridges a pre-fork contract state into the v8 era by bytes, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape — the same wrapping the v9 deploy leg applies to the
 * identical call (`../v9/compose.ts`). Not the same class
 * `extractEncodedStateValue` (`../era/envelope.ts`) raises for its own decode:
 * a state that cannot be READ is a different fault from an option that cannot
 * be USED, and they carry different remediations.
 */
const bridgeContractState = (
  contractState: Uint8Array,
  v8: ProtocolV8
): InstanceType<ProtocolV8['ContractState']> => {
  try {
    return v8.ContractState.deserialize(contractState);
  } catch (error) {
    throw new ComposeOptionError('v8', 'contractState', error);
  }
};

/**
 * Registers one verifier key, reporting bytes the ledger rejects as
 * {@link ComposeFailedError} (stage `'deploy-verifier-key-blob'`) so the
 * failure names the entry point it belongs to. The setter validates a tagged
 * `midnight:verifier-key[...]` blob, so a truncated, empty or wrong-era key
 * fails here rather than at submission.
 */
const registerVerifierKey = (
  ledgerContractState: InstanceType<ProtocolV8['ContractState']>,
  entryPoint: string | Uint8Array,
  circuitId: string,
  verifierKey: Uint8Array,
  v8: ProtocolV8
): void => {
  const operation = new v8.ContractOperation();
  try {
    operation.verifierKey = verifierKey;
  } catch (error) {
    throw new ComposeFailedError('v8', 'deploy-verifier-key-blob', circuitId, error);
  }
  ledgerContractState.setOperation(entryPoint, operation);
};

/**
 * Composes a v8-native deploy transaction from a {@link ConstructorResultPojo}'s
 * `contractState` and immediately serializes it: bridge the constructor's
 * pre-fork state into a v8-native one, register a verifier key for every entry
 * point it declares, then wrap it in a `ContractDeploy` / `Intent` /
 * `Transaction`.
 *
 * The verifier-key map is validated against the state's declared entry points
 * BEFORE anything is registered, by the resolver both eras' deploy legs share —
 * see {@link resolveVerifierKeyRegistrations} for the three refusals it owns
 * and why each one matters. Restating them here would be a second copy of one
 * contract, which is what that resolver exists to remove.
 *
 * Bytes the ledger itself rejects surface here, as stage
 * `'deploy-verifier-key-blob'` with the ledger's own failure on `cause`.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called. Proving needs a proving provider and a
 * running proof server, neither of which this seam has.
 *
 * Uses `Transaction.fromParts`, not `fromPartsRandomized`, so the intent lands
 * at a fixed segment id — matching `createUnprovenLedgerDeployTx`
 * (`packages/contracts/src/utils/ledger-utils.ts`), which the v9 deploy path
 * already does. Only calls randomize their segment, to stay mergeable.
 *
 * Returns the address and the registered initial state alongside the
 * transaction, rather than the transaction alone. A deploy mints a fresh
 * nonce, so the address is not a function of the state a caller passed in and
 * cannot be recomputed from it — and the state the address was derived from is
 * the one a caller stores and later dispatches calls against.
 */
export const composeV8DeployTx = (options: ComposeV8DeployOptions, v8: ProtocolV8): DeployResultPojo => {
  const { contractState, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  assertComposeEnvelope(options, 'v8');

  const ledgerContractState = bridgeContractState(contractState, v8);
  for (const { entryPoint, circuitId, verifierKey } of resolveVerifierKeyRegistrations(
    ledgerContractState.operations(),
    verifierKeys,
    'v8'
  )) {
    registerVerifierKey(ledgerContractState, entryPoint, circuitId, verifierKey, v8);
  }

  const deploy = new v8.ContractDeploy(ledgerContractState);
  const intent = v8.Intent.new(ttl).addDeploy(deploy);

  return {
    transaction: v8.Transaction.fromParts(networkId, guaranteedZswapOffer, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialState: deploy.initialState.serialize()
  };
};
