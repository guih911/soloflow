<!-- StepExecution.vue - CORREÇÃO COMPLETA -->

<template>
  <div v-if="stepExecution && process" class="step-execution-container">
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
      <v-col cols="12" lg="8">
        <v-card class="execution-form-card mb-6" elevation="4">
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

          <div class="form-card-content pa-6">
            <!-- ✅ INSTRUÇÕES DA ETAPA - MELHORADO -->
            <v-alert
              v-if="stepExecution.step.instructions"
              type="info"
              variant="tonal"
              class="mb-6 instructions-alert"
              rounded="lg"
            >
              <template v-slot:prepend>
                <v-icon color="info" size="24">mdi-lightbulb</v-icon>
              </template>
              
              <div class="instructions-content">
                <div class="instructions-header d-flex align-center justify-space-between mb-3">
                  <h3 class="text-h6 font-weight-bold text-info">
                    <v-icon class="mr-2" size="20">mdi-clipboard-text</v-icon>
                    Instruções para Execução
                  </h3>
                  <v-btn 
                    :icon="instructionsExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    variant="text"
                    size="small"
                    @click="toggleInstructions"
                  />
                </div>
                
                <v-expand-transition>
                  <div v-show="instructionsExpanded" class="instructions-text">
                    <div class="formatted-instructions" v-html="formatInstructions(stepExecution.step.instructions)"></div>
                  </div>
                </v-expand-transition>
                
                <div v-if="!instructionsExpanded" class="instructions-preview">
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ getInstructionsPreview(stepExecution.step.instructions) }}
                    <v-btn 
                      variant="text" 
                      size="small" 
                      @click="toggleInstructions"
                      class="ml-2 pa-0"
                      style="min-width: auto;"
                    >
                      Ver mais
                    </v-btn>
                  </p>
                </div>
              </div>
            </v-alert>

            <!-- ✅ DESCRIÇÃO DA ETAPA - MELHORADO -->
            <v-alert
              v-if="stepExecution.step.description"
              type="success"
              variant="tonal"
              class="mb-6 description-alert"
              rounded="lg"
            >
              <template v-slot:prepend>
                <v-icon color="success" size="20">mdi-information</v-icon>
              </template>
              
              <div class="description-content">
                <div class="font-weight-medium mb-2 text-success"><strong>Orieções para esta Etapa:</strong> {{ stepExecution.step.description }}</div>
                <div class="text-body-1"></div>
              </div>
            </v-alert>

            <!-- SLA Status -->
            <v-alert
              v-if="slaStatus.isOverdue"
              type="error"
              variant="tonal"
              class="mb-6"
              rounded="lg"
            >
              <v-icon start>mdi-clock-alert</v-icon>
              <div class="ml-2">
                <div class="font-weight-medium mb-1">⚠️ Etapa em Atraso</div>
                <div>Prazo venceu {{ slaStatus.overdueText }}. Tempo limite: {{ slaStatus.deadline }}</div>
              </div>
            </v-alert>

            <v-alert
              v-else-if="slaStatus.hasDeadline && slaStatus.isNearDeadline"
              type="warning"
              variant="tonal"
              class="mb-6"
              rounded="lg"
            >
              <v-icon start>mdi-clock-outline</v-icon>
              <div class="ml-2">
                <div class="font-weight-medium mb-1">Prazo Próximo do Vencimento</div>
                <div>Tempo restante: {{ slaStatus.remainingText }}. Prazo: {{ slaStatus.deadline }}</div>
              </div>
            </v-alert>

            <v-form ref="form" v-model="valid" class="execution-form">
              <!-- ✅ APROVAÇÃO - TIPO ESPECIAL -->
              <div v-if="stepExecution.step.type === 'APPROVAL'" class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center">
                    <v-icon color="orange" class="mr-2">mdi-check-decagram</v-icon>
                    Decisão de Aprovação
                  </h3>
                  <p class="text-body-2 text-medium-emphasis">
                    Analise as informações e tome sua decisão
                  </p>
                </div>
                
                <v-card variant="outlined" class="approval-decision-card">
                  <v-card-text class="pa-4">
                    <v-radio-group
                      v-model="formData.action"
                      :rules="[v => !!v || 'Selecione uma decisão']"
                      class="approval-radio-group"
                    >
                      <div class="approval-options">
                        <v-card
                          class="approval-option approval-approve"
                          :class="{ 'approval-selected': formData.action === 'aprovar' }"
                          variant="outlined"
                          @click="formData.action = 'aprovar'"
                        >
                          <v-card-text class="pa-4 text-center">
                            <v-radio value="aprovar" class="mb-2" />
                            <v-icon size="32" color="success" class="mb-2">mdi-check-circle</v-icon>
                            <div class="approval-label text-success">Aprovar</div>
                            <div class="approval-description">Aprovar e avançar para próxima etapa</div>
                          </v-card-text>
                        </v-card>
                        
                        <v-card
                          class="approval-option approval-reject"
                          :class="{ 'approval-selected': formData.action === 'reprovar' }"
                          variant="outlined"
                          @click="formData.action = 'reprovar'"
                        >
                          <v-card-text class="pa-4 text-center">
                            <v-radio value="reprovar" class="mb-2" />
                            <v-icon size="32" color="error" class="mb-2">mdi-close-circle</v-icon>
                            <div class="approval-label text-error">Reprovar</div>
                            <div class="approval-description">Reprovar e encerrar processo</div>
                          </v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                    
                    <v-alert
                      v-if="formData.action === 'reprovar'"
                      type="warning"
                      variant="tonal"
                      class="mt-4"
                    >
                      
                      <strong>Atenção:</strong> A reprovação encerrará definitivamente este processo.
                      Certifique-se de adicionar uma justificativa detalhada no comentário.
                    </v-alert>
                  </v-card-text>
                </v-card>
              </div>

              <!-- ✅ AÇÕES GENÉRICAS - OUTROS TIPOS -->
              <div v-else-if="availableActions.length > 0" class="form-section mb-6">
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

              <!-- Comentário -->
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
                    {{ getCommentHelpText() }}
                  </p>
                </div>
                
                <v-textarea
                  v-model="formData.comment"
                  label="Seu comentário sobre esta etapa"
                  :placeholder="getCommentPlaceholder()"
                  rows="4"
                  counter="1000"
                  :rules="getCommentRules()"
                  variant="outlined"
                  class="comment-textarea"
                />
              </div>

              <!-- Anexos (se permitido) -->
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

                <!-- Lista de anexos -->
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

      <!-- Sidebar com informações -->
      <v-col cols="12" lg="4">
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

    <!-- Dialogs mantidos iguais... -->
  </div>

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

