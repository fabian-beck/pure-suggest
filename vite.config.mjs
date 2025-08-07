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
        testTimeout: 15000, // 15 second timeout for tests (browser tests need longer)
        hookTimeout: 60000  // 60 second timeout for beforeAll/afterAll hooks
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