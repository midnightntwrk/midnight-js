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
  FailFallible,
  type FinalizedTxData,
  type FinalizedTxDataV8,
  SegmentFail,
  SegmentSuccess
} from '@midnight-ntwrk/midnight-js-types';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import {
  AnyEraTxFailedError,
  CallTxFailedError,
  EraInvariantViolationError,
  Ledger8CallTxFailedError,
  TxFailedError
} from '../errors';
import { createMockFinalizedTxData } from './test-mocks';

// The v8 arm of the record union. Its `tx` is a live `V8Transaction` handle
// from the retained ledger module, which no unit test can construct and none
// of these read -- every assertion here is about the tag and the members
// around it. One cast, in one place, rather than one per call site.
const v8FailedRecord = (): FinalizedTxDataV8 => ({
  ...createMockFinalizedTxData(FailFallible),
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
