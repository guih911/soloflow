<template>
  <v-card class="login-card" elevation="0">
    <div class="logo-section">
      <img src="/logo.png" alt="SoloFlow" class="logo-image" />
      <p class="subtitle">Informe seu e-mail para recuperar o acesso</p>
    </div>

    <v-form v-model="valid" @submit.prevent="handleSubmit" class="login-form">
      <div class="form-group">
        <label class="form-label">E-mail cadastrado</label>
        <v-text-field
          v-model="email"
          :rules="emailRules"
          type="email"
          placeholder="seu@email.com"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="modern-input"
          autocomplete="email"
        />
      </div>

      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="status-alert"
        density="compact"
      >
        {{ successMessage }}
      </v-alert>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="status-alert"
        density="compact"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </v-alert>

      <v-btn
        :disabled="!valid || loading || !!successMessage"
        :loading="loading"
        block
        color="primary"
        size="x-large"
        type="submit"
        variant="flat"
        class="login-button"
      >
        Enviar Link de Recuperação
      </v-btn>

      <div class="back-link-container">
        <router-link to="/entrar" class="back-link">
          <v-icon size="16" class="mr-1">mdi-arrow-left</v-icon>
          Voltar para o login
        </router-link>
      </div>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api'

const valid = ref(false)
const loading = ref(false)
const email = ref('')
const successMessage = ref(null)
const errorMessage = ref(null)

const emailRules = [
  v => !!v || 'O e-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'O e-mail deve ser válido',
]

async function handleSubmit() {
  if (!valid.value) return

  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const response = await api.post('/auth/forgot-password', { email: email.value })
    successMessage.value = response.data.message || 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.'
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Erro ao processar solicitação. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-card {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border-radius: 24px !important;
  padding: 40px;
  max-width: 440px;
  margin: 0 auto;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 2px 4px rgba(0, 0, 0, 0.03),
    0 12px 24px rgba(0, 0, 0, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.06) !important;
}

.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-image {
  height: 48px;
  width: auto;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
  font-weight: 400;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
}

.modern-input :deep(.v-field) {
  border-radius: 12px;
}

.modern-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.status-alert {
  border-radius: 12px;
}

.login-button {
  height: 52px !important;
  border-radius: 12px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  text-transform: none !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35) !important;
}

.back-link-container {
  text-align: center;
}

.back-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary-600);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.back-link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 20px !important;
  }
}
</style>
