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

import { describe, expect, test } from 'vitest';

import { assertNever, UnhandledUnionMemberError } from '../assertion-utils';
import { hasErrorCode, UTILS_ERROR_CODES } from '../error-codes';

type Era = { readonly version: 'v8'; readonly bytes: string } | { readonly version: 'v9'; readonly value: number };

const describeEra = (era: Era): string => {
  switch (era.version) {
    case 'v8':
      return `retained ${era.bytes.length}`;
    case 'v9':
      return `native ${era.value}`;
    default:
      return assertNever(era, 'describeEra');
  }
};

describe('assertNever', () => {
  test('lets an exhaustive switch return normally on every arm', () => {
    // Arrange.
    const retained: Era = { version: 'v8', bytes: 'abcd' };
    const native: Era = { version: 'v9', value: 7 };

    // Act.
    const retainedResult = describeEra(retained);
    const nativeResult = describeEra(native);

    // Assert.
    expect(retainedResult).toBe('retained 4');
    expect(nativeResult).toBe('native 7');
  });

  test('throws when a value the compiler ruled out arrives anyway', () => {
    // Arrange.
    const grown = { version: 'v10', value: 1 };

    // Act / Assert.
    expect(() => describeEra(grown as Era)).toThrow(/describeEra/);
  });

  test('names the switch it was reached from', () => {
    // Arrange.
    const grown = { version: 'v10' };

    // Act.
    const act = () => assertNever(grown as never, 'submitCallTx era dispatch');

    // Assert.
    expect(act).toThrow('submitCallTx era dispatch');
  });

  test('carries a registered code and the context as a field', () => {
    // Arrange / Act.
    let thrown: unknown;
    try {
      assertNever('v10' as never, 'proveTx seam');
    } catch (error) {
      thrown = error;
    }

    // Assert.
    expect(thrown).toBeInstanceOf(UnhandledUnionMemberError);
    expect(hasErrorCode(thrown, UTILS_ERROR_CODES.UNHANDLED_UNION_MEMBER)).toBe(true);
    expect((thrown as UnhandledUnionMemberError).context).toBe('proveTx seam');
  });

  test('never puts the unhandled value in the message', () => {
    // Arrange.
    const secret = 'deadbeefcafebabe';
    const grown = { version: 'v10', txBytes: secret, privateState: { balance: 42 } };

    // Act.
    let thrown: unknown;
    try {
      assertNever(grown as never, 'proveTx seam');
    } catch (error) {
      thrown = error;
    }

    // Assert.
    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : '';
    expect(message).not.toContain(secret);
    expect(message).not.toContain('v10');
    expect(message).not.toContain('42');
    expect(message).not.toContain('privateState');
    expect(message).not.toContain('txBytes');
    expect(message).toContain('proveTx seam');
  });

  test('rejects calls the type contract forbids', () => {
    // Arrange: the two directives are the real assertions here -- `yarn typecheck:tests`
    // fails with TS2578 if either stops being necessary.
    const era: Era = { version: 'v8', bytes: 'ab' };
    const passLiveMember = () => {
      // @ts-expect-error a live union member is not `never`; this is the mistake the helper catches.
      return assertNever(era, 'not exhausted');
    };
    const omitContext = () => {
      // @ts-expect-error `context` is required, so an unlocatable throw cannot be created.
      return assertNever('v10' as never);
    };

    // Act / Assert.
    expect(passLiveMember).toThrow(UnhandledUnionMemberError);
    expect(omitContext).toThrow(UnhandledUnionMemberError);
  });
});
