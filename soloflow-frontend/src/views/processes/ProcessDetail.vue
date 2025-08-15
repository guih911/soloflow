<template>
  <div v-if="process">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <div class="ml-4 flex-grow-1">
        <div class="d-flex align-center">
          <h1 class="text-h4 font-weight-bold max-width">
            {{ process.title || process.code }}
          </h1>
          <v-chip :color="getStatusColor(process.status)" class="ml-3" label>
            {{ getStatusText(process.status) }}
          </v-chip>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis">
          {{ process.processType.name }}
        </p>
      </div>

      <!-- Actions -->
      <div class="d-flex gap-2">
        <v-btn variant="text" @click="refreshProcess" :loading="loading">
          <v-icon start>mdi-refresh</v-icon>
          Atualizar
        </v-btn>

        <!-- ✅ Botão de anexos integrado - CORRIGIDO -->
        <AttachmentButton
          :process="process"
          variant="elevated"
          color="info"
          show-empty-state
        />

        <!-- Botão de ação principal baseado no status -->
        <v-btn v-if="currentStepExecution" color="primary" variant="elevated" @click="executeCurrentStep"
          :disabled="!canExecuteCurrentStep">
          <v-icon start>mdi-play</v-icon>
          Executar Etapa
        </v-btn>
      </div>
    </div>

    <!-- Progress Bar -->
    <v-card class="mb-6">
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-subtitle-2">Progresso do Processo</span>
          <span class="text-caption">{{ progressPercentage }}% concluído</span>
        </div>
        <v-progress-linear :model-value="progressPercentage" :color="getProgressColor()" height="8" rounded
          class="mb-2" />
        <div class="text-caption text-medium-emphasis">
          {{ completedSteps }} de {{ totalSteps }} etapas concluídas
        </div>
      </v-card-text>
    </v-card>

    <v-row>
      <!-- Informações do Processo -->
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            Informações
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-identifier</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
    
    <!-- ✅ NOVO: Modal específico para arquivos de campo -->
    <FieldFileModal
      v-model="fieldFileModal"
      :file-data="selectedFieldFile"
      :field-info="selectedField"
    />
