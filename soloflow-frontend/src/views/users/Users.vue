<template>
  <div class="users-page">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon" aria-hidden="true">
          <v-icon size="28" color="white">mdi-account-group</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Usuários</h1>
          <p class="page-subtitle">Gerencie contas e permissões de acesso</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="openCreateUser"
        prepend-icon="mdi-plus"
        class="action-btn"
      >
        Novo Usuário
      </v-btn>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="loading && users.length === 0" class="loading-state" aria-label="Carregando usuários">
      <v-skeleton-loader type="table-heading, table-row@5" class="skeleton-table" />
    </div>

    <!-- Tabela de Usuários -->
    <v-card v-if="!loading || users.length > 0" flat class="table-card">
      <v-data-table
        :headers="headers"
        :items="users"
        :loading="loading"
        :search="search"
        class="elevation-0"
        items-per-page-text="Itens por página"
        :items-per-page-options="[
          { value: 5, title: '5' },
          { value: 10, title: '10' },
          { value: 25, title: '25' },
          { value: -1, title: 'Todos' }
        ]"
        no-data-text="Nenhum usuário encontrado"
        loading-text="Carregando..."
        page-text="{0}-{1} de {2}"
      >
        <template v-slot:top>
          <v-card-title class="d-flex align-center pe-2">
            <v-icon icon="mdi-account-group" class="mr-2" aria-hidden="true"></v-icon>
            Lista de Usuários
            <v-chip size="small" color="primary" variant="tonal" class="ml-2">
              {{ users.length }}
            </v-chip>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              density="compact"
              placeholder="Buscar usuário..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              hide-details
              single-line
              class="search-field"
              aria-label="Buscar usuários"
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
            @click="openEditUser(item.id)"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Editar</v-tooltip>
          </v-btn>
          <v-btn
            v-if="authStore.hasPermission('users', 'manage')"
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

    <!-- Dialog de Confirmação de Exclusão -->
    <v-dialog
      v-model="deleteDialog"
      max-width="400"
      aria-labelledby="delete-user-dialog-title"
    >
      <v-card role="alertdialog" aria-modal="true" aria-describedby="delete-user-dialog-description">
        <v-card-title id="delete-user-dialog-title" class="d-flex align-center">
          <v-icon color="error" class="mr-2" aria-hidden="true">mdi-alert-circle</v-icon>
          Confirmar Exclusão
        </v-card-title>

        <v-card-text id="delete-user-dialog-description">
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
      aria-labelledby="reset-password-dialog-title"
    >
      <v-card role="dialog" aria-modal="true">
        <v-card-title id="reset-password-dialog-title" class="d-flex align-center">
          <v-icon class="mr-2" color="warning" aria-hidden="true">mdi-lock-reset</v-icon>
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
              hint="Mínimo 8 caracteres"
              persistent-hint
              aria-required="true"
              autocomplete="new-password"
            />

            <v-text-field
              v-model="resetPasswordData.confirmPassword"
              label="Confirmar Nova Senha *"
              type="password"
              :rules="[
                v => !!v || 'A confirmação de senha é obrigatória',
                v => v === resetPasswordData.newPassword || 'As senhas não coincidem'
              ]"
              required
              prepend-icon="mdi-lock-check"
              variant="outlined"
              class="mt-4"
              aria-required="true"
              autocomplete="new-password"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

// Estado
const deleteDialog = ref(false)
const resetPasswordDialog = ref(false)
const resetPasswordValid = ref(false)
const deleting = ref(false)
const resettingPassword = ref(false)
const search = ref('')
const deletingItem = ref(null)
const resettingUser = ref(null)

const resetPasswordForm = ref(null)
const resetPasswordData = ref({
  newPassword: '',
  confirmPassword: ''
})

// Computed
const loading = computed(() => userStore.loading)
const users = computed(() => userStore.users)

// Headers da tabela
const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'E-mail', key: 'email' },
  { title: 'Setor Atual', key: 'sector' },
  { title: 'Empresas', key: 'companies', sortable: false },
  { title: 'Status', key: 'isActive', align: 'center' },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false }
]

// Regras de validação para reset de senha
const passwordRules = [
  v => !!v || 'A senha é obrigatória',
  v => (v && v.length >= 8) || 'A senha deve ter no mínimo 8 caracteres'
]

// Métodos auxiliares
function canDelete(user) {
  return authStore.hasPermission('users', 'manage') && user.id !== authStore.user?.id
}

// Navegação para páginas de criação/edição
function openCreateUser() {
  router.push('/usuarios/novo')
}

function openEditUser(userId) {
  router.push(`/usuarios/${userId}/editar`)
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
    const errorMessage = error.response?.data?.message || error.message || 'Erro ao resetar senha'
    window.showSnackbar(errorMessage, 'error')
  } finally {
    resettingPassword.value = false
  }
}

onMounted(async () => {
  try {
    await userStore.fetchUsers()
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar dados iniciais', 'error')
  }
})
</script>

<style scoped>
/* ========================================
   🎨 DESIGN PROFISSIONAL - USUÁRIOS
   ======================================== */

.users-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* Modern Page Header with Gradient */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
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

.action-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
  color: var(--color-primary-600) !important;
}

/* Loading State */
.loading-state {
  padding: 0;
}

.skeleton-table {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
}

/* Search Field */
.search-field {
  max-width: 280px;
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-btn {
    width: 100%;
  }

  .search-field {
    max-width: 100%;
    width: 100%;
  }
}
</style>
