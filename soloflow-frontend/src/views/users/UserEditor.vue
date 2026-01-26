<template>
  <div class="user-editor-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <v-btn
          icon
          variant="text"
          color="white"
          @click="goBack"
          class="back-btn"
          aria-label="Voltar para lista de usuários"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="header-content">
          <div class="header-icon" aria-hidden="true">
            <v-icon size="28" color="white">
              {{ isEditing ? 'mdi-account-edit' : 'mdi-account-plus' }}
            </v-icon>
          </div>
          <div class="header-text">
            <h1 class="page-title">{{ isEditing ? 'Editar Usuário' : 'Novo Usuário' }}</h1>
            <p class="page-subtitle">
              {{ isEditing ? 'Atualize as informações e permissões do usuário' : 'Preencha os dados para criar um novo usuário' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="mt-4 text-medium-emphasis">Carregando dados do usuário...</p>
    </div>

    <!-- Form Content -->
    <v-form
      v-else
      ref="form"
      v-model="valid"
      @submit.prevent="save"
      class="editor-form"
    >
      <div class="form-container">
        <!-- Seção: Informações Básicas -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-icon section-icon--primary">
              <v-icon size="24" color="white">mdi-account-circle</v-icon>
            </div>
            <div>
              <h2 class="section-title">Informações Básicas</h2>
              <p class="section-subtitle">Dados pessoais e de identificação do usuário</p>
            </div>
          </div>

          <div class="section-content">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.name"
                  label="Nome completo *"
                  :rules="nameRules"
                  required
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  placeholder="Ex: João Silva Santos"
                  hint="Informe o nome completo do usuário"
                  persistent-hint
                  counter
                  maxlength="100"
                  aria-required="true"
                  autocomplete="name"
                >
                  <template v-slot:append-inner>
                    <v-icon v-if="formData.name && formData.name.length >= 3" color="success" size="20">
                      mdi-check-circle
                    </v-icon>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.email"
                  label="E-mail corporativo *"
                  type="email"
                  :rules="emailRules"
                  :disabled="isEditing"
                  required
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-email-outline"
                  placeholder="usuario@empresa.com.br"
                  hint="E-mail para login e notificações"
                  persistent-hint
                  aria-required="true"
                  autocomplete="email"
                >
                  <template v-slot:append-inner>
                    <v-icon v-if="formData.email && emailRules.every(r => r(formData.email) === true)" color="success" size="20">
                      mdi-check-circle
                    </v-icon>
                    <v-tooltip v-if="isEditing" activator="parent" location="top">
                      O e-mail não pode ser alterado após a criação
                    </v-tooltip>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.cpf"
                  label="CPF *"
                  prepend-inner-icon="mdi-card-account-details-outline"
                  :rules="cpfRules"
                  required
                  variant="outlined"
                  density="comfortable"
                  placeholder="Digite apenas números"
                  hint="Digite apenas os números do CPF (11 dígitos)"
                  persistent-hint
                  maxlength="11"
                  type="text"
                  counter
                >
                  <template v-slot:append-inner>
                    <v-icon v-if="formData.cpf && formData.cpf.length === 11" color="success" size="20">
                      mdi-check-circle
                    </v-icon>
                  </template>
                  <template v-slot:append>
                    <v-tooltip location="top" max-width="300">
                      <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" color="info" size="small">mdi-information</v-icon>
                      </template>
                      <div class="text-caption">
                        <strong>CPF Obrigatório para Assinatura Digital</strong><br/>
                        O CPF é necessário para:<br/>
                        • Assinatura digital de documentos<br/>
                        • Validação de identidade<br/>
                        • Auditoria e rastreabilidade
                      </div>
                    </v-tooltip>
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6" v-if="!isEditing">
                <v-text-field
                  v-model="formData.password"
                  label="Senha inicial *"
                  :type="showPassword ? 'text' : 'password'"
                  :rules="passwordRules"
                  required
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-lock-outline"
                  placeholder="Mínimo 8 caracteres"
                  hint="O usuário poderá alterar a senha após o primeiro login"
                  persistent-hint
                  counter
                  maxlength="50"
                >
                  <template v-slot:append-inner>
                    <v-btn
                      :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                      variant="text"
                      density="compact"
                      size="small"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </v-text-field>
              </v-col>

              <v-col cols="12" md="6" v-if="isEditing">
                <div class="status-card">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon :color="formData.isActive ? 'success' : 'error'" class="mr-3" size="28">
                        {{ formData.isActive ? 'mdi-account-check' : 'mdi-account-off' }}
                      </v-icon>
                      <div>
                        <p class="text-subtitle-2 font-weight-bold mb-1">
                          Status do Usuário
                        </p>
                        <p class="text-caption text-medium-emphasis mb-0">
                          {{ formData.isActive ? 'Usuário pode acessar o sistema' : 'Usuário bloqueado' }}
                        </p>
                      </div>
                    </div>
                    <v-switch
                      v-model="formData.isActive"
                      color="success"
                      hide-details
                      inset
                    />
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Seção: Empresas e Permissões -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-icon section-icon--success">
              <v-icon size="24" color="white">mdi-office-building</v-icon>
            </div>
            <div class="flex-grow-1">
              <h2 class="section-title">Empresas e Permissões</h2>
              <p class="section-subtitle">Configure o acesso do usuário às empresas do sistema</p>
            </div>
            <v-btn
              v-if="canAddMoreCompanies"
              @click="addCompany"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus-circle"
              class="add-company-btn"
            >
              Adicionar Empresa
            </v-btn>
          </div>

          <div class="section-content">
            <!-- Empty State -->
            <div v-if="formData.companies.length === 0" class="empty-state-card">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-office-building-plus-outline</v-icon>
              <h4 class="text-h6 font-weight-bold mb-2">Nenhuma Empresa Associada</h4>
              <p class="text-body-2 text-medium-emphasis mb-4">
                É necessário vincular o usuário a pelo menos uma empresa para que ele possa acessar o sistema.
              </p>
              <v-btn
                @click="addCompany"
                color="primary"
                variant="elevated"
                size="large"
                prepend-icon="mdi-plus-circle"
              >
                Adicionar Primeira Empresa
              </v-btn>
            </div>

            <!-- Lista de Empresas -->
            <div v-else class="companies-grid">
              <div
                v-for="(company, index) in formData.companies"
                :key="`company-${index}`"
                class="company-card"
              >
                <!-- Botão Remover -->
                <v-btn
                  v-if="formData.companies.length > 1"
                  icon
                  variant="text"
                  size="x-small"
                  color="error"
                  class="company-remove-btn"
                  @click="removeCompany(index)"
                >
                  <v-icon size="18">mdi-close</v-icon>
                  <v-tooltip activator="parent" location="top">Remover Empresa</v-tooltip>
                </v-btn>

                <!-- Campos do Card -->
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="company.companyId"
                      :items="getAvailableCompaniesForIndex(index)"
                      item-title="name"
                      item-value="id"
                      label="Empresa *"
                      :rules="[v => !!v || 'A empresa é obrigatória']"
                      required
                      prepend-inner-icon="mdi-domain"
                      @update:model-value="onCompanyChange(index, $event)"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="company.profileId"
                      :items="getProfilesForCompany(company.companyId)"
                      item-title="name"
                      item-value="id"
                      label="Perfil de Acesso *"
                      :rules="[v => !!v || 'O perfil de acesso é obrigatório']"
                      :disabled="!company.companyId || !getProfilesForCompany(company.companyId).length"
                      prepend-inner-icon="mdi-shield-account"
                      variant="outlined"
                      density="comfortable"
                      :hint="!company.companyId ? 'Selecione uma empresa primeiro' : (!getProfilesForCompany(company.companyId).length ? 'Cadastre um perfil antes de continuar' : '')"
                      persistent-hint
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="company.sectorId"
                      :items="getSectorsForCompany(company.companyId)"
                      item-title="name"
                      item-value="id"
                      label="Setor (opcional)"
                      clearable
                      prepend-inner-icon="mdi-sitemap-outline"
                      :disabled="!company.companyId"
                      variant="outlined"
                      density="comfortable"
                      :hint="!company.companyId ? 'Selecione uma empresa primeiro' : ''"
                      persistent-hint
                    />
                  </v-col>

                  <v-col cols="12" md="6" class="d-flex align-center">
                    <v-switch
                      v-model="company.isDefault"
                      label="Empresa padrão no login"
                      color="primary"
                      @update:model-value="onDefaultChange(index, $event)"
                      hide-details
                    />
                    <v-tooltip activator="parent" location="top">
                      <span>Esta será a empresa ativa quando o usuário fizer login</span>
                    </v-tooltip>
                  </v-col>
                </v-row>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Fixo -->
      <div class="form-footer">
        <div class="footer-content">
          <v-btn
            variant="outlined"
            size="large"
            @click="goBack"
            :disabled="saving"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Cancelar
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="elevated"
            size="large"
            :loading="saving"
            :disabled="!canSave"
          >
            <v-icon start>
              {{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}
            </v-icon>
            {{ isEditing ? 'Salvar Alterações' : 'Criar Usuário' }}
          </v-btn>
        </div>
      </div>
    </v-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import { useCompanyStore } from '@/stores/company'
import { useSectorStore } from '@/stores/sectors'
import { useProfileStore } from '@/stores/profiles'

const props = defineProps({
  id: {
    type: String,
    default: null
  }
})

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userStore = useUserStore()
const companyStore = useCompanyStore()
const sectorStore = useSectorStore()
const profileStore = useProfileStore()

// Estado
const loading = ref(false)
const saving = ref(false)
const valid = ref(false)
const showPassword = ref(false)
const form = ref(null)

const formData = ref({
  name: '',
  email: '',
  password: '',
  cpf: '',
  companies: [],
  isActive: true
})

// Computed
const isEditing = computed(() => !!props.id || !!route.params.id)
const userId = computed(() => props.id || route.params.id)
const profiles = computed(() => profileStore.profiles || [])

const availableCompanies = computed(() => {
  const allCompanies = companyStore.companies || []
  const canSeeAllCompanies = authStore.hasPermission('companies', 'manage') ||
                             authStore.hasPermission('users', 'manage') ||
                             authStore.hasPermission('*', '*')

  if (canSeeAllCompanies) {
    return allCompanies
  }

  const userCompanyId = authStore.activeCompany?.companyId || authStore.activeCompanyId
  if (!userCompanyId) {
    return allCompanies
  }

  return allCompanies.filter(c => c.id === userCompanyId)
})

const canAddMoreCompanies = computed(() => {
  const assignedCompanyIds = formData.value.companies.map(c => c.companyId).filter(Boolean)
  return availableCompanies.value.some(company => !assignedCompanyIds.includes(company.id))
})

const canSave = computed(() => {
  return valid.value &&
         formData.value.companies.length > 0 &&
         formData.value.companies.every(c => c.companyId && c.profileId) &&
         formData.value.companies.some(c => c.isDefault)
})

// Regras de validação
const nameRules = [
  v => !!v || 'O nome é obrigatório',
  v => (v && v.length >= 3) || 'O nome deve ter no mínimo 3 caracteres'
]

const emailRules = [
  v => !!v || 'O e-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'O e-mail deve ser válido'
]

const passwordRules = [
  v => !!v || 'A senha é obrigatória',
  v => (v && v.length >= 8) || 'A senha deve ter no mínimo 8 caracteres'
]

const cpfRules = [
  v => !!v || 'O CPF é obrigatório (necessário para assinatura digital)',
  v => /^\d+$/.test(v) || 'O CPF deve conter apenas números',
  v => (v && v.length === 11) || 'O CPF deve ter 11 dígitos',
  v => {
    if (!v) return true
    if (/^(\d)\1{10}$/.test(v)) return 'CPF inválido'
    return true
  }
]

// Métodos auxiliares
function getCompanyName(companyId) {
  if (!companyId) return ''
  const company = availableCompanies.value.find(c => c.id === companyId)
  return company?.name || ''
}

function getSectorsForCompany(companyId) {
  if (!companyId) return []
  return (sectorStore.sectors || []).filter(s => s.companyId === companyId)
}

function getAvailableCompaniesForIndex(index) {
  const currentCompany = formData.value.companies[index]
  const currentCompanyId = currentCompany?.companyId
  const selectedCompanyIds = formData.value.companies
    .map((c, i) => i !== index ? c.companyId : null)
    .filter(Boolean)

  const filteredCompanies = availableCompanies.value.filter(company =>
    company.id === currentCompanyId || !selectedCompanyIds.includes(company.id)
  )

  if (currentCompanyId && !filteredCompanies.some(c => c.id === currentCompanyId)) {
    const companyName = currentCompany?.companyName ||
                        getCompanyName(currentCompanyId) ||
                        companyStore.companies?.find(c => c.id === currentCompanyId)?.name ||
                        'Carregando...'
    filteredCompanies.unshift({
      id: currentCompanyId,
      name: companyName
    })
  }

  return filteredCompanies
}

function getProfilesForCompany(companyId) {
  if (!companyId) return []
  return (profiles.value || []).filter(profile => !profile.companyId || profile.companyId === companyId)
}

function findDefaultProfileForCompany(companyId) {
  if (!companyId) return null
  const available = getProfilesForCompany(companyId)
  if (!available.length) return null

  return (
    available.find((profile) => profile.companyId === companyId && profile.isDefault) ||
    available.find((profile) => !profile.companyId && profile.isDefault) ||
    null
  )
}

function applyDefaultProfileForCompany(index, { overwrite = false } = {}) {
  const company = formData.value.companies[index]
  if (!company || !company.companyId) return
  if (company.profileId && !overwrite) return

  const defaultProfile = findDefaultProfileForCompany(company.companyId)
  if (defaultProfile) {
    company.profileId = defaultProfile.id
  }
}

// Métodos de gerenciamento de empresas
function addCompany() {
  const assignedCompanyIds = formData.value.companies.map(c => c.companyId).filter(Boolean)
  const availableForAdd = availableCompanies.value
    .filter(c => !assignedCompanyIds.includes(c.id))

  if (availableForAdd.length > 0) {
    const firstAvailable = availableForAdd[0]
    const newCompany = {
      companyId: firstAvailable.id,
      companyName: firstAvailable.name,
      sectorId: null,
      profileId: null,
      isDefault: formData.value.companies.length === 0
    }

    formData.value.companies.push(newCompany)
    applyDefaultProfileForCompany(formData.value.companies.length - 1)
  } else {
    window.showSnackbar?.('Todas as empresas disponíveis já foram adicionadas', 'warning')
  }
}

function removeCompany(index) {
  const removedCompany = formData.value.companies[index]
  formData.value.companies.splice(index, 1)

  if (removedCompany.isDefault && formData.value.companies.length > 0) {
    formData.value.companies[0].isDefault = true
  }
}

function onDefaultChange(index, isDefault) {
  if (isDefault) {
    formData.value.companies.forEach((company, i) => {
      company.isDefault = i === index
    })
  } else {
    const hasDefault = formData.value.companies.some((c, i) => i !== index && c.isDefault)
    if (!hasDefault && formData.value.companies.length > 0) {
      formData.value.companies[index].isDefault = true
    }
  }
}

function onCompanyChange(index, newCompanyId) {
  const company = formData.value.companies[index]
  if (!company) return

  const currentSectorId = company.sectorId
  const sectorsForNewCompany = getSectorsForCompany(newCompanyId)
  const sectorBelongsToNewCompany = currentSectorId &&
    sectorsForNewCompany.some(s => s.id === currentSectorId)

  if (!sectorBelongsToNewCompany) {
    company.sectorId = null
  }

  const currentProfileId = company.profileId
  const profilesForNewCompany = getProfilesForCompany(newCompanyId)
  const profileValidForNewCompany = currentProfileId &&
    profilesForNewCompany.some(p => p.id === currentProfileId)

  if (!profileValidForNewCompany) {
    company.profileId = null
    applyDefaultProfileForCompany(index, { overwrite: true })
  }

  const selectedCompany = availableCompanies.value.find(c => c.id === newCompanyId)
  company.companyName = selectedCompany?.name || ''
}

watch(
  profiles,
  () => {
    formData.value.companies.forEach((_, index) => applyDefaultProfileForCompany(index))
  },
  { deep: true },
)

// Navegação
function goBack() {
  router.push('/usuarios')
}

// Carregar dados
async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      companyStore.fetchCompanies(),
      sectorStore.fetchSectors(),
      profileStore.fetchProfiles()
    ])

    if (isEditing.value && userId.value) {
      await loadUser()
    } else {
      // Novo usuário - adicionar primeira empresa automaticamente
      if (availableCompanies.value.length > 0) {
        const firstCompany = availableCompanies.value[0]
        formData.value.companies.push({
          companyId: firstCompany.id,
          companyName: firstCompany.name,
          sectorId: null,
          profileId: null,
          isDefault: true
        })
        applyDefaultProfileForCompany(0)
      }
    }
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar dados', 'error')
  } finally {
    loading.value = false
  }
}

