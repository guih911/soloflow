<template>
  <v-card
    class="mx-auto pa-12 pb-8"
    elevation="8"
    max-width="448"
    rounded="lg"
  >
    <!-- Logo/Título -->
    <div class="text-center mb-8">
      <h1 class="text-h4 font-weight-bold">SoloFlow</h1>
      <p class="text-subtitle-1 text-medium-emphasis">Entre com suas credenciais</p>
    </div>

    <!-- Formulário -->
    <v-form
      v-model="valid"
      @submit.prevent="handleLogin"
      ref="form"
    >
      <v-text-field
        v-model="credentials.email"
        :rules="emailRules"
        label="E-mail"
        type="email"
        prepend-inner-icon="mdi-email-outline"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="credentials.password"
        :rules="passwordRules"
        :type="showPassword ? 'text' : 'password'"
        label="Senha"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showPassword = !showPassword"
        variant="outlined"
        class="mb-2"
      />

      <div class="d-flex align-center justify-space-between mb-4">
        <v-checkbox
          v-model="rememberMe"
          label="Lembrar-me"
          hide-details
          density="compact"
        />
        <a
          href="#"
          class="text-caption text-decoration-none text-primary"
          @click.prevent="forgotPassword"
        >
          Esqueceu a senha?
        </a>
      </div>

      <!-- Alert de erro -->
      <v-alert
        v-if="authStore.error"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="authStore.error = null"
      >
        {{ authStore.error }}
      </v-alert>

      <!-- Botão de login -->
      <v-btn
        :disabled="!valid || authStore.loading"
        :loading="authStore.loading"
        block
        color="primary"
        size="large"
        type="submit"
        variant="elevated"
        class="mb-4"
      >
        Entrar
      </v-btn>


    </v-form>

  </v-card>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const valid = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

const credentials = reactive({
  email: '',
  password: ''
})

// Regras de validação
const emailRules = [
  v => !!v || 'E-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'E-mail deve ser válido',
]

const passwordRules = [
  v => !!v || 'Senha é obrigatória',
  v => v.length >= 6 || 'Senha deve ter no mínimo 6 caracteres',
]

async function handleLogin() {
  if (!valid.value) return

  try {
    await authStore.login(credentials)
    window.showSnackbar('Login realizado com sucesso!', 'success')
  } catch (error) {
    console.error('Erro no login:', error)
  }
}

function forgotPassword() {
  window.showSnackbar('Funcionalidade em desenvolvimento', 'info')
}
</script>

<style scoped>
/* Animação suave no hover dos links */
a {
  transition: all 0.3s ease;
}

a:hover {
  opacity: 0.8;
}
</style>