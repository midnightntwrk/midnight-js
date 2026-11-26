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
  UnknownLedgerEraError
} from '../../errors';
import type { LedgerEra } from '../../version';

export type { EncodedStateValue };

// The pre-fork `ContractState` statics, injected rather than imported; see InjectedVendorSlices.
export type Ledger8ContractState = Pick<typeof OnchainRuntimeV3.ContractState, 'deserialize'>;

type EnvelopeDecoder = (raw: Uint8Array, ledger8ContractState: Ledger8ContractState) => EncodedStateValue;

// Needs no pre-fork runtime, unlike extractEncodedStateValue.
export const extractLedger9EncodedStateValue = (raw: Uint8Array): EncodedStateValue => {
  try {
    return Ledger9ContractState.deserialize(raw).data.state.encode();
  } catch (cause) {
    throw new StateConversionFailedError('v9 state read', cause);
  }
};

// v8 reads `contract-state[v6]` with onchain-runtime-v3, v9 reads `contract-state[v8]` with
// ledger-v9. Null prototype and frozen; see SharedTableDiscipline.
const ENVELOPE_DECODERS: Readonly<Record<LedgerEra, EnvelopeDecoder>> = Object.freeze(
  Object.assign(Object.create(null) as Record<LedgerEra, EnvelopeDecoder>, {
    v8: (raw: Uint8Array, ledger8ContractState: Ledger8ContractState): EncodedStateValue =>
      ledger8ContractState.deserialize(raw).data.state.encode(),
    // A reference to the standalone decoder, not a second copy of the same
    // read -- see FailClosedDecoding.
    v9: extractLedger9EncodedStateValue
  } satisfies Record<LedgerEra, EnvelopeDecoder>)
);

// The pre-fork runtime is required for every era and checked before decoding; see FailClosedDecoding.
export const extractEncodedStateValue = (
  raw: Uint8Array,
  version: LedgerEra,
  ledger8ContractState: Ledger8ContractState
): EncodedStateValue => {
  const decoder = ENVELOPE_DECODERS[version];
  if (typeof decoder !== 'function') {
    throw new UnknownLedgerEraError(version);
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
