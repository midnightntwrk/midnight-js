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

import { NO_CIRCUIT } from '@midnight-ntwrk/midnight-js-protocol';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { describe, expect, it } from 'vitest';

import {
  EraArtifactMismatchError,
  EraInvariantViolationError,
  ForkCrossedDuringOperationError,
  IndexerInconsistencyError,
  Ledger8DeployOnLedger9Error,
  Ledger8DeployUnconfirmedError,
  Ledger8MaintenanceOnLedger9Error,
  NetworkVersionStateMismatchError,
  ScopedTransactionEraUnsupportedError,
  SubmitRejectionUndiagnosedError,
  type SubmittedOperation
} from '../errors';

const MAINTAINER_JARGON = /envelope|\bhead\b|\baxis\b|down-?convert|dual-instantiation|shared-instance/i;

const ADDRESS = '0600'.repeat(8);
const SIGNING_KEY: SigningKey = { tag: 'schnorr', value: 'a1'.repeat(32) };

const operation = (kind: SubmittedOperation['kind']): SubmittedOperation => ({
  head: 'v8',
  kind,
  circuitId: kind === 'maintenance' ? NO_CIRCUIT : 'increment',
  contractAddress: ADDRESS
});

describe('error messages a dApp developer reads', () => {
  it.each<[string, Error]>([
    ['ledger 9 artifact on a ledger 8 network', new EraArtifactMismatchError('ledger9-artifact-on-ledger8-head')],
    ['v9 transaction on a ledger 8 network', new EraArtifactMismatchError('ledger9-transaction-on-ledger8-head')],
    ['v8 transaction on a ledger 9 network', new EraArtifactMismatchError('ledger8-transaction-on-ledger9-head')],
    ['ledger 8 deploy after the fork', new Ledger8DeployOnLedger9Error()],
    ['ledger 8 maintenance after the fork', new Ledger8MaintenanceOnLedger9Error()],
    ['network version and state disagree', new NetworkVersionStateMismatchError('v8', 'v9')],
    ['indexer inconsistency', new IndexerInconsistencyError('v8', 'v9')],
    ['fork crossed during a call', new ForkCrossedDuringOperationError(operation('call'), 'v9', undefined)],
    ['fork crossed during a deploy', new ForkCrossedDuringOperationError(operation('deploy'), 'v9', undefined)],
    [
      'fork crossed during maintenance',
      new ForkCrossedDuringOperationError(operation('maintenance'), 'v9', undefined)
    ],
    [
      'network version could not be re-read',
      new SubmitRejectionUndiagnosedError(operation('call'), new Error('rejected'), {
        reason: 'head-read-failed',
        headReadFailure: new Error('unreachable')
      })
    ],
    [
      'network version moved backwards',
      new SubmitRejectionUndiagnosedError(operation('call'), new Error('rejected'), {
        reason: 'head-moved-backwards',
        freshEra: 'v8'
      })
    ],
    ['scoped transaction on ledger 8', new ScopedTransactionEraUnsupportedError('v8')],
    [
      'ledger 8 deploy record from the wrong era',
      new Ledger8DeployUnconfirmedError(
        ADDRESS,
        SIGNING_KEY,
        new EraInvariantViolationError('watchForDeployTxData', undefined, 'v8', 'v9')
      )
    ]
  ])('uses no maintainer jargon: %s', (_, error) => {
    expect(error.message).not.toMatch(MAINTAINER_JARGON);
  });

  it('says the network crossed the fork while the operation ran', () => {
    const error = new ForkCrossedDuringOperationError(operation('call'), 'v9', undefined);

    expect(error.message).toContain("built while the network was on ledger 'v8'");
    expect(error.message).toContain("the network now reports ledger 'v9'");
  });
});
