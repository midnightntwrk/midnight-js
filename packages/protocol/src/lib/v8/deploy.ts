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

import { ComposeFailedError, ComposeOptionError } from '../../errors';
import type { UnprovenOffer } from '../../v8.js';
import { assertComposeEnvelope } from '../shared/compose-options';
import type { DeployResultPojo } from '../shared/compose-types';
import { resolveVerifierKeyRegistrations } from '../shared/verifier-keys';
import type { Ledger8Protocol } from './load';

// `verifierKeys` must name exactly the declared entry points; see VerifierKeys.
export interface ComposeLedger8DeployOptions {
  readonly contractStateBytes: Uint8Array;
  readonly verifierKeys: ReadonlyMap<string, Uint8Array>;
  readonly networkId: string;
  readonly ttl: Date;
  /** A v8-native offer HANDLE, not bytes, as `ComposeLedger8CallOptions` also takes. */
  readonly guaranteedZswapOffer?: UnprovenOffer;
}

// A rejected state is an option error, never a raw decoder failure.
const bridgeContractState = (
  contractState: Uint8Array,
  v8: Ledger8Protocol
): InstanceType<Ledger8Protocol['ContractState']> => {
  try {
    return v8.ContractState.deserialize(contractState);
  } catch (error) {
    throw new ComposeOptionError('v8', 'contractStateBytes', error);
  }
};

// A rejected key blob names its entry point (stage 'deploy-verifier-key-blob').
const registerVerifierKey = (
  ledgerContractState: InstanceType<Ledger8Protocol['ContractState']>,
  entryPoint: string | Uint8Array,
  circuitId: string,
  verifierKey: Uint8Array,
  v8: Ledger8Protocol
): void => {
  const operation = new v8.ContractOperation();
  try {
    operation.verifierKey = verifierKey;
  } catch (error) {
    throw new ComposeFailedError('v8', 'deploy-verifier-key-blob', circuitId, error);
  }
  ledgerContractState.setOperation(entryPoint, operation);
};

// Validates the key map before registering anything, and never proves. The address cannot be
// recomputed from the input state: a deploy mints a fresh nonce. See VerifierKeys.
export const composeLedger8DeployTx = (options: ComposeLedger8DeployOptions, v8: Ledger8Protocol): DeployResultPojo => {
  const { contractStateBytes, verifierKeys, networkId, ttl, guaranteedZswapOffer } = options;
  assertComposeEnvelope(options, 'v8');

  const ledgerContractState = bridgeContractState(contractStateBytes, v8);
  for (const { entryPoint, circuitId, verifierKey } of resolveVerifierKeyRegistrations(
    ledgerContractState.operations(),
    verifierKeys,
    'v8'
  )) {
    registerVerifierKey(ledgerContractState, entryPoint, circuitId, verifierKey, v8);
  }

  const deploy = new v8.ContractDeploy(ledgerContractState);
  const intent = v8.Intent.new(ttl).addDeploy(deploy);

  return {
    txBytes: v8.Transaction.fromParts(networkId, guaranteedZswapOffer, undefined, intent).serialize(),
    contractAddress: deploy.address,
    initialContractStateBytes: deploy.initialState.serialize()
  };
};