async function loadUser() {
  try {
    const user = await userStore.fetchUser(userId.value)
    if (!user) {
      window.showSnackbar?.('Usuário não encontrado', 'error')
      router.push('/usuarios')
      return
    }

    const cpfLimpo = (user.cpf || '').replace(/\D/g, '')
    formData.value = {
      name: user.name || '',
      email: user.email || '',
      password: '',
      cpf: cpfLimpo,
      companies: user.companies && user.companies.length > 0
        ? user.companies.map(company => ({
            companyId: company.companyId,
            companyName: company.companyName || '',
            sectorId: company.sectorId || company.sector?.id || null,
            profileId: company.profileId || null,
            isDefault: company.isDefault || false
          }))
        : [{
            companyId: authStore.user?.companyId || (availableCompanies.value[0]?.id || ''),
            companyName: availableCompanies.value[0]?.name || '',
            sectorId: user.sector?.id || null,
            profileId: null,
            isDefault: true
          }],
      isActive: user.isActive ?? true
    }

    nextTick(() => {
      form.value?.validate()
    })
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar usuário', 'error')
    router.push('/usuarios')
  }
}

// Salvar
async function save() {
  if (!valid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  if (formData.value.companies.length === 0) {
    window.showSnackbar?.('Pelo menos uma empresa deve ser adicionada', 'error')
    return
  }

  const invalidCompanies = formData.value.companies.filter(c => !c.companyId || !c.profileId)
  if (invalidCompanies.length > 0) {
    window.showSnackbar?.('Todas as empresas devem ter empresa e perfil selecionados', 'error')
    return
  }

  const hasDefault = formData.value.companies.some(c => c.isDefault)
  if (!hasDefault) {
    formData.value.companies[0].isDefault = true
  }

  saving.value = true
  try {
    const data = {
      name: formData.value.name,
      email: formData.value.email,
      cpf: formData.value.cpf || null,
      companies: formData.value.companies.map(company => ({
        companyId: company.companyId,
        sectorId: company.sectorId || null,
        profileId: company.profileId,
        isDefault: company.isDefault || false
      })),
      isActive: formData.value.isActive
    }

    if (!isEditing.value) {
      data.password = formData.value.password
    }

    if (isEditing.value) {
      await userStore.updateUser(userId.value, {
        name: data.name,
        cpf: data.cpf,
        isActive: data.isActive
      })
      await userStore.updateUserCompanies(userId.value, data.companies)
      window.showSnackbar('Usuário atualizado com sucesso!', 'success')
    } else {
      await userStore.createUser(data)
      window.showSnackbar('Usuário criado com sucesso!', 'success')
    }

    router.push('/usuarios')
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao salvar usuário'
    window.showSnackbar(errorMessage, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ========================================
   USER EDITOR PAGE
   ======================================== */

.user-editor-page {
  min-height: 100vh;
  background: var(--color-neutral-50);
  display: flex;
  flex-direction: column;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  margin-right: 8px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white !important;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 0;
}

/* Loading Container */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
}

/* Editor Form */
.editor-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Form Container */
.form-container {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

/* Form Section */
.form-section {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-neutral-50) 0%, transparent 100%);
  border-bottom: 1px solid var(--color-surface-border);
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon--primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
}

.section-icon--success {
  background: linear-gradient(135deg, var(--color-success-500), var(--color-success-600));
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.section-subtitle {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 4px 0 0 0;
}

.section-content {
  padding: 24px;
}

/* Status Card */
.status-card {
  background: var(--color-neutral-50);
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid var(--color-neutral-200);
  height: 100%;
  display: flex;
  align-items: center;
}

/* Empty State Card */
.empty-state-card {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-neutral-50);
  border-radius: 12px;
  border: 2px dashed var(--color-neutral-200);
}

/* Companies Grid */
.companies-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Company Card */
.company-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-neutral-200);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.company-card:hover {
  border-color: var(--color-primary-300);
}

.company-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

/* Add Company Button */
.add-company-btn {
  flex-shrink: 0;
}

/* Form Footer */
.form-footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-surface-border);
  padding: 20px 24px;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-icon {
    width: 48px;
    height: 48px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .form-container {
    padding: 20px 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .add-company-btn {
    width: 100%;
  }

  .footer-content {
    flex-direction: column;
  }

  .footer-content .v-btn {
    width: 100%;
  }
}
</style>
