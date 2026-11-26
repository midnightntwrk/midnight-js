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

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  ProofServerError,
  type ProverKey,
  type VerifierKey,
  type ZKConfigProvider,
  type ZKIR
} from '@midnightntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClientProvingProvider } from '../http-client-proving-provider';

vi.mock('@midnightntwrk/midnight-js-protocol/v9', async () => {
  const actual = await vi.importActual('@midnightntwrk/midnight-js-protocol/v9');
  return {
    ...actual,
    createCheckPayload: () => new Uint8Array([1, 2, 3]),
    createProvingPayload: () => new Uint8Array([4, 5, 6])
  };
});

const listen = async (handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{ server: Server; url: string }> => {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
};

const close = (server: Server): Promise<void> => new Promise((resolve) => server.close(() => resolve()));

const zkConfigStub: Partial<ZKConfigProvider<string>> = {
  get: () =>
    Promise.resolve({
      circuitId: 'circuit',
      proverKey: new Uint8Array([7]) as ProverKey,
      verifierKey: new Uint8Array([8]) as VerifierKey,
      zkir: new Uint8Array([9]) as ZKIR
    })
};
const zkConfigProvider = zkConfigStub as ZKConfigProvider<string>;

describe('proof server redirects', () => {
  let proofServer: { server: Server; url: string };
  let redirectTarget: { server: Server; url: string };
  let proofServerRequests: number;
  let redirectTargetRequests: number;
  let redirectStatus: number;

  beforeEach(async () => {
    proofServerRequests = 0;
    redirectTargetRequests = 0;
    redirectTarget = await listen((_req, res) => {
      redirectTargetRequests++;
      res.end();
    });
    proofServer = await listen((req, res) => {
      proofServerRequests++;
      res.writeHead(redirectStatus, { Location: `${redirectTarget.url}${req.url}` }).end();
    });
  });

  afterEach(async () => {
    await close(proofServer.server);
    await close(redirectTarget.server);
  });

  const calls = {
    check: (url: string) =>
      httpClientProvingProvider(url, zkConfigProvider, { headers: { 'x-api-key': 'secret' } }).check(new Uint8Array([1]), 'circuit'),
    prove: (url: string) =>
      httpClientProvingProvider(url, zkConfigProvider, { headers: { 'x-api-key': 'secret' } }).prove(new Uint8Array([1]), 'circuit')
  };

  describe.each(Object.entries(calls))('%s', (_name, call) => {
    it.each([302, 307, 308])('refuses a %i redirect without contacting the target or retrying', async (status) => {
      redirectStatus = status;

      const result = call(proofServer.url);

      await expect(result).rejects.toThrow(ProofServerError);
      await expect(result).rejects.toThrow('redirects are refused');
      expect(redirectTargetRequests).toBe(0);
      expect(proofServerRequests).toBe(1);
    });
  });
});
