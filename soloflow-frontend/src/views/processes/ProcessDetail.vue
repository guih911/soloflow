<template>
  <div v-if="process">
    <!-- Linha 1: Título, Atualizar e Status -->
    <div class="d-flex align-center mb-2">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <div class="ml-4 flex-grow-1">
        <div class="d-flex align-center">
          <h1 class="text-h4 font-weight-bold">
            {{ process.code }}{{ process.title ? ` - ${process.title}` : ` - ${process.processType.name}` }}
          </h1>
        </div>
        <p v-if="process.processType?.name" class="text-subtitle-1 text-medium-emphasis">
          {{ process.processType.name }}
        </p>
      </div>

      <div class="d-flex gap-2 align-center">
        <v-btn variant="text" @click="refreshProcess" :loading="loading">
          <v-icon start>mdi-refresh</v-icon>
          Atualizar
        </v-btn>

        <v-chip :color="getStatusColor(process.status)" class="ml-2" label>
          {{ getStatusText(process.status) }}
        </v-chip>
      </div>
    </div>

    <!-- Linha 2: Botões de ação -->
    <div class="d-flex justify-end gap-2 mb-6">
      <!-- Botão de Criar Sub-Processo (não aparece se já for sub-processo ou se desabilitado no tipo) -->
      <v-btn
        v-if="process?.status !== 'CANCELLED' && !parentProcessInfo && allowSubProcesses"
        variant="tonal"
        color="secondary"
        @click="openCreateChildProcessDialog"
      >
        <v-icon start>mdi-source-branch-plus</v-icon>
        Sub-Processo
      </v-btn>

      <!-- Botão de Cancelar Processo -->
      <v-btn
        v-if="canCancelProcess"
        variant="tonal"
        color="error"
        @click="cancelProcessDialog = true"
      >
        <v-icon start>mdi-cancel</v-icon>
        Cancelar
      </v-btn>

      <v-btn v-if="currentStepExecution" color="primary" variant="elevated" @click="executeCurrentStep"
        :disabled="!canExecuteCurrentStep">
        <v-icon start>mdi-play</v-icon>
        Executar Etapa
      </v-btn>
    </div>

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
              </template>
              <v-list-item-title>Código</v-list-item-title>
              <v-list-item-subtitle>{{ process.code }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>Solicitante</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-email</v-icon>
              </template>
              <v-list-item-title>E-mail</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Criado em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.createdAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="process.completedAt">
              <template v-slot:prepend>
                <v-icon>mdi-calendar-check</v-icon>
              </template>
              <v-list-item-title>Concluído em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.completedAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="estimatedCompletion">
              <template v-slot:prepend>
                <v-icon>mdi-clock-outline</v-icon>
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

        <!-- Card de Processo Pai (se for sub-processo) -->
        <v-card v-if="parentProcessInfo" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-source-branch</v-icon>
            Processo Pai
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              @click="router.push(`/processos/${parentProcessInfo.parentProcessInstance.id}`)"
              class="cursor-pointer"
            >
              <template v-slot:prepend>
                <v-icon color="primary">mdi-file-document</v-icon>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ parentProcessInfo.parentProcessInstance?.code }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ parentProcessInfo.parentProcessInstance?.processTypeVersion?.processType?.name }}
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-if="parentProcessInfo.description" class="pt-0">
            <p class="text-caption text-medium-emphasis mb-1">Motivo do vínculo</p>
            <p class="text-body-2">{{ parentProcessInfo.description }}</p>
          </v-card-text>
        </v-card>

        <v-card v-if="hasFormDataToShow">
          <v-card-title>
            <v-icon class="mr-2">mdi-form-textbox</v-icon>
            Dados Informados
          </v-card-title>
          <v-divider />
          <v-list density="compact">
            <v-list-item v-for="(value, key) in formattedFormData" :key="key">
              <template v-slot:default>
                <div class="w-100">
                  <div class="text-caption text-medium-emphasis mb-1">{{ key }}</div>
                  <div class="text-body-2" style="white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;">
                    {{ value }}
                  </div>
                </div>
              </template>
            </v-list-item>
            
            <template v-for="field in fileFields" :key="field.name">
              <v-list-item v-if="getFieldFileData(field) && !Array.isArray(getFieldFileData(field))">
                <v-list-item-title class="text-caption">
                  {{ field.label }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="16" class="mr-2" :color="getFileTypeColor(getFieldFileData(field).mimeType)">
                      {{ getFileIcon(getFieldFileData(field).mimeType) }}
                    </v-icon>
                    <span class="file-link" @click="openFieldFileModal(field, 0)">
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
                      <span class="file-link" @click="openFieldFileModal(field, index)">
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
              </template>
            </template>

          </v-list>
        </v-card>

        <!-- Card de Tabelas Informadas -->
        <ProcessTablesCard v-if="process" :process="process" class="mt-4" />

        <!-- Seção de Sub-Processos -->
        <v-card v-if="allowSubProcesses && childProcesses.length > 0" class="mt-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-source-branch</v-icon>
            Sub-Processos
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              v-for="child in childProcesses"
              :key="child.id"
              @click="viewChildProcess(child.childProcessInstance)"
              class="cursor-pointer"
            >
              <template v-slot:prepend>
                <v-icon :color="getChildStatusColor(child.status)">
                  {{ getChildStatusIcon(child.status) }}
                </v-icon>
              </template>
              <v-list-item-title>{{ child.childProcessInstance?.code }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="x-small" :color="getChildStatusColor(child.status)" variant="tonal" class="mr-2">
                  {{ getChildStatusLabel(child.status) }}
                </v-chip>
                {{ child.childProcessInstance?.processTypeVersion?.processType?.name }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="workflow-timeline-card">
          <v-card-title class="d-flex align-center pa-6">
            <v-icon class="mr-3" color="primary" size="28">mdi-timeline-clock</v-icon>
            <div>
              <h3 class="text-h5 font-weight-bold">Fluxo do Processo</h3>
              <p class="text-body-2 text-medium-emphasis mt-1">
                Acompanhe o progresso e histórico de execução das etapas
              </p>
            </div>
          </v-card-title>
          
          <v-divider />

          <div class="workflow-container pa-6">
            <div class="workflow-steps">
              <div 
                v-for="(execution, index) in process.stepExecutions" 
                :key="execution.id"
                class="workflow-step"
                :class="getStepClass(execution, index)"
              >
                <div class="step-indicator">
                  <div class="step-number" :class="getStepIndicatorClass(execution)">
                    <v-icon v-if="execution.status === 'COMPLETED'" size="20" color="white">
                      mdi-check
                    </v-icon>
                    <v-icon v-else-if="execution.status === 'IN_PROGRESS'" size="20" color="white">
                      mdi-play
                    </v-icon>
                    <v-icon v-else-if="execution.status === 'REJECTED'" size="20" color="white">
                      mdi-close
                    </v-icon>
                    <span v-else class="step-text">{{ index + 1 }}</span>
                  </div>
                  
                  <div 
                    v-if="index < process.stepExecutions.length - 1"
                    class="step-connector"
                    :class="getConnectorClass(execution)"
                  />
                </div>

                <div class="step-content">
                  <v-card 
                    class="step-card"
                    :class="[getStepCardClass(execution), execution.status === 'COMPLETED' ? 'cursor-pointer' : '']"
                    :elevation="execution.status === 'IN_PROGRESS' ? 8 : 2"
                    @click="execution.status === 'COMPLETED' && openStepDetailDialog(execution)"
                  >
                    <div class="step-card-header" :class="getStepHeaderClass(execution)">
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <v-icon 
                            :color="execution.status === 'IN_PROGRESS' ? 'white' : getStepTypeColor(execution.step.type)" 
                            class="mr-3" 
                            size="24"
                          >
                            {{ getStepTypeIcon(execution.step.type) }}
                          </v-icon>
                          
                          <div>
                            <h4 class="step-title" :class="execution.status === 'IN_PROGRESS' ? 'text-white' : ''">
                              {{ execution.step.name }}
                            </h4>
                            <p v-if="execution.step.description" class="step-subtitle" :class="execution.status === 'IN_PROGRESS' ? 'text-white' : 'text-medium-emphasis'">
                              {{ execution.step.description }}
                            </p>
                          </div>
                        </div>

                        <div class="step-status-badge d-flex align-center gap-2">
                          <v-chip
                            size="small"
                            :color="getExecutionColor(execution)"
                            :variant="execution.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
                          >
                            <v-icon start size="16">{{ getExecutionIcon(execution) }}</v-icon>
                            {{ getExecutionStatusText(execution.status) }}
                          </v-chip>
                        </div>
                      </div>
                    </div>

                    <div class="step-card-body pa-4">
                      <div class="step-info-grid">
                        <div class="info-item">
                          <v-icon size="18" color="primary" class="mr-2">mdi-account-check</v-icon>
                          <div>
                            <span class="info-label">Responsável</span>
                            <span class="info-value">{{ getResponsibleName(execution) }}</span>
                          </div>
                        </div>

                        <div v-if="execution.executor" class="info-item">
                          <v-icon size="18" color="success" class="mr-2">mdi-account-edit</v-icon>
                          <div>
                            <span class="info-label">Executado por</span>
                            <span class="info-value">{{ execution.executor.name }}</span>
                          </div>
                        </div>

                        <div v-if="execution.completedAt" class="info-item">
                          <v-icon size="18" color="info" class="mr-2">mdi-clock-check</v-icon>
                          <div>
                            <span class="info-label">Concluído em</span>
                            <span class="info-value">{{ formatDate(execution.completedAt) }}</span>
                          </div>
                        </div>

                        <div v-if="execution.action" class="info-item">
                          <v-icon size="18" color="warning" class="mr-2">mdi-gesture-tap</v-icon>
                          <div>
                            <span class="info-label">Ação</span>
                            <v-chip size="x-small" class="ml-1" variant="tonal">{{ execution.action }}</v-chip>
                          </div>
                        </div>
                      </div>

                      <div v-if="getExecutionSlaStatus(execution).hasDeadline" class="step-sla-info mt-3">
                        <v-alert
                          v-if="getExecutionSlaStatus(execution).isOverdue"
                          type="error"
                          variant="tonal"
                          density="compact"
                        >
                          <v-icon start size="16">mdi-clock-alert</v-icon>
                          Atrasado: {{ getExecutionSlaStatus(execution).overdueText }}
                        </v-alert>
                        <v-alert
                          v-else-if="getExecutionSlaStatus(execution).isNearDeadline"
                          type="warning"
                          variant="tonal"
                          density="compact"
                        >
                          <v-icon start size="16">mdi-clock-outline</v-icon>
                          Prazo: {{ getExecutionSlaStatus(execution).remainingText }}
                        </v-alert>
                      </div>

                      <div v-if="execution.comment" class="step-comment mt-4">
                        <div class="comment-header mb-2">
                          <v-icon size="16" color="primary" class="mr-1">mdi-comment-text</v-icon>
                          <span class="text-caption font-weight-medium">Comentário</span>
                        </div>
                        <div class="comment-body">
                          {{ execution.comment }}
                        </div>
                      </div>

                      <div v-if="execution.step.requiresSignature || execution.step.allowAttachment || hasStepAttachments(execution)" class="step-features mt-4">
                        <div class="d-flex flex-wrap gap-2">
                          <v-chip v-if="execution.step.requiresSignature" size="x-small" color="error" variant="tonal">
                            <v-icon start size="12">mdi-draw-pen</v-icon>
                            Requer Assinatura
                          </v-chip>
                          <v-chip v-if="execution.step.allowAttachment" size="x-small" color="info" variant="tonal">
                            <v-icon start size="12">mdi-paperclip</v-icon>
                            Permite Anexos
                          </v-chip>
                          <v-chip v-if="hasStepAttachments(execution)" size="x-small" color="success" variant="tonal">
                            <v-icon start size="12">mdi-attachment</v-icon>
                            {{ getStepAttachmentsCount(execution) }} anexo(s)
                          </v-chip>
                        </div>
                      </div>
                    </div>

                    <div v-if="canExecuteStep(execution)" class="step-card-actions pa-4 pt-0">
                      <v-btn
                        color="primary"
                        variant="elevated"
                        block
                        size="large"
                        @click="executeStep(execution)"
                        class="execute-button"
                      >
                        <v-icon start>mdi-play-circle</v-icon>
                        Executar Esta Etapa
                      </v-btn>
                    </div>
                  </v-card>

                  <!-- Sub-etapas da etapa (aparecem sempre que existirem ou quando em progresso) -->
                  <SubTasksList
                    v-if="allowSubTasks && (execution.status === 'IN_PROGRESS' || execution.status === 'COMPLETED')"
                    :key="`subtasks-${execution.id}-${subTasksReloadKey}`"
                    :step-execution-id="execution.id"
                    :step-status="execution.status"
                    :can-user-manage="canExecuteStep(execution)"
                    :users="stepUsers"
                    @updated="refreshProcess"
                    @create="openCreateSubTaskDialog(execution)"
                  />
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <FieldFileModal
      v-model="fieldFileModal"
      :file-data="selectedFieldFile"
      :field-info="selectedField"
    />

    <!-- Botão Flutuante para Abrir Documentos -->
    <v-btn
      v-if="totalDocuments > 0"
      class="documents-fab"
      color="primary"
      size="x-large"
      icon
      elevation="8"
      @click="documentsDrawer = true"
    >
      <v-badge
        :content="totalDocuments"
        color="error"
        overlap
        offset-x="-2"
        offset-y="-2"
      >
        <v-icon size="28">mdi-file-document-multiple</v-icon>
      </v-badge>
    </v-btn>

    <!-- Drawer Lateral de Documentos -->
    <v-navigation-drawer
      v-model="documentsDrawer"
      location="right"
      temporary
      width="520"
      class="documents-drawer"
    >
      <DocumentViewer v-if="process" :process="process" :drawer="true" @refresh="refreshProcess" />
    </v-navigation-drawer>

    <!-- Diálogo de Cancelamento -->
    <CancelProcessDialog
      v-model="cancelProcessDialog"
      :process="process"
      @cancel="handleCancelProcess"
    />

    <!-- Diálogo de Criar Sub-Processo -->
    <CreateChildProcessDialog
      v-model="createChildProcessDialog"
      :parent-process="process"
      @created="handleChildProcessCreated"
    />

    <!-- Diálogo de Criar Sub-Tarefa -->
    <CreateSubTaskDialog
      v-model="createSubTaskDialog"
      :step-execution="selectedStepExecution"
      :company-id="process?.companyId"
      @created="handleSubTaskCreated"
    />

    <!-- Diálogo de Detalhes da Etapa -->
    <StepExecutionDetailDialog
      v-model="stepDetailDialog"
      :execution="selectedStepDetail"
    />
  </div>

  <div v-else-if="loading" class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="64" />
    <p class="text-body-2 text-grey mt-4">Carregando processo...</p>
  </div>

  <div v-else class="text-center py-12">
    <v-icon size="64" color="error">mdi-alert-circle</v-icon>
    <p class="text-h6 mt-4 text-error">Processo não encontrado</p>
    <v-btn color="primary" @click="goBack" class="mt-4">
      <v-icon start>mdi-arrow-left</v-icon>
      Voltar
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import api from '@/services/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

// Importar componentes
import FieldFileModal from '@/components/FieldFileModal.vue'
import ProcessHistory from '@/components/ProcessHistory.vue'
import DocumentViewer from '@/components/DocumentViewer.vue'
import CancelProcessDialog from '@/components/CancelProcessDialog.vue'
import CreateChildProcessDialog from '@/components/CreateChildProcessDialog.vue'
import SubTasksList from '@/components/SubTasksList.vue'
import CreateSubTaskDialog from '@/components/CreateSubTaskDialog.vue'
import StepExecutionDetailDialog from '@/components/StepExecutionDetailDialog.vue'
import ProcessTablesCard from '@/components/ProcessTablesCard.vue'
import { useChildProcessStore } from '@/stores/childProcesses'
import { useSubTaskStore } from '@/stores/subTasks'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processStore = useProcessStore()

// Estado
const fieldFileModal = ref(false)
const selectedFieldFile = ref(null)
const selectedField = ref(null)
const documentsDrawer = ref(false)
const childProcessesLoading = ref(false)
const cancelProcessDialog = ref(false)
const createChildProcessDialog = ref(false)
const createSubTaskDialog = ref(false)
const selectedStepExecution = ref(null)
const parentProcessInfo = ref(null) // Informação do processo pai se este for sub-processo
const stepUsers = ref([]) // Usuários para atribuição de sub-tarefas
const subTasksReloadKey = ref(0) // Key para forçar reload do SubTasksList
const stepDetailDialog = ref(false) // Modal de detalhes da etapa
const selectedStepDetail = ref(null) // Etapa selecionada para visualizar detalhes

// Store para sub-processos e sub-tarefas
const childProcessStore = useChildProcessStore()
const subTaskStore = useSubTaskStore()

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

// Computed para campos de arquivo
const fileFields = computed(() => {
  if (!process.value?.processType?.formFields) return []
  return process.value.processType.formFields.filter(field => field.type === 'FILE')
})

const hasFormFieldFiles = computed(() => {
  return fileFields.value.some(field => getFieldFileData(field) !== null)
})

// Verificar se há dados do formulário para exibir
const hasFormDataToShow = computed(() => {
  const hasTextData = Object.keys(formattedFormData.value).length > 0
  return hasTextData || hasFormFieldFiles.value
})

// Computed para sub-processos
const childProcesses = computed(() => childProcessStore.childProcesses)

// Computed para verificar se o tipo de processo permite subprocessos
const allowSubProcesses = computed(() => {
  // Verificar se o tipo de processo permite subprocessos
  if (process.value?.processType?.allowSubProcesses === false) return false
  
  // Verificar se há tipos de processo filho configurados
  const hasAllowedChildTypes = Array.isArray(process.value?.processType?.allowedChildProcessTypes) &&
                                process.value.processType.allowedChildProcessTypes.length > 0
  
  return hasAllowedChildTypes
})

// Computed para verificar se o tipo de processo permite subtarefas
const allowSubTasks = computed(() => {
  return process.value?.processType?.allowSubTasks !== false
})

// Computed para verificar se pode cancelar o processo
const canCancelProcess = computed(() => {
  if (!process.value) return false
  // Só pode cancelar se o processo não estiver já finalizado
  return process.value.status !== 'COMPLETED' &&
         process.value.status !== 'CANCELLED' &&
         process.value.status !== 'REJECTED'
})

const formattedFormData = computed(() => {
  if (!process.value?.formData) return {}

  const formatted = {}
  const formData = process.value.formData
  const formFields = process.value.processType?.formFields || []

  Object.keys(formData).forEach(key => {
    const field = formFields.find(f => f.name === key)

    // Mostrar apenas campos que existem no formFields (vieram do CreateProcess)
    if (!field) return

    const label = field.label || key
    let value = formData[key]

    // Pular campos de arquivo (serão mostrados separadamente)
    if (field.type === 'FILE') return

    // Pular campos de tabela (serão mostrados pelo ProcessTablesCard)
    if (field.type === 'TABLE') return

    if (value !== null && value !== undefined && value !== '') {
      // Formatar data para PT-BR (dia/mês/ano)
      if (field?.type === 'DATE' && value) {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            value = date.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          }
        } catch (e) {
          console.warn('Erro ao formatar data:', e)
        }
      }

      // Formatar valores monetários
      if (field?.type === 'CURRENCY' && value) {
        try {
          const numValue = typeof value === 'string' ? parseFloat(value) : value
          if (!isNaN(numValue)) {
            value = numValue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })
          }
        } catch (e) {
          console.warn('Erro ao formatar valor monetário:', e)
        }
      }

      // Corrigir SELECT/DROPDOWN que vem como objeto JSON ou objeto direto
      if (field?.type === 'SELECT' || field?.type === 'DROPDOWN') {
        // Se for objeto direto com label/value
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          value = value.label || value.value || JSON.stringify(value)
        }
        // Se for string JSON (inclui casos com aspas extras)
        else if (typeof value === 'string') {
          try {
            // Tentar parse direto primeiro
            let parsed = JSON.parse(value)
            // Se ainda for string (JSON duplamente escapado), fazer parse novamente
            if (typeof parsed === 'string') {
              try {
                parsed = JSON.parse(parsed)
              } catch (e2) {
                // Ignorar se segundo parse falhar
              }
            }
            if (parsed && typeof parsed === 'object' && (parsed.label || parsed.value)) {
              value = parsed.label || parsed.value
            }
          } catch (e) {
            // Se não for JSON válido, tentar extrair valor via regex
            // Padrão: { "label": "Sim", "value": "Sim" } ou {"label":"Sim","value":"Sim"}
            const labelMatch = value.match(/"label"\s*:\s*"([^"]+)"/)
            const valueMatch = value.match(/"value"\s*:\s*"([^"]+)"/)
            if (labelMatch) {
              value = labelMatch[1]
            } else if (valueMatch) {
              value = valueMatch[1]
            }
          }
        }
      }

      formatted[label] = Array.isArray(value) ? value.join(', ') : value
    }
  })

  return formatted
})