</template>
              <v-list-item-title>Código</v-list-item-title>
              <v-list-item-subtitle>{{ process.code }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>
              <v-list-item-title>Solicitante</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-email</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>
              <v-list-item-title>E-mail</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-calendar</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>
              <v-list-item-title>Criado em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.createdAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="process.completedAt">
              <template v-slot:prepend>
                <v-icon>mdi-calendar-check</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>
              <v-list-item-title>Concluído em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.completedAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="estimatedCompletion">
              <template v-slot:prepend>
                <v-icon>mdi-clock-outline</v-icon>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>
              <v-list-item-title>Previsão</v-list-item-title>
              <v-list-item-subtitle>{{ estimatedCompletion }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider v-if="process.description" />

          <v-card-text v-if="process.description">
            <p class="text-caption text-medium-emphasis mb-1">Descrição</p>
            <p class="text-body-2">{{ process.description }}</p>
          </v-card-text>
        </v-card>

        <!-- ✅ Dados do Formulário COMPLETAMENTE REFATORADO -->
        <v-card v-if="process.formData || hasFormFieldFiles">
          <v-card-title>
            <v-icon class="mr-2">mdi-form-textbox</v-icon>
            Dados Informados
          </v-card-title>
          <v-divider />
          <v-list density="compact">
            <!-- ✅ Campos normais (não-arquivo) -->
            <v-list-item v-for="(value, key) in formattedFormData" :key="key">
              <v-list-item-title class="text-caption">{{ key }}</v-list-item-title>
              <v-list-item-subtitle>{{ value }}</v-list-item-subtitle>
            </v-list-item>
            
            <!-- ✅ Campos de arquivo - CORRIGIDO COMPLETAMENTE -->
            <template v-for="field in fileFields" :key="field.name">
              <!-- ✅ SUPORTE: Campo único -->
              <v-list-item v-if="getFieldFileData(field) && !Array.isArray(getFieldFileData(field))">
                <v-list-item-title class="text-caption">
                  {{ field.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="16" class="mr-2" :color="getFileTypeColor(getFieldFileData(field).mimeType)">
                      {{ getFileIcon(getFieldFileData(field).mimeType) }}
                    </v-icon>
                    <span class="file-link" @click="openAttachmentModal(field, 0)">
                      {{ field.label }}
                    </span>
                    <v-btn icon variant="text" size="x-small" class="ml-1" @click.stop="downloadFieldFile(field, 0)">
                      <v-icon size="16">mdi-download</v-icon>
                    </v-btn>
                    <v-chip size="x-small" class="ml-2" variant="tonal">
                      {{ formatFileSize(getFieldFileData(field).size) }}
                    </v-chip>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
              
              <!-- ✅ SUPORTE: Campo múltiplo -->
              <template v-else-if="Array.isArray(getFieldFileData(field))">
                <v-list-item v-for="(fileItem, index) in getFieldFileData(field)" :key="`${field.name}-${index}`">
                  <v-list-item-title class="text-caption">
                    {{ field.label }} ({{ index + 1 }})
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <div class="d-flex align-center">
                      <v-icon size="16" class="mr-2" :color="getFileTypeColor(fileItem.mimeType)">
                        {{ getFileIcon(fileItem.mimeType) }}
                      </v-icon>
                      <span class="file-link" @click="openAttachmentModal(field, index)">
                        {{ field.label }} ({{ index + 1 }})
                      </span>
                      <v-btn icon variant="text" size="x-small" class="ml-1" @click.stop="downloadFieldFile(field, index)">
                        <v-icon size="16">mdi-download</v-icon>
                      </v-btn>
                      <v-chip size="x-small" class="ml-2" variant="tonal">
                        {{ formatFileSize(fileItem.size) }}
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>  <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>

            <!-- ✅ NOVO: Seção especial se não há dados -->
            <v-list-item v-if="!process.formData && !hasFormFieldFiles">
              <v-list-item-title class="text-center text-medium-emphasis">
                <v-icon class="mr-2">mdi-information-outline</v-icon>
                Nenhum dado informado
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Timeline das Etapas -->
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-timeline</v-icon>
            Fluxo do Processo
          </v-card-title>
          <v-divider />

          <v-timeline side="end" density="comfortable" class="pa-4">
            <v-timeline-item v-for="(execution, index) in process.stepExecutions" :key="execution.id"
              :dot-color="getExecutionColor(execution)" :icon="getExecutionIcon(execution)"
              :size="execution.status === 'IN_PROGRESS' ? 'large' : 'default'"
              :line-color="execution.status === 'COMPLETED' ? 'success' : 'grey-lighten-2'">
              <template v-slot:opposite>
                <div class="text-caption">
                  <div class="font-weight-medium">Etapa {{ index + 1 }}</div>
                  <div v-if="execution.createdAt">{{ formatTimeAgo(execution.createdAt) }}</div>
                </div>
                <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>

              <v-card :color="execution.status === 'IN_PROGRESS' ? 'primary' : ''"
                :variant="execution.status === 'IN_PROGRESS' ? 'tonal' : 'outlined'"
                :elevation="execution.status === 'IN_PROGRESS' ? 4 : 1">
                <v-card-title class="text-h6 d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon :color="getStepTypeColor(execution.step.type)" class="mr-2" size="20">
                      {{ getStepTypeIcon(execution.step.type) }}
                    </v-icon>
                    {{ execution.step.name }}
                  </div>

                  <v-chip size="small" :color="getExecutionColor(execution)" variant="tonal">
                    {{ getExecutionStatusText(execution.status) }}
                  </v-chip>
                </v-card-title>

                <v-card-subtitle v-if="execution.step.description">
                  {{ execution.step.description }}
                </v-card-subtitle>

                <v-card-text>
                  <!-- Informações do Responsável -->
                  <div class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-2" color="primary">mdi-account-check</v-icon>
                    <span class="text-body-2">
                      <strong>Responsável:</strong> {{ getResponsibleName(execution) }}
                    </span>
                  </div>

                  <!-- Executor -->
                  <div v-if="execution.executor" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-2" color="success">mdi-account-edit</v-icon>
                    <span class="text-body-2">
                      <strong>Executado por:</strong> {{ execution.executor.name }}
                    </span>
                  </div>

                  <!-- Data de conclusão -->
                  <div v-if="execution.completedAt" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-2" color="info">mdi-clock-check</v-icon>
                    <span class="text-body-2">
                      <strong>Concluído em:</strong> {{ formatDate(execution.completedAt) }}
                    </span>
                  </div>

                  <!-- Ação tomada -->
                  <div v-if="execution.action" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-2" color="warning">mdi-gesture-tap</v-icon>
                    <span class="text-body-2">
                      <strong>Ação:</strong>
                      <v-chip size="x-small" class="ml-1">{{ execution.action }}</v-chip>
                    </span>
                  </div>

                  <!-- Comentário -->
                  <div v-if="execution.comment" class="mt-3">
                    <p class="text-caption text-medium-emphasis mb-1">
                      <v-icon size="16" class="mr-1">mdi-comment-text</v-icon>
                      Comentário:
                    </p>
                    <v-alert type="info" variant="tonal" density="compact">
                      {{ execution.comment }}
                    </v-alert>
                  </div>

                  

                  <!-- Indicadores especiais -->
                  <div v-if="execution.step.requiresSignature || execution.step.allowAttachment" class="mt-3">
                    <div class="d-flex flex-wrap gap-1">
                      <v-chip v-if="execution.step.requiresSignature" size="x-small" color="error" variant="tonal">
                        <v-icon start size="12">mdi-draw-pen</v-icon>
                        Requer Assinatura
                      </v-chip>
                      <v-chip v-if="execution.step.allowAttachment" size="x-small" color="info" variant="tonal">
                        <v-icon start size="12">mdi-paperclip</v-icon>
                        Permite Anexos
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>

                <!-- Actions para etapa em progresso -->
                <v-card-actions v-if="canExecuteStep(execution)">
                  <v-spacer />
                  <v-btn color="primary" variant="elevated" @click="executeStep(execution)">
                    <v-icon start>mdi-play</v-icon>
                    Executar Etapa
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-col>
    </v-row>

    <!-- ✅ Modal de anexos -->
    <AttachmentModal
      v-model="attachmentModal"
      :attachments="selectedAttachments"
    />
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="64" />
    <p class="text-body-2 text-grey mt-4">Carregando processo...</p>
  </div>

  <!-- Erro -->
  <div v-else class="text-center py-12">
    <v-icon size="64" color="error">mdi-alert-circle</v-icon>
    <p class="text-h6 mt-4 text-error">Processo não encontrado</p>
    <v-btn color="primary" @click="goBack" class="mt-4">
      <v-icon start>mdi-arrow-left</v-icon>
      Voltar
    </v-btn>
  </div>
  <!-- Modal de visualização de anexos -->
  <AttachmentModal
    v-model="modalOpen"
    :attachments="modalAttachments"
    :title="modalTitle"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import api from '@/services/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

// ✅ Importar componentes de anexos
import AttachmentButton from '@/components/AttachmentButton.vue'
import AttachmentModal from '@/components/AttachmentModal.vue'
import FieldFileModal from '@/components/FieldFileModal.vue'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processStore = useProcessStore()

// Estado
const attachmentModal = ref(false)
const selectedAttachments = ref([])
const fieldFileModal = ref(false)
const selectedFieldFile = ref(null)
const selectedField = ref(null)

// Computed
const loading = computed(() => processStore.loading)
const process = computed(() => processStore.currentProcess)

const currentStepExecution = computed(() => {
  if (!process.value) return null
  return process.value.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
})

const canExecuteCurrentStep = computed(() => {
  if (!currentStepExecution.value) return false
  return canExecuteStep(currentStepExecution.value)
})

const totalSteps = computed(() => {
  return process.value?.stepExecutions?.length || 0
})

const completedSteps = computed(() => {
  return process.value?.stepExecutions?.filter(se =>
    se.status === 'COMPLETED' || se.status === 'SKIPPED'
  ).length || 0
})

const progressPercentage = computed(() => {
  if (totalSteps.value === 0) return 0
  return Math.round((completedSteps.value / totalSteps.value) * 100)
})

const estimatedCompletion = computed(() => {
  if (!process.value || process.value.status === 'COMPLETED') return null

  const avgTimePerStep = 2 // dias por etapa (estimativa)
  const remainingSteps = totalSteps.value - completedSteps.value
  const estimatedDays = remainingSteps * avgTimePerStep

  return dayjs().add(estimatedDays, 'day').format('DD/MM/YYYY')
})

// ✅ COMPUTED COMPLETAMENTE REFATORADO para campos de arquivo
const fileFields = computed(() => {
  if (!process.value?.processType?.formFields) return []
  return process.value.processType.formFields.filter(field => field.type === 'FILE')
})

const hasFormFieldFiles = computed(() => {
  return fileFields.value.some(field => getFieldFileData(field) !== null)
})

const formattedFormData = computed(() => {
  if (!process.value?.formData) return {}

  const formatted = {}
  const formData = process.value.formData
  const formFields = process.value.processType?.formFields || []

  Object.keys(formData).forEach(key => {
    const field = formFields.find(f => f.name === key)
    const label = field?.label || key
    const value = formData[key]

    // ✅ CRÍTICO: Pular campos de arquivo (serão mostrados separadamente)
    if (field?.type === 'FILE') return

    if (value !== null && value !== undefined && value !== '') {
      formatted[label] = Array.isArray(value) ? value.join(', ') : value
    }
  })

  return formatted
})

// Métodos auxiliares
function getStatusColor(status) {
  const colors = {
    DRAFT: 'grey',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    REJECTED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rejeitado'
  }
  return texts[status] || status
}

function getExecutionColor(execution) {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    REJECTED: 'error',
    SKIPPED: 'grey'
  }
  return colors[execution.status] || 'grey'
}

function getExecutionIcon(execution) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check',
    REJECTED: 'mdi-close',
    SKIPPED: 'mdi-skip-next'
  }
  return icons[execution.status] || 'mdi-help'
}

function getExecutionStatusText(status) {
  const texts = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em Progresso',
    COMPLETED: 'Concluída',
    REJECTED: 'Rejeitada',
    SKIPPED: 'Pulada'
  }
  return texts[status] || status
}

