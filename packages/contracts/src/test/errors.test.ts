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

import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  FailEntirely,
  FailFallible,
  type FinalizedTxRead,
  type Ledger8FinalizedTxData,
  type TxStatus
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import {
  EraInvariantViolationError,
  IncompleteDeployContractPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  Ledger8CallUnsupportedError,
  Ledger8NotStoredError,
  Ledger8SigningKeyError,
  Ledger8UnconfirmedError,
  type TxFailedDetails,
  TxFailedError,
  type TxFailedOperation
} from '../errors';
import { createMockFinalizedTxData } from './test-mocks';

// The v8 variant of the record union. Its `tx` is a live `Ledger8FinalizedTransaction` handle
// from the retained ledger module, which no unit test can construct and none
// of these read -- every assertion here is about the tag and the members
// around it. One cast, in one place, rather than one per call site.
const ledger8FailedRecord = (status: TxStatus = FailFallible): Ledger8FinalizedTxData => ({
  ...createMockFinalizedTxData(status),
  era: 'v8',
  tx: undefined as unknown as Ledger8FinalizedTxData['tx']
});

const TX_FAILED_OPERATIONS: readonly TxFailedOperation[] = [
  'call',
  'deploy',
  'insert-verifier-key',
  'remove-verifier-key',
  'replace-authority'
];
const TX_FAILED_ERAS = ['v8', 'v9'] as const;
const TX_FAILED_STATUSES = [FailFallible, FailEntirely] as const;
const TX_FAILED_ADDRESS = '0200'.repeat(8);
const TX_FAILED_KEY: SigningKey = { tag: 'schnorr', value: 'a1'.repeat(32) };

const failedRecord = (era: 'v8' | 'v9', status: TxStatus): FinalizedTxRead =>
  era === 'v8' ? ledger8FailedRecord(status) : createMockFinalizedTxData(status);

const detailsFor = (operation: TxFailedOperation): TxFailedDetails => {
  switch (operation) {
    case 'call':
      return { contractAddress: TX_FAILED_ADDRESS, circuitId: 'increment' };
    case 'deploy':
      return { contractAddress: TX_FAILED_ADDRESS, signingKey: TX_FAILED_KEY };
    case 'insert-verifier-key':
    case 'remove-verifier-key':
      return { contractAddress: TX_FAILED_ADDRESS, circuitId: 'increment' };
    case 'replace-authority':
      return { contractAddress: TX_FAILED_ADDRESS, signingKey: TX_FAILED_KEY };
  }
};

const txFailedCases = TX_FAILED_OPERATIONS.flatMap((operation) =>
  TX_FAILED_ERAS.flatMap((era) =>
    TX_FAILED_STATUSES.map((status) => ({ operation, era, status }))
  )
);

describe('TxFailedError', () => {
  it.each(txFailedCases)(
    'is a TxFailedError with code MIDNIGHT_JS_C_TX_FAILED and the record\'s era ($operation, $era, $status)',
    ({ operation, era, status }) => {
      const record = failedRecord(era, status);

      const error = new TxFailedError(operation, record, detailsFor(operation));

      expect(error).toBeInstanceOf(TxFailedError);
      expect(error.operation).toBe(operation);
      expect(error.record.era).toBe(era);
      expect(error.record).toBe(record);
      expect(error.name).toBe('TxFailedError');
      expect(error.code).toBe(CONTRACTS_ERROR_CODES.TX_FAILED);
      expect(error.category).toBe('REJECTED');
    }
  );

  it.each(txFailedCases)(
    'names the status and the transaction id ($operation, $era, $status)',
    ({ operation, era, status }) => {
      const record = failedRecord(era, status);

      const error = new TxFailedError(operation, record, detailsFor(operation));

      expect(error.message).toContain(status);
      expect(error.message).toContain(record.txId);
    }
  );

  it.each(
    txFailedCases.filter(({ operation }) => operation === 'deploy' || operation === 'replace-authority')
  )('never renders the signing key ($operation, $era, $status)', ({ operation, era, status }) => {
    const error = new TxFailedError(operation, failedRecord(era, status), detailsFor(operation));

    expect(error.signingKey).toBe(TX_FAILED_KEY);
    expect(error.message).not.toContain(TX_FAILED_KEY.value);
  });

  it.each(TX_FAILED_ERAS)('names every circuit of a multi-call scope (%s)', (era) => {
    const error = new TxFailedError('call', failedRecord(era, FailFallible), { circuitId: ['a', 'b'] });

    expect(error.circuitId).toEqual(['a', 'b']);
    expect(error.message).toContain("'a'");
    expect(error.message).toContain("'b'");
  });

  it.each(TX_FAILED_OPERATIONS)('does not claim the contract state advanced on FailFallible (%s)', (operation) => {
    const error = new TxFailedError(operation, failedRecord('v9', FailFallible), detailsFor(operation));

    expect(error.message).not.toMatch(/state advanced/);
    expect(error.message).toContain('guaranteed');
  });

  it('tells a caller not to deploy again before checking the address', () => {
    const error = new TxFailedError('deploy', failedRecord('v9', FailFallible), detailsFor('deploy'));

    expect(error.message).toContain('before deploying again');
    expect(error.message).toContain(TX_FAILED_ADDRESS);
  });

  it('carries the contract address and circuit id it was given', () => {
    const error = new TxFailedError('remove-verifier-key', failedRecord('v8', FailEntirely), detailsFor('remove-verifier-key'));

    expect(error.contractAddress).toBe(TX_FAILED_ADDRESS);
    expect(error.circuitId).toBe('increment');
  });

  it.each(['insert-verifier-key', 'remove-verifier-key'] as const)(
    'does not say the update may have landed when the status is FailEntirely (%s)',
    (operation) => {
      const error = new TxFailedError(operation, failedRecord('v9', FailEntirely), detailsFor(operation));

      expect(error.message).not.toContain('may have landed');
    }
  );

  it.each(['insert-verifier-key', 'remove-verifier-key'] as const)(
    'says the update may have landed when the status is FailFallible (%s)',
    (operation) => {
      const error = new TxFailedError(operation, failedRecord('v9', FailFallible), detailsFor(operation));

      expect(error.message).toContain('may have landed');
    }
  );
});

