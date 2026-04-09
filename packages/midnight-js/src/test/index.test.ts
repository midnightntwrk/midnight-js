/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { describe, expect, it } from 'vitest';

import * as contracts from '../contracts';
import * as midnightJs from '../index';
import * as networkId from '../network-id';
import * as types from '../types';
import * as utils from '../utils';

describe('barrel exports', () => {
  it('should export contracts namespace', () => {
    expect(midnightJs.contracts).toBeDefined();
    expect(typeof midnightJs.contracts).toBe('object');
  });

  it('should export networkId namespace', () => {
    expect(midnightJs.networkId).toBeDefined();
    expect(typeof midnightJs.networkId.setNetworkId).toBe('function');
    expect(typeof midnightJs.networkId.getNetworkId).toBe('function');
  });

  it('should export types namespace', () => {
    expect(midnightJs.types).toBeDefined();
    expect(typeof midnightJs.types).toBe('object');
  });

  it('should export utils namespace', () => {
    expect(midnightJs.utils).toBeDefined();
    expect(typeof midnightJs.utils).toBe('object');
  });

  it('should not export provider packages', () => {
    const exportedKeys = Object.keys(midnightJs);
    expect(exportedKeys).toEqual(expect.arrayContaining(['contracts', 'networkId', 'types', 'utils']));
    expect(exportedKeys).toHaveLength(4);
  });
});

describe('sub-path exports', () => {
  it('should export contracts sub-path with same members as namespace', () => {
    expect(contracts).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.contracts).sort();
    const subpathKeys = Object.keys(contracts).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export network-id sub-path with same members as namespace', () => {
    expect(networkId).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.networkId).sort();
    const subpathKeys = Object.keys(networkId).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export types sub-path with same members as namespace', () => {
    expect(types).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.types).sort();
    const subpathKeys = Object.keys(types).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export utils sub-path with same members as namespace', () => {
    expect(utils).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.utils).sort();
    const subpathKeys = Object.keys(utils).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });
});
