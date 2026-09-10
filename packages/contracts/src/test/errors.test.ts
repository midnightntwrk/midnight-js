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
  SegmentFail,
  SegmentSuccess
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { AnyEraTxFailedError, CallTxFailedError, Ledger8CallTxFailedError, TxFailedError } from '../errors';
import { createMockFinalizedTxData } from './test-mocks';

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
    const v8Record = { ...createMockFinalizedTxData(FailFallible), version: 'v8' as const, tx: undefined as never };
    const retainedEra = new Ledger8CallTxFailedError(v8Record, 'increment');

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
