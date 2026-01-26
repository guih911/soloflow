<template>
  <v-card class="login-card" elevation="0">
    <div class="logo-section">
      <img src="/logo.png" alt="SoloFlow" class="logo-image" />
      <p class="subtitle">Defina sua nova senha</p>
    </div>

    <v-form v-model="valid" @submit.prevent="handleSubmit" class="login-form">
      <div class="form-group">
        <label class="form-label">Nova senha</label>
        <v-text-field
          v-model="newPassword"
          :rules="passwordRules"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Mínimo de 6 caracteres"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          @click:append-inner="showPassword = !showPassword"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="modern-input"
          autocomplete="new-password"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Confirmar nova senha</label>
        <v-text-field
          v-model="confirmPassword"
          :rules="confirmRules"
          :type="showConfirm ? 'text' : 'password'"
          placeholder="Repita a nova senha"
          prepend-inner-icon="mdi-lock-check-outline"
          :append-inner-icon="showConfirm ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          @click:append-inner="showConfirm = !showConfirm"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="modern-input"
          autocomplete="new-password"
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

      <v-alert
        v-if="!token"
        type="warning"
        variant="tonal"
        class="status-alert"
        density="compact"
      >
        Link inválido. Solicite uma nova recuperação de senha.
      </v-alert>

      <v-btn
        v-if="!successMessage"
        :disabled="!valid || loading || !token"
        :loading="loading"
        block
        color="primary"
        size="x-large"
        type="submit"
        variant="flat"
        class="login-button"
      >
        Redefinir Senha
      </v-btn>

      <v-btn
        v-if="successMessage"
        block
        color="primary"
        size="x-large"
        variant="flat"
        class="login-button"
        @click="$router.push('/entrar')"
      >
        Ir para o Login
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()

const valid = ref(false)
const loading = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const successMessage = ref(null)
const errorMessage = ref(null)
const token = ref(null)

onMounted(() => {
  token.value = route.query.token || null
})

const passwordRules = [
  v => !!v || 'A senha é obrigatória',
  v => v.length >= 8 || 'A senha deve ter no mínimo 8 caracteres',
]

const confirmRules = [
  v => !!v || 'Confirme a senha',
  v => v === newPassword.value || 'As senhas não conferem',
]

async function handleSubmit() {
  if (!valid.value || !token.value) return

  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const response = await api.post('/auth/reset-password', {
      token: token.value,
      newPassword: newPassword.value,
    })
    successMessage.value = response.data.message || 'Senha redefinida com sucesso!'
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Erro ao redefinir senha. O link pode ter expirado.'
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
