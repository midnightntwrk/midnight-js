/* eslint-env node */
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dts from 'rollup-plugin-dts';

export function createRollupConfig(packageJson) {
  const external = [/node_modules/, /^@midnight-ntwrk\/midnight-js-(.*)$/];

  return [
    {
      input: 'src/index.ts',
      output: [
        {
          file: packageJson.module,
          format: 'esm',
          sourcemap: true,
        },
        {
          file: packageJson.main,
          format: 'cjs',
          sourcemap: true,
        },
      ],
      plugins: [
        resolve(),
        replace({
          // eslint-disable-next-line no-undef
          __DEBUG__: JSON.stringify(process.env.CI !== 'true'),
          preventAssignment: true,
        }),
        typescript({
          tsconfig: './tsconfig.build.json',
          composite: false,
        }),
        commonjs(),
      ],
      external,
    },
    {
      input: 'src/index.ts',
      output: [
        { file: packageJson.types.replace('.d.ts', '.d.mts'), format: 'esm' },
        { file: packageJson.types.replace('.d.ts', '.d.cts'), format: 'cjs' },
        { file: packageJson.types, format: 'esm' },
      ],
      plugins: [dts()],
      external,
    },
  ];
}
