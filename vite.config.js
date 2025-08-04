import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
import path from 'path';

import Components from 'unplugin-vue-components/vite'


export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        css: false // Disable CSS processing in tests
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
                replacement: path.resolve(__dirname, 'src')
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
                additionalData: `@import "node_modules/bulma/css/bulma.css";
                @import "@/assets/_shared.scss";`
            }
        }
    },
});