describe('EraInvariantViolationError', () => {
  // A refusal that states only what it wanted leaves the reader to discover
  // what it got. `received` is what makes the message actionable, and what a
  // caught error can be inspected for.
  it('names the era it received alongside the one it can accept', () => {
    const error = new EraInvariantViolationError('watchForTxData', 'increment', 'v8', 'v9');

    expect(error.expected).toBe('v8');
    expect(error.received).toBe('v9');
    expect(error.message).toContain("'v9' ledger era");
    expect(error.message).toContain("can only accept 'v8'");
    expect(error.message).toContain('increment');
  });

  // The default keeps every call site that predates the retained-era pipelines
  // reading as it did: those flows submit and accept v9 and nothing else.
  it('defaults the accepted era to the current one', () => {
    expect(new EraInvariantViolationError('proveTx').expected).toBe('v9');
  });
});

describe('the incomplete private-state configuration refusals', () => {
  // These two are told apart by their message alone -- neither carries a code, and both are plain
  // `Error` subclasses -- so the message is the whole of what a caller has to work with. A deploy
  // that reported the FIND wording would send the reader to the wrong entry point.
  it('names the entry point whose configuration was incomplete', () => {
    const deployRefusal = new IncompleteDeployContractPrivateStateConfig();
    const findRefusal = new IncompleteFindContractPrivateStateConfig();

    expect(deployRefusal.message).toBe(
      "'initialPrivateState' was defined for contract deploy while 'privateStateId' was undefined"
    );
    expect(findRefusal.message).toBe(
      "'initialPrivateState' was defined for contract find while 'privateStateId' was undefined"
    );
    expect(deployRefusal.message).not.toBe(findRefusal.message);
  });

  it('names which half of the deploy pairing is missing', () => {
    expect(new IncompleteDeployContractPrivateStateConfig('privateStateId').message).toBe(
      "'initialPrivateState' was defined for contract deploy while 'privateStateId' was undefined"
    );
    expect(new IncompleteDeployContractPrivateStateConfig('initialPrivateState').message).toBe(
      "'privateStateId' was defined for contract deploy while 'initialPrivateState' was omitted"
    );
  });

  it('carries its own name, so a handler that discriminates by name can tell the two apart', () => {
    // `Error.name` defaults to `'Error'` on a subclass that does not set it, which makes
    // name-based discrimination -- the route a serialized error across a worker or an IPC boundary
    // leaves a caller -- report both of these, and every other `Error`, as the same condition.
    expect(new IncompleteDeployContractPrivateStateConfig().name).toBe('IncompleteDeployContractPrivateStateConfig');
    expect(new IncompleteFindContractPrivateStateConfig().name).toBe('IncompleteFindContractPrivateStateConfig');
  });
});

