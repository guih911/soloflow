<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Meu Perfil</h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        Gerencie suas informações pessoais e configurações
      </p>
    </div>

    <v-row>
      <!-- Informações Pessoais -->
      <v-col cols="12" md="8">
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-account-edit</v-icon>
            Informações Pessoais
          </v-card-title>
          
          <v-divider />
          
          <v-form ref="profileForm" v-model="profileValid">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="profileData.name"
                    label="Nome completo"
                    :rules="nameRules"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="profileData.email"
                    label="E-mail"
                    type="email"
                    :rules="emailRules"
                    disabled
                    hint="Para alterar o e-mail, entre em contato com o administrador"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                @click="resetProfile"
                :disabled="!profileChanged"
              >
                Cancelar
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                :loading="authStore.loading"
                :disabled="!profileValid || !profileChanged"
                @click="updateProfile"
              >
                <v-icon start>mdi-content-save</v-icon>
                Salvar
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card>

        <!-- Alterar Senha -->
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-lock-reset</v-icon>
            Alterar Senha
          </v-card-title>
          
          <v-divider />
          
          <v-form ref="passwordForm" v-model="passwordValid">
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="passwordData.currentPassword"
                    label="Senha atual"
                    type="password"
                    :rules="currentPasswordRules"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="passwordData.newPassword"
                    label="Nova senha"
                    type="password"
                    :rules="newPasswordRules"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="passwordData.confirmPassword"
                    label="Confirmar nova senha"
                    type="password"
                    :rules="confirmPasswordRules"
                    required
                  />
                </v-col>
              </v-row>

              <v-alert
                type="info"
                variant="tonal"
                class="mt-3"
              >
                <v-icon>mdi-information</v-icon>
                A nova senha deve ter no mínimo 6 caracteres e conter pelo menos uma letra e um número.
              </v-alert>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                @click="resetPassword"
              >
                Cancelar
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                :loading="changingPassword"
                :disabled="!passwordValid"
                @click="changePassword"
              >
                <v-icon start>mdi-lock-check</v-icon>
                Alterar Senha
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card>
      </v-col>

      <!-- Informações da Conta -->
      <v-col cols="12" md="4">
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-account-circle</v-icon>
            Informações da Conta
          </v-card-title>
          
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-avatar
                  color="primary"
                  size="48"
                >
                  <span class="text-h6 text-white">
                    {{ getUserInitials(user?.name) }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ user?.name }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider />

          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-domain</v-icon>
              </template>
              <v-list-item-title>Empresa Atual</v-list-item-title>
              <v-list-item-subtitle>{{ activeCompany?.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-shield-account</v-icon>
              </template>
              <v-list-item-title>Perfil de Acesso</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="small" :color="getRoleColor(activeCompany?.role)">
                  {{ getRoleText(activeCompany?.role) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="activeCompany?.sector">
              <template v-slot:prepend>
                <v-icon>mdi-office-building</v-icon>
              </template>
              <v-list-item-title>Setor</v-list-item-title>
              <v-list-item-subtitle>{{ activeCompany.sector.name }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Empresas Vinculadas -->
        <v-card v-if="userCompanies?.length > 1">
          <v-card-title>
            <v-icon class="mr-2">mdi-domain</v-icon>
            Empresas Vinculadas ({{ userCompanies.length }})
          </v-card-title>
          
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item
              v-for="company in userCompanies"
              :key="company.companyId"
              :class="{ 'bg-primary-lighten-5': company.companyId === activeCompany?.companyId }"
            >
              <template v-slot:prepend>
                <v-icon 
                  :color="company.companyId === activeCompany?.companyId ? 'primary' : 'grey'"
                >
                  mdi-domain
                </v-icon>
              </template>
              
              <v-list-item-title class="d-flex align-center">
                {{ company.companyName }}
                <v-icon
                  v-if="company.isDefault"
                  color="warning"
                  size="16"
                  class="ml-2"
                >
                  mdi-star
                </v-icon>
              </v-list-item-title>
              
              <v-list-item-subtitle>
                <div class="d-flex align-center flex-wrap ga-2">
                  <v-chip size="x-small" :color="getRoleColor(company.role)">
                    {{ getRoleText(company.role) }}
                  </v-chip>
                  <span v-if="company.sector" class="text-caption">
                    • {{ company.sector.name }}
                  </span>
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  v-if="company.companyId !== activeCompany?.companyId"
                  icon="mdi-swap-horizontal"
                  size="small"
                  variant="text"
                  @click="switchToCompany(company.companyId)"
                  :loading="switchingCompany === company.companyId"
                />
                <v-icon
                  v-else
                  color="primary"
                  size="small"
                >
                  mdi-check-circle
                </v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Estatísticas -->
        <v-card class="mt-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            Suas Estatísticas
          </v-card-title>
          
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-clipboard-text</v-icon>
              </template>
              <v-list-item-title>Tarefas Pendentes</v-list-item-title>
              <v-list-item-subtitle>{{ userStats.pendingTasks || 0 }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>Tarefas Concluídas</v-list-item-title>
              <v-list-item-subtitle>{{ userStats.completedTasks || 0 }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="info">mdi-file-document</v-icon>
              </template>
              <v-list-item-title>Processos Criados</v-list-item-title>
              <v-list-item-subtitle>{{ userStats.createdProcesses || 0 }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Estado
const profileValid = ref(false)
const passwordValid = ref(false)
const changingPassword = ref(false)
const switchingCompany = ref(null)
const userStats = ref({
  pendingTasks: 0,
  completedTasks: 0,
  createdProcesses: 0
})

const profileForm = ref(null)
const passwordForm = ref(null)

const profileData = ref({
  name: '',
  email: ''
})

const originalProfileData = ref({})

const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Computed
const user = computed(() => authStore.user)
const activeCompany = computed(() => authStore.activeCompany)
const userCompanies = computed(() => {
  // Extrair empresas do usuário logado
  if (user.value?.userCompanies) {
    return user.value.userCompanies.map(uc => ({
      companyId: uc.company.id,
      companyName: uc.company.name,
      role: uc.role,
      sector: uc.sector,
      isDefault: uc.isDefault
    }))
  }
  return []
})

const profileChanged = computed(() => {
  return JSON.stringify(profileData.value) !== JSON.stringify(originalProfileData.value)
})

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

const emailRules = [
  v => !!v || 'E-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'E-mail deve ser válido'
]

const currentPasswordRules = [
  v => !!v || 'Senha atual é obrigatória'
]

const newPasswordRules = [
  v => !!v || 'Nova senha é obrigatória',
  v => v.length >= 6 || 'Nova senha deve ter no mínimo 6 caracteres',
  v => /(?=.*[a-zA-Z])(?=.*\d)/.test(v) || 'Nova senha deve conter pelo menos uma letra e um número'
]

const confirmPasswordRules = [
  v => !!v || 'Confirmação é obrigatória',
  v => v === passwordData.value.newPassword || 'Senhas não coincidem'
]

// Watch para atualizar dados quando usuário mudar
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    profileData.value = {
      name: newUser.name,
      email: newUser.email
    }
    originalProfileData.value = { ...profileData.value }
  }
}, { immediate: true })

// Métodos auxiliares
function getUserInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getRoleColor(role) {
  const colors = {
    ADMIN: 'error',
    MANAGER: 'warning',
    USER: 'info'
  }
  return colors[role] || 'grey'
}

function getRoleText(role) {
  const roles = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    USER: 'Usuário'
  }
  return roles[role] || role
}

// Métodos
function resetProfile() {
  profileData.value = { ...originalProfileData.value }
}

async function updateProfile() {
  if (!profileValid.value) return

  try {
    await authStore.updateProfile(profileData.value)
    originalProfileData.value = { ...profileData.value }
    window.showSnackbar?.('Perfil atualizado com sucesso!', 'success')
  } catch (error) {
    console.error('Error updating profile:', error)
    window.showSnackbar?.('Erro ao atualizar perfil', 'error')
  }
}

function resetPassword() {
  passwordData.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  passwordForm.value?.reset()
}

async function changePassword() {
  if (!passwordValid.value) return

  changingPassword.value = true
  try {
    await authStore.changePassword({
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword
    })
    resetPassword()
    window.showSnackbar?.('Senha alterada com sucesso!', 'success')
  } catch (error) {
    console.error('Error changing password:', error)
    window.showSnackbar?.('Erro ao alterar senha', 'error')
  } finally {
    changingPassword.value = false
  }
}

async function switchToCompany(companyId) {
  switchingCompany.value = companyId
  try {
    await authStore.switchCompany(companyId)
    window.showSnackbar?.('Empresa alterada com sucesso!', 'success')
  } catch (error) {
    console.error('Error switching company:', error)
    window.showSnackbar?.('Erro ao alterar empresa', 'error')
  } finally {
    switchingCompany.value = null
  }
}

async function loadUserStats() {
  try {
    // Aqui você pode fazer chamadas para APIs específicas para buscar estatísticas
    // Por enquanto, vamos simular
    userStats.value = {
      pendingTasks: 5,
      completedTasks: 23,
      createdProcesses: 8
    }
  } catch (error) {
    console.error('Error loading user stats:', error)
  }
}

onMounted(() => {
  loadUserStats()
})
</script>

<style scoped>
.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>