<template>
  <div v-if="stepExecution && process" class="step-execution-container">
    <div class="execution-header mb-8">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-4" size="large" />
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <v-avatar :color="getStepTypeColor(stepExecution.step.type)" size="56" class="mr-8 step-avatar">
              <v-icon size="28" color="white">{{ getStepTypeIcon(stepExecution.step.type) }}</v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h4 font-weight-bold text-primary">{{ stepExecution.step.name }}</h1>
              <p class="text-h6 text-medium-emphasis">{{ process.code }} - {{ process.title }}</p>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-4 mt-3">
            <v-chip size="small" :color="getStepTypeColor(stepExecution.step.type)" variant="tonal">
              <v-icon start size="16">{{ getStepTypeIcon(stepExecution.step.type) }}</v-icon>
              {{ getStepTypeText(stepExecution.step.type) }}
            </v-chip>
            <v-chip v-if="stepExecution.step.requiresSignature" size="small" color="error" variant="tonal">
              <v-icon start size="16">mdi-draw-pen</v-icon> Requer Assinatura
            </v-chip>
            <v-chip v-if="stepExecution.step.allowAttachment" size="small" color="info" variant="tonal">
              <v-icon start size="16">mdi-paperclip</v-icon> Permite Anexos
            </v-chip>
            <v-chip size="small" color="primary" variant="outlined">
              <v-icon start size="16">mdi-account-check</v-icon> {{ getResponsibleName(stepExecution) }}
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
                <p class="text-body-1 text-medium-emphasis mt-1">Preencha as informações necessárias para concluir esta etapa</p>
              </div>
            </div>
          </div>
          <v-divider />

          <div class="form-card-content pa-6">
            <div v-if="slaStatus.hasDeadline" class="sla-progress-container mb-6">
              <div class="d-flex align-center mb-1">
                <v-icon :color="progressColor" class="mr-2">mdi-timer-outline</v-icon>
                <div class="text-subtitle-1 font-weight-medium">Prazo de Conclusão</div>
                <v-spacer />
                <div class="text-body-2 font-weight-medium" :class="`text-${progressColor}`">
                  <span v-if="!slaStatus.isOverdue">Restam {{ slaStatus.remainingText }}</span>
                  <span v-else>Atrasado {{ slaStatus.overdueText }}</span>
                </div>
              </div>
              <v-progress-linear :model-value="progressPercentage" :color="progressColor" height="8" rounded />
              <div class="text-caption text-medium-emphasis text-right mt-1">
                Prazo final: {{ slaStatus.deadline }}
              </div>
            </div>

            <v-expansion-panels v-if="stepExecution.step.instructions" class="instructions-panel mb-6" variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <div class="d-flex align-center">
                    <v-icon class="mr-3" color="info">mdi-lightbulb</v-icon>
                    <div class="font-weight-medium text-info">Instruções para Execução</div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="formatted-instructions" v-html="formatInstructions(stepExecution.step.instructions)" />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            
            <v-card v-if="reuseDataFields.length > 0" class="reuse-data-card mb-6" variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon color="secondary" class="mr-2">mdi-refresh</v-icon>
                Informações de Etapas Anteriores
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel
                    v-for="(group, groupIndex) in groupReuseDataByStep(reuseDataFields)"
                    :key="groupIndex"
                  >
                    <v-expansion-panel-title>
                      <div class="d-flex align-center">
                        <v-chip size="small" color="primary" class="mr-2">
                          Etapa {{ group.stepOrder }}
                        </v-chip>
                        <span>{{ group.stepName }}</span>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-list density="compact">
                        <v-list-item
                          v-for="(field, index) in group.fields"
                          :key="index"
                        >
                          <template v-if="field.type === 'field'">
                            <v-list-item-title>{{ field.fieldLabel }}</v-list-item-title>
                            <v-list-item-subtitle>{{ field.value }}</v-list-item-subtitle>
                          </template>
                          <template v-else-if="field.type === 'attachments'">
                            <v-list-item-title>Anexos ({{ field.attachments.length }})</v-list-item-title>
                            <v-list-item-subtitle>
                              <div v-for="attachment in field.attachments" :key="attachment.id" class="mt-1">
                                <v-chip size="x-small" @click="viewAttachment(attachment)">
                                  <v-icon start size="12">{{ getFileIcon(attachment.mimeType) }}</v-icon>
                                  {{ attachment.originalName }}
                                </v-chip>
                              </div>
                            </v-list-item-subtitle>
                          </template>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>

            <v-card v-if="approvalContextData" class="approval-context-card mb-6" variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-information</v-icon>
                Contexto da Etapa Anterior
              </v-card-title>
              <v-divider />
              <v-card-text>
                <div class="context-header mb-4">
                  <p class="text-body-2">
                    <strong>Etapa:</strong> {{ approvalContextData.stepName }}<br>
                    <strong>Executado por:</strong> {{ approvalContextData.executor }}<br>
                    <strong>Data:</strong> {{ formatDate(approvalContextData.completedAt) }}
                    <span v-if="approvalContextData.action">
                      <br><strong>Ação:</strong> {{ approvalContextData.action }}
                    </span>
                  </p>
                  <p v-if="approvalContextData.comment" class="text-body-2 mt-2">
                    <strong>Comentário:</strong> {{ approvalContextData.comment }}
                  </p>
                </div>
                
                <v-divider v-if="Object.keys(approvalContextData.data).length > 0" class="my-3" />
                
                <div v-if="Object.keys(approvalContextData.data).length > 0">
                  <h4 class="text-subtitle-2 mb-2">Dados Informados:</h4>
                  <v-list density="compact">
                    <v-list-item v-for="(value, key) in approvalContextData.data" :key="key">
                      <v-list-item-title>{{ key }}</v-list-item-title>
                      <v-list-item-subtitle>{{ value || 'Não informado' }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </div>
                
                <div v-if="approvalContextData.attachments?.length > 0" class="mt-4">
                  <h4 class="text-subtitle-2 mb-2">Anexos:</h4>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="attachment in approvalContextData.attachments"
                      :key="attachment.id"
                      size="small"
                      @click="viewAttachment(attachment)"
                    >
                      <v-icon start size="16">{{ getFileIcon(attachment.mimeType) }}</v-icon>
                      {{ attachment.originalName }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>
            <v-form ref="form" v-model="valid" class="execution-form">
              <div v-if="stepExecution.step.type === 'INPUT'" class="form-section mb-2">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="blue" class="mr-2">mdi-form-textbox</v-icon>Informações Específicas desta Etapa</h3>
                  <p class="text-body-2 text-medium-emphasis">Complete os campos abaixo com as informações solicitadas.</p>
                </div>
                <v-row v-if="stepFormFields.length > 0">
                  <v-col v-for="field in stepFormFields" :key="field.name" :cols="getFieldCols(field)">
                    <component :is="getFieldComponent(field.type)" v-model="formData.metadata[field.name]" :label="getFieldLabel(field)" :placeholder="field.placeholder" :hint="field.helpText" :persistent-hint="!!field.helpText" :rules="getFieldRules(field)" :items="getFieldOptions(field)" :type="getFieldInputType(field.type)" variant="outlined" density="comfortable" />
                  </v-col>
                </v-row>
                <div v-else class="text-center py-6 text-medium-emphasis">
                  Nenhum campo específico para esta etapa.
                </div>
              </div>

              <div v-if="stepExecution.step.type === 'APPROVAL'" class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="orange" class="mr-2">mdi-check-decagram</v-icon>Decisão de Aprovação</h3>
                  <p class="text-body-2 text-medium-emphasis">Analise as informações e tome sua decisão</p>
                </div>
                <v-card variant="outlined" class="approval-decision-card">
                  <v-card-text class="pa-4">
                    <v-radio-group v-model="formData.action" :rules="[v => !!v || 'Selecione uma decisão']" class="approval-radio-group">
                      <div class="approval-options">
                        <v-card class="approval-option approval-approve" :class="{ 'approval-selected': formData.action === 'aprovar' }" variant="outlined" @click="formData.action = 'aprovar'">
                          <v-card-text class="pa-4 text-center"><v-radio value="aprovar" class="mb-2" /><v-icon size="32" color="success" class="mb-2">mdi-check-circle</v-icon><div class="approval-label text-success">Aprovar</div><div class="approval-description">Aprovar e avançar</div></v-card-text>
                        </v-card>
                        <v-card class="approval-option approval-reject" :class="{ 'approval-selected': formData.action === 'reprovar' }" variant="outlined" @click="formData.action = 'reprovar'">
                          <v-card-text class="pa-4 text-center"><v-radio value="reprovar" class="mb-2" /><v-icon size="32" color="error" class="mb-2">mdi-close-circle</v-icon><div class="approval-label text-error">Reprovar</div><div class="approval-description">Reprovar e encerrar</div></v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                    <v-alert v-if="formData.action === 'reprovar'" type="warning" variant="tonal" class="mt-4"><strong>Atenção:</strong> A reprovação encerrará este processo.</v-alert>
                  </v-card-text>
                </v-card>
              </div>

              <div v-else-if="availableActions.length > 0" class="form-section mb-6">
                 <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="primary" class="mr-2">mdi-gesture-tap</v-icon>Ação a Executar</h3>
                  <p class="text-body-2 text-medium-emphasis">Selecione a ação que deseja executar</p>
                </div>
                <v-card variant="outlined" class="action-selection-card">
                  <v-card-text class="pa-4">
                    <v-radio-group v-model="formData.action" :rules="[v => !!v || 'Selecione uma ação']" class="action-radio-group">
                      <div class="actions-grid">
                        <v-card v-for="action in availableActions" :key="action" class="action-option" :class="{ 'action-selected': formData.action === action }" variant="outlined" @click="formData.action = action">
                          <v-card-text class="pa-4 text-center"><v-radio :value="action" class="mb-2" /><div class="action-label">{{ getActionLabel(action) }}</div><div class="action-description">{{ getActionDescription(action) }}</div></v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                  </v-card-text>
                </v-card>
              </div>

              <div class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="primary" class="mr-2">mdi-comment-edit</v-icon>Comentário<v-chip v-if="isCommentRequired" size="x-small" color="error" class="ml-2">Obrigatório</v-chip></h3>
                  <p class="text-body-2 text-medium-emphasis">{{ getCommentHelpText() }}</p>
                </div>
                <v-textarea v-model="formData.comment" label="Seu comentário sobre esta etapa" :placeholder="getCommentPlaceholder()" rows="4" counter="1000" :rules="getCommentRules()" variant="outlined" class="comment-textarea" />
              </div>

              <div v-if="stepExecution.step.allowAttachment" class="form-section">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="primary" class="mr-2">mdi-paperclip</v-icon>Anexos<v-chip v-if="stepExecution.step.requireAttachment" size="x-small" color="error" class="ml-2">Obrigatório</v-chip></h3>
                  <p class="text-body-2 text-medium-emphasis">{{ stepExecution.step.requireAttachment ? 'Esta etapa requer pelo menos um anexo' : 'Anexe documentos relacionados' }}</p>
                </div>
                <v-card variant="outlined" class="attachment-upload-area mb-4">
                  <v-card-text class="pa-6 text-center">
                    <v-btn size="large" color="primary" variant="tonal" @click="$refs.fileInput.click()" class="upload-button"><v-icon start size="24">mdi-cloud-upload</v-icon>Selecionar Arquivos</v-btn>
                    <input ref="fileInput" type="file" style="display: none" multiple @change="handleFileSelect" :accept="allowedFileTypes" />
                    <div class="upload-help mt-4"><p class="text-body-2 text-medium-emphasis">Arraste arquivos aqui ou clique para selecionar</p><p class="text-caption text-medium-emphasis">Formatos aceitos: PDF, Imagens, Word, Excel (máx. 10MB cada)</p></div>
                  </v-card-text>
                </v-card>
                <div v-if="attachments.length > 0" class="attachments-list">
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1 pa-4"><v-icon class="mr-2">mdi-attachment</v-icon>Arquivos Anexados ({{ attachments.length }})</v-card-title>
                    <v-divider />
                    <v-list class="pa-0">
                      <v-list-item v-for="(file, index) in attachments" :key="index" class="attachment-item">
                        <template v-slot:prepend><v-avatar :color="getFileTypeColor(file.type)" size="40"><v-icon size="20" color="white">{{ getFileIcon(file.type) }}</v-icon></v-avatar></template>
                        <v-list-item-title class="font-weight-medium">{{ file.name }}</v-list-item-title>
                        <v-list-item-subtitle><div class="d-flex align-center"><span>{{ formatFileSize(file.size) }}</span><v-chip v-if="file.signed" size="x-small" color="success" class="ml-2"><v-icon start size="12">mdi-check-decagram</v-icon>Assinado</v-chip></div></v-list-item-subtitle>
                        <template v-slot:append>
                          <div class="attachment-actions">
                            <v-btn v-if="stepExecution.step.requiresSignature && file.type === 'application/pdf' && !file.signed" icon="mdi-draw-pen" size="small" variant="tonal" color="primary" @click="openSignatureDialog(file, index)" class="mr-2"><v-tooltip activator="parent">Assinar Documento</v-tooltip></v-btn>
                            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeFile(index)"><v-tooltip activator="parent">Remover Arquivo</v-tooltip></v-btn>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card>
                </div>
                <v-alert v-if="stepExecution.step.requiresSignature" type="warning" variant="tonal" class="mt-4" rounded="lg"><v-icon start>mdi-draw-pen</v-icon><div class="ml-2"><div class="font-weight-medium">Assinatura Digital Obrigatória</div><div class="mt-1">Todos os documentos PDF devem ser assinados digitalmente.</div></div></v-alert>
              </div>
            </v-form>
          </div>

          <v-divider />
          
          <div class="form-card-actions pa-6">
            <div class="d-flex align-center justify-end">
              <v-btn variant="text" size="large" @click="goBack" class="mr-3"><v-icon start>mdi-arrow-left</v-icon>Cancelar</v-btn>
              <v-btn color="primary" variant="elevated" size="large" :loading="saving" :disabled="!canSubmit" @click="executeStep" class="execute-btn">
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                Concluir Etapa
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="info-card mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4"><v-icon color="primary" class="mr-2">mdi-information-outline</v-icon>Detalhes da Etapa</v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-list density="comfortable">
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-format-title</v-icon></template><v-list-item-title>Nome</v-list-item-title><v-list-item-subtitle>{{ stepExecution.step.name }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-shape</v-icon></template><v-list-item-title>Tipo</v-list-item-title><v-list-item-subtitle>{{ getStepTypeText(stepExecution.step.type) }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-account-check</v-icon></template><v-list-item-title>Responsável</v-list-item-title><v-list-item-subtitle>{{ getResponsibleName(stepExecution) }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-calendar</v-icon></template><v-list-item-title>Iniciada em</v-list-item-title><v-list-item-subtitle>{{ formatDate(stepExecution.createdAt) }}</v-list-item-subtitle></v-list-item>
              <v-list-item v-if="slaStatus.hasDeadline"><template v-slot:prepend><v-icon color="primary">mdi-timer-outline</v-icon></template><v-list-item-title>Prazo</v-list-item-title><v-list-item-subtitle>{{ slaStatus.deadline }}</v-list-item-subtitle></v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card v-if="previousStepsData.length > 0" class="info-card mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4"><v-icon color="secondary" class="mr-2">mdi-history</v-icon>Informações Anteriores</v-card-title>
          <v-divider />
          <v-expansion-panels variant="accordion">
            <v-expansion-panel v-for="stepData in previousStepsData" :key="stepData.id">
              <v-expansion-panel-title>
                <div>
                  <div class="font-weight-bold">{{ stepData.stepName }}</div>
                  <div class="text-caption text-medium-emphasis">Concluído por {{ stepData.userName }} em {{ formatDate(stepData.completedAt) }}</div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="previous-step-details">
                <div v-if="Object.keys(stepData.data).length > 0">
                  <div v-for="(value, key) in stepData.data" :key="key" class="detail-item">
                    <div class="detail-key">{{ key }}</div>
                    <div class="detail-value">{{ value }}</div>
                  </div>
                </div>
                 <div v-else class="text-caption text-medium-emphasis">Nenhum dado específico informado nesta etapa.</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>

        <ProcessHistory :history="process.stepExecutions" :process-form-fields="process.processType?.formFields || []" />
      </v-col>
    </v-row>
  </div>

  <div v-else-if="loading" class="loading-container"><div class="text-center py-12"><v-progress-circular indeterminate color="primary" size="64" width="6" /><p class="text-h6 mt-4 text-medium-emphasis">Carregando etapa...</p><p class="text-body-2 text-grey">Preparando ambiente de execução</p></div></div>
  <div v-else-if="!loading && !stepExecution" class="error-container"><div class="text-center py-12"><v-icon size="64" color="error" class="mb-4">mdi-alert-circle-outline</v-icon><h2 class="text-h5 font-weight-bold mb-2">Erro ao carregar a etapa</h2><p class="text-body-1 text-medium-emphasis">Não foi possível encontrar os dados da etapa.</p><v-btn class="mt-6" color="primary" variant="tonal" @click="goBack"><v-icon start>mdi-arrow-left</v-icon>Voltar</v-btn></div></div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/pt-br'

import ProcessHistory from '@/components/ProcessHistory.vue'
import { VTextField, VTextarea, VSelect, VCheckbox, VSwitch } from 'vuetify/components'

dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()

const valid = ref(false)
const saving = ref(false)
const attachments = ref([])
const uploadedAttachments = ref([])
const instructionsExpanded = ref(false)
const form = ref(null)
const fileInput = ref(null)
const now = ref(dayjs())
let timer = null

const formData = ref({
  action: null,
  comment: '',
  metadata: {}
})

const loading = computed(() => processStore.loading)
const process = computed(() => processStore.currentProcess)
const stepExecution = computed(() => process.value?.stepExecutions.find(se => se.id === route.params.stepId))

const stepFormFields = computed(() => {
  if (stepExecution.value?.step.type !== 'INPUT') return []
  const conditions = stepExecution.value.step.conditions
  if (!conditions) return []
  try {
    const parsed = typeof conditions === 'string' ? JSON.parse(conditions) : conditions
    return Array.isArray(parsed.fields) ? parsed.fields : []
  } catch (error) {
    console.error('Error parsing step conditions:', error); return []
  }
})

const availableActions = computed(() => {
  if (!stepExecution.value?.step.actions) return []
  try {
    const actions = typeof stepExecution.value.step.actions === 'string' ? JSON.parse(stepExecution.value.step.actions) : stepExecution.value.step.actions
    return Array.isArray(actions) ? actions : []
  } catch { return [] }
})

const slaStatus = computed(() => {
  if (!stepExecution.value?.dueAt) {
    return { hasDeadline: false, isOverdue: false, remainingText: '', overdueText: '', deadline: '' }
  }
  const dueAt = dayjs(stepExecution.value.dueAt)
  const deadline = dueAt.format('DD/MM/YYYY HH:mm')
  const isOverdue = now.value.isAfter(dueAt)
  const remainingText = dayjs.duration(dueAt.diff(now.value)).locale('pt-br').humanize()
  const overdueText = dayjs.duration(now.value.diff(dueAt)).locale('pt-br').humanize()
  
  return { hasDeadline: true, isOverdue, remainingText, overdueText, deadline }
})

const progressPercentage = computed(() => {
  if (!stepExecution.value?.createdAt || !stepExecution.value?.dueAt) return 0;
  const start = dayjs(stepExecution.value.createdAt);
  const end = dayjs(stepExecution.value.dueAt);
  const totalDuration = end.diff(start);
  if (totalDuration <= 0) return 100;
  const elapsed = now.value.diff(start);
  return Math.min((elapsed / totalDuration) * 100, 100);
});

const progressColor = computed(() => {
  if (slaStatus.value.isOverdue || progressPercentage.value >= 100) return 'error'
  if (progressPercentage.value > 80) return 'warning'
  return 'primary'
})

const previousStepsData = computed(() => {
  if (!process.value?.stepExecutions || !stepExecution.value) return []
  
  const currentStepOrder = stepExecution.value.step.order
  
  return process.value.stepExecutions
    .filter(exec => exec.endTime && exec.step.order < currentStepOrder)
    .sort((a, b) => dayjs(b.endTime).diff(dayjs(a.endTime)))
    .map(exec => {
      const metadata = exec.metadata ? (typeof exec.metadata === 'string' ? JSON.parse(exec.metadata) : exec.metadata) : {}
      
      const stepDefinition = process.value.processType.steps.find(s => s.id === exec.stepId)
      const stepFields = stepDefinition?.conditions?.fields || []

      const labeledData = Object.entries(metadata).reduce((acc, [key, value]) => {
          const field = stepFields.find(f => f.name === key)
          acc[field?.label || key] = value || 'Não informado';
          return acc;
      }, {});

      return {
        id: exec.id,
        stepName: exec.step.name,
        completedAt: exec.endTime,
        userName: exec.completedByUser?.name || 'Sistema',
        data: labeledData
      }
    })
})

// INÍCIO DA SEÇÃO ADICIONADA
const reuseDataFields = computed(() => {
  if (!stepExecution.value?.step.reuseData) return []
  
  try {
    const reuseConfig = typeof stepExecution.value.step.reuseData === 'string' 
      ? JSON.parse(stepExecution.value.step.reuseData)
      : stepExecution.value.step.reuseData
    
    const fields = []
    
    reuseConfig.forEach(config => {
      const sourceStep = process.value?.stepExecutions.find(
        exec => exec.step.order === config.sourceStep
      )
      
      if (sourceStep) {
        if (config.type === 'attachment') {
          // Anexos da etapa
          if (sourceStep.attachments?.length > 0) {
            fields.push({
              type: 'attachments',
              stepName: sourceStep.step.name,
              stepOrder: sourceStep.step.order,
              attachments: sourceStep.attachments
            })
          }
        } else {
          // Campos de dados
          let fieldValue = null
          let fieldLabel = config.fieldName
          
          // Buscar no metadata da execução
          if (sourceStep.metadata) {
            const metadata = typeof sourceStep.metadata === 'string'
              ? JSON.parse(sourceStep.metadata)
              : sourceStep.metadata
            fieldValue = metadata[config.fieldName]
          }
          
          // Buscar no formData do processo se for campo do formulário inicial
          if (!fieldValue && sourceStep.step.order === 1) {
            fieldValue = process.value?.formData?.[config.fieldName]
            
            // Obter label do campo
            const formField = process.value?.processType?.formFields?.find(
              f => f.name === config.fieldName
            )
            if (formField) {
              fieldLabel = formField.label
            }
          }
          
          if (fieldValue !== undefined && fieldValue !== null) {
            fields.push({
              type: 'field',
              stepName: sourceStep.step.name,
              stepOrder: sourceStep.step.order,
              fieldName: config.fieldName,
              fieldLabel: fieldLabel,
              value: fieldValue
            })
          }
        }
      }
    })
    
    return fields
  } catch (error) {
    console.error('Error parsing reuse data:', error)
    return []
  }
})

// Para etapas de APROVAÇÃO, mostrar dados da etapa anterior
const approvalContextData = computed(() => {
  if (stepExecution.value?.step.type !== 'APPROVAL') return null
  
  const currentOrder = stepExecution.value.step.order
  const previousStep = process.value?.stepExecutions.find(
    exec => exec.step.order === currentOrder - 1 && exec.status === 'COMPLETED'
  )
  
  if (!previousStep) return null
  
  const contextData = {
    stepName: previousStep.step.name,
    executor: previousStep.executor?.name || 'Sistema',
    completedAt: previousStep.completedAt,
    comment: previousStep.comment,
    action: previousStep.action,
    data: {}
  }
  
  // Dados do metadata
  if (previousStep.metadata) {
    const metadata = typeof previousStep.metadata === 'string'
      ? JSON.parse(previousStep.metadata)
      : previousStep.metadata
    
    // Se a etapa anterior foi INPUT, pegar os campos configurados
    if (previousStep.step.type === 'INPUT' && previousStep.step.conditions) {
      try {
        const conditions = typeof previousStep.step.conditions === 'string'
          ? JSON.parse(previousStep.step.conditions)
          : previousStep.step.conditions
        
        if (conditions.fields) {
          conditions.fields.forEach(field => {
            if (metadata[field.name] !== undefined) {
              contextData.data[field.label || field.name] = metadata[field.name]
            }
          })
        }
      } catch (e) {
        console.error('Error parsing step conditions:', e)
      }
    } else {
      // Para outros tipos de etapa, mostrar todo o metadata
      contextData.data = metadata
    }
  }
  
  // Anexos da etapa anterior
  if (previousStep.attachments?.length > 0) {
    contextData.attachments = previousStep.attachments
  }
  
  return contextData
})
// FIM DA SEÇÃO ADICIONADA

const isCommentRequired = computed(() => {
  return stepExecution.value?.step.type === 'APPROVAL' && formData.value.action === 'reprovar'
})

const allowedFileTypes = computed(() => {
  const types = stepExecution.value?.step.allowedFileTypes
  if (!types || types.length === 0) return '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
  try {
    const parsed = typeof types === 'string' ? JSON.parse(types) : types
    return Array.isArray(parsed) ? parsed.join(',') : types
  } catch { return types }
})

const canSubmit = computed(() => {
  if (!valid.value) return false
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (!formData.value.action) return false
    if (formData.value.action === 'reprovar' && !formData.value.comment?.trim()) return false
  } else if (availableActions.value.length > 0 && !formData.value.action) {
    return false
  }
  if (stepExecution.value?.step.requireAttachment && attachments.value.length === 0) return false
  if (stepExecution.value?.step.requiresSignature) {
    const pdfs = attachments.value.filter(f => f.type === 'application/pdf')
    if (pdfs.length > 0 && !pdfs.every(f => f.signed)) return false
  }
  return true
})

function getFieldComponent(type) {
  const componentMap = {
    TEXT: VTextField, 
    TEXTAREA: VTextarea, 
    NUMBER: VTextField, 
    DATE: VTextField, 
    EMAIL: VTextField, 
    CPF: VTextField, 
    CNPJ: VTextField, 
    PHONE: VTextField, 
    DROPDOWN: VSelect, 
    CHECKBOX: VCheckbox, 
    CURRENCY: VTextField, 
    FILE: VTextField
  }
  return componentMap[type] || VTextField
}
function getFieldInputType(type) {
  const typeMap = {
    NUMBER: 'number',
    DATE: 'date',
    EMAIL: 'email',
    CURRENCY: 'number'
  }
  return typeMap[type] || 'text'
}
function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
      return 12
    case 'CHECKBOX':
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}
function getFieldLabel(field) {
  const label = field.label || field.name
  return field.required ? `${label} *` : label
}
function getFieldOptions(field) {
  if (!field.options) return []
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options)
    return options.map(opt => ({
      title: opt.label || opt.value || opt,
      value: opt.value || opt
    }))
  } catch {
    return []
  }
}
function getFieldRules(field) {
  const rules = []
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }
  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
    case 'NUMBER':
    case 'CURRENCY':
      rules.push(v => !v || !isNaN(Number(v)) || 'Deve ser um número válido')
      break
  }
  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? field.validations : JSON.parse(field.validations)
      if (validations.minLength) {
        rules.push(v => !v || v.length >= validations.minLength || `Mínimo ${validations.minLength} caracteres`)
      }
      if (validations.maxLength) {
        rules.push(v => !v || v.length <= validations.maxLength || `Máximo ${validations.maxLength} caracteres`)
      }
      if (validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || `Valor mínimo: ${validations.min}`)
      }
      if (validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || `Valor máximo: ${validations.max}`)
      }
    } catch (e) {
      console.error('Error parsing field validations:', e)
    }
  }
  return rules
}
function toggleInstructions() { instructionsExpanded.value = !instructionsExpanded.value }
function formatInstructions(instructions) {
  if (!instructions) return ''
  return instructions.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^(.*)$/, '<p>$1</p>').replace(/• /g, '&bull; ').replace(/✅/g, '<span style="color: #4CAF50;">✅</span>').replace(/❌/g, '<span style="color: #f44336;">❌</span>').replace(/⚠️/g, '<span style="color: #FF9800;">⚠️</span>').replace(/📋/g, '<span style="color: #2196F3;">📋</span>').replace(/💡/g, '<span style="color: #FFC107;">💡</span>')
}
function getInstructionsPreview(instructions) {
  if (!instructions) return ''
  const firstLine = instructions.split('\n')[0]
  return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
}
function getCommentHelpText() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    return formData.value.action === 'reprovar' ? 'Justifique sua decisão de reprovação (obrigatório)' : 'Adicione observações sobre sua decisão de aprovação'
  }
  return 'Comentário opcional sobre esta etapa'
}
function getCommentPlaceholder() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (formData.value.action === 'aprovar') return 'Ex: Processo analisado e aprovado conforme critérios estabelecidos. Documentação está completa e em conformidade...'
    if (formData.value.action === 'reprovar') return 'Ex: Processo reprovado devido a inconsistências na documentação apresentada. Necessário revisar os seguintes pontos...'
    return 'Adicione suas observações sobre a análise realizada...'
  }
  return 'Descreva sua análise, observações ou justificativa para a ação tomada...'
}
function getCommentRules() {
  const rules = []
  if (isCommentRequired.value) rules.push(v => !!v?.trim() || 'Comentário é obrigatório')
  rules.push(v => !v || v.length <= 1000 || 'Máximo 1000 caracteres')
  if (stepExecution.value?.step.type === 'APPROVAL' && formData.value.action === 'reprovar') {
    rules.push(v => (v && v.trim().length >= 10) || 'Justificativa deve ter pelo menos 10 caracteres')
  }
  return rules
}
function getStepTypeColor(type) {
  const colors = { INPUT: 'blue', APPROVAL: 'orange', UPLOAD: 'purple', REVIEW: 'teal', SIGNATURE: 'red' }
  return colors[type] || 'grey'
}
function getStepTypeIcon(type) {
  const icons = { INPUT: 'mdi-form-textbox', APPROVAL: 'mdi-check-decagram', UPLOAD: 'mdi-upload', REVIEW: 'mdi-eye-check', SIGNATURE: 'mdi-draw-pen' }
  return icons[type] || 'mdi-help-circle'
}
function getStepTypeText(type) {
  const texts = { INPUT: 'Entrada de Dados', APPROVAL: 'Aprovação', UPLOAD: 'Upload de Arquivo', REVIEW: 'Revisão', SIGNATURE: 'Assinatura' }
  return texts[type] || type
}
function getActionLabel(action) {
  const labels = { aprovar: 'Aprovar', reprovar: 'Reprovar', rejeitar: 'Rejeitar', enviar: 'Enviar', devolver: 'Devolver', aceitar: 'Aceitar', recusar: 'Recusar', continuar: 'Continuar', finalizar: 'Finalizar' }
  return labels[action.toLowerCase()] || action
}
function getActionDescription(action) {
  const descriptions = { aprovar: 'Aprovar e avançar para próxima etapa', reprovar: 'Reprovar e encerrar processo', rejeitar: 'Rejeitar e devolver para etapa anterior', enviar: 'Enviar para próxima etapa', devolver: 'Devolver para correções', aceitar: 'Aceitar as informações fornecidas', recusar: 'Recusar e solicitar alterações', continuar: 'Continuar o fluxo do processo', finalizar: 'Finalizar esta etapa' }
  return descriptions[action.toLowerCase()] || 'Executar esta ação'
}
function getResponsibleName(execution) {
  if (execution.step.assignedToUser) return execution.step.assignedToUser.name
  if (execution.step.assignedToSector) return `Setor ${execution.step.assignedToSector.name}`
  return 'Não definido'
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
function formatDate(date) { return dayjs(date).format('DD/MM/YYYY HH:mm') }
function getExecutionStatusMessage() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (formData.value.action === 'aprovar') return 'Processo será aprovado e seguirá para próxima etapa'
    if (formData.value.action === 'reprovar') return 'Processo será reprovado e encerrado definitivamente'
    return 'Selecione sua decisão de aprovação'
  }
  const totalAttachments = attachments.value.length
  const signedAttachments = attachments.value.filter(f => f.signed).length
  const requiresSignature = stepExecution.value?.step.requiresSignature
  if (requiresSignature && totalAttachments > 0) return `${signedAttachments}/${totalAttachments} documentos assinados`
  if (totalAttachments > 0) return `${totalAttachments} arquivo(s) anexado(s)`
  return 'Preencha as informações necessárias'
}
async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      window.showSnackbar?.(`Arquivo ${file.name} muito grande (máx: 10MB)`, 'error')
      continue
    }
    if (allowedFileTypes.value !== '*') {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase()
      const allowedExts = allowedFileTypes.value.split(',').map(t => t.trim())
      if (!allowedExts.includes(file.type) && !allowedExts.includes(fileExt)) {
        window.showSnackbar?.(`Tipo de arquivo ${file.name} não permitido`, 'error')
        continue
      }
    }
    attachments.value.push({ file, name: file.name, size: file.size, type: file.type, signed: false, id: Date.now() + Math.random() })
  }
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
function openSignatureDialog(file, index) { console.log('Opening signature dialog for:', file.name) }
async function executeStep() {
  if (!valid.value || !canSubmit.value) {
    window.showSnackbar?.('Por favor, corrija os erros antes de continuar', 'warning')
    return
  }
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (!formData.value.action || !['aprovar', 'reprovar'].includes(formData.value.action)) {
      window.showSnackbar?.('Selecione uma decisão de aprovação válida', 'warning')
      return
    }
    if (formData.value.action === 'reprovar' && !formData.value.comment?.trim()) {
      window.showSnackbar?.('Justificativa é obrigatória para reprovação', 'warning')
      return
    }
  }
  if (!stepExecution.value?.id) {
    console.error('stepExecutionId is missing:', stepExecution.value)
    window.showSnackbar?.('Erro: ID da execução da etapa não encontrado', 'error')
    return
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(stepExecution.value.id)) {
    console.error('Invalid stepExecutionId format:', stepExecution.value.id)
    window.showSnackbar?.('Erro: ID da execução da etapa em formato inválido', 'error')
    return
  }
  saving.value = true
  try {
    if (attachments.value.length > 0) {
      for (const attachment of attachments.value) {
        try {
          const uploaded = await processStore.uploadAttachment(attachment.file, stepExecution.value.id)
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
    const executeData = {
      stepExecutionId: stepExecution.value.id,
      action: formData.value.action || null,
      comment: formData.value.comment?.trim() || null,
      metadata: formData.value.metadata && Object.keys(formData.value.metadata).length > 0 ? formData.value.metadata : {}
    }
    if (!executeData.stepExecutionId) throw new Error('stepExecutionId é obrigatório')
    if (stepExecution.value?.step.type === 'APPROVAL' && !executeData.action) throw new Error('Ação é obrigatória para etapas de aprovação')
    await processStore.executeStep(executeData)
    let successMessage = 'Etapa concluída com sucesso! 🎉'
    if (stepExecution.value?.step.type === 'APPROVAL') {
      if (formData.value.action === 'aprovar') successMessage = 'Processo aprovado com sucesso! ✅'
      else if (formData.value.action === 'reprovar') successMessage = 'Processo reprovado. ❌'
    }
    window.showSnackbar?.(successMessage, 'success')
    setTimeout(() => { router.push(`/processes/${route.params.id}`) }, 1000)
  } catch (error) {
    console.error('Error executing step:', error)
    let errorMessage = 'Erro ao executar etapa'
    if (error.response?.status === 400) {
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) errorMessage = error.response.data.message.join(', ')
        else errorMessage = error.response.data.message
      } else errorMessage = 'Dados inválidos. Verifique os campos preenchidos.'
    } else if (error.response?.data?.message) errorMessage = error.response.data.message
    else if (error.message) errorMessage = error.message
    window.showSnackbar?.(errorMessage, 'error')
  } finally {
    saving.value = false
  }
  }