describe('Ledger8UnconfirmedError', () => {
  const SIGNING_KEY: SigningKey = { tag: 'schnorr', value: 'b2'.repeat(32) };
  const ADDRESS = '0300'.repeat(8);
  const eraViolation = (): EraInvariantViolationError =>
    new EraInvariantViolationError('watchForDeployTxData', undefined, 'v8', 'v9');

  it('keeps the era violation on cause, so the condition and its registered code stay reachable', () => {
    const violation = eraViolation();

    const error = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, violation);

    expect(error.cause).toBe(violation);
    expect(hasErrorCode(error.cause, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
  });

  it('keeps a non-era rejection on cause too, unreplaced', () => {
    const unreachable = new Error('indexer unreachable');

    const error = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, unreachable);

    expect(error.cause).toBe(unreachable);
  });

  it('states per CONDITION why a deployment is unconfirmed, because the two reasons differ', () => {
    const mislabelled = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, eraViolation());
    const unreadable = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, new Error('indexer unreachable'));

    expect(mislabelled.message).toContain('watchForDeployTxData');
    expect(unreadable.message).toContain('could not be read back');
    expect(mislabelled.message).not.toBe(unreadable.message);
  });

  it('ends both deploy conditions on the same remediation, because the caller does the same thing', () => {
    const mislabelled = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, eraViolation());
    const unreadable = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, new Error('indexer unreachable'));

    expect(mislabelled.message).toContain('may still finalize');
    expect(unreadable.message).toContain('may still finalize');
  });

  it('tells a deployment and an authority replacement apart by operation and message', () => {
    const deploy = new Ledger8UnconfirmedError('deploy', ADDRESS, SIGNING_KEY, new Error('down'));
    const replacement = new Ledger8UnconfirmedError('replace-authority', ADDRESS, SIGNING_KEY, new Error('down'));

    expect(deploy.operation).toBe('deploy');
    expect(replacement.operation).toBe('replace-authority');
    expect(deploy.message).toContain('The ledger 8 deployment of the contract');
    expect(replacement.message).toContain('The maintenance authority replacement for the ledger 8 contract');
    expect(replacement.message).toContain('MaintenanceAuthorityMismatchError');
    expect(replacement.message).toContain('The new key was NOT stored');
  });

  it.each(['deploy', 'replace-authority'] as const)(
    'carries the %s signing key and says where to read it, without printing the key itself',
    (operation) => {
      const error = new Ledger8UnconfirmedError(operation, ADDRESS, SIGNING_KEY, eraViolation());

      expect(error.signingKey).toBe(SIGNING_KEY);
      expect(error.contractAddress).toBe(ADDRESS);
      expect(error.name).toBe('Ledger8UnconfirmedError');
      expect(error.code).toBe(CONTRACTS_ERROR_CODES.LEDGER8_UNCONFIRMED);
      expect(error.message).toContain('signingKey');
      expect(error.message).not.toContain(SIGNING_KEY.value);
    }
  );
});

