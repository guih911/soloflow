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
              :text="`${company.companyName}`"
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
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Editar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="authStore.isAdmin"
            icon="mdi-lock-reset"
            size="small"
            variant="text"
            color="warning"
            @click="openResetPasswordDialog(item)"
          >
            <v-icon>mdi-lock-reset</v-icon>
            <v-tooltip activator="parent" location="top">Resetar Senha</v-tooltip>
          </v-btn>
          <v-btn
            v-if="canDelete(item)"
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Excluir</v-tooltip>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog de Criação/Edição - Design Profissional -->
    <v-dialog
      v-model="dialog"
      max-width="1000"
      persistent
      scrollable
      transition="dialog-bottom-transition"
    >
      <v-card class="user-dialog-card" elevation="24">
        <!-- Header Moderno com Gradiente -->
        <v-card-title class="user-dialog-header pa-6">
          <div class="d-flex align-center">
            <v-avatar
              :color="editingItem?.id ? 'primary' : 'success'"
              size="56"
              class="mr-4"
            >
              <v-icon size="32" color="white">
                {{ editingItem?.id ? 'mdi-account-edit' : 'mdi-account-plus' }}
              </v-icon>
            </v-avatar>
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">
                {{ editingItem?.id ? 'Editar Usuário' : 'Novo Usuário' }}
              </h2>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ editingItem?.id
                  ? 'Atualize as informações do usuário e suas permissões'
                  : 'Preencha os dados para criar um novo usuário no sistema'
                }}
              </p>
            </div>
          </div>
        </v-card-title>

        <v-divider />

        <v-form
          ref="form"
          v-model="valid"
          @submit.prevent="save"
        >
          <v-card-text style="max-height: 70vh; overflow-y: auto;" class="px-6 py-6">
            <!-- Informações Básicas - Design Profissional -->
            <div class="form-section mb-8">
              <div class="d-flex align-center mb-5">
                <v-avatar color="primary" variant="tonal" size="40" class="mr-3 section-avatar">
                  <v-icon size="24">mdi-account-circle</v-icon>
                </v-avatar>
                <div>
                  <h3 class="text-h6 font-weight-bold mb-1">Informações Básicas</h3>
                  <p class="text-caption text-medium-emphasis mb-0">Dados pessoais e de identificação do usuário</p>
                </div>
              </div>

              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.name"
                    label="Nome completo"
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
                  >
                    <template v-slot:append-inner>
                      <v-icon v-if="formData.name && formData.name.length >= 3" color="success">
                        mdi-check-circle
                      </v-icon>
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.email"
                    label="E-mail corporativo"
                    type="email"
                    :rules="emailRules"
                    :disabled="!!editingItem?.id"
                    required
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-email-outline"
                    placeholder="usuario@empresa.com.br"
                    hint="E-mail para login e notificações"
                    persistent-hint
                  >
                    <template v-slot:append-inner>
                      <v-icon v-if="formData.email && emailRules.every(r => r(formData.email) === true)" color="success">
                        mdi-check-circle
                      </v-icon>
                      <v-tooltip v-if="!!editingItem?.id" activator="parent" location="top">
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
                    label="CPF"
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
                      <v-icon v-if="formData.cpf && formData.cpf.length === 11" color="success">
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

                <v-col cols="12" md="6" v-if="!editingItem?.id">
                  <v-text-field
                    v-model="formData.password"
                    label="Senha inicial"
                    :type="showPassword ? 'text' : 'password'"
                    :rules="passwordRules"
                    required
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-lock-outline"
                    placeholder="Mínimo 6 caracteres"
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
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="6" v-if="editingItem?.id">
                  <v-card variant="outlined" class="pa-4">
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
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Empresas e Permissões - Design Profissional -->
            <div class="form-section">
              <div class="d-flex align-center justify-space-between mb-5">
                <div class="d-flex align-center">
                  <v-avatar color="success" variant="tonal" size="40" class="mr-3 section-avatar">
                    <v-icon size="24">mdi-office-building</v-icon>
                  </v-avatar>
                  <div>
                    <h3 class="text-h6 font-weight-bold mb-1">Empresas e Permissões</h3>
                    <p class="text-caption text-medium-emphasis mb-0">Configure o acesso do usuário às empresas do sistema</p>
                  </div>
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

              <!-- Empty State - Design Moderno -->
              <div v-if="formData.companies.length === 0" class="empty-state-card">
                <v-card variant="outlined" class="pa-8 text-center" color="primary">
                  <v-avatar color="primary" size="80" class="mb-4 empty-state-avatar">
                    <v-icon size="48" color="white">mdi-office-building-plus-outline</v-icon>
                  </v-avatar>
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
                </v-card>
              </div>
              
              <!-- Lista de empresas - Cards Modernos -->
              <div v-if="formData.companies.length > 0" class="companies-list">
                <v-card
                  v-for="(company, index) in formData.companies"
                  :key="`company-${index}`"
                  class="company-card mb-4"
                  :class="{ 'company-card-default': company.isDefault }"
                  elevation="2"
                >
                  <!-- Header do Card com Gradiente -->
                  <div class="company-card-header">
                    <div class="d-flex align-center flex-grow-1">
                      <v-avatar
                        :color="company.isDefault ? 'info' : 'primary'"
                        size="48"
                        class="mr-3 company-avatar"
                      >
                        <v-icon color="white" size="28">
                          {{ company.isDefault ? 'mdi-check-decagram' : 'mdi-office-building' }}
                        </v-icon>
                      </v-avatar>
                      <div class="flex-grow-1">
                        <div class="d-flex align-center">
                          <h4 class="text-subtitle-1 font-weight-bold">
                            {{ getCompanyName(company.companyId) || 'Selecione uma empresa' }}
                          </h4>
                          <v-chip
                            v-if="company.isDefault"
                            size="small"
                            color="info"
                            variant="flat"
                            class="ml-2"
                            prepend-icon="mdi-check-decagram"
                          >
                            Empresa Padrão
                          </v-chip>
                        </div>
                        <p class="text-caption text-medium-emphasis mb-0">
                          Empresa #{{ index + 1 }} • {{ company.companyId ? 'Configurada' : 'Pendente' }}
                        </p>
                      </div>
                    </div>

                    <v-btn
                      v-if="formData.companies.length > 1"
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      @click="removeCompany(index)"
                    >
                      <v-icon>mdi-delete-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Remover Empresa</v-tooltip>
                    </v-btn>
                  </div>

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
                          v-model="company.profileId"
                          :items="getProfilesForCompany(company.companyId)"
                          item-title="name"
                          item-value="id"
                          label="Perfil de Acesso *"
                          :rules="[v => !!v || 'Perfil de acesso é obrigatório']"
                          :disabled="!company.companyId || !getProfilesForCompany(company.companyId).length"
                          prepend-icon="mdi-badge-account"
                          variant="outlined"
                          density="comfortable"
                          :hint="!company.companyId ? 'Selecione uma empresa primeiro' : (!getProfilesForCompany(company.companyId).length ? 'Cadastre um perfil antes de continuar' : 'O perfil controla TODAS as permissões do usuário')"
                          persistent-hint
                        >
                          <template v-slot:prepend>
                            <v-tooltip location="top" max-width="300">
                              <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" color="primary">mdi-shield-account</v-icon>
                              </template>
                              <div class="text-caption">
                                <strong>Perfil de Acesso:</strong><br/>
                                • Define TODAS as permissões do usuário<br/>
                                • Controla telas, funcionalidades e processos<br/>
                                • Crie perfis personalizados na tela de Perfis
                              </div>
                            </v-tooltip>
                          </template>
                        </v-select>
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
                      v-if="company.companyId && company.profileId"
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mt-3"
                    >
                      <div class="text-caption">
                        <div>
                          <strong>{{ getCompanyName(company.companyId) }}</strong>
                          <span v-if="company.sectorId">
                            • {{ getSectorName(company.sectorId) }}
                          </span>
                          <span v-if="company.isDefault" class="text-warning">
                            • Empresa padrão
                          </span>
                        </div>
                        <div v-if="company.profileId" class="mt-1">
                          <span class="font-weight-medium">Perfil de acesso:</span>
                          {{ getProfileName(company.profileId) }}
                        </div>
                        <ul
                          v-if="company.profileId"
                          class="mt-2 mb-0 ps-4 text-caption"
                        >
                          <li
                            v-for="summary in getProfileCapabilitySummary(company.profileId)"
                            :key="summary"
                          >
                            {{ summary }}
                          </li>
                        </ul>
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

    <!-- Dialog de Reset de Senha -->
    <v-dialog
      v-model="resetPasswordDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-lock-reset</v-icon>
          Resetar Senha
        </v-card-title>

        <v-divider />

        <v-form ref="resetPasswordForm" v-model="resetPasswordValid" @submit.prevent="resetPassword">
          <v-card-text>
            <p class="mb-4">
              Você está prestes a resetar a senha do usuário
              <strong>{{ resettingUser?.name }}</strong>.
            </p>

            <v-text-field
              v-model="resetPasswordData.newPassword"
              label="Nova Senha *"
              type="password"
              :rules="passwordRules"
              required
              prepend-icon="mdi-lock"
              variant="outlined"
              hint="Mínimo 6 caracteres"
              persistent-hint
            />

            <v-text-field
              v-model="resetPasswordData.confirmPassword"
              label="Confirmar Nova Senha *"
              type="password"
              :rules="[
                v => !!v || 'Confirmação de senha é obrigatória',
                v => v === resetPasswordData.newPassword || 'As senhas não coincidem'
              ]"
              required
              prepend-icon="mdi-lock-check"
              variant="outlined"
              class="mt-4"
            />

           
          </v-card-text>

          <v-divider />

          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeResetPasswordDialog"
              :disabled="resettingPassword"
            >
              Cancelar
            </v-btn>
            <v-btn
              type="submit"
              color="warning"
              variant="elevated"
              :loading="resettingPassword"
              :disabled="!resetPasswordValid"
            >
              <v-icon start>mdi-lock-reset</v-icon>
              Resetar Senha
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import { useCompanyStore } from '@/stores/company'
import { useSectorStore } from '@/stores/sectors'
import { useProfileStore } from '@/stores/profiles'

