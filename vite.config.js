import { defineConfig } from 'vite';
import { createVuePlugin } from 'vite-plugin-vue2';
import path from 'path';

export default defineConfig({
    plugins: [createVuePlugin()],
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
        chunkSizeWarningLimit: 600,
        cssCodeSplit: false
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@import "node_modules/bulma/bulma";
                @import "node_modules/buefy/src/scss/buefy"; 
                @import "@/assets/_shared.scss";`
            }
        }
    },
});