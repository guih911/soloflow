<template>
  <div :class="drawer ? 'drawer-viewer' : 'card-viewer'">
    <!-- Modo Drawer -->
    <div v-if="drawer" class="drawer-content">
      <!-- Header do Drawer -->
      <div class="drawer-header">
        <div class="d-flex align-center mb-4">
          <v-icon color="primary" size="32" class="mr-3">mdi-file-document-multiple</v-icon>
          <div class="flex-grow-1">
            <h2 class="text-h5 font-weight-bold">Documentos</h2>
            <p class="text-body-2 text-medium-emphasis">
              {{ totalDocuments }} documento(s) • {{ signedDocuments }} assinado(s)
            </p>
          </div>

          <v-btn
            icon
            variant="text"
            :loading="refreshing"
            @click="refreshDocuments"
            class="ml-2"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent" location="bottom">
              Atualizar documentos
            </v-tooltip>
          </v-btn>
        </div>

        <!-- Busca -->
        <v-text-field
          v-model="searchQuery"
          density="comfortable"
          hide-details
          placeholder="Buscar documentos..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          class="mb-4"
        />

        <!-- Filtros Compactos -->
        <v-chip-group v-model="selectedFilter" mandatory class="mb-4">
          <v-chip value="all" size="small" variant="tonal">
            Todos ({{ totalDocuments }})
          </v-chip>
          <v-chip value="signed" size="small" variant="tonal" color="success">
            Assinados ({{ signedDocuments }})
          </v-chip>
          <v-chip value="pdf" size="small" variant="tonal" color="error">
            PDFs ({{ pdfDocuments }})
          </v-chip>
        </v-chip-group>

        <v-divider class="mb-4" />
      </div>

      <!-- Lista de Documentos (sempre em list mode no drawer) -->
      <div class="drawer-documents">
        <div v-if="filteredDocuments.length === 0" class="empty-state-drawer">
          <v-icon size="64" color="grey-lighten-2">mdi-file-document-outline</v-icon>
          <p class="text-body-1 mt-3 text-grey">Nenhum documento encontrado</p>
        </div>

        <v-list v-else class="documents-list-drawer">
          <v-card
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-item-drawer-card mb-3"
            elevation="0"
          >
            <div class="d-flex align-start pa-3">
              <v-avatar :color="getFileColor(doc.mimeType)" size="48" class="mr-3 flex-shrink-0">
                <v-icon color="white" size="28">{{ getFileIcon(doc.mimeType) }}</v-icon>
              </v-avatar>

              <div class="flex-grow-1" style="min-width: 0;">
                <!-- DESTAQUE: Nome da Etapa com tipo -->
                <div class="mb-3">
                  <div class="d-flex align-center gap-2 mb-1">
                    <v-icon :color="getStepColor(doc.stepType)" size="20">
                      {{ getStepIcon(doc.stepType) }}
                    </v-icon>
                    <span class="text-caption text-grey text-uppercase">
                      {{ getStepTypeText(doc.stepType) }}
                    </span>
                  </div>
                  <div class="text-subtitle-1 font-weight-bold" :style="{ color: `rgb(var(--v-theme-${getStepColor(doc.stepType)}))` }">
                    {{ doc.stepName }}
                  </div>
                </div>

                <!-- Nome do PDF -->
                <div class="text-body-2 font-weight-medium mb-3 document-filename">
                  <v-icon size="18" :color="getFileColor(doc.mimeType)" class="mr-1">
                    {{ getFileIcon(doc.mimeType) }}
                  </v-icon>
                  {{ doc.originalName }}
                </div>

                <!-- Detalhes -->
                <div class="d-flex align-center gap-2 flex-wrap mb-2">
                  <span class="text-caption text-grey ml-2">{{ formatFileSize(doc.size) }}</span>
                </div>

                <!-- Status de Assinatura - Design Profissional -->
                <div v-if="doc.canSign || (doc.pendingSigners && doc.pendingSigners.length > 0)" class="signature-status-section mt-3">
                  <v-divider class="mb-3" />

                  <!-- Ação Principal: Assinar (se pode assinar) -->
                  <div v-if="doc.canSign" class="signature-action-primary mb-3">
                    <v-alert
                      type="warning"
                      variant="tonal"
                      border="start"
                      density="compact"
                      class="signature-alert"
                    >
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <v-icon size="20" class="mr-2">mdi-draw-pen</v-icon>
                          <div>
                            <div class="text-body-2 font-weight-bold">Sua assinatura é necessária</div>
                            <div class="text-caption">Clique no botão ao lado para assinar este documento</div>
                          </div>
                        </div>
                        <v-btn
                          color="warning"
                          variant="elevated"
                          size="default"
                          @click.stop="openSignDialog(doc)"
                          class="sign-button-primary ml-3"
                        >
                          <v-icon start size="20">mdi-pen</v-icon>
                          Assinar Agora
                        </v-btn>
                      </div>
                    </v-alert>
                  </div>

                  <!-- Outros Pendentes -->
                  <div v-if="doc.pendingSigners && doc.pendingSigners.length > 0" class="signature-pending-info">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="d-flex align-center">
                        <v-icon size="16" color="grey-darken-1" class="mr-1">mdi-account-clock</v-icon>
                        <span class="text-caption font-weight-medium text-grey-darken-1">
                          Aguardando mais {{ doc.pendingSigners.length }} assinatura(s)
                        </span>
                      </div>
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        color="grey"
                        prepend-icon="mdi-clock-outline"
                      >
                        Pendente
                      </v-chip>
                    </div>

                    <!-- Lista de pendentes colapsável -->
                    <v-expansion-panels variant="accordion" class="pending-list-panel">
                      <v-expansion-panel elevation="0" class="pending-panel">
                        <v-expansion-panel-title
                          class="pa-2 text-caption"
                          expand-icon="mdi-chevron-down"
                          collapse-icon="mdi-chevron-up"
                        >
                          <v-icon size="14" class="mr-1">mdi-account-multiple</v-icon>
                          Ver quem ainda precisa assinar
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="pa-2 pt-0">
                          <v-list density="compact" class="pending-signers-list">
                            <v-list-item
                              v-for="signer in doc.pendingSigners"
                              :key="signer.id"
                              class="px-2"
                              density="compact"
                            >
                              <template v-slot:prepend>
                                <v-avatar size="24" :color="getAvatarColor(signer.name)">
                                  <span class="text-caption font-weight-bold text-white">
                                    {{ getSignerInitials(signer.name) }}
                                  </span>
                                </v-avatar>
                              </template>
                              <v-list-item-title class="text-caption">
                                {{ signer.name }}
                              </v-list-item-title>
                              <v-list-item-subtitle class="text-caption">
                                {{ signer.email }}
                              </v-list-item-subtitle>
                            </v-list-item>
                          </v-list>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </div>
                </div>

                <!-- Status: Completamente Assinado -->
                <div v-else-if="doc.isSigned" class="signature-status-completed mt-3">
                  <v-divider class="mb-3" />
                  <v-alert
                    type="success"
                    variant="tonal"
                    border="start"
                    density="compact"
                  >
                    <div class="d-flex align-center">
                      <v-icon size="20" class="mr-2">mdi-check-decagram</v-icon>
                      <div>
                        <div class="text-body-2 font-weight-bold">Documento assinado</div>
                        <div class="text-caption">
                          {{ doc.signatureCount }} assinatura(s) completa(s)
                        </div>
                      </div>
                    </div>
                  </v-alert>
                </div>
              </div>
            </div>

            <!-- Botões de ação -->
            <v-divider />
            <div class="d-flex justify-end gap-2 pa-2">
              <v-btn
                size="small"
                variant="text"
                @click.stop="downloadDocument(doc)"
              >
                <v-icon start size="18">mdi-download</v-icon>
                Baixar
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click.stop="openDocument(doc)"
              >
                <v-icon start size="18">mdi-eye</v-icon>
                Visualizar
              </v-btn>
            </div>
          </v-card>
        </v-list>
      </div>
    </div>

    <!-- Modo Card (completo) -->
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
      @signed="handleSigned"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