// Computed para total de documentos (incluindo anexos de sub-tarefas)
const totalDocuments = computed(() => {
  if (!process.value?.stepExecutions) return 0

  let count = 0
  process.value.stepExecutions.forEach(execution => {
    // Contar anexos da etapa
    if (execution.attachments && execution.attachments.length > 0) {
      count += execution.attachments.length
    }
    // Contar anexos das sub-tarefas
    if (execution.subTasks && execution.subTasks.length > 0) {
      execution.subTasks.forEach(subTask => {
        if (subTask.attachmentPath && subTask.attachmentName) {
          count++
        }
      })
    }
  })

  return count
})

// Métodos auxiliares de status
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

// ✅ MÉTODOS DE ESTILO PARA WORKFLOW PROFISSIONAL
function getStepClass(execution, index) {
  const classes = ['workflow-step']
  if (execution.status === 'IN_PROGRESS') classes.push('step-active')
  if (execution.status === 'COMPLETED') classes.push('step-completed')
  if (execution.status === 'REJECTED') classes.push('step-rejected')
  if (index === process.value.stepExecutions.length - 1) classes.push('step-last')
  return classes.join(' ')
}

function getStepIndicatorClass(execution) {
  const classes = ['step-indicator-circle']
  switch (execution.status) {
    case 'COMPLETED':
      classes.push('indicator-completed')
      break
    case 'IN_PROGRESS':
      classes.push('indicator-active')
      break
    case 'REJECTED':
      classes.push('indicator-rejected')
      break
    default:
      classes.push('indicator-pending')
  }
  return classes.join(' ')
}

