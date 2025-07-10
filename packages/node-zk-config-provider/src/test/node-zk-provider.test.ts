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

import * as crypto from 'crypto';

import type { BinaryLike } from 'crypto';
import { NodeZkConfigProvider } from '../index';

const createHash = (binaryLike: BinaryLike): string => {
  return crypto.createHash('sha256').update(binaryLike).digest().toString('base64');
};

describe('Node ZK config Provider', () => {
  const resourceDir = `${process.cwd()}/src/test/resources`;
  const PROVER_KEY_HASH = 'DnbPkv3mY0+nHwt3NGuaWlMRC+2QhtG+COdhjFd0xB8=';

  test('reads prover key correctly', async () => {
    const proverKey = await new NodeZkConfigProvider(resourceDir).getProverKey('set_topic');
    expect(createHash(proverKey)).toEqual(PROVER_KEY_HASH);
  });

  const VERIFIER_KEY_HASH = 'sbTZdCx3Kz4RA5OUSaBg2+WZupNdCwd13XmQV9j4pd4=';

  test('reads verifier key correctly', async () => {
    const verifierKey = await new NodeZkConfigProvider(resourceDir).getVerifierKey('set_topic');
    expect(createHash(verifierKey)).toEqual(VERIFIER_KEY_HASH);
  });

  const ZKIR_HASH = 'CW4hEb7fRkPiS85+l0/kvN+6IbISWJycOrwW5Jn+AI0=';

  test('reads ZKIR correctly', async () => {
    const zkProvider = await new NodeZkConfigProvider(resourceDir).getZKIR('set_topic');
    expect(createHash(zkProvider)).toEqual(ZKIR_HASH);
  });

  test('throws on relative path', async () => {
    await expect(async () => new NodeZkConfigProvider('.').getVerifierKey('set_topic')).rejects.toThrowError(
      "ENOENT: no such file or directory, open 'keys/set_topic.verifier'"
    );
  });
});
