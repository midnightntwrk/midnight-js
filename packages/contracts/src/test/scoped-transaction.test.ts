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

import { describe, expect, it } from 'vitest';

import { withContractScopedTransaction } from '../transaction';
import { createMockProviders } from './test-mocks';

describe('scoped transaction error messages', () => {
  it('should include scopeName in execution error message for root transactions', async () => {
    const mockProviders = createMockProviders();

    await expect(
      withContractScopedTransaction(
        mockProviders,
        async () => { throw new Error('circuit failed'); },
        { scopeName: 'myTransfer' }
      )
    ).rejects.toThrow(/myTransfer/);
  });

  it('should show <unnamed> when no scopeName is provided', async () => {
    const mockProviders = createMockProviders();

    await expect(
      withContractScopedTransaction(
        mockProviders,
        async () => { throw new Error('circuit failed'); }
      )
    ).rejects.toThrow(/<unnamed>/);
  });
});
