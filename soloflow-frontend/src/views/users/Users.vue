<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Usuários</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Gerencie os usuários e suas permissões
        </p>
      </div>
      <v-btn
        color="primary"
        @click="openDialog()"
        prepend-icon="mdi-plus"
      >
        Novo Usuário
      </v-btn>
    </div>

    <!-- Tabela de Usuários -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="users"
        :loading="loading"
        :search="search"
        class="elevation-0"
      >
        <template v-slot:top>
          <v-card-title class="d-flex align-center pe-2">
            <v-icon icon="mdi-account-group" class="mr-2"></v-icon>
            Lista de Usuários
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              density="compact"
              label="Buscar"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              flat
              hide-details
              single-line
            ></v-text-field>
          </v-card-title>
        </template>

        <template v-slot:item.role="{ item }">
          <v-chip
            :color="getRoleColor(item.role)"
            size="small"
          >
            {{ getRoleText(item.role) }}
          </v-chip>
        </template>

        <template v-slot:item.sector="{ item }">
          <v-chip
            v-if="item.sector"
            size="small"
            variant="tonal"
          >
            {{ item.sector.name }}
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <template v-slot:item.companies="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <v-tooltip
              v-for="company in (item.companies || []).slice(0, 2)"
              :key="company.companyId"
              :text="`${company.companyName} - ${getRoleText(company.role)}`"
              location="top"
            >
              <template v-slot:activator="{ props }">
                <v-chip
                  v-bind="props"
                  size="x-small"
                  :color="company.isDefault ? 'primary' : 'grey'"
                  :variant="company.isDefault ? 'elevated' : 'tonal'"
                  class="mr-1 mb-1"
                >
                  {{ company.companyName }}
                  <v-icon
                    v-if="company.isDefault"
                    end
                    size="12"
                  >
                    mdi-star
                  </v-icon>
                </v-chip>
              </template>
            </v-tooltip>
            
            <!-- Indicador de mais empresas -->
            <v-chip
              v-if="(item.companies || []).length > 2"
              size="x-small"
              variant="outlined"
              color="grey"
            >
              +{{ (item.companies || []).length - 2 }}
            </v-chip>
          </div>
        </template>

        <template v-slot:item.isActive="{ item }">
          <v-icon
            :color="item.isActive ? 'success' : 'error'"
            :icon="item.isActive ? 'mdi-check-circle' : 'mdi-close-circle'"
          />
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="openDialog(item)"
          />
          <v-btn
            v-if="canDelete(item)"
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog de Criação/Edição -->
    <v-dialog
      v-model="dialog"
      max-width="900"
      persistent
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">
            {{ editingItem?.id ? 'mdi-account-edit' : 'mdi-account-plus' }}
          </v-icon>
          {{ editingItem?.id ? 'Editar Usuário' : 'Novo Usuário' }}
        </v-card-title>

        <v-divider />

        <v-form
          ref="form"
          v-model="valid"
          @submit.prevent="save"
        >
          <v-card-text style="max-height: 70vh; overflow-y: auto;">
            <!-- Informações Básicas -->
            <div class="mb-6">
              <h3 class="text-h6 mb-4">
                <v-icon class="mr-2">mdi-account</v-icon>
                Informações Básicas
              </h3>

              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.name"
                    label="Nome completo *"
                    :rules="nameRules"
                    required
                    prepend-icon="mdi-account"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.email"
                    label="E-mail *"
                    type="email"
                    :rules="emailRules"
                    :disabled="!!editingItem?.id"
                    required
                    prepend-icon="mdi-email"
                  />
                </v-col>
              </v-row>

              <v-row v-if="!editingItem?.id">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.password"
                    label="Senha *"
                    type="password"
                    :rules="passwordRules"
                    required
                    prepend-icon="mdi-lock"
                  />
                </v-col>
              </v-row>

              <v-row v-if="editingItem?.id">
                <v-col cols="12">
                  <v-switch
                    v-model="formData.isActive"
                    label="Usuário Ativo"
                    color="primary"
                    prepend-icon="mdi-account-check"
                  />
                </v-col>
              </v-row>
            </div>

            <!-- Empresas e Permissões -->
            <div>
              <div class="d-flex align-center justify-space-between mb-4">
                <h3 class="text-h6">
                  <v-icon class="mr-2">mdi-domain</v-icon>
                  Empresas e Permissões
                </h3>
                <v-btn
                  v-if="canAddMoreCompanies"
                  @click="addCompany"
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                >
                  Adicionar Empresa
                </v-btn>
              </div>

              <!-- Validação visual -->
              <v-alert
                v-if="formData.companies.length === 0"
                type="warning"
                variant="tonal"
                class="mb-4"
              >
                <v-icon>mdi-alert</v-icon>
                É necessário adicionar pelo menos uma empresa para o usuário.
              </v-alert>
              
              <!-- Lista de empresas -->
              <div v-if="formData.companies.length > 0" class="space-y-4">
                <v-card
                  v-for="(company, index) in formData.companies"
                  :key="`company-${index}`"
                  variant="outlined"
                  class="mb-4"
                  :class="{ 'border-warning': company.isDefault }"
                >
                  <v-card-title class="d-flex align-center justify-space-between py-3 bg-grey-lighten-5">
                    <div class="d-flex align-center">
                      <v-icon
                        :color="company.isDefault ? 'warning' : 'primary'"
                        class="mr-3"
                      >
                        {{ company.isDefault ? 'mdi-star' : 'mdi-domain' }}
                      </v-icon>
                      <div>
                        <div class="font-weight-medium">
                          Empresa {{ index + 1 }}
                          <v-chip
                            v-if="company.isDefault"
                            size="x-small"
                            color="warning"
                            variant="elevated"
                            class="ml-2"
                          >
                            Padrão
                          </v-chip>
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ getCompanyName(company.companyId) || 'Selecione uma empresa' }}
                        </div>
                      </div>
                    </div>
                    
                    <v-btn
                      v-if="formData.companies.length > 1"
                      icon="mdi-close"
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeCompany(index)"
                    />
                  </v-card-title>

                  <v-card-text class="pt-4">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="company.companyId"
                          :items="getAvailableCompaniesForIndex(index)"
                          item-title="name"
                          item-value="id"
                          label="Empresa *"
                          :rules="[v => !!v || 'Empresa é obrigatória']"
                          required
                          prepend-icon="mdi-domain"
                          @update:model-value="onCompanyChange(index, $event)"
                          variant="outlined"
                          density="comfortable"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-select
                          v-model="company.role"
                          :items="getAvailableRoles()"
                          label="Perfil *"
                          :rules="[v => !!v || 'Perfil é obrigatório']"
                          required
                          prepend-icon="mdi-shield-account"
                          variant="outlined"
                          density="comfortable"
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
                          prepend-icon="mdi-office-building"
                          :disabled="!company.companyId"
                          variant="outlined"
                          density="comfortable"
                          :hint="!company.companyId ? 'Selecione uma empresa primeiro' : 'Deixe vazio se não pertencer a um setor específico'"
                          persistent-hint
                        />
                      </v-col>

                      <v-col cols="12" md="6" class="d-flex align-center">
                        <v-switch
                          v-model="company.isDefault"
                          label="Empresa padrão"
                          color="warning"
                          @update:model-value="onDefaultChange(index, $event)"
                          class="mt-2"
                        />
                        <v-tooltip activator="parent" location="top">
                          <span>Esta será a empresa ativa quando o usuário fizer login</span>
                        </v-tooltip>
                      </v-col>
                    </v-row>

                    <!-- Resumo da empresa -->
                    <v-alert
                      v-if="company.companyId && company.role"
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mt-3"
                    >
                      <div class="text-caption">
                        <strong>{{ getCompanyName(company.companyId) }}</strong>
                        • {{ getRoleText(company.role) }}
                        <span v-if="company.sectorId">
                          • {{ getSectorName(company.sectorId) }}
                        </span>
                        <span v-if="company.isDefault" class="text-warning">
                          • Empresa Padrão
                        </span>
                      </div>
                    </v-alert>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Estado vazio -->
              <v-card
                v-if="formData.companies.length === 0"
                variant="outlined"
                class="text-center py-8"
              >
                <v-card-text>
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">
                    mdi-domain-plus
                  </v-icon>
                  <div class="text-h6 text-medium-emphasis mb-2">
                    Nenhuma empresa vinculada
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-4">
                    Adicione pelo menos uma empresa para o usuário
                  </div>
                  <v-btn
                    v-if="availableCompanies.length > 0"
                    @click="addCompany"
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-plus"
                  >
                    Adicionar Primeira Empresa
                  </v-btn>
                  <v-alert
                    v-else
                    type="warning"
                    variant="text"
                    class="mt-4"
                  >
                    Nenhuma empresa disponível
                  </v-alert>
                </v-card-text>
              </v-card>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeDialog"
              :disabled="saving"
            >
              Cancelar
            </v-btn>
            <v-btn
              type="submit"
              color="primary"
              variant="elevated"
              :loading="saving"
              :disabled="!canSave"
            >
              <v-icon start>
                {{ editingItem?.id ? 'mdi-content-save' : 'mdi-plus' }}
              </v-icon>
              {{ editingItem?.id ? 'Salvar' : 'Criar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de Confirmação de Exclusão -->
    <v-dialog
      v-model="deleteDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        
        <v-card-text>
          Tem certeza que deseja remover o usuário
          <strong>{{ deletingItem?.name }}</strong>?
          Esta ação não pode ser desfeita.
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="deleteUser"
            :loading="deleting"
          >
            Excluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import { useCompanyStore } from '@/stores/company'
import { useSectorStore } from '@/stores/sectors'

const authStore = useAuthStore()
const userStore = useUserStore()
const companyStore = useCompanyStore()
const sectorStore = useSectorStore()

// Estado
const dialog = ref(false)
const deleteDialog = ref(false)
const valid = ref(false)
const saving = ref(false)
const deleting = ref(false)
const search = ref('')
const editingItem = ref(null)
const deletingItem = ref(null)

const form = ref(null)
const formData = ref({
  name: '',
  email: '',
  password: '',
  companies: [],
  isActive: true
})

// Computed
const loading = computed(() => userStore.loading)
const users = computed(() => userStore.users)
const availableCompanies = computed(() => {
  if (authStore.isAdmin) {
    return companyStore.companies || []
  } else {
    // Managers só podem gerenciar usuários da própria empresa
    return (companyStore.companies || []).filter(c => c.id === authStore.user?.companyId)
  }
})

const canAddMoreCompanies = computed(() => {
  const assignedCompanyIds = formData.value.companies.map(c => c.companyId).filter(Boolean)
  return availableCompanies.value.some(company => !assignedCompanyIds.includes(company.id))
})

const canSave = computed(() => {
  return valid.value && 
         formData.value.companies.length > 0 && 
         formData.value.companies.every(c => c.companyId && c.role) &&
         formData.value.companies.some(c => c.isDefault)
})

// Headers da tabela
const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'E-mail', key: 'email' },
  { title: 'Perfil Atual', key: 'role' },
  { title: 'Setor Atual', key: 'sector' },
  { title: 'Empresas', key: 'companies', sortable: false },
  { title: 'Status', key: 'isActive', align: 'center' },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false }
]

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => (v && v.length >= 3) || 'Nome deve ter no mínimo 3 caracteres'
]

