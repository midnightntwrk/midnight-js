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

import { DownConvertFailedError, Ledger8RuntimeInvalidError, UnknownLedgerVersionError } from '../../errors';
import type { LedgerVersion } from '../../version';

export type { EncodedStateValue };

/**
 * The pre-fork `ContractState` statics {@link extractEncodedStateValue} needs
 * to read a `contract-state[v6]` envelope.
 *
 * Injected rather than imported as a value for the same reason
 * `Ledger8CompactRuntime` is: a value import would statically link the
 * retained pre-fork WASM into whatever bundle reaches this module, so a
 * v9-only consumer would pay for a runtime it never calls. The type-only
 * import above is erased and links nothing, leaving the pre-fork packages to
 * reach this process through a lazy acquisition path the caller owns.
 *
 * Nothing enforces this yet. The `dist-laziness` suite asserts the absence of
 * a static pre-fork link in `dist/index.js`, but no build entry reaches
 * `lib/engine/*` on this branch, so these modules are not bundled at all and a
 * value import here would not fail it. That suite starts covering this module
 * when the PR that surfaces the engine adds its build entry; until then the
 * erased `import type` is a convention, not a checked constraint.
 */
export interface Ledger8ContractState {
  readonly deserialize: (raw: Uint8Array) => OnchainContractStateV3;
}

type EnvelopeDecoder = (raw: Uint8Array, ledger8ContractState: Ledger8ContractState) => EncodedStateValue;

/**
 * Reads the primary {@link EncodedStateValue} out of a raw, serialized
 * post-fork `contract-state[v8]` envelope.
 *
 * Split out of {@link extractEncodedStateValue}'s decoder table so the v9 read
 * is reachable without a pre-fork runtime. The dispatching entry requires that
 * runtime for every version on purpose — it is what stops a v9 caller drifting
 * into a v8 read with nothing to decode it — but that requirement is not the
 * v9 decode's own, and a v9-only consumer should not have to instantiate
 * multi-megabyte pre-fork WASM to read a state its own era wrote.
 *
 * Owns the same wrapping the dispatching entry applies: a rejected envelope
 * (malformed, truncated, over-long, or tagged for the other era) leaves as a
 * {@link DownConvertFailedError} at stage `'v9 envelope extraction'`, carrying
 * the runtime's own diagnosis on `cause`. The dispatching entry delegates here
 * rather than decoding again, so a failure is wrapped exactly once.
 */
export const extractV9EncodedStateValue = (raw: Uint8Array): EncodedStateValue => {
  try {
    return LedgerContractStateV9.deserialize(raw).data.state.encode();
  } catch (cause) {
    throw new DownConvertFailedError('v9 envelope extraction', cause);
  }
};

/**
 * One decoder per {@link LedgerVersion}. A `Record` rather than a ternary so
 * that adding a member to `LEDGER_VERSIONS` fails to compile here instead of
 * silently routing the new era's bytes to the pre-fork decoder — the same
 * discipline `version.ts` applies to its own mapping tables.
 *
 * - `v9` — a post-fork `contract-state[v8]`-tagged envelope, read via
 *   `@midnightntwrk/ledger-v9`.
 * - `v8` — a pre-fork `contract-state[v6]`-tagged envelope, read via
 *   onchain-runtime-v3, the same codec that produced it.
 *
 * Built on a null prototype, and frozen. Both matter: this table is indexed by
 * a value that is only type-checked for TypeScript callers, and a plain object
 * literal resolves an unexpected key through `Object.prototype` — `'constructor'`
 * would hand the caller's own raw bytes straight back, and `'toString'` would
 * return `'[object Undefined]'` (the inherited method is read into a local and
 * called bare, so its `this` is `undefined` under ESM strict mode, not the
 * table). Both are typed as an `EncodedStateValue` and neither throws. The
 * freeze matches the discipline
 * `errors.ts` applies to its own tables: the one table whose mutation would
 * reroute contract-state bytes to the wrong era's codec should not be the one
 * left writable.
 */
const ENVELOPE_DECODERS: Readonly<Record<LedgerVersion, EnvelopeDecoder>> = Object.freeze(
  Object.assign(Object.create(null) as Record<LedgerVersion, EnvelopeDecoder>, {
    v8: (raw: Uint8Array, ledger8ContractState: Ledger8ContractState): EncodedStateValue =>
      ledger8ContractState.deserialize(raw).data.state.encode(),
    // A reference to the standalone decoder, not a second copy of the same
    // read: the two must not be able to drift apart, and the wrapping it
    // already owns is why the dispatch below re-wraps nothing it raises.
    v9: extractV9EncodedStateValue
  } satisfies Record<LedgerVersion, EnvelopeDecoder>)
);

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
 * `ledger8ContractState` is required for every `version`, not just `'v8'`,
 * and is checked before any decoding happens. Both halves matter: requiring it
 * unconditionally keeps a v9 caller from drifting into a v8 call that has no
 * runtime to reach for, and checking it turns the omission into
 * {@link Ledger8RuntimeInvalidError} instead of a `TypeError` wrapped as a
 * {@link DownConvertFailedError} — which would name an extraction stage and
 * point the caller at input bytes that are not the problem.
 *
 * `version` is validated before it is used, rather than trusted from the type
 * signature. TypeScript cannot vouch for it here: this function sits behind
 * the public `Ledger8Engine.extractState`, so an untyped JavaScript consumer —
 * or a version threaded from an indexer response — can reach it with any
 * string. Validating first is also what keeps `stage` inside its closed union:
 * it is built from `version`, so an unvalidated string would otherwise reach a
 * field whose whole contract is that consumers can `switch` on it.
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
    // Already coded, and already naming this exact stage: the v9 decoder wraps
    // its own failure. Re-wrapping would bury the runtime's diagnosis one
    // level deeper for no gain.
    throw cause instanceof DownConvertFailedError
      ? cause
      : new DownConvertFailedError(`${version} envelope extraction`, cause);
  }
};