// ✅ ESTADO CORRIGIDO
const valid = ref(false)
const saving = ref(false)
const attachments = ref([])
const uploadedAttachments = ref([])
const instructionsExpanded = ref(false) // ✅ NOVO para expandir instruções

const form = ref(null)
const fileInput = ref(null)

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

// ✅ SLA Status
const slaStatus = computed(() => {
  if (!stepExecution.value?.dueAt) {
    return {
      hasDeadline: false,
      isOverdue: false,
      isNearDeadline: false,
      remainingText: '',
      overdueText: '',
      deadline: ''
    }
  }
  
  const now = dayjs()
  const dueAt = dayjs(stepExecution.value.dueAt)
  const deadline = dueAt.format('DD/MM/YYYY HH:mm')
  
  const isOverdue = now.isAfter(dueAt)
  const diffHours = Math.abs(dueAt.diff(now, 'hours'))
  const isNearDeadline = !isOverdue && diffHours <= 4
  
  let remainingText = ''
  let overdueText = ''
  
  if (isOverdue) {
    overdueText = dueAt.fromNow()
  } else {
    remainingText = dueAt.fromNow()
  }
  
  return {
    hasDeadline: true,
    isOverdue,
    isNearDeadline,
    remainingText,
    overdueText,
    deadline
  }
})

