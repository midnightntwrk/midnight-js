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

import type * as OnchainRuntimeV3 from '@midnight-ntwrk/onchain-runtime-v3';

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
 * @see {@link ComposeRefusalOrder}
 * @see {@link EraSeam}
 */
export type Ledger8DeployableContractState = Pick<OnchainRuntimeV3.ContractState, 'serialize'>;

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
 * needs to build a constructor context. Injected so callers target a specific
 * WASM-backed instance.
 *
 * The returned context is `unknown` on purpose: this seam never inspects it,
 * it only hands the value straight back to the contract's `initialState`.
 *
 * @see {@link RetainedEraExecution}
 * @see {@link ComposeRefusalOrder}
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
 * (`initialState`) and packages the result into a
 * {@link ConstructorResultPojo}.
 *
 * @param options The compiled contract module, constructor arguments, private
 *   state and coin public key.
 * @param runtime The injected pre-fork glue slice used to build the
 *   constructor context.
 * @returns The freshly built contract state and the resulting private state.
 *   The state is a pre-fork HANDLE, so it does not go straight into a deploy:
 *   both {@link composeV8DeployTx} and the era facade's `composeDeployTx` take
 *   it as BYTES, which is what `.serialize()` on that handle produces.
 * @see {@link RetainedEraExecution}
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
 * verifier key bytes (`keys/<id>.verifier`), and must name exactly the entry
 * points the contract state declares — no more, no fewer; see
 * {@link composeV8DeployTx}.
 *
 * `networkId` and `ttl` carry the caller's policy decisions (which network,
 * how long the transaction lives); their well-formedness is checked here — see
 * `assertComposeEnvelope` (`../shared/compose-options.ts`).
 *
 * @see {@link VerifierKeys}
 * @see {@link ComposeRefusalOrder}
 */
export interface ComposeV8DeployOptions {
  readonly contractState: Uint8Array;
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
  /** A v8-native offer HANDLE, not bytes, as `ComposeV8CallOptions` also takes. */
  readonly guaranteedZswapOffer?: UnprovenOffer;
}

/**
 * Bridges a pre-fork contract state into the v8 era by bytes, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a raw
 * decoder failure escape.
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
 * failure names the entry point it belongs to.
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
 * BEFORE anything is registered, by {@link resolveVerifierKeyRegistrations} —
 * the resolver both eras' deploy legs share.
 *
 * Never proves the transaction: the returned bytes are an UNPROVEN,
 * tag-prefixed serialization, exactly what `Transaction.serialize()` produces
 * before `.prove()` is ever called.
 *
 * @param options The state bytes, the verifier-key map, the envelope options
 *   and an optional Zswap offer.
 * @param v8 The v8 ledger module, as handed over by `loadLedger8`
 *   (`./load.ts`).
 * @returns The UNPROVEN, serialized transaction, the address the deployment
 *   will have, and the registered initial state. A deploy mints a fresh nonce,
 *   so the address is not a function of the state a caller passed in and cannot
 *   be recomputed from it — and the state the address was derived from is the
 *   one a caller stores and later dispatches calls against.
 * @throws ComposeOptionError If `networkId` is empty or `ttl` is not a valid
 *   instant, or the state bytes cannot be read.
 * @throws ComposeFailedError If the map and the state's declared entry points
 *   do not agree (stages `'deploy-ambiguous-circuit'`,
 *   `'deploy-unknown-circuit'`, `'deploy-verifier-key'`), or the ledger itself
 *   rejects a key blob (stage `'deploy-verifier-key-blob'`, with the ledger's
 *   own failure on `cause`).
 * @see {@link VerifierKeys}
 * @see {@link ComposeRefusalOrder}
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
