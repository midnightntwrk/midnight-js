/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import {
  parseZkArtifactRuntimeVersion,
  ZK_CONTRACT_INFO_FILE_NAME,
  ZkArtifactContractInfoError
} from '../zk-artifact-contract-info';

describe('parseZkArtifactRuntimeVersion', () => {
  it('reads the runtime version the compiler recorded', () => {
    // Arrange: the shape `compactc` emits, trimmed to the members this parser reads.
    const rawJson = JSON.stringify({
      'compiler-version': '0.31.1',
      'language-version': '0.23.0',
      'runtime-version': '0.16.0',
      circuits: []
    });

    // Act
    const runtimeVersion = parseZkArtifactRuntimeVersion(rawJson);

    // Assert
    expect(runtimeVersion).toBe('0.16.0');
  });

  it('names the file it could not parse when the bytes are not JSON', () => {
    expect(() => parseZkArtifactRuntimeVersion('<!doctype html>')).toThrow(ZkArtifactContractInfoError);
    expect(() => parseZkArtifactRuntimeVersion('<!doctype html>')).toThrow(ZK_CONTRACT_INFO_FILE_NAME);
  });

  it.each([
    ['a bare string', '"0.16.0"'],
    ['an array', '[]'],
    ['null', 'null']
  ])('refuses %s, which is not a contract description at all', (_label, rawJson) => {
    // An array passes a naive `typeof === 'object'` check and would then be reported as a
    // description that merely forgot its runtime version -- sending the caller to recompile a
    // contract whose artifacts are fine and whose served file is simply the wrong document.
    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(ZkArtifactContractInfoError);
    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(/must be a JSON object/);
  });

  it('refuses a document that declares no runtime version', () => {
    const rawJson = JSON.stringify({ 'compiler-version': '0.31.1', circuits: [] });

    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(ZkArtifactContractInfoError);
  });

  it('refuses a runtime version that is not a string, and names the value it saw', () => {
    // Named, because a truncated or hand-edited file is otherwise indistinguishable from an old
    // toolchain -- and the two have different fixes.
    const rawJson = JSON.stringify({ 'runtime-version': 16 });

    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(ZkArtifactContractInfoError);
    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(/16/);
  });

  it('refuses an empty runtime version', () => {
    const rawJson = JSON.stringify({ 'runtime-version': '' });

    expect(() => parseZkArtifactRuntimeVersion(rawJson)).toThrow(ZkArtifactContractInfoError);
  });
});
