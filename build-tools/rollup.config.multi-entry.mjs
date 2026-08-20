import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

/**
 * Build config for a package that exposes several entry points.
 *
 * All entries are bundled in a SINGLE rollup pass, so a module reached by more
 * than one of them is emitted once and imported by relative path. Bundling each
 * entry separately (one config per entry) would inline such a module into every
 * bundle instead — for error classes that silently breaks `instanceof`, because
 * a class is only ever equal to itself.
 *
 * Kept apart from `rollup.config.factory.mjs` so it pulls in only
 * `@rollup/plugin-typescript` and `rollup-plugin-dts`: the multi-entry packages
 * declare exactly those two, and their tests import this module to assert the
 * single-pass shape.
 *
 * @param entries map of entry name to source file; the name becomes the output
 *   basename, so `{ index: 'src/index.ts' }` yields `dist/index.mjs`.
 * @param external module specifiers to leave unbundled.
 */
export function createMultiEntryRollupConfig(entries, external) {
  const tsPlugin = () => typescript({ tsconfig: './tsconfig.build.json', composite: false });

  return [
    {
      input: entries,
      output: [
        { dir: 'dist', format: 'esm', sourcemap: true, entryFileNames: '[name].mjs', chunkFileNames: 'shared/[name]-[hash].mjs' },
        { dir: 'dist', format: 'cjs', sourcemap: true, entryFileNames: '[name].cjs', chunkFileNames: 'shared/[name]-[hash].cjs' },
      ],
      plugins: [tsPlugin()],
      external,
    },
    {
      input: entries,
      output: [
        { dir: 'dist', format: 'esm', entryFileNames: '[name].d.mts', chunkFileNames: 'shared/[name]-[hash].d.mts' },
        { dir: 'dist', format: 'cjs', entryFileNames: '[name].d.cts', chunkFileNames: 'shared/[name]-[hash].d.cts' },
        { dir: 'dist', format: 'esm', entryFileNames: '[name].d.ts', chunkFileNames: 'shared/[name]-[hash].d.ts' },
      ],
      plugins: [dts()],
      external,
    },
  ];
}
