import { config } from '@vue/test-utils'

// Global test setup
config.global.stubs = {
  // Stub Vuetify components globally
  'v-btn': true,
  'v-icon': true,
  'v-card': true,
  'v-dialog': true,
  'v-switch': true
}

// Mock any global properties or plugins
config.global.mocks = {
  // Add mocks here if needed
}