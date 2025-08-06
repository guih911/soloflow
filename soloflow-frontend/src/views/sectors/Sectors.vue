<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Setores</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Gerencie os setores e departamentos da empresa
        </p>
      </div>
      <v-btn
        color="primary"
        @click="openDialog()"
        prepend-icon="mdi-plus"
      >
        Novo Setor
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar setor"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="filterActive"
              :items="activeOptions"
              label="Status"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Setores -->
    <v-row>
      <v-col
        v-for="sector in filteredSectors"
        :key="sector.id"
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
                :color="sector.isActive ? 'primary' : 'grey'"
                class="mr-2"
              >
                mdi-office-building
              </v-icon>
              {{ sector.name }}
              <v-spacer />
              <v-chip
                v-if="!sector.isActive"
                size="small"
                color="error"
                variant="tonal"
              >
                Inativo
              </v-chip>
            </v-card-title>

            <v-card-subtitle v-if="sector.description">
              {{ sector.description }}
            </v-card-subtitle>

            <v-card-text class="flex-grow-1">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-account-group</v-icon>
                <span class="text-body-2">
                  {{ sector._count?.users || 0 }} usuários
                </span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="20" class="mr-2">mdi-calendar</v-icon>
                <span class="text-body-2">
                  Criado em {{ formatDate(sector.createdAt) }}
                </span>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-btn
                variant="text"
                size="small"
                @click="viewSector(sector)"
              >
                <v-icon start>mdi-eye</v-icon>
                Detalhes
              </v-btn>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                @click="openDialog(sector)"
              >
                <v-icon start>mdi-pencil</v-icon>
                Editar
              </v-btn>
              <v-btn
                v-if="canDelete(sector)"
                variant="text"
                size="small"
                color="error"
                @click="confirmDelete(sector)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && filteredSectors.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-office-building-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum setor encontrado
      </p>
      <p class="text-body-2 text-grey mb-4">
        {{ search ? 'Tente ajustar os filtros' : 'Comece criando um novo setor' }}
      </p>
      <v-btn
        v-if="!search"
        color="primary"
        @click="openDialog()"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Setor
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
          {{ editingItem?.id ? 'Editar Setor' : 'Novo Setor' }}
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
              label="Nome do Setor"
              :rules="nameRules"
              required
              class="mb-4"
            />

            <v-textarea
              v-model="formData.description"
              label="Descrição"
              rows="3"
              counter="200"
              :rules="descriptionRules"
            />

            <v-switch
              v-if="editingItem?.id"
              v-model="formData.isActive"
              label="Setor Ativo"
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
          Tem certeza que deseja remover o setor
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSectorStore } from '@/stores/sectors'
import dayjs from 'dayjs'

const router = useRouter()
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

// Computed
const loading = computed(() => sectorStore.loading)
const sectors = computed(() => sectorStore.sectors)

const filteredSectors = computed(() => {
  let result = sectors.value

  // Filtro de busca
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    )
  }

  // Filtro de status
  if (filterActive.value !== null) {
    result = result.filter(s => s.isActive === filterActive.value)
  }

  return result
})

// Regras de validação
const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => v.length >= 2 || 'Nome deve ter no mínimo 2 caracteres',
  v => v.length <= 50 || 'Nome deve ter no máximo 50 caracteres'
]

const descriptionRules = [
  v => !v || v.length <= 200 || 'Descrição deve ter no máximo 200 caracteres'
]

// Opções
const activeOptions = [
  { title: 'Todos', value: null },
  { title: 'Ativos', value: true },
  { title: 'Inativos', value: false }
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

function viewSector(sector) {
  router.push(`/sectors/${sector.id}`)
}

onMounted(() => {
  sectorStore.fetchSectors()
})
</script>