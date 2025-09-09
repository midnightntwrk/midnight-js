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

import { type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  MidnightBech32m,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey
} from '@midnight-ntwrk/wallet-sdk-address-format';
/**
 * The result of parsing a string as a hex-encoded string.
 */
export type ParsedHexString = {
  /** A flag indicating if the hex-string has a `'0x'` prefix. */
  readonly hasPrefix: boolean;
  /** The captured sequence of _whole_ bytes found in the source string. */
  readonly byteChars: string;
  /** The remaining characters of incomplete bytes and/or the non hexadecimal characters found
   * in the source string. */
  readonly incompleteChars: string;
}

/**
 * A regular expression that captures a hex-encoded string.
 *
 * @remarks
 * The regular expression captures characters from the source string sequentially, and will build a
 * `RegExpExecArray` object with captured groups described by {@link ParsedHexString}. These
 * groups capture the running sequence of _whole_ bytes (i.e., two valid hexadecimal characters),
 * and then any remaining sequence of characters that are not valid hexadecimal characters, or
 * incomplete bytes.
 *
 * @internal
 */
const HEX_STRING_REGEXP = /^(?<prefix>(0x)?)(?<byteChars>([0-9A-Fa-f]{2})*)(?<incompleteChars>.*)$/;

/**
 * Parses a string as a hex-encoded string.
 *
 * @param source The source string to parse.
 * @returns A {@link ParsedHexString} describing the parsed elements of `source`.
 *
 * @example
 * parseHex('Hello') =>
 *   {
 *     hasPrefix: false,
 *     incompleteChars: 'Hello'
 *   }
 *
 * @example
 * parseHex('ab12e') =>
 *   {
 *     hasPrefix: false,
 *     byteChars: 'ab12'
 *     incompleteChars: 'e'
 *   }
 *
 * @example
 * parseHex('0xab12') =>
 *   {
 *     hasPrefix: true,
 *     byteChars: 'ab12'
 *     incompleteChars: ''
 *   }
 */
export const parseHex = (source: string): ParsedHexString => {
  const groups = HEX_STRING_REGEXP.exec(source)?.groups as Record<string, string>;

  return {
    hasPrefix: groups.prefix === '0x',
    byteChars: groups.byteChars,
    incompleteChars: groups.incompleteChars
  } as ParsedHexString;
};

/**
 * Converts a byte string into a hex string.
 *
 * @param bytes The byte string to encode.
 */
export const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

/**
 * Converts a hex string into a byte string.
 *
 * @param str The hex string to decode.
 */
export const fromHex = (str: string): Buffer => Buffer.from(str, 'hex');

/**
 * Determines if a string represents a hex-encoded sequence of bytes.
 *
 * @param source The source string.
 * @param byteLen An optional number of bytes that `source` should represent. If not specified
 * then any number of bytes can be represented by `source`.
 * @returns `true` if the `source` string is parsable as a hex-string, of non-zero length, and
 * of the optional byte length of `byteLen`; otherwise `false`.
 */
export const isHex = (source: string, byteLen?: number): boolean => {
  if (!source || (byteLen !== undefined && byteLen <= 0)) {
    return false;
  }

  const parsedHex = parseHex(source);
  const validByteLen = byteLen
    ? parsedHex.byteChars.length / 2 === byteLen // `byteLen` number of bytes
    : parsedHex.byteChars.length > 0; // any number of bytes

  return validByteLen && !parsedHex.incompleteChars;
};

/**
 * Asserts that a string represents a hex-encoded sequence of bytes.
 *
 * @param source The source string.
 * @param byteLen An optional number of bytes that `source` should represent. If not specified
 * then any number of bytes can be represented by `source`.
 *
 * @throws `Error`
 * `byteLen` is \<= zero. Valid hex-strings will be required to have at least one byte.
 * @throws `TypeError`
 * `source` is not a hex-encoded string because it:
 * - is empty,
 * - contains invalid or incomplete characters, or
 * - does not represent `byteLen` bytes.
 */
export function assertIsHex(source: string, byteLen?: number): asserts source is NonNullable<string> {
  if (!source) {
    throw new TypeError('Input string must have non-zero length.');
  }
  if (byteLen !== undefined && byteLen <= 0) {
    throw new Error('Expected byte length must be greater than zero.');
  }

  const parsedHex = parseHex(source);

  if (parsedHex.incompleteChars) {
    if (parsedHex.incompleteChars.length % 2 > 0) {
      throw new TypeError(`The last byte of input string '${source}' is incomplete.`);
    }

    const invalidCharPos = parsedHex.byteChars.length + (parsedHex.hasPrefix ? 2 : 0);
    throw new TypeError(
      `Invalid hex-digit '${source[invalidCharPos]}' found in input string at index ${invalidCharPos}.`
    );
  }

  if (!parsedHex.byteChars) {
    throw new TypeError(`Input string '${source}' is not a valid hex-string.`);
  }

  if (byteLen) {
    const actualByteLen = parsedHex.byteChars.length / 2;

    if (byteLen !== actualByteLen) {
      throw new TypeError(`Expected an input string with byte length of ${byteLen}, got ${actualByteLen}.`);
    }
  }
}

/**
 * Parses a coin public key (in Bech32m format or hex) into a hex formatted string.
 *
 * @param possibleBech32 The input string, which can be a Bech32m-encoded coin public key or a hex string.
 * @param zswapNetworkId The network ID used for decoding the Bech32m formatted string.
 * @returns The hex string representation of the coin public key.
 *
 * @throws `Error`
 * If the input string is not a valid hex string or a valid Bech32m-encoded coin public key.
 */
export const parseCoinPublicKeyToHex = (possibleBech32: string, zswapNetworkId: NetworkId): string => {
  if (isHex(possibleBech32)) return possibleBech32;
  const parsedBech32 = MidnightBech32m.parse(possibleBech32); // Ensure compatibility
  const decoded = ShieldedCoinPublicKey.codec.decode(zswapNetworkId, parsedBech32);
  return Buffer.from(decoded.data).toString('hex');
};

/**
 * Parses an encryption public key (in Bech32m or hex format) into a hex formatted string.
 *
 * @param possibleBech32 The input string, which can be a Bech32m-encoded encryption public key or a hex string.
 * @param zswapNetworkId The network ID used for decoding the Bech32m formatted string.
 * @returns The hex string representation of the encryption public key.
 *
 * @throws `Error`
 * If the input string is not a valid hex string or a valid Bech32m-encoded encryption public key.
 */
export const parseEncPublicKeyToHex = (possibleBech32: string, zswapNetworkId: NetworkId): string => {
  if (isHex(possibleBech32)) return possibleBech32;
  const parsedBech32 = MidnightBech32m.parse(possibleBech32);
  const decoded = ShieldedEncryptionPublicKey.codec.decode(zswapNetworkId, parsedBech32);
  return Buffer.from(decoded.data).toString('hex');
};
