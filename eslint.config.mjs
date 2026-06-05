// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';



export default tseslint.config(
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
      'yarn.config.cjs',
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
      '@typescript-eslint/no-explicit-any': 'warn',
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
              group: ['@midnight-ntwrk/ledger-v*'],
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
              group: ['@midnight-ntwrk/onchain-runtime-v*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/onchain-runtime instead. Only packages/protocol/src/ may import from onchain-runtime directly.'
            },
            {
              group: ['@midnight-ntwrk/platform-js', '@midnight-ntwrk/platform-js/*'],
              message: 'Import from @midnight-ntwrk/midnight-js-protocol/platform-js instead. Only packages/protocol/src/ may import from platform-js directly.'
            }
          ]
        }
      ],
      // Forbid raw `.deserialize`/`.decode` calls on ledger/runtime types — consumers must use
      // the typed wrappers in @midnight-ntwrk/midnight-js-utils. See spec issue-816 §10.4 (D5/D13).
      // Override below allows the wrappers themselves and test files.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='deserialize'][callee.object.name=/^(ContractState|LedgerContractState|CompactContractState|ZswapChainState|Transaction|LedgerTransaction|LedgerParameters)$/]",
          message: 'Direct .deserialize() call on a ledger/runtime type is forbidden. Use the typed wrapper from @midnight-ntwrk/midnight-js-utils (e.g. deserializeContractState, deserializeZswapChainState).'
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='decode'][callee.object.name=/^(StateValue|LedgerStateValue)$/]",
          message: 'Direct .decode() call on StateValue is forbidden. Use decodeLedgerStateValue from @midnight-ntwrk/midnight-js-utils.'
        }
      ]
    }
  },
  {
    // The typed wrappers are the SOLE sanctioned location for raw .deserialize/.decode calls.
    files: ['packages/utils/src/deserialization/typed-wrappers.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Test files may construct raw calls intentionally (fixtures, canaries).
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // testkit-js is test infrastructure for external dApp consumers — it may
    // legitimately use raw .deserialize for setup/teardown and for variants
    // (e.g. PreBinding) not covered by the production typed wrappers.
    files: ['testkit-js/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off'
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
