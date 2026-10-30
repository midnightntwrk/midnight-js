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
 *   key's `value` verbatim. The retained path DEPENDS on this: a caller's
 *   `{ tag: 'schnorr', value }` key on a deploy or an authority replacement is
 *   handed to the retained runtime whichever runtime sampled it. It is
 *   asserted end to end, not here: `governance.v8era.it.test.ts` in
 *   testkit-js-e2e and the Hard fork lane both sign on the retained path with a
 *   key the current runtime sampled;
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
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';

import { Ledger8SigningKeyError } from '../errors';
import { type BreadcrumbSink, emitLedger8SigningKeyEntry } from './breadcrumbs';

/**
 * The signature kind a retained-era key is, and the only kind that may be read
 * back out as one.
 */
const LEDGER8_SIGNING_KEY_TAG: SigningKey['tag'] = 'schnorr';

/**
 * How many hex characters a retained-era key is: 32 bytes, so 64.
 *
 * Its own rule rather than only {@link isValidSigningKey}'s, which is the
 * IMPORT-FORMAT rule shared with the current era. Both answer 64 today; this
 * one is the retained era's, so a change to the shared rule cannot widen what
 * this read admits. A 62-character entry -- a truncated or half-written one --
 * would otherwise make `signatureVerifyingKey()` answer a maintenance authority
 * nobody holds, with nothing erroring at any stage.
 *
 * The number is MEASURED rather than declared: `src/test/ledger8-signing-key.test.ts`
 * samples a key from a retained runtime and asserts its length against this
 * constant, so a sampler that changed length fails there.
 */
export const LEDGER8_SIGNING_KEY_HEX_LENGTH = 64;

/**
 * Wraps a retained-era key in the shape `PrivateStateProvider.setSigningKey`
 * takes.
 *
 * THE SLOT IS SHARED WITH THE CURRENT ERA, and this wrapper cannot separate
 * them. Both eras sample `schnorr`, and both paths write ONE address-keyed slot,
 * so a stored entry does not record which era wrote it. An address whose slot
 * the current-era path filled -- it SAMPLES a fresh key when it finds none --
 * would be read back by the retained path as that contract's authority, when it
 * is a key the chain never heard of.
 *
 * This is REACHABLE. Recompiled current-era artifacts pass `verifyContractState`
 * against a contract deployed before the fork, so a current-era find on a store
 * that holds no key for that address samples one and stores it, as it does for
 * any contract. The retained path then reports that key as `signingKey`, and the
 * value it reports is not the contract's authority. A maintenance update through
 * the retained handle signs nothing with it: the engine finds the key outside the
 * authority's committee and refuses with `MaintenanceAuthorityMismatchError`
 * before anything is signed or proven. A key the pre-fork deploy stored is never
 * replaced: the current era samples only into an empty slot.
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
  tag: LEDGER8_SIGNING_KEY_TAG,
  value: signingKey
});

/**
 * Why a structured key is not a retained-era key, or `undefined` when it is one.
 *
 * The ONE rule both directions apply: {@link fromStoredLedger8SigningKey}, which
 * reports an unusable stored entry as absent, and {@link requireLedger8SigningKey}, which refuses a
 * key a caller supplied.
 */
const unusableLedger8SigningKey = (key: SigningKey): 'other-signature-kind' | 'malformed-value' | undefined => {
  if (key.tag !== LEDGER8_SIGNING_KEY_TAG) {
    return 'other-signature-kind';
  }
  // The WHOLE entry through `isValidSigningKey`, and not just its value: that is
  // the rule the level-backed provider validates an import against, so an entry
  // this read admits is one a restore will too. The length is checked SEPARATELY
  // because that rule is the import format's and not this era's -- see
  // `fromStoredLedger8SigningKey`.
  if (!isValidSigningKey(key) || key.value.length !== LEDGER8_SIGNING_KEY_HEX_LENGTH) {
    return 'malformed-value';
  }
  return undefined;
};

/**
 * Reads a stored entry back as the bare string the retained runtime takes, or
 * reports ABSENT for an entry that is not a retained-era key.
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
 *   restore will too -- but it is the import-format rule, shared with the
 *   current era. {@link LEDGER8_SIGNING_KEY_HEX_LENGTH} is this era's own
 *   rule, and without it `signatureVerifyingKey()` on such an entry answers an
 *   authority nobody holds, silently.
 *
 * ABSENT rather than a throw, and that is a deliberate choice about blast
 * radius. This read sits on `findDeployedContract`, whose result is used to
 * call circuits, and a circuit call never reads the key. A throw here would
 * fail every attach to the address — circuit calls included — over a value
 * none of them reads. The maintenance interfaces on the same handle DO read it,
 * and there a missing, unusable or unreadable entry is a refusal,
 * `Ledger8SigningKeyError` with reason `'unavailable'`, not an absence. The caller's remedy is
 * unchanged: supply the retained key on the attach options, or remove the entry
 * with `privateStateProvider.removeSigningKey(address)`.
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
  const unusable = unusableLedger8SigningKey(stored);
  if (unusable !== undefined) {
    emitLedger8SigningKeyEntry(sink, contractAddress, unusable);
    return undefined;
  }
  return stored.value;
};

/**
 * Unwraps a key a CALLER supplied into the bare string the retained runtime
 * takes, refusing one the retained era cannot sign with.
 *
 * The public surface types a retained-era key as the current era's
 * `{ tag, value }`, so a caller holds one key shape in both eras. This is where
 * that shape crosses into the retained era, and the only place it does.
 *
 * @param signingKey The key the caller supplied.
 * @param contractAddress The address it was supplied for, or `undefined` for a
 * deploy, which has none yet.
 * @returns The retained-era key.
 * @throws Ledger8SigningKeyError with reason `'unusable'` If the key is not a `schnorr` key of
 * {@link LEDGER8_SIGNING_KEY_HEX_LENGTH} hex characters. The key is not rendered.
 */
export const requireLedger8SigningKey = (
  signingKey: SigningKey,
  contractAddress: string | undefined
): Ledger8SigningKey => {
  if (unusableLedger8SigningKey(signingKey) !== undefined) {
    throw new Ledger8SigningKeyError('unusable', contractAddress);
  }
  return signingKey.value;
};
