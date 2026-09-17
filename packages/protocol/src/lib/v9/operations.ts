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
 * What crosses the era boundary here is the OPERATION REGISTRY, not the state. The primary state is
 * deliberately left at its default: a caller that needs the state itself reads it from
 * {@link ContractStatePojo.state}.
 *
 * @param entryPoints The entry points a retained-era contract state declared, as the retained
 * decoder read them.
 * @returns The serialized current-era contract state, carrying those entry points and their keys.
 * @throws ComposeOptionError if no entry point carries a key.
 * @see {@link CrossEraOperationRegistry} for why re-expressing the operations is faithful rather
 * than a substitution, and why the empty registry is refused here rather than one layer down.
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
