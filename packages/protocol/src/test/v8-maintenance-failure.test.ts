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

import type * as CompactJsLedger8 from '@midnight-ntwrk/compact-js/v8/effect';
import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import { Effect } from 'effect';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { InvariantViolationError, PROTOCOL_ERROR_CODES } from '../errors';
import type { Ledger8EngineContract } from '../lib/v8/executable';
import { composeLedger8MaintenanceTx, type Ledger8MaintenanceRequest } from '../lib/v8/maintenance';
import { fixturePath } from './fixtures';

vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

const failures = vi.hoisted(() => ({
  operation: undefined as unknown,
  intent: undefined as unknown
}));

vi.mock('@midnight-ntwrk/compact-js/v8/effect', async (importOriginal) => {
  const actual = await importOriginal<typeof CompactJsLedger8>();
  const operation = () =>
    failures.operation === undefined
      ? Effect.succeed({ public: { maintenanceUpdate: undefined } })
      : Effect.fail(failures.operation);
  return {
    ...actual,
    ContractExecutable: {
      ...actual.ContractExecutable,
      make: () => ({
        addOrReplaceContractOperation: operation,
        removeContractOperation: operation,
        replaceContractMaintenanceAuthority: operation
      })
    },
    Ledger: {
      ...actual.Ledger,
      Intent: {
        new: (ttl: Date) => {
          if (failures.intent !== undefined) {
            throw failures.intent;
          }
          return actual.Ledger.Intent.new(ttl);
        }
      }
    }
  };
});

const AUTHORITY_KEY = LedgerV8.sampleSigningKey();

let contract: Ledger8EngineContract;

beforeAll(async () => {
  const { Contract } = (await import(
    /* @vite-ignore */ fixturePath('counter-016', 'compiled', 'contract', 'index.js')
  )) as { readonly Contract: new (witnesses: Record<string, never>) => Ledger8EngineContract };
  contract = new Contract({});
});

const contractStateBytes = (): Uint8Array => {
  const state = new LedgerV8.ContractState();
  state.maintenanceAuthority = new LedgerV8.ContractMaintenanceAuthority(
    [LedgerV8.signatureVerifyingKey(AUTHORITY_KEY)],
    1,
    0n
  );
  return state.serialize();
};

const request = (): Ledger8MaintenanceRequest => ({
  contract,
  contractAddress: LedgerV8.sampleContractAddress(),
  coinPublicKey: 'ca'.repeat(32),
  contractStateBytes: contractStateBytes(),
  signingKey: AUTHORITY_KEY,
  networkId: 'test-network',
  ttl: new Date(Date.now() + 3_600_000),
  update: { kind: 'remove-verifier-key', circuitId: 'increment' }
});

afterEach(() => {
  failures.operation = undefined;
  failures.intent = undefined;
});

describe('composeLedger8MaintenanceTx failures', () => {
  it('surfaces a coded error compact-js carries on its failure by name, rather than as a compose failure', async () => {
    // Arrange
    const invariant = new InvariantViolationError('a ledger 8 maintenance update read a verifier key');
    failures.operation = new Error('Failed to read the verifier key', { cause: invariant });

    // Act
    const act = composeLedger8MaintenanceTx(request());

    // Assert
    await expect(act).rejects.toBe(invariant);
  });

  it('reports an uncoded compact-js refusal as a maintenance-update compose failure carrying it', async () => {
    // Arrange
    const refusal = new Error('Failed to sign contract maintenance update');
    failures.operation = refusal;

    // Act
    const act = composeLedger8MaintenanceTx(request());

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'maintenance-update',
      circuitId: 'increment',
      cause: refusal
    });
  });

  it('reports a ledger refusal while wrapping the signed update into a transaction as a maintenance-update compose failure', async () => {
    // Arrange
    const refusal = new Error('expected instance of MaintenanceUpdate');
    failures.intent = refusal;

    // Act
    const act = composeLedger8MaintenanceTx(request());

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'maintenance-update',
      circuitId: 'increment',
      cause: refusal
    });
  });
});