function getStepTypeColor(type) {
  const colors = {
    INPUT: 'blue',
    APPROVAL: 'orange',
    UPLOAD: 'purple',
    REVIEW: 'teal',
    SIGNATURE: 'red'
  }
  return colors[type] || 'grey'
}

function getStepTypeIcon(type) {
  const icons = {
    INPUT: 'mdi-form-textbox',
    APPROVAL: 'mdi-check-decagram',
    UPLOAD: 'mdi-upload',
    REVIEW: 'mdi-eye-check',
    SIGNATURE: 'mdi-draw-pen'
  }
  return icons[type] || 'mdi-help-circle'
}

function getResponsibleName(execution) {
  if (execution.step.assignedToUser) {
    return execution.step.assignedToUser.name
  }
  if (execution.step.assignedToSector) {
    return `Setor ${execution.step.assignedToSector.name}`
  }
  return 'Não definido'
}

function getProgressColor() {
  const progress = progressPercentage.value
  if (progress === 100) return 'success'
  if (progress >= 75) return 'info'
  if (progress >= 50) return 'warning'
  return 'error'
}

function canExecuteStep(execution) {
  if (execution.status !== 'IN_PROGRESS') return false

  const user = authStore.user
  const step = execution.step

  // Verificar se é responsável direto
  if (step.assignedToUserId === user.id) return true

  // Verificar se pertence ao setor responsável
  if (step.assignedToSectorId && authStore.activeSectorId === step.assignedToSectorId) return true

  // Admin pode executar qualquer etapa
  if (authStore.isAdmin) return true

  return false
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function formatTimeAgo(date) {
  return dayjs(date).fromNow()
}



// ✅ Modal de visualização de anexos
const modalOpen = ref(false)
const modalTitle = ref('Anexos do Processo')
const modalAttachments = ref([])
// Opcional: índice inicial para navegação
const modalStartIndex = ref(0)

// Monta lista de anexos a partir de um campo específico
function buildAttachmentsForField(field) {
  const data = getFieldFileData(field)
  if (!data) return []
  const items = Array.isArray(data) ? data : [data]
  return items
    .filter(it => it && it.attachmentId)
    .map(it => ({
      id: it.attachmentId,
      originalName: it.originalName || 'Arquivo',
      mimeType: it.mimeType || 'application/octet-stream',
      size: it.size || 0,
      createdAt: it.createdAt || new Date().toISOString(),
      isSigned: Boolean(it.isSigned)
    }))
}

function openAttachmentModal(field, index = 0) {
  modalAttachments.value = buildAttachmentsForField(field)
  modalStartIndex.value = index
  modalTitle.value = `Anexos - ${field.label}`
  modalOpen.value = true
}
// ✅ MÉTODOS COMPLETAMENTE REFATORADOS para manipular arquivos dos campos
function getFieldFileData(field) {
  const formData = process.value?.formData
  if (!formData || !formData[field.name]) return null
  
  const fieldData = formData[field.name]
  
  // ✅ SUPORTE: Campo único (objeto AttachmentMeta)
  if (typeof fieldData === 'object' && !Array.isArray(fieldData) && fieldData.attachmentId) {
    return fieldData
  }
  
  // ✅ SUPORTE: Campo múltiplo (array de AttachmentMeta)
  if (Array.isArray(fieldData)) {
    return fieldData.filter(item => item && item.attachmentId)
  }
  
  // ✅ COMPATIBILIDADE: Se é string (ID direto - formato legado)
  if (typeof fieldData === 'string') {
    return {
      attachmentId: fieldData,
      originalName: `Arquivo de ${field.label}`,
      size: 0,
      mimeType: 'application/octet-stream'
    }
  }
  
  return null

}



// ✅ NOVO: Abrir modal específico para arquivo de campo
function openFieldFileModal(field, index = 0) {
  const fieldData = getFieldFileData(field)
  let fileData = fieldData
  
  // Se é array, pegar o item específico
  if (Array.isArray(fieldData)) {
    fileData = fieldData[index]
  }
  
  if (fileData?.attachmentId) {
    selectedFieldFile.value = fileData
    selectedField.value = field
    fieldFileModal.value = true
  }
}
async function downloadFieldFile(field, index = 0) {
  const fieldData = getFieldFileData(field)
  let fileData = fieldData
  
  // Se é array, pegar o item específico
  if (Array.isArray(fieldData)) {
    fileData = fieldData[index]
  }
  
  if (!fileData?.attachmentId) {
    window.showSnackbar?.('Arquivo não encontrado', 'error')
    return
  }
  
  try {
    console.log(`📥 Downloading field file: ${field.label} (index: ${index})`, fileData)
    
    const response = await api.get(`/processes/attachment/${fileData.attachmentId}/download`, {
      responseType: 'blob',
    })
  
    const blob = new Blob([response.data], { 
      type: fileData.mimeType || 'application/octet-stream' 
    })
    const url = window.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = fileData.originalName || `arquivo-${field.label.toLowerCase()}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  
    window.showSnackbar?.(`Download de "${fileData.originalName}" iniciado`, 'success')
  } catch (error) {
    console.error('Error downloading field file:', error)
    window.showSnackbar?.('Erro ao baixar arquivo', 'error')
  }

}

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

function getFileTypeColor(mimeType) {
  if (!mimeType) return 'grey'
  
  if (mimeType.includes('pdf')) return 'red'
  if (mimeType.includes('image')) return 'blue'
  if (mimeType.includes('word')) return 'indigo'
  if (mimeType.includes('excel')) return 'green'
  if (mimeType.includes('text')) return 'orange'
  
  return 'grey'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Métodos principais
function goBack() {
  router.push('/processes')
}

function executeCurrentStep() {
  if (currentStepExecution.value) {
    executeStep(currentStepExecution.value)
  }
}

function executeStep(execution) {
  router.push(`/processes/${process.value.id}/execute/${execution.id}`)
}

async function refreshProcess() {
  try {
    await processStore.fetchProcess(route.params.id)
    window.showSnackbar?.('Processo atualizado!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao atualizar processo', 'error')
  }
}

onMounted(async () => {
  console.log('Loading process:', route.params.id)
  try {
    await processStore.fetchProcess(route.params.id)
  } catch (error) {
    console.error('Error loading process:', error)
    window.showSnackbar?.('Erro ao carregar processo', 'error')
  }
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.v-timeline-item {
  padding-bottom: 24px;
}

.max-width{
  max-width: 610px;
}

/* ✅ Estilos para links de arquivo */
.file-link {
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s ease;
}

.file-link:hover {
  text-decoration-color: rgb(var(--v-theme-primary));
}
</style>