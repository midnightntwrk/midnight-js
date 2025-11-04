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

import { describe, expect,it } from '@effect/vitest';
import * as ContractAddress from '@midnight-ntwrk/platform-js/effect/ContractAddress';
import * as fc from 'effect/FastCheck';

import * as Arbitrary from './Arbitrary.js';

describe('ContractAddress', () => {
    it('should parse plain addresses', () => fc.assert(
      fc.property(Arbitrary.makePlainHexArbitrary('32..=32'), (hex) => {
        expect(() => ContractAddress.ContractAddress(hex)).not.toThrowError();
      })
    ));

    it('should throw with short length plain addresses', () => fc.assert(
      fc.property(Arbitrary.makePlainHexArbitrary('2..32'), (hex) => {
        expect(() => ContractAddress.ContractAddress(hex)).toThrowError();
      })
    ));

    it('should throw with long length plain addresses', () => fc.assert(
      fc.property(Arbitrary.makePlainHexArbitrary('33..=50'), (hex) => {
        expect(() => ContractAddress.ContractAddress(hex)).toThrowError();
      })
    ));

    it('should throw with prefixed addresses', () => fc.assert(
      fc.property(Arbitrary.makePrefixedHexArbitrary('32..=32'), (hex) => {
        expect(() => ContractAddress.ContractAddress(hex)).toThrowError();
      })
    ));

    it('should throw with an invalid address', () => {
      expect(() => ContractAddress.ContractAddress('HOSKYA')).toThrowError();
    });
});
