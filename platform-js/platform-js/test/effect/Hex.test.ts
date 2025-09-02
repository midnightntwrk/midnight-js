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
import { Effect } from 'effect';
import * as Hex from '@midnight-ntwrk/platform-js/effect/Hex';
import * as ParseError from '@midnight-ntwrk/platform-js/effect/ParseError';
import * as fc from 'effect/FastCheck';
import * as Arbitrary from './Arbitrary.js';

describe('Hex', () => {
  describe('parseHex', () => {
    it('should parse plain hex-encodings', () => fc.assert(
      fc.asyncProperty(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) => Effect.gen(function* () {
        const result = yield* Hex.parseHex(hex);
        expect(result.hasPrefix).toBe(false);
        expect(result.byteChars).toEqual(hex);
        expect(result.incompleteChars.length).toBe(0);
      }).pipe(Effect.runPromise))
    ));

    it('should parse prefixed hex-encodings', () => fc.assert(
      fc.asyncProperty(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) => Effect.gen(function* () {
        const result = yield* Hex.parseHex(hex);
        expect(result.hasPrefix).toBe(true);
        expect(result.byteChars).toEqual(hex.substring(2));
        expect(result.incompleteChars.length).toBe(0);
      }).pipe(Effect.runPromise))
    ));

    it.effect('should throw with an invalid hex-encoding', () => Effect.gen(function* () {
      const error = yield* Effect.flip(Hex.parseHex('HOSKYA'));
      expect(ParseError.isParseError(error)).toBeTruthy();
      expect(error).toMatchObject({
        message: 'Invalid hex-digit \'H\' found in source string at index 0'
      });
    }));
  });

  describe('PlainHex', () => {
    it('should parse plain hex-encodings', () => fc.assert(
      fc.property(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) => {
        expect(() => Hex.PlainHex(hex)).not.toThrowError();
      })
    ));

    it('should throw with prefixed hex-encodings', () => fc.assert(
      fc.property(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) => {
        expect(() => Hex.PlainHex(hex)).toThrowError();
      })
    ));
  });

  describe('PrefixedHex', () => {
    it('should parse prefixed hex-encodings', () => fc.assert(
      fc.property(Arbitrary.makePrefixedHexArbitrary('2..=10'), (hex) => {
        expect(() => Hex.PrefixedHex(hex)).not.toThrowError();
      })
    ));

    it('should throw with plain hex-encodings', () => fc.assert(
      fc.property(Arbitrary.makePlainHexArbitrary('2..=10'), (hex) => {
        expect(() => Hex.PrefixedHex(hex)).toThrowError();
      })
    ));
  });
});