const selectedFilter = ref('all')
const previewDialog = ref(false)
const selectedDocument = ref(null)
const refreshing = ref(false)
const signDialog = ref(false)
const documentToSign = ref(null)

// Emits
const emit = defineEmits(['refresh'])

// Computed - Coletar todos os documentos de todas as etapas
const allDocuments = computed(() => {
  if (!props.process?.stepExecutions) return []

  const docs = []
  const currentUserId = authStore.user?.id

  props.process.stepExecutions.forEach(execution => {
    if (execution.attachments && execution.attachments.length > 0) {
      execution.attachments.forEach(attachment => {
        // Buscar requisitos de assinatura pendentes para este anexo
        const pendingSigners = []
        let canSign = false
        let userRequirement = null

        // Se a etapa requer assinatura, aplicar todos os requisitos a TODOS os anexos
        if (execution.stepVersion?.requiresSignature && execution.stepVersion?.signatureRequirements) {
          execution.stepVersion.signatureRequirements.forEach(req => {
            // Verificar se já foi assinado neste anexo para este requisito
            const signatureRecord = attachment.signatureRecords?.find(
              record => record.requirementId === req.id
            )

            const hasSignature = signatureRecord && signatureRecord.status === 'COMPLETED'

            if (!hasSignature) {
              // Verificar se o usuário atual pode assinar
              // O usuário só pode assinar se:
              // 1. É o userId do requisito
              // 2. Ainda não assinou (não tem registro OU registro está PENDING)
              if (req.userId === currentUserId) {
                const isPending = !signatureRecord || signatureRecord.status === 'PENDING'
                if (isPending) {
                  canSign = true
                  userRequirement = req
                }
              } else {
                // Adicionar à lista de pendentes (apenas outros usuários, não o atual)
                if (req.user) {
                  pendingSigners.push({
                    id: req.userId,
                    name: req.user.name,
                    email: req.user.email,
                    requirementId: req.id
                  })
                }
              }
            }
          })
        }

        docs.push({
          ...attachment,
          stepName: execution.step?.name || 'Etapa sem nome',
          stepType: execution.step?.type || 'INPUT',
          stepOrder: execution.step?.order || 0,
          executionId: execution.id,
          signatureCount: attachment.signatureRecords?.filter(r => r.status === 'COMPLETED').length || 0,
          pendingSigners,
          canSign,
          userRequirement
        })
      })
    }
  })

  // Ordenar por ordem da etapa
  return docs.sort((a, b) => a.stepOrder - b.stepOrder)
})

