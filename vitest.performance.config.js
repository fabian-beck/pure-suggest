import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['tests/setup.js'],
    include: ['tests/performance/**/*.{test,spec,perf}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json'
    },
    testTimeout: 30000,
    globals: true
  }
})
