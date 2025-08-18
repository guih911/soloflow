<template>
  <div v-if="stepExecution && process" class="step-execution-container">
    <!-- ✅ HEADER PROFISSIONAL -->
    <div class="execution-header mb-8">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-4" size="large" />
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <v-avatar 
              :color="getStepTypeColor(stepExecution.step.type)" 
              size="56" 
              class="mr-4 step-avatar"
            >
              <v-icon size="28" color="white">
                {{ getStepTypeIcon(stepExecution.step.type) }}
              </v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h4 font-weight-bold text-primary">
                {{ stepExecution.step.name }}
              </h1>
              <p class="text-h6 text-medium-emphasis">
                {{ process.code }} - {{ process.title }}
              </p>
            </div>
          </div>
          
          <!-- Step Info Chips -->
          <div class="d-flex flex-wrap gap-2 mt-3">
            <v-chip size="small" :color="getStepTypeColor(stepExecution.step.type)" variant="tonal">
              <v-icon start size="16">{{ getStepTypeIcon(stepExecution.step.type) }}</v-icon>
              {{ getStepTypeText(stepExecution.step.type) }}
            </v-chip>
            
            <v-chip v-if="stepExecution.step.requiresSignature" size="small" color="error" variant="tonal">
              <v-icon start size="16">mdi-draw-pen</v-icon>
              Requer Assinatura
            </v-chip>
            
            <v-chip v-if="stepExecution.step.allowAttachment" size="small" color="info" variant="tonal">
              <v-icon start size="16">mdi-paperclip</v-icon>
              Permite Anexos
            </v-chip>
            
            <v-chip size="small" color="primary" variant="outlined">
              <v-icon start size="16">mdi-account-check</v-icon>
              {{ getResponsibleName(stepExecution) }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <v-row>
      <!-- ✅ FORMULÁRIO DE EXECUÇÃO PRINCIPAL -->
      <v-col cols="12" lg="8">
        <v-card class="execution-form-card mb-6" elevation="4">
          <!-- Card Header -->
          <div class="form-card-header pa-6">
            <div class="d-flex align-center">
              <v-icon color="primary" size="32" class="mr-3">mdi-clipboard-edit</v-icon>
              <div>
                <h2 class="text-h5 font-weight-bold">Executar Etapa</h2>
                <p class="text-body-1 text-medium-emphasis mt-1">
                  Preencha as informações necessárias para concluir esta etapa
                </p>
              </div>
            </div>
          </div>
          
          <v-divider />

          <!-- Card Content -->
          <div class="form-card-content pa-6">
            <!-- Descrição da Etapa -->
            <v-alert
              v-if="stepExecution.step.description"
              type="info"
              variant="tonal"
              class="mb-6"
              rounded="lg"
            >
              <v-icon start>mdi-information</v-icon>
              <div class="ml-2">
                <div class="font-weight-medium mb-1">Instruções da Etapa</div>
                <div>{{ stepExecution.step.description }}</div>
              </div>
            </v-alert>

            <!-- Formulário Principal -->
            <v-form ref="form" v-model="valid" class="execution-form">
              <!-- Seção de Ações -->
              <div v-if="availableActions.length > 0" class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-gesture-tap</v-icon>
                    Ação a Executar
                  </h3>
                  <p class="text-body-2 text-medium-emphasis">
                    Selecione a ação que deseja executar nesta etapa
                  </p>
                </div>
                
                <v-card variant="outlined" class="action-selection-card">
                  <v-card-text class="pa-4">
                    <v-radio-group
                      v-model="formData.action"
                      :rules="[v => !!v || 'Selecione uma ação']"
                      class="action-radio-group"
                    >
                      <div class="actions-grid">
                        <v-card
                          v-for="action in availableActions"
                          :key="action"
                          class="action-option"
                          :class="{ 'action-selected': formData.action === action }"
                          variant="outlined"
                          @click="formData.action = action"
                        >
                          <v-card-text class="pa-4 text-center">
                            <v-radio :value="action" class="mb-2" />
                            <div class="action-label">{{ getActionLabel(action) }}</div>
                            <div class="action-description">{{ getActionDescription(action) }}</div>
                          </v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Seção de Comentário -->
              <div class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-comment-edit</v-icon>
                    Comentário
                    <v-chip 
                      v-if="isCommentRequired" 
                      size="x-small" 
                      color="error" 
                      class="ml-2"
                    >
                      Obrigatório
                    </v-chip>
                  </h3>
                  <p class="text-body-2 text-medium-emphasis">
                    {{ isCommentRequired ? 'Adicione um comentário sobre sua decisão' : 'Comentário opcional sobre esta etapa' }}
                  </p>
                </div>
                
                <v-textarea
                  v-model="formData.comment"
                  label="Seu comentário sobre esta etapa"
                  placeholder="Descreva sua análise, observações ou justificativa para a ação tomada..."
                  rows="4"
                  counter="1000"
                  :rules="isCommentRequired ? [v => !!v || 'Comentário é obrigatório'] : []"
                  variant="outlined"
                  class="comment-textarea"
                />
              </div>

              <!-- Seção de Anexos -->
              <div v-if="stepExecution.step.allowAttachment" class="form-section">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-paperclip</v-icon>
                    Anexos
                    <v-chip 
                      v-if="stepExecution.step.requireAttachment" 
                      size="x-small" 
                      color="error" 
                      class="ml-2"
                    >
                      Obrigatório
                    </v-chip>
                  </h3>
                  <p class="text-body-2 text-medium-emphasis">
                    {{ stepExecution.step.requireAttachment 
                       ? 'Esta etapa requer pelo menos um anexo' 
                       : 'Anexe documentos relacionados a esta etapa' }}
                  </p>
                </div>

                <!-- Upload Area -->
                <v-card variant="outlined" class="attachment-upload-area mb-4">
                  <v-card-text class="pa-6 text-center">
                    <v-btn
                      size="large"
                      color="primary"
                      variant="tonal"
                      @click="$refs.fileInput.click()"
                      class="upload-button"
                    >
                      <v-icon start size="24">mdi-cloud-upload</v-icon>
                      Selecionar Arquivos
                    </v-btn>
                    
                    <input
                      ref="fileInput"
                      type="file"
                      style="display: none"
                      multiple
                      @change="handleFileSelect"
                      :accept="allowedFileTypes"
                    />
                    
                    <div class="upload-help mt-4">
                      <p class="text-body-2 text-medium-emphasis">
                        Arraste arquivos aqui ou clique para selecionar
                      </p>
                      <p class="text-caption text-medium-emphasis">
                        Formatos aceitos: PDF, Imagens, Word, Excel (máx. 10MB cada)
                      </p>
                    </div>
                  </v-card-text>
                </v-card>

                <!-- Lista de Anexos -->
                <div v-if="attachments.length > 0" class="attachments-list">
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1 pa-4">
                      <v-icon class="mr-2">mdi-attachment</v-icon>
                      Arquivos Anexados ({{ attachments.length }})
                    </v-card-title>
                    <v-divider />
                    
                    <v-list class="pa-0">
                      <v-list-item
                        v-for="(file, index) in attachments"
                        :key="index"
                        class="attachment-item"
                      >
                        <template v-slot:prepend>
                          <v-avatar :color="getFileTypeColor(file.type)" size="40">
                            <v-icon size="20" color="white">{{ getFileIcon(file.type) }}</v-icon>
                          </v-avatar>
                        </template>

                        <v-list-item-title class="font-weight-medium">
                          {{ file.name }}
                        </v-list-item-title>
                        
                        <v-list-item-subtitle>
                          <div class="d-flex align-center">
                            <span>{{ formatFileSize(file.size) }}</span>
                            <v-chip 
                              v-if="file.signed" 
                              size="x-small" 
                              color="success" 
                              class="ml-2"
                            >
                              <v-icon start size="12">mdi-check-decagram</v-icon>
                              Assinado
                            </v-chip>
                          </div>
                        </v-list-item-subtitle>

                        <template v-slot:append>
                          <div class="attachment-actions">
                            <v-btn
                              v-if="stepExecution.step.requiresSignature && file.type === 'application/pdf' && !file.signed"
                              icon="mdi-draw-pen"
                              size="small"
                              variant="tonal"
                              color="primary"
                              @click="openSignatureDialog(file, index)"
                              class="mr-2"
                            >
                              <v-tooltip activator="parent">Assinar Documento</v-tooltip>
                            </v-btn>
                            
                            <v-btn
                              icon="mdi-delete"
                              size="small"
                              variant="text"
                              color="error"
                              @click="removeFile(index)"
                            >
                              <v-tooltip activator="parent">Remover Arquivo</v-tooltip>
                            </v-btn>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card>
                </div>

                <!-- Alert de Assinatura -->
                <v-alert
                  v-if="stepExecution.step.requiresSignature"
                  type="warning"
                  variant="tonal"
                  class="mt-4"
                  rounded="lg"
                >
                  <v-icon start>mdi-draw-pen</v-icon>
                  <div class="ml-2">
                    <div class="font-weight-medium">Assinatura Digital Obrigatória</div>
                    <div class="mt-1">Todos os documentos PDF devem ser assinados digitalmente antes de concluir a etapa</div>
                  </div>
                </v-alert>
              </div>
            </v-form>
          </div>

          <!-- Card Actions -->
          <v-divider />
          
          <div class="form-card-actions pa-6">
            <div class="d-flex align-center justify-space-between">
              <div class="execution-status">
                <v-icon color="info" class="mr-2">mdi-information</v-icon>
                <span class="text-body-2 text-medium-emphasis">
                  {{ getExecutionStatusMessage() }}
                </span>
              </div>
              
              <div class="action-buttons">
                <v-btn
                  variant="text"
                  size="large"
                  @click="goBack"
                  class="mr-3"
                >
                  <v-icon start>mdi-arrow-left</v-icon>
                  Cancelar
                </v-btn>
                
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="large"
                  :loading="saving"
                  :disabled="!canSubmit"
                  @click="executeStep"
                  class="execute-btn"
                >
                  <v-icon start>mdi-check-circle</v-icon>
                  Concluir Etapa
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- ✅ SIDEBAR COM INFORMAÇÕES CONTEXTUAIS -->
      <v-col cols="12" lg="4">
        <!-- Informações da Etapa -->
        <v-card class="info-card mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon color="primary" class="mr-2">mdi-information-outline</v-icon>
            Detalhes da Etapa
          </v-card-title>
          <v-divider />
          
          <v-card-text class="pa-0">
            <v-list density="comfortable">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-format-title</v-icon>
                </template>
                <v-list-item-title>Nome</v-list-item-title>
                <v-list-item-subtitle>{{ stepExecution.step.name }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-shape</v-icon>
                </template>
                <v-list-item-title>Tipo</v-list-item-title>
                <v-list-item-subtitle>{{ getStepTypeText(stepExecution.step.type) }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-account-check</v-icon>
                </template>
                <v-list-item-title>Responsável</v-list-item-title>
                <v-list-item-subtitle>{{ getResponsibleName(stepExecution) }}</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-calendar</v-icon>
                </template>
                <v-list-item-title>Iniciada em</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(stepExecution.createdAt) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Histórico do Processo -->
        <v-card class="history-card" elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon color="primary" class="mr-2">mdi-history</v-icon>
            Histórico
          </v-card-title>
          <v-divider />
          
          <div class="history-content" style="max-height: 400px; overflow-y: auto;">
            <v-list density="comfortable" class="pa-0">
              <v-list-item
                v-for="execution in completedExecutions"
                :key="execution.id"
                class="history-item"
              >
                <template v-slot:prepend>
                  <v-avatar size="32" :color="getExecutionColor(execution)">
                    <v-icon size="16" color="white">{{ getExecutionIcon(execution) }}</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ execution.step.name }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <div class="text-caption">
                    <div>{{ execution.executor?.name || 'Sistema' }}</div>
                    <div>{{ formatTimeAgo(execution.completedAt) }}</div>
                    <div v-if="execution.action" class="mt-1">
                      <v-chip size="x-small" variant="tonal">{{ execution.action }}</v-chip>
                    </div>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item v-if="completedExecutions.length === 0" class="text-center">
                <v-list-item-title class="text-medium-emphasis">
                  <v-icon class="mr-2">mdi-information-outline</v-icon>
                  Nenhuma etapa concluída ainda
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ✅ DIALOG DE ASSINATURA DIGITAL PROFISSIONAL -->
    <v-dialog v-model="signatureDialog" max-width="700" persistent>
      <v-card class="signature-dialog-card" rounded="lg">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon color="primary" size="32" class="mr-3">mdi-draw-pen</v-icon>
          <div>
            <h3 class="text-h5 font-weight-bold">Assinatura Digital</h3>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Assine digitalmente o documento: <strong>{{ signingFile?.name }}</strong>
            </p>
          </div>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-6">
          <v-tabs v-model="signatureTab" class="mb-6">
            <v-tab value="draw">
              <v-icon start>mdi-gesture</v-icon>
              Desenhar Assinatura
            </v-tab>
            <v-tab value="text">
              <v-icon start>mdi-format-text</v-icon>
              Assinatura Textual
            </v-tab>
          </v-tabs>

          <v-window v-model="signatureTab">
            <!-- Assinatura por Desenho -->
            <v-window-item value="draw">
              <v-card variant="outlined" class="signature-canvas-container">
                <v-card-text class="pa-4 text-center">
                  <canvas
                    ref="signaturePad"
                    class="signature-canvas"
                    width="600"
                    height="250"
                  />
                  <v-btn
                    size="small"
                    variant="text"
                    color="error"
                    @click="clearSignature"
                    class="mt-3"
                  >
                    <v-icon start>mdi-eraser</v-icon>
                    Limpar Assinatura
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Assinatura por Texto -->
            <v-window-item value="text">
              <v-text-field
                v-model="textSignature"
                label="Digite seu nome completo"
                placeholder="João Silva"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                class="mb-4"
              />
              
              <v-card
                v-if="textSignature"
                variant="outlined"
                class="text-signature-preview"
              >
                <v-card-text class="text-center pa-6">
                  <div class="signature-preview-text">{{ textSignature }}</div>
                  <div class="signature-preview-date">{{ new Date().toLocaleString('pt-BR') }}</div>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>

          <v-alert type="info" variant="tonal" class="mt-6" rounded="lg">
            <v-icon start>mdi-shield-check</v-icon>
            <div class="ml-2">
              <div class="font-weight-medium">Compromisso Legal</div>
              <div class="mt-1">
                Ao assinar, você confirma que leu e concorda com o conteúdo do documento.
                Data e hora serão registradas automaticamente.
              </div>
            </div>
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn
            variant="text"
            size="large"
            @click="closeSignatureDialog"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :disabled="!hasSignature"
            @click="applySignature"
          >
            <v-icon start>mdi-check-circle</v-icon>
            Confirmar Assinatura
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <!-- Loading State -->
  <div v-else-if="loading" class="loading-container">
    <div class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" width="6" />
      <p class="text-h6 mt-4 text-medium-emphasis">Carregando etapa...</p>
      <p class="text-body-2 text-grey">Preparando ambiente de execução</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()

// Estado
const valid = ref(false)
const saving = ref(false)
const attachments = ref([])
const uploadedAttachments = ref([])
const signatureDialog = ref(false)
const signatureTab = ref('draw')
const signingFile = ref(null)
const signingFileIndex = ref(null)
const textSignature = ref('')
const signaturePadContext = ref(null)

const form = ref(null)
const fileInput = ref(null)
const signaturePad = ref(null)

const formData = ref({
  action: null,
  comment: '',
  metadata: {}
})

// Computed
const loading = computed(() => processStore.loading)
const process = computed(() => processStore.currentProcess)

const stepExecution = computed(() => {
  if (!process.value) return null
  return process.value.stepExecutions.find(se => se.id === route.params.stepId)
})

const availableActions = computed(() => {
  if (!stepExecution.value?.step.actions) return []
  try {
    const actions = JSON.parse(stepExecution.value.step.actions)
    return Array.isArray(actions) ? actions : []
  } catch {
    return []
  }
})

const completedExecutions = computed(() => {
  if (!process.value) return []
  return process.value.stepExecutions.filter(e => e.status === 'COMPLETED')
})

const isCommentRequired = computed(() => {
  return stepExecution.value?.step.type === 'INPUT' || 
         stepExecution.value?.step.type === 'APPROVAL'
})

const allowedFileTypes = computed(() => {
  const types = stepExecution.value?.step.allowedFileTypes
  if (types && types.length > 0) {
    try {
      const parsed = JSON.parse(types)
      return Array.isArray(parsed) ? parsed.join(',') : types
    } catch {
      return types
    }
  }
  return '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
})

const canSubmit = computed(() => {
  if (!valid.value) return false
  
  // Verificar anexos obrigatórios
  if (stepExecution.value?.step.requireAttachment && attachments.value.length === 0) {
    return false
  }
  
  // Verificar assinaturas obrigatórias
  if (stepExecution.value?.step.requiresSignature) {
    const pdfs = attachments.value.filter(f => f.type === 'application/pdf')
    if (pdfs.length > 0 && !pdfs.every(f => f.signed)) {
      return false
    }
  }
  
  return true
})

const hasSignature = computed(() => {
  if (signatureTab.value === 'draw') {
    return signaturePadContext.value && !isCanvasEmpty()
  }
  return textSignature.value.trim().length > 0
})

// Métodos auxiliares
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

function getStepTypeText(type) {
  const texts = {
    INPUT: 'Entrada de Dados',
    APPROVAL: 'Aprovação',
    UPLOAD: 'Upload de Arquivo',
    REVIEW: 'Revisão',
    SIGNATURE: 'Assinatura'
  }
  return texts[type] || type
}

function getActionLabel(action) {
  const labels = {
    aprovar: 'Aprovar',
    rejeitar: 'Rejeitar',
    enviar: 'Enviar',
    devolver: 'Devolver',
    aceitar: 'Aceitar',
    recusar: 'Recusar',
    continuar: 'Continuar',
    finalizar: 'Finalizar'
  }
  return labels[action.toLowerCase()] || action
}

function getActionDescription(action) {
  const descriptions = {
    aprovar: 'Aprovar e avançar para próxima etapa',
    rejeitar: 'Rejeitar e devolver para etapa anterior',
    enviar: 'Enviar para próxima etapa',
    devolver: 'Devolver para correções',
    aceitar: 'Aceitar as informações fornecidas',
    recusar: 'Recusar e solicitar alterações',
    continuar: 'Continuar o fluxo do processo',
    finalizar: 'Finalizar esta etapa'
  }
  return descriptions[action.toLowerCase()] || 'Executar esta ação'
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

function getFileIcon(type) {
  if (type.includes('pdf')) return 'mdi-file-pdf-box'
  if (type.includes('image')) return 'mdi-file-image'
  if (type.includes('word')) return 'mdi-file-word'
  if (type.includes('excel')) return 'mdi-file-excel'
  return 'mdi-file'
}

function getFileTypeColor(type) {
  if (type.includes('pdf')) return 'red'
  if (type.includes('image')) return 'blue'
  if (type.includes('word')) return 'indigo'
  if (type.includes('excel')) return 'green'
  return 'grey'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function formatTimeAgo(date) {
  return dayjs(date).fromNow()
}

function getExecutionStatusMessage() {
  const totalAttachments = attachments.value.length
  const signedAttachments = attachments.value.filter(f => f.signed).length
  const requiresSignature = stepExecution.value?.step.requiresSignature
  
  if (requiresSignature && totalAttachments > 0) {
    return `${signedAttachments}/${totalAttachments} documentos assinados`
  }
  
  if (totalAttachments > 0) {
    return `${totalAttachments} arquivo(s) anexado(s)`
  }
  
  return 'Preencha as informações necessárias'
}

// Métodos de manipulação de arquivos
async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  
  for (const file of files) {
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      window.showSnackbar?.(`Arquivo ${file.name} muito grande (máx: 10MB)`, 'error')
      continue
    }
    
    // Validar tipo se especificado
    if (allowedFileTypes.value !== '*') {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase()
      const allowedExts = allowedFileTypes.value.split(',').map(t => t.trim())
      
      if (!allowedExts.includes(file.type) && !allowedExts.includes(fileExt)) {
        window.showSnackbar?.(`Tipo de arquivo ${file.name} não permitido`, 'error')
        continue
      }
    }
    
    attachments.value.push({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      signed: false,
      id: Date.now() + Math.random()
    })
  }
  
  // Limpar input
  event.target.value = ''
  
  if (files.length > 0) {
    window.showSnackbar?.(`${files.length} arquivo(s) adicionado(s)`, 'success')
  }
}

function removeFile(index) {
  const fileName = attachments.value[index].name
  attachments.value.splice(index, 1)
  window.showSnackbar?.(`Arquivo "${fileName}" removido`, 'info')
}

// Métodos de assinatura digital
function openSignatureDialog(file, index) {
  signingFile.value = file
  signingFileIndex.value = index
  signatureDialog.value = true
  textSignature.value = ''
  
  nextTick(() => {
    if (signaturePad.value) {
      setupSignaturePad()
    }
  })
}

function setupSignaturePad() {
  const canvas = signaturePad.value
  signaturePadContext.value = canvas.getContext('2d')
  
  // Configurar canvas
  signaturePadContext.value.strokeStyle = '#1976D2'
  signaturePadContext.value.lineWidth = 3
  signaturePadContext.value.lineCap = 'round'
  signaturePadContext.value.lineJoin = 'round'
  
  // Adicionar fundo branco
  signaturePadContext.value.fillStyle = '#ffffff'
  signaturePadContext.value.fillRect(0, 0, canvas.width, canvas.height)
  
  let isDrawing = false
  let lastPoint = null
  
  // Mouse events
  canvas.addEventListener('mousedown', startDrawing)
  canvas.addEventListener('mousemove', draw)
  canvas.addEventListener('mouseup', stopDrawing)
  canvas.addEventListener('mouseout', stopDrawing)
  
  // Touch events para mobile
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
  canvas.addEventListener('touchend', stopDrawing)
  
  function startDrawing(e) {
    isDrawing = true
    const rect = canvas.getBoundingClientRect()
    lastPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    signaturePadContext.value.beginPath()
    signaturePadContext.value.moveTo(lastPoint.x, lastPoint.y)
  }
  
  function draw(e) {
    if (!isDrawing) return
    
    const rect = canvas.getBoundingClientRect()
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    
    signaturePadContext.value.lineTo(currentPoint.x, currentPoint.y)
    signaturePadContext.value.stroke()
    
    lastPoint = currentPoint
  }
  
  function stopDrawing() {
    isDrawing = false
    signaturePadContext.value.closePath()
  }
  
  function handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
  }
  
  function handleTouchMove(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent)
  }
}

