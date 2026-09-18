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

import {
  type AnyProvableCircuitId,
  FailEntirely,
  FailFallible,
  type FinalizedTxData,
  type FinalizedTxDataV8,
  SegmentFail,
  SegmentSuccess,
  type TxStatus
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import {
  AnyEraTxFailedError,
  CallTxFailedError,
  EraInvariantViolationError,
  IncompleteDeployContractPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  Ledger8CallTxFailedError,
  Ledger8DeployNotStoredError,
  Ledger8DeployTxFailedError,
  Ledger8DeployUnconfirmedError,
  Ledger8SigningKeyUnusableError,
  TxFailedError
} from '../errors';
import { createMockFinalizedTxData } from './test-mocks';

// The v8 arm of the record union. Its `tx` is a live `V8Transaction` handle
// from the retained ledger module, which no unit test can construct and none
// of these read -- every assertion here is about the tag and the members
// around it. One cast, in one place, rather than one per call site.
const v8FailedRecord = (status: TxStatus = FailFallible): FinalizedTxDataV8 => ({
  ...createMockFinalizedTxData(status),
  version: 'v8',
  tx: undefined as unknown as FinalizedTxDataV8['tx']
});

describe('TxFailedError', () => {
  it('should serialize segmentStatusMap in error message', () => {
    const segmentStatusMap = new Map([
      [0, SegmentSuccess],
      [1, SegmentFail]
    ]);
    const finalizedTxData: FinalizedTxData = {
      ...createMockFinalizedTxData(FailFallible),
      segmentStatusMap
    };

    const error = new TxFailedError(finalizedTxData);

    const parsed = JSON.parse(error.message);
    expect(parsed.segmentStatusMap).toBeDefined();
    expect(parsed.segmentStatusMap['0']).toBe(SegmentSuccess);
    expect(parsed.segmentStatusMap['1']).toBe(SegmentFail);
  });

  it('should handle undefined segmentStatusMap', () => {
    const finalizedTxData = createMockFinalizedTxData(FailFallible);

    const error = new TxFailedError(finalizedTxData);

    expect(() => JSON.parse(error.message)).not.toThrow();
  });

  it('should serialize empty segmentStatusMap as empty object', () => {
    const finalizedTxData: FinalizedTxData = {
      ...createMockFinalizedTxData(FailFallible),
      segmentStatusMap: new Map()
    };

    const error = new TxFailedError(finalizedTxData);

    const parsed = JSON.parse(error.message);
    expect(parsed.segmentStatusMap).toEqual({});
  });
});

describe('the era-agnostic failure base', () => {
  // Before this base existed a caller had to know that the current era throws
  // `CallTxFailedError extends TxFailedError` carrying `finalizedTxData` and
  // the retained era throws `Ledger8CallTxFailedError extends Error` carrying
  // `txData`. So `instanceof CallTxFailedError` missed every retained-era
  // failure -- silently, which is the part that matters -- and a caller that
  // caught both still read the record through two different member names.

  it('catches a failure from EITHER era with one instanceof', () => {
    const currentEra = new CallTxFailedError(createMockFinalizedTxData(FailFallible), 'testCircuit');
    const retainedEra = new Ledger8CallTxFailedError(createMockFinalizedTxData(FailFallible), 'increment');

    expect(currentEra).toBeInstanceOf(AnyEraTxFailedError);
    expect(retainedEra).toBeInstanceOf(AnyEraTxFailedError);
    // And the pre-existing hierarchy is untouched: the retained-era class is
    // still NOT a `CallTxFailedError`, because it cannot carry that class's
    // v9-only record. The base is what the two now share, not that one.
    expect(retainedEra).not.toBeInstanceOf(CallTxFailedError);
    expect(currentEra).toBeInstanceOf(TxFailedError);
  });

  it('reads the record through ONE member in either era, without dropping the old names', () => {
    const record = createMockFinalizedTxData(FailFallible);
    const currentEra = new CallTxFailedError(record, 'testCircuit');
    const retainedEra = new Ledger8CallTxFailedError(record, 'increment');

    // The era-agnostic read path...
    expect(currentEra.record).toBe(record);
    expect(retainedEra.record).toBe(record);
    // ...alongside each era's own historical member, so nothing reading those
    // breaks.
    expect(currentEra.finalizedTxData).toBe(record);
    expect(retainedEra.txData).toBe(record);
  });

  it('carries the retained era version-tagged record, which the v9-only member could not hold', () => {
    // The reason the two cannot share a record TYPE: a retained-era call is
    // recorded by whichever era the head is on, so its record is the tagged
    // union. Reading it through `record` requires narrowing on `version`.
    const retainedEra = new Ledger8CallTxFailedError(v8FailedRecord(), 'increment');

    expect(retainedEra.record.version).toBe('v8');
  });
});

describe('CallTxFailedError', () => {
  it('should include circuitId and serialized segmentStatusMap', () => {
    const circuitId = 'testCircuit' as AnyProvableCircuitId;
    const segmentStatusMap = new Map([
      [0, SegmentSuccess],
      [1, SegmentFail]
    ]);
    const finalizedTxData: FinalizedTxData = {
      ...createMockFinalizedTxData(FailFallible),
      segmentStatusMap
    };

    const error = new CallTxFailedError(finalizedTxData, circuitId);

    const parsed = JSON.parse(error.message);
    expect(parsed.circuitId).toBe(circuitId);
    expect(parsed.segmentStatusMap['0']).toBe(SegmentSuccess);
    expect(parsed.segmentStatusMap['1']).toBe(SegmentFail);
  });
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

  it('carries its own name, so a handler that discriminates by name can tell the two apart', () => {
    // `Error.name` defaults to `'Error'` on a subclass that does not set it, which makes
    // name-based discrimination -- the route a serialized error across a worker or an IPC boundary
    // leaves a caller -- report both of these, and every other `Error`, as the same condition.
    expect(new IncompleteDeployContractPrivateStateConfig().name).toBe('IncompleteDeployContractPrivateStateConfig');
    expect(new IncompleteFindContractPrivateStateConfig().name).toBe('IncompleteFindContractPrivateStateConfig');
  });
});

describe('Ledger8DeployTxFailedError', () => {
  const SIGNING_KEY = 'a1'.repeat(32);
  const ADDRESS = '0200'.repeat(8);

  it('reads the record through the era-agnostic member and names the address it composed', () => {
    const record = v8FailedRecord();

    const error = new Ledger8DeployTxFailedError(record, ADDRESS, SIGNING_KEY);

    expect(error).toBeInstanceOf(AnyEraTxFailedError);
    expect(error.record).toBe(record);
    expect(error.txData).toBe(record);
    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.record.version).toBe('v8');
  });

  it('states per STATUS what landed on chain, because the two statuses differ', () => {
    // A `ContractDeploy` sits in the Intent -- the GUARANTEED part -- so on `FailFallible` the
    // contract DID land, under the authority this key built. One message for both statuses told
    // that caller nothing local refers to the address, and it never went looking for the
    // deployment it now owns and cannot maintain.
    const fallible = new Ledger8DeployTxFailedError(v8FailedRecord(FailFallible), ADDRESS, SIGNING_KEY);
    const entirely = new Ledger8DeployTxFailedError(v8FailedRecord(FailEntirely), ADDRESS, SIGNING_KEY);

    expect(fallible.message).toContain('LANDED');
    expect(entirely.message).toContain('Nothing was deployed');
    expect(fallible.message).not.toBe(entirely.message);
  });

  it('carries the signing key, and says where to read it, without printing the key itself', () => {
    const error = new Ledger8DeployTxFailedError(v8FailedRecord(), ADDRESS, SIGNING_KEY);

    expect(error.signingKey).toBe(SIGNING_KEY);
    expect(error.message).toContain('signingKey');
    // The key is a SECRET. Named as a member to read, never rendered: an error message reaches
    // logs, crash reporters and issue trackers, and this one is the only copy of the authority
    // over the deployed contract.
    expect(error.message).not.toContain(SIGNING_KEY);
  });
});

