import { Effect, Layer, Console } from 'effect';
import { Command } from '@effect/cli';
import { NodeContext } from '@effect/platform-node';
import { describe, it, expect } from 'vitest';
import { ConfigCompiler, circuitCommand } from '@midnight-ntwrk/compact-js-command/effect';
import { resolve } from 'node:path';
import * as MockConsole from './MockConsole';

const COUNTER_CONFIG_FILEPATH = resolve(import.meta.dirname, '../contract/counter/contract.config.ts');
const COUNTER_STATE_FILEPATH = resolve(import.meta.dirname, '../contract/counter/state.bin');
const COUNTER_OUTPUT_FILEPATH = resolve(import.meta.dirname, '../contract/counter/output.bin');

const testLayer: Layer.Layer<ConfigCompiler.ConfigCompiler | NodeContext.NodeContext> =
  Effect.gen(function* () {
    const console = yield* MockConsole.make;
    return Layer.mergeAll(
      Console.setConsole(console),
      ConfigCompiler.layer.pipe(Layer.provideMerge(NodeContext.layer)),
    );
  }).pipe(Layer.unwrapEffect);

describe('Circuit Command', () => {
  it('should report success with valid setup', async () => {
    await Effect.gen(function* () {
      // Make a command line instance from the 'deploy' command...
      const cli = Command.run(circuitCommand, { name: 'circuit', version: '0.0.0' });

      // ...and then execute it. We'll use the '-c' option to provide a path to a configuration file, and the
      // '-o' to provide a path to where we want the serialized Intent to be written.
      yield* cli(['node', 'circuit.ts', '-c', COUNTER_CONFIG_FILEPATH, '-o', COUNTER_OUTPUT_FILEPATH, '--state-file-path', COUNTER_STATE_FILEPATH, '02000a2d0e34db258f640dc2ec410fb0e4eea9cd6f9661ba6a86f0c35a708e1b811a', 'increment']);

      const lines = yield* MockConsole.getLines({ stripAnsi: true });

      expect(lines.length).toBe(0);
    }).pipe(
      Effect.provide(testLayer),
      Effect.runPromise
    );
  });
});