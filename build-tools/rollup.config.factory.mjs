import { isAbsolute } from 'node:path';

import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const DIST_PREFIX = './dist/';
const JS_EXTENSION = /\.js$/;

// Addressed by `exports` but shipped verbatim, so it is not a build entry.
const NON_ENTRY_SUBPATHS = ['./package.json'];

/**
 * Nothing is bundled into a published package: every dependency stays a runtime
 * import so consumers dedupe and patch it themselves. Only relative and
 * absolute specifiers belong to the package being built, which holds because no
 * package resolves its own modules through a `tsconfig` path alias.
 */
const isExternal = (id) => !id.startsWith('.') && !isAbsolute(id);

/**
 * Reads the entry name out of one `exports` entry, e.g. `./dist/ledger.js`
 * gives `ledger`. Throws rather than skipping, so a malformed entry fails the
 * build instead of silently dropping a published subpath.
 */
function entryNameOf(subpath, target) {
  const file = target?.default;
  if (typeof file !== 'string' || !file.startsWith(DIST_PREFIX) || !JS_EXTENSION.test(file)) {
    throw new Error(`"exports" subpath ${subpath} must map "default" to a ${DIST_PREFIX}<name>.js file`);
  }
  return file.slice(DIST_PREFIX.length).replace(JS_EXTENSION, '');
}

/**
 * Derives the build entries from the `exports` map, so the published surface is
 * the single source of truth. Every subpath maps to `src/<name>.ts`, where
 * `<name>` is the file name it exposes under `dist` -- subpath keys are free to
 * differ from it, as `./platform-js/effect/Configuration` does.
 */
function entriesFrom(packageJson) {
  const exportsMap = packageJson.exports;
  if (!exportsMap) {
    throw new Error(`${packageJson.name} declares no "exports" map`);
  }
  const names = Object.entries(exportsMap)
    .filter(([subpath]) => !NON_ENTRY_SUBPATHS.includes(subpath))
    .map(([subpath, target]) => entryNameOf(subpath, target));
  return [...new Set(names)].map((name) => ({ input: `src/${name}.ts`, name }));
}

/**
 * ESM-only config for a `"type": "module"` package. Produces exactly
 * `dist/<name>.js`, `dist/<name>.js.map` and `dist/<name>.d.ts` per entry --
 * no `.cjs`, no `.d.cts`, no `.d.mts`. CommonJS consumers load the package
 * through Node's `require(esm)` support, hence `engines.node >= 22.12`.
 *
 * @param packageJson The package's own manifest; its `exports` map defines the
 *   entries to build.
 * @param options.define Compile-time constants substituted in the sources,
 *   e.g. `{ __DEBUG__: 'false' }`. Values are inserted as written, so string
 *   literals need their own quotes.
 */
export function createRollupConfig(packageJson, { define } = {}) {
  return entriesFrom(packageJson).flatMap(({ input, name }) => [
    {
      input,
      output: [{ file: `dist/${name}.js`, format: 'esm', sourcemap: true }],
      plugins: [
        ...(define ? [replace({ values: define, preventAssignment: true })] : []),
        // Declarations come from `rollup-plugin-dts` below. Letting `tsc` emit
        // them too leaves per-module `.d.ts` and `.d.ts.map` files in `dist`
        // that the `exports` map does not expose.
        typescript({
          tsconfig: './tsconfig.build.json',
          composite: false,
          declaration: false,
          declarationMap: false
        })
      ],
      external: isExternal
    },
    {
      input,
      output: [{ file: `dist/${name}.d.ts`, format: 'esm' }],
      plugins: [dts()],
      external: isExternal
    }
  ]);
}