const emailRules = [
  v => !!v || 'E-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'E-mail deve ser válido'
]

const passwordRules = [
  v => !!v || 'Senha é obrigatória',
  v => (v && v.length >= 6) || 'Senha deve ter no mínimo 6 caracteres'
]

// Opções
const roles = [
  { title: 'Administrador', value: 'ADMIN' },
  { title: 'Gerente', value: 'MANAGER' },
  { title: 'Usuário', value: 'USER' }
]

// Métodos auxiliares
function getRoleColor(role) {
  const colors = {
    ADMIN: 'error',
    MANAGER: 'warning',
    USER: 'info'
  }
  return colors[role] || 'grey'
}

function getRoleText(role) {
  const role_obj = roles.find(r => r.value === role)
  return role_obj?.title || role
}

function canDelete(user) {
  return authStore.isAdmin && user.id !== authStore.user?.id
}

function getCompanyName(companyId) {
  if (!companyId) return ''
  const company = availableCompanies.value.find(c => c.id === companyId)
  return company?.name || ''
}

function getSectorName(sectorId) {
  if (!sectorId) return ''
  const sector = (sectorStore.sectors || []).find(s => s.id === sectorId)
  return sector?.name || ''
}

function getSectorsForCompany(companyId) {
  if (!companyId) return []
  return (sectorStore.sectors || []).filter(s => s.companyId === companyId)
}

