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

import { join } from 'node:path';

import { FileSystem } from '@effect/platform';
import { type PlatformError } from '@effect/platform/Error';
import { NodeContext } from '@effect/platform-node';
import { describe, it } from '@effect/vitest';
import { ContractRuntimeError } from '@midnight-ntwrk/compact-js/effect';
import * as CompiledContract from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { CompiledContractReflection } from '@midnight-ntwrk/compact-js-command/effect';
import { Effect, Layer, String } from 'effect';

import { ensureRemovePath } from './cleanup.js';

const BASE_PATH = join(import.meta.dirname);
const DECLARATION_FILEPATH = join(BASE_PATH, 'contract', 'index.d.cts');
const testLayer: Layer.Layer<
  CompiledContractReflection.CompiledContractReflection
  | NodeContext.NodeContext,
  PlatformError
> = CompiledContractReflection.layer(BASE_PATH).pipe(Layer.provideMerge(NodeContext.layer));

/**
 * Sets up a dummy contract and context for an `ArgumentParser` test fixture.
 * 
 * @param argText A string defining on or more JS/TS arguments (in the form `'argName: argType'`).
 * @param fn A function receiving an `ArgumentParser` that should return an array  from arguments
 * called with it.
 * @returns An `Effect` that yields the parsed arguments defined by `argText`, or fails with a `ContractRuntimeError`
 * if the invocation failed.
 */
const parseArgumentsTest = (
  argText: string,
  fn: (argsParser: CompiledContractReflection.CompiledContractReflection.AnyArgumentParser)
    => Effect.Effect<any[], ContractRuntimeError.ContractRuntimeError> // eslint-disable-line @typescript-eslint/no-explicit-any
) => Effect.gen(function* () {
      const NullContract = (() => ({} as any)) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(join(BASE_PATH, 'contract'));
      yield* fs.writeFileString(DECLARATION_FILEPATH, String.stripMargin(`
        |export type ImpureCircuits<T> = {
        | circuit(_: any, ${argText}): void;
        |}
        |
        |export declare class Contract<T, W> {
        | initialState(_: any, ${argText}): void;
        |}
      `));

      const contractReflection = yield* CompiledContractReflection.CompiledContractReflection;
      const argsParser = yield* contractReflection.createArgumentParser(
        CompiledContract.make('NullContract', NullContract).pipe(
          CompiledContract.withWitnesses({} as never),
          CompiledContract.withCompiledFileAssets(BASE_PATH)
        )
      );
      return yield* fn(argsParser);
  }).pipe(
    Effect.ensuring(ensureRemovePath(join(BASE_PATH, 'contract')))
  );

describe.sequential('CompiledContractReflection', () => {
  describe('argument parsing', () => {
    it.each([
      ['bigint', 'abc'],
      ['boolean', 'maybe']
    ])('should fail to parse with an invalid argument (%s)', async (type, invalidValue) => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
            `a: ${type}`,
            (_) => _.parseInitializationArgs([invalidValue])
          ).pipe(Effect.flip)
        ).toBeInstanceOf(ContractRuntimeError.ContractRuntimeError);
      }).pipe(Effect.provide(testLayer)));
    });

    it.each([
      ['number', '3'],
      ['bigint', '100'],
      ['boolean', 'true'],
      ['boolean', 'false'],
      ['string', 'hosky'],
      ['Uint8Array', 'ffffff']
    ])('should parse with a valid argument (%s)', async (type, validString) => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
            `a: ${type}`,
            (_) => _.parseInitializationArgs([validString])
          )
        ).toHaveLength(1);
      }).pipe(Effect.provide(testLayer)));
    });

    it('should parse multiple arguments', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
          'a: bigint, b: string, c: boolean',
          (_) => _.parseInitializationArgs(['100', 'hosky', 'true'])
        )).toStrictEqual([100n, 'hosky', true]);
      }).pipe(Effect.provide(testLayer)));
    });

    it('should fail when parsing an invalid tuple element', async () => {
      await Effect.runPromise(Effect.gen(function* () {
          expect(yield* parseArgumentsTest(
            'a: [bigint, boolean]',
            (_) => _.parseInitializationArgs(['[100, maybe]'])
          ).pipe(Effect.flip)
        ).toBeInstanceOf(ContractRuntimeError.ContractRuntimeError)
      }).pipe(Effect.provide(testLayer)));
    });

    it('should parse multiple valid tuple type elements', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
          'a: [bigint, string, boolean]',
          (_) => _.parseInitializationArgs(["[100, 'hosky', true]"])
        )).toStrictEqual([[100n, 'hosky', true]]);
      }).pipe(Effect.provide(testLayer)));
    });

    it('should parse nested tuple type elements', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
          'a: [bigint, [string, boolean], boolean]',
          (_) => _.parseInitializationArgs(["[100, ['hosky', false], true]"])
        )).toStrictEqual([[100n, ['hosky', false], true]]);
      }).pipe(Effect.provide(testLayer)));
    });


    it('should parse object literal type elements', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        const parsedArgs = yield* parseArgumentsTest(
          'a: { x: Uint8Array; y: bigint; z: string; }',
          (_) => _.parseInitializationArgs(["{ x: 'ffffff', y: 100, z: 'hosky' }"])
        );
        expect(parsedArgs[0].x).toBeInstanceOf(Uint8Array);
        expect(parsedArgs[0]).toMatchObject({ y: 100n, z: 'hosky' });
      }).pipe(Effect.provide(testLayer)));
    });

    it('should parse object literal type elements containing tuple types', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        expect(yield* parseArgumentsTest(
          'a: { x: [bigint, string]; y: string; }',
          (_) => _.parseInitializationArgs(["{ x: [100, 'doggo'], y: 'hosky' }"])
        )).toStrictEqual([{ x: [100n, 'doggo'], y: 'hosky' }]);
      }).pipe(Effect.provide(testLayer)));
    });

    it('should parse nested object literal type elements', async () => {
      await Effect.runPromise(Effect.gen(function* () {
        const parsedArgs = yield* parseArgumentsTest(
          'a: { x: Uint8Array; y: { y1: bigint, y2: string  }; z: string; }',
          (_) => _.parseInitializationArgs(["{ x: 'ffffff', y: { y1: 200, y2: 'doggo' }, z: 'hosky' }"])
        );
        expect(parsedArgs[0].x).toBeInstanceOf(Uint8Array);
        expect(parsedArgs[0]).toMatchObject({ y: { y1: 200n, y2: 'doggo' }, z: 'hosky' });
      }).pipe(Effect.provide(testLayer)));
    });
  });
});