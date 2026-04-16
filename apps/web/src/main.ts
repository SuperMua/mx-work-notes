import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '../../../packages/shared/workbench-fonts.css'

import App from './App.vue'
import router from './router'
import './styles/base.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
