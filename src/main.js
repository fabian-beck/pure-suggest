import Vue from 'vue'
import App from './App.vue'

import Buefy from 'buefy'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(fas)
Vue.component('font-awesome-icon', FontAwesomeIcon)
Vue.use(Buefy, { defaultIconPack: 'fas' })

import VueTippy, { TippyComponent } from "vue-tippy";
Vue.use(VueTippy);
Vue.component("tippy", TippyComponent);

Vue.config.productionTip = false

Vue.prototype.$appName = "PURE suggest";
Vue.prototype.$appNameHtml = '<span class="has-text-primary">PURE&nbsp;</span><span class="has-text-info">suggest</span>';
Vue.prototype.$appSubtitle = "Citation-based literature search"
Vue.prototype.$version = "0.1.0";

new Vue({
  render: h => h(App),
}).$mount('#app')