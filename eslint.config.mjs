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
      '**/*.d.ts',
      '**/node_modules/**',
      '**/.yarn/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/temp/**',
      '**/reports/**',
      '**/*.json',
      'packages/compact/src/run-compactc.cjs',
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['packages/**/*.ts', 'packages/**/*.tsx', 'packages/**/*.mts', 'compact-js/**/*.ts', 'platform-js/**/*.ts', 'testkit-js/**/*.ts'],
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
          project: ['tsconfig.json', 'packages/*/tsconfig.json', 'compact-js/*/tsconfig.json', 'platform-js/*/tsconfig.json', 'testkit-js/*/tsconfig.json']
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
      'import/no-extraneous-dependencies': 'off',
      'max-classes-per-file': 'off',
      'lines-between-class-members': 'off',
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
      ],
    }
  },
  prettierConfig
);
