// This file is part of MIDNIGHT-JS.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { randomBytes } from 'node:crypto';
import { toHex } from '../hex-utils';
import { assertIsContractAddress } from '../type-utils';

const createHexString = (byteLen: number): string => toHex(randomBytes(byteLen));

describe('Type Utils', () => {
  describe('assertIsContractAddress', () => {
    it('throws with zero length contract address', () => {
      expect(() => assertIsContractAddress('')).toThrow();
      expect(() => assertIsContractAddress('0x')).toThrow();
    });

    it('throws with malformed contract address', () => {
      expect(() => assertIsContractAddress(`X${createHexString(34).substring(1)}`)).toThrow();
    });

    it('passes with valid contract address', () => {
      expect(() => assertIsContractAddress(createHexString(34))).not.toThrow();
    });

    it('throws with prefixed but valid contract address', () => {
      expect(() => assertIsContractAddress(`0x${createHexString(34)}`)).toThrow(
        /Unexpected '0x' prefix in contract address/
      );
    });
  });
});
