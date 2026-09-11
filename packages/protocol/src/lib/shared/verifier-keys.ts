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

import { ComposeFailedError } from '../../errors';
import type { LedgerVersion } from './ledger-version';

/**
 * Resolves a ledger entry-point key to its name.
 *
 * @param id The entry point as the state declares it — already a string, or
 * the bytes a byte-declared entry point carries.
 * @returns `id` itself when it is a string, otherwise its UTF-8 decoding.
 * @see {@link VerifierKeys}
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
 * every key must name a declared entry point, and every declared entry point
 * must have a key.
 *
 * @param entryPoints The entry points the state declares, as `operations()`
 * returns them.
 * @param verifierKeys Entry-point name -> raw, tagged verifier key bytes.
 * @param version The era every failure raised here names.
 * @returns One registration per supplied key, in the map's own order, each
 * carrying the DECLARED entry point rather than its resolved name — which is
 * what `setOperation` must be handed.
 * @throws ComposeFailedError at stage `'deploy-ambiguous-circuit'` when two
 * declared entry points resolve to the same name. Checked before either
 * direction below.
 * @throws ComposeFailedError at stage `'deploy-unknown-circuit'` when a key
 * names an entry point the state does not declare.
 * @throws ComposeFailedError at stage `'deploy-verifier-key'` when a declared
 * entry point has no key in the map.
 * @see {@link VerifierKeys}
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
