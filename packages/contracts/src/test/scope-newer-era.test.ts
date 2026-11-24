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

import type * as Version from '@midnightntwrk/midnight-js-protocol/version';
import { UnhandledUnionMemberError } from '@midnightntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { TypeId } from '../internal/transaction';
import { withContractScopedTransaction, withLedger8ContractScopedTransaction, withLedger9ContractScopedTransaction } from '../transaction';
import { createMockProviders } from './test-mocks';

const NEWER_ERA = vi.hoisted(() => 'v10');

vi.mock('@midnightntwrk/midnight-js-protocol/version', async (importOriginal) => {
  const actual = await importOriginal<typeof Version>();
  return { ...actual, LEDGER_ERAS: Object.freeze([...actual.LEDGER_ERAS, NEWER_ERA]) };
});

describe('an outer scope of an era this version has no case for', () => {
  it.each([
    ['withContractScopedTransaction', withContractScopedTransaction],
    ['withLedger8ContractScopedTransaction', withLedger8ContractScopedTransaction],
    ['withLedger9ContractScopedTransaction', withLedger9ContractScopedTransaction]
  ] as const)('%s refuses it before reading the head or running the body', async (_name, scope) => {
    // Arrange
    const providers = createMockProviders();
    const outer = { [TypeId]: TypeId, [Symbol.for('@midnight-ntwrk/midnight-js#Transaction/ScopeEra')]: NEWER_ERA };
    const body = vi.fn(async () => undefined);

    // Act
    // @ts-expect-error the parameter is declared as options; a JavaScript caller can pass anything here
    const error = await scope(providers, body, outer).catch((e: unknown) => e);

    // Assert
    expect(error).toBeInstanceOf(UnhandledUnionMemberError);
    expect(providers.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    expect(body).not.toHaveBeenCalled();
  });
});
