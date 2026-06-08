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
import { describe, it } from 'vitest';

import type { VersionedLogItem } from '../contract-events';

describe('VersionedLogItem exhaustiveness', () => {
  it('covers every LogEventType variant in a discriminated switch', () => {
    const check = (e: VersionedLogItem): string => {
      switch (e.event_type) {
        case 'ShieldedSpend':     return 'ShieldedSpend';
        case 'ShieldedReceive':   return 'ShieldedReceive';
        case 'ShieldedMint':      return 'ShieldedMint';
        case 'ShieldedBurn':      return 'ShieldedBurn';
        case 'UnshieldedSpend':   return 'UnshieldedSpend';
        case 'UnshieldedReceive': return 'UnshieldedReceive';
        case 'UnshieldedMint':    return 'UnshieldedMint';
        case 'UnshieldedBurn':    return 'UnshieldedBurn';
        case 'Paused':            return 'Paused';
        case 'Unpaused':          return 'Unpaused';
        case 'Misc':              return 'Misc';
        default: {
          const _: never = e;
          return _;
        }
      }
    };
    void check;
  });
});
