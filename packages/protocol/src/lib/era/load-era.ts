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

import { UnknownLedgerVersionError } from '../../errors';
import { decodeContractStateWith, extractStateWith } from '../shared/contract-state';
import type { LedgerVersion } from '../shared/ledger-version';
import { composeEraV8CallTx, composeEraV8DeployTx } from '../v8/adapt';
import { loadLedger8 } from '../v8/load';
import { composeV9CallTx, composeV9DeployTx } from '../v9/compose';
import { extractEncodedStateValue, extractV9EncodedStateValue } from './envelope';
import type { LedgerEra } from './era';

export type {
  CallTranscriptSource,
  ComposeCallEntry,
  ComposeCallOptions,
  ComposeDeployOptions,
  DeployResultPojo,
  PartitionContext
} from '../shared/compose-types';
export type { ContractEntryPointPojo, ContractStatePojo } from '../shared/contract-state';
export type { LedgerEra } from './era';

// One memo slot per era, never one shared slot, and both arms are frozen --
// see SharedTableDiscipline and EraSeam.
let v8EraPromise: Promise<LedgerEra> | undefined;
let v9EraPromise: Promise<LedgerEra> | undefined;

/** The v9 arm. Wholly synchronous -- see the EraSeam document. */
const createV9Era = (): LedgerEra => {
  const era: LedgerEra = {
    version: 'v9',
    extractState: (raw) => extractStateWith(raw, 'v9', extractV9EncodedStateValue),
    decodeContractState: (raw) => decodeContractStateWith(raw, 'v9', ledgerV9),
    composeCallTx: composeV9CallTx,
    composeDeployTx: composeV9DeployTx
  };

  return Object.freeze(era);
};

/**
 * The v8 arm. Acquires the retained pre-fork ledger and binds it into closure,
 * so the era's own methods stay synchronous -- see the EraSeam document for why
 * the acquisition is hoisted here.
 */
const createV8Era = async (): Promise<LedgerEra> => {
  const v8 = await loadLedger8();

  const era: LedgerEra = {
    version: 'v8',
    extractState: (raw) => extractStateWith(raw, 'v8', (bytes) => extractEncodedStateValue(bytes, 'v8', v8.ContractState)),
    decodeContractState: (raw) => decodeContractStateWith(raw, 'v8', v8),
    composeCallTx: (options) => composeEraV8CallTx(options, v8),
    composeDeployTx: (options) => composeEraV8DeployTx(options, v8)
  };

  return Object.freeze(era);
};

/**
 * Resolves one ledger era to a {@link LedgerEra} bound to it.
 *
 * This is the only sanctioned way to reach either era's operations. Pass the
 * version resolved from a record or from the network head (see
 * `protocolVersionToLedger` in `../../version.ts`) rather than a string chosen
 * by hand.
 *
 * Memoised per era, so the retained pre-fork WASM is instantiated at most once
 * per process. A FAILED v8 acquisition is not memoised: the next call retries.
 *
 * @param version The era to resolve.
 * @returns The era facade bound to `version`. The same object on every call
 * for that era, and frozen.
 * @throws UnknownLedgerVersionError — as a rejection — if `version` is not a
 * member of `LEDGER_VERSIONS`.
 * @throws Ledger8RuntimeMissingError — as a rejection — if the retained
 * pre-fork runtime cannot be acquired. It propagates unchanged, carrying the
 * underlying cause.
 * @see {@link EraSeam}
 * @see {@link SharedTableDiscipline}
 */
export const loadLedgerEra = (version: LedgerVersion): Promise<LedgerEra> => {
  switch (version) {
    case 'v9':
      return (v9EraPromise ??= Promise.resolve(createV9Era()));
    case 'v8':
      return (v8EraPromise ??= createV8Era().catch((error: unknown) => {
        v8EraPromise = undefined;
        throw error;
      }));
    default: {
      // `const unhandled: never` is a compile-time exhaustiveness gate, and the
      // runtime rejection is not redundant with it -- see SharedTableDiscipline.
      const unhandled: never = version;
      return Promise.reject(new UnknownLedgerVersionError(String(unhandled)));
    }
  }
};
