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

import { ComposeFailedError, ComposeOptionError, NO_CIRCUIT } from '../../errors';
import { assertComposeEnvelope } from '../shared/compose-options';
import type {
  ComposeCallOptions,
  ComposeCallResultPojo,
  ComposeDeployOptions,
  DeployResultPojo
} from '../shared/compose-types';
import { composeLedger8CallTx, readZswapOffer } from './compose';
import { composeLedger8DeployTx } from './deploy';
import type { Ledger8Protocol } from './load';

// A rejected state is an option error, never a raw decoder failure (see ComposeRefusalOrder).
const readContractState = (raw: Uint8Array, v8: Ledger8Protocol): InstanceType<Ledger8Protocol['ContractState']> => {
  try {
    return v8.ContractState.deserialize(raw);
  } catch (cause) {
    throw new ComposeOptionError('v8', 'contractStateBytes', cause);
  }
};

// Exactly one call; a longer `calls` list is refused, not narrowed (see EraBoundary).
export const composeEraLedger8CallTx = (options: ComposeCallOptions, v8: Ledger8Protocol): ComposeCallResultPojo => {
  const { calls, networkId, ttl, zswapOffer } = options;
  // Checked here, not left to the inner leg, so both eras refuse in the same
  // order; the re-check in the leg is idempotent -- see ComposeRefusalOrder.
  assertComposeEnvelope(options, 'v8');
  if (calls.length === 0) {
    throw new ComposeFailedError('v8', 'call-empty', NO_CIRCUIT);
  }
  if (calls.length > 1) {
    throw new ComposeOptionError('v8', 'calls');
  }
  const [call] = calls;

  return composeLedger8CallTx(
    {
      circuitId: call.circuitId,
      contractAddress: call.contractAddress,
      contractState: readContractState(call.contractStateBytes, v8),
      transcript: call.transcript,
      privateTranscriptOutputs: call.privateTranscriptOutputs,
      input: call.input,
      output: call.output,
      communicationCommitmentRandomness: call.communicationCommitmentRandomness,
      // Carried across, never dropped: see LedgerParametersOption.
      ledgerParametersBytes: call.ledgerParametersBytes,
      networkId,
      ttl,
      zswapOffer
    },
    v8
  );
};

// `verifierKeys` is required on this era: the deploy leg registers the keys itself (see VerifierKeys).
export const composeEraLedger8DeployTx = (options: ComposeDeployOptions, v8: Ledger8Protocol): DeployResultPojo => {
  const { contractStateBytes, verifierKeys, networkId, ttl, guaranteedZswapOfferBytes } = options;
  // See `composeEraLedger8CallTx` — hoisted so both eras refuse the envelope first.
  assertComposeEnvelope(options, 'v8');
  const guaranteedOffer = readZswapOffer(guaranteedZswapOfferBytes, v8, 'guaranteedZswapOfferBytes');
  if (verifierKeys === undefined) {
    throw new ComposeOptionError('v8', 'verifierKeys');
  }

  return composeLedger8DeployTx(
    { contractStateBytes, verifierKeys, networkId, ttl, guaranteedZswapOffer: guaranteedOffer },
    v8
  );
};
