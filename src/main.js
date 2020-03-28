import Vue from 'vue'
import App from './App.vue'

import Buefy from 'buefy'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(fas)
Vue.component('font-awesome-icon', FontAwesomeIcon)
Vue.use(Buefy, { defaultIconPack: 'fas' })

/*import VTooltip from 'v-tooltip'
Vue.use(VTooltip)
VTooltip.options.popover.defaultTrigger = 'hover';*/

import VueTippy, { TippyComponent } from "vue-tippy";
Vue.use(VueTippy);
Vue.component("tippy", TippyComponent);

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')