/*
 * This file is part of platform-js.
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

import * as Brand from 'effect/Brand';
import * as Option from 'effect/Option'
import * as Either from 'effect/Either';
import { NodeInspectSymbol } from 'effect/Inspectable';
import type * as Hex from '../Hex.js';
import * as ParseError from '../ParseError.js';
import * as IntegerRange from '../IntegerRange.js';

const HEX_STRING_REGEXP = /^(?<prefix>(0x)?)(?<byteChars>([0-9A-Fa-f]{2})*)(?<incompleteChars>.*)$/;

/** @internal */
export const parseHex: (source: string) => Either.Either<Hex.ParsedHexString, ParseError.ParseError> =
  (source) => {
    if (!source) {
      return Either.left(ParseError.make('Source string must have non-zero length', source));
    }
    const match = source.match(HEX_STRING_REGEXP);
    if (!match || !match.groups) {
      return Either.left(ParseError.make(`Source string '${source}' is not a valid hex-string`, source));
    }
    const { prefix, byteChars, incompleteChars } = match.groups;
    const parsedHex: Hex.ParsedHexString = {
      hasPrefix: Boolean(prefix),
      byteChars: byteChars || '',
      incompleteChars: incompleteChars || '',
      toString: () => `${prefix}${byteChars}..[${incompleteChars ?? '<none>'}]`,
      toJSON: () => match.groups,
      [NodeInspectSymbol]: () => match.groups
    };
    if (parsedHex.incompleteChars) {
      if (parsedHex.incompleteChars.length % 2 > 0) {
        return Either.left(ParseError.make(`Last byte of source string '${source}' is incomplete`, source, parsedHex));
      }
      const invalidCharPos = parsedHex.byteChars.length + (parsedHex.hasPrefix ? 2 : 0);
      return Either.left(
        ParseError.make(
          `Invalid hex-digit '${source[invalidCharPos]}' found in source string at index ${invalidCharPos}`,
          source,
          parsedHex
        )
      );
    }
    if (!parsedHex.byteChars) {
      return Either.left(ParseError.make(`Source string '${source}' is not a valid hex-string`, source, parsedHex));
    }
    return Either.right(parsedHex);
  };

type HexConstraints = Hex.HexConstraints & {
  readonly allowPrefix? : boolean;
}

const defaultHexConstructionConstraints: HexConstraints = {
  allowPrefix: true
};

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const make: <T extends Brand.Branded<string, any>>(constraints?: HexConstraints) => Brand.Brand.Constructor<T> =
  <T extends Brand.Branded<string, any>>(options?: Hex.HexConstraints) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const mergedOptions = { ...defaultHexConstructionConstraints, ...options };
    return Brand.refined<T>(
      (source: string) => Either.match(parseHex(source), {
        onLeft: (error) => Option.some(Brand.error(error.message, error.meta)),
        onRight: (parsedHex) => {
          if (parsedHex.hasPrefix && !mergedOptions.allowPrefix) {
            return Option.some(Brand.error(`Source string '${source}' has a '0x' prefix but prefixes are not allowed`));
          }
          if (mergedOptions.byteLength) {
            const byteLength = IntegerRange.isIntegerRange(mergedOptions.byteLength)
              ? mergedOptions.byteLength
              : IntegerRange.from(mergedOptions.byteLength);
            const actualByteLen = parsedHex.byteChars.length / 2;
            if (!IntegerRange.contains(byteLength, actualByteLen)) {
              return Option.some(Brand.error(`Source string '${source}' has a byte length of ${actualByteLen}, but expected ${byteLength.toString()}`));
            }
          }
          return Option.none();
        }
      }));
  };
