<template>
  <div class="sectors-page">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-sitemap</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Setores</h1>
          <p class="page-subtitle">Organize a estrutura departamental da empresa</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="openDialog()"
        prepend-icon="mdi-plus"
        class="action-btn"
      >
        Novo Setor
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <v-text-field
          v-model="search"
          placeholder="Buscar setores..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
        <v-select
          v-model="filterActive"
          :items="activeOptions"
          placeholder="Status"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="filter-input"
        />
      </div>
    </div>

    <!-- Loading State - Skeleton -->
    <div v-if="loading && sectors.length === 0" class="loading-state" aria-label="Carregando setores">
      <v-skeleton-loader type="table-heading, table-row@5" class="skeleton-table" />
    </div>

    <!-- Sectors Table -->
    <div v-if="!loading || sectors.length > 0" class="table-card">
      <v-data-table
        :headers="headers"
        :items="filteredSectors"
        :loading="loading"
        item-key="id"
        :items-per-page="10"
        density="comfortable"
        :no-data-text="search ? 'Nenhum setor encontrado com os filtros.' : 'Nenhum setor cadastrado.'"
        class="modern-table"
      >
        <!-- Name -->
        <template #item.name="{ item }">
          <div class="sector-name">
            <v-icon color="primary" size="20" class="mr-2">mdi-office-building</v-icon>
            <div>
              <span class="name-text">{{ item.name }}</span>
              <p v-if="item.description" class="description-text">{{ item.description }}</p>
            </div>
          </div>
        </template>

        <!-- Status -->
        <template #item.isActive="{ value }">
          <v-chip
            size="small"
            :color="value ? 'success' : 'error'"
            variant="flat"
          >
            <v-icon start size="14">{{ value ? 'mdi-check-circle' : 'mdi-cancel' }}</v-icon>
            {{ value ? 'Ativo' : 'Inativo' }}
          </v-chip>
        </template>

        <!-- Users Count -->
        <template #item.usersCount="{ value }">
          <div class="users-count">
            <v-icon size="16" class="mr-1">mdi-account-group</v-icon>
            <span>{{ value }} usuários</span>
          </div>
        </template>

        <!-- Created At -->
        <template #item.createdAt="{ value }">
          <span class="date-cell">{{ formatDate(value) }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="actions-cell">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              @click="openDialog(item)"
            >
              <v-icon start size="16">mdi-pencil</v-icon>
              Editar
            </v-btn>
            <v-btn
              v-if="canDelete(item)"
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              @click="confirmDelete(item)"
            />
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="table-loading">
            <v-progress-circular indeterminate color="primary" size="40" />
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && sectors.length === 0"
      class="empty-state"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-office-building-outline
      </v-icon>
      <p class="empty-title">Nenhum setor cadastrado ainda</p>
      <p class="empty-subtitle">
        Crie um novo setor para organizar os usuários da empresa
      </p>
      <v-btn color="primary" @click="openDialog()" size="large">
        <v-icon start>mdi-plus</v-icon>
        Criar o Primeiro Setor
      </v-btn>
    </div>

    <!-- Dialog de Criação/Edição -->
    <v-dialog
      v-model="dialog"
      max-width="500"
      persistent
      aria-labelledby="sector-dialog-title"
    >
      <v-card class="dialog-card" role="dialog" aria-modal="true">
        <v-card-title id="sector-dialog-title" class="dialog-title">
          {{ editingItem?.id ? 'Editar Setor' : 'Novo Setor' }}
        </v-card-title>

        <v-divider />

        <v-form
          ref="form"
          v-model="valid"
          @submit.prevent="save"
        >
          <v-card-text class="pa-6">
            <v-text-field
              v-model="formData.name"
              label="Nome do Setor"
              :rules="nameRules"
              variant="outlined"
              required
              class="mb-4"
              aria-required="true"
            />

            <v-textarea
              v-model="formData.description"
              label="Descrição"
              rows="3"
              counter="200"
              :rules="descriptionRules"
              variant="outlined"
              aria-label="Descrição do setor"
            />

            <v-switch
              v-if="editingItem?.id"
              v-model="formData.isActive"
              label="Setor Ativo"
              color="primary"
              class="mt-2"
            />
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-4">
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
      aria-labelledby="delete-dialog-title"
    >
      <v-card class="dialog-card" role="alertdialog" aria-modal="true" aria-describedby="delete-dialog-description">
        <v-card-title id="delete-dialog-title" class="dialog-title">Confirmar Exclusão</v-card-title>

        <v-card-text id="delete-dialog-description" class="pa-6">
          Tem certeza que deseja remover o setor
          <strong>{{ deletingItem?.name }}</strong>?
          Esta ação não pode ser desfeita.
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            @click="deleteSector"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSectorStore } from '@/stores/sectors'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const sectorStore = useSectorStore()

