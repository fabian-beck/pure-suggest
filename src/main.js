import { createApp } from 'vue';
import App from './App.vue'
const app = createApp(App)

// App meta data
import packageInfo from './../package.json';
const appMeta = {
  name: "PURE suggest",
  nameHtml: '<span class="has-text-primary">PURE&nbsp;</span><span class="has-text-info">suggest</span>',
  subtitle: "Citation-based literature search",
  version: packageInfo.version,
};
app.provide('appMeta', appMeta);

// Pinia
import { createPinia } from 'pinia'
const pinia = createPinia()
app.use(pinia);

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
const vuetify = createVuetify({
  components,
  directives,
});
app.use(vuetify)

// Icons
import '@mdi/font/css/materialdesignicons.css'

// VueTippy
import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css'
app.use(VueTippy, {
  maxWidth: 'min(400px,70vw)',
  directive: 'tippy', // => v-tippy
  component: 'tippy', // => <tippy/>
  defaultProps: {
    allowHTML: true,
  },
});
// eslint-disable-next-line vue/multi-word-component-names
// Vue.component("tippy", TippyComponent);

// Vue.config.productionTip = false;

app.mount('#app');