function getAvailableCompaniesForIndex(index) {
  // Para a empresa atual, mostrar todas as disponíveis
  // Para outras, filtrar as já selecionadas
  const currentCompanyId = formData.value.companies[index]?.companyId
  const selectedCompanyIds = formData.value.companies
    .map((c, i) => i !== index ? c.companyId : null)
    .filter(Boolean)

  return availableCompanies.value.filter(company => 
    company.id === currentCompanyId || !selectedCompanyIds.includes(company.id)
  )
}

function getAvailableRoles() {
  // Se não for admin, não pode criar outros admins
  if (!authStore.isAdmin) {
    return roles.filter(r => r.value !== 'ADMIN')
  }
  return roles
}

// Métodos de gerenciamento de empresas
function addCompany() {
  const assignedCompanyIds = formData.value.companies.map(c => c.companyId).filter(Boolean)
  const availableCompanyIds = availableCompanies.value
    .map(c => c.id)
    .filter(id => !assignedCompanyIds.includes(id))

  if (availableCompanyIds.length > 0) {
    const newCompany = {
      companyId: availableCompanyIds[0], // Selecionar automaticamente a primeira disponível
      role: 'USER',
      sectorId: null,
      isDefault: formData.value.companies.length === 0
    }
    
    formData.value.companies.push(newCompany)
  } else {
    window.showSnackbar?.('Todas as empresas disponíveis já foram adicionadas', 'warning')
  }
}

