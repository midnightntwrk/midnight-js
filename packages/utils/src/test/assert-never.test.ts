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

import { assertNever } from '../assertion-utils';

/** Stands in for a version-tagged union a consumer narrows in the fork window. */
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
    // Arrange: what a switch sees once the union has grown a third arm the caller
    // was not compiled against -- the reason this is a runtime throw at all.
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

  test('still reports without a context, rather than throwing something unreadable', () => {
    // Arrange / Act.
    const act = () => assertNever('v10' as never);

    // Assert.
    expect(act).toThrow(Error);
    expect(act).toThrow(/unhandled/i);
  });

  test('never puts the unhandled value in the message', () => {
    // Arrange: the arms of a D14 union carry transaction bytes and decoded state, so
    // serializing the value here would put payloads into every log that catches it.
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
    expect(message).toContain('proveTx seam');
    expect(message).not.toContain(secret);
    expect(message).not.toContain('42');
    expect(message).not.toContain('privateState');
  });

  test('rejects a value the compiler can still see as inhabited', () => {
    const era: Era = { version: 'v8', bytes: 'ab' };

    // @ts-expect-error assertNever only accepts `never`; passing a live union member
    // is the mistake it exists to catch, and it must fail at compile time.
    const act = () => assertNever(era, 'not exhausted');

    expect(act).toThrow();
  });
});