const authStore = useAuthStore()
const userStore = useUserStore()
const companyStore = useCompanyStore()
const sectorStore = useSectorStore()
const profileStore = useProfileStore()

// Estado
const dialog = ref(false)
const deleteDialog = ref(false)
const resetPasswordDialog = ref(false)
const valid = ref(false)
const resetPasswordValid = ref(false)
const saving = ref(false)
const deleting = ref(false)
const resettingPassword = ref(false)
const search = ref('')
const editingItem = ref(null)
const deletingItem = ref(null)
const resettingUser = ref(null)
const showPassword = ref(false) // ✅ NOVO: Controle de visibilidade da senha

const form = ref(null)
const resetPasswordForm = ref(null)
const formData = ref({
  name: '',
  email: '',
  password: '',
  cpf: '',
  companies: [],
  isActive: true
})
const resetPasswordData = ref({
  newPassword: '',
  confirmPassword: ''
})

// Computed
const loading = computed(() => userStore.loading)
const users = computed(() => userStore.users)
const profiles = computed(() => profileStore.profiles || [])
const profileMap = computed(() => {
  const map = new Map()
  ;(profiles.value || []).forEach((profile) => {
    if (profile?.id) {
      map.set(profile.id, profile)
    }
  })
  return map
})
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
         formData.value.companies.every(c => c.companyId && c.profileId) &&
         formData.value.companies.some(c => c.isDefault)
})

