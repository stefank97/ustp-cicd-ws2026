import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      // main.ts only wires the game logic to the DOM and canvas.
      exclude: ['src/**/*.test.ts', 'src/main.ts'],
      reportOnFailure: true,
    },
  },
});