function removeCompany(index) {
  const removedCompany = formData.value.companies[index]
  formData.value.companies.splice(index, 1)

  // Se removeu a empresa padrão, definir a primeira como padrão
  if (removedCompany.isDefault && formData.value.companies.length > 0) {
    formData.value.companies[0].isDefault = true
  }
}

function onDefaultChange(index, isDefault) {
  if (isDefault) {
    // Se marcou como padrão, desmarcar todas as outras
    formData.value.companies.forEach((company, i) => {
      company.isDefault = i === index
    })
  } else {
    // Se desmarcou, verificar se há outra padrão
    const hasDefault = formData.value.companies.some((c, i) => i !== index && c.isDefault)
    if (!hasDefault && formData.value.companies.length > 0) {
      // Se não há nenhuma padrão, manter esta como padrão
      formData.value.companies[index].isDefault = true
      window.showSnackbar?.('Pelo menos uma empresa deve ser padrão', 'warning')
    }
  }
}

function onCompanyChange(index, newCompanyId) {
  // Limpar setor ao trocar empresa
  if (formData.value.companies[index]) {
    formData.value.companies[index].sectorId = null
  }
}

// Métodos principais
function openDialog(item = null) {
  editingItem.value = item
  
  if (item) {
    // Editando usuário existente
    formData.value = {
      name: item.name || '',
      email: item.email || '',
      password: '',
      companies: item.companies && item.companies.length > 0 
        ? item.companies.map(company => ({
            companyId: company.companyId,
            role: company.role,
            sectorId: company.sectorId || null,
            isDefault: company.isDefault || false
          }))
        : [{
            companyId: authStore.user?.companyId || (availableCompanies.value[0]?.id || ''),
            role: item.role || 'USER',
            sectorId: item.sector?.id || null,
            isDefault: true
          }],
      isActive: item.isActive ?? true
    }
  } else {
    // Novo usuário
    formData.value = {
      name: '',
      email: '',
      password: '',
      companies: [],
      isActive: true
    }
    
    // Adicionar primeira empresa automaticamente se disponível
    if (availableCompanies.value.length > 0) {
      formData.value.companies.push({
        companyId: availableCompanies.value[0].id,
        role: 'USER',
        sectorId: null,
        isDefault: true
      })
    }
  }
  
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  editingItem.value = null
  form.value?.reset()
  
  // Reset form data
  formData.value = {
    name: '',
    email: '',
    password: '',
    companies: [],
    isActive: true
  }
}

