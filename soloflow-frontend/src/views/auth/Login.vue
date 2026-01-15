<template>
  <v-card
    class="mx-auto pa-8 pb-6 login-card"
    elevation="24"
    max-width="420"
    rounded="xl"
  >
    <!-- Logo/Título -->
    <div class="text-center mb-6 logo-container">
      <img src="/logo.png" alt="SoloFlow" class="logo-image" />
      <p class="subtitle-text">Entre com suas credenciais para continuar</p>
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
        color="primary"
        class="mb-3 modern-input"
        density="comfortable"
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
        color="primary"
        class="mb-2 modern-input"
        density="comfortable"
      />

      <div class="d-flex align-center justify-space-between mb-4">
        <v-checkbox
          v-model="rememberMe"
          label="Lembrar-me"
          hide-details
          density="compact"
          color="primary"
        />
        <a
          href="#"
          class="text-caption text-decoration-none forgot-link"
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
        size="x-large"
        type="submit"
        variant="elevated"
        class="mb-4 login-button"
        rounded="lg"
      >
        <span class="text-h6 font-weight-medium">Entrar</span>
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

// Carregar credenciais salvas ao montar o componente
onMounted(() => {
  const savedEmail = localStorage.getItem('rememberedEmail')
  
  if (savedEmail) {
    credentials.email = savedEmail
    rememberMe.value = true
  }
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
    // Salvar ou remover e-mail baseado no checkbox
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
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-container {
  animation: slideDown 0.6s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-image {
  width: 280px;
  height: auto;
  margin: 0 auto;
  display: block;
  filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.15));
  transition: transform 0.3s ease;
}

.logo-image:hover {
  transform: scale(1.05);
}

.welcome-text {
  font-size: 1.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.subtitle-text {
  color: #64748b;
  font-size: 0.95rem;
  margin-top: 8px;
  font-weight: 400;
}

.modern-input {
  transition: all 0.3s ease;
}

.modern-input:deep(.v-field) {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.modern-input:deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.login-button {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3) !important;
  text-transform: none;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover {
  box-shadow: 0 6px 24px rgba(37, 99, 235, 0.4) !important;
  transform: translateY(-2px);
}

.login-button:active {
  transform: translateY(0);
}

.forgot-link {
  color: #2563eb;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
}

.forgot-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #2563eb, #1e40af);
  transition: width 0.3s ease;
}

.forgot-link:hover::after {
  width: 100%;
}

.forgot-link:hover {
  color: #1e40af;
}

/* Estilo do checkbox */
:deep(.v-checkbox .v-selection-control__input) {
  transition: all 0.3s ease;
}

/* Alert com animação */
.v-alert {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsividade */
@media (max-width: 600px) {
  .logo-image {
    width: 220px;
  }
  
  .welcome-text {
    font-size: 1.5rem;
  }
  
  .login-card {
    max-width: 90% !important;
  }
}
</style>