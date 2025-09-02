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

/* eslint-disable @typescript-eslint/no-use-before-define */

import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import { pipeArguments, type Pipeable } from 'effect/Pipeable';
import { hasProperty, isNumber, isString } from 'effect/Predicate';
import { NodeInspectSymbol, type Inspectable } from 'effect/Inspectable';

const TypeId: unique symbol = Symbol.for('platform-js/effect/IntegerRange');
export type TypeId = typeof TypeId;

/**
 * An integer range, bounded inclusively of its minimum value, and either inclusively or exclusively of
 * its maximum value.
 */
export interface IntegerRange extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId;
  readonly value: IntegerRangeValue;
}

/**
 * Describes the internal structure of an {@link IntegerRange}.
 */
export type IntegerRangeValue =
  | { readonly _tag: 'Inclusive'; readonly min: number; readonly max: number }
  | { readonly _tag: 'Exclusive'; readonly min: number; readonly max: number };

/**
 * An input for constructing {@link IntegerRange} instances.
 * 
 * @remarks
 * The tuple form of {@link IntegerRangeInput}, when used with {@link from}, will create an
 * {@link IntegerRange} that is _exclusive_ of `max` ( i.e., `min <= x < max`). When used with {@link inclusive} or
 * {@link exclusive}, `max` will be _inclusive_ or _exclusive_ respectively.
 * 
 * The template string forms of {@link IntegerRangeInput} represent _inclusive_ or _exclusive_ ranges as follows:
 * - `'n..m'` will create a _exclusive_ range that contains all values `x` where `n <= x < m`, and
 * - `'n..=m'` will create an _inclusive_ range that contains all values `x` where `n <= x <= m`.
 */
export type IntegerRangeInput =
  | IntegerRange
  | readonly [min: number, max: number]
  | `${number}..${number}` // Exclusive.
  | `${number}..=${number}`; // Inclusive.

/**
 * Provides equivalence for {@link IntegerRange} instances.
 * 
 * @remarks
 * For two {@link IntegerRange} instances to be considered equal, both their minimum and maximum values
 * must be equal, and they should both have the same type of inclusion (i.e., inclusive or exclusive). This is
 * not _range equivalence_ which determines if two {@link IntegerRange} instances represent the same sequence
 * of values.
 *
 * @category equivalence
 */
export const Equivalence: equivalence.Equivalence<IntegerRange> =
  equivalence.struct({
    value: equivalence.struct({
      _tag: equivalence.string,
      min: equivalence.number,
      max: equivalence.number
    })
  });

/**
 * Determines if a value is an integer range.
 *
 * @param u The value to check.
 * @returns `true` if `u` is an {@link IntegerRange}; `false` otherwise.
 *
 * @category guards
 */
export const isIntegerRange = (u: unknown): u is IntegerRange => hasProperty(u, TypeId);

/**
 * Determines if an integer range will be _inclusive_ of its maximum value.
 *
 * @param self The {@link IntegerRange} to check.
 * @returns `true` if `self` is an inclusive {@link IntegerRange}; `false` otherwise.
 *
 * @category guards
 */
export const isInclusive = (self: IntegerRange): boolean => self.value._tag === 'Inclusive';

/**
 * Determines if an integer range will be _exclusive_ of its maximum value.
 *
 * @param self The {@link IntegerRange} to check.
 * @returns `true` if `self` is an exclusive {@link IntegerRange}; `false` otherwise.
 *
 * @category guards
 */
export const isExclusive = (self: IntegerRange): boolean => self.value._tag === 'Exclusive';

/**
 * Determines if two integer ranges are equal.
 *
 * @category predicates
 */
export const equals: {
  (that: IntegerRange): (self: IntegerRange) => boolean;
  (self: IntegerRange, that: IntegerRange): boolean;
} = dual(2, (self: IntegerRange, that: IntegerRange): boolean => Equivalence(self, that));

/**
 * Determines if an integer range is inclusive of a value.
 *
 * @category predicates
 */
export const contains: {
  (value: number): (self: IntegerRange) => boolean;
  (self: IntegerRange, value: number): boolean;
} = dual(2, (self: IntegerRange, value: number): boolean => {
  if (isInclusive(self)) {
    return contains(from([self.value.min, self.value.max + 1]), value);
  }
  const { min, max } = self.value;
  return value >= min && value < max;
});

/**
 * Creates _inclusive_ integer ranges.
 *
 * @category constructors
 */
