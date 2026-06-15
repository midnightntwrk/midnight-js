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

import { describe, expect, test, vi } from 'vitest';

import { wrapWithDeflate } from '../deflate-websocket';

describe('wrapWithDeflate — subprotocol negotiation', () => {
  test('offers only the deflate protocol when no protocols argument is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate']
    );
  });

  test('offers graphql-transport-ws+deflate FIRST when graphql-ws passes the standard protocol as a string', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', 'graphql-transport-ws');

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws']
    );
  });

  test('preserves and dedupes when an array of protocols is passed', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', ['graphql-transport-ws', 'graphql-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws', 'graphql-ws']
    );
  });

  test('does NOT duplicate the deflate protocol if the caller already included it', () => {
    const baseCtor = vi.fn();
    class BaseWS {
      constructor(url: string, protocols?: string | string[]) {
        baseCtor(url, protocols);
      }
    }
    const Wrapped = wrapWithDeflate(BaseWS as unknown as typeof WebSocket);

    new Wrapped('ws://localhost/graphql/ws', ['graphql-transport-ws+deflate', 'graphql-transport-ws']);

    expect(baseCtor).toHaveBeenCalledWith(
      'ws://localhost/graphql/ws',
      ['graphql-transport-ws+deflate', 'graphql-transport-ws']
    );
  });
});