// Estado
const dialog = ref(false)
const deleteDialog = ref(false)
const valid = ref(false)
const saving = ref(false)
const deleting = ref(false)
const search = ref('')
const filterActive = ref(null)
const editingItem = ref(null)
const deletingItem = ref(null)

const form = ref(null)
const formData = ref({
  name: '',
  description: '',
  isActive: true
})

// Options
const activeOptions = [
  { title: 'Ativos', value: true },
  { title: 'Inativos', value: false }
]

const headers = [
  { title: 'Setor', key: 'name', width: '350px', align: 'start' },
  { title: 'Status', key: 'isActive', width: '120px', align: 'center' },
  { title: 'Usuários', key: 'usersCount', width: '140px', align: 'center' },
  { title: 'Criado em', key: 'createdAt', width: '130px', align: 'center' },
  { title: '', key: 'actions', width: '140px', align: 'center', sortable: false },
]

// Computed
const loading = computed(() => sectorStore.loading)
const sectors = computed(() => sectorStore.sectors)

const sectorsWithInfo = computed(() => {
  return sectors.value.map(sector => ({
    ...sector,
    usersCount: sector._count?.users || 0
  }))
})

const filteredSectors = computed(() => {
  let result = sectorsWithInfo.value

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    )
  }

  if (filterActive.value !== null) {
    result = result.filter(s => s.isActive === filterActive.value)
  }

  return result
})

// Regras de validação
const nameRules = [
  v => !!v || 'O nome é obrigatório',
  v => v.length >= 2 || 'O nome deve ter no mínimo 2 caracteres',
  v => v.length <= 50 || 'O nome deve ter no máximo 50 caracteres'
]

const descriptionRules = [
  v => !v || v.length <= 200 || 'A descrição deve ter no máximo 200 caracteres'
]

// Métodos
function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function canDelete(sector) {
  return authStore.isAdmin && (!sector._count?.users || sector._count.users === 0)
}

function openDialog(item = null) {
  editingItem.value = item
  if (item) {
    formData.value = {
      name: item.name,
      description: item.description || '',
      isActive: item.isActive
    }
  } else {
    formData.value = {
      name: '',
      description: '',
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
      await sectorStore.updateSector(editingItem.value.id, data)
      window.showSnackbar('Setor atualizado com sucesso!', 'success')
    } else {
      await sectorStore.createSector(data)
      window.showSnackbar('Setor criado com sucesso!', 'success')
    }

    closeDialog()
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao salvar setor', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(sector) {
  deletingItem.value = sector
  deleteDialog.value = true
}

async function deleteSector() {
  if (!deletingItem.value) return

  deleting.value = true
  try {
    await sectorStore.deleteSector(deletingItem.value.id)
    window.showSnackbar('Setor removido com sucesso!', 'success')
    deleteDialog.value = false
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao remover setor', 'error')
  } finally {
    deleting.value = false
    deletingItem.value = null
  }
}

onMounted(() => {
  sectorStore.fetchSectors()
})
</script>

<style scoped>
.sectors-page {
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

/* Filters */
.filters-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 16px;
}

@media (max-width: 600px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}

.filter-input :deep(.v-field) {
  border-radius: 10px;
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

.modern-table {
  border: none !important;
}

.modern-table :deep(th) {
  background: var(--color-neutral-50) !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-neutral-500) !important;
  border-bottom: 1px solid var(--color-surface-border) !important;
}

.modern-table :deep(td) {
  padding: 16px !important;
  border-bottom: 1px solid var(--color-surface-border) !important;
}

.modern-table :deep(tr:hover td) {
  background: var(--color-neutral-50) !important;
}

/* Sector Name */
.sector-name {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.name-text {
  font-weight: 500;
  color: var(--color-neutral-800);
}

.description-text {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  margin: 2px 0 0 0;
}

/* Users Count */
.users-count {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

/* Date Cell */
.date-cell {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

/* Actions */
.actions-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Loading State - Skeleton */
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

.table-loading {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 16px 0 8px;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin-bottom: 24px;
}

/* Dialog */
.dialog-card {
  border-radius: 16px !important;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 600;
  padding: 20px 24px;
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

  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
