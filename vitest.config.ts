import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', '.tanstack', '.content-collections'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/routes/**', 'src/components/**', 'src/**/*.d.ts', 'src/routeTree.gen.ts'],
    },
    // Separate test pools for unit vs integration
    typecheck: {
      enabled: false,
    },
  },
})
