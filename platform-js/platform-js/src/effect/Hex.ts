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

import type * as Brand from 'effect/Brand';
import type * as Either from 'effect/Either';
import { type Inspectable } from 'effect/Inspectable';
import type * as IntegerRange from './IntegerRange.js';
import * as internal from './internal/hex.js';
import type * as ParseError from './ParseError.js';

/**
 * A hex-encoded string, of some arbitrary byte length, that may or may not have a `'0x'` prefix.
 * 
 * @remarks
 * `Hex` is a 'branded' string type defining a sequence of hexadecimal characters, and represented either as a
 * {@link Hex.PrefixableHex | PrefixableHex} or {@link Hex.PlainHex | PlainHex} instance.
 * 
 * It is possible to create custom `Hex` constructors that represent hex-encoded strings with specific constraints
 * (such as byte lengths), by invoking {@link ConstrainedPrefixableHex} or
 * {@link ConstrainedPlainHex} with options described by {@link HexConstraints}.
 * 
 * @see {@link ConstrainedPrefixableHex}
 * @see {@link ConstrainedPlainHex}
 * @category models
 */
export type Hex = Hex.PlainHex | Hex.PrefixableHex;

export declare namespace Hex {
  /**
   * A hex-encoded string, of some arbitrary byte length, that may or may not have a `'0x'` prefix.
   * 
   * @category models
   */
  export type PrefixableHex = Brand.Branded<string, 'PrefixableHex'>;

  /**
   * A plain hex-encoded string, of some arbitrary byte length.
   * 
   * @category models
   */
  export type PlainHex = Brand.Branded<string, 'PlainHex'>;
}

/**
 * Creates a hex-encoded string, of some arbitrary byte length, that may or may not have a `'0x'` prefix.
 * 
 * @category constructors
 */
export const PrefixableHex: Brand.Brand.Constructor<Hex.PrefixableHex> =
  internal.make<Hex.PrefixableHex>({ allowPrefix: true });

/**
 * Creates a hex-encoded string, from some given constraints, that may or may not have a `'0x'` prefix.
 *
 * @param constraints The {@link HexConstraints} to apply when parsing a received hex-encoded string.
 * @returns A function that creates a {@link Hex.PrefixableHex | PrefixableHex} instance from a received string
 * ensuring that it meets `constraints`.
 * 
 * @category constructors
 */
export const ConstrainedPrefixableHex: (constraints: HexConstraints) => Brand.Brand.Constructor<Hex.PrefixableHex> =
  (constraints) => internal.make<Hex.PrefixableHex>({ allowPrefix: true, ...constraints });

/**
 * Creates a plain hex-encoded string, of some arbitrary byte length.
 * 
 * @category constructors
 */
export const PlainHex: Brand.Brand.Constructor<Hex.PlainHex> =
  internal.make<Hex.PlainHex>({ allowPrefix: false });

/**
 * Creates a plain hex-encoded string, from some given constraints.
 *
 * @param constraints The {@link HexConstraints} to apply when parsing a received hex-encoded string.
 * @returns A function that creates a {@link Hex.PlainHex | PlainHex} instance from a received string
 * ensuring that it meets `constraints`.
 * 
 * @category constructors
 */
export const ConstrainedPlainHex: (constraints: HexConstraints) => Brand.Brand.Constructor<Hex.PlainHex> =
  (constraints) => internal.make<Hex.PlainHex>({ allowPrefix: false, ...constraints });
  
/**
 * Describes constraints for creating {@link Hex} constructors that parse hex-encoded strings.
 *
 * @see {@link Hex}
 * @category models
 */
export interface HexConstraints {
  /**
   * An {@link IntegerRange.IntegerRangeInput | IntegerRangeInput} describing the minimum and maximum number
   * of bytes a hex-encoded string should represent.
   */
  readonly byteLength?: IntegerRange.IntegerRangeInput;
}

/**
 * The result of parsing a hex-encoded string.
 *
 * @see {@link parseHex}
 * @category models
 */
export interface ParsedHexString extends Inspectable {
  /**
   * A flag indicating if the hex-string has a `'0x'` prefix.
   */
  readonly hasPrefix: boolean;

  /**
   * The captured sequence of _whole_ bytes found in the source string.
   */
  readonly byteChars: string;

  /**
   * The remaining characters of incomplete bytes and/or the non hexadecimal characters found in the
   * source string.
   */
  readonly incompleteChars: string;
};

/**
 * Parses a hex-encoded string.
 *
 * @param source The source string to parse.
 * @returns An `Either` with a `Right` value of {@link ParsedHexString} describing the parsed elements of `source`,
 * or a `Left` value of {@link ParseError.ParseError | ParseError} if parsing fails.
 *
 * @category utilities
 */
export const parseHex: (source: string) => Either.Either<ParsedHexString, ParseError.ParseError> = internal.parseHex;
