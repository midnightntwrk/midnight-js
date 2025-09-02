/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { describe, it, expect } from '@effect/vitest';
import * as IntegerRange from '@midnight-ntwrk/platform-js/effect/IntegerRange';

describe('IntegerRange', () => {
  describe('from', () => {
    it.each<IntegerRange.IntegerRangeInput>([
      [0, 10] as const,
      [10, 100] as const,
      '0..10',
      '10..100'
    ])('should create an exclusive range with exclusive input %o', (input: IntegerRange.IntegerRangeInput) => {
      const range = IntegerRange.from(input);

      expect(IntegerRange.isExclusive(range)).toBe(true);
      expect(IntegerRange.isInclusive(range)).toBe(false);
    });

    it.each<IntegerRange.IntegerRangeInput>([
      '0..=10',
      '10..=100'
    ])('should create an inclusive range with inclusive input %o', (input: IntegerRange.IntegerRangeInput) => {
      const range = IntegerRange.from(input);

      expect(IntegerRange.isExclusive(range)).toBe(false);
      expect(IntegerRange.isInclusive(range)).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for two ranges equal by value', () => {
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.exclusive([0, 10]);
      const c = IntegerRange.from('0..10');
      
      expect(IntegerRange.equals(a, b)).toBe(true);
      expect(IntegerRange.equals(a, c)).toBe(true);
    });

    it('should return false for two ranges different by value', () => {
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.inclusive([0, 10]);
      const c = IntegerRange.from([0, 11]);
      
      expect(IntegerRange.equals(a, b)).toBe(false);
      expect(IntegerRange.equals(a, c)).toBe(false);
    });
  });

  describe('inclusive', () => {
    it('should create an inclusive range from component parts', () => {
      const range = IntegerRange.inclusive([0, 10]);

      expect(IntegerRange.isInclusive(range)).toBe(true);
      expect(IntegerRange.isExclusive(range)).toBe(false);
    });

    it('should return an already inclusive range', () => {
      const sourceRange = IntegerRange.from('0..=10');
      const range = IntegerRange.inclusive(sourceRange);

      expect(IntegerRange.isInclusive(range)).toBe(true);
      expect(IntegerRange.isExclusive(range)).toBe(false);
      expect(range).toBe(sourceRange);
      expect(IntegerRange.equals(sourceRange, range)).toBe(true);
    });

    it('should return an inclusive equivalent of an exclusive range', () => {
      const sourceRange = IntegerRange.from('0..10');
      const range = IntegerRange.inclusive(sourceRange);

      expect(IntegerRange.isInclusive(range)).toBe(true);
      expect(IntegerRange.isExclusive(range)).toBe(false);
      expect(range).not.toBe(sourceRange);
      expect(IntegerRange.equals(sourceRange, range)).not.toBe(true);
      // TODO: add rangeEquals
    });
  });

  describe('exclusive', () => {
    it('should create an inclusive range from component parts', () => {
      const range = IntegerRange.exclusive([0, 10]);

      expect(IntegerRange.isExclusive(range)).toBe(true);
      expect(IntegerRange.isInclusive(range)).toBe(false);
    });

    it('should return an already exclusive range', () => {
      const sourceRange = IntegerRange.from('0..10');
      const range = IntegerRange.exclusive(sourceRange);

      expect(IntegerRange.isExclusive(range)).toBe(true);
      expect(IntegerRange.isInclusive(range)).toBe(false);
      expect(range).toBe(sourceRange);
      expect(IntegerRange.equals(sourceRange, range)).toBe(true);
    });

    it('should return an exclusive equivalent of an inclusive range', () => {
      const sourceRange = IntegerRange.from('0..=10');
      const range = IntegerRange.exclusive(sourceRange);

      expect(IntegerRange.isExclusive(range)).toBe(true);
      expect(IntegerRange.isInclusive(range)).toBe(false);
      expect(range).not.toBe(sourceRange);
      expect(IntegerRange.equals(sourceRange, range)).not.toBe(true);
      // TODO: add rangeEquals
    });
  });

  describe('contains', () => {
    it('should return true for ranges inclusive of a given value', () => {
      const effectiveMax = 9;
      const a = IntegerRange.from([0, 10]);
      const b = IntegerRange.exclusive([0, 10]);
      const c = IntegerRange.inclusive([0, 9]);
      
      expect(IntegerRange.contains(a, effectiveMax)).toBe(true);
      expect(IntegerRange.contains(b, effectiveMax)).toBe(true);
      expect(IntegerRange.contains(c, effectiveMax)).toBe(true);
    });
  });
});