function closeSignatureDialog() {
  signatureDialog.value = false
  signingFile.value = null
  signingFileIndex.value = null
  textSignature.value = ''
  clearSignature()
}

function clearSignature() {
  if (signaturePadContext.value && signaturePad.value) {
    const canvas = signaturePad.value
    signaturePadContext.value.clearRect(0, 0, canvas.width, canvas.height)
    // Restaurar fundo branco
    signaturePadContext.value.fillStyle = '#ffffff'
    signaturePadContext.value.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function isCanvasEmpty() {
  if (!signaturePad.value) return true
  
  const canvas = signaturePad.value
  const context = canvas.getContext('2d')
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  
  // Verificar se há pixels diferentes do branco
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    const a = imageData.data[i + 3]
    
    // Se encontrar pixel não branco ou transparente
    if (a > 0 && (r < 255 || g < 255 || b < 255)) {
      return false
    }
  }
  
  return true
}

async function applySignature() {
  if (!hasSignature.value) return
  
  try {
    // Marcar arquivo como assinado
    attachments.value[signingFileIndex.value].signed = true
    attachments.value[signingFileIndex.value].signatureData = {
      type: signatureTab.value,
      data: signatureTab.value === 'draw' 
        ? signaturePad.value.toDataURL('image/png') 
        : textSignature.value,
      timestamp: new Date().toISOString()
    }
    
    window.showSnackbar?.('Documento assinado com sucesso!', 'success')
    closeSignatureDialog()
  } catch (error) {
    console.error('Error applying signature:', error)
    window.showSnackbar?.('Erro ao aplicar assinatura', 'error')
  }
}

// Métodos principais
function goBack() {
  router.push(`/processes/${route.params.id}`)
}

async function executeStep() {
  if (!valid.value || !canSubmit.value) {
    window.showSnackbar?.('Por favor, corrija os erros antes de continuar', 'warning')
    return
  }
  
  saving.value = true
  
  try {
    // Upload de arquivos primeiro
    for (const attachment of attachments.value) {
      const uploaded = await processStore.uploadAttachment(
        attachment.file,
        stepExecution.value.id
      )
      uploadedAttachments.value.push(uploaded)
      
      // Se o arquivo foi assinado, enviar assinatura
      if (attachment.signed && attachment.signatureData) {
        await processStore.signAttachment(uploaded.id, attachment.signatureData)
      }
    }
    
    // Executar etapa
    await processStore.executeStep({
      stepExecutionId: stepExecution.value.id,
      processInstanceId: process.value.id,
      action: formData.value.action,
      comment: formData.value.comment.trim(),
      metadata: formData.value.metadata
    })
    
    window.showSnackbar?.('Etapa concluída com sucesso! 🎉', 'success')
    
    // Aguardar um pouco para mostrar o feedback
    setTimeout(() => {
      router.push(`/processes/${route.params.id}`)
    }, 1000)
    
  } catch (error) {
    console.error('Error executing step:', error)
    window.showSnackbar?.(error.message || 'Erro ao executar etapa', 'error')
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await processStore.fetchProcess(route.params.id)
    
    // Se a etapa tem apenas uma ação, selecionar automaticamente
    if (availableActions.value.length === 1) {
      formData.value.action = availableActions.value[0]
    }
    
    console.log('Step execution loaded:', stepExecution.value?.step.name)
  } catch (error) {
    console.error('Error loading step execution:', error)
    window.showSnackbar?.('Erro ao carregar etapa', 'error')
  }
})
</script>

