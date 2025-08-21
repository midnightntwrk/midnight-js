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

import { describe, it, expect } from '@effect/vitest';
import * as NetworkId from '@midnight-ntwrk/platform-js/effect/NetworkId';
import * as fc from 'effect/FastCheck';
import * as Arbitrary from './Arbitrary.js';

describe('NetworkId', () => {
  describe('isMainNet', () => {
    it('should return true for MainNet', () => {
      expect(NetworkId.MainNet.isMainNet()).toBe(true);
    });
    
    it('should return false for any named network identifier ', () => fc.assert(
      fc.property(Arbitrary.makeNetworkIdArbitrary(), (networkId) => {
        expect(NetworkId.make(networkId).isMainNet()).toBe(false);
      })
    ));
  });

  describe('equals', () => {
    it('should return true for two network identifiers equal by name', () => {
      const a = NetworkId.make('hosky-dev01');
      const b = NetworkId.make('hosky-dev01');

      expect(NetworkId.equals(a, b)).toBe(true);
    });

    it('should return false for two network identifiers that differ by name', () => {
      const a = NetworkId.make('hosky-dev01');
      const b = NetworkId.make('hosky-dev02');

      expect(NetworkId.equals(a, b)).toBe(false);
    });
  });
});