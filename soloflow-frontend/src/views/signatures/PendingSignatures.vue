<template>
  <div class="pending-signatures-page">
    <!-- Modern Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <v-icon size="28" color="white">mdi-draw-pen</v-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">Assinaturas Pendentes</h1>
          <p class="page-subtitle">Documentos aguardando sua assinatura digital</p>
        </div>
      </div>
      <v-btn
        variant="flat"
        color="white"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="refreshData"
        class="refresh-btn"
      >
        Atualizar
      </v-btn>
    </div>

    <!-- Modern Filters -->
    <div class="filters-card">
      <div class="filters-header">
        <v-icon size="20" class="mr-2">mdi-filter-variant</v-icon>
        <span class="filters-title">Filtros</span>
      </div>
      <div class="filters-content">
        <v-text-field
          v-model="search"
          placeholder="Buscar por código, título ou processo..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="filter-field"
        />
        <v-select
          v-model="urgencyFilter"
          :items="urgencyOptions"
          label="Urgência"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="filter-field filter-field--small"
        />
        <v-select
          v-model="typeFilter"
          :items="typeOptions"
          label="Tipo de Processo"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="filter-field filter-field--small"
        />
      </div>
    </div>

    <!-- Modern Signature Cards -->
    <div v-if="!loading && paginatedTasks.length > 0" class="signature-cards-list" role="list" aria-label="Lista de assinaturas pendentes">
      <div
        v-for="task in paginatedTasks"
        :key="task.id"
        class="signature-card"
        :class="{
          'signature-card--urgent': isUrgent(task),
          'signature-card--high': isHighPriority(task)
        }"
        role="listitem"
        :aria-label="`Processo ${task.processInstance.code} - ${getDocumentsToSign(task).length} documentos para assinar`"
        tabindex="0"
        @click="openSignatureDialog(task)"
        @keydown.enter="openSignatureDialog(task)"
      >
        <div class="signature-card-priority" :class="`priority-${getPriorityLevel(task)}`"></div>

        <div class="signature-card-content">
          <!-- Left: Icon -->
          <div class="signature-card-icon" :class="`icon-${getPriorityLevel(task)}`">
            <v-icon :icon="getPriorityIcon(task)" size="24" color="white" />
          </div>

          <!-- Center: Info -->
          <div class="signature-card-info">
            <div class="signature-card-header">
              <h3 class="signature-card-title">
                {{ task.processInstance.title || task.processInstance.code }}
              </h3>
              <div class="signature-card-badges">
                <span class="badge badge--code">{{ task.processInstance.code }}</span>
                <span class="badge badge--signature">
                  <v-icon size="14">mdi-draw-pen</v-icon>
                  Requer Assinatura
                </span>
              </div>
            </div>

            <div class="signature-card-meta">
              <span class="meta-item">
                <v-icon size="16">mdi-file-document-outline</v-icon>
                {{ task.processInstance.processType?.name || 'Tipo de Processo' }}
              </span>
              <span class="meta-divider">•</span>
              <span class="meta-item">
                <v-icon size="16">mdi-debug-step-over</v-icon>
                {{ task.step.name }}
              </span>
            </div>

            <div class="signature-card-submeta">
              <span class="submeta-item">
                <v-icon size="14">mdi-account</v-icon>
                {{ task.processInstance.createdBy.name }}
              </span>
              <span class="submeta-divider">•</span>
              <span class="submeta-item">
                <v-icon size="14">mdi-clock-outline</v-icon>
                {{ getTimeAgo(task.createdAt) }}
              </span>
            </div>

            <!-- Documents Preview -->
            <div v-if="getDocumentsToSign(task).length > 0" class="signature-card-docs">
              <span
                v-for="doc in getDocumentsToSign(task).slice(0, 3)"
                :key="doc.id"
                class="doc-chip"
              >
                <v-icon size="14">mdi-file-pdf-box</v-icon>
                {{ truncateFilename(doc.originalName, 20) }}
              </span>
              <span v-if="getDocumentsToSign(task).length > 3" class="doc-chip doc-chip--more">
                +{{ getDocumentsToSign(task).length - 3 }}
              </span>
            </div>

            <!-- Step Description Alert -->
            <div v-if="task.step.description" class="signature-card-alert">
              <v-icon size="16">mdi-information</v-icon>
              <span>{{ task.step.description }}</span>
            </div>
          </div>

          <!-- Right: Documents Count & Action -->
          <div class="signature-card-actions">
            <div class="docs-count" :class="`docs-count--${getPriorityLevel(task)}`">
              <v-icon size="24">mdi-file-pdf-box</v-icon>
              <span class="docs-number">{{ getDocumentsToSign(task).length }}</span>
              <span class="docs-label">documento(s)</span>
            </div>

            <v-btn
              color="primary"
              variant="flat"
              size="large"
              @click.stop="openSignatureDialog(task)"
              class="sign-btn"
            >
              <v-icon start>mdi-draw-pen</v-icon>
              Assinar
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Modern Empty State -->
    <div v-else-if="!loading && filteredTasks.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <v-icon size="56" color="white">mdi-check-circle-outline</v-icon>
      </div>
      <h3 class="empty-state-title">Nenhuma assinatura pendente</h3>
      <p class="empty-state-text">
        {{ search || urgencyFilter || typeFilter
          ? 'Tente ajustar os filtros de busca'
          : 'Todos os documentos estão assinados!' }}
      </p>
      <v-btn
        v-if="search || urgencyFilter || typeFilter"
        variant="outlined"
        color="primary"
        @click="search = ''; urgencyFilter = null; typeFilter = null"
        class="mt-4"
      >
        <v-icon start>mdi-filter-remove</v-icon>
        Limpar Filtros
      </v-btn>
    </div>

    <!-- Modern Loading State - Skeleton -->
    <div v-if="loading" class="loading-state" aria-label="Carregando assinaturas pendentes">
      <v-skeleton-loader type="card@3" class="skeleton-signatures" />
    </div>

    <!-- Paginação -->
    <PaginationControls
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="filteredTasks.length"
      item-label="assinaturas pendentes"
    />

    <!-- Dialog Fullscreen de Assinatura com Visualizador -->
    <v-dialog
      v-model="signatureDialog"
      fullscreen
      transition="dialog-bottom-transition"
      aria-labelledby="signature-dialog-title"
    >
      <v-card v-if="selectedTask" class="signature-fullscreen-dialog" role="dialog" aria-modal="true">
        <!-- Toolbar -->
        <v-toolbar color="primary" dark>
          <v-btn icon @click="closeSignatureDialog" aria-label="Fechar dialog de assinatura">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title id="signature-dialog-title">
            <div class="d-flex align-center">
              <v-icon class="mr-2" aria-hidden="true">mdi-draw-pen</v-icon>
              <div>
                <div class="text-subtitle-1">Assinatura de Documentos</div>
                <div class="text-caption">
                  {{ selectedTask.processInstance.code }} - {{ selectedTask.processInstance.processType?.name || 'Tipo de Processo' }}
                </div>
              </div>
            </div>
          </v-toolbar-title>
          <v-spacer />
        </v-toolbar>

        <!-- Main Content: Split View -->
        <v-container fluid class="pa-0 signature-content">
          <v-row no-gutters class="fill-height">
            <!-- Left Side: PDF Viewer -->
            <v-col cols="12" md="8" class="pdf-viewer-section">
              <div class="pdf-viewer-container">
                <!-- Document Navigation - só mostra se houver mais de 1 documento -->
                <div v-if="documentsToSign.length > 1" class="document-navigation">
                  <v-btn
                    icon
                    size="small"
                    :disabled="currentDocumentIndex === 0"
                    @click="previousDocument"
                  >
                    <v-icon>mdi-chevron-left</v-icon>
                  </v-btn>
                  <div class="d-flex flex-column align-center mx-3">
                    <span class="text-body-2 font-weight-medium">
                      {{ documentsToSign[currentDocumentIndex]?.originalName }}
                    </span>
                    <v-chip
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      class="mt-1"
                    >
                      {{ currentDocumentIndex + 1 }} de {{ documentsToSign.length }}
                    </v-chip>
                  </div>
                  <v-btn
                    icon
                    size="small"
                    :disabled="currentDocumentIndex === documentsToSign.length - 1"
                    @click="nextDocument"
                  >
                    <v-icon>mdi-chevron-right</v-icon>
                  </v-btn>
                </div>

                <!-- PDF Embed -->
                <div class="pdf-embed-wrapper">
                  <iframe
                    v-if="currentDocumentUrl"
                    :src="currentDocumentUrl"
                    class="pdf-iframe"
                    frameborder="0"
                  />
                  <div v-else class="pdf-loading">
                    <v-progress-circular indeterminate color="primary" size="64" />
                    <p class="mt-4 text-body-1">Carregando documento...</p>
                  </div>
                </div>
              </div>
            </v-col>

            <!-- Right Side: Signature Form -->
            <v-col cols="12" md="4" class="signature-form-section">
              <v-card flat class="signature-form-card">
                <v-card-text class="pa-6">
                  <!-- Process Info -->
                  <div class="mb-6">
                    <h3 class="text-h6 mb-2 font-weight-bold">Informações do Processo</h3>
                    <v-divider class="mb-3" />

                    <div class="info-item mb-3">
                      <label class="text-caption text-grey">Código:</label>
                      <p class="text-body-1 font-weight-medium">
                        {{ selectedTask.processInstance.code }}
                      </p>
                    </div>

                    <div class="info-item mb-3">
                      <label class="text-caption text-grey">Tipo:</label>
                      <p class="text-body-1">
                        {{ selectedTask.processInstance.processType?.name || 'Tipo de Processo' }}
                      </p>
                    </div>

                    <div class="info-item mb-3">
                      <label class="text-caption text-grey">Etapa:</label>
                      <p class="text-body-1">
                        {{ selectedTask.step.name }}
                      </p>
                    </div>

                    <div class="info-item">
                      <label class="text-caption text-grey">Solicitante:</label>
                      <div class="d-flex align-center mt-1">
                        <v-avatar size="32" color="primary" class="mr-2">
                          <span class="text-caption">
                            {{ getInitials(selectedTask.processInstance.createdBy.name) }}
                          </span>
                        </v-avatar>
                        <div>
                          <p class="text-body-2 font-weight-medium">
                            {{ selectedTask.processInstance.createdBy.name }}
                          </p>
                          <p class="text-caption text-grey">
                            {{ selectedTask.processInstance.createdBy.email }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Documents List -->
                  <div class="mb-6">
                    <h3 class="text-h6 mb-2 font-weight-bold">
                      Documentos ({{ documentsToSign.length }})
                    </h3>
                    <v-divider class="mb-3" />

                    <v-list density="compact" class="documents-list" role="listbox" aria-label="Documentos para assinar">
                      <v-list-item
                        v-for="(doc, index) in documentsToSign"
                        :key="doc.id"
                        :active="index === currentDocumentIndex"
                        @click="currentDocumentIndex = index"
                        class="document-list-item"
                        role="option"
                        :aria-selected="index === currentDocumentIndex"
                      >
                        <template v-slot:prepend>
                          <v-icon
                            :color="index === currentDocumentIndex ? 'primary' : 'grey'"
                            size="20"
                          >
                            mdi-file-pdf-box
                          </v-icon>
                        </template>
                        <v-list-item-title class="text-body-2">
                          {{ doc.originalName }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption">
                          {{ formatFileSize(doc.size) }}
                        </v-list-item-subtitle>
                        <template v-slot:append>
                          <v-icon
                            v-if="signedDocuments.includes(doc.id)"
                            color="success"
                            size="20"
                          >
                            mdi-check-circle
                          </v-icon>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>

                  <!-- Status de Assinaturas (Sequencial/Paralelo) -->
                  <div v-if="signatureStatus" class="mb-6">
                    <h3 class="text-h6 mb-2 font-weight-bold d-flex align-center">
                      <v-icon start color="primary">mdi-signature-freehand</v-icon>
                      Assinaturas
                      <v-chip
                        size="x-small"
                        :color="signatureStatus.signatureType === 'SEQUENTIAL' ? 'warning' : 'info'"
                        class="ml-2"
                        variant="tonal"
                      >
                        {{ signatureStatus.signatureType === 'SEQUENTIAL' ? 'Sequencial' : 'Paralelo' }}
                      </v-chip>
                    </h3>
                    <v-divider class="mb-3" />

                    <!-- Card de Sucesso - Documento Assinado -->
                    <div v-if="signedDocuments.includes(documentsToSign[currentDocumentIndex]?.id)" class="signature-completed mb-4">
                      <v-alert
                        type="success"
                        variant="tonal"
                        border="start"
                        density="compact"
                      >
                        <div class="d-flex align-center">
                          <v-icon size="24" class="mr-3">mdi-check-circle</v-icon>
                          <div>
                            <div class="text-body-2 font-weight-bold">Documento assinado!</div>
                            <div class="text-caption">Sua assinatura foi aplicada com sucesso</div>
                          </div>
                        </div>
                      </v-alert>
                    </div>

                    <div class="signature-progress mb-3">
                      <div class="d-flex justify-space-between text-caption mb-1">
                        <span>Progresso</span>
                        <span>{{ signatureStatus.completedSignatures }}/{{ signatureStatus.totalSignatures }}</span>
                      </div>
                      <v-progress-linear
                        :model-value="(signatureStatus.completedSignatures / signatureStatus.totalSignatures) * 100"
                        color="success"
                        height="8"
                        rounded
                      />
                    </div>

                    <v-list density="compact" class="signature-status-list">
                      <v-list-item
                        v-for="detail in signatureStatus.signatureDetails"
                        :key="detail.order"
                        :class="getSignatureStatusClass(detail)"
                        class="signature-status-item mb-2"
                      >
                        <template v-slot:prepend>
                          <v-avatar
                            :color="getSignatureStatusColor(detail)"
                            size="32"
                            variant="tonal"
                          >
                            <v-icon size="18">{{ getSignatureStatusIcon(detail) }}</v-icon>
                          </v-avatar>
                        </template>

                        <v-list-item-title class="text-body-2 font-weight-medium">
                          <span v-if="detail.isCurrentUser" class="text-primary">(Você)</span>
                          {{ detail.responsible.name }}
                        </v-list-item-title>

                        <v-list-item-subtitle class="text-caption">
                          {{ detail.statusMessage }}
                        </v-list-item-subtitle>

                        <template v-slot:append>
                          <v-chip
                            size="x-small"
                            :color="getSignatureStatusColor(detail)"
                            variant="tonal"
                          >
                            {{ getSignatureStatusText(detail) }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>

                  <!-- Carregando status -->
                  <div v-else-if="loadingStatus" class="mb-6 text-center py-4">
                    <v-progress-circular indeterminate color="primary" size="32" />
                    <p class="text-caption mt-2">Carregando informações de assinatura...</p>
                  </div>

                  <!-- Action Buttons com formulário de assinatura -->
                  <div class="signature-actions">
                    <!-- Alerta quando não pode assinar (sequencial) -->
                    <v-alert
                      v-if="signatureStatus && !canSignCurrentDocument && !signedDocuments.includes(documentsToSign[currentDocumentIndex]?.id)"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mb-3"
                    >
                      <template v-slot:prepend>
                        <v-icon>mdi-clock-outline</v-icon>
                      </template>
                      <div class="text-body-2">
                        {{ getWaitingMessage() }}
                      </div>
                    </v-alert>

                    <!-- Campo de senha (só mostra quando pode assinar) -->
                    <template v-if="canSignCurrentDocument && !signedDocuments.includes(documentsToSign[currentDocumentIndex]?.id)">
                      <v-text-field
                        v-model="password"
                        label="Senha de confirmação *"
                        type="password"
                        :rules="passwordRules"
                        prepend-inner-icon="mdi-lock"
                        variant="outlined"
                        density="comfortable"
                        required
                        class="mb-3"
                        hide-details="auto"
                      />

                      <v-btn
                        block
                        size="large"
                        color="primary"
                        variant="elevated"
                        :loading="signing"
                        :disabled="!password"
                        @click="signCurrentDocument"
                        class="mb-3"
                      >
                        <v-icon start>mdi-pen</v-icon>
                        Assinar Documento
                      </v-btn>
                    </template>

                    <v-btn
                      block
                      size="large"
                      variant="outlined"
                      @click="closeSignatureDialog"
                      :disabled="signing"
                    >
                      {{ allDocumentsSigned ? 'Concluir' : 'Cancelar' }}
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useAuthStore } from '@/stores/auth'
import PaginationControls from '@/components/PaginationControls.vue'
import api from '@/services/api'
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
const authStore = useAuthStore()
const signingTasks = ref([])

// Novos estados para Fase 3
const currentDocumentIndex = ref(0)
const signedDocuments = ref([])
const currentDocumentUrl = ref(null)

// Estado para status detalhado das assinaturas
const signatureStatus = ref(null)
const loadingStatus = ref(false)

// Estado de paginação
const currentPage = ref(1)
const itemsPerPage = ref(12)
const itemsPerPageOptions = [6, 12, 24, 48]

// Computed
const loading = computed(() => processStore.loading)
const pendingTasks = computed(() => processStore.myTasks)

const filteredTasks = computed(() => {
  // Filtrar tarefas que:
  // 1. Tenham o flag hasValidSignatureRequirements = true (indica que o backend validou requisitos específicos)
  // 2. Tenham anexos PDF não assinados
  // IMPORTANTE: O flag hasValidSignatureRequirements garante que a task tem requisitos de assinatura
  // para os anexos ESPECÍFICOS desta task (não de outros processos do mesmo tipo)
  let tasks = pendingTasks.value.filter(task => {
    // Verificar se tem requisitos de assinatura válidos (flag do backend)
    if (!task.hasValidSignatureRequirements) {
      return false
    }

    const hasPdfAttachments = task.attachments && task.attachments.some(att =>
      att.mimeType === 'application/pdf' && !att.isSigned
    )
    return hasPdfAttachments
  })

  // Filtro de busca
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    tasks = tasks.filter(t =>
      t.processInstance.code.toLowerCase().includes(searchLower) ||
      t.processInstance.title?.toLowerCase().includes(searchLower) ||
      t.step.name.toLowerCase().includes(searchLower) ||
      t.processInstance.processType.name.toLowerCase().includes(searchLower)
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

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTasks.value.slice(start, end)
})

const typeOptions = computed(() => {
  const types = new Set()
  pendingTasks.value.forEach(task => {
    types.add(task.processInstance.processType)
  })
  return Array.from(types).map(type => ({
    title: type.name,
    value: type.id
  }))
})

// Computed para documentos da tarefa selecionada
const documentsToSign = computed(() => {
  if (!selectedTask.value) return []
  return getDocumentsToSign(selectedTask.value)
})

// Computed para verificar se todos documentos foram assinados
const allDocumentsSigned = computed(() => {
  if (documentsToSign.value.length === 0) return false
  return documentsToSign.value.every(doc => signedDocuments.value.includes(doc.id))
})

// Watchers para resetar página quando filtros mudarem
watch([search, urgencyFilter, typeFilter], () => {
  currentPage.value = 1
})

watch(itemsPerPage, () => {
  currentPage.value = 1
})

// Watcher para carregar PDF quando documento muda
watch(currentDocumentIndex, async () => {
  await loadCurrentDocument()
})

// Watcher para resetar quando abre o dialog
watch(signatureDialog, (newVal) => {
  if (newVal && selectedTask.value) {
    currentDocumentIndex.value = 0
    signedDocuments.value = []
    loadCurrentDocument()
  } else {
    currentDocumentUrl.value = null
  }
})

// Opções
const urgencyOptions = [
  { title: 'Urgente (> 5 dias)', value: 'urgent' },
  { title: 'Alta (3-5 dias)', value: 'high' },
  { title: 'Normal (< 3 dias)', value: 'normal' }
]

const passwordRules = [
  v => !!v || 'A senha é obrigatória'
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
  // Filtrar documentos para assinar, excluindo arquivos de campos FILE
  return task.attachments?.filter(att => {
    // Só PDFs não assinados
    if (att.mimeType !== 'application/pdf' || att.isSigned) return false

    // Excluir attachments que são de campos FILE do formulário (criação ou etapa)
    if (att.signatureData) {
      try {
        const metadata = JSON.parse(att.signatureData)
        // isFormField = campo FILE do formulário de criação do processo
        // isStepFormField = campo FILE do formulário da etapa
        if (metadata.isFormField || metadata.isStepFormField) return false
      } catch (e) {
        // Se não conseguir parsear, continua normalmente
      }
    }

    return true
  }) || []
}

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function truncateFilename(filename, maxLength) {
  if (!filename || filename.length <= maxLength) return filename
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return filename.substring(0, maxLength - 3) + '...'
  }
  const ext = filename.substring(lastDotIndex)
  const name = filename.substring(0, lastDotIndex)
  const availableLength = maxLength - ext.length - 3
  return name.substring(0, availableLength) + '...' + ext
}

function getPriorityIcon(task) {
  const level = getPriorityLevel(task)
  const icons = {
    urgent: 'mdi-alert-circle',
    high: 'mdi-alert',
    normal: 'mdi-information'
  }
  return icons[level] || 'mdi-information'
}

// Métodos
async function refreshData() {
  await processStore.fetchMyTasks()
}

async function loadCurrentDocument() {
  if (!documentsToSign.value[currentDocumentIndex.value]) {
    currentDocumentUrl.value = null
    signatureStatus.value = null
    return
  }

  const doc = documentsToSign.value[currentDocumentIndex.value]
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  try {
    // Buscar o token de autenticação
    const token = localStorage.getItem('token')

    if (!token) {
      console.error('No authentication token found')
      currentDocumentUrl.value = null
      return
    }

    // Buscar status detalhado das assinaturas
    await loadSignatureStatus(doc.id)

    // Fazer requisição com autenticação para baixar o PDF
    const response = await fetch(`${API_URL}/attachments/${doc.id}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Converter response em blob
    const blob = await response.blob()

    // Revogar URL anterior se existir
    if (currentDocumentUrl.value && currentDocumentUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(currentDocumentUrl.value)
    }

    // Criar URL do blob
    currentDocumentUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error loading document:', error)
    currentDocumentUrl.value = null
    window.showSnackbar?.('Erro ao carregar documento', 'error')
  }
}

// Função para buscar status detalhado das assinaturas
async function loadSignatureStatus(attachmentId) {
  loadingStatus.value = true
  try {
    const response = await api.get(`/signatures/status/${attachmentId}`)
    signatureStatus.value = response.data
  } catch (error) {
    console.error('Error loading signature status:', error)
    signatureStatus.value = null
  } finally {
    loadingStatus.value = false
  }
}

// Computed para verificar se o usuário pode assinar o documento atual
const canSignCurrentDocument = computed(() => {
  // Se já assinou localmente (nesta sessão), não pode assinar de novo
  if (signedDocuments.value.includes(documentsToSign.value[currentDocumentIndex.value]?.id)) {
    return false
  }
  // Sem status carregado, permitir (fallback para comportamento anterior)
  if (!signatureStatus.value) return true
  return signatureStatus.value.canSign
})

// Funções auxiliares para exibição do status de assinaturas
function getSignatureStatusColor(detail) {
  switch (detail.status) {
    case 'completed':
      return 'success'
    case 'available':
      return detail.isCurrentUser ? 'primary' : 'info'
    case 'waiting':
      return 'warning'
    default:
      return 'grey'
  }
}

function getSignatureStatusIcon(detail) {
  switch (detail.status) {
    case 'completed':
      return 'mdi-check-circle'
    case 'available':
      return detail.isCurrentUser ? 'mdi-pen' : 'mdi-clock-outline'
    case 'waiting':
      return 'mdi-timer-sand'
    default:
      return 'mdi-help-circle'
  }
}

function getSignatureStatusText(detail) {
  switch (detail.status) {
    case 'completed':
      return 'Assinado'
    case 'available':
      return detail.isCurrentUser ? 'Sua vez' : 'Aguardando'
    case 'waiting':
      return 'Na fila'
    default:
      return 'Pendente'
  }
}

function getSignatureStatusClass(detail) {
  if (detail.isCurrentUser && detail.status === 'available') {
    return 'current-user-turn'
  }
  return ''
}

function getWaitingMessage() {
  if (!signatureStatus.value) return ''

  const userDetail = signatureStatus.value.signatureDetails?.find(d => d.isCurrentUser)
  if (userDetail && userDetail.status === 'waiting') {
    return userDetail.statusMessage
  }

  // Verificar se usuário não é assinante
  if (!userDetail) {
    return 'Você não está configurado como assinante deste documento.'
  }

  return 'Aguardando sua vez na fila de assinaturas.'
}

function getSignButtonText() {
  const currentDoc = documentsToSign.value[currentDocumentIndex.value]
  if (!currentDoc) return 'Assinar Documento'

  if (signedDocuments.value.includes(currentDoc.id)) {
    return 'Documento Assinado'
  }

  if (!canSignCurrentDocument.value) {
    return 'Aguardando vez'
  }

  return 'Assinar Documento'
}

function previousDocument() {
  if (currentDocumentIndex.value > 0) {
    currentDocumentIndex.value--
  }
}

function nextDocument() {
  if (currentDocumentIndex.value < documentsToSign.value.length - 1) {
    currentDocumentIndex.value++
  }
}

function openSignatureDialog(task) {
  console.log('📋 Opening signature dialog for task:', task)
  console.log('   Full task object keys:', Object.keys(task))
  console.log('   Task ID:', task.id)
  console.log('   StepExecutionId?:', task.stepExecutionId)
  console.log('   ExecutionId?:', task.executionId)
  console.log('   Step:', task.step)
  selectedTask.value = task
  password.value = ''
  signatureDialog.value = true
}

function closeSignatureDialog() {
  // Revogar URL do blob para liberar memória
  if (currentDocumentUrl.value && currentDocumentUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(currentDocumentUrl.value)
  }

  signatureDialog.value = false
  selectedTask.value = null
  password.value = ''
  currentDocumentUrl.value = null
}

async function signCurrentDocument() {
  console.log('🔐 signCurrentDocument chamada')
  console.log('  selectedTask:', selectedTask.value?.id)
  console.log('  password:', password.value ? '***preenchida***' : 'VAZIA')

  if (!selectedTask.value || !password.value) {
    console.warn('❌ Retornando cedo: selectedTask ou password vazios')
    if (!password.value) {
      window.showSnackbar?.('Digite sua senha para assinar o documento', 'warning')
    }
    return
  }

  const currentDoc = documentsToSign.value[currentDocumentIndex.value]
  if (!currentDoc) {
    window.showSnackbar?.('Nenhum documento selecionado', 'warning')
    return
  }

  // Verificar se já foi assinado
  if (signedDocuments.value.includes(currentDoc.id)) {
    window.showSnackbar?.('Este documento já foi assinado', 'info')
    return
  }

  signing.value = true

  try {
    console.log('Assinando documento:', currentDoc.originalName)

    // Importar o store de assinaturas
    const { useSignaturesStore } = await import('@/stores/signatures')
    const signaturesStore = useSignaturesStore()

    // Validar usando o signatureStatus que já foi carregado (considera userId E sectorId)
    // Se signatureStatus existe e canSign é false, não permitir assinatura
    if (signatureStatus.value && !signatureStatus.value.canSign) {
      const waitingMsg = getWaitingMessage()
      window.showSnackbar?.(waitingMsg || 'Você não pode assinar este documento no momento.', 'warning')
      return
    }

    // Fallback: Se não temos signatureStatus, verificar requisitos diretamente
    if (!signatureStatus.value) {
      try {
        const stepVersionId = selectedTask.value.step?.id || selectedTask.value.stepVersion?.id
        if (!stepVersionId) {
          console.warn('Step version ID não encontrado no task para checagem de requisitos de assinatura')
        } else {
          const requirements = await signaturesStore.fetchSignatureRequirements(stepVersionId)
          const userSectorId = authStore.activeSectorId

          // Verificar se o usuário está nos requisitos (por userId OU por sectorId)
          const myRequirements = Array.isArray(requirements)
            ? requirements.filter(r =>
                r.userId === authStore.user?.id ||
                (r.sectorId && r.sectorId === userSectorId)
              )
            : []

          if (myRequirements.length === 0) {
            window.showSnackbar?.('Você não está configurado como assinante para este documento.', 'warning')
            return
          }
        }
      } catch (e) {
        console.warn('Não foi possível validar requisitos de assinatura antes de prosseguir:', e)
        // Prossegue mesmo assim; backend ainda validará permissões
      }
    }

    // Assinar o documento atual
    const signatureData = {
      attachmentId: currentDoc.id,
      stepExecutionId: selectedTask.value.stepExecutionId || selectedTask.value.id,
      userPassword: password.value,
      reason: 'Assinatura via Assinaturas Pendentes',
      location: 'Sistema SoloFlow',
      contactInfo: null,
    }

    console.log('Signing document:', currentDoc.originalName, signatureData)

    await signaturesStore.signDocument(signatureData)

    // Adicionar documento à lista de assinados
    signedDocuments.value.push(currentDoc.id)

    // Limpar senha após assinatura bem-sucedida (segurança)
    password.value = ''

    window.showSnackbar?.(`Documento "${currentDoc.originalName}" assinado com sucesso!`, 'success')

    // Se todos documentos foram assinados, atualizar lista e fechar
    if (allDocumentsSigned.value) {
      await refreshData()
      window.showSnackbar?.('Todos os documentos foram assinados!', 'success')
      setTimeout(() => {
        closeSignatureDialog()
      }, 1500)
    } else {
      // Avançar para próximo documento não assinado
      const nextUnsingedIndex = documentsToSign.value.findIndex(
        (doc, idx) => idx > currentDocumentIndex.value && !signedDocuments.value.includes(doc.id)
      )
      if (nextUnsingedIndex !== -1) {
        currentDocumentIndex.value = nextUnsingedIndex
      }
    }
  } catch (error) {
    console.error('Erro ao assinar documento:', error)
    window.showSnackbar?.(
      error.response?.data?.message || error.message || 'Erro ao assinar documento. Verifique sua senha.',
      'error'
    )
  } finally {
    signing.value = false
  }
}

function viewProcess(task) {
  router.push(`/processos/${task.processInstance.id}`)
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.pending-signatures-page {
  max-width: 1600px;
  margin: 0 auto;
}

/* Modern Page Header */
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

.refresh-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
  color: var(--color-primary-600) !important;
}

/* Modern Filters */
.filters-card {
  background: white;
  border-radius: 14px;
  border: 1px solid var(--color-neutral-200);
  padding: 20px;
  margin-bottom: 24px;
}

.filters-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: var(--color-neutral-600);
}

.filters-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.filters-content {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-field {
  flex: 1;
  min-width: 200px;
}

.filter-field--small {
  flex: 0 0 180px;
}

.filter-field :deep(.v-field) {
  border-radius: 10px;
}

/* Modern Signature Cards */
.signature-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signature-card {
  display: flex;
  background: white;
  border-radius: 14px;
  border: 1px solid var(--color-neutral-200);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.signature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-200);
}

.signature-card--urgent {
  border-left: 4px solid var(--color-error-500);
}

.signature-card--high {
  border-left: 4px solid var(--color-warning-500);
}

.signature-card-priority {
  width: 4px;
  flex-shrink: 0;
}

.priority-urgent { background: var(--color-error-500); }
.priority-high { background: var(--color-warning-500); }
.priority-normal { background: var(--color-info-500); }

.signature-card-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  flex: 1;
}

.signature-card-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-urgent { background: linear-gradient(135deg, var(--color-error-400), var(--color-error-500)); }
.icon-high { background: linear-gradient(135deg, var(--color-warning-400), var(--color-warning-500)); }
.icon-normal { background: linear-gradient(135deg, var(--color-info-400), var(--color-info-500)); }

.signature-card-info {
  flex: 1;
  min-width: 0;
}

.signature-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.signature-card-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.signature-card-badges {
  display: flex;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--code {
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.badge--signature {
  background: var(--color-error-50);
  color: var(--color-error-600);
}

.signature-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

.meta-divider {
  color: var(--color-neutral-400);
}

.signature-card-submeta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.submeta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

.submeta-divider {
  color: var(--color-neutral-400);
}

.signature-card-docs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.doc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-neutral-100);
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--color-neutral-700);
}

.doc-chip--more {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.signature-card-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-info-50);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--color-info-700);
}

.signature-card-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-left: 20px;
  border-left: 1px solid var(--color-neutral-200);
}

.docs-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  border-radius: 12px;
  background: var(--color-neutral-50);
}

.docs-count--urgent { background: var(--color-error-50); color: var(--color-error-600); }
.docs-count--high { background: var(--color-warning-50); color: var(--color-warning-600); }
.docs-count--normal { background: var(--color-info-50); color: var(--color-info-600); }

.docs-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  margin-top: 4px;
}

.docs-label {
  font-size: 0.6875rem;
  font-weight: 500;
  margin-top: 2px;
}

.sign-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
  padding: 0 24px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid var(--color-neutral-200);
  text-align: center;
}

.empty-state-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-success-400), var(--color-success-500));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 8px 0;
}

.empty-state-text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0;
}

/* Loading State - Skeleton */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
}

.skeleton-signatures {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
}

/* Focus States para cards */
.signature-card:focus {
  outline: 2px solid var(--color-primary-300);
  outline-offset: 2px;
}

.signature-card:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-content {
    flex-direction: column;
  }

  .filters-content {
    flex-direction: column;
  }

  .filter-field,
  .filter-field--small {
    flex: 1;
    min-width: 100%;
  }

  .signature-card-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .signature-card-actions {
    flex-direction: row;
    width: 100%;
    padding-left: 0;
    padding-top: 16px;
    border-left: none;
    border-top: 1px solid var(--color-neutral-200);
    justify-content: space-between;
  }
}

/* Fullscreen Signature Dialog - Phase 3 */
.signature-fullscreen-dialog {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.signature-content {
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 64px);
}

.pdf-viewer-section {
  background: #f5f5f5;
  height: 100%;
  overflow: hidden;
}

.pdf-viewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.document-navigation {
  background: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.pdf-embed-wrapper {
  flex: 1;
  position: relative;
  background: #525252;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.signature-form-section {
  height: 100%;
  overflow-y: auto;
  background: white;
  border-left: 1px solid #e0e0e0;
}

.signature-form-card {
  height: 100%;
  min-height: fit-content;
  padding-bottom: 24px;
}

.info-item label {
  display: block;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item p {
  margin: 4px 0 0 0;
}

.documents-list {
  background: transparent;
}

.document-list-item {
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.document-list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.signature-actions {
  background: white;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  position: sticky;
  bottom: 0;
  z-index: 1;
}

/* Status de assinaturas */
.signature-status-list {
  background: transparent;
}

.signature-status-item {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.signature-status-item.current-user-turn {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.signature-progress {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .signature-content {
    height: auto;
  }

  .pdf-viewer-section {
    height: 400px;
  }

  .signature-form-section {
    height: auto;
    max-height: none;
    padding-bottom: 32px;
  }
}

/* Ajuste para garantir visibilidade do campo de senha e botões */
.signature-form-card :deep(.v-card-text) {
  padding-bottom: 32px !important;
}
</style>
