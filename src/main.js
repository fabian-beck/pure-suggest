import { createPinia } from 'pinia'
import { createApp } from 'vue'
import VueTippy from 'vue-tippy'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import packageInfo from './../package.json'

// App meta data

// Pinia

// Vuetify

// Icons
import '@mdi/font/css/materialdesignicons.css'

// Bulma CSS
import 'bulma/css/bulma.css'

// Bulma color overrides (must be imported after Bulma)
import './assets/bulma-color-overrides.css'

// VueTippy
import 'tippy.js/dist/tippy.css'

const app = createApp(App)
const appMeta = {
  name: 'PUREsuggest',
  nameHtml:
    '<span class="has-text-primary">PURE&ThinSpace;</span><span class="has-text-info">suggest</span>',
  subtitle: 'Citation-based literature search',
  version: packageInfo.version
}
app.provide('appMeta', appMeta)
const pinia = createPinia()
app.use(pinia)
const vuetify = createVuetify({
  components,
  directives
})
app.use(vuetify)
app.use(VueTippy, {
  maxWidth: 'min(400px,70vw)',
  directive: 'tippy', // => v-tippy
  component: 'tippy', // => <tippy/>
  defaultProps: {
    allowHTML: true
  }
})

app.mount('#app')
