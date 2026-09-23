/* eslint-disable */
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'coverage/**'
    ]
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    files: [
      'scripts/**/*.{js,ts,mjs,cjs}',
      'tests/**/*.{js,ts,tsx,mjs}',
      '**/*.{spec,test}.{js,ts,tsx}',
      'public/sw.js',
      'public/sw-template.js',
      'lib/utils/logger.ts',
      '**/*.config.{js,ts,mjs}'
    ],
    rules: {
      'no-console': 'off'
    }
  }
];