// ✅ VALIDAÇÃO CORRIGIDA
const isCommentRequired = computed(() => {
  // Comentário obrigatório para aprovação e quando reprovar
  return stepExecution.value?.step.type === 'APPROVAL' || 
         formData.value.action === 'reprovar'
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

// ✅ VALIDAÇÃO PRINCIPAL CORRIGIDA
const canSubmit = computed(() => {
  if (!valid.value) return false
  
  // Para aprovação, deve ter uma ação selecionada
  if (stepExecution.value?.step.type === 'APPROVAL' && !formData.value.action) {
    return false
  }
  
  // Para outros tipos com ações disponíveis
  if (stepExecution.value?.step.type !== 'APPROVAL' && 
      availableActions.value.length > 0 && 
      !formData.value.action) {
    return false
  }
  
  // Verificar comentário obrigatório
  if (isCommentRequired.value && !formData.value.comment?.trim()) {
    return false
  }
  
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

// ✅ MÉTODOS AUXILIARES MELHORADOS
function toggleInstructions() {
  instructionsExpanded.value = !instructionsExpanded.value
}

function formatInstructions(instructions) {
  if (!instructions) return ''
  
  // Converter quebras de linha em HTML
  return instructions
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>')
    .replace(/• /g, '&bull; ')
    .replace(/✅/g, '<span style="color: #4CAF50;">✅</span>')
    .replace(/❌/g, '<span style="color: #f44336;">❌</span>')
    .replace(/⚠️/g, '<span style="color: #FF9800;">⚠️</span>')
    .replace(/📋/g, '<span style="color: #2196F3;">📋</span>')
    .replace(/💡/g, '<span style="color: #FFC107;">💡</span>')
}

function getInstructionsPreview(instructions) {
  if (!instructions) return ''
  
  // Primeira linha ou até 100 caracteres
  const firstLine = instructions.split('\n')[0]
  return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
}

function getCommentHelpText() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    return formData.value.action === 'reprovar' 
      ? 'Justifique sua decisão de reprovação (obrigatório)'
      : 'Adicione observações sobre sua decisão de aprovação'
  }
  return 'Comentário opcional sobre esta etapa'
}

function getCommentPlaceholder() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    return formData.value.action === 'aprovar'
      ? 'Ex: Processo analisado e aprovado conforme critérios estabelecidos...'
      : 'Ex: Processo reprovado devido a inconsistências na documentação...'
  }
  return 'Descreva sua análise, observações ou justificativa para a ação tomada...'
}

function getCommentRules() {
  const rules = []
  
  if (isCommentRequired.value) {
    rules.push(v => !!v?.trim() || 'Comentário é obrigatório')
  }
  
  rules.push(v => !v || v.length <= 1000 || 'Máximo 1000 caracteres')
  
  return rules
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
    reprovar: 'Reprovar',
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
    reprovar: 'Reprovar e encerrar processo',
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
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (formData.value.action === 'aprovar') {
      return 'Pronto para aprovar este processo'
    } else if (formData.value.action === 'reprovar') {
      return 'Processo será reprovado e encerrado'
    }
    return 'Selecione sua decisão de aprovação'
  }
  
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

// ✅ MÉTODOS DE MANIPULAÇÃO DE ARQUIVOS
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

