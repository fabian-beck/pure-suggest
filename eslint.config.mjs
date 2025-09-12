import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginSonarJS from 'eslint-plugin-sonarjs'
import pluginImport from 'eslint-plugin-import'
import configPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/strongly-recommended'],
  pluginSonarJS.configs.recommended,
  configPrettier,
  {
    plugins: {
      import: pluginImport
    },
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
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index'
        ],
        'newlines-between': 'always',
        'alphabetize': { 'order': 'asc', 'caseInsensitive': true },
        'warnOnUnassignedImports': true
      }],
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/first': 'error',
      
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
      'complexity': ['warn', 20],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', 200],
      
      // SonarJS Rules for detecting wrapper functions
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/slow-regex': 'warn',
      
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
    files: ['src/composables/useAppState.js'],
    rules: {
      // Exception for useAppState: This is a coordination composable that acts as a unified API facade
      // Breaking it up would hurt the architecture by creating unnecessary indirection
      'max-lines-per-function': 'off'
    }
  },
  {
    files: ['src/components/NetworkVisComponent.vue', 'tests/unit/bugs/author-nodes-visibility.test.js', 'src/main.js'],
    rules: {
      // Exception for complex import organization with comments or application entry points
      'import/order': 'off'
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
      // Disable length and complexity warnings for tests - they often need longer functions for comprehensive testing
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'max-nested-callbacks': 'off',
      
      // SonarJS exceptions for test files - these patterns are acceptable/necessary in tests
      'sonarjs/no-nested-functions': 'off', // Deep callback nesting is common in test setups
      'sonarjs/pseudo-random': 'off', // Math.random() is fine for test data generation
      'sonarjs/no-identical-expressions': 'off', // Repetitive assertions are normal in tests
      'sonarjs/no-identical-functions': 'off', // Test helper duplication is sometimes needed
      'sonarjs/no-os-command-from-path': 'off', // Performance tests may need system commands
      'sonarjs/cognitive-complexity': 'off' // Complex test scenarios are acceptable
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
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      
      // Tools exceptions - developer utilities may have different quality requirements
      'sonarjs/regex-complexity': 'off', // Complex regex needed for parsing code
      'sonarjs/slow-regex': 'off', // Code parsing requires complex regex patterns
      'sonarjs/no-unused-collection': 'off', // May have experimental/future features
      'sonarjs/cognitive-complexity': 'off', // Tools can be complex for functionality
      'sonarjs/no-nested-functions': 'off', // Deep nesting acceptable for parsing logic
      'complexity': 'off' // Tools prioritize functionality over complexity limits
    }
  }
]
