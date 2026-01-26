import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Design System Moderno - Inspirado em Linear, Notion, Monday.com
export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          // Cores Primárias - Azul moderno (alinhado com a logo)
          primary: '#3b82f6',
          'primary-lighten-5': '#eff6ff',
          'primary-lighten-4': '#dbeafe',
          'primary-lighten-3': '#bfdbfe',
          'primary-lighten-2': '#93c5fd',
          'primary-lighten-1': '#60a5fa',
          'primary-darken-1': '#2563eb',
          'primary-darken-2': '#1d4ed8',
          'primary-darken-3': '#1e40af',
          'primary-darken-4': '#1e3a8a',

          // Cores Secundárias - Slate
          secondary: '#64748b',
          'secondary-lighten-1': '#94a3b8',
          'secondary-darken-1': '#475569',
          'secondary-darken-2': '#334155',

          // Cores de Superfície
          background: '#f8fafc',
          surface: '#ffffff',
          'surface-variant': '#f1f5f9',
          'surface-bright': '#ffffff',
          'surface-light': '#f8fafc',

          // Estados
          error: '#ef4444',
          'error-lighten-1': '#f87171',
          'error-darken-1': '#dc2626',

          info: '#06b6d4',
          'info-lighten-1': '#22d3ee',
          'info-darken-1': '#0891b2',

          success: '#10b981',
          'success-lighten-1': '#34d399',
          'success-darken-1': '#059669',

          warning: '#f59e0b',
          'warning-lighten-1': '#fbbf24',
          'warning-darken-1': '#d97706',

          // Texto
          'on-background': '#0f172a',
          'on-surface': '#1e293b',
          'on-surface-variant': '#64748b',
          'on-primary': '#ffffff',
          'on-secondary': '#ffffff',
          'on-error': '#ffffff',
          'on-info': '#ffffff',
          'on-success': '#ffffff',
          'on-warning': '#ffffff',
        },
        variables: {
          // Border Radius
          'border-radius-root': '8px',

          // Elevation
          'high-emphasis-opacity': 0.87,
          'medium-emphasis-opacity': 0.6,
          'disabled-opacity': 0.38,

          // Hover
          'hover-opacity': 0.04,
          'focus-opacity': 0.12,
          'selected-opacity': 0.08,
          'activated-opacity': 0.12,
          'pressed-opacity': 0.12,
          'dragged-opacity': 0.08,
        },
      },
      dark: {
        dark: true,
        colors: {
          // Cores Primárias - Azul moderno (alinhado com a logo)
          primary: '#60a5fa',
          'primary-lighten-1': '#93c5fd',
          'primary-darken-1': '#3b82f6',
          'primary-darken-2': '#2563eb',

          // Cores Secundárias
          secondary: '#94a3b8',
          'secondary-lighten-1': '#cbd5e1',
          'secondary-darken-1': '#64748b',

          // Cores de Superfície
          background: '#0f172a',
          surface: '#1e293b',
          'surface-variant': '#334155',
          'surface-bright': '#475569',
          'surface-light': '#1e293b',

          // Estados
          error: '#f87171',
          info: '#22d3ee',
          success: '#34d399',
          warning: '#fbbf24',

          // Texto
          'on-background': '#f1f5f9',
          'on-surface': '#e2e8f0',
          'on-surface-variant': '#94a3b8',
        },
      },
    },
  },
  defaults: {
    // Configurações globais de componentes
    VCard: {
      elevation: 0,
      rounded: 'lg',
      border: true,
    },
    VBtn: {
      rounded: 'lg',
      fontWeight: 500,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      color: 'primary',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      color: 'primary',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      color: 'primary',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      color: 'primary',
    },
    VChip: {
      rounded: 'lg',
    },
    VAlert: {
      rounded: 'lg',
      variant: 'tonal',
    },
    VList: {
      rounded: 'lg',
    },
    VListItem: {
      rounded: 'lg',
    },
    VMenu: {
      rounded: 'lg',
    },
    VDialog: {
      rounded: 'xl',
    },
    VDataTable: {
      rounded: 'lg',
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})