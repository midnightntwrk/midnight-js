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
import type { DeployResultPojo } from '../era/compose-types';
import type { ProtocolV8 } from '../load-v8';
import { assertComposeEnvelope } from './compose-options';

/**
 * The minimal shape {@link composeV8DeployTx} needs from a pre-fork
 * (`compact-runtime@0.16`) `ContractState`: just `.serialize()`, used to
 * bridge it into a v8-native `ContractState`. Crossing the era boundary by
 * bytes rather than by handle is deliberate — it is the one crossing in this
 * engine that cannot be affected by a dual-instantiation of the WASM, because
 * no object is handed between the two copies.
 *
 * Structurally loose enough that unrelated serializables satisfy it, which is
 * what lets tests substitute a fake instead of invoking real WASM (the same
 * pattern `Ledger8ContractLike` in `engine/execute.ts` uses). The type
 * therefore does not enforce that the bytes are a contract state at all;
 * {@link composeV8DeployTx} turns that residual risk into a legible error
 * rather than a raw decoder failure.
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
 * (`engine/execute.ts`) — so callers target a specific WASM-backed instance and
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
 * expects, and packages the result into a {@link ConstructorResultPojo} ready
 * for {@link composeV8DeployTx}.
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
 * — see `assertComposeEnvelope` (`engine/compose-options.ts`).
 */
export interface ComposeV8DeployOptions {
  readonly contractState: Ledger8DeployableContractState;
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
}

/**
 * Resolves a ledger entry-point key to its name.
 *
 * `ContractState.operations()` is declared `Array<string | Uint8Array>`, so a
 * key is not statically a string. In practice ledger-v8 decodes even a
 * byte-set entry point back to a string (pinned by a test in
 * `engine-deploy-v8.test.ts`), but the declared union has to be resolved
 * somewhere, and decoding is the only resolution that keeps an error message
 * naming the entry point rather than dumping its bytes — which is what
 * `ComposeFailedError` (`../../errors.ts`) promises.
 */
export const entryPointName = (id: string | Uint8Array): string =>
  typeof id === 'string' ? id : new TextDecoder().decode(id);

/**
 * Bridges a pre-fork contract state into the v8 era by bytes, reporting a
 * rejected envelope as {@link ComposeOptionError} rather than letting a
 * raw decoder failure escape — the same wrapping `extractEncodedStateValue`
 * (`engine/envelope.ts`) applies to the identical call.
 */
const bridgeContractState = (
  contractState: Ledger8DeployableContractState,
  v8: ProtocolV8
): InstanceType<ProtocolV8['ContractState']> => {
  try {
    return v8.ContractState.deserialize(contractState.serialize());
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
 * Validates the verifier-key map against the state's declared entry points
 * BEFORE registering anything, in both directions:
 * - a declared entry point with no key in the map throws
 *   {@link ComposeFailedError} (stage `'deploy-verifier-key'`), because
 *   a ledger rejects a deploy carrying an unregistered entry point;
 * - a key naming an entry point the state does not declare throws stage
 *   `'deploy-unknown-circuit'`. This direction matters as much as the other:
 *   `setOperation` CREATES a slot rather than requiring one, so an unchecked
 *   stray key (a stale `keys/*.verifier` from an earlier compiler run) would
 *   give the deployed contract an entry point its source never had, and — since
 *   `ContractDeploy` derives its address from the initial state — silently
 *   deploy it at a different address than the caller's artifacts describe.
 *
 * Together the two checks make the map and the declared entry points equal
 * sets, so no post-registration re-read is needed to know every slot carries a
 * key. They run on resolved NAMES, because that is how `verifierKeys` is
 * keyed, so two declared entry points resolving to one name would make them
 * agree while leaving a slot blank; that case throws stage
 * `'deploy-ambiguous-circuit'` before either check runs. Registration itself
 * uses the entry point the state declares, not its resolved name, since
 * `setOperation` would otherwise create a second slot beside the declared one. Bytes the ledger itself rejects surface as stage
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
  const { contractState, verifierKeys, networkId, ttl } = options;
  assertComposeEnvelope(options, 'v8');

  const ledgerContractState = bridgeContractState(contractState, v8);
  // Keyed by resolved name, valued by the entry point the state actually
  // declares. Both halves are needed: `verifierKeys` is keyed by name, so the
  // set arithmetic below has to run on names, while `setOperation` must be
  // handed the declared entry point itself. Registering under the decoded name
  // instead would leave a byte-declared slot blank and CREATE a second,
  // undeclared one beside it — the same silently-different-address outcome
  // `'deploy-unknown-circuit'` exists to prevent.
  const declared = new Map<string, string | Uint8Array>();
  for (const entryPoint of ledgerContractState.operations()) {
    const circuitId = entryPointName(entryPoint);
    // A name that resolves twice makes the two checks below agree while one of
    // the two slots would go unregistered, so it is refused before either runs.
    if (declared.has(circuitId)) {
      throw new ComposeFailedError('v8', 'deploy-ambiguous-circuit', circuitId);
    }
    declared.set(circuitId, entryPoint);
  }

  for (const circuitId of verifierKeys.keys()) {
    if (!declared.has(circuitId)) {
      throw new ComposeFailedError('v8', 'deploy-unknown-circuit', circuitId);
    }
  }
  for (const circuitId of declared.keys()) {
    if (!verifierKeys.has(circuitId)) {
      throw new ComposeFailedError('v8', 'deploy-verifier-key', circuitId);
    }
  }

  // The non-null assertion is guarded by the two checks above: together they
  // make `verifierKeys`' keys and `declared`'s keys the same set, so every
  // lookup here resolves. An `undefined` branch would be unreachable, and this
  // file carries a 100% branch floor.
  for (const [circuitId, verifierKey] of verifierKeys) {
    registerVerifierKey(ledgerContractState, declared.get(circuitId)!, circuitId, verifierKey, v8);
  }

  const deploy = new v8.ContractDeploy(ledgerContractState);
  const intent = v8.Intent.new(ttl).addDeploy(deploy);

  return {
    transaction: v8.Transaction.fromParts(networkId, undefined, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialState: deploy.initialState.serialize()
  };
};
