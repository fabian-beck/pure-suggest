import Vue from 'vue'
import App from './App.vue'
import {version} from './../package.json';

import '@mdi/font/css/materialdesignicons.css'
import Buefy from 'buefy'
Vue.use(Buefy, { defaultIconPack: 'mdi' })

import VueTippy, { TippyComponent } from "vue-tippy";
Vue.use(VueTippy, {
  maxWidth: 'min(400px,70vw)'
});
// eslint-disable-next-line vue/multi-word-component-names
Vue.component("tippy", TippyComponent);

Vue.config.productionTip = false;

Vue.prototype.$appName = "PURE suggest";
Vue.prototype.$appNameHtml = '<span class="has-text-primary">PURE&nbsp;</span><span class="has-text-info">suggest</span>';
Vue.prototype.$appSubtitle = "Citation-based literature search"
Vue.prototype.$version = version;

new Vue({
  render: h => h(App),
}).$mount('#app')