async function save() {
  // Validações detalhadas
  if (!valid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  if (formData.value.companies.length === 0) {
    window.showSnackbar?.('Pelo menos uma empresa deve ser adicionada', 'error')
    return
  }

  // Validar se todas as empresas têm dados obrigatórios
  const invalidCompanies = formData.value.companies.filter(c => !c.companyId || !c.role)
  if (invalidCompanies.length > 0) {
    window.showSnackbar?.('Todas as empresas devem ter empresa e perfil selecionados', 'error')
    return
  }

  // Verificar se há pelo menos uma empresa padrão
  const hasDefault = formData.value.companies.some(c => c.isDefault)
  if (!hasDefault) {
    formData.value.companies[0].isDefault = true
  }

  saving.value = true
  try {
    const data = {
      name: formData.value.name,
      email: formData.value.email,
      companies: formData.value.companies.map(company => ({
        companyId: company.companyId,
        role: company.role,
        sectorId: company.sectorId || null,
        isDefault: company.isDefault || false
      })),
      isActive: formData.value.isActive
    }

    // Adicionar senha apenas para novos usuários
    if (!editingItem.value?.id) {
      data.password = formData.value.password
    }

    console.log('Saving user data:', data)

    if (editingItem.value?.id) {
      // Atualizar usuário e empresas separadamente
      await userStore.updateUser(editingItem.value.id, {
        name: data.name,
        isActive: data.isActive
      })
      
      // Atualizar empresas
      await userStore.updateUserCompanies(editingItem.value.id, data.companies)
      
      window.showSnackbar('Usuário atualizado com sucesso!', 'success')
    } else {
      await userStore.createUser(data)
      window.showSnackbar('Usuário criado com sucesso!', 'success')
    }

    closeDialog()
    
    // Recarregar lista de usuários
    await userStore.fetchUsers()
  } catch (error) {
    console.error('Error saving user:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao salvar usuário'
    window.showSnackbar(errorMessage, 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(user) {
  deletingItem.value = user
  deleteDialog.value = true
}

async function deleteUser() {
  if (!deletingItem.value) return

  deleting.value = true
  try {
    await userStore.deleteUser(deletingItem.value.id)
    window.showSnackbar('Usuário removido com sucesso!', 'success')
    deleteDialog.value = false
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao remover usuário', 'error')
  } finally {
    deleting.value = false
    deletingItem.value = null
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      userStore.fetchUsers(),
      companyStore.fetchCompanies(),
      sectorStore.fetchSectors()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    window.showSnackbar?.('Erro ao carregar dados iniciais', 'error')
  }
})
</script>

<style scoped>
.border-warning {
  border-color: rgb(var(--v-theme-warning)) !important;
  border-width: 2px !important;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

/* Melhor espaçamento para switches */
.v-input--switch {
  flex: none;
}

/* Scroll suave */
.v-card-text {
  scroll-behavior: smooth;
}

/* Destaque para empresa padrão */
.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

/* Animações suaves */
.v-card {
  transition: all 0.3s ease;
}

.v-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Chips mais bonitos */
.v-chip {
  transition: all 0.2s ease-in-out;
}

.v-chip:hover {
  transform: translateY(-1px);
}

/* Melhor espaçamento para ícones */
.v-icon {
  margin-right: 8px !important;
}

/* Destaque visual para campos obrigatórios */
.v-field--error {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>