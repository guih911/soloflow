<template>
  <div :class="drawer ? 'drawer-viewer' : 'card-viewer'">
    <!-- Modo Drawer - Design Profissional Clean -->
    <div v-if="drawer" class="docs-drawer">
      <!-- Header Compacto -->
      <header class="docs-header">
        <div class="docs-header-top">
          <div class="docs-title-group">
            <div class="docs-icon">
              <v-icon size="20">mdi-folder-open</v-icon>
            </div>
            <div>
              <h2 class="docs-title">Documentos</h2>
              <p class="docs-subtitle">{{ totalDocuments }} arquivo{{ totalDocuments !== 1 ? 's' : '' }}</p>
            </div>
          </div>
          <button
            class="docs-refresh-btn"
            :class="{ 'refreshing': refreshing }"
            @click="refreshDocuments"
            title="Atualizar"
          >
            <v-icon size="18">mdi-refresh</v-icon>
          </button>
        </div>

        <!-- Busca Minimalista -->
        <div class="docs-search">
          <v-icon size="18" class="search-icon">mdi-magnify</v-icon>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar..."
            class="search-input"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <!-- Filtros Compactos -->
        <div class="docs-filters">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="filter-btn"
            :class="{ 'active': selectedFilter === filter.value }"
            @click="selectedFilter = filter.value"
          >
            <span class="filter-label">{{ filter.label }}</span>
            <span class="filter-count">{{ filter.count }}</span>
          </button>
        </div>
      </header>

      <!-- Lista de Documentos -->
      <div class="docs-list">
        <!-- Empty State -->
        <div v-if="filteredDocuments.length === 0" class="docs-empty">
          <div class="empty-icon">
            <v-icon size="32">mdi-file-search-outline</v-icon>
          </div>
          <p class="empty-text">Nenhum documento encontrado</p>
          <p class="empty-hint" v-if="searchQuery">Tente ajustar sua busca</p>
        </div>

        <!-- Document Items -->
        <div
          v-for="doc in filteredDocuments"
          :key="doc.id"
          class="doc-item"
          :class="{
            'doc-signed': doc.isSigned,
            'doc-needs-action': doc.canSign
          }"
        >
          <!-- Status Indicator -->
          <div class="doc-status-bar" :class="getStatusClass(doc)"></div>

          <div class="doc-content">
            <!-- Main Row -->
            <div class="doc-main">
              <!-- File Icon -->
              <div class="doc-icon" :class="`icon-${getFileTypeClass(doc.mimeType)}`">
                <v-icon size="20">{{ getFileIcon(doc.mimeType) }}</v-icon>
              </div>

              <!-- Info -->
              <div class="doc-info">
                <span class="doc-name" :title="doc.originalName">{{ doc.originalName }}</span>
                <div class="doc-meta">
                  <span class="doc-step">{{ doc.stepName }}</span>
                  <span class="doc-separator">•</span>
                  <span class="doc-size">{{ formatFileSize(doc.size) }}</span>
                </div>
              </div>

              <!-- Quick Actions (visible on hover) -->
              <div class="doc-actions">
                <button class="action-btn" @click.stop="downloadDocument(doc)" title="Baixar">
                  <v-icon size="18">mdi-download-outline</v-icon>
                </button>
                <button class="action-btn action-primary" @click.stop="openDocument(doc)" title="Visualizar">
                  <v-icon size="18">mdi-eye-outline</v-icon>
                </button>
              </div>
            </div>

            <!-- Signature Status (if applicable) -->
            <div v-if="doc.isSigned || doc.canSign || doc.waitingForSigner || (doc.pendingSigners && doc.pendingSigners.length > 0)" class="doc-signature">
              <!-- Assinado -->
              <div v-if="doc.isSigned && !doc.canSign && !doc.pendingSigners?.length" class="sig-status sig-complete">
                <v-icon size="14">mdi-check-circle</v-icon>
                <span>{{ doc.signatureCount }} assinatura{{ doc.signatureCount !== 1 ? 's' : '' }}</span>
              </div>

              <!-- Precisa assinar -->
              <div v-else-if="doc.canSign" class="sig-status sig-action">
                <div class="sig-action-content">
                  <v-icon size="14">mdi-pen</v-icon>
                  <span>Sua assinatura necessária</span>
                </div>
                <button class="sig-btn" @click.stop="openSignDialog(doc)">
                  Assinar
                </button>
              </div>

              <!-- Aguardando outro -->
              <div v-else-if="doc.waitingForSigner" class="sig-status sig-waiting">
                <v-icon size="14">mdi-clock-outline</v-icon>
                <span>Aguardando {{ doc.waitingForSigner }}</span>
              </div>

              <!-- Pendentes -->
              <div v-else-if="doc.pendingSigners && doc.pendingSigners.length > 0" class="sig-status sig-pending">
                <v-icon size="14">mdi-account-clock-outline</v-icon>
                <span>{{ doc.pendingSigners.length }} pendente{{ doc.pendingSigners.length !== 1 ? 's' : '' }}</span>
                <button class="sig-expand-btn" @click.stop="togglePendingSigners(doc.id)">
                  <v-icon size="14">{{ expandedSigners[doc.id] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </button>
              </div>

              <!-- Lista de Pendentes Expandida -->
              <div v-if="expandedSigners[doc.id] && doc.pendingSigners?.length" class="sig-pending-list">
                <div v-for="signer in doc.pendingSigners" :key="signer.id" class="signer-item">
                  <div class="signer-avatar">{{ getSignerInitials(signer.name) }}</div>
                  <span class="signer-name">{{ signer.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modo Card (completo) - mantido para outras páginas -->
    <v-card v-else class="document-viewer-card" elevation="4">
      <v-card-title class="document-viewer-header">
        <div class="d-flex align-center">
          <v-icon class="mr-3" color="primary" size="32">mdi-file-document-multiple</v-icon>
          <div>
            <h3 class="text-h5 font-weight-bold">Documentos do Processo</h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              {{ totalDocuments }} documento(s) • {{ signedDocuments }} assinado(s)
            </p>
          </div>
        </div>

        <v-spacer />

        <div class="d-flex gap-2 align-center">
          <v-btn-toggle v-model="viewMode" mandatory density="compact" variant="outlined" divided>
            <v-btn value="grid" size="small">
              <v-icon>mdi-view-grid</v-icon>
            </v-btn>
            <v-btn value="list" size="small">
              <v-icon>mdi-view-list</v-icon>
            </v-btn>
          </v-btn-toggle>

          <v-text-field
            v-model="searchQuery"
            density="compact"
            hide-details
            placeholder="Buscar documentos..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
            class="search-field"
            style="max-width: 300px;"
          />
        </div>
      </v-card-title>

      <v-divider />

      <!-- Filtros -->
      <div class="filters-bar px-6 py-3">
        <v-chip-group v-model="selectedFilter" mandatory>
          <v-chip value="all" variant="tonal">
            <v-icon start size="18">mdi-file-document-multiple</v-icon>
            Todos ({{ totalDocuments }})
          </v-chip>
          <v-chip value="signed" variant="tonal" color="success">
            <v-icon start size="18">mdi-check-decagram</v-icon>
            Assinados ({{ signedDocuments }})
          </v-chip>
          <v-chip value="unsigned" variant="tonal" color="warning">
            <v-icon start size="18">mdi-pen</v-icon>
            Não Assinados ({{ totalDocuments - signedDocuments }})
          </v-chip>
          <v-chip value="pdf" variant="tonal" color="error">
            <v-icon start size="18">mdi-file-pdf-box</v-icon>
            PDFs ({{ pdfDocuments }})
          </v-chip>
        </v-chip-group>
      </div>

      <v-divider />

      <!-- Documentos -->
      <v-card-text class="documents-container pa-6">
        <div v-if="filteredDocuments.length === 0" class="empty-state">
          <v-icon size="80" color="grey-lighten-1">mdi-file-document-outline</v-icon>
          <p class="text-h6 mt-4 text-grey">Nenhum documento encontrado</p>
          <p class="text-body-2 text-grey-lighten-1">
            {{ searchQuery ? 'Tente ajustar sua busca' : 'Documentos serão exibidos aqui quando adicionados' }}
          </p>
        </div>

        <!-- Grid View -->
        <div v-else-if="viewMode === 'grid'" class="documents-grid">
          <v-card
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-card"
            :class="{ 'document-signed': doc.isSigned }"
            elevation="2"
          >
            <div class="document-preview">
              <v-icon :color="getFileColor(doc.mimeType)" size="64">
                {{ getFileIcon(doc.mimeType) }}
              </v-icon>

              <v-badge
                v-if="doc.isSigned"
                dot
                color="success"
                location="top right"
                offset-x="8"
                offset-y="8"
              >
                <v-icon color="success" size="24">mdi-check-decagram</v-icon>
              </v-badge>
            </div>

            <v-card-text class="document-info pa-3">
              <v-tooltip :text="doc.originalName" location="top">
                <template v-slot:activator="{ props }">
                  <p v-bind="props" class="document-name text-body-2 font-weight-medium mb-1">
                    {{ doc.originalName }}
                  </p>
                </template>
              </v-tooltip>

              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-caption text-grey">{{ formatFileSize(doc.size) }}</span>
                <v-chip size="x-small" variant="tonal" :color="getStepColor(doc.stepType)">
                  {{ doc.stepName }}
                </v-chip>
              </div>

              <div v-if="doc.isSigned" class="signature-info mt-2">
                <v-divider class="mb-2" />
                <div class="d-flex align-center">
                  <v-icon size="14" color="success" class="mr-1">mdi-draw-pen</v-icon>
                  <span class="text-caption text-success">
                    {{ doc.signatureCount }} assinatura(s)
                  </span>
                </div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-3 pt-0">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click.stop="downloadDocument(doc)"
              >
                <v-icon start size="18">mdi-download</v-icon>
                Baixar
              </v-btn>

              <v-spacer />

              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click.stop="openDocument(doc)"
              >
                <v-icon start size="18">mdi-eye</v-icon>
                Visualizar
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>

        <!-- List View -->
        <v-list v-else class="documents-list">
          <v-list-item
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-list-item"
          >
            <template v-slot:prepend>
              <v-avatar :color="getFileColor(doc.mimeType)" size="56">
                <v-icon color="white" size="32">{{ getFileIcon(doc.mimeType) }}</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ doc.originalName }}
            </v-list-item-title>

            <v-list-item-subtitle class="mt-1">
              <div class="d-flex align-center gap-2 flex-wrap">
                <v-chip size="x-small" variant="tonal" :color="getStepColor(doc.stepType)">
                  <v-icon start size="12">{{ getStepIcon(doc.stepType) }}</v-icon>
                  {{ doc.stepName }}
                </v-chip>

                <span class="text-caption">{{ formatFileSize(doc.size) }}</span>

                <span class="text-caption text-grey">•</span>

                <span class="text-caption">{{ formatDate(doc.createdAt) }}</span>

                <v-chip
                  v-if="doc.isSigned"
                  size="x-small"
                  color="success"
                  variant="tonal"
                >
                  <v-icon start size="12">mdi-check-decagram</v-icon>
                  {{ doc.signatureCount }} assinatura(s)
                </v-chip>
              </div>
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="d-flex gap-2">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  @click.stop="downloadDocument(doc)"
                >
                  <v-icon>mdi-download</v-icon>
                </v-btn>

                <v-btn
                  icon
                  variant="tonal"
                  color="primary"
                  size="small"
                  @click.stop="openDocument(doc)"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
                <v-btn
                  v-if="doc.canSign"
                  icon
                  variant="tonal"
                  color="error"
                  size="small"
                  @click.stop="openSignDialog(doc)"
                >
                  <v-icon>mdi-pen</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Modal de Preview -->
    <AttachmentPreviewModal
      v-model="previewDialog"
      :attachment="selectedDocument"
    />

    <!-- Modal de Assinatura -->
    <SignDocumentDialog
      v-model="signDialog"
      :attachment="documentToSign"
      :stepExecutionId="documentToSign?.executionId"
      :stepName="documentToSign?.stepName"
      :isSubTaskAttachment="documentToSign?.isSubTaskAttachment"
      :subTaskId="documentToSign?.subTaskId"
      @signed="handleSigned"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import AttachmentPreviewModal from '@/components/AttachmentPreviewModal.vue'
import SignDocumentDialog from '@/components/SignDocumentDialog.vue'

const authStore = useAuthStore()

const props = defineProps({
  process: {
    type: Object,
    required: true
  },
  drawer: {
    type: Boolean,
    default: false
  }
})

// Estado
const viewMode = ref('list')
const searchQuery = ref('')
const companyUsers = ref([])
const selectedFilter = ref('all')
const previewDialog = ref(false)
const selectedDocument = ref(null)
const refreshing = ref(false)
const signDialog = ref(false)
const documentToSign = ref(null)
const expandedSigners = ref({})

// Emits
const emit = defineEmits(['refresh'])

// Filtros computados
const filters = computed(() => [
  { value: 'all', label: 'Todos', count: totalDocuments.value },
  { value: 'signed', label: 'Assinados', count: signedDocuments.value },
  { value: 'pdf', label: 'PDFs', count: pdfDocuments.value }
])

// Carregar usuários da empresa para resolver IDs de assinantes
async function loadCompanyUsers() {
  if (!props.process?.companyId) return
  try {
    const response = await api.get('/users', { params: { companyId: props.process.companyId } })
    companyUsers.value = response.data?.data || response.data || []
  } catch (e) {
    companyUsers.value = []
  }
}

// Carregar usuários quando o processo mudar
watch(() => props.process?.companyId, () => {
  loadCompanyUsers()
}, { immediate: true })

// Helper para inferir mimeType a partir do nome do arquivo
function getMimeTypeFromName(filename) {
  if (!filename) return 'application/octet-stream'
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

// Computed - Coletar todos os documentos de todas as etapas e sub-tarefas
const allDocuments = computed(() => {
  if (!props.process?.stepExecutions) return []

  const docs = []
  const currentUserId = authStore.user?.id

  // Coletar todos os usuários conhecidos do processo para resolver IDs
  const knownUsers = new Map()
  companyUsers.value.forEach(user => {
    knownUsers.set(user.id, user)
  })
  if (props.process.createdBy) {
    knownUsers.set(props.process.createdBy.id, props.process.createdBy)
  }
  props.process.stepExecutions?.forEach(exec => {
    if (exec.executor) {
      knownUsers.set(exec.executor.id, exec.executor)
    }
    exec.subTasks?.forEach(st => {
      if (st.executor) {
        knownUsers.set(st.executor.id, st.executor)
      }
    })
    exec.step?.signatureRequirements?.forEach(req => {
      if (req.user) {
        knownUsers.set(req.user.id, req.user)
      }
    })
  })

  props.process.stepExecutions.forEach(execution => {
    // Processar anexos das sub-tarefas
    if (execution.subTasks && execution.subTasks.length > 0) {
      execution.subTasks.forEach(subTask => {
        if (subTask.attachmentPath && subTask.attachmentName) {
          let subTaskSignerIds = []
          let pendingSigners = []
          let canSign = false
          let signatures = []
          let signedByUserIds = []

          if (subTask.signatures) {
            try {
              signatures = typeof subTask.signatures === 'string'
                ? JSON.parse(subTask.signatures)
                : subTask.signatures
              signedByUserIds = signatures.map(sig => sig.signerId || sig.userId)
            } catch (e) {
            }
          }

          if (subTask.requireSignature && subTask.signers) {
            try {
              subTaskSignerIds = typeof subTask.signers === 'string'
                ? JSON.parse(subTask.signers)
                : subTask.signers

              pendingSigners = subTaskSignerIds
                .filter(signerId => !signedByUserIds.includes(signerId))
                .map(signerId => {
                  const user = knownUsers.get(signerId)
                  if (user) {
                    return {
                      id: signerId,
                      name: user.name,
                      email: user.email || ''
                    }
                  }
                  return {
                    id: signerId,
                    name: `Usuário ${signerId.slice(0, 8)}...`,
                    email: ''
                  }
                })

              canSign = subTaskSignerIds.includes(currentUserId) && !signedByUserIds.includes(currentUserId)
            } catch (e) {
            }
          }

          const signatureCount = signatures.length
          const isSigned = signatureCount > 0

          docs.push({
            id: `subtask-${subTask.id}`,
            originalName: subTask.attachmentName,
            path: subTask.attachmentPath,
            mimeType: subTask.attachmentMimeType || getMimeTypeFromName(subTask.attachmentName),
            size: subTask.attachmentSize || 0,
            isSigned: isSigned,
            stepName: subTask.subTaskTemplate?.name || 'Sub-etapa',
            stepType: 'SUBTASK',
            stepOrder: (execution.step?.order || 0) + 0.5,
            executionId: execution.id,
            subTaskId: subTask.id,
            signatureCount: signatureCount,
            pendingSigners: pendingSigners,
            canSign: canSign,
            userRequirement: null,
            waitingForSigner: null,
            isFormField: false,
            isStepFormField: false,
            formFieldName: null,
            isSubTaskAttachment: true,
            requireSignature: subTask.requireSignature || false,
            signatureType: subTask.signatureType || 'SEQUENTIAL',
            signerIds: subTaskSignerIds,
            signatures: signatures
          })
        }
      })
    }

    if (execution.attachments && execution.attachments.length > 0) {
      execution.attachments.forEach(attachment => {
        let isFormField = false
        let isStepFormField = false
        let formFieldName = null
        if (attachment.signatureData) {
          try {
            const sigData = typeof attachment.signatureData === 'string'
              ? JSON.parse(attachment.signatureData)
              : attachment.signatureData
            if (sigData?.isFormField) {
              isFormField = true
              formFieldName = sigData.fieldName || null
            } else if (sigData?.isStepFormField) {
              isStepFormField = true
              formFieldName = sigData.fieldName || null
            }
          } catch (e) {
            // Se não conseguir parsear, continua normalmente
          }
        }
        const pendingSigners = []
        let canSign = false
        let userRequirement = null
        let waitingForSigner = null

        const allSignatureRequirements = execution.step?.signatureRequirements || execution.stepVersion?.signatureRequirements || []
        const currentUserSectorId = authStore.activeSectorId

        const processAttachmentIds = new Set()
        props.process.stepExecutions?.forEach(exec => {
          exec.attachments?.forEach(att => processAttachmentIds.add(att.id))
        })

        const signatureRequirements = allSignatureRequirements.filter(req => {
          if (req.attachmentId) {
            return req.attachmentId === attachment.id && processAttachmentIds.has(req.attachmentId)
          }
          if (isFormField) {
            return false
          }
          return true
        })

        if (signatureRequirements.length > 0) {
          const sortedRequirements = [...signatureRequirements].sort((a, b) => a.order - b.order)

          sortedRequirements.forEach(req => {
            const signatureRecord = attachment.signatureRecords?.find(
              record => record.requirementId === req.id
            )

            const hasSignature = signatureRecord && signatureRecord.status === 'COMPLETED'

            if (!hasSignature) {
              const isUserResponsible = req.userId === currentUserId
              const isSectorResponsible = req.sectorId && req.sectorId === currentUserSectorId

              if (isUserResponsible || isSectorResponsible) {
                let canSignNow = true

                if (req.type === 'SEQUENTIAL') {
                  const previousRequirements = sortedRequirements.filter(r => r.order < req.order)
                  const allPreviousSigned = previousRequirements.every(prevReq => {
                    const prevRecord = attachment.signatureRecords?.find(
                      record => record.requirementId === prevReq.id && record.status === 'COMPLETED'
                    )
                    return !!prevRecord
                  })

                  if (!allPreviousSigned) {
                    canSignNow = false
                    const waitingFor = previousRequirements.find(prevReq => {
                      const prevRecord = attachment.signatureRecords?.find(
                        record => record.requirementId === prevReq.id && record.status === 'COMPLETED'
                      )
                      return !prevRecord
                    })
                    if (waitingFor) {
                      waitingForSigner = waitingFor.user?.name || waitingFor.sector?.name || 'Assinante anterior'
                    }
                  }
                }

                const isPending = !signatureRecord || signatureRecord.status === 'PENDING'
                if (isPending && canSignNow) {
                  canSign = true
                  userRequirement = req
                }
              } else {
                if (req.user) {
                  pendingSigners.push({
                    id: req.userId,
                    name: req.user.name,
                    email: req.user.email,
                    requirementId: req.id
                  })
                } else if (req.sector) {
                  pendingSigners.push({
                    id: req.sectorId,
                    name: `Setor: ${req.sector.name}`,
                    email: '',
                    requirementId: req.id
                  })
                }
              }
            }
          })
        }

        let docStepName = execution.step?.name || 'Etapa'
        let docStepType = execution.step?.type || 'INPUT'
        let docStepOrder = execution.step?.order || 0

        if (isFormField) {
          docStepName = 'Formulário Inicial'
          docStepType = 'FORM_FIELD'
          docStepOrder = -1
        } else if (isStepFormField) {
          docStepType = 'STEP_FORM_FIELD'
        }

        docs.push({
          ...attachment,
          stepName: docStepName,
          stepType: docStepType,
          stepOrder: docStepOrder,
          executionId: execution.id,
          signatureCount: attachment.signatureRecords?.filter(r => r.status === 'COMPLETED').length || 0,
          pendingSigners,
          canSign,
          userRequirement,
          waitingForSigner,
          isFormField: isFormField || isStepFormField,
          isStepFormField,
          formFieldName
        })
      })
    }
  })

  return docs.sort((a, b) => a.stepOrder - b.stepOrder)
})

// Computed - Documentos filtrados
const filteredDocuments = computed(() => {
  let docs = allDocuments.value

  if (selectedFilter.value === 'signed') {
    docs = docs.filter(d => d.isSigned)
  } else if (selectedFilter.value === 'unsigned') {
    docs = docs.filter(d => !d.isSigned)
  } else if (selectedFilter.value === 'pdf') {
    docs = docs.filter(d => d.mimeType === 'application/pdf')
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter(d =>
      d.originalName.toLowerCase().includes(query) ||
      d.stepName.toLowerCase().includes(query)
    )
  }

  return docs
})

// Computed - Estatísticas
const totalDocuments = computed(() => allDocuments.value.length)
const signedDocuments = computed(() => allDocuments.value.filter(d => d.isSigned).length)
const pdfDocuments = computed(() => allDocuments.value.filter(d => d.mimeType === 'application/pdf').length)

// Métodos
function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('text')) return 'mdi-file-document'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'mdi-folder-zip'
  return 'mdi-file'
}

function getFileColor(mimeType) {
  if (!mimeType) return 'grey'
  if (mimeType.includes('pdf')) return 'error'
  if (mimeType.includes('image')) return 'info'
  if (mimeType.includes('word')) return 'indigo'
  if (mimeType.includes('excel')) return 'success'
  if (mimeType.includes('text')) return 'warning'
  return 'grey'
}

function getFileTypeClass(mimeType) {
  if (!mimeType) return 'default'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('word')) return 'word'
  if (mimeType.includes('excel')) return 'excel'
  return 'default'
}