describe('Ledger8DeployUnconfirmedError', () => {
  const SIGNING_KEY = 'b2'.repeat(32);
  const ADDRESS = '0300'.repeat(8);
  const eraViolation = (): EraInvariantViolationError =>
    new EraInvariantViolationError('watchForDeployTxData', undefined, 'v8', 'v9');

  it('keeps the era violation on cause, so the condition and its registered code stay reachable', () => {
    // The class no longer EXTENDS the violation, so `cause` is the only route left to the seam and
    // the code a caller branches on. Dropping it would strand the original stack too.
    const violation = eraViolation();

    const error = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, violation);

    expect(error.cause).toBe(violation);
    expect(error.cause instanceof EraInvariantViolationError).toBe(true);
    expect(hasErrorCode(error.cause, CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION)).toBe(true);
  });

  it('keeps a non-era rejection on cause too, unreplaced', () => {
    const unreachable = new Error('indexer unreachable');

    const error = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, unreachable);

    expect(error.cause).toBe(unreachable);
    expect(error.cause instanceof EraInvariantViolationError).toBe(false);
  });

  it('states per CONDITION why the deployment is unconfirmed, because the two reasons differ', () => {
    // One class does not mean one message: a record that arrived from the wrong era and a record
    // that never arrived send a reader to different places to find out what happened.
    const mislabelled = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, eraViolation());
    const unreadable = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, new Error('indexer unreachable'));

    expect(mislabelled.message).toContain('watchForDeployTxData');
    expect(unreadable.message).toContain('could not be read back');
    expect(mislabelled.message).not.toBe(unreadable.message);
  });

  it('ends both conditions on the same remediation, because the caller does the same thing', () => {
    const mislabelled = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, eraViolation());
    const unreadable = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, new Error('indexer unreachable'));

    expect(mislabelled.message).toContain('may still finalize');
    expect(unreadable.message).toContain('may still finalize');
  });

  it('carries the signing key and says where to read it, without printing the key itself', () => {
    const error = new Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, eraViolation());

    expect(error.signingKey).toBe(SIGNING_KEY);
    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.name).toBe('Ledger8DeployUnconfirmedError');
    expect(error.message).toContain('signingKey');
    // The key is a SECRET, and after submission this error holds the only copy. Named as a member
    // to read, never rendered into text that reaches a log or an issue tracker.
    expect(error.message).not.toContain(SIGNING_KEY);
  });
});

