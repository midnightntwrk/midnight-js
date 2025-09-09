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

import { NetworkId } from '@midnight-ntwrk/ledger';

import { assertIsHex, isHex, parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '../hex-utils';

describe('Hex Utils', () => {
  describe('with valid strings', () => {
    const THREE_BYTE_STRING = 'FAB123';

    it.each([THREE_BYTE_STRING, `0x${THREE_BYTE_STRING}`])('return true for any byte length', (source) => {
      expect(isHex(source)).toBeTruthy();
      expect(() => assertIsHex(source)).not.toThrow();
    });

    it.each([
      [THREE_BYTE_STRING, 3],
      [`0x${THREE_BYTE_STRING}`, 3]
    ])('return true for expected byte length', (source, requiredByteLen) => {
      expect(isHex(source, requiredByteLen)).toBeTruthy();
      expect(() => assertIsHex(source, requiredByteLen)).not.toThrow();
    });

    it.each([THREE_BYTE_STRING, `0x${THREE_BYTE_STRING}`])('return false with a zero byte length', (source) => {
      expect(isHex(source, 0)).toBeFalsy();
      expect(() => assertIsHex(source, 0)).toThrow('Expected byte length must be greater than zero.');
    });

    it('return false when string is not of expected length', () => {
      const byteLength = 5;

      expect(isHex(THREE_BYTE_STRING, 5)).toBeFalsy();
      expect(() => assertIsHex(THREE_BYTE_STRING, 5)).toThrow(
        `Expected an input string with byte length of ${byteLength}, got ${THREE_BYTE_STRING.length / 2}.`
      );
    });
  });

  describe('with invalid strings', () => {
    const INVALID_BYTE_STRING = 'HELL01';
    const INCOMPLETE_BYTE_STRING = '1A2';

    it.each([
      [INVALID_BYTE_STRING, 0],
      [`0x${INVALID_BYTE_STRING}`, 2]
    ])('return false for invalid hexadecimal digit', (source, invalidPos) => {
      expect(isHex(source)).toBeFalsy();
      expect(() => assertIsHex(source)).toThrow(`Invalid hex-digit 'H' found in input string at index ${invalidPos}.`);
    });

    it.each([INCOMPLETE_BYTE_STRING, `0x${INCOMPLETE_BYTE_STRING}`])(
      'return false for incomplete strings',
      (source) => {
        expect(isHex(source)).toBeFalsy();
        expect(() => assertIsHex(source)).toThrow(`The last byte of input string '${source}' is incomplete.`);
      }
    );
  });

  describe('with empty strings', () => {
    const EMPTY_STRING = '';

    it.each([undefined, 2])('return false regardless of byte length', (byteLen) => {
      expect(isHex(EMPTY_STRING, byteLen)).toBeFalsy();
      expect(() => assertIsHex(EMPTY_STRING, byteLen)).toThrow('Input string must have non-zero length.');
    });

    it.each([undefined, 2])('return false regardless of byte length and prefix', (byteLen) => {
      const source = `0x${EMPTY_STRING}`;

      expect(isHex(source, byteLen)).toBeFalsy();
      expect(() => assertIsHex(source, byteLen)).toThrow(`Input string '${source}' is not a valid hex-string.`);
    });
  });

  // Note that we are not mocking the underlying use of @midnight-ntwrk/wallet-sdk-address-format
  describe('parseCoinPublicKeyToHex', () => {
    const mockNetworkId = NetworkId.Undeployed;

    describe('with valid inputs', () => {
      it('should return the input if it is a valid hex string', () => {
        const validHex = 'abcdef1234567890';
        expect(parseCoinPublicKeyToHex(validHex, mockNetworkId)).toBe(validHex);
      });

      it('should parse a valid Bech32m-encoded public key and return its hex representation', () => {
        const bech32Input = 'mn_shield-cpk_undeployed1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sn7kq7h';
        const expectedHex = 'dca6896e7fe2f00a3d63be2168df8862cae24a770471e08c646d260db162675f';
        const result = parseCoinPublicKeyToHex(bech32Input, mockNetworkId);
        expect(result).toBe(expectedHex);
      });
    });

    describe('with invalid inputs', () => {
      it('should throw an error if the input is neither a valid hex string nor a valid Bech32m-encoded public key', () => {
        const invalidInput = 'invalidKey';
        expect(() => parseCoinPublicKeyToHex(invalidInput, mockNetworkId)).toThrow();
      });
    });
  });

  // Note that we are not mocking the underlying use of @midnight-ntwrk/wallet-sdk-address-format
  describe('parseEncPublicKeyToHex', () => {
    const mockNetworkId = NetworkId.TestNet;

    describe('with valid inputs', () => {
      it('should return the input if it is a valid hex string', () => {
        const validHex = 'abcdef1234567890';
        expect(parseEncPublicKeyToHex(validHex, mockNetworkId)).toBe(validHex);
      });

      it('should parse a valid Bech32m-encoded public key and return its hex representation', () => {
        const bech32Input = 'mn_shield-epk_test1qvqpla2ttj8v49y52ayluya23spy3m6dgt3mxv9sp9cduuq8uw2lw0snz2sze';
        const expectedHex = '03001ff54b5c8eca94945749fe13aa8c0248ef4d42e3b330b00970de7007e395f73e';
        const result = parseEncPublicKeyToHex(bech32Input, mockNetworkId);
        expect(result).toBe(expectedHex);
      });
    });

    describe('with invalid inputs', () => {
      it('should throw an error if the input is neither a valid hex string nor a valid Bech32m-encoded public key', () => {
        const invalidInput = 'invalidKey';
        expect(() => parseEncPublicKeyToHex(invalidInput, mockNetworkId)).toThrow();
      });
    });
  });
});
