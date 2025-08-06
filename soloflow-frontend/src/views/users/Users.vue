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
      max-width="600"
      persistent
    >
      <v-card>
        <v-card-title>
          {{ editingItem?.id ? 'Editar Usuário' : 'Novo Usuário' }}
        </v-card-title>

        <v-divider />

        <v-form
          ref="form"
          v-model="valid"
          @submit.prevent="save"
        >
          <v-card-text>
            <v-text-field
              v-model="formData.name"
              label="Nome"
              :rules="nameRules"
              required
              class="mb-4"
            />

            <v-text-field
              v-model="formData.email"
              label="E-mail"
              type="email"
              :rules="emailRules"
              :disabled="!!editingItem?.id"
              required
              class="mb-4"
            />

            <v-text-field
              v-if="!editingItem?.id"
              v-model="formData.password"
              label="Senha"
              type="password"
              :rules="passwordRules"
              required
              class="mb-4"
            />

            <v-select
              v-model="formData.role"
              :items="roles"
              label="Perfil"
              :rules="[v => !!v || 'Perfil é obrigatório']"
              required
              class="mb-4"
            />

            <v-select
              v-model="formData.sectorId"
              :items="sectors"
              item-title="name"
              item-value="id"
              label="Setor"
              clearable
              class="mb-4"
            />

            <v-switch
              v-if="editingItem?.id"
              v-model="formData.isActive"
              label="Usuário Ativo"
              color="primary"
            />
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeDialog"
            >
              Cancelar
            </v-btn>
            <v-btn
              type="submit"
              color="primary"
              variant="elevated"
              :loading="saving"
              :disabled="!valid"
            >
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
import { useSectorStore } from '@/stores/sectors'

const authStore = useAuthStore()
const userStore = useUserStore()
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
  role: 'USER',
  sectorId: null,
  isActive: true
})

// Computed
const loading = computed(() => userStore.loading)
const users = computed(() => userStore.users)
const sectors = computed(() => sectorStore.sectors)

// Headers da tabela
const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'E-mail', key: 'email' },
  { title: 'Perfil', key: 'role' },
  { title: 'Setor', key: 'sector' },
  { title: 'Status', key: 'isActive', align: 'center' },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false }
]

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

const emailRules = [
  v => !!v || 'E-mail é obrigatório',
  v => /.+@.+\..+/.test(v) || 'E-mail deve ser válido'
]

const passwordRules = [
  v => !!v || 'Senha é obrigatória',
  v => v.length >= 6 || 'Senha deve ter no mínimo 6 caracteres'
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
  return authStore.isAdmin && user.id !== authStore.user.id
}

// Métodos
function openDialog(item = null) {
  editingItem.value = item
  if (item) {
    formData.value = {
      name: item.name,
      email: item.email,
      password: '',
      role: item.role,
      sectorId: item.sector?.id || null,
      isActive: item.isActive
    }
  } else {
    formData.value = {
      name: '',
      email: '',
      password: '',
      role: 'USER',
      sectorId: null,
      isActive: true
    }
  }
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  editingItem.value = null
  form.value?.reset()
}

async function save() {
  if (!valid.value) return

  saving.value = true
  try {
    const data = {
      ...formData.value,
      companyId: authStore.user.companyId
    }

    if (editingItem.value?.id) {
      // Não enviar senha se não foi alterada
      if (!data.password) delete data.password
      delete data.email // Email não pode ser alterado
      
      await userStore.updateUser(editingItem.value.id, data)
      window.showSnackbar('Usuário atualizado com sucesso!', 'success')
    } else {
      await userStore.createUser(data)
      window.showSnackbar('Usuário criado com sucesso!', 'success')
    }

    closeDialog()
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao salvar usuário', 'error')
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
  await Promise.all([
    userStore.fetchUsers(),
    sectorStore.fetchSectors()
  ])
})
</script>