describe('Ledger8NotStoredError', () => {
  const SIGNING_KEY: SigningKey = { tag: 'schnorr', value: 'c3'.repeat(32) };
  const ADDRESS = '0400'.repeat(8);

  it('keeps the store rejection on cause, unreplaced', () => {
    const refused = new Error('signing-key sublevel is read-only');

    const error = new Ledger8NotStoredError('deploy', ADDRESS, SIGNING_KEY, 'signing-key', refused);

    expect(error.cause).toBe(refused);
    expect(error.name).toBe('Ledger8NotStoredError');
    expect(error.code).toBe(CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED);
  });

  it('says which write a deployment was refused, because the two lose different things', () => {
    const key = new Ledger8NotStoredError('deploy', ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));
    const state = new Ledger8NotStoredError('deploy', ADDRESS, SIGNING_KEY, 'private-state', new Error('refused'));

    expect(key.stage).toBe('signing-key');
    expect(state.stage).toBe('private-state');
    expect(key.message).toContain('SIGNING KEY');
    expect(state.message).toContain('INITIAL PRIVATE STATE');
    expect(key.message).not.toBe(state.message);
  });

  it('tells the caller NOT to deploy again, because the contract already exists', () => {
    const error = new Ledger8NotStoredError('deploy', ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));

    expect(error.message).toContain('CONFIRMED on chain');
    expect(error.message).toContain('Do NOT deploy again');
  });

  it('says the authority was REPLACED when a replacement key could not be stored', () => {
    const error = new Ledger8NotStoredError('replace-authority', ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));

    expect(error.operation).toBe('replace-authority');
    expect(error.message).toContain('was REPLACED on chain');
    expect(error.message).toContain('The key held before no longer authorizes anything');
    expect(error.message).not.toContain('Do NOT deploy again');
  });

  it.each([
    ['deploy', (): Ledger8NotStoredError => new Ledger8NotStoredError('deploy', ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'))],
    ['replace-authority', (): Ledger8NotStoredError => new Ledger8NotStoredError('replace-authority', ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'))]
  ])(
    'carries the %s signing key and says where to read it, without printing the key itself',
    (_operation, build) => {
      const error = build();

      expect(error.signingKey).toBe(SIGNING_KEY);
      expect(error.contractAddress).toBe(ADDRESS);
      expect(error.message).toContain('signingKey');
      expect(error.message).not.toContain(SIGNING_KEY.value);
    }
  );

  it('refuses at compile time a replacement stage the replacement cannot have', () => {
    // @ts-expect-error a replacement only ever stores the signing key
    const error = new Ledger8NotStoredError('replace-authority', ADDRESS, SIGNING_KEY, 'private-state', new Error('x'));

    expect(error.operation).toBe('replace-authority');
  });
});

describe('Ledger8SigningKeyError', () => {
  const ADDRESS = '0500'.repeat(8);

  it('names the address and the option, and says what a retained key looks like, when the key is unusable', () => {
    const error = new Ledger8SigningKeyError('unusable', ADDRESS);

    expect(error.reason).toBe('unusable');
    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.name).toBe('Ledger8SigningKeyError');
    expect(error.code).toBe(CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY);
    expect(error.message).toContain(ADDRESS);
    expect(error.message).toContain('signingKey');
    expect(error.message).toContain('schnorr');
    expect(error.message).toContain('64');
  });

  it('refuses a key supplied before any address exists, without naming one', () => {
    const error = new Ledger8SigningKeyError('unusable');

    expect(error.contractAddress).toBeUndefined();
    expect(error.message).toContain('signingKey');
    expect(error.message).not.toContain('undefined');
  });

  it('never renders the value it refused, and does not carry it as a member either', () => {
    const supplied = 'd4'.repeat(20);

    const error = new Ledger8SigningKeyError('unusable', ADDRESS);

    expect(error.message).not.toContain(supplied);
    expect('signingKey' in error).toBe(false);
  });

  it('names the address and the remedy when no key is held, and keeps the store failure on cause', () => {
    const storeFailure = new Error('wrong store password');

    const error = new Ledger8SigningKeyError('unavailable', ADDRESS, { cause: storeFailure });

    expect(error.reason).toBe('unavailable');
    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.cause).toBe(storeFailure);
    expect(error.message).toContain(`No usable ledger 8 signing key is held for the contract at '${ADDRESS}'`);
    expect(error.message).toContain('privateStateProvider.setSigningKey(address, key)');
    expect('signingKey' in error).toBe(false);
  });

  it('carries no cause when the store was readable', () => {
    const error = new Ledger8SigningKeyError('unavailable', ADDRESS);

    expect(error.cause).toBeUndefined();
  });
});

describe('Ledger8CallUnsupportedError', () => {
  const RECIPIENT = 'be'.repeat(32);

  it('tells a CALL to add the recipient to the mappings on its call options, and says nothing about deploys', () => {
    const error = new Ledger8CallUnsupportedError('unmappable-recipient', 'mintAndSendShielded', RECIPIENT);

    expect(error.reason).toBe('unmappable-recipient');
    expect(error.circuitId).toBe('mintAndSendShielded');
    expect(error.recipientCoinPublicKey).toBe(RECIPIENT);
    expect(error.code).toBe(CONTRACTS_ERROR_CODES.LEDGER8_CALL_UNSUPPORTED);
    expect(error.message).toContain("Circuit 'mintAndSendShielded'");
    expect(error.message).toContain(RECIPIENT);
    expect(error.message).toMatch(/to `additionalCoinEncPublicKeyMappings` on the call options/);
    expect(error.message).not.toMatch(/deploy/);
  });

  it('tells a DEPLOY its options take no mappings, and does not send it after the call options', () => {
    const error = new Ledger8CallUnsupportedError('unmappable-recipient', 'initialState', RECIPIENT);

    expect(error.circuitId).toBe('initialState');
    expect(error.message).toContain(RECIPIENT);
    expect(error.message).toMatch(/constructor/);
    expect(error.message).toMatch(/ledger 8 deploy takes no `additionalCoinEncPublicKeyMappings`/);
    expect(error.message).not.toMatch(/on the call options/);
  });

  it('names the circuit and the missing chain state when a call spends a held shielded coin', () => {
    const error = new Ledger8CallUnsupportedError('shielded-spend', 'spend');

    expect(error.reason).toBe('shielded-spend');
    expect(error.recipientCoinPublicKey).toBeUndefined();
    expect(error.message).toContain("Circuit 'spend' spends a shielded coin the contract already holds on chain");
    expect(error.message).toContain('Zswap chain state');
  });

  it('refuses at compile time an unmappable-recipient call that names no recipient', () => {
    // @ts-expect-error the recipient is required for this reason, because the message names it
    const error = new Ledger8CallUnsupportedError('unmappable-recipient', 'mint');

    expect(error.reason).toBe('unmappable-recipient');
  });
});
