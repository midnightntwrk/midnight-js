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

import type { ContractState as OnchainContractStateV3 } from '@midnight-ntwrk/onchain-runtime-v3';
import { ContractState as LedgerContractStateV9, type EncodedStateValue } from '@midnightntwrk/ledger-v9';

import { DownConvertFailedError } from '../../errors';
import { LEDGER_VERSIONS, type LedgerVersion } from '../../version';

export type { EncodedStateValue };

/**
 * The pre-fork `ContractState` statics {@link extractEncodedStateValue} needs
 * to read a `contract-state[v6]` envelope.
 *
 * Injected rather than imported as a value for the same reason
 * `Ledger8CompactRuntime` is: every pre-fork package must reach this process
 * through `loadLedger8()`'s lazy acquisition path, so that a v9-only consumer
 * never links the retained pre-fork WASM. A value import here would statically
 * link it into whatever bundle reaches this module; the type-only import above
 * is erased and links nothing. The `dist-laziness` suite holds that line.
 */
export interface Ledger8ContractState {
  readonly deserialize: (raw: Uint8Array) => OnchainContractStateV3;
}

/**
 * One decoder per {@link LedgerVersion}. A `Record` rather than a ternary so
 * that adding a member to `LEDGER_VERSIONS` fails to compile here instead of
 * silently routing the new era's bytes to the pre-fork decoder — the same
 * discipline `version.ts` applies to its own mapping tables.
 *
 * - `v9` — a post-fork `contract-state[v8]`-tagged envelope, read via
 *   `@midnightntwrk/ledger-v9`.
 * - `v8` — a pre-fork `contract-state[v6]`-tagged envelope, read via
 *   `@midnight-ntwrk/onchain-runtime-v3`, the same codec that produced it
 *   (`compact-runtime@0.16` re-exports that package's `ContractState`
 *   unchanged).
 */
const ENVELOPE_DECODERS = {
  v8: (raw: Uint8Array, ledger8ContractState: Ledger8ContractState): EncodedStateValue =>
    ledger8ContractState.deserialize(raw).data.state.encode(),
  v9: (raw: Uint8Array): EncodedStateValue => LedgerContractStateV9.deserialize(raw).data.state.encode()
} as const satisfies Record<LedgerVersion, (raw: Uint8Array, ledger8ContractState: Ledger8ContractState) => EncodedStateValue>;

/**
 * Extracts the primary {@link EncodedStateValue} out of a raw, serialized
 * `ContractState` envelope, using the decoder that matches `version`.
 *
 * Never returns a silently empty or partial state: any deserialization
 * failure (malformed bytes, a truncated or over-long payload, or an envelope
 * tagged for the other ledger version) is wrapped in a
 * {@link DownConvertFailedError} with `{ cause }`, so failures propagate
 * loudly instead of producing a misleading result. The wrapped cause carries
 * the runtime's own diagnosis, which distinguishes a tag mismatch from
 * truncated, trailing, or empty bytes.
 *
 * `ledger8ContractState` is required for every `version`, not just `'v8'`:
 * making it optional would let a caller reach the `v8` branch with
 * `undefined` and fail with a `TypeError` instead of at the call site.
 *
 * The decoder is looked up as an own property. `version` is typed, but this
 * function sits behind the public `Ledger8Engine.extractState`, so an untyped
 * JavaScript consumer — or a version threaded from an indexer response — can
 * reach it with any string. A bare index would resolve `Object.prototype`
 * members and return their result as if it were state.
 */
export const extractEncodedStateValue = (
  raw: Uint8Array,
  version: LedgerVersion,
  ledger8ContractState: Ledger8ContractState
): EncodedStateValue => {
  if (!Object.hasOwn(ENVELOPE_DECODERS, version)) {
    throw new DownConvertFailedError(
      'envelope extraction',
      new Error(`Unknown ledger version '${String(version)}'. Supported versions: ${LEDGER_VERSIONS.join(', ')}.`)
    );
  }
  try {
    return ENVELOPE_DECODERS[version](raw, ledger8ContractState);
  } catch (cause) {
    throw new DownConvertFailedError(`${version} envelope extraction`, cause);
  }
};