function getConnectorClass(execution) {
  return execution.status === 'COMPLETED' ? 'connector-completed' : 'connector-pending'
}

function getStepCardClass(execution) {
  const classes = ['elevation-transition']
  if (execution.status === 'IN_PROGRESS') classes.push('card-active')
  if (execution.status === 'COMPLETED') classes.push('card-completed')
  return classes.join(' ')
}

function getStepHeaderClass(execution) {
  const classes = ['step-header']
  if (execution.status === 'IN_PROGRESS') classes.push('header-active')
  return classes.join(' ')
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
  // Se a etapa está atribuída ao criador do processo
  if (execution.step.assignedToCreator) {
    // Se temos informação do criador do processo, mostra o nome
    if (process.value?.createdBy?.name) {
      return `${process.value.createdBy.name} (Criador)`
    }
    return 'Criador do Processo'
  }
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
  if (execution.status === 'COMPLETED' || execution.status === 'REJECTED' || execution.status === 'SKIPPED') {
    return false
  }

  const allExecutions = process.value?.stepExecutions || []
  const sortedExecutions = [...allExecutions].sort((a, b) =>
    (a.step?.order || 0) - (b.step?.order || 0)
  )

  const firstPending = sortedExecutions.find(se =>
    se.status !== 'COMPLETED' && se.status !== 'SKIPPED' && se.status !== 'REJECTED'
  )

  if (firstPending?.id !== execution.id) {
    return false
  }

  const user = authStore.user
  const step = execution.step

  const stepSectorId = step.assignedToSector?.id || step.assignedToSectorId
  const stepUserId = step.assignedToUser?.id || step.assignedToUserId

  if (step.assignedToCreator && process.value?.createdBy?.id === user?.id) {
    return true
  }

  if (stepUserId && stepUserId === user?.id) {
    return true
  }

  if (stepSectorId && authStore.activeSectorId && stepSectorId === authStore.activeSectorId) {
    return true
  }

  if (authStore.isAdmin) {
    return true
  }

  return false
}