export const inclusive: {
  /**
   * @param range A tuple defining the minimum and maximum values of the integer range.
   * @returns An {@link IntegerRange} that is _inclusive_ of its maximum value.
   */
  (range: readonly [min: number, max: number]): IntegerRange;
  /**
   * Creates an _inclusive_ integer range that is equivalent to a source {@link IntegerRange} with regards to
   * the values that it can contain.
   *
   * @param range The {@link IntegerRange} to use as a basis for an _inclusive_ integer range .
   * @returns `range`, if `range` is already an _inclusive_ integer range; otherwise, a new {@link IntegerRange} that
   * is an _inclusive_ version of `range`.
   */
  (range: IntegerRange): IntegerRange;
} = (range) => {
  if (isIntegerRange(range)) {
    return isInclusive(range)
      ? range // Already inclusive, return it.
      : make([range.value.min, range.value.max - 1], 'Inclusive');
  }
  return make(range, 'Inclusive');
};

/**
 * Creates _exclusive_ integer ranges.
 *
 * @category constructors
 */
export const exclusive: {
  /**
   * @param range A tuple defining the minimum and maximum values of the integer range.
   * @returns An {@link IntegerRange} that is _exclusive_ of its maximum value.
   */
  (range: readonly [min: number, max: number]): IntegerRange;
  /**
   * Creates an _exclusive_ integer range that is equivalent to a source {@link IntegerRange} with regards to
   * the values that it can contain.
   *
   * @param range The {@link IntegerRange} to use as a basis for an _exclusive_ integer range .
   * @returns `range`, if `range` is already an _exclusive_ integer range; otherwise, a new {@link IntegerRange} that
   * is an _exclusive_ version of `range`.
   */
  (range: IntegerRange): IntegerRange;
} = (range) => {
  if (isIntegerRange(range)) {
    return isExclusive(range)
      ? range // Already exclusive, return it.
      : make([range.value.min, range.value.max + 1], 'Exclusive');
  }
  return make(range, 'Exclusive');
};

/**
 * Creates an integer range.
 *
 * @param input The input to use when constructing the integer range.
 * @returns An {@link IntegerRange} derived from `input`.
 * 
 * @remarks
 * The tuple form of {@link IntegerRangeInput}, will create an {@link IntegerRange} that is _exclusive_
 * of `max` ( i.e., `min <= x < max`).
 *
 * @category constructors
 */
export const from: (input: IntegerRangeInput) => IntegerRange =
  (input) => make(input);

const RANGE_REGEXP = /(?<n>\d*)\.\.(?<inc>\=?)(?<x>\d*)/; // eslint-disable-line no-useless-escape
const DEFAULT_ARRAY_INPUT_MODE: IntegerRangeValue['_tag'] = 'Exclusive';

const IntegerRangeProto: Omit<IntegerRange, 'value'> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: IntegerRange) {
    return Hash.cached(this, Hash.structure(this.value))
  },
  [Equal.symbol](this: IntegerRange, that: unknown) {
    return isIntegerRange(that) && equals(this, that)
  },
  toString(this: IntegerRange) {
    const { min, max, _tag } = this.value;
    const sep = _tag === 'Inclusive' ? '..=' : '..';
    return `${min}${sep}${max}`;
  },
  toJSON(this: IntegerRange) {
    return {
      _id: 'IntegerRange',
      ...this.value
    };
  },
  [NodeInspectSymbol](this: IntegerRange) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments); // eslint-disable-line prefer-rest-params
  }
}

const make = (input: IntegerRangeInput, arrayInputMode?: IntegerRangeValue['_tag']): IntegerRange => {
  const self = Object.create(IntegerRangeProto);
  if (isIntegerRange(input)) {
    self.value = input.value;
  }
  else if (Array.isArray(input) && input.length === 2 && input.every(isNumber)) {
    const [min, max] = input;
    self.value = {
      _tag: arrayInputMode ?? DEFAULT_ARRAY_INPUT_MODE,
      min,
      max
    };
  }
  else if (isString(input)) {
    const match = input.match(RANGE_REGEXP);
    if (!match || !match.groups) {
      throw new Error(`Invalid IntegerRange: ${input}`);
    }
    const { n, inc, x } = match.groups;
    const min = Number(n);
    const max = Number(x);
    if (!isNumber(min) || !isNumber(max)) {
      throw new TypeError(`Invalid IntegerRange: ${input}`);
    }
    self.value = {
      _tag: inc === '=' ? 'Inclusive' : 'Exclusive',
      min,
      max
    };
  }
  else {
    throw new Error('Invalid IntegerRange');
  }
  return self;
}
