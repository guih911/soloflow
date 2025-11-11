import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import VueMask from 'v-mask'
import '@/styles/main.scss'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.directive('mask', VueMask.VueMaskDirective)

// Global error handler
app.config.errorHandler = (err, _vm, info) => {
  console.error('Global error:', err, info)
}

app.mount('#app')