// ✅ MÉTODOS PARA ANEXOS DAS ETAPAS
// Filtra anexos que NÃO são de campos do formulário (isFormField)
function getStepRealAttachments(execution) {
  if (!execution.attachments) return []
  return execution.attachments.filter(att => {
    if (att.signatureData) {
      try {
        const sigData = typeof att.signatureData === 'string'
          ? JSON.parse(att.signatureData)
          : att.signatureData
        if (sigData?.isFormField) {
          return false // Excluir - é anexo do formulário de criação
        }
      } catch (e) { /* ignora */ }
    }
    return true
  })
}

function hasStepAttachments(execution) {
  return getStepRealAttachments(execution).length > 0
}

function getStepAttachmentsCount(execution) {
  return getStepRealAttachments(execution).length
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function formatTimeAgo(date) {
  return dayjs(date).fromNow()
}

// 🆕 Função para calcular status do SLA por execução
function getExecutionSlaStatus(execution) {
  if (!execution.dueAt) {
    return {
      hasDeadline: false,
      isOverdue: false,
      isNearDeadline: false,
      remainingText: '',
      overdueText: ''
    }
  }
  
  const now = dayjs()
  const dueAt = dayjs(execution.dueAt)
  
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
    overdueText
  }
}

function getCurrentStep(process) {
  return process.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
}

