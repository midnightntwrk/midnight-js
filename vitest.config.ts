/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      enabled: true,
      clean: true,
      provider: 'v8',
      reporter: ['html', 'text', 'lcov', 'json', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['packages/**/*.{js,jsx,ts,tsx}'],
      exclude: ['packages/**/src/test/**/*.{js,jsx,ts,tsx}']
    },
    reporters: ['default', 'json'],
    outputFile: {
      json: 'reports/test-report.json'
    },
    testTimeout: 180000,
    include: ['packages/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  },
  resolve: {
    alias: {
      '@midnight-ntwrk/onchain-runtime': '@midnight-ntwrk/onchain-runtime-cjs'
    }
  }
});
