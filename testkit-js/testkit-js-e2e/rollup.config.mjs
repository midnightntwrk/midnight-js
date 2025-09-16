import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import packageJson from './package.json' with { type: 'json' };

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true
      },
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.build.json',
        composite: false
      }),
      commonjs()
    ],
    external: [
      /node_modules/,
      /^@midnight-ntwrk\/testkit-js$/,
      /^@midnight-ntwrk\/midnight-js-(.*)$/,
      /^@midnight-ntwrk\/(.*)$/
    ]
  },
  {
    input: 'src/node/counter.ts',
    output: [
      {
        file: './dist/counter.cjs',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: './dist/counter.mjs',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.build.json',
        composite: false
      }),
      commonjs()
    ],
    external: [
      /node_modules/,
      /^@midnight-ntwrk\/testkit-js$/,
      /^@midnight-ntwrk\/midnight-js-(.*)$/,
      /^@midnight-ntwrk\/(.*)$/
    ]
  }
];
