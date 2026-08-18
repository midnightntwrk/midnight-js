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

import { describe, expect, it } from 'vitest';

import { assertNever } from '../assert-never';

describe('assertNever', () => {
  it('throws an Error naming the unreachable context and carrying the offending value', () => {
    const callWithBadValue = () =>
      // @ts-expect-error assertNever only accepts `never` — this exercises the runtime guard
      // for a branch that was supposed to be exhaustively handled.
      assertNever('unexpected-value', 'testContext');

    expect(callWithBadValue).toThrow(Error);
    expect(callWithBadValue).toThrow(/testContext/);
    expect(callWithBadValue).toThrow(/unexpected-value/);
  });

  it('keeps the context in the message for a BigInt value without throwing while rendering it', () => {
    const callWithBigInt = () =>
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(10n, 'bigintContext');

    expect(callWithBigInt).toThrow(/bigintContext/);
  });

  it('keeps the context in the message for a circular object without throwing while rendering it', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const callWithCircular = () =>
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(circular, 'circularContext');

    expect(callWithCircular).toThrow(/circularContext/);
  });

  it('renders a generic object tag for a value with no prototype (no constructor to name)', () => {
    const noProto: unknown = Object.create(null);
    const callWithNoProto = () =>
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(noProto, 'noProtoContext');

    expect(callWithNoProto).toThrow(/noProtoContext/);
    expect(callWithNoProto).toThrow(/\[object Object\]/);
  });

  it('renders a generic object tag when the constructor property is not itself a function', () => {
    const weird: unknown = Object.create({ constructor: 42 });
    const callWithWeird = () =>
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(weird, 'weirdConstructorContext');

    expect(callWithWeird).toThrow(/weirdConstructorContext/);
    expect(callWithWeird).toThrow(/\[object Object\]/);
  });

  it('falls back to a fixed placeholder when rendering the value itself throws', () => {
    const hostile: unknown = new Proxy(
      {},
      {
        has: () => {
          throw new Error('trap sprung');
        }
      }
    );
    const callWithHostile = () =>
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(hostile, 'hostileContext');

    expect(callWithHostile).toThrow(/hostileContext/);
    expect(callWithHostile).toThrow(/<unstringifiable>/);
  });

  it('never embeds an object payload field in the message, rendering it as a bare constructor tag instead', () => {
    const secret = { password: 'hunter2', apiKey: 'sk-secret' };
    let message = '';
    try {
      // @ts-expect-error see above — exercising the runtime guard directly.
      assertNever(secret, 'secretContext');
      expect.fail('expected assertNever to throw');
    } catch (e) {
      message = (e as Error).message;
    }

    expect(message).toContain('secretContext');
    expect(message).toMatch(/\[object Object\]/);
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('sk-secret');
    expect(message).not.toContain('password');
    expect(message).not.toContain('apiKey');
  });
});