describe('the recorded-failure code', () => {
  // The class hierarchy is the ergonomic route; the code is the one that
  // survives a second copy of this package in the process, which is a live
  // condition here for the ledger packages.
  it('is carried by both eras and by the subclasses that extend them', () => {
    const record = createMockFinalizedTxData(FailFallible);

    const errors: AnyEraTxFailedError[] = [
      new TxFailedError(record),
      new CallTxFailedError(record, 'increment'),
      new Ledger8CallTxFailedError(v8FailedRecord(), 'increment')
    ];

    expect(errors.map((error) => error.code)).toEqual([
      CONTRACTS_ERROR_CODES.TX_FAILED,
      CONTRACTS_ERROR_CODES.TX_FAILED,
      CONTRACTS_ERROR_CODES.TX_FAILED
    ]);
  });
});

describe('Ledger8DeployNotStoredError', () => {
  const SIGNING_KEY = 'c3'.repeat(32);
  const ADDRESS = '0400'.repeat(8);

  it('keeps the store rejection on cause, unreplaced', () => {
    const refused = new Error('signing-key sublevel is read-only');

    const error = new Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'signing-key', refused);

    // What the store refused is what an operator acts on; this class adds the one fact a store
    // rejection cannot carry, which is the key the confirmed deployment's authority was built from.
    expect(error.cause).toBe(refused);
    expect(error.name).toBe('Ledger8DeployNotStoredError');
  });

  it('says which write was refused, because the two lose different things', () => {
    const key = new Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));
    const state = new Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'private-state', new Error('refused'));

    expect(key.stage).toBe('signing-key');
    expect(state.stage).toBe('private-state');
    expect(key.message).toContain('SIGNING KEY');
    expect(state.message).toContain('INITIAL PRIVATE STATE');
    expect(key.message).not.toBe(state.message);
  });

  it('tells the caller NOT to deploy again, because the contract already exists', () => {
    // The harm this class exists to remove: read as "deploy failed, retry", a raw store rejection
    // mints a SECOND contract at a different address while the first sits on chain unmaintainable.
    const error = new Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));

    expect(error.message).toContain('CONFIRMED on chain');
    expect(error.message).toContain('Do NOT deploy again');
  });

  it('carries the signing key and says where to read it, without printing the key itself', () => {
    const error = new Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'signing-key', new Error('refused'));

    expect(error.signingKey).toBe(SIGNING_KEY);
    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.message).toContain('signingKey');
    // The key is a SECRET, and on the refused-key arm this error holds the only copy of it.
    expect(error.message).not.toContain(SIGNING_KEY);
  });
});

describe('Ledger8SigningKeyUnusableError', () => {
  const ADDRESS = '0500'.repeat(8);

  it('names the address and the option, and says what a retained key looks like', () => {
    const error = new Ledger8SigningKeyUnusableError(ADDRESS);

    expect(error.contractAddress).toBe(ADDRESS);
    expect(error.name).toBe('Ledger8SigningKeyUnusableError');
    expect(error.message).toContain(ADDRESS);
    expect(error.message).toContain('signingKey');
    expect(error.message).toContain('64');
  });

  it('never renders the value it refused, and does not carry it as a member either', () => {
    const supplied = 'd4'.repeat(20);

    const error = new Ledger8SigningKeyUnusableError(ADDRESS);

    // The caller already holds the value it passed, so this error has no reason to hold a second
    // copy -- and an error message reaches logs and issue trackers.
    expect(error.message).not.toContain(supplied);
    expect('signingKey' in error).toBe(false);
  });
});