<style scoped>
/* ✅ ESTILOS PROFISSIONAIS PARA EXECUÇÃO DE ETAPA */
.step-execution-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

.execution-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(66, 165, 245, 0.04));
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  backdrop-filter: blur(10px);
}

.step-avatar {
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.9);
}

/* Cards */
.execution-form-card,
.info-card,
.history-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.form-card-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(66, 165, 245, 0.03));
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
}

.form-card-content {
  background: white;
}

.form-card-actions {
  background: rgba(25, 118, 210, 0.02);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* Form Sections */
.form-section {
  margin-bottom: 32px;
}

.section-header h3 {
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 8px;
}

.section-header p {
  margin: 0;
}

/* Action Selection */
.action-selection-card {
  border-radius: 12px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.action-option {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.08);
}

.action-option:hover {
  border-color: rgba(25, 118, 210, 0.3);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
  transform: translateY(-2px);
}

.action-option.action-selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(25, 118, 210, 0.04);
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.2);
}

.action-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 4px;
}

.action-description {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

/* Comment Textarea */
.comment-textarea {
  background: rgba(25, 118, 210, 0.02);
}

/* Upload Area */
.attachment-upload-area {
  border: 2px dashed rgba(25, 118, 210, 0.3);
  border-radius: 16px;
  background: rgba(25, 118, 210, 0.02);
  transition: all 0.3s ease;
}

.attachment-upload-area:hover {
  border-color: rgba(25, 118, 210, 0.5);
  background: rgba(25, 118, 210, 0.04);
}

.upload-button {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  padding: 16px 32px;
}

.upload-help {
  max-width: 400px;
  margin: 0 auto;
}

/* Attachments List */
.attachments-list {
  margin-top: 16px;
}

.attachment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease;
}

