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
import { ContractState as Ledger9ContractState, type EncodedStateValue } from '@midnightntwrk/ledger-v9';

import {
  Ledger8RuntimeInvalidError,
  StateConversionFailedError,
  type StateConversionStage,
  UnknownLedgerVersionError
} from '../../errors';
import type { LedgerVersion } from '../../version';

export type { EncodedStateValue };

/**
 * The pre-fork `ContractState` statics {@link extractEncodedStateValue} needs
 * to read a `contract-state[v6]`-tagged state.
 *
 * @see {@link InjectedVendorSlices} for why this slice is derived from the
 * vendor's own class and narrowed to `deserialize`.
 * @see {@link ModuleGraphAndLazyLoading} for why it is reached by injection
 * rather than by a value import.
 * @see {@link RetainedEraExecution} for the era pin the narrowing carries.
 */
export type Ledger8ContractState = Pick<typeof OnchainRuntimeV3.ContractState, 'deserialize'>;

type EnvelopeDecoder = (raw: Uint8Array, ledger8ContractState: Ledger8ContractState) => EncodedStateValue;

/**
 * Reads the primary {@link EncodedStateValue} out of a raw, serialized
 * post-fork contract state, tagged `contract-state[v8]`.
 *
 * Reachable without a pre-fork runtime, unlike {@link extractEncodedStateValue},
 * which requires one for every era.
 *
 * @param raw The serialized `contract-state[v8]` state.
 * @returns The primary state read out of the serialized state.
 * @throws StateConversionFailedError at stage `'v9 state read'` if the
 * state is malformed, truncated, over-long, or tagged for the other era,
 * carrying the runtime's own diagnosis on `cause`.
 * @see {@link FailClosedDecoding}
 */
export const extractLedger9EncodedStateValue = (raw: Uint8Array): EncodedStateValue => {
  try {
    return Ledger9ContractState.deserialize(raw).data.state.encode();
  } catch (cause) {
    throw new StateConversionFailedError('v9 state read', cause);
  }
};

/**
 * One decoder per {@link LedgerVersion}:
 *
 * - `v9` — a post-fork `contract-state[v8]`-tagged state, read via
 *   `@midnightntwrk/ledger-v9`.
 * - `v8` — a pre-fork `contract-state[v6]`-tagged state, read via
 *   onchain-runtime-v3, the same codec that produced it.
 *
 * A total `Record`, built on a null prototype and frozen -- see the
 * SharedTableDiscipline document.
 */
const ENVELOPE_DECODERS: Readonly<Record<LedgerVersion, EnvelopeDecoder>> = Object.freeze(
  Object.assign(Object.create(null) as Record<LedgerVersion, EnvelopeDecoder>, {
    v8: (raw: Uint8Array, ledger8ContractState: Ledger8ContractState): EncodedStateValue =>
      ledger8ContractState.deserialize(raw).data.state.encode(),
    // A reference to the standalone decoder, not a second copy of the same
    // read -- see FailClosedDecoding.
    v9: extractLedger9EncodedStateValue
  } satisfies Record<LedgerVersion, EnvelopeDecoder>)
);

/**
 * Extracts the primary {@link EncodedStateValue} out of a raw, serialized
 * `ContractState`, using the decoder that matches `version`.
 *
 * @param raw The serialized contract state.
 * @param version The era whose decoder reads `raw`. Validated at runtime, not
 * merely type-checked.
 * @param ledger8ContractState The pre-fork `ContractState` statics. Required
 * for every `version`, not just `'v8'`, and checked before any decoding
 * happens.
 * @returns The primary state read out of the serialized state — never a silently
 * empty or partial one.
 * @throws UnknownLedgerVersionError if `version` is not a member of
 * `LEDGER_VERSIONS`.
 * @throws Ledger8RuntimeInvalidError if `ledger8ContractState` does not carry
 * `deserialize`.
 * @throws StateConversionFailedError at stage `'v8 state read'` or
 * `'v9 state read'` if the state cannot be decoded, carrying the
 * runtime's own diagnosis on `cause`.
 * @see {@link FailClosedDecoding}
 * @see {@link SharedTableDiscipline}
 */
export const extractEncodedStateValue = (
  raw: Uint8Array,
  version: LedgerVersion,
  ledger8ContractState: Ledger8ContractState
): EncodedStateValue => {
  const decoder = ENVELOPE_DECODERS[version];
  if (typeof decoder !== 'function') {
    throw new UnknownLedgerVersionError(String(version));
  }
  if (typeof ledger8ContractState?.deserialize !== 'function') {
    throw new Ledger8RuntimeInvalidError('ContractState.deserialize');
  }

  try {
    return decoder(raw, ledger8ContractState);
  } catch (cause) {
    // THE STAGE IS CHECKED, not just the class: a decoder is injectable, so one
    // that wrapped at a different stage must not pass through -- see
    // FailClosedDecoding.
    const stage: StateConversionStage = `${version} state read`;
    throw cause instanceof StateConversionFailedError && cause.stage === stage
      ? cause
      : new StateConversionFailedError(stage, cause);
  }
};
