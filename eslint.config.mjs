// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

// No-new-occurrences gate for unsafe casts in package sources. Existing,
// reviewed occurrences carry an inline eslint-disable; test files and
// testkit-js are exempt (see the four `no-restricted-syntax` blocks below).
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

// The `./v8` subpath and `loadLedger8()` do not exist yet -- they arrive with
// the v8 loader. This gate lands ahead of them deliberately, so no consumer can
// grow a direct v8 dependency in the meantime.
const V8_RUNTIME_MESSAGE =
  'Runtime v8 access will be available only via loadLedger8() from @midnight-ntwrk/midnight-js-protocol.';

// Blocks dynamic `import(...)` of protocol/v8 (and any subpath under it) in
// both of its statically matchable forms: a plain string literal, and a
// template literal with no interpolation (`` `...protocol/v8` ``) that would
// otherwise slip past a Literal-only selector. A template literal WITH
// interpolation cannot be matched statically and is not covered here.
const v8DynamicImportSelectors = [
  {
    selector: "ImportExpression > Literal[value=/^@midnight-ntwrk\\/midnight-js-protocol\\/v8(\\/|$)/]",
    message: `${V8_RUNTIME_MESSAGE} Dynamic imports of protocol/v8 are not allowed outside packages/protocol/src/.`
  },
  {
    selector:
      "ImportExpression > TemplateLiteral[quasis.length=1][quasis.0.value.raw=/^@midnight-ntwrk\\/midnight-js-protocol\\/v8(\\/|$)/]",
    message: `${V8_RUNTIME_MESSAGE} Dynamic imports of protocol/v8 are not allowed outside packages/protocol/src/.`
  }
];

// Shared file scopes for the v8 and unsafe-cast gates below -- both the
// `@typescript-eslint/no-restricted-imports` block and the four
// `no-restricted-syntax` blocks. They exempt different files, so the globs are
// named once and reused rather than restated.
const PACKAGE_SOURCE_GLOBS = ['packages/**/*.ts', 'packages/**/*.tsx', 'packages/**/*.mts'];
const PACKAGE_TEST_GLOBS = ['packages/*/src/test/**/*.ts', 'packages/*/src/test/**/*.tsx', 'packages/*/src/test/**/*.mts'];
const PACKAGE_TEST_DIRS = 'packages/*/src/test/**';
const PROTOCOL_SOURCE_DIRS = 'packages/protocol/src/**';

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
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', './dist/**', '../dist/**'],
              message: 'Direct imports from dist folders are not allowed. Use source files instead.'
            },
            {
              group: ['@midnight-ntwrk/ledger-v*', '@midnightntwrk/ledger-v*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/ledger instead. Only packages/protocol/src/ may import from ledger directly.'
            },
            {
              group: ['@midnight-ntwrk/compact-runtime'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/compact-runtime instead. Only packages/protocol/src/ may import from compact-runtime directly.'
            },
            {
              group: ['@midnight-ntwrk/compact-js', '@midnight-ntwrk/compact-js/*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/compact-js instead. Only packages/protocol/src/ may import from compact-js directly.'
            },
            {
              group: ['@midnight-ntwrk/onchain-runtime-v*', '@midnightntwrk/onchain-runtime-v*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/onchain-runtime instead. Only packages/protocol/src/ may import from onchain-runtime directly.'
            },
            {
              group: ['@midnight-ntwrk/platform-js', '@midnight-ntwrk/platform-js/*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/platform-js instead. Only packages/protocol/src/ may import from platform-js directly.'
            }
          ]
        }
      ],
    }
  },
  {
    // Static-import half of the v8 gate. Its own rule id, so it does not
    // interact with the `no-restricted-syntax` blocks below.
    files: [...PACKAGE_SOURCE_GLOBS, 'testkit-js/**/*.ts'],
    ignores: [PROTOCOL_SOURCE_DIRS],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@midnight-ntwrk/midnight-js-protocol/v8', '@midnight-ntwrk/midnight-js-protocol/v8/*'],
              allowTypeImports: true,
              message: `${V8_RUNTIME_MESSAGE} Type-only imports are allowed.`
            }
          ]
        }
      ]
    }
  },
  // `no-restricted-syntax` carries two independent gates with different
  // exemptions: unsafe casts are off in test files, the v8 ban is off in
  // packages/protocol/src/. Flat config replaces a rule's options wholesale,
  // so a file matched by two blocks keeps only the last one's selectors. The
  // four blocks below are therefore mutually exclusive, and each spells out
  // every selector list that applies to its scope. Never express one of these
  // exemptions as `'no-restricted-syntax': 'off'`: that would also drop the
  // other gate, silently, because an absent rule reports nothing.
  {
    // Package sources, the overlap: both gates apply.
    files: PACKAGE_SOURCE_GLOBS,
    ignores: [PACKAGE_TEST_DIRS, PROTOCOL_SOURCE_DIRS],
    rules: {
      'no-restricted-syntax': ['error', ...unsafeCastSelectors, ...v8DynamicImportSelectors]
    }
  },
  {
    // Protocol sources own the v8 import, but are still held to the casts.
    files: [PROTOCOL_SOURCE_DIRS],
    ignores: [PACKAGE_TEST_DIRS],
    rules: {
      'no-restricted-syntax': ['error', ...unsafeCastSelectors]
    }
  },
  {
    // Package tests may cast — mocking and fixtures legitimately do — but may
    // not reach for v8 directly. Protocol's own tests match neither gate.
    files: PACKAGE_TEST_GLOBS,
    ignores: [PROTOCOL_SOURCE_DIRS],
    rules: {
      'no-restricted-syntax': ['error', ...v8DynamicImportSelectors]
    }
  },
  {
    // testkit-js is fixture code: casts allowed, v8 still gated.
    files: ['testkit-js/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...v8DynamicImportSelectors]
    }
  },
  {
    files: ['packages/protocol/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', './dist/**', '../dist/**'],
              message: 'Direct imports from dist folders are not allowed. Use source files instead.'
            }
          ]
        }
      ]
    }
  },
  prettierConfig
);
