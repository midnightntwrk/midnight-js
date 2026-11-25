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
import {
  type CoinPublicKey,
  type ContractAddress,
  type EncPublicKey,
  type ShieldedCoinInfo,
  type Transcript,
  type ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import type { ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import {
  ChargedState,
  ContractState,
  type StateValue,
  type ZswapLocalState
} from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  type AnyProvableCircuitId,
  type NetworkId,
  type PrivateStateId,
  type PrivateStateProvider
} from '@midnightntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnightntwrk/midnight-js-utils';

import { type Ledger9CallResult } from '../call';
import { ZswapOutputResolutionError } from '../errors';
import { type Ledger9ContractStates, type Ledger9PublicStates } from './era';
import { tokenTypeKey } from './utils/ledger-utils';

/*
 * The records a ledger 9 scope keeps of its calls and of the states they read and leave, and how a
 * call advances those states.
 */

/**
 * Where a call's next private state is stored once the call succeeds.
 *
 * @internal
 */
export interface PrivateStateTarget {
  readonly contractAddress: ContractAddress;
  readonly privateStateId: PrivateStateId;
  /** The provider the call read its private state through, which its next private state is stored through. */
  readonly privateStateProvider?: PrivateStateProvider;
}

/** @internal */
export interface CachedStateIdentity {
  readonly contractAddress: string;
  readonly privateStateId?: PrivateStateId;
}

/** @internal The states pinned to a block within a scoped transaction. */
export interface PinnedContractStates<PS> {
  readonly states: Ledger9ContractStates<PS> | Ledger9PublicStates;
  readonly blockHash: string;
}

/**
 * @internal The public states of one contract as a ledger 9 scope holds them: as read, or as the
 * latest call of the scope that reached the contract left them.
 */
export interface ScopeContractStates {
  readonly contractState: ContractState;
  readonly zswapChainState: ZswapChainState;
}

/** @internal What resolves the encryption keys of the coins a call creates, as the call was made. */
export interface Ledger9CallEncryption {
  readonly networkId: NetworkId;
  readonly zswapLocalState: ZswapLocalState;
  readonly coinPublicKey: CoinPublicKey;
  readonly walletEncryptionPublicKey: EncPublicKey;
  readonly additionalCoinEncPublicKeyMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>;
}

/** @internal What assembling a call's transaction needs, kept from the circuit run. */
export interface Ledger9CallAssembly {
  /**
   * Proof data for every contract call the circuit made, in execution-trace order: cross-contract
   * callees first, the root call last.
   */
  readonly calls: readonly ContractExecutable.ContractExecutable.ContractCall[];
  /**
   * The public states each contract of the call tree ran against, keyed by
   * {@link contractAddressKey}: the root's as given to the call, each callee's as resolved while the
   * circuit ran.
   */
  readonly statesBuiltAgainst: ReadonlyMap<string, ScopeContractStates>;
  readonly encryption: Ledger9CallEncryption;
}

/**
 * @internal A circuit run, which builds no transaction: the call's result, the coins it creates for
 * the caller, and what assembling its transaction needs.
 */
export interface Ledger9ExecutedCall<C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>> {
  readonly result: Ledger9CallResult<C, PCK>;
  readonly newCoins: ShieldedCoinInfo[];
  readonly assembly: Ledger9CallAssembly;
}

type AnyLedger9CallResult = Ledger9CallResult<Contract.Any, AnyProvableCircuitId>;

/**
 * @internal A circuit run of any contract, as a scope records it: every
 * {@link Ledger9ExecutedCall} is one. Its circuit's return value and private state are held as they
 * are, untyped.
 */
export interface AnyLedger9ExecutedCall {
  readonly result: Omit<AnyLedger9CallResult, 'private'> & {
    readonly private: Omit<AnyLedger9CallResult['private'], 'result' | 'nextPrivateState'> & {
      readonly result: unknown;
      readonly nextPrivateState: unknown;
    };
  };
  readonly newCoins: ShieldedCoinInfo[];
  readonly assembly: Ledger9CallAssembly;
}

/**
 * A private state a scope holds: as read, or as its last call left it, which the scope stores when it
 * succeeds through the provider it was read through.
 */
export type ScopePrivateState = {
  readonly contractAddress: ContractAddress;
  readonly privateStateId: PrivateStateId;
  readonly privateState: unknown;
} & (
  | { readonly recorded: false; readonly privateStateProvider?: PrivateStateProvider }
  | { readonly recorded: true; readonly privateStateProvider: PrivateStateProvider }
);

/**
 * Stores every private state a scope's calls left, each through the provider it was read through,
 * in the order the scope first reached each.
 */
export const storePrivateStates = async (held: Iterable<ScopePrivateState>): Promise<void> => {
  for (const state of held) {
    if (!state.recorded) continue;
    const { contractAddress, privateStateId, privateState } = state;
    await state.privateStateProvider.forContract(contractAddress).set(privateStateId, privateState);
  }
};

/**
 * @internal The one form a scope keys a contract address by. An address is hex, which may be
 * written in either case; a private state provider stores both spellings as one contract, and so
 * does the scope.
 */
export const contractAddressKey = (contractAddress: unknown): string => String(contractAddress).toLowerCase();

export const privateStateKey = (contractAddress: string, privateStateId: PrivateStateId): string =>
  JSON.stringify([contractAddressKey(contractAddress), privateStateId]);

/**
 * The coin key to encryption key mappings of a scope and of each of its calls, as one map in
 * normalised hex. The calls' own mappings are kept: a call made with `submitCallTx` passes its own,
 * which the scope's options do not hold.
 *
 * @throws ZswapOutputResolutionError if one coin key is mapped to two different encryption keys.
 */
export const mergedMappings = (
  networkId: NetworkId,
  mappings: readonly (ReadonlyMap<CoinPublicKey, EncPublicKey> | undefined)[]
): ReadonlyMap<CoinPublicKey, EncPublicKey> => {
  const merged = new Map<CoinPublicKey, EncPublicKey>();
  for (const [coinPublicKey, encPublicKey] of mappings.flatMap((mapping) => Array.from(mapping ?? []))) {
    const coinKey = parseCoinPublicKeyToHex(coinPublicKey, networkId);
    const encKey = parseEncPublicKeyToHex(encPublicKey, networkId);
    const known = merged.get(coinKey);
    if (known !== undefined && known !== encKey) {
      throw new ZswapOutputResolutionError(
        `The coin public key '${coinKey}' is mapped to two different encryption public keys in one transaction, ` +
          `'${known}' and '${encKey}'. A coin sent to it could be encrypted to a key its owner does not hold. ` +
          'Map each coin public key to one encryption public key, in the scope options and in every call.'
      );
    }
    merged.set(coinKey, encKey);
  }
  return merged;
};

type TokenBalance = ContractState['balance'];
type BalanceTokenType = TokenBalance extends Map<infer T, bigint> ? T : never;
type CallEffects = Transcript<unknown>['effects'];

/**
 * The balance a contract holds after the effects of its calls, in order: each call's unshielded
 * inputs added and its unshielded outputs taken away, as the ledger does when it applies them.
 */
const balanceAfter = (balance: TokenBalance, effects: readonly CallEffects[]): TokenBalance => {
  const next = new Map(Array.from(balance, ([tokenType, value]) => [tokenTypeKey(tokenType), { tokenType, value }]));
  const add = (tokenType: BalanceTokenType, value: bigint): void => {
    const held = next.get(tokenTypeKey(tokenType));
    next.set(tokenTypeKey(tokenType), { tokenType: held?.tokenType ?? tokenType, value: (held?.value ?? 0n) + value });
  };
  for (const { unshieldedInputs, unshieldedOutputs } of effects) {
    for (const [tokenType, value] of unshieldedInputs) add(tokenType, value);
    for (const [tokenType, value] of unshieldedOutputs) add(tokenType, -value);
  }
  return new Map(Array.from(next.values(), ({ tokenType, value }) => [tokenType, value]));
};

/**
 * A new `contractState` as calls left it: its operations and maintenance authority, their last call's
 * data, and the balance their effects leave. It is built from those parts, so its cost is set by the
 * number of operations, never by the size of the data it replaces. A state object the scope has
 * handed out is never changed.
 */
const contractStateLeftBy = (contractState: ContractState, data: StateValue, effects: readonly CallEffects[]): ContractState => {
  // compact-runtime minted the StateValue and decoded the ContractState, therefore ContractState and
  // ChargedState come from compact-runtime too: a WASM class rejects objects from another copy of
  // onchain-runtime.
  const next = new ContractState();
  for (const name of contractState.operations()) {
    const operation = contractState.operation(name);
    if (operation !== undefined) {
      next.setOperation(name, operation);
    }
  }
  next.maintenanceAuthority = contractState.maintenanceAuthority;
  next.data = new ChargedState(data);
  next.balance = balanceAfter(contractState.balance, effects);
  return next;
};

/**
 * Refuses a call that reaches a private state the scope read through another provider: the scope
 * holds one private state per contract and private state id, and two providers, for two wallets or
 * two handles of one contract, would share it.
 */
export const assertSameProvider = (held: ScopePrivateState, privateStateProvider: PrivateStateProvider | undefined): void => {
  if (privateStateProvider !== undefined && held.privateStateProvider !== undefined && held.privateStateProvider !== privateStateProvider) {
    throw new InvalidArgumentError(
      `The private state '${held.privateStateId}' of contract '${held.contractAddress}' was read in this scoped ` +
        'transaction through another private state provider. A scope holds one private state per contract and ' +
        'private state id, so every call to it must use the provider it was first read through; give each wallet ' +
        'a private state id of its own.'
    );
  }
};

/**
 * Advances, in `publicStates`, every contract a call's tree reached to the state the call left it
 * in: a new state object, so the states the call was built against are left as they were.
 */
export const advancePublicStates = (
  publicStates: Map<string, ScopeContractStates>,
  { calls, statesBuiltAgainst }: Ledger9CallAssembly
): void => {
  // A contract's data is what its last call in the tree left; its balance moves by the effects of
  // each of its calls in the tree, in order.
  const leftIn = new Map<string, { data: StateValue; effects: CallEffects[] }>();
  for (const call of calls) {
    const address = contractAddressKey(call.contractAddress);
    const effects = call.public.partitionedTranscript.flatMap((half) => (half === undefined ? [] : [half.effects]));
    leftIn.set(address, { data: call.public.contractState, effects: [...(leftIn.get(address)?.effects ?? []), ...effects] });
  }
  for (const [address, { data, effects }] of leftIn) {
    const current = publicStates.get(address) ?? statesBuiltAgainst.get(address);
    // A contract the call ran against no known state of is refused when the scope's transaction is
    // assembled, which needs that state too; there is nothing to advance here.
    if (current === undefined) continue;
    publicStates.set(address, { ...current, contractState: contractStateLeftBy(current.contractState, data, effects) });
  }
};