function getStepColor(stepType) {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red',
    FORM_FIELD: 'indigo',
    STEP_FORM_FIELD: 'cyan',
    SUBTASK: 'secondary'
  }
  return colors[stepType] || 'grey'
}

function getStepIcon(stepType) {
  const icons = {
    INPUT: 'mdi-form-textbox',
    APPROVAL: 'mdi-check-decagram',
    UPLOAD: 'mdi-upload',
    REVIEW: 'mdi-eye-check',
    SIGNATURE: 'mdi-draw-pen',
    FORM_FIELD: 'mdi-file-document-edit',
    STEP_FORM_FIELD: 'mdi-form-textbox',
    SUBTASK: 'mdi-subdirectory-arrow-right'
  }
  return icons[stepType] || 'mdi-help-circle'
}

function getStatusClass(doc) {
  if (doc.canSign) return 'status-action'
  if (doc.isSigned) return 'status-signed'
  if (doc.waitingForSigner || doc.pendingSigners?.length) return 'status-pending'
  return 'status-neutral'
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function openDocument(doc) {
  selectedDocument.value = doc
  previewDialog.value = true
}

async function downloadDocument(doc) {
  try {
    const endpoint = doc.isSubTaskAttachment
      ? `/sub-tasks/attachment/${doc.subTaskId}/download`
      : `/processes/attachment/${doc.id}/download`

    const response = await api.get(endpoint, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], {
      type: doc.mimeType || 'application/octet-stream'
    })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = doc.originalName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.(`Download de "${doc.originalName}" iniciado`, 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao baixar documento', 'error')
  }
}

async function refreshDocuments() {
  refreshing.value = true
  try {
    emit('refresh')
    await new Promise(resolve => setTimeout(resolve, 500))
    window.showSnackbar?.('Documentos atualizados', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao atualizar documentos', 'error')
  } finally {
    refreshing.value = false
  }
}

function openSignDialog(doc) {
  documentToSign.value = {
    id: doc.id,
    originalName: doc.originalName,
    size: doc.size,
    mimeType: doc.mimeType,
    executionId: doc.executionId,
    stepName: doc.stepName,
    isSigned: doc.isSigned,
    requirementId: doc.userRequirement?.id,
    isSubTaskAttachment: doc.isSubTaskAttachment || false,
    subTaskId: doc.subTaskId || null
  }

  signDialog.value = true
}

async function handleSigned() {
  signDialog.value = false
  documentToSign.value = null
  await refreshDocuments()
}

function togglePendingSigners(docId) {
  expandedSigners.value[docId] = !expandedSigners.value[docId]
}

function getSignerInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
</script>

<style scoped>
/* =============================================================================
   DOCUMENT VIEWER - DRAWER MODE (Clean Professional Design)
   Inspired by: Linear, Notion, Monday.com, Asana
   ============================================================================= */

/* Fix overflow when used inside v-navigation-drawer */
.drawer-viewer {
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.docs-drawer {
  height: 100%;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
  overflow: hidden;
}

/* Header */
.docs-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-neutral-200, #e2e8f0);
  flex-shrink: 0;
}

.docs-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.docs-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docs-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-primary-50, #eff6ff);
  border-radius: 8px;
  color: var(--color-primary-600, #2563eb);
}

.docs-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-900, #0f172a);
  margin: 0;
  line-height: 1.2;
}

.docs-subtitle {
  font-size: 0.75rem;
  color: var(--color-neutral-500, #64748b);
  margin: 2px 0 0 0;
}

.docs-refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-neutral-400, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.docs-refresh-btn:hover {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}

.docs-refresh-btn.refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Search */
.docs-search {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400, #94a3b8);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 36px;
  border: 1px solid var(--color-neutral-200, #e2e8f0);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--color-neutral-800, #1e293b);
  background: var(--color-neutral-50, #f8fafc);
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-400, #60a5fa);
  background: #fff;
  box-shadow: 0 0 0 3px var(--color-primary-100, #dbeafe);
}

.search-input::placeholder {
  color: var(--color-neutral-400, #94a3b8);
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: var(--color-neutral-200, #e2e8f0);
  border-radius: 4px;
  color: var(--color-neutral-500, #64748b);
  cursor: pointer;
}

.search-clear:hover {
  background: var(--color-neutral-300, #cbd5e1);
}

/* Filters */
.docs-filters {
  display: flex;
  gap: 6px;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-neutral-200, #e2e8f0);
  border-radius: 6px;
  background: transparent;
  font-size: 0.75rem;
  color: var(--color-neutral-600, #475569);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: var(--color-neutral-50, #f8fafc);
  border-color: var(--color-neutral-300, #cbd5e1);
}

.filter-btn.active {
  background: var(--color-primary-50, #eff6ff);
  border-color: var(--color-primary-200, #bfdbfe);
  color: var(--color-primary-700, #1d4ed8);
}

.filter-label {
  font-weight: 500;
}

.filter-count {
  font-weight: 600;
  font-size: 0.6875rem;
  padding: 1px 5px;
  background: var(--color-neutral-100, #f1f5f9);
  border-radius: 4px;
}

.filter-btn.active .filter-count {
  background: var(--color-primary-100, #dbeafe);
}

/* Document List */
.docs-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Custom Scrollbar */
.docs-list::-webkit-scrollbar {
  width: 6px;
}

.docs-list::-webkit-scrollbar-track {
  background: transparent;
}

.docs-list::-webkit-scrollbar-thumb {
  background: var(--color-neutral-300, #cbd5e1);
  border-radius: 3px;
}

.docs-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-400, #94a3b8);
}

/* Empty State */
.docs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--color-neutral-100, #f1f5f9);
  border-radius: 12px;
  color: var(--color-neutral-400, #94a3b8);
  margin-bottom: 12px;
}

.empty-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600, #475569);
  margin: 0;
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--color-neutral-400, #94a3b8);
  margin: 4px 0 0 0;
}

/* Document Item */
.doc-item {
  position: relative;
  background: #fff;
  border: 1px solid var(--color-neutral-200, #e2e8f0);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.15s ease;
}

.doc-item:hover {
  border-color: var(--color-neutral-300, #cbd5e1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.doc-item:hover .doc-actions {
  opacity: 1;
}

.doc-item.doc-needs-action {
  border-color: var(--color-warning-300, #fcd34d);
  background: linear-gradient(to right, var(--color-warning-50, #fffbeb), #fff);
}

/* Status Bar */
.doc-status-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.doc-status-bar.status-signed {
  background: var(--color-success-500, #10b981);
}

.doc-status-bar.status-action {
  background: var(--color-warning-500, #f59e0b);
}

.doc-status-bar.status-pending {
  background: var(--color-neutral-300, #cbd5e1);
}

.doc-status-bar.status-neutral {
  background: transparent;
}

/* Document Content */
.doc-content {
  padding: 12px 12px 12px 16px;
}

.doc-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
}

/* Document Icon */
.doc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.doc-icon.icon-pdf {
  background: var(--color-error-50, #fef2f2);
  color: var(--color-error-500, #ef4444);
}

.doc-icon.icon-image {
  background: var(--color-info-50, #ecfeff);
  color: var(--color-info-500, #06b6d4);
}

.doc-icon.icon-word {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-500, #3b82f6);
}

.doc-icon.icon-excel {
  background: var(--color-success-50, #ecfdf5);
  color: var(--color-success-500, #10b981);
}

.doc-icon.icon-default {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-500, #64748b);
}

/* Document Info */
.doc-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.doc-name {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-neutral-800, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  line-height: 1.3;
  max-width: 100%;
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.6875rem;
  color: var(--color-neutral-500, #64748b);
}

.doc-step {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-separator {
  opacity: 0.5;
}

/* Quick Actions */
.doc-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: var(--color-neutral-100, #f1f5f9);
  border-radius: 6px;
  color: var(--color-neutral-500, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--color-neutral-200, #e2e8f0);
  color: var(--color-neutral-700, #334155);
}

.action-btn.action-primary {
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-600, #2563eb);
}

.action-btn.action-primary:hover {
  background: var(--color-primary-200, #bfdbfe);
}

/* Signature Status */
.doc-signature {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-neutral-100, #f1f5f9);
}

.sig-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.sig-status.sig-complete {
  color: var(--color-success-600, #059669);
}

.sig-status.sig-action {
  justify-content: space-between;
}

.sig-action-content {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-warning-700, #b45309);
  font-weight: 500;
}

.sig-btn {
  padding: 5px 12px;
  border: none;
  background: var(--color-warning-500, #f59e0b);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sig-btn:hover {
  background: var(--color-warning-600, #d97706);
  transform: translateY(-1px);
}

.sig-status.sig-waiting {
  color: var(--color-info-600, #0891b2);
}

.sig-status.sig-pending {
  color: var(--color-neutral-500, #64748b);
}

.sig-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-neutral-400, #94a3b8);
  border-radius: 4px;
  cursor: pointer;
}

.sig-expand-btn:hover {
  background: var(--color-neutral-100, #f1f5f9);
}

/* Pending Signers List */
.sig-pending-list {
  margin-top: 8px;
  padding: 8px;
  background: var(--color-neutral-50, #f8fafc);
  border-radius: 6px;
}

.signer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.signer-item:not(:last-child) {
  border-bottom: 1px solid var(--color-neutral-100, #f1f5f9);
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.signer-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 50%;
}

.signer-name {
  font-size: 0.75rem;
  color: var(--color-neutral-700, #334155);
}

/* =============================================================================
   CARD MODE (mantido para compatibilidade)
   ============================================================================= */

.document-viewer-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.document-viewer-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02));
  padding: 24px;
}

.filters-bar {
  background: rgba(0, 0, 0, 0.01);
}

.search-field {
  min-width: 200px;
}

.documents-container {
  min-height: 400px;
  max-height: 800px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.document-card {
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.document-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(25, 118, 210, 0.15);
}

.document-signed {
  border-color: rgba(76, 175, 80, 0.3);
  background: linear-gradient(to bottom, rgba(76, 175, 80, 0.02), transparent);
}

.document-signed:hover {
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.15);
}

.document-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01));
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.document-info {
  min-height: 120px;
}

.document-name {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  height: 2.8em;
}

.signature-info {
  background: rgba(76, 175, 80, 0.05);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.1);
}

.documents-list {
  background: transparent;
}

.document-list-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.document-list-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(25, 118, 210, 0.02);
  transform: translateX(4px);
}

.documents-container::-webkit-scrollbar {
  width: 8px;
}

.documents-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.documents-container::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.3);
  border-radius: 4px;
}

.documents-container::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.5);
}

/* Responsive */
@media (max-width: 960px) {
  .documents-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .document-viewer-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 16px;
  }

  .search-field {
    max-width: 100% !important;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .documents-grid {
    grid-template-columns: 1fr;
  }

  .filters-bar {
    overflow-x: auto;
  }
}
</style>
