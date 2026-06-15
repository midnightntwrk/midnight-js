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

import type * as ws from 'isomorphic-ws';

const DEFLATE_PROTOCOL = 'graphql-transport-ws+deflate';

const offerDeflate = (protocols?: string | string[]): string[] => {
  const requested = protocols === undefined
    ? []
    : Array.isArray(protocols) ? protocols : [protocols];
  return requested.includes(DEFLATE_PROTOCOL)
    ? requested
    : [DEFLATE_PROTOCOL, ...requested];
};

export const wrapWithDeflate = (Base: typeof ws.WebSocket): typeof ws.WebSocket => {
  return class DeflateWebSocket extends (Base as unknown as typeof WebSocket) {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, offerDeflate(protocols));
    }
  } as unknown as typeof ws.WebSocket;
};
