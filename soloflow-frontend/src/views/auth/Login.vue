<template>
  <v-card class="login-card" elevation="0">
    <!-- Logo Section -->
    <div class="logo-section">
      <img src="/logo.png" alt="SoloFlow" class="logo-image" />
      <p class="subtitle">Entre com suas credenciais para acessar o sistema</p>
    </div>

    <!-- Login Form -->
    <v-form
      v-model="valid"
      @submit.prevent="handleLogin"
      ref="form"
      class="login-form"
    >
      <!-- Email Field -->
      <div class="form-group">
        <label class="form-label" id="email-label">E-mail</label>
        <v-text-field
          v-model="credentials.email"
          :rules="emailRules"
          type="email"
          placeholder="seu@email.com"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="modern-input"
          aria-required="true"
          aria-labelledby="email-label"
          autocomplete="email"
        />
      </div>

      <!-- Password Field -->
      <div class="form-group">
        <label class="form-label" id="password-label">Senha</label>
        <v-text-field
          v-model="credentials.password"
          :rules="passwordRules"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Digite sua senha"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          @click:append-inner="showPassword = !showPassword"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="modern-input"
          aria-required="true"
          aria-labelledby="password-label"
          autocomplete="current-password"
        />
      </div>

      <!-- Remember & Forgot -->
      <div class="form-options">
        <v-checkbox
          v-model="rememberMe"
          label="Lembrar-me"
          hide-details
          density="compact"
          color="primary"
          class="remember-checkbox"
        />
        <a href="#" class="forgot-link" @click.prevent="forgotPassword">
          Esqueceu a senha?
        </a>
      </div>

      <!-- LGPD Consent Notice -->
      <div class="consent-notice">
        <v-icon size="16" color="primary" class="mr-1">mdi-shield-check</v-icon>
        <span>
          Ao entrar, você concorda com nossa
          <router-link to="/politica-de-privacidade" target="_blank" class="consent-link">
            Política de Privacidade
          </router-link>
          e
          <router-link to="/termos-de-uso" target="_blank" class="consent-link">
            Termos de Uso
          </router-link>.
        </span>
      </div>

      <!-- Error Alert -->
      <v-alert
        v-if="authStore.error"
        type="error"
        variant="tonal"
        class="error-alert"
        closable
        density="compact"
        @click:close="authStore.error = null"
      >
        {{ authStore.error }}
      </v-alert>

      <!-- Login Button -->
      <v-btn
        :disabled="!valid || authStore.loading"
        :loading="authStore.loading"
        block
        color="primary"
        size="x-large"
        type="submit"
        variant="flat"
        class="login-button"
        aria-label="Entrar no sistema"
      >
        Entrar
      </v-btn>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
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

// Load saved email
onMounted(() => {
  const savedEmail = localStorage.getItem('rememberedEmail')
  if (savedEmail) {
    credentials.email = savedEmail
    rememberMe.value = true
  }
})

// Validation rules
const emailRules = [
  v => !!v || 'O e-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'O e-mail deve ser válido',
]

const passwordRules = [
  v => !!v || 'A senha é obrigatória',
  v => v.length >= 6 || 'A senha deve ter no mínimo 6 caracteres',
]

async function handleLogin() {
  if (!valid.value) return

  try {
    if (rememberMe.value) {
      localStorage.setItem('rememberedEmail', credentials.email)
    } else {
      localStorage.removeItem('rememberedEmail')
    }

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
  animation: cardAppear 0.5s ease-out;
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Logo Section */
.logo-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-image {
  height: 48px;
  width: auto;
  margin-bottom: 16px;
  animation: logoFloat 0.6s ease-out;
}

@keyframes logoFloat {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.subtitle {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
  font-weight: 400;
}

/* Form */
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
  transition: all 0.2s ease;
}

.modern-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.modern-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.3;
}

.modern-input :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

/* Form Options */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remember-checkbox {
  margin-left: -8px;
}

.remember-checkbox :deep(.v-label) {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.forgot-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary-600);
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: var(--color-primary-700);
  text-decoration: underline;
}

/* LGPD Consent Notice */
.consent-notice {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 16px;
  background: var(--color-primary-50, #eff6ff);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
}

.consent-notice .v-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.consent-link {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 500;
}

.consent-link:hover {
  text-decoration: underline;
}

/* Error Alert */
.error-alert {
  border-radius: 12px;
}

/* Login Button */
.login-button {
  height: 52px !important;
  border-radius: 12px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  text-transform: none !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35) !important;
  transition: all 0.2s ease !important;
}

.login-button:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45) !important;
  transform: translateY(-1px);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

/* Footer */
.login-footer {
  margin-top: 32px;
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--color-neutral-200);
}

.footer-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.support-link {
  color: var(--color-primary-600);
  text-decoration: none;
  font-weight: 500;
}

.support-link:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 600px) {
  .login-card {
    padding: 32px 24px;
    border-radius: 20px !important;
  }

  .logo-image {
    height: 40px;
  }

  .login-button {
    height: 48px !important;
  }
}
</style>