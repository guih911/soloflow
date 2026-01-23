<template>
  <div class="companies-page">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-domain</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Empresas</h1>
          <p class="page-subtitle">Gerencie as empresas e organizações do sistema</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        @click="openDialog()"
        prepend-icon="mdi-plus"
        class="action-btn"
      >
        Nova Empresa
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-grid">
        <v-text-field
          v-model="search"
          placeholder="Buscar empresas..."
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
    <div v-if="loading && companies.length === 0" class="loading-state" aria-label="Carregando empresas">
      <v-skeleton-loader type="table-heading, table-row@5" class="skeleton-table" />
    </div>

    <!-- Companies Table -->
    <div v-if="!loading || companies.length > 0" class="table-card">
      <v-data-table
        :headers="headers"
        :items="filteredCompanies"
        :loading="loading"
        item-key="id"
        :items-per-page="10"
        density="comfortable"
        :no-data-text="search ? 'Nenhuma empresa encontrada com os filtros.' : 'Nenhuma empresa cadastrada.'"
        class="modern-table"
      >
        <!-- Name -->
        <template #item.name="{ item }">
          <div class="company-name">
            <v-icon color="primary" size="20" class="mr-2">mdi-domain</v-icon>
            <span class="name-text">{{ item.name }}</span>
          </div>
        </template>

        <!-- CNPJ -->
        <template #item.cnpj="{ value }">
          <span class="cnpj-text">{{ formatCNPJ(value) }}</span>
        </template>

        <!-- Status -->
        <template #item.isActive="{ value }">
          <v-chip
            size="small"
            :color="value ? 'success' : 'error'"
            variant="flat"
          >
            <v-icon start size="14">{{ value ? 'mdi-check-circle' : 'mdi-cancel' }}</v-icon>
            {{ value ? 'Ativa' : 'Inativa' }}
          </v-chip>
        </template>

        <!-- Users Count -->
        <template #item.usersCount="{ value }">
          <div class="users-count">
            <v-icon size="16" class="mr-1">mdi-account-group</v-icon>
            <span>{{ value }} usuários</span>
          </div>
        </template>

        <!-- Contact -->
        <template #item.contact="{ item }">
          <div class="contact-info">
            <div v-if="item.email" class="contact-item">
              <v-icon size="14" class="mr-1">mdi-email</v-icon>
              <span>{{ item.email }}</span>
            </div>
            <div v-if="item.phone" class="contact-item">
              <v-icon size="14" class="mr-1">mdi-phone</v-icon>
              <span>{{ formatPhone(item.phone) }}</span>
            </div>
            <span v-if="!item.email && !item.phone" class="no-contact">-</span>
          </div>
        </template>

        <!-- Created At -->
        <template #item.createdAt="{ value }">
          <span class="date-cell">{{ formatDate(value) }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            @click="openDialog(item)"
          >
            <v-icon start size="16">mdi-pencil</v-icon>
            Editar
          </v-btn>
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
      v-if="!loading && companies.length === 0"
      class="empty-state"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-domain
      </v-icon>
      <p class="empty-title">Nenhuma empresa cadastrada ainda</p>
      <p class="empty-subtitle">
        Crie uma nova empresa para começar a gerenciar o sistema
      </p>
      <v-btn color="primary" @click="openDialog()" size="large">
        <v-icon start>mdi-plus</v-icon>
        Criar a Primeira Empresa
      </v-btn>
    </div>

    <!-- Dialog de Criação/Edição -->
    <v-dialog
      v-model="dialog"
      max-width="500"
      persistent
      aria-labelledby="company-dialog-title"
    >
      <v-card class="dialog-card" role="dialog" aria-modal="true">
        <v-card-title id="company-dialog-title" class="dialog-title">
          {{ editingItem?.id ? 'Editar Empresa' : 'Nova Empresa' }}
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
              label="Nome da Empresa"
              :rules="nameRules"
              variant="outlined"
              required
              class="mb-4"
              aria-required="true"
            />

            <v-text-field
              v-model="formData.cnpj"
              v-mask="'##.###.###/####-##'"
              label="CNPJ"
              :rules="cnpjRules"
              :disabled="!!editingItem?.id"
              variant="outlined"
              required
              class="mb-4"
              aria-required="true"
            />

            <v-text-field
              v-model="formData.email"
              label="E-mail"
              type="email"
              :rules="emailRules"
              variant="outlined"
              class="mb-4"
              autocomplete="email"
            />

            <v-text-field
              v-model="formData.phone"
              v-mask="['(##) ####-####', '(##) #####-####']"
              label="Telefone"
              :rules="phoneRules"
              variant="outlined"
              class="mb-4"
              autocomplete="tel"
            />

            <v-switch
              v-if="editingItem?.id"
              v-model="formData.isActive"
              label="Empresa Ativa"
              color="primary"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { formatCNPJ, formatPhone } from '@/utils/format'
import dayjs from 'dayjs'

const companyStore = useCompanyStore()

// Estado
const dialog = ref(false)
const valid = ref(false)
const saving = ref(false)
const search = ref('')
const filterActive = ref(null)
const editingItem = ref(null)

const form = ref(null)
const formData = ref({
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  isActive: true
})

// Options
const activeOptions = [
  { title: 'Ativas', value: true },
  { title: 'Inativas', value: false }
]

const headers = [
  { title: 'Empresa', key: 'name', width: '250px', align: 'start' },
  { title: 'CNPJ', key: 'cnpj', width: '180px', align: 'start' },
  { title: 'Status', key: 'isActive', width: '120px', align: 'center' },
  { title: 'Usuários', key: 'usersCount', width: '130px', align: 'center' },
  { title: 'Contato', key: 'contact', width: '200px', align: 'start', sortable: false },
  { title: 'Criada em', key: 'createdAt', width: '120px', align: 'center' },
  { title: '', key: 'actions', width: '100px', align: 'center', sortable: false },
]

// Computed
const loading = computed(() => companyStore.loading)
const companies = computed(() => companyStore.companies)

const companiesWithInfo = computed(() => {
  return companies.value.map(company => ({
    ...company,
    usersCount: company._count?.userCompanies || 0
  }))
})

const filteredCompanies = computed(() => {
  let result = companiesWithInfo.value

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.cnpj?.includes(search.value) ||
      c.email?.toLowerCase().includes(searchLower)
    )
  }

  if (filterActive.value !== null) {
    result = result.filter(c => c.isActive === filterActive.value)
  }

  return result
})

