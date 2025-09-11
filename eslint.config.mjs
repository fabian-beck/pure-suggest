import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import configPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/strongly-recommended'],
  configPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'vue/no-multiple-template-root': 'off',
      
      // Enhanced Vue 3 Composition API Rules
      'vue/prefer-import-from-vue': 'error',
      'vue/prefer-separate-static-class': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/custom-event-name-casing': ['error', 'camelCase'],
      'vue/no-useless-v-bind': 'error',
      'vue/no-unused-refs': 'error',
      'vue/no-useless-template-attributes': 'error',
      'vue/prefer-define-options': 'error',
      'vue/define-macros-order': 'error',
      'vue/define-emits-declaration': 'error',
      'vue/define-props-declaration': 'error',
      
      // Vue Performance
      'vue/no-setup-props-reactivity-loss': 'error',
      
      // Advanced Code Quality Rules
      // Import/Export Management
      'no-duplicate-imports': 'error',
      
      // Modern JavaScript Best Practices
      'prefer-const': 'error',
      'no-var': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-template': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'object-shorthand': 'error',
      'prefer-exponentiation-operator': 'error',
      
      // Code Quality & Complexity
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', 100],
      
      // Error Prevention
      'yoda': 'error',
      'no-implicit-coercion': 'error',
      'radix': 'error',
      
      // Performance & Bundle Size
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['lodash', '!lodash/*'],
          message: 'Use specific lodash imports to enable tree-shaking'
        }]
      }]
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.vitest,
        global: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Disable length warnings for tests - they often need longer functions for comprehensive testing
      'max-lines-per-function': 'off',
      'complexity': 'off'
    }
  },
  {
    files: ['tools/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
]
