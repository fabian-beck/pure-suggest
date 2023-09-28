import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
import path from 'path';

import Components from 'unplugin-vue-components/vite'
// import {
//     VuetifyResolver,
// } from 'unplugin-vue-components/resolvers'


export default defineConfig({
    plugins: [
        vue(),
        Components({
            // resolvers: [
            //     VuetifyResolver(),
            // ],
        }),
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