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

import '@/wallet/bigint-serialization';

describe('[Unit tests] BigInt serialization', () => {
  it('should serialize BigInt values that exceed Number.MAX_SAFE_INTEGER without precision loss', () => {
    const large = 500_000_000_000_000_000_000n;

    const serialized = JSON.stringify({ value: large });
    const parsed = JSON.parse(serialized);

    expect(parsed.value).toBe('500000000000000000000');
  });

  it('should serialize small BigInt values as strings for consistency', () => {
    const small = 42n;

    const serialized = JSON.stringify({ value: small });
    const parsed = JSON.parse(serialized);

    expect(parsed.value).toBe('42');
  });
});
