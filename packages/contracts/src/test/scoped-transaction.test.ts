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

import { describe, expect, it, vi } from 'vitest';

import { withContractScopedTransaction } from '../transaction';
import { createMockProviders } from './test-mocks';

describe('scoped transaction failures', () => {
  const withErrorLog = () => {
    const error = vi.fn();
    return { providers: { ...createMockProviders(), loggerProvider: { error, isLevelEnabled: () => true } }, error };
  };

  it('logs a root-scope failure with the scope name and rethrows it unchanged', async () => {
    // Arrange
    const { providers, error: logError } = withErrorLog();
    const failure = new Error('circuit failed');

    // Act
    const rejection = withContractScopedTransaction(
      providers,
      async () => {
        throw failure;
      },
      { scopeName: 'myTransfer' }
    );

    // Assert
    await expect(rejection).rejects.toBe(failure);
    expect(logError).toHaveBeenCalledExactlyOnceWith(
      { err: failure, scopeName: 'myTransfer', phase: 'executing' },
      "Scoped transaction 'myTransfer' failed while executing: Error: circuit failed"
    );
    expect(logError.mock.calls[0]?.[0]?.err).toBe(failure);
  });

  it('logs <unnamed> when no scopeName is provided', async () => {
    // Arrange
    const { providers, error: logError } = withErrorLog();
    const failure = new Error('circuit failed');

    // Act
    const rejection = withContractScopedTransaction(providers, async () => {
      throw failure;
    });

    // Assert
    await expect(rejection).rejects.toBe(failure);
    expect(logError).toHaveBeenCalledExactlyOnceWith(
      { err: failure, scopeName: '<unnamed>', phase: 'executing' },
      "Scoped transaction '<unnamed>' failed while executing: Error: circuit failed"
    );
  });
});
