import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        browser: true,
        es2021: true
      }
    },
    rules: {
      'vue/no-multiple-template-root': 'off'
    }
  }
]