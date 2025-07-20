import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { join } from "node:path";

/**
 * @typedef PackageJson
 * @type {object}
 * @property {string} name The name of the package.
 * @property {*} exports The exported modules of the package.
 */

/**
 * @typedef Options
 * @type {object}
 * @property {string} [sourceRootFolder] The base folder containing the source files.
 * @property {string} [tsconfig] The filename of the TypeScript configuration file to use.
 * @property {(string|RegExp)[]} [external] Packages or modules listed here will not be included in
 * the compiled bundle.
 */

/** @type {Options} */
const DEFAULT_OPTIONS = {
  sourceRootFolder: "src",
  tsconfig: "tsconfig.build.json",
  external: [
    /node_modules/
  ]
};

/**
 * @param {string} folderPath
 * @param {Options} options
 */
const common = (folderPath, options) => ({
  cache: false,
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: join(folderPath, options.tsconfig),
      composite: true,
    })
  ],
  external: options.external,
});

/**
 * Builds the Rollup configuration object for an object representing a `'package.json'` file.
 *
 * @param {string} folderPath The base path of the folder being processed. This will typically be
 * the folder containing the file represented by `packageJson`.
 * @param {PackageJson} packageJson An object that is the `'package.json'` file for which
 * configuration is to be built.
 * @param {Options} [options] Optional options that will be used while building the configuration.
 * @returns An array of configuration options that will be passed to 'Rollup.js'.
 */
export default function(folderPath, packageJson, options) {
  options = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const sourceExports = new Map(
    Object.keys(packageJson.exports)
      .map(key => ([ join(options.sourceRootFolder, key), packageJson.exports[key] ]))
  );

  return [...sourceExports.entries()].map(([ sourceRoot, conditionalExport ]) => ({
    input: join(folderPath, sourceRoot, "index.ts"),
    output: [
      {
        file: conditionalExport["import"],
        format: "esm",
        sourcemap: true
      },
      {
        file: conditionalExport["require"],
        format: "cjs",
        sourcemap: true
      }
    ],
    ...common(folderPath, options)
  }));
}
