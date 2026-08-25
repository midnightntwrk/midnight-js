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

import { ComposeFailedError } from '../errors';
import type { LedgerVersion } from './ledger-version';

/**
 * Resolves a ledger entry-point key to its name.
 *
 * `ContractState.operations()` is declared `Array<string | Uint8Array>`, so a
 * key is not statically a string. In practice both eras decode even a byte-set
 * entry point back to a string (pinned by a test in
 * `engine-deploy-v8.test.ts`), but the declared union has to be resolved
 * somewhere, and decoding is the only resolution that keeps an error message
 * naming the entry point rather than dumping its bytes — which is what
 * `ComposeFailedError` (`../errors.ts`) promises.
 *
 * Lives in a leaf both eras can reach. It used to be an export of the v8 deploy
 * leg, which meant the v9 composition arm imported a v8-named engine module for
 * a `TextDecoder` call.
 */
export const entryPointName = (id: string | Uint8Array): string =>
  typeof id === 'string' ? id : new TextDecoder().decode(id);

/** One verifier key, resolved against the entry point the state actually declares. */
export interface VerifierKeyRegistration {
  /** The entry point as the state declares it — what `setOperation` must be handed. */
  readonly entryPoint: string | Uint8Array;
  /** The resolved name — how `verifierKeys` is keyed, and what an error names. */
  readonly circuitId: string;
  readonly verifierKey: Uint8Array;
}

/**
 * Pairs each supplied verifier key with the entry point the state declares for
 * it, after validating the map against those entry points in BOTH directions:
 *
 * - a key naming an entry point the state does not declare throws
 *   {@link ComposeFailedError} at stage `'deploy-unknown-circuit'`. This
 *   direction matters as much as the other: `setOperation` CREATES a slot
 *   rather than requiring one, so an unchecked stray key (a stale
 *   `keys/*.verifier` from an earlier compiler run) would give the deployed
 *   contract an entry point its source never had and — since the deploy derives
 *   its address from the initial state — silently deploy it at a different
 *   address than the caller's artifacts describe;
 * - a declared entry point with no key in the map throws stage
 *   `'deploy-verifier-key'`, because a ledger rejects a deploy carrying an
 *   unregistered entry point.
 *
 * Together the two make the map and the declared entry points equal sets. They
 * run on resolved NAMES, because that is how the map is keyed, so two declared
 * entry points resolving to one name would make them agree while leaving a slot
 * blank; that case throws stage `'deploy-ambiguous-circuit'` before either
 * check runs.
 *
 * Returns registrations in the map's own order, each carrying the DECLARED
 * entry point rather than its resolved name: `setOperation` handed the name
 * would leave a byte-declared slot blank and create a second, undeclared one
 * beside it.
 *
 * Shared by both eras' deploy legs. It was written out twice, once per leg,
 * with the same three checks in the same order and the same non-null assertion
 * at the end — two copies of one invariant, which is one more than can be kept
 * correct. Resolving the key inside the loop removes the assertion too: the
 * `undefined` branch is the `'deploy-verifier-key'` check, not an unreachable
 * case to assert away.
 */
export const resolveVerifierKeyRegistrations = (
  entryPoints: readonly (string | Uint8Array)[],
  verifierKeys: ReadonlyMap<string, Uint8Array>,
  version: LedgerVersion
): readonly VerifierKeyRegistration[] => {
  const declared = new Map<string, string | Uint8Array>();
  for (const entryPoint of entryPoints) {
    const circuitId = entryPointName(entryPoint);
    if (declared.has(circuitId)) {
      throw new ComposeFailedError(version, 'deploy-ambiguous-circuit', circuitId);
    }
    declared.set(circuitId, entryPoint);
  }

  const registrations: VerifierKeyRegistration[] = [];
  for (const [circuitId, verifierKey] of verifierKeys) {
    const entryPoint = declared.get(circuitId);
    if (entryPoint === undefined) {
      throw new ComposeFailedError(version, 'deploy-unknown-circuit', circuitId);
    }
    registrations.push({ entryPoint, circuitId, verifierKey });
  }

  for (const circuitId of declared.keys()) {
    if (!verifierKeys.has(circuitId)) {
      throw new ComposeFailedError(version, 'deploy-verifier-key', circuitId);
    }
  }

  return registrations;
};