// Métodos para campos de arquivo
function getFieldFileData(field) {
  const formData = process.value?.formData
  if (!formData || !formData[field.name]) return null
  
  const fieldData = formData[field.name]
  
  // Campo único (objeto AttachmentMeta)
  if (typeof fieldData === 'object' && !Array.isArray(fieldData) && fieldData.attachmentId) {
    return fieldData
  }
  
  // Campo múltiplo (array de AttachmentMeta)
  if (Array.isArray(fieldData)) {
    return fieldData.filter(item => item && item.attachmentId)
  }
  
  // Compatibilidade: Se é string (ID direto - formato legado)
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

// Abrir modal específico para arquivo de campo
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
  // Usar histórico do navegador para voltar à página anterior
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/gerenciar-processos')
  }
}

// Buscar informações do processo pai (se este for sub-processo)
async function loadParentProcess() {
  try {
    const result = await childProcessStore.fetchParentProcess(route.params.id)
    parentProcessInfo.value = result
  } catch (err) {
    parentProcessInfo.value = null
  }
}

function executeCurrentStep() {
  if (currentStepExecution.value) {
    executeStep(currentStepExecution.value)
  }
}

function executeStep(execution) {
  router.push(`/processos/${process.value.id}/executar/${execution.id}`)
}

async function refreshProcess() {
  try {
    await processStore.fetchProcess(route.params.id)
    window.showSnackbar?.('Processo atualizado!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao atualizar processo', 'error')
  }
}

