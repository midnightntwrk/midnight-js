// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

// No-new-occurrences gate for unsafe casts in package sources. Existing,
// reviewed occurrences carry an inline eslint-disable; test files and
// testkit-js are exempt (see the dedicated gate block below).
const unsafeCastSelectors = [
  {
    selector: "TSAsExpression[typeAnnotation.type='TSAnyKeyword'], TSTypeAssertion[typeAnnotation.type='TSAnyKeyword']",
    message: "Unsafe cast to 'any'. Use a precise type or a type guard instead; a reviewed exception needs an inline eslint-disable."
  },
  {
    selector: "TSAsExpression[typeAnnotation.type='TSUnknownKeyword'], TSTypeAssertion[typeAnnotation.type='TSUnknownKeyword']",
    message: "Unsafe cast to 'unknown'. Use a precise type or a type guard instead; a reviewed exception needs an inline eslint-disable."
  },
  {
    selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword'], TSTypeAssertion[typeAnnotation.type='TSNeverKeyword']",
    message: "Unsafe cast to 'never'. Use a precise type or a type guard instead; a reviewed exception needs an inline eslint-disable."
  }
];

// Generic hygiene: applies everywhere, since a dist import is wrong in any
// package regardless of who owns the module being imported.
const distImportPattern = {
  group: ['**/dist/**', './dist/**', '../dist/**'],
  message: 'Direct imports from dist folders are not allowed. Use source files instead.'
};

// Version-identity gate: `packages/protocol` is the single place that pins a
// ledger/runtime version, so everything under `packages/` reaches those
// through it. Scoped to `packages/` only -- testkit-js is deliberately exempt,
// like it is for the unsafe-cast gate below: fixtures and cross-version test
// doubles legitimately need a specific version in hand.
const protocolImportPatterns = [
  {
    group: ['@midnight-ntwrk/ledger-v*', '@midnightntwrk/ledger-v*'],
    message:
      'Import from @midnight-ntwrk/midnight-js-protocol/ledger instead. Only packages/protocol/src/ may import from ledger directly.'
  },
  {
    group: ['@midnight-ntwrk/compact-runtime'],
    message:
      'Import from @midnight-ntwrk/midnight-js-protocol/compact-runtime instead. Only packages/protocol/src/ may import from compact-runtime directly.'
  },
  {
    group: ['@midnight-ntwrk/compact-js', '@midnight-ntwrk/compact-js/*'],
    message:
      'Import from @midnight-ntwrk/midnight-js-protocol/compact-js instead. Only packages/protocol/src/ may import from compact-js directly.'
  },
  {
    group: ['@midnight-ntwrk/onchain-runtime-v*', '@midnightntwrk/onchain-runtime-v*'],
    message:
      'Import from @midnight-ntwrk/midnight-js-protocol/onchain-runtime instead. Only packages/protocol/src/ may import from onchain-runtime directly.'
  },
  {
    group: ['@midnight-ntwrk/platform-js', '@midnight-ntwrk/platform-js/*'],
    message:
      'Import from @midnight-ntwrk/midnight-js-protocol/platform-js instead. Only packages/protocol/src/ may import from platform-js directly.'
  }
];

export default tseslint.config(
  {
    // A stale eslint-disable hides nothing but suggests it still does; fail
    // the lint so it gets removed (or the regression it masked gets fixed).
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    }
  },
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.rollup.cache/**',
      '**/gen/**',
      '**/generated/**',
      '**/managed/**',
      '**/compiled/**',
      '**/*.d.ts',
      '**/node_modules/**',
      '**/.yarn/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/temp/**',
      '**/reports/**',
      '**/*.json',
      'packages/compact/src/run-compactc.cjs',
      'scripts/**',
      '.github/scripts/**',
      'yarn.config.cjs',
      '.versionrc.js',
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['packages/**/*.ts', 'packages/**/*.tsx', 'packages/**/*.mts', 'testkit-js/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: false,
          project: ['tsconfig.json', 'packages/*/tsconfig.json', 'testkit-js/*/tsconfig.json'],
          noWarnOnMultipleProjects: true
        }
      }
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_'
        }
      ],
      'object-curly-newline': ['error', {
        'ImportDeclaration': 'never'
      }],
      'object-property-newline': ['error', {
        'allowAllPropertiesOnSameLine': true
      }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-object-literal-type-assertion': 'off',
      '@typescript-eslint/prefer-interface': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-use-before-define': ['error'],
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          'fixStyle': 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-namespace': [
        'error',
        // Ensure that we allow namespace declarations to support Effect style typing.
        {
          'allowDeclarations': true
        }
      ],
      'no-shadow': 'off',
      'prefer-destructuring': 'off',
      'no-use-before-define': 'off',
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'off',
      'import/extensions': 'off',
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/test/**',
            '**/__tests__/**',
            '**/*.test.ts',
            '**/*.spec.ts',
            '**/rollup.config.*',
            '**/vitest.config.*',
            '**/vitest.*.config.*'
          ],
          optionalDependencies: false,
          peerDependencies: true
        }
      ],
      'max-classes-per-file': 'off',
      'lines-between-class-members': 'off',
      'no-restricted-imports': ['error', { patterns: [distImportPattern] }],
    }
  },
  {
    // Version-identity gate, scoped by `files`/`ignores` rather than by a
    // per-file override that re-declares the rule: flat config REPLACES rule
    // options, so an override listing fewer patterns silently drops the rest.
    // `packages/protocol/src` is exempt because it owns the pinning, and falls
    // back to the block above -- which is why it needs no override of its own.
    files: ['packages/**/*.ts', 'packages/**/*.tsx', 'packages/**/*.mts'],
    ignores: ['packages/protocol/src/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [distImportPattern, ...protocolImportPatterns] }]
    }
  },
  {
    // Unsafe-cast gate for package sources. Tests and testkit-js are exempt —
    // mocking and fixtures legitimately cast — via files/ignores scoping
    // rather than a 'no-restricted-syntax: off' override, so the exemption
    // cannot silently disable unrelated selectors another block adds to this
    // rule.
    files: ['packages/**/*.ts', 'packages/**/*.tsx', 'packages/**/*.mts'],
    ignores: ['packages/*/src/test/**'],
    rules: {
      'no-restricted-syntax': ['error', ...unsafeCastSelectors]
    }
  },
  {
    // Hard-fork fixture generator scripts: plain Node scripts, not part of any
    // package's build output, run manually to (re)mint the fixtures in
    // ../fixtures/hf. Not covered by the testkit-js/packages *.ts block above
    // (they are .mjs), so `no-undef` needs the Node globals they actually use
    // declared explicitly.
    files: ['testkit-js/testkit-js/src/fixtures/hf/generators/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly'
      }
    }
  },
  prettierConfig
);
