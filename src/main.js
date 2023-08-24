import { createApp } from 'vue';
import App from './App.vue'
// import packageInfo from './../package.json';

const app = createApp(App)

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
import VueTippy from "vue-tippy";
app.use(VueTippy, {
  maxWidth: 'min(400px,70vw)'
});
// eslint-disable-next-line vue/multi-word-component-names
// Vue.component("tippy", TippyComponent);

// Vue.config.productionTip = false;

// Vue.prototype.$appName = "PURE suggest";
// Vue.prototype.$appNameHtml = '<span class="has-text-primary">PURE&nbsp;</span><span class="has-text-info">suggest</span>';
// Vue.prototype.$appSubtitle = "Citation-based literature search"
// Vue.prototype.$version = packageInfo.version;

// new Vue({
//   pinia,
//   vuetify,
//   render: h => h(App),
// }).$mount('#app')

app.mount('#app');