// Funções para sub-processos
async function loadChildProcesses() {
  if (!process.value?.id) return

  childProcessesLoading.value = true
  try {
    await childProcessStore.fetchChildProcesses(process.value.id)
  } catch (error) {
    // Erro silencioso
  } finally {
    childProcessesLoading.value = false
  }
}

let isNavigatingToChild = false

function viewChildProcess(childProcess) {
  if (isNavigatingToChild) {
    return
  }

  const processId = childProcess?.id
  if (processId) {
    isNavigatingToChild = true
    router.push(`/processos/${processId}`).finally(() => {
      setTimeout(() => {
        isNavigatingToChild = false
      }, 500)
    })
  } else {
    window.showSnackbar?.('Erro ao abrir sub-processo', 'error')
  }
}

function getChildStatusColor(status) {
  const colors = {
    PENDING: 'grey',
    ACTIVE: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    FAILED: 'error'
  }
  return colors[status] || 'grey'
}

function getChildStatusIcon(status) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    ACTIVE: 'mdi-play-circle',
    COMPLETED: 'mdi-check-circle',
    CANCELLED: 'mdi-cancel',
    FAILED: 'mdi-alert-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

function getChildStatusLabel(status) {
  const labels = {
    PENDING: 'Pendente',
    ACTIVE: 'Em andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    FAILED: 'Falhou'
  }
  return labels[status] || status
}