// Headers da tabela
const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'E-mail', key: 'email' },
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

const cpfRules = [
  v => !!v || 'CPF é obrigatório (necessário para assinatura digital)',
  v => /^\d+$/.test(v) || 'CPF deve conter apenas números',
  v => (v && v.length === 11) || 'CPF deve ter 11 dígitos',
  v => {
    if (!v) return true
    // Validação básica de CPF (evitar sequências como 11111111111)
    if (/^(\d)\1{10}$/.test(v)) return 'CPF inválido'
    return true
  }
]

// Métodos auxiliares
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

function getProfilesForCompany(companyId) {
  if (!companyId) return []
  return (profiles.value || []).filter(profile => !profile.companyId || profile.companyId === companyId)
}

function getProfileName(profileId) {
  if (!profileId) return ''
  const profile = profileMap.value.get(profileId)
  return profile?.name || ''
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

function getProfileCapabilitySummary(profileId) {
  const profile = profileMap.value.get(profileId)
  if (!profile) return []

  const permissions = Array.isArray(profile.processTypePermissions)
    ? profile.processTypePermissions
    : []

  if (!permissions.length) {
    return ['Sem regras específicas para tipos de processo']
  }

  return permissions.map((permission) => {
    const label =
      permission.processTypeId === '*'
        ? 'Todos os tipos'
        : permission.processType?.name || permission.processTypeId

    const capabilities = []
    if (permission.canView) capabilities.push('Ver')
    if (permission.canCreate) capabilities.push('Criar')
    if (permission.canExecute) capabilities.push('Executar')

    return `${label}: ${capabilities.join(', ') || 'Sem ações'}`
  })
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
    formData.value.companies[index].profileId = null
  }
  applyDefaultProfileForCompany(index, { overwrite: true })
}

watch(
  profiles,
  () => {
    formData.value.companies.forEach((_, index) => applyDefaultProfileForCompany(index))
  },
  { deep: true },
)

