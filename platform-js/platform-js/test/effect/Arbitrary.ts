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

import * as fc from 'effect/FastCheck';
import * as IntegerRange from '@midnight-ntwrk/platform-js/effect/IntegerRange';

export const makeNetworkIdArbitrary: () => fc.Arbitrary<string> =
  () => fc.stringMatching(/^(dev|test)-[0-9a-fA-F]{4,8}-0[1-9]$/);

export const makePlainHexArbitrary: (inputOrRange: IntegerRange.IntegerRangeInput | IntegerRange.IntegerRange) => fc.Arbitrary<string> =
  (inputOrRange) => fc.stringMatching(hexRegExp(inputOrRange));

export const makePrefixedHexArbitrary: (inputOrRange: IntegerRange.IntegerRangeInput | IntegerRange.IntegerRange) => fc.Arbitrary<string> =
  (inputOrRange) => fc.stringMatching(hexRegExp(inputOrRange, { includePrefix: true }));

export const makeHexArbitrary: (inputOrRange: IntegerRange.IntegerRangeInput | IntegerRange.IntegerRange) => fc.Arbitrary<string> =
  (inputOrRange) => fc.oneof(
    makePlainHexArbitrary(inputOrRange),
    makePrefixedHexArbitrary(inputOrRange)
  );

type HexRegExpOptions = {
  readonly includePrefix?: boolean;
}

const hexRegExp: (input: IntegerRange.IntegerRangeInput, options?: HexRegExpOptions) => RegExp =
  (input, options) => {
    const mergedOptions = { ...defaultHexRegExpOptions, ...options };
    const byteLength = IntegerRange.isIntegerRange(input)
      ? input
      : IntegerRange.from(input);
    const { min, max } = IntegerRange.inclusive(byteLength).value;
    return new RegExp(`^${mergedOptions.includePrefix ? '0x' : ''}([0-9a-fA-F]{2}){${min},${max}}$`);
  };

const defaultHexRegExpOptions: HexRegExpOptions = {
  includePrefix: false
}