// Regras de validação
const nameRules = [
  v => !!v || 'O nome é obrigatório',
  v => v.length >= 3 || 'O nome deve ter no mínimo 3 caracteres',
  v => v.length <= 100 || 'O nome deve ter no máximo 100 caracteres'
]

const cnpjRules = [
  v => !!v || 'O CNPJ é obrigatório',
  v => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'O CNPJ informado é inválido'
]

const emailRules = [
  v => !v || /.+@.+\..+/.test(v) || 'O e-mail deve ser válido'
]

const phoneRules = [
  v => !v || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v) || 'O telefone informado é inválido'
]

// Métodos
function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY')
}

function openDialog(item = null) {
  editingItem.value = item
  if (item) {
    formData.value = {
      name: item.name,
      cnpj: item.cnpj,
      email: item.email || '',
      phone: item.phone || '',
      isActive: item.isActive
    }
  } else {
    formData.value = {
      name: '',
      cnpj: '',
      email: '',
      phone: '',
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
    if (editingItem.value?.id) {
      await companyStore.updateCompany(editingItem.value.id, formData.value)
      window.showSnackbar('Empresa atualizada com sucesso!', 'success')
    } else {
      await companyStore.createCompany(formData.value)
      window.showSnackbar('Empresa criada com sucesso!', 'success')
    }

    closeDialog()
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao salvar empresa', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  companyStore.fetchCompanies()
})
</script>

<style scoped>
.companies-page {
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

/* Company Name */
.company-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 500;
  color: var(--color-neutral-800);
}

/* CNPJ */
.cnpj-text {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  font-family: 'SF Mono', Monaco, monospace;
}

/* Users Count */
.users-count {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

/* Contact Info */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

.no-contact {
  color: var(--color-neutral-400);
}

/* Date Cell */
.date-cell {
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
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
