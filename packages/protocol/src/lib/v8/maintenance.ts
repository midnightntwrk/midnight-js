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
 * Retained-era (ledger 8) contract maintenance: compact-js's own maintenance
 * operations, wrapped into an unproven transaction.
 *
 * @see {@link RetainedEraExecution}
 */

import * as Contract from '@midnight-ntwrk/compact-js/effect/Contract';
import { ContractExecutable, Ledger } from '@midnight-ntwrk/compact-js/v8/effect';
import * as PlatformContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as glue from 'compact-runtime-ledger8';
import { Effect, Layer, Option } from 'effect';

import { ComposeFailedError, ComposeOptionError, MaintenanceAuthorityMismatchError, NO_CIRCUIT } from '../../errors';
import { assertComposeEnvelope } from '../shared/compose-options';
import {
  containerFor,
  keysLayer,
  LEDGER8_SIGNING_KEY_PATTERN,
  type Ledger8EngineContract,
  type Ledger8SigningKey,
  refuseVerifierKeyRead,
  runOrRethrow,
  toPlatformSigningKey,
  zkConfigurationLayer
} from './executable';

/** The one change a maintenance transaction carries. */
export type Ledger8MaintenanceUpdateRequest =
  | { readonly kind: 'insert-verifier-key'; readonly circuitId: string; readonly verifierKey: Uint8Array }
  | { readonly kind: 'remove-verifier-key'; readonly circuitId: string }
  | { readonly kind: 'replace-authority'; readonly newSigningKey: Ledger8SigningKey };

/**
 * Everything {@link composeLedger8MaintenanceTx} needs.
 *
 * `contractStateBytes` is the contract's FULL serialized state as the chain
 * holds it: the update is valid only against its maintenance authority's
 * counter, and only a key in that authority's committee may sign it.
 */
export interface Ledger8MaintenanceRequest {
  readonly contract: Ledger8EngineContract;
  readonly contractAddress: string;
  readonly contractStateBytes: Uint8Array;
  readonly coinPublicKey: string;
  readonly signingKey: Ledger8SigningKey;
  readonly networkId: string;
  readonly ttl: Date;
  readonly update: Ledger8MaintenanceUpdateRequest;
}

/** The committee index compact-js signs every maintenance update at. */
const COMPACT_JS_SIGNATURE_INDEX = 0;

const readContractState = (contractStateBytes: Uint8Array): glue.ContractState => {
  try {
    return glue.ContractState.deserialize(contractStateBytes);
  } catch (error) {
    throw new ComposeOptionError('v8', 'contractStateBytes', error);
  }
};

const circuitOf = (update: Ledger8MaintenanceUpdateRequest): string =>
  update.kind === 'replace-authority' ? NO_CIRCUIT : update.circuitId;

const brandedAddress = (
  contractAddress: string,
  update: Ledger8MaintenanceUpdateRequest
): PlatformContractAddress.ContractAddress => {
  try {
    return PlatformContractAddress.ContractAddress(contractAddress);
  } catch (error) {
    throw new ComposeFailedError('v8', 'maintenance-update', circuitOf(update), error);
  }
};

/**
 * Composes an UNPROVEN v8 transaction carrying one maintenance update, built
 * and signed by compact-js's ledger 8 `ContractExecutable`, and serializes it.
 *
 * Checks only what compact-js does not: the envelope, the key formats, and
 * that the signing key's verifying key is the committee member compact-js
 * signs for, at index 0.
 *
 * Whether the verifier-key slot an insert or a remove targets is occupied is
 * NOT checked here: that is the caller's decision, made against the same state.
 *
 * @param request The contract, its full state, the coin public key, the
 *   authority key, the transaction envelope and the update.
 * @returns The UNPROVEN, serialized transaction.
 * @throws ComposeOptionError If `networkId` is empty, `ttl` is not a valid
 *   instant, `signingKey` or `newSigningKey` is not 64 hex characters, or the
 *   state bytes cannot be read by the ledger 8 runtime.
 * @throws MaintenanceAuthorityMismatchError If the signing key is not the
 *   committee's first member.
 * @throws ComposeFailedError At stage `'maintenance-update'` if compact-js
 *   refuses to build or sign the update, with its failure on `cause`.
 * @see {@link RetainedEraExecution}
 */
export const composeLedger8MaintenanceTx = async (request: Ledger8MaintenanceRequest): Promise<Uint8Array> => {
  const { contract, contractAddress, contractStateBytes, coinPublicKey, signingKey, networkId, ttl, update } = request;
  assertComposeEnvelope(request, 'v8');
  if (!LEDGER8_SIGNING_KEY_PATTERN.test(signingKey)) {
    throw new ComposeOptionError('v8', 'signingKey');
  }
  if (update.kind === 'replace-authority' && !LEDGER8_SIGNING_KEY_PATTERN.test(update.newSigningKey)) {
    throw new ComposeOptionError('v8', 'newSigningKey');
  }

  const contractState = readContractState(contractStateBytes);
  if (
    contractState.maintenanceAuthority.committee[COMPACT_JS_SIGNATURE_INDEX] !== glue.signatureVerifyingKey(signingKey)
  ) {
    throw new MaintenanceAuthorityMismatchError('v8', contractAddress);
  }

  const executable = ContractExecutable.make(containerFor(contract));
  const context = { address: brandedAddress(contractAddress, update), contractState };
  const operation =
    update.kind === 'insert-verifier-key'
      ? executable.addOrReplaceContractOperation(
          Contract.ProvableCircuitId(update.circuitId),
          Contract.VerifierKey(update.verifierKey),
          context
        )
      : update.kind === 'remove-verifier-key'
        ? executable.removeContractOperation(Contract.ProvableCircuitId(update.circuitId), context)
        : executable.replaceContractMaintenanceAuthority(
            Option.some(toPlatformSigningKey(update.newSigningKey)),
            context
          );

  const result = await runOrRethrow(
    operation.pipe(
      Effect.mapError((error) => new ComposeFailedError('v8', 'maintenance-update', circuitOf(update), error)),
      Effect.provide(Layer.mergeAll(keysLayer(coinPublicKey, signingKey), zkConfigurationLayer(refuseVerifierKeyRead)))
    )
  );

  const intent = Ledger.Intent.new(ttl).addMaintenanceUpdate(result.public.maintenanceUpdate);
  return Ledger.Transaction.fromParts(networkId, undefined, undefined, intent).serialize();
};
