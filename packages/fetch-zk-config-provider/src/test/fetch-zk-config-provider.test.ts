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

import type { BinaryLike } from 'crypto';
import * as crypto from 'crypto';
import express from 'express';
import * as fs from 'fs/promises';
import type { Server } from 'http';

import { FetchZkConfigProvider } from '../index';

describe('Fetch ZK config Provider', () => {
  const resourceDir = `${process.cwd()}/src/test/resources`;

  let server: Server;
  let serverURL: string;

  beforeAll(async () => {
    const proverKey = await fs.readFile(`${resourceDir}/keys/set_topic.prover`);
    const verifierKey = await fs.readFile(`${resourceDir}/keys/set_topic.verifier`);
    const zkir = await fs.readFile(`${resourceDir}/zkir/set_topic.bzkir`).then((buffer) => buffer.toString('utf-8'));
    const app = express();
    app.get('/keys/set_topic.prover', (_, res) => {
      res.send(proverKey);
    });
    app.get('/keys/set_topic.verifier', (_, res) => {
      res.send(verifierKey);
    });
    app.get('/zkir/set_topic.bzkir', (_, res) => {
      res.send(zkir);
    });
    server = app.listen();
    const serverAddress = server.address();
    if (serverAddress === null) {
      throw new Error('Expected server address to be defined');
    } else if (typeof serverAddress === 'object') {
      serverURL = `http://localhost:${serverAddress.port}`;
    }
  });

  afterAll(() => {
    server.close();
  });

  const createHash = (binaryLike: BinaryLike): string => {
    return crypto.createHash('sha256').update(binaryLike).digest().toString('base64');
  };

  const PROVER_KEY_HASH = 'DnbPkv3mY0+nHwt3NGuaWlMRC+2QhtG+COdhjFd0xB8=';

  test('reads prover key correctly', async () => {
    const proverKey = await new FetchZkConfigProvider(serverURL).getProverKey('set_topic');
    expect(createHash(proverKey)).toEqual(PROVER_KEY_HASH);
  });

  const VERIFIER_KEY_HASH = 'sbTZdCx3Kz4RA5OUSaBg2+WZupNdCwd13XmQV9j4pd4=';

  test('reads verifier key correctly', async () => {
    const verifierKey = await new FetchZkConfigProvider(serverURL).getVerifierKey('set_topic');
    expect(createHash(verifierKey)).toEqual(VERIFIER_KEY_HASH);
  });

  const ZKIR_HASH = 'o4RX/Cgm/+GLJwptMkkbsrYYhX0z9DpQCaF0eaOVMU0=';

  test('reads ZKIR correctly', async () => {
    const zkProvider = await new FetchZkConfigProvider(serverURL).getZKIR('set_topic');
    expect(createHash(zkProvider)).toEqual(ZKIR_HASH);
  });

  test('throws on invalid url', () => {
    expect(() => new FetchZkConfigProvider('ws://localhost:5000')).toThrow(/^Invalid protocol scheme: 'ws:'/);
  });
});
