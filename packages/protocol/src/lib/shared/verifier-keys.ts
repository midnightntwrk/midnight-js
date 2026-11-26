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
import type { LedgerEra } from './ledger-version';

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

// Validates the key map against the declared entry points in both directions; see VerifierKeys.
export const resolveVerifierKeyRegistrations = (
  entryPoints: readonly (string | Uint8Array)[],
  verifierKeys: ReadonlyMap<string, Uint8Array>,
  version: LedgerEra
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
