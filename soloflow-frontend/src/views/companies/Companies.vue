<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Empresas</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Gerencie as empresas cadastradas no sistema
        </p>
      </div>
      <v-btn
        color="primary"
        @click="openDialog()"
        prepend-icon="mdi-plus"
      >
        Nova Empresa
      </v-btn>
    </div>

    <!-- Lista de Empresas -->
    <v-row>
      <v-col
        v-for="company in paginatedCompanies"
        :key="company.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-hover v-slot="{ isHovering, props }">
          <v-card
            v-bind="props"
            :elevation="isHovering ? 8 : 2"
            class="h-100 d-flex flex-column"
          >
            <v-card-title class="d-flex align-center">
              <v-icon
                :color="company.isActive ? 'primary' : 'grey'"
                class="mr-2"
              >
                mdi-domain
              </v-icon>
              {{ company.name }}
              <v-spacer />
              <v-chip
                v-if="!company.isActive"
                size="small"
                color="error"
                variant="tonal"
              >
                Inativa
              </v-chip>
            </v-card-title>

            <v-card-text class="flex-grow-1">
              <div class="mb-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="20" class="mr-2">mdi-card-account-details</v-icon>
                  <span class="text-body-2">
                    CNPJ: {{ formatCNPJ(company.cnpj) }}
                  </span>
                </div>
                <div v-if="company.email" class="d-flex align-center mb-2">
                  <v-icon size="20" class="mr-2">mdi-email</v-icon>
                  <span class="text-body-2">{{ company.email }}</span>
                </div>
                <div v-if="company.phone" class="d-flex align-center mb-2">
                  <v-icon size="20" class="mr-2">mdi-phone</v-icon>
                  <span class="text-body-2">{{ formatPhone(company.phone) }}</span>
                </div>
              </div>

              <v-divider class="my-3" />

              <div>
                <div class="d-flex align-center mb-2">
                  <v-icon size="20" class="mr-2">mdi-account-group</v-icon>
                  <span class="text-body-2">
                    {{ company._count?.userCompanies || 0 }} usuários
                  </span>
                </div>
                <div class="d-flex align-center">
                  <v-icon size="20" class="mr-2">mdi-calendar</v-icon>
                  <span class="text-body-2">
                    Criada em {{ formatDate(company.createdAt) }}
                  </span>
                </div>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-btn
                variant="text"
                size="small"
                @click="viewCompany(company)"
              >
                <v-icon start>mdi-eye</v-icon>
                Detalhes
              </v-btn>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                @click="openDialog(company)"
              >
                <v-icon start>mdi-pencil</v-icon>
                Editar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- ✨ Paginação -->
    <PaginationControls
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="companies.length"
      item-label="empresas"
    />

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && companies.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-domain
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhuma empresa cadastrada
      </p>
      <v-btn
        color="primary"
        @click="openDialog()"
        class="mt-4"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeira Empresa
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>

    <!-- Dialog de Criação/Edição -->
    <v-dialog
      v-model="dialog"
      max-width="600"
      persistent
    >
      <v-card>
        <v-card-title>
          {{ editingItem?.id ? 'Editar Empresa' : 'Nova Empresa' }}
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
              label="Nome da Empresa"
              :rules="nameRules"
              required
              class="mb-4"
            />

            <v-text-field
              v-model="formData.cnpj"
              v-mask="'##.###.###/####-##'"
              label="CNPJ"
              :rules="cnpjRules"
              :disabled="!!editingItem?.id"
              required
              class="mb-4"
            />

            <v-text-field
              v-model="formData.email"
              label="E-mail"
              type="email"
              :rules="emailRules"
              class="mb-4"
            />

            <v-text-field
              v-model="formData.phone"
              v-mask="['(##) ####-####', '(##) #####-####']"
              label="Telefone"
              :rules="phoneRules"
              class="mb-4"
            />

            <v-switch
              v-if="editingItem?.id"
              v-model="formData.isActive"
              label="Empresa Ativa"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import { formatCNPJ, formatPhone } from '@/utils/format'
import dayjs from 'dayjs'
import PaginationControls from '@/components/PaginationControls.vue'

const router = useRouter()
const companyStore = useCompanyStore()

// Estado
const dialog = ref(false)
const valid = ref(false)
const saving = ref(false)
const editingItem = ref(null)

// ✨ Estado de paginação
const currentPage = ref(1)
const itemsPerPage = ref(12)

const form = ref(null)
const formData = ref({
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  isActive: true
})

// Computed
const loading = computed(() => companyStore.loading)
const companies = computed(() => companyStore.companies)

// ✨ Computed de paginação
const paginatedCompanies = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return companies.value.slice(start, end)
})

// ✨ Watcher para resetar página quando itens por página mudam
watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 3 || 'Nome deve ter no mínimo 3 caracteres',
  v => v.length <= 100 || 'Nome deve ter no máximo 100 caracteres'
]

const cnpjRules = [
  v => !!v || 'CNPJ é obrigatório',
  v => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido'
]

const emailRules = [
  v => !v || /.+@.+\..+/.test(v) || 'E-mail deve ser válido'
]

const phoneRules = [
  v => !v || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v) || 'Telefone inválido'
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

function viewCompany(company) {
  router.push(`/companies/${company.id}`)
}

onMounted(() => {
  companyStore.fetchCompanies()
})
</script>

<style scoped>
/* ✨ Paginação */
.pagination-section {
  margin-top: 32px;
}

.pagination-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.pagination-info {
  font-weight: 500;
}

.pagination-controls {
  flex-wrap: wrap;
}

.items-per-page-select :deep(.v-field) {
  border-radius: 12px;
}

.pagination-component :deep(.v-pagination__item) {
  border-radius: 12px;
  font-weight: 600;
  min-width: 40px;
  height: 40px;
}

.pagination-component :deep(.v-pagination__item--is-active) {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

/* ✨ Responsividade */
@media (max-width: 768px) {
  .pagination-controls {
    width: 100%;
    justify-content: center;
  }

  .pagination-info {
    width: 100%;
    text-align: center;
  }
}

/* ✨ Tema Escuro */
@media (prefers-color-scheme: dark) {
  .pagination-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>