import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  plugins: [],
  test: {
    environment: 'jsdom',
    setupFiles: ['./apps/web/vitest.setup.tsx'],
    include: ['apps/web/src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'apps/web/src/**/*.d.ts',
        'apps/web/src/**/*.stories.tsx',
        'apps/web/src/app/**',
        'apps/web/vitest.setup.tsx',
      ],
    },
    globals: true,
    css: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@/components': path.resolve(__dirname, './apps/web/src/components'),
      '@/lib': path.resolve(__dirname, './apps/web/src/lib'),
      '@/hooks': path.resolve(__dirname, './apps/web/src/hooks'),
      '@/types': path.resolve(__dirname, './apps/web/src/types'),
      '@/constants': path.resolve(__dirname, './apps/web/src/constants'),
    },
  },
  async customConfig() {
    const react = await import('@vitejs/plugin-react')
    return {
      plugins: [react.default()],
    }
  },
})