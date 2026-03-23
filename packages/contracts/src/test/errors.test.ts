import {
  type AnyProvableCircuitId,
  FailFallible,
  type FinalizedTxData,
  SegmentFail,
  SegmentSuccess
} from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { CallTxFailedError, TxFailedError } from '../errors';
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