function goBack() { router.push(`/processes/${route.params.id}`) }

// INÍCIO DA SEÇÃO ADICIONADA
// Função auxiliar para agrupar dados reutilizados por etapa
function groupReuseDataByStep(fields) {
  const groups = {}
  
  fields.forEach(field => {
    const key = `${field.stepOrder}-${field.stepName}`
    if (!groups[key]) {
      groups[key] = {
        stepOrder: field.stepOrder,
        stepName: field.stepName,
        fields: []
      }
    }
    groups[key].fields.push(field)
  })
  
  return Object.values(groups).sort((a, b) => a.stepOrder - b.stepOrder)
}

// Função para visualizar anexo
async function viewAttachment(attachment) {
  try {
    const url = `/api/processes/attachment/${attachment.id}/view`
    window.open(url, '_blank')
  } catch (error) {
    console.error('Error viewing attachment:', error)
    window.showSnackbar?.('Erro ao visualizar anexo', 'error')
  }
}
// FIM DA SEÇÃO ADICIONADA

onMounted(async () => {
  try {
    processStore.loading = true
    await processStore.fetchProcess(route.params.id)
    if (stepFormFields.value.length > 0) {
      stepFormFields.value.forEach(field => {
        if (field.defaultValue) { formData.value.metadata[field.name] = field.defaultValue }
      })
    }
    if (stepExecution.value?.step.type !== 'APPROVAL' && availableActions.value.length === 1) {
      formData.value.action = availableActions.value[0]
    }
    timer = setInterval(() => { now.value = dayjs() }, 1000)
  } catch (error) {
    console.error('Error loading step execution:', error)
    window.showSnackbar?.('Erro ao carregar etapa', 'error')
  } finally {
    processStore.loading = false
  }
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.step-execution-container { max-width: 1400px; margin: 0 auto; padding: 0 16px; }
.execution-header { background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(66, 165, 245, 0.04)); border-radius: 20px; padding: 32px; border: 1px solid rgba(25, 118, 210, 0.1); backdrop-filter: blur(10px); }
.step-avatar { box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3); border: 3px solid rgba(255, 255, 255, 0.9); }
.instructions-panel {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.formatted-instructions { font-size: 0.95rem; line-height: 1.7; color: rgba(0, 0, 0, 0.8); padding: 16px; }
.formatted-instructions :deep(p) { margin-bottom: 12px; }
.formatted-instructions :deep(p:last-child) { margin-bottom: 0; }
.approval-decision-card { background: rgba(255, 152, 0, 0.02); border: none; }
.approval-options { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
.approval-option { cursor: pointer; transition: all 0.3s ease; border-radius: 16px; border: 2px solid rgba(0, 0, 0, 0.08); min-height: 140px; }
.approval-option:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); }
.approval-option.approval-selected { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); transform: translateY(-2px); }
.approval-approve.approval-selected { border-color: rgb(var(--v-theme-success)); background: rgba(76, 175, 80, 0.04); }
.approval-reject.approval-selected { border-color: rgb(var(--v-theme-error)); background: rgba(244, 67, 54, 0.04); }
.approval-label { font-weight: 700; font-size: 1.1rem; margin-bottom: 8px; }
.approval-description { font-size: 0.85rem; color: rgba(0, 0, 0, 0.6); line-height: 1.4; }
.execution-form-card, .info-card { border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.06); overflow: hidden; }
.form-card-header { background: linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(66, 165, 245, 0.03)); border-bottom: 1px solid rgba(25, 118, 210, 0.1); }
.form-card-content { background: white; }
.form-card-actions { background: rgba(25, 118, 210, 0.02); border-top: 1px solid rgba(0, 0, 0, 0.06); }
.form-section { margin-bottom: 32px; }
.section-header h3 { color: rgba(0, 0, 0, 0.87); margin-bottom: 8px; }
.section-header p { margin: 0; }
.execute-btn { border-radius: 12px; font-weight: 600; text-transform: none; letter-spacing: 0.25px; box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3); padding: 16px 32px; }
.execute-btn:hover { box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4); transform: translateY(-1px); }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
.action-option { cursor: pointer; transition: all 0.3s ease; border-radius: 12px; border: 2px solid rgba(0, 0, 0, 0.08); }
.action-option:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); }
.action-option.action-selected { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.04); box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.2); transform: translateY(-2px); }
.action-label { font-weight: 600; font-size: 1rem; margin-bottom: 4px; }
.action-description { font-size: 0.8rem; color: rgba(0, 0, 0, 0.6); }
.previous-step-details { background-color: rgba(0,0,0,0.02); }
.detail-item { display: flex; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid rgba(0,0,0,0.06); }
.detail-item:last-child { border-bottom: none; }
.detail-key { font-weight: 500; color: #555; font-size: 0.85rem; margin-right: 16px; }
.detail-value { font-size: 0.9rem; text-align: right; word-break: break-word; }
@media (max-width: 768px) { .step-execution-container { padding: 0 12px; } .execution-header { padding: 20px; } .approval-options { grid-template-columns: 1fr; gap: 16px; } .approval-option { min-height: 120px; } .actions-grid { grid-template-columns: 1fr; } }
</style>