// ✅ MÉTODO PRINCIPAL CORRIGIDO
async function executeStep() {
  console.log('🔍 Debug executeStep:', {
    valid: valid.value,
    canSubmit: canSubmit.value,
    stepExecutionId: stepExecution.value?.id,
    action: formData.value.action,
    comment: formData.value.comment,
    stepType: stepExecution.value?.step.type,
    availableActions: availableActions.value
  })

  if (!valid.value || !canSubmit.value) {
    window.showSnackbar?.('Por favor, corrija os erros antes de continuar', 'warning')
    return
  }
  
  saving.value = true
  
  try {
    // ✅ Upload de anexos apenas se houver arquivos
    if (attachments.value.length > 0) {
      console.log('📎 Uploading attachments:', attachments.value.length)
      
      for (const attachment of attachments.value) {
        try {
          const uploaded = await processStore.uploadAttachment(
            attachment.file,
            stepExecution.value.id
          )
          uploadedAttachments.value.push(uploaded)
          
          if (attachment.signed && attachment.signatureData) {
            await processStore.signAttachment(uploaded.id, attachment.signatureData)
          }
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError)
          window.showSnackbar?.(`Erro ao enviar arquivo ${attachment.name}`, 'warning')
        }
      }
    }
    
    // ✅ PAYLOAD CORRETO - SEM processInstanceId
    const executeData = {
      stepExecutionId: stepExecution.value.id,
      action: formData.value.action,
      comment: formData.value.comment?.trim() || null,
      metadata: formData.value.metadata || {}
    }

    console.log('🚀 Executing step with payload:', executeData)
    
    await processStore.executeStep(executeData)
    
    window.showSnackbar?.('Etapa concluída com sucesso! 🎉', 'success')
    
    setTimeout(() => {
      router.push(`/processes/${route.params.id}`)
    }, 1000)
    
  } catch (error) {
    console.error('❌ Error executing step:', error)
    
    let errorMessage = 'Erro ao executar etapa'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    window.showSnackbar?.(errorMessage, 'error')
  } finally {
    saving.value = false
  }
}

// Métodos principais
function goBack() {
  router.push(`/processes/${route.params.id}`)
}

// Lifecycle
onMounted(async () => {
  try {
    await processStore.fetchProcess(route.params.id)
    
    // ✅ Para aprovação, não definir ação automaticamente
    if (stepExecution.value?.step.type !== 'APPROVAL' && availableActions.value.length === 1) {
      formData.value.action = availableActions.value[0]
    }
    
    console.log('✅ Step execution loaded:', {
      stepName: stepExecution.value?.step.name,
      stepType: stepExecution.value?.step.type,
      availableActions: availableActions.value
    })
  } catch (error) {
    console.error('Error loading step execution:', error)
    window.showSnackbar?.('Erro ao carregar etapa', 'error')
  }
})
</script>

<style scoped>
/* ✅ ESTILOS MELHORADOS PARA INSTRUÇÕES */
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

/* ✅ INSTRUÇÕES MELHORADAS */
.instructions-alert {
  border-left: 4px solid rgb(var(--v-theme-info));
  background: rgba(var(--v-theme-info), 0.04);
}

.instructions-content {
  width: 100%;
}

.instructions-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.instructions-text {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-info), 0.2);
}

.formatted-instructions {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.8);
}

.formatted-instructions :deep(p) {
  margin-bottom: 12px;
}

.formatted-instructions :deep(p:last-child) {
  margin-bottom: 0;
}

.instructions-preview {
  margin-top: 8px;
}

/* ✅ DESCRIÇÃO MELHORADA */
.description-alert {
  border-left: 4px solid rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.04);
}

.description-content {
  width: 100%;
}

/* ✅ APROVAÇÃO ESPECÍFICA */
.approval-decision-card {
  background: rgba(255, 152, 0, 0.02);
  border:none
}

.approval-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 16px;
}

.approval-option {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  min-height: 140px;
}

.approval-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.approval-option.approval-selected {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.approval-approve.approval-selected {
  border-color: rgb(var(--v-theme-success));
  background: rgba(76, 175, 80, 0.04);
}

.approval-reject.approval-selected {
  border-color: rgb(var(--v-theme-error));
  background: rgba(244, 67, 54, 0.04);
}

.approval-label {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.approval-description {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.4;
}

/* Cards e outros estilos mantidos iguais... */
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

/* Responsividade */
@media (max-width: 768px) {
  .step-execution-container {
    padding: 0 12px;
  }
  
  .execution-header {
    padding: 20px;
  }
  
  .approval-options {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .approval-option {
    min-height: 120px;
  }
}
</style>