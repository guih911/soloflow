<template>
  <v-card
    class="mx-auto pa-12 pb-8"
    elevation="8"
    max-width="448"
    rounded="lg"
  >
    <!-- Logo/Título -->
    <div class="text-center mb-6">
      <v-icon
        size="48"
        color="primary"
        class="mb-4"
      >
        mdi-briefcase-check
      </v-icon>
      <h1 class="text-h4 font-weight-bold">Criar Conta</h1>
      <p class="text-subtitle-1 text-medium-emphasis">Preencha os dados abaixo</p>
    </div>

    <!-- Formulário -->
    <v-form
      v-model="valid"
      @submit.prevent="handleRegister"
      ref="form"
    >
      <v-text-field
        v-model="formData.name"
        :rules="nameRules"
        label="Nome completo"
        prepend-inner-icon="mdi-account-outline"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="formData.email"
        :rules="emailRules"
        label="E-mail"
        type="email"
        prepend-inner-icon="mdi-email-outline"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="formData.password"
        :rules="passwordRules"
        :type="showPassword ? 'text' : 'password'"
        label="Senha"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showPassword = !showPassword"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="formData.companyId"
        :items="companies"
        :rules="companyRules"
        item-title="name"
        item-value="id"
        label="Empresa"
        prepend-inner-icon="mdi-domain"
        variant="outlined"
        class="mb-4"
      />

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

      <!-- Botão de registro -->
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
        Criar Conta
      </v-btn>

      <!-- Link para login -->
      <div class="text-center">
        <span class="text-medium-emphasis">Já tem uma conta?</span>
        <router-link
          to="/login"
          class="text-primary text-decoration-none font-weight-medium ms-1"
        >
          Fazer login
        </router-link>
      </div>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const valid = ref(false)
const showPassword = ref(false)
const companies = ref([])

const formData = reactive({
  name: '',
  email: '',
  password: '',
  companyId: ''
})

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 3 || 'Nome deve ter no mínimo 3 caracteres',
]

const emailRules = [
  v => !!v || 'E-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'E-mail deve ser válido',
]

const passwordRules = [
  v => !!v || 'Senha é obrigatória',
  v => v.length >= 6 || 'Senha deve ter no mínimo 6 caracteres',
]

const companyRules = [
  v => !!v || 'Empresa é obrigatória',
]

onMounted(async () => {
  try {
    // Temporariamente, buscar empresas sem autenticação
    // Em produção, você pode ter um endpoint público para isso
    const response = await api.get('/companies')
    companies.value = response.data
  } catch (error) {
    console.error('Erro ao carregar empresas:', error)
    // Usar empresa padrão se falhar
    companies.value = [
      { id: '1', name: 'Empresa Demo' }
    ]
  }
})

async function handleRegister() {
  if (!valid.value) return

  try {
    await authStore.register(formData)
    window.showSnackbar('Conta criada com sucesso!', 'success')
  } catch (error) {
    console.error('Erro no registro:', error)
  }
}
</script>