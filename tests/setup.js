import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// Global test setup
config.global.plugins = [createPinia()]

config.global.stubs = {
  // Stub Vuetify components globally with proper templates
  'v-btn': { template: '<button><slot></slot></button>' },
  'v-btn-toggle': { template: '<div class="v-btn-toggle"><slot></slot></div>' },
  'v-icon': { template: '<i><slot></slot></i>' },
  'v-card': { template: '<div class="v-card"><slot></slot></div>' },
  'v-dialog': { template: '<div class="v-dialog"><slot></slot></div>' },
  'v-switch': { template: '<input type="checkbox" class="v-switch" />' },
  'v-checkbox': { template: '<input type="checkbox" class="v-checkbox" />' },
  'v-col': { template: '<div class="v-col"><slot></slot></div>' },
  'v-row': { template: '<div class="v-row"><slot></slot></div>' },
  'v-text-field': { template: '<input type="text" class="v-text-field" />' },
  'v-select': { template: '<select class="v-select"><slot></slot></select>' },
  'v-chip': { template: '<span class="v-chip"><slot></slot></span>' },
  'v-sheet': { template: '<div class="v-sheet"><slot></slot></div>' },
  'v-menu': { template: '<div class="v-menu"><slot></slot></div>' },
  'v-list': { template: '<ul class="v-list"><slot></slot></ul>' },
  'v-list-item': { template: '<li class="v-list-item"><slot></slot></li>' },
  'v-list-item-title': { template: '<div class="v-list-item-title"><slot></slot></div>' },
  'v-slider': { template: '<input type="range" class="v-slider" />' }
}

// Mock directives
config.global.directives = {
  tippy: {
    mounted() {},
    unmounted() {},
    updated() {}
  }
}

// Mock any global properties or plugins
config.global.mocks = {
  // Add mocks here if needed
}

// Suppress console output during tests to reduce noise
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  console.log = () => {}
  console.warn = () => {}
}