// Funções para diálogos
function openCreateChildProcessDialog() {
  createChildProcessDialog.value = true
}

async function handleCancelProcess({ processId, reason }) {
  try {
    await processStore.cancelProcess(processId, reason)
    cancelProcessDialog.value = false
    await refreshProcess()
    window.showSnackbar?.('Processo cancelado com sucesso', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao cancelar processo', 'error')
  }
}

async function handleChildProcessCreated() {
  createChildProcessDialog.value = false
  await loadChildProcesses()
  window.showSnackbar?.('Sub-processo criado com sucesso', 'success')
}

// Funções para sub-tarefas
function openCreateSubTaskDialog(execution) {
  selectedStepExecution.value = execution
  createSubTaskDialog.value = true
}

// Função para abrir modal de detalhes da etapa
function openStepDetailDialog(execution) {
  selectedStepDetail.value = execution
  stepDetailDialog.value = true
}

async function handleSubTaskCreated() {
  createSubTaskDialog.value = false
  // Forçar reload do SubTasksList incrementando a key
  subTasksReloadKey.value++
}

watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    isNavigatingToChild = false
    parentProcessInfo.value = null
    try {
      await processStore.fetchProcess(newId)
      await loadChildProcesses()
      await loadParentProcess()
    } catch (error) {
      window.showSnackbar?.('Erro ao carregar processo', 'error')
    }
  }
})

