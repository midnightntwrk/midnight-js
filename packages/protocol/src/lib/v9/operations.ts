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

import { ComposeOptionError } from '../../errors';
import type { ContractEntryPointPojo } from '../shared/contract-state';

/**
 * Re-expresses a retained-era contract's entry points as a CURRENT-era contract state.
 *
 * WHY THIS EXISTS. The fork does not rewrite a contract's stored state: a contract deployed before
 * it and dormant across it is served, indefinitely, carrying its retained-era envelope. The current
 * ledger's composer cannot deserialize those bytes — it accepts only its own envelope — so a
 * keep-state call had nothing to hand it and could not be composed at all.
 *
 * WHAT THE COMPOSER ACTUALLY WANTS. The `contractState` a composition takes is NOT the state being
 * proven. `assembleCallPrototype` uses it for exactly one thing: looking up the `ContractOperation`
 * for the circuit, to read its verifier key. The state the call is bound to travels separately, as
 * the transcript's `preState`. So what has to cross the era boundary here is the OPERATION
 * REGISTRY, not the state.
 *
 * WHY THIS IS FAITHFUL, NOT A SUBSTITUTION. The verifier keys come from the chain's own state, read
 * through the retained decoder, and the caller has already checked its local artifact against them.
 * The current ledger models retained-era operations natively — `ContractOperationVersion` carries a
 * `'v3'` arm precisely for them — so a key preserved across the fork is a value this ledger is built
 * to hold. Nothing is minted here: every key written out is one the chain already holds.
 *
 * The primary state is deliberately left at its default. A caller that needed the state itself would
 * be reading it from {@link ContractStatePojo.state}, not from this registry.
 *
 * @param entryPoints The entry points a retained-era contract state declared, as the retained
 * decoder read them.
 * @returns The serialized current-era contract state, carrying those entry points and their keys.
 * @throws ComposeOptionError if no entry point carries a key, since the registry would then answer
 * for nothing and the composer's own refusal would name a circuit rather than the empty state.
 */
export const reexpressOperationsForCurrentEra = (entryPoints: readonly ContractEntryPointPojo[]): Uint8Array => {
  const state = new ledgerV9.ContractState();
  let registered = 0;

  for (const entryPoint of entryPoints) {
    // A blank slot is carried as `undefined` rather than as empty bytes -- see the fail-closed
    // decoding note on ContractEntryPointPojo. Skipped rather than refused one by one: if the
    // circuit being called is the one missing a key, the composer names it precisely, and a
    // contract may legitimately declare an entry point this call does not touch.
    if (entryPoint.verifierKey === undefined) {
      continue;
    }
    const operation = new ledgerV9.ContractOperation();
    operation.verifierKey = entryPoint.verifierKey;
    state.setOperation(entryPoint.circuitId, operation);
    registered += 1;
  }

  if (registered === 0) {
    throw new ComposeOptionError('v9', 'contractState');
  }

  return state.serialize();
};