// Computed - Documentos filtrados
const filteredDocuments = computed(() => {
  let docs = allDocuments.value

  // Filtrar por tipo
  if (selectedFilter.value === 'signed') {
    docs = docs.filter(d => d.isSigned)
  } else if (selectedFilter.value === 'unsigned') {
    docs = docs.filter(d => !d.isSigned)
  } else if (selectedFilter.value === 'pdf') {
    docs = docs.filter(d => d.mimeType === 'application/pdf')
  }

  // Filtrar por busca
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

function getStepColor(stepType) {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red'
  }
  return colors[stepType] || 'grey'
}

function getStepIcon(stepType) {
  const icons = {
    INPUT: 'mdi-form-textbox',
    APPROVAL: 'mdi-check-decagram',
    UPLOAD: 'mdi-upload',
    REVIEW: 'mdi-eye-check',
    SIGNATURE: 'mdi-draw-pen'
  }
  return icons[stepType] || 'mdi-help-circle'
}

function getStepTypeText(stepType) {
  const types = {
    INPUT: 'Preenchimento',
    APPROVAL: 'Aprovação',
    UPLOAD: 'Upload de Arquivos',
    REVIEW: 'Revisão',
    SIGNATURE: 'Assinatura'
  }
  return types[stepType] || stepType
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
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
    const response = await api.get(`/processes/attachment/${doc.id}/download`, {
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
    console.error('Error downloading document:', error)
    window.showSnackbar?.('Erro ao baixar documento', 'error')
  }
}

async function refreshDocuments() {
  refreshing.value = true
  try {
    emit('refresh')
    await new Promise(resolve => setTimeout(resolve, 500)) // Pequeno delay para feedback visual
    window.showSnackbar?.('Documentos atualizados', 'success')
  } catch (error) {
    console.error('Error refreshing documents:', error)
    window.showSnackbar?.('Erro ao atualizar documentos', 'error')
  } finally {
    refreshing.value = false
  }
}

function openSignDialog(doc) {
  console.log('🔍 Opening sign dialog for document:', doc)
  console.log('👤 Current user:', authStore.user?.id, authStore.user?.name)
  console.log('✅ Can sign:', doc.canSign)
  console.log('📋 User requirement:', doc.userRequirement)
  console.log('👥 Pending signers:', doc.pendingSigners)

  documentToSign.value = {
    id: doc.id,
    originalName: doc.originalName,
    size: doc.size,
    mimeType: doc.mimeType,
    executionId: doc.executionId,
    stepName: doc.stepName,
    isSigned: doc.isSigned,
    requirementId: doc.userRequirement?.id
  }

  console.log('📄 Document to sign:', documentToSign.value)
  signDialog.value = true
}

async function handleSigned() {
  signDialog.value = false
  documentToSign.value = null
  // Atualizar a lista de documentos
  await refreshDocuments()
}

// Funções auxiliares para avatares dos signatários
function getSignerInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(name) {
  if (!name) return 'grey'
  const colors = [
    'blue', 'indigo', 'purple', 'pink', 'red',
    'orange', 'amber', 'lime', 'green', 'teal',
    'cyan', 'blue-grey', 'deep-purple', 'deep-orange'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
</script>

<style scoped>
/* Modo Drawer */
.drawer-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.drawer-header {
  padding: 24px;
  flex-shrink: 0;
}

.drawer-documents {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 24px;
}

.empty-state-drawer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.documents-list-drawer {
  background: transparent;
  padding: 0;
}

.document-item-drawer-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  transition: all 0.2s ease;
  background: white;
  overflow: hidden;
}

.document-item-drawer-card:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.12);
}

.document-filename {
  word-break: break-word;
  line-height: 1.5;
  display: flex;
  align-items: center;
}

/* Status de Assinatura - Design Profissional */
.signature-status-section {
  margin-top: 12px;
}

.signature-action-primary {
  margin-bottom: 12px;
}

.signature-alert :deep(.v-alert__content) {
  width: 100%;
}

.sign-button-primary {
  animation: pulse-glow 2s infinite;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3) !important;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  flex-shrink: 0;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 6px 24px rgba(255, 152, 0, 0.5);
    transform: scale(1.02);
  }
}

.signature-pending-info {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.pending-list-panel {
  background: transparent;
}

.pending-panel {
  background: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.pending-signers-list {
  background: transparent;
  padding: 0;
}

.pending-signers-list .v-list-item {
  min-height: 40px;
  padding: 4px 8px;
}

.signature-status-completed :deep(.v-alert__content) {
  width: 100%;
}

/* Scrollbar do Drawer */
.drawer-documents::-webkit-scrollbar {
  width: 6px;
}

.drawer-documents::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
}

.drawer-documents::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.3);
  border-radius: 3px;
}

.drawer-documents::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.5);
}

/* Modo Card */
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

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

/* Grid View */
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

/* List View */
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

/* Scrollbar */
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
