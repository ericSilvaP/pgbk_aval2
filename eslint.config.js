import js from '@eslint/js'
import vitestPlugin from '@vitest/eslint-plugin'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import nPlugin from 'eslint-plugin-n'
import promisePlugin from 'eslint-plugin-promise'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const sharedTypeScriptRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports',
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  'import/no-unresolved': 'error',
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
      'newlines-between': 'always',
    },
  ],
  'n/no-missing-import': 'off',
  'promise/catch-or-return': 'error',
  'promise/no-return-wrap': 'error',
  'import/no-duplicates': 'error',
  'import/newline-after-import': 'error',
  'import/first': 'error',
}

export default defineConfig([
  {
    ignores: [
      'build/**',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.eslintcache',
      '.cache/**',
      '**/*.tsbuildinfo',
      '.husky/_/**',
      '.agents/**',
      '.codex/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['*.js', '*.mjs', 'eslint.config.js', 'vitest.config.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      n: nPlugin,
      promise: promisePlugin,
    },
    rules: {
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      'n/no-missing-import': 'off',
      'promise/catch-or-return': 'error',
      'promise/no-return-wrap': 'error',
    },
  },

  {
    files: ['src/**/*.ts', 'prisma/**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      n: nPlugin,
      promise: promisePlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      ...sharedTypeScriptRules,
    },
  },

  {
    files: ['tests/**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...vitestPlugin.environments.env.globals,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      n: nPlugin,
      promise: promisePlugin,
      vitest: vitestPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      ...sharedTypeScriptRules,
      'vitest/expect-expect': 'warn',
      'vitest/no-conditional-expect': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-standalone-expect': 'error',
      'vitest/prefer-strict-equal': 'warn',
      'vitest/prefer-to-have-length': 'warn',
      'vitest/valid-expect': 'error',
      'vitest/valid-title': 'error',
    },
  },

  eslintConfigPrettier,
])