onMounted(async () => {
  try {
    await processStore.fetchProcess(route.params.id)
    await loadChildProcesses()
    await loadParentProcess()
  } catch (error) {
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

.max-width{
  max-width: 610px;
}


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


.workflow-timeline-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.workflow-container {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.02), rgba(66, 165, 245, 0.01));
  border-radius: 0 0 16px 16px;
}

.workflow-steps {
  position: relative;
}

.workflow-step {
  display: flex;
  margin-bottom: 32px;
  position: relative;
}

.workflow-step.step-last {
  margin-bottom: 0;
}


.step-indicator {
  position: relative;
  margin-right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

.step-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.step-text {
  color: white;
  font-weight: 700;
}

.indicator-completed {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border: 3px solid #e8f5e8;
}

.indicator-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  border: 3px solid #fff3e0;
  animation: pulse 2s infinite;
}

.indicator-rejected {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  border: 3px solid #ffebee;
}

.indicator-pending {
  background: linear-gradient(135deg, #9E9E9E, #757575);
  border: 3px solid #f5f5f5;
}

@keyframes pulse {
  0% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0.7);
  }
  70% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 10px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(255, 152, 0, 0);
  }
}


.step-connector {
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 32px;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.connector-completed {
  background: linear-gradient(180deg, #4CAF50, #45a049);
}

.connector-pending {
  background: linear-gradient(180deg, #e0e0e0, #bdbdbd);
}

.step-content {
  flex: 1;
  max-width: calc(100% - 72px);
}

.step-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
}

.card-active {
  border-color: rgba(255, 152, 0, 0.3);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.15);
}

.card-completed {
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(76, 175, 80, 0.02);
}

.step-card-header {
  padding: 20px 24px;
  background: white;
  transition: all 0.3s ease;
}

.header-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
  color: white;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.step-subtitle {
  font-size: 0.875rem;
  margin: 4px 0 0 0;
  line-height: 1.4;
  opacity: 0.8;
}

.step-status-badge {
  flex-shrink: 0;
}

.step-card-body {
  background: white;
}

.step-info-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(25, 118, 210, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(25, 118, 210, 0.1);
}

.info-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-top: 2px;
}


.step-comment {
  background: rgba(33, 150, 243, 0.04);
  border: 1px solid rgba(33, 150, 243, 0.12);
  border-radius: 12px;
  padding: 16px;
}

.comment-header {
  display: flex;
  align-items: center;
}

.comment-body {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid rgb(var(--v-theme-primary));
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.8);
}


.step-features {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 16px;
}

.step-card-actions {
  background: rgba(25, 118, 210, 0.02);
  border-top: 1px solid rgba(25, 118, 210, 0.1);
}

.execute-button {
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.25px;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.execute-button:hover {
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
  transform: translateY(-1px);
}


@media (max-width: 768px) {
  .workflow-step {
    flex-direction: column;
    margin-bottom: 24px;
  }
  
  .step-indicator {
    margin-right: 0;
    margin-bottom: 16px;
    flex-direction: row;
    justify-content: center;
  }
  
  .step-connector {
    display: none;
  }
  
  .step-content {
    max-width: 100%;
  }
  
  .step-info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .info-item {
    padding: 10px;
  }
  
  .step-number {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }
  
  .step-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .workflow-container {
    padding: 16px;
  }
  
  .step-card-header {
    padding: 16px;
  }
  
  .step-card-body {
    padding: 16px;
  }
  
  .step-card-actions {
    padding: 16px;
  }
}


.elevation-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-card:hover {
  transform: translateY(-2px);
}

.card-active:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 152, 0, 0.2);
}


.workflow-container::-webkit-scrollbar {
  width: 6px;
}

.workflow-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.workflow-container::-webkit-scrollbar-thumb {
  background: rgba(25, 118, 210, 0.3);
  border-radius: 3px;
}

.workflow-container::-webkit-scrollbar-thumb:hover {
  background: rgba(25, 118, 210, 0.5);
}

/* Botão Flutuante de Documentos */
.documents-fab {
  position: fixed !important;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.documents-fab:hover {
  transform: scale(1.1) translateY(-4px);
  box-shadow: 0 12px 32px rgba(25, 118, 210, 0.4) !important;
}

.documents-fab:active {
  transform: scale(0.95);
}

/* Drawer de Documentos */
.documents-drawer {
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15) !important;
}

@media (max-width: 768px) {
  .documents-fab {
    bottom: 24px;
    right: 24px;
  }

  .documents-drawer {
    width: 100% !important;
    max-width: 100vw !important;
  }
}
</style>