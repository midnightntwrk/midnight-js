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
  DeployResultPojo
} from '../shared/compose-types';
export type { ContractEntryPointPojo, ContractStatePojo } from '../shared/contract-state';
export type { LedgerEra } from './era';

// Both arms are frozen: a memoised era is one object shared by every caller in
// the process, so an unfrozen one lets any consumer reassign `composeCallTx`
// for all the others. The same discipline LEDGER_VERSIONS, PROTOCOL_ERROR_CODES
// and ENVELOPE_DECODERS already apply to their own shared tables.
//
// One memo slot per era, not one shared slot. A shared slot would hand the
// second caller whichever era happened to be asked for first, silently reading
// one era's bytes with the other era's runtime — the exact confusion this
// facade exists to remove.
let v8EraPromise: Promise<LedgerEra> | undefined;
let v9EraPromise: Promise<LedgerEra> | undefined;

/**
 * The v9 arm. Wholly synchronous: `@midnightntwrk/ledger-v9` is this package's
 * current era and is already linked by the package root, so there is nothing
 * to acquire and nothing that can fail here.
 */
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
 * The v8 arm. Acquires the retained pre-fork ledger through {@link loadLedger8}
 * — the only sanctioned runtime path to it — and binds it into closure, so the
 * era's own methods stay synchronous.
 *
 * Hoisting the acquisition here, rather than deferring it into each method, is
 * what makes the two arms symmetrical. It costs a v9-only consumer nothing:
 * asking for the v8 era IS the observation of v8, and nothing reaches this
 * function until someone does.
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
 * per process. A FAILED v8 acquisition is not memoised: the rejection
 * propagates unchanged — already a `Ledger8RuntimeMissingError` carrying the
 * underlying cause — and the next call retries, so a repaired install does not
 * stay broken for the life of the process.
 *
 * Rejects with {@link UnknownLedgerVersionError} when `version` is not a member
 * of `LEDGER_VERSIONS`. A TypeScript caller cannot produce that; it exists for
 * the untyped JavaScript consumers this package also serves, where an era
 * string threaded from an indexer response would otherwise fall through to a
 * plausible-looking non-era. (`../engine/envelope.ts` defends the same input
 * against resolving an inherited `Object.prototype` member, because its
 * dispatch is a lookup table; this one is a closed `switch`, where no string
 * can resolve to anything but a case or the default.)
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
      // Compile-time exhaustiveness, in the style of version.ts's
      // `_allLedgerVersionsAreMapped` and the Merkle walk in
      // `../engine/down-convert.ts`: a new member of LEDGER_VERSIONS stops
      // this assignment type-checking, so the omission is a build failure
      // rather than a review miss. The runtime rejection is not redundant
      // with it — `version` reaches here from untyped callers too.
      const unhandled: never = version;
      return Promise.reject(new UnknownLedgerVersionError(String(unhandled)));
    }
  }
};
