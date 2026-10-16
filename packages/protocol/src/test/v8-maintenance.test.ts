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

import { readFileSync } from 'node:fs';

import * as LedgerV8 from '@midnightntwrk/ledger-v8';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { NO_CIRCUIT, PROTOCOL_ERROR_CODES } from '../errors';
import { createLedger8Engine } from '../lib/v8/engine';
import type { Ledger8EngineContract } from '../lib/v8/executable';
import {
  composeLedger8MaintenanceTx,
  type Ledger8MaintenanceRequest,
  type Ledger8MaintenanceUpdateRequest
} from '../lib/v8/maintenance';
import { fixturePath, LEDGER8_UNPROVEN_TX_TAG } from './fixtures';

// The ported artifact imports the bare `@midnight-ntwrk/compact-runtime`; scoped to
// this file's module registry, as in v8-deploy.test.ts.
vi.mock('@midnight-ntwrk/compact-runtime', async () => import('compact-runtime-ledger8'));

const NETWORK_ID = 'test-network';
const TTL = new Date(Date.now() + 3_600_000);
const CIRCUIT_ID = 'increment';
const VERIFIER_KEY = new Uint8Array(
  readFileSync(fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
);

const AUTHORITY_KEY = LedgerV8.sampleSigningKey();
const FOREIGN_KEY = LedgerV8.sampleSigningKey();
const NEW_AUTHORITY_KEY = LedgerV8.sampleSigningKey();
const CONTRACT_ADDRESS = LedgerV8.sampleContractAddress();
const COUNTER = 3n;
const COIN_PUBLIC_KEY = 'ca'.repeat(32);

let contract: Ledger8EngineContract;

beforeAll(async () => {
  const { Contract } = (await import(
    /* @vite-ignore */ fixturePath('counter-016', 'compiled', 'contract', 'index.js')
  )) as { readonly Contract: new (witnesses: Record<string, never>) => Ledger8EngineContract };
  contract = new Contract({});
});

const contractStateBytes = (committee: readonly string[], counter: bigint = COUNTER): Uint8Array => {
  const state = new LedgerV8.ContractState();
  const operation = new LedgerV8.ContractOperation();
  operation.verifierKey = VERIFIER_KEY;
  state.setOperation(CIRCUIT_ID, operation);
  state.maintenanceAuthority = new LedgerV8.ContractMaintenanceAuthority(
    committee.map((key) => LedgerV8.signatureVerifyingKey(key)),
    1,
    counter
  );
  return state.serialize();
};

const request = (
  update: Ledger8MaintenanceUpdateRequest,
  overrides: Partial<Ledger8MaintenanceRequest> = {}
): Ledger8MaintenanceRequest => ({
  contract,
  contractAddress: CONTRACT_ADDRESS,
  coinPublicKey: COIN_PUBLIC_KEY,
  contractStateBytes: contractStateBytes([AUTHORITY_KEY]),
  signingKey: AUTHORITY_KEY,
  networkId: NETWORK_ID,
  ttl: TTL,
  update,
  ...overrides
});

const INSERT: Ledger8MaintenanceUpdateRequest = { kind: 'insert-verifier-key', circuitId: CIRCUIT_ID, verifierKey: VERIFIER_KEY };
const REMOVE: Ledger8MaintenanceUpdateRequest = { kind: 'remove-verifier-key', circuitId: CIRCUIT_ID };
const REPLACE: Ledger8MaintenanceUpdateRequest = { kind: 'replace-authority', newSigningKey: NEW_AUTHORITY_KEY };

const readMaintenanceUpdate = (txBytes: Uint8Array): LedgerV8.MaintenanceUpdate => {
  const tx = LedgerV8.Transaction.deserialize('signature', 'pre-proof', 'pre-binding', txBytes);
  const intents = [...(tx.intents?.values() ?? [])];
  expect(intents).toHaveLength(1);
  const { actions } = intents[0];
  expect(actions).toHaveLength(1);
  const [update] = actions;
  if (!(update instanceof LedgerV8.MaintenanceUpdate)) {
    throw new Error(`expected a MaintenanceUpdate, got ${String(update)}`);
  }
  return update;
};

const expectSignedBy = (update: LedgerV8.MaintenanceUpdate, signingKey: string): void => {
  expect(update.signatures).toHaveLength(1);
  const [[signatureIndex, signature]] = update.signatures;
  expect(signatureIndex).toBe(0n);
  expect(LedgerV8.verifySignature(LedgerV8.signatureVerifyingKey(signingKey), update.dataToSign, signature)).toBe(true);
};

describe('composeLedger8MaintenanceTx', () => {
  it('composes an unproven v8 transaction inserting a verifier key, signed by the authority at the state counter', async () => {
    // Act
    const txBytes = await composeLedger8MaintenanceTx(request(INSERT));

    // Assert
    expect(new TextDecoder().decode(txBytes.slice(0, LEDGER8_UNPROVEN_TX_TAG.length))).toBe(LEDGER8_UNPROVEN_TX_TAG);
    const update = readMaintenanceUpdate(txBytes);
    expect(update.address).toBe(CONTRACT_ADDRESS);
    expect(update.counter).toBe(COUNTER);
    expect(update.updates).toHaveLength(1);
    const [insert] = update.updates;
    expect(insert).toBeInstanceOf(LedgerV8.VerifierKeyInsert);
    if (!(insert instanceof LedgerV8.VerifierKeyInsert)) return;
    expect(insert.operation).toBe(CIRCUIT_ID);
    expect(insert.vk.version).toBe('v3');
    expect(insert.vk.rawVk).toEqual(new LedgerV8.ContractOperationVersionedVerifierKey('v3', VERIFIER_KEY).rawVk);
    expectSignedBy(update, AUTHORITY_KEY);
  });

  it('composes an unproven v8 transaction removing a verifier key at operation version v3', async () => {
    // Act
    const update = readMaintenanceUpdate(await composeLedger8MaintenanceTx(request(REMOVE)));

    // Assert
    expect(update.counter).toBe(COUNTER);
    const [remove] = update.updates;
    expect(remove).toBeInstanceOf(LedgerV8.VerifierKeyRemove);
    if (!(remove instanceof LedgerV8.VerifierKeyRemove)) return;
    expect(remove.operation).toBe(CIRCUIT_ID);
    expect(remove.version.version).toBe('v3');
    expectSignedBy(update, AUTHORITY_KEY);
  });

  it('replaces the authority with a one-key committee for the new key, at threshold 1 and the next counter', async () => {
    // Act
    const update = readMaintenanceUpdate(await composeLedger8MaintenanceTx(request(REPLACE)));

    // Assert
    expect(update.counter).toBe(COUNTER);
    const [replace] = update.updates;
    expect(replace).toBeInstanceOf(LedgerV8.ReplaceAuthority);
    if (!(replace instanceof LedgerV8.ReplaceAuthority)) return;
    expect(replace.authority.committee).toEqual([LedgerV8.signatureVerifyingKey(NEW_AUTHORITY_KEY)]);
    expect(replace.authority.threshold).toBe(1);
    expect(replace.authority.counter).toBe(COUNTER + 1n);
    expectSignedBy(update, AUTHORITY_KEY);
  });

  it('refuses a committee member that is not the first one, the index every update is signed at', async () => {
    // Arrange
    const stateBytes = contractStateBytes([FOREIGN_KEY, AUTHORITY_KEY]);

    // Act
    const act = composeLedger8MaintenanceTx(request(INSERT, { contractStateBytes: stateBytes }));

    // Assert
    await expect(act).rejects.toMatchObject({ code: PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH });
  });

  it('refuses a key that is not in the committee before signing anything', async () => {
    // Act
    const act = composeLedger8MaintenanceTx(request(INSERT, { signingKey: FOREIGN_KEY }));

    // Assert
    await expect(act).rejects.toMatchObject({ code: PROTOCOL_ERROR_CODES.MAINTENANCE_AUTHORITY_MISMATCH });
  });

  it('does not render key material in the committee refusal', async () => {
    // Act
    const error = await composeLedger8MaintenanceTx(request(INSERT, { signingKey: FOREIGN_KEY })).catch(
      (failure: unknown) => failure
    );

    // Assert
    const message = error instanceof Error ? error.message : '';
    expect(message).toContain(CONTRACT_ADDRESS);
    expect(message).not.toContain(FOREIGN_KEY);
    expect(message).not.toContain(LedgerV8.signatureVerifyingKey(FOREIGN_KEY));
    expect(message).not.toContain(LedgerV8.signatureVerifyingKey(AUTHORITY_KEY));
  });

  it.each([
    ['too short', 'ab'.repeat(31)],
    ['not hex', 'zz'.repeat(32)]
  ])('refuses a malformed signing key (%s) as a compose option', async (_label, signingKey) => {
    // Act
    const act = composeLedger8MaintenanceTx(request(INSERT, { signingKey }));

    // Assert
    await expect(act).rejects.toMatchObject({ code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID, option: 'signingKey' });
  });

  it('refuses a malformed new authority key as a compose option', async () => {
    // Act
    const act = composeLedger8MaintenanceTx(request({ kind: 'replace-authority', newSigningKey: 'not-a-key' }));

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID,
      option: 'newSigningKey'
    });
  });

  it('refuses contract state bytes the ledger 8 runtime cannot read', async () => {
    // Act
    const act = composeLedger8MaintenanceTx(request(INSERT, { contractStateBytes: new Uint8Array([1, 2, 3]) }));

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID,
      option: 'contractStateBytes'
    });
  });

  it.each([
    ['networkId', { networkId: '' }],
    ['ttl', { ttl: new Date(Number.NaN) }]
  ])('refuses an unusable %s', async (option, overrides) => {
    // Act
    const act = composeLedger8MaintenanceTx(request(INSERT, overrides));

    // Assert
    await expect(act).rejects.toMatchObject({ code: PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID, option });
  });

  it('refuses verifier key bytes the v8 ledger rejects, naming the circuit and keeping the refusal', async () => {
    // Act
    const act = composeLedger8MaintenanceTx(
      request({ kind: 'insert-verifier-key', circuitId: CIRCUIT_ID, verifierKey: new Uint8Array([1, 2, 3]) })
    );

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'maintenance-update',
      circuitId: CIRCUIT_ID,
      cause: expect.anything()
    });
  });

  it('refuses a contract address the v8 ledger rejects, naming no circuit for an authority replacement', async () => {
    // Act
    const act = composeLedger8MaintenanceTx(request(REPLACE, { contractAddress: 'not-an-address' }));

    // Assert
    await expect(act).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'maintenance-update',
      circuitId: NO_CIRCUIT,
      cause: expect.anything()
    });
  });
});

describe('Ledger8Engine.composeMaintenanceTx', () => {
  it('is the engine member that composes the maintenance transaction', async () => {
    // Arrange
    const engine = await createLedger8Engine();

    // Act
    const update = readMaintenanceUpdate(await engine.composeMaintenanceTx(request(REMOVE)));

    // Assert
    expect(update.address).toBe(CONTRACT_ADDRESS);
    expectSignedBy(update, AUTHORITY_KEY);
  });
});