.attachment-item:hover {
  background: rgba(25, 118, 210, 0.02);
}

.attachment-item:last-child {
  border-bottom: none;
}

.attachment-actions {
  display: flex;
  gap: 8px;
}

/* Execute Button */
.execute-btn {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.25px;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  padding: 16px 32px;
}

.execute-btn:hover {
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
  transform: translateY(-1px);
}

/* History */
.history-content {
  background: rgba(25, 118, 210, 0.01);
}

.history-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background: rgba(25, 118, 210, 0.02);
}

.history-item:last-child {
  border-bottom: none;
}

/* Signature Dialog */
.signature-dialog-card {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.signature-canvas-container {
  border-radius: 12px;
  background: #fafafa;
}

.signature-canvas {
  border: 2px solid rgba(25, 118, 210, 0.2);
  border-radius: 8px;
  background: white;
  cursor: crosshair;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.text-signature-preview {
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  border: 2px solid rgba(25, 118, 210, 0.2);
}

.signature-preview-text {
  font-family: 'Brush Script MT', 'Segoe UI', cursive;
  font-size: 32px;
  font-weight: bold;
  color: #1976D2;
  margin-bottom: 8px;
}

.signature-preview-date {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  font-family: monospace;
}

/* Loading */
.loading-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .step-execution-container {
    padding: 0 12px;
  }
  
  .execution-header {
    padding: 20px;
  }
  
  .form-card-header,
  .form-card-content,
  .form-card-actions {
    padding: 20px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  
  .execution-status {
    margin-bottom: 16px;
  }
  
  .signature-canvas {
    width: 100%;
    height: 200px;
  }
}

/* Smooth transitions */
.v-card,
.v-btn,
.v-chip {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar */
.history-content::-webkit-scrollbar {
  width: 6px;
}

.history-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.history-content::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.3);
  border-radius: 3px;
}

.history-content::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.5);
}
</style>