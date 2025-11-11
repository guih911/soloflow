/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module 'vuetify/styles'

declare module 'v-mask' {
  import type { Directive } from 'vue'

  interface VueMaskPlugin {
    VueMaskDirective: Directive
  }

  const plugin: VueMaskPlugin
  export default plugin
  export const VueMaskDirective: Directive
}

declare module './router' {
  import type { Router } from 'vue-router'
  const router: Router
  export default router
}