// Métodos principais
function openDialog(item = null) {
  editingItem.value = item
  
  if (item) {
    // Editando usuário existente
    formData.value = {
      name: item.name || '',
      email: item.email || '',
      password: '',
      cpf: item.cpf || '',
      companies: item.companies && item.companies.length > 0
        ? item.companies.map(company => ({
            companyId: company.companyId,
            sectorId: company.sectorId || null,
            profileId: company.profileId || null,
            isDefault: company.isDefault || false
          }))
        : [{
            companyId: authStore.user?.companyId || (availableCompanies.value[0]?.id || ''),
            sectorId: item.sector?.id || null,
            profileId: null,
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
      cpf: '',
      companies: [],
      isActive: true
    }
    
    // Adicionar primeira empresa automaticamente se disponível
    if (availableCompanies.value.length > 0) {
      formData.value.companies.push({
        companyId: availableCompanies.value[0].id,
        sectorId: null,
        profileId: null,
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
    cpf: '',
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
  const invalidCompanies = formData.value.companies.filter(c => !c.companyId || !c.profileId)
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
    // Manter CPF formatado (backend espera formato XXX.XXX.XXX-XX)
    const cpf = formData.value.cpf || null

    const data = {
      name: formData.value.name,
      email: formData.value.email,
      cpf: cpf, // CPF formatado
      companies: formData.value.companies.map(company => ({
        companyId: company.companyId,
        sectorId: company.sectorId || null,
        profileId: company.profileId,
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
        cpf: data.cpf,
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

function openResetPasswordDialog(user) {
  resettingUser.value = user
  resetPasswordData.value = {
    newPassword: '',
    confirmPassword: ''
  }
  resetPasswordDialog.value = true
}

function closeResetPasswordDialog() {
  resetPasswordDialog.value = false
  resettingUser.value = null
  resetPasswordForm.value?.reset()
  resetPasswordData.value = {
    newPassword: '',
    confirmPassword: ''
  }
}

async function resetPassword() {
  if (!resetPasswordValid.value || !resettingUser.value) return

  resettingPassword.value = true
  try {
    await userStore.resetUserPassword(resettingUser.value.id, resetPasswordData.value.newPassword)
    window.showSnackbar(`Senha de ${resettingUser.value.name} resetada com sucesso!`, 'success')
    closeResetPasswordDialog()
  } catch (error) {
    console.error('Error resetting password:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao resetar senha'
    window.showSnackbar(errorMessage, 'error')
  } finally {
    resettingPassword.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      userStore.fetchUsers(),
      companyStore.fetchCompanies(),
      sectorStore.fetchSectors(),
      profileStore.fetchProfiles()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    window.showSnackbar?.('Erro ao carregar dados iniciais', 'error')
  }
})
</script>

<style scoped>
/* ========================================
   🎨 DESIGN PROFISSIONAL - USUÁRIOS
   ======================================== */

/* Header do Dialog */
.user-dialog-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%);
  color: white !important;
}

.user-dialog-header .v-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Seções do Formulário */
.form-section {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.form-section:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  transition: border-color 0.3s ease;
}

/* ========================================
   CARDS DE EMPRESA - DESIGN PREMIUM
   ======================================== */

/* ========================================
   CENTRALIZAÇÃO DE ÍCONES NOS AVATARES
   ======================================== */

/* Avatares de Seção */
.section-avatar,
.company-avatar,
.empty-state-avatar {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.section-avatar .v-icon,
.company-avatar .v-icon,
.empty-state-avatar .v-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Lista de Empresas */
.companies-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Card de Empresa */
.company-card {
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.company-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

/* Card Padrão com Destaque - Azul Escuro */
.company-card-default {
  border-color: rgb(var(--v-theme-info)) !important;
  background: linear-gradient(135deg,
    rgba(var(--v-theme-info), 0.08) 0%,
    rgba(var(--v-theme-info), 0.03) 100%
  );
  box-shadow: 0 4px 16px rgba(var(--v-theme-info), 0.15) !important;
}

.company-card-default .company-card-header {
  background: linear-gradient(135deg,
    rgba(var(--v-theme-info), 0.18) 0%,
    rgba(var(--v-theme-info), 0.1) 100%
  );
  border-bottom: 2px solid rgba(var(--v-theme-info), 0.4);
}

/* Header do Card */
.company-card-header {
  padding: 16px 20px;
  background: linear-gradient(135deg,
    rgba(var(--v-theme-primary), 0.08) 0%,
    rgba(var(--v-theme-primary), 0.03) 100%
  );
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Empty State */
.empty-state-card {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Botão Adicionar Empresa */
.add-company-btn {
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.25) !important;
  transition: all 0.3s ease;
}

.add-company-btn:hover {
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.35) !important;
  transform: translateY(-1px);
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
