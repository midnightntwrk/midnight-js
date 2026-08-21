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

import { Ledger8ComposeFailedError } from '../../errors';
import type { ProtocolV8 } from '../load-v8';

/**
 * The minimal shape {@link composeV8DeployTx} needs from a pre-fork
 * (`compact-runtime@0.16`) `ContractState`: just `.serialize()`, used to
 * bridge it into a v8-native `ContractState` via
 * `v8.ContractState.deserialize(...)`. Deliberately not the full pre-fork
 * `ContractState` type (nor a `DownConvertedState`, which drops
 * `.operations` entirely) — injected as a minimal structural type, the same
 * pattern `Ledger8ContractLike` (`engine/execute.ts`) already uses, so tests
 * can substitute a fake without invoking real WASM.
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
 * needs to build a constructor context. Injected — like
 * {@link Ledger8ExecutionRuntime} in `engine/execute.ts` — so callers target a
 * specific WASM-backed instance and tests can substitute a controlled fake.
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
 * (`initialState`), following the exact `createConstructorContext` /
 * `contract.initialState(cc, ...args)` sequence the retained toolchain
 * expects (the spike's `deploy`), and packages the result into a
 * {@link ConstructorResultPojo} ready for {@link composeV8DeployTx}.
 *
 * Unproven by design: constructor execution through `compact-runtime@0.16`
 * is fully deterministic and produces no proof of its own — proving only
 * ever applies to the deploy transaction {@link composeV8DeployTx} later
 * serializes, and even that step never calls `.prove()` (see that
 * function's docs).
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
 * deploy transaction. `verifierKeys` maps circuitId -> raw, tagged verifier
 * key bytes (`keys/<id>.verifier`): the compiled contract's `initialState`
 * registers an operation slot per circuit but leaves its verifier key blank,
 * so the deploy must carry real keys or a real ledger's `wellFormed` check
 * rejects it with `VerifierKeyNotSet`. `networkId` and `ttl` are left to the
 * caller for the same reason as {@link ComposeV8CallOptions}
 * (`engine/compose-v8.ts`).
 */
export interface ComposeV8DeployOptions {
  readonly contractState: Ledger8DeployableContractState;
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
}

/**
 * Composes a v8-native deploy transaction from an {@link ExecuteConstructorOptions}
 * result and immediately serializes it (the spike-proven `assembleDeploy`
 * sequence): bridge the constructor's pre-fork `ContractState` into a
 * v8-native one, register every verifier key `verifierKeys` supplies via
 * `setOperation`, then wrap it in a `ContractDeploy` / `Intent` / `Transaction`.
 *
 * Fails fast with {@link Ledger8ComposeFailedError} (stage
 * `'deploy-verifier-key'`) if, after registration, any operation slot the
 * bridged contract state declares still has no verifier key — the exact
 * condition a real ledger's `wellFormed` check rejects with
 * `VerifierKeyNotSet` — rather than serializing a deploy transaction that a
 * real ledger would refuse. This check runs entirely client-side (no proof
 * server, no `wellFormed` call): the split-topology confirmation that a real
 * ledger's `wellFormed` actually rejects an unregistered verifier key with
 * exactly this error stays with the integration milestone.
 *
 * Never proves the transaction — same unproven, tag-prefixed serialization
 * as {@link composeV8CallTx} (`engine/compose-v8.ts`); see that function's
 * docs for why.
 */
export const composeV8DeployTx = (options: ComposeV8DeployOptions, v8: ProtocolV8): Uint8Array => {
  const { contractState, verifierKeys, networkId, ttl } = options;

  const ledgerContractState = v8.ContractState.deserialize(contractState.serialize());

  for (const [circuitId, verifierKey] of verifierKeys) {
    const op = new v8.ContractOperation();
    op.verifierKey = verifierKey;
    ledgerContractState.setOperation(circuitId, op);
  }

  for (const circuitId of ledgerContractState.operations()) {
    // `circuitId` came directly from `operations()`, so `operation()` is
    // guaranteed defined for it — an invariant of the WASM's own map, not a
    // type-system guarantee.
    const registered = ledgerContractState.operation(circuitId)!;
    if (registered.verifierKey === undefined) {
      throw new Ledger8ComposeFailedError('deploy-verifier-key', String(circuitId));
    }
  }

  const deploy = new v8.ContractDeploy(ledgerContractState);
  const intent = v8.Intent.new(ttl).addDeploy(deploy);
  const unproven = v8.Transaction.fromParts(networkId, undefined, undefined, intent);
  return unproven.serialize();
};
