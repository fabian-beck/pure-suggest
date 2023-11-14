import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
import path from 'path';

import Components from 'unplugin-vue-components/vite'


export default defineConfig({
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
                additionalData: `@import "node_modules/bulma/bulma";
                @import "@/assets/_shared.scss";`
            }
        }
    },
});