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

import { ZkArtifactIntegrityError } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, test } from 'vitest';

import { NodeZkConfigProvider, nodeZkConfigProvider } from '../index';

const resourceDir = `${process.cwd()}/src/test/resources`;

describe('nodeZkConfigProvider factory', () => {
  test('returns a NodeZkConfigProvider instance', () => {
    const provider = nodeZkConfigProvider({ directory: resourceDir });
    expect(provider).toBeInstanceOf(NodeZkConfigProvider);
  });

  test('passes the directory through so artifacts resolve', async () => {
    const provider = nodeZkConfigProvider({ directory: resourceDir, verify: 'off' });
    const proverKey = await provider.getProverKey('set_topic');
    expect(proverKey.length).toBeGreaterThan(0);
  });

  test('propagates integrity options (default require throws when the manifest is absent)', async () => {
    const provider = nodeZkConfigProvider({ directory: resourceDir });
    await expect(provider.getProverKey('set_topic')).rejects.toThrow(ZkArtifactIntegrityError);
  });
});
