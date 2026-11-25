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
  type EncPublicKey,
  type LedgerParameters,
  type UnprovenTransaction
} from '@midnightntwrk/midnight-js-protocol/v9';
import type { ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import { type MidnightConfig } from '@midnightntwrk/midnight-js-types';

import {
  assertWithinTimeToDismiss,
  callName,
  guaranteedWhole,
  isWhollyFallible,
  refuseFallibleCalls,
  refuseFallibleTransaction
} from './ledger9-scope-checks';
import { oneTimeKeyMapping, type OneTimeKeys } from './ledger9-scope-one-time-keys';
import {
  contractAddressKey,
  type Ledger9CallAssembly,
  mergedMappings,
  type ScopeContractStates
} from './ledger9-scope-states';
import { assertZswapStateOfWallet, createEncryptionPublicKeyResolver, createUnprovenLedgerCallTx } from './utils';

/**
 * Whether a scope of `callCount` calls must land whole or not at all: from two calls. A scope of one
 * call is built, checked and submitted as that call made alone.
 */
export const landsWhole = (callCount: number): boolean => callCount >= 2;

type ContractCall = ContractExecutable.ContractExecutable.ContractCall;

/**
 * Assembles ONE unproven transaction from the calls of a ledger 9 scope, in the order they were made.
 *
 * Every call's proof data goes into one intent, so the ledger applies the calls in the order of the
 * scope: circuits in the order they were called, each circuit's calls together, a caller before the
 * callees it claims. The ledger applies the guaranteed halves of all the calls first, in that order,
 * each on the state the one before it left, and a call's fallible half after every guaranteed half:
 * a call wholly in the guaranteed half runs on the state the calls before it left. The intent's
 * segment does not change that order, which is why the transaction is still placed at a random
 * segment. The offers are
 * built over every call, and what the calls' transcripts claim is checked against the transaction
 * over every call, before anything is proven. A scope of one call assembles exactly what that call's
 * own build assembles.
 *
 * A scope of two or more calls lands whole or not at all, so its transaction has no fallible half: a
 * call tree placed wholly in the fallible half is moved whole into the guaranteed half
 * ({@link guaranteedWhole}), and any fallible transcript, fallible coins or fallible unshielded offer
 * left is refused before anything is proven. Given ledger parameters, its transaction is then priced
 * against the time to dismiss under them ({@link assertWithinTimeToDismiss}), naming each call moved.
 *
 * Each contract's state is answered from the state the first call that reached it ran against: the
 * transaction reads only its operations and the Zswap chain state, which no call of the scope changes.
 *
 * The coins the calls create are encrypted with the wallet keys of every call and the mappings of
 * the scope and of every call, merged; each call's coins are checked to be its own wallet's, as each
 * call's own build checks them.
 *
 * Given one-time keys, every coin a call makes for their coin key is spent again inside the
 * transaction as a transient, for one call as for many, and their coin key is mapped to their own
 * encryption key.
 *
 * @internal
 * @param assemblies What each call of the scope left for assembly, in the order the calls were made.
 * @param config The network the transaction is built for and how long it stays valid.
 * @param scopeMappings The coin key to encryption key mappings of the scope's options.
 * @param oneTimeKeys The one-time keys of the scope's options, with the scope's wallet key.
 * @param ledgerParameters The ledger parameters a scope of two or more calls is priced under; with
 *        none, it is not priced.
 * @throws Ledger9ScopeFalliblePartError if a scope of two or more calls would have a fallible part.
 * @throws Ledger9ScopeOutsideTimeToDismissError if a scope of two or more calls, given ledger parameters,
 *         costs more to dismiss than its size allows.
 * @throws InvalidArgumentError if there are no calls, if what the transcripts claim of contract
 *         calls or unshielded payments does not match the transaction, or if the one-time keys are a
 *         wallet's own or spend no coin the calls make.
 * @throws ZswapOutputResolutionError if a call's coins are not its wallet's, if a coin key is mapped
 *         to two encryption keys (a wallet's own and the one-time keys' own included), or if what
 *         the transcripts claim of shielded coins does not match the offers.
 */
export const assembleLedger9CallTx = (
  assemblies: readonly Ledger9CallAssembly[],
  config: MidnightConfig,
  scopeMappings?: ReadonlyMap<CoinPublicKey, EncPublicKey>,
  oneTimeKeys?: OneTimeKeys,
  ledgerParameters?: LedgerParameters
): UnprovenTransaction => {
  const [first] = assemblies;
  if (first === undefined) {
    throw new InvalidArgumentError('No calls were submitted.');
  }
  const { networkId, coinPublicKey, walletEncryptionPublicKey } = first.encryption;
  const callMappings = assemblies.map(({ encryption }) => encryption.additionalCoinEncPublicKeyMappings);
  const oneTimeMapping =
    oneTimeKeys === undefined
      ? undefined
      : oneTimeKeyMapping(
          oneTimeKeys,
          networkId,
          assemblies.map(({ encryption }) => encryption.coinPublicKey)
        );
  const mappings = mergedMappings(
    networkId,
    [
      ...assemblies.map(({ encryption }) => new Map([[encryption.coinPublicKey, encryption.walletEncryptionPublicKey]])),
      oneTimeMapping,
      scopeMappings,
      ...callMappings
    ],
    new Set(oneTimeMapping?.keys())
  );
  // Each call's coins are checked against its wallet's coin key, as each call's own build checks them.
  for (const { encryption } of assemblies) {
    assertZswapStateOfWallet(encryption.networkId, encryption.zswapLocalState, encryption.coinPublicKey);
  }
  const builtAgainst = (
    address: ContractCall['contractAddress']
  ): ScopeContractStates | undefined =>
    assemblies
      .find(({ statesBuiltAgainst }) => statesBuiltAgainst.has(contractAddressKey(address)))
      ?.statesBuiltAgainst.get(contractAddressKey(address));
  // A scope of one call passes that call's own list: its build takes exactly the inputs its own build takes.
  const whole = landsWhole(assemblies.length);
  const calls = whole ? assemblies.flatMap((assembly) => guaranteedWhole(assembly.calls)) : first.calls;
  if (whole) {
    refuseFallibleCalls(calls);
  }
  const tx = createUnprovenLedgerCallTx(
    calls,
    (address) => builtAgainst(address)?.contractState,
    (address) => builtAgainst(address)?.zswapChainState,
    createEncryptionPublicKeyResolver(networkId, coinPublicKey, walletEncryptionPublicKey, mappings),
    config,
    oneTimeKeys?.keys
  );
  if (whole) {
    refuseFallibleTransaction(tx, 'unproven');
    if (ledgerParameters !== undefined) {
      // Each moved tree is named by its root, its last call; a moved tree has a transcript, so it has a root.
      const moved = assemblies.filter((assembly) => isWhollyFallible(assembly.calls));
      assertWithinTimeToDismiss(tx, ledgerParameters, moved.map(({ calls: tree }) => callName(tree[tree.length - 1])));
    }
  }
  return tx;
};
