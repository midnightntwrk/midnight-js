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

/**
 * How a RETAINED-era signing key is carried in the private-state provider,
 * which is the only signing-key storage this framework has and is typed for the
 * CURRENT era's key.
 *
 * The two eras' keys looked like different things and are not. Measured on both
 * runtimes:
 *
 * - the retained `sampleSigningKey()` answers a bare 64-character hex string,
 *   which is 32 bytes;
 * - the current `sampleSigningKey()` answers `{ tag: 'schnorr', value }` whose
 *   `value` is the same 64 characters;
 * - the retained runtime's `signatureVerifyingKey()` accepts a current-era
 *   key's `value` verbatim. MEASURED BY HAND, once, and asserted nowhere in
 *   this repo -- treat it as an observation about the runtimes pinned today,
 *   not as a standing guarantee. Nothing below depends on it: this module only
 *   ever hands the retained runtime a key the retained era produced;
 * - `{ tag: 'schnorr', value: <retained key> }` satisfies `isValidSigningKey`,
 *   which is what the level-backed provider validates imports against. That
 *   last one is re-measured on every run rather than trusted as written here:
 *   `src/test/ledger8-signing-key.test.ts` samples a key from the real
 *   retained runtime and puts the wrapper through the predicate, so a rule
 *   that tightened would fail there instead of losing keys on a restore.
 *
 * So it is one 32-byte Schnorr key in two wrappers, and adding or stripping the
 * wrapper here is the whole of the era crossing. Nothing in `packages/types`,
 * in the provider interface, or in the export/import format changes for it.
 *
 * The retained runtime's own typings describe a `SigningKey` as hex "with a
 * 3-byte version prefix". The sampled key carries no such prefix — 64
 * characters is exactly the 32 bytes and nothing more — so the measurement is
 * what this module is built on, not that sentence.
 */

import type { Ledger8SigningKey } from '@midnight-ntwrk/midnight-js-protocol';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';

import { type BreadcrumbSink, emitRetainedSigningKeyEntry } from './breadcrumbs';

/**
 * The signature kind a retained-era key is, and the only kind that may be read
 * back out as one.
 */
const RETAINED_SIGNING_KEY_TAG: SigningKey['tag'] = 'schnorr';

/**
 * How many hex characters a retained-era key is: 32 bytes, so 64.
 *
 * Its own rule rather than {@link isValidSigningKey}'s, which is the
 * IMPORT-FORMAT rule and admits any even-length hex string of six characters or
 * more. A 62-character entry -- a truncated or half-written one -- passes that
 * predicate, and `signatureVerifyingKey()` on it answers a maintenance
 * authority nobody holds, with nothing erroring at any stage.
 *
 * The number is MEASURED rather than declared: `src/test/ledger8-signing-key.test.ts`
 * samples a key from a retained runtime and asserts its length against this
 * constant, so a sampler that changed length fails there.
 */
export const RETAINED_SIGNING_KEY_HEX_LENGTH = 64;

/**
 * Wraps a retained-era key in the shape `PrivateStateProvider.setSigningKey`
 * takes.
 *
 * THE SLOT IS SHARED WITH THE CURRENT ERA, and this wrapper cannot separate
 * them. Both eras sample `schnorr`, and both arms write ONE address-keyed slot,
 * so a stored entry does not record which era wrote it. An address whose slot
 * the current-era arm filled -- it SAMPLES a fresh key when it finds none --
 * would be read back by the retained arm as that contract's authority, when it
 * is a key the chain never heard of.
 *
 * What stands between the two today is an ORDERING and not a guard:
 * `find-deployed-contract.ts` runs `verifyContractState` BEFORE it reaches the
 * signing-key rule, so a current-era artifact pointed at a retained contract's
 * address fails verification first and never reaches the sample-and-store. Move
 * the key rule ahead of the verification and the confusion becomes reachable.
 *
 * DOCUMENTED rather than fixed here on purpose: an address-prefixed record, or
 * any other change to the stored shape, changes what
 * `exportSigningKeys`/`importSigningKeys` round-trip, and that is its own change
 * with its own compatibility story.
 *
 * @param signingKey The retained-era key to store.
 * @returns The same key, as the store's structured key.
 */
export const toStoredLedger8SigningKey = (signingKey: Ledger8SigningKey): SigningKey => ({
  tag: RETAINED_SIGNING_KEY_TAG,
  value: signingKey
});

/**
 * Reads a stored entry back as the bare string the retained runtime takes, or
 * reports ABSENT for an entry this framework did not write.
 *
 * TWO ways an entry is not this era's key, and both read as absent:
 *
 * - the OTHER SIGNATURE KIND. One store holds both eras' keys under the same
 *   addresses, and the current era's may legitimately be `ecdsa` —
 *   {@link isValidSigningKey} admits both kinds. Unwrapped without the check,
 *   an `ecdsa` key's `value` would be handed to the retained runtime and built
 *   into a maintenance authority whose verifying key nobody holds, with
 *   nothing erroring at any stage.
 * - a VALUE that is not a retained-era key's. TWO rules, because one does not
 *   cover the other: {@link isValidSigningKey} is the shape the level-backed
 *   provider validates an IMPORT against, so an entry this read admits is one a
 *   restore will too -- but it is the import-format rule and admits any
 *   even-length hex of six characters or more, which a truncated 62-character
 *   entry satisfies. {@link RETAINED_SIGNING_KEY_HEX_LENGTH} is this era's own
 *   rule, and without it `signatureVerifyingKey()` on such an entry answers an
 *   authority nobody holds, silently.
 *
 * ABSENT rather than a throw, and that is a deliberate choice about blast
 * radius. This read sits on `findDeployedContract`, whose result is used to
 * call circuits; the retained arm exposes no maintenance interface, so nothing
 * on that path consumes the key. A throw here would fail every attach to the
 * address — circuit calls included — over a value none of them reads. The
 * caller's remedy is unchanged: supply the retained key on the attach options,
 * or remove the entry with `privateStateProvider.removeSigningKey(address)`.
 *
 * Absent must not mean SILENT, so each case emits a breadcrumb. The breadcrumb
 * names the member and the address and never the stored value: the value is
 * secret material, and a log line is read by more people than a return value
 * is.
 *
 * @param stored The entry the private-state provider returned.
 * @param contractAddress The address it was stored against, carried on the
 * breadcrumb so an operator knows which entry to correct.
 * @param sink The configured logger, or `undefined`.
 * @returns The retained-era key, or `undefined` for an entry that is not one.
 */
export const fromStoredLedger8SigningKey = (
  stored: SigningKey,
  contractAddress: string,
  sink: BreadcrumbSink | undefined
): Ledger8SigningKey | undefined => {
  if (stored.tag !== RETAINED_SIGNING_KEY_TAG) {
    emitRetainedSigningKeyEntry(sink, contractAddress, 'other-signature-kind');
    return undefined;
  }
  // The WHOLE entry through `isValidSigningKey`, and not just its value: that is
  // the rule the level-backed provider validates an import against, so an entry
  // this read admits is one a restore will too. The length is checked SEPARATELY
  // because that rule is the import format's and not this era's -- see above.
  if (!isValidSigningKey(stored) || stored.value.length !== RETAINED_SIGNING_KEY_HEX_LENGTH) {
    emitRetainedSigningKeyEntry(sink, contractAddress, 'malformed-value');
    return undefined;
  }
  return stored.value;
};
