/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { Effect, Context, Console, Array, Ref } from 'effect';

export class MockConsole extends Context.Tag('compact-js-command#test/MockConsole')<
  Console.Console,
  MockConsole.Service
>() {}

export declare namespace MockConsole {
  export interface Service extends Console.Console {
    readonly getLines: (
      params?: Partial<{
        readonly stripAnsi: boolean
      }>
    ) => Effect.Effect<readonly string[]>;
  }
}

const pattern = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
  ].join('|'),
  'g'
);

const stripAnsi = (str: string) => str.replace(pattern, '');

export const make = Effect.gen(function*() {
  const consoleLines = yield* Ref.make(Array.empty<string>());

  const getLines: MockConsole.Service['getLines'] = (params = {}) =>
    Ref.get(consoleLines).pipe(Effect.map((lines) =>
      params.stripAnsi
        ? Array.map(lines, stripAnsi)
        : lines
    ));

  const log: MockConsole.Service['log'] = (...args) => Ref.update(consoleLines, Array.appendAll(args));

  return MockConsole.of({
    [Console.TypeId]: Console.TypeId,
    getLines,
    log,
    unsafe: globalThis.console,
    assert: () => Effect.void,
    clear: Effect.void,
    count: () => Effect.void,
    countReset: () => Effect.void,
    debug: () => Effect.void,
    dir: () => Effect.void,
    dirxml: () => Effect.void,
    error: () => Effect.void,
    group: () => Effect.void,
    groupEnd: Effect.void,
    info: () => Effect.void,
    table: () => Effect.void,
    time: () => Effect.void,
    timeEnd: () => Effect.void,
    timeLog: () => Effect.void,
    trace: () => Effect.void,
    warn: () => Effect.void
  });
});

export const getLines = (
  params?: Partial<{
    readonly stripAnsi?: boolean
  }>
): Effect.Effect<readonly string[]> =>
  Effect.consoleWith((console) => (console as MockConsole.Service).getLines(params));
