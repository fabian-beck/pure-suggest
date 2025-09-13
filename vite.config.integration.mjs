import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

import Components from 'unplugin-vue-components/vite'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        css: false, // Disable CSS processing in tests
        include: ['tests/integration/**/*.test.js'], // Only integration tests
        testTimeout: 30000, // 30 second timeout for integration tests
        hookTimeout: 60000,  // 60 second timeout for integration test hooks
        // Separate coverage from unit tests
        coverage: {
            reportsDirectory: './coverage/integration'
        }
    },
    base:'./',
    plugins: [
        vue(),
        Components({}),
    ],
    server: {
        port: 8080
    },
    resolve: {
        alias: [
            {
                find: '@',
                replacement: fileURLToPath(new URL('./src', import.meta.url))
            }
        ]
    },
    build: {
        chunkSizeWarningLimit: 1000,
        cssCodeSplit: false,
        target: 'esnext'
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/assets/_shared.scss" as *;`
            }
        }
    },
});