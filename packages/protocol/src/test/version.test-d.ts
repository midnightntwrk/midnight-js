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

import { describe, expectTypeOf, it } from 'vitest';

import type { LedgerVersion, ProtocolVersionErrorCode, SupportedProtocolVersionRange } from '../index';

describe('protocol version identity type surface', () => {
  it('LedgerVersion is exactly the closed v8/v9 union', () => {
    expectTypeOf<LedgerVersion>().toEqualTypeOf<'v8' | 'v9'>();
  });

  it('ProtocolVersionErrorCode is exactly the closed code union', () => {
    expectTypeOf<ProtocolVersionErrorCode>().toEqualTypeOf<
      'UNKNOWN_PROTOCOL_VERSION' | 'UNKNOWN_RECORD_PROTOCOL_VERSION' | 'UNKNOWN_NETWORK_HEAD_PROTOCOL_VERSION'
    >();
  });

  it('SupportedProtocolVersionRange keeps its structural shape', () => {
    expectTypeOf<SupportedProtocolVersionRange>().toEqualTypeOf<{
      readonly min: number;
      readonly max: number;
      readonly version: LedgerVersion;
    }>();
  });
});
