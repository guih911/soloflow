<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Assinaturas Pendentes</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Documentos aguardando sua assinatura digital
        </p>
      </div>
      <v-btn
        variant="text"
        @click="refreshData"
        :loading="loading"
      >
        <v-icon start>mdi-refresh</v-icon>
        Atualizar
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar documento"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="urgencyFilter"
              :items="urgencyOptions"
              label="Urgência"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="typeFilter"
              :items="typeOptions"
              label="Tipo de Processo"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Assinaturas Pendentes -->
    <v-row v-if="!loading && paginatedTasks.length > 0">
      <v-col
        v-for="task in paginatedTasks"
        :key="task.id"
        cols="12"
      >
        <v-card
          class="signature-card"
          :class="{ 
            'border-error': isUrgent(task),
            'border-warning': isHighPriority(task) 
          }"
        >
          <v-card-text>
            <v-row align="center">
              <!-- Ícone e Indicadores -->
              <v-col cols="auto">
                <div class="d-flex flex-column align-center">
                  <v-avatar
                    color="error"
                    size="56"
                    class="mb-2"
                  >
                    <v-icon size="28">mdi-draw-pen</v-icon>
                  </v-avatar>
                  
                  <v-chip
                    size="x-small"
                    :color="getPriorityColor(task)"
                    variant="tonal"
                  >
                    {{ getPriorityText(task) }}
                  </v-chip>
                </div>
              </v-col>

              <!-- Informações do Documento -->
              <v-col>
                <div class="d-flex align-center mb-2">
                  <h3 class="text-h6 mr-2">
                    {{ task.processInstance.title || task.processInstance.code }}
                  </h3>
                  <v-chip
                    size="small"
                    color="info"
                    variant="tonal"
                  >
                    {{ task.processInstance.code }}
                  </v-chip>
                </div>

                <p class="text-body-2 text-grey mb-2">
                  <v-icon size="16">mdi-file-document-outline</v-icon>
                  {{ task.processInstance.processType.name }}
                  <span class="mx-2">•</span>
                  <v-icon size="16">mdi-debug-step-over</v-icon>
                  {{ task.step.name }}
                </p>

                <div class="text-caption text-grey">
                  <div class="mb-1">
                    <v-icon size="16">mdi-account</v-icon>
                    Solicitado por: {{ task.processInstance.createdBy.name }}
                    <span class="mx-2">•</span>
                    <v-icon size="16">mdi-clock-outline</v-icon>
                    {{ getTimeAgo(task.createdAt) }}
                  </div>
                  
                  <div v-if="task.processInstance.description">
                    <v-icon size="16">mdi-text</v-icon>
                    {{ task.processInstance.description }}
                  </div>
                </div>

                <!-- Documentos para Assinar -->
                <div v-if="getDocumentsToSign(task).length > 0" class="mt-3">
                  <v-chip
                    v-for="doc in getDocumentsToSign(task)"
                    :key="doc.id"
                    size="small"
                    color="primary"
                    variant="tonal"
                    class="mr-1 mb-1"
                  >
                    <v-icon start size="16">mdi-file-pdf-box</v-icon>
                    {{ doc.originalName }}
                  </v-chip>
                </div>
              </v-col>

              <!-- Ações -->
              <v-col cols="auto">
                <div class="d-flex flex-column gap-2">
                  <v-btn
                    color="primary"
                    @click="openSignatureDialog(task)"
                    :loading="signingTasks.includes(task.id)"
                  >
                    <v-icon start>mdi-draw-pen</v-icon>
                    Assinar
                  </v-btn>
                  
                  <v-btn
                    variant="outlined"
                    size="small"
                    @click="viewProcess(task)"
                  >
                    <v-icon start>mdi-eye</v-icon>
                    Ver Processo
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-card-text>

          <!-- Aviso sobre documentos -->
          <v-card-text v-if="task.step.description" class="pt-0">
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
            >
              {{ task.step.description }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-else-if="!loading && filteredTasks.length === 0"
      class="text-center py-12"
    >
      <v-icon
        size="64"
        color="grey-lighten-1"
      >
        mdi-check-circle-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhuma assinatura pendente
      </p>
      <p class="text-body-2 text-grey">
        {{ search || urgencyFilter || typeFilter
          ? 'Tente ajustar os filtros'
          : 'Todos os documentos estão assinados!' }}
      </p>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>

    <!-- Paginação -->
    <div v-if="!loading && filteredTasks.length > 0" class="pagination-section">
      <v-card class="pagination-card">
        <v-card-text>
          <v-row align="center" justify="space-between">
            <!-- Informação de registros -->
            <v-col cols="12" md="4">
              <div class="pagination-info text-body-2">
                Mostrando {{ startItem }} - {{ endItem }} de {{ totalItems }} assinaturas
              </div>
            </v-col>

            <!-- Controles de paginação -->
            <v-col cols="12" md="8">
              <div class="d-flex align-center justify-end pagination-controls">
                <!-- Itens por página -->
                <div class="d-flex align-center mr-4">
                  <span class="text-body-2 mr-2">Por pág.:</span>
                  <v-select
                    v-model="itemsPerPage"
                    :items="itemsPerPageOptions"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="items-per-page-select"
                    style="width: 80px;"
                  />
                </div>

                <!-- Componente de paginação -->
                <v-pagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="5"
                  class="pagination-component"
                  density="comfortable"
                />
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>

    <!-- Dialog de Assinatura Rápida -->
    <v-dialog
      v-model="signatureDialog"
      max-width="600"
      persistent
    >
      <v-card v-if="selectedTask">
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-draw-pen</v-icon>
          Assinar Documentos
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <div class="mb-4">
            <h3 class="text-subtitle-1 mb-2">Processo:</h3>
            <p class="text-body-2">
              {{ selectedTask.processInstance.title || selectedTask.processInstance.code }}
            </p>
          </div>

          <div class="mb-4">
            <h3 class="text-subtitle-1 mb-2">Documentos para assinar:</h3>
            <v-list density="compact">
              <v-list-item
                v-for="doc in getDocumentsToSign(selectedTask)"
                :key="doc.id"
              >
                <template v-slot:prepend>
                  <v-icon color="error">mdi-file-pdf-box</v-icon>
                </template>
                <v-list-item-title>{{ doc.originalName }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatFileSize(doc.size) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <v-alert
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <v-icon>mdi-shield-check</v-icon>
            Para continuar, confirme sua senha para validar a assinatura digital.
          </v-alert>

          <v-text-field
            v-model="password"
            label="Confirme sua senha"
            type="password"
            :rules="passwordRules"
            required
          />
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeSignatureDialog"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="signing"
            :disabled="!password"
            @click="proceedToFullSignature"
          >
            <v-icon start>mdi-arrow-right</v-icon>
            Continuar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const processStore = useProcessStore()

// Estado
const search = ref('')
const urgencyFilter = ref(null)
const typeFilter = ref(null)
const signatureDialog = ref(false)
const selectedTask = ref(null)
const password = ref('')
const signing = ref(false)
const signingTasks = ref([])

// Estado de paginação
const currentPage = ref(1)
const itemsPerPage = ref(12)
const itemsPerPageOptions = [6, 12, 24, 48]

// Computed
const loading = computed(() => processStore.loading)
const pendingTasks = computed(() => processStore.myTasks)

const filteredTasks = computed(() => {
  let tasks = pendingTasks.value.filter(task => 
    task.step.requiresSignature && task.status === 'IN_PROGRESS'
  )

  // Filtro de busca
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    tasks = tasks.filter(t => 
      t.processInstance.code.toLowerCase().includes(searchLower) ||
      t.processInstance.title?.toLowerCase().includes(searchLower) ||
      t.step.name.toLowerCase().includes(searchLower)
    )
  }

  // Filtro de urgência
  if (urgencyFilter.value) {
    tasks = tasks.filter(t => {
      const priority = getPriorityLevel(t)
      return priority === urgencyFilter.value
    })
  }

  // Filtro de tipo
  if (typeFilter.value) {
    tasks = tasks.filter(t => 
      t.processInstance.processType.id === typeFilter.value
    )
  }

  // Ordenar por prioridade (urgente primeiro)
  return tasks.sort((a, b) => {
    const aDays = dayjs().diff(dayjs(a.createdAt), 'day')
    const bDays = dayjs().diff(dayjs(b.createdAt), 'day')
    return bDays - aDays
  })
})

// Computed de paginação
const totalItems = computed(() => filteredTasks.value.length)

const totalPages = computed(() => {
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

const startItem = computed(() => {
  if (totalItems.value === 0) return 0
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * itemsPerPage.value
  return end > totalItems.value ? totalItems.value : end
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTasks.value.slice(start, end)
})

const typeOptions = computed(() => {
  const types = new Set()
  pendingTasks.value.forEach(task => {
    if (task.step.requiresSignature) {
      types.add(task.processInstance.processType)
    }
  })
  return Array.from(types).map(type => ({
    title: type.name,
    value: type.id
  }))
})

// Watchers para resetar página quando filtros mudarem
watch([search, urgencyFilter, typeFilter], () => {
  currentPage.value = 1
})

watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Opções
const urgencyOptions = [
  { title: 'Urgente (> 5 dias)', value: 'urgent' },
  { title: 'Alta (3-5 dias)', value: 'high' },
  { title: 'Normal (< 3 dias)', value: 'normal' }
]

const passwordRules = [
  v => !!v || 'Senha é obrigatória'
]

// Métodos auxiliares
function getTimeAgo(date) {
  return dayjs(date).fromNow()
}

function getPriorityLevel(task) {
  const daysOpen = dayjs().diff(dayjs(task.createdAt), 'day')
  if (daysOpen > 5) return 'urgent'
  if (daysOpen > 3) return 'high'
  return 'normal'
}

function getPriorityColor(task) {
  const level = getPriorityLevel(task)
  const colors = {
    urgent: 'error',
    high: 'warning',
    normal: 'info'
  }
  return colors[level]
}

function getPriorityText(task) {
  const level = getPriorityLevel(task)
  const texts = {
    urgent: 'Urgente',
    high: 'Alta',
    normal: 'Normal'
  }
  return texts[level]
}

function isUrgent(task) {
  return getPriorityLevel(task) === 'urgent'
}

function isHighPriority(task) {
  return getPriorityLevel(task) === 'high'
}

function getDocumentsToSign(task) {
  // Simular documentos para assinar
  return task.attachments?.filter(att => 
    att.mimeType === 'application/pdf' && !att.isSigned
  ) || []
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Métodos
async function refreshData() {
  await processStore.fetchMyTasks()
}

function openSignatureDialog(task) {
  selectedTask.value = task
  password.value = ''
  signatureDialog.value = true
}

function closeSignatureDialog() {
  signatureDialog.value = false
  selectedTask.value = null
  password.value = ''
}

async function proceedToFullSignature() {
  if (!selectedTask.value || !password.value) return

  // Ir para a página de execução da etapa onde pode assinar
  router.push(`/processes/${selectedTask.value.processInstance.id}/execute/${selectedTask.value.id}`)
  closeSignatureDialog()
}

function viewProcess(task) {
  router.push(`/processes/${task.processInstance.id}`)
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.signature-card {
  transition: all 0.3s ease;
}

.signature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.border-error {
  border-left: 4px solid #f44336 !important;
}

.border-warning {
  border-left: 4px solid #ff9800 !important;
}

.gap-2 {
  gap: 8px;
}

/* ✨ Paginação */
.pagination-section {
  margin-top: 32px;
}

.pagination-card {
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.pagination-info {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.6);
}

.pagination-controls {
  flex-wrap: wrap;
  gap: 16px;
}

.items-per-page-select :deep(.v-field) {
  border-radius: 4px;
}

.pagination-component :deep(.v-pagination__item) {
  border-radius: 4px;
  font-weight: 500;
  min-width: 36px;
  height: 36px;
}

.pagination-component :deep(.v-pagination__item--is-active) {
  background: #1976D2;
  color: #fff;
  box-shadow: none;
}
</style>