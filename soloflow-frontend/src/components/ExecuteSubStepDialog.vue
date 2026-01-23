<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    persistent
    aria-labelledby="execute-substep-title"
  >
    <v-card v-if="subStep" class="execute-substep-card" role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="substep-header" :class="getHeaderClass()" id="execute-substep-title">
        <div class="d-flex align-center justify-space-between pa-4">
          <div class="d-flex align-center">
            <v-icon class="mr-3" :color="getHeaderIconColor()" size="28">
              mdi-subdirectory-arrow-right
            </v-icon>
            <div>
              <v-chip size="x-small" color="secondary" variant="flat" class="mb-1">
                Sub-etapa
              </v-chip>
              <h3 class="text-h6 font-weight-bold" :class="{ 'text-white': subStep.status === 'IN_PROGRESS' }">
                {{ subStep.subTaskTemplate?.name || subStep.name || 'Sub-etapa' }}
              </h3>
            </div>
          </div>
          <v-chip
            :color="getStatusColor(subStep.status)"
            :variant="subStep.status === 'IN_PROGRESS' ? 'flat' : 'tonal'"
          >
            <v-icon start size="16">{{ getStatusIcon(subStep.status) }}</v-icon>
            {{ getStatusLabel(subStep.status) }}
          </v-chip>
        </div>
      </div>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Descrição -->
        <div v-if="subStep.subTaskTemplate?.description || subStep.description" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="primary">mdi-text</v-icon>
            Descrição
          </h4>
          <p class="text-body-2 text-medium-emphasis">
            {{ subStep.subTaskTemplate?.description || subStep.description }}
          </p>
        </div>

        <!-- Instruções -->
        <div v-if="subStep.subTaskTemplate?.instructions" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="info">mdi-clipboard-text</v-icon>
            Instruções
          </h4>
          <v-alert type="info" variant="tonal" density="compact">
            {{ subStep.subTaskTemplate.instructions }}
          </v-alert>
        </div>

        <!-- Informações -->
        <div class="info-grid mb-6">
          <div v-if="subStep.executor" class="info-card">
            <v-icon size="20" color="primary">mdi-account-check</v-icon>
            <div>
              <span class="info-label">Responsável</span>
              <span class="info-value">{{ subStep.executor.name }}</span>
            </div>
          </div>

          <div v-if="subStep.dueAt" class="info-card" :class="{ 'error-bg': isOverdue }">
            <v-icon size="20" :color="isOverdue ? 'error' : 'warning'">
              {{ isOverdue ? 'mdi-clock-alert' : 'mdi-clock-outline' }}
            </v-icon>
            <div>
              <span class="info-label">Prazo</span>
              <span class="info-value" :class="{ 'text-error': isOverdue }">
                {{ formatDate(subStep.dueAt) }}
              </span>
            </div>
          </div>

          <div v-if="subStep.startedAt" class="info-card">
            <v-icon size="20" color="success">mdi-play-circle</v-icon>
            <div>
              <span class="info-label">Iniciado em</span>
              <span class="info-value">{{ formatDate(subStep.startedAt) }}</span>
            </div>
          </div>

          <div v-if="subStep.completedAt" class="info-card">
            <v-icon size="20" color="success">mdi-check-circle</v-icon>
            <div>
              <span class="info-label">Concluído em</span>
              <span class="info-value">{{ formatDate(subStep.completedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Comentário (para quando a sub-etapa já foi executada) -->
        <div v-if="subStep.comment" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="secondary">mdi-comment-text</v-icon>
            Comentário
          </h4>
          <v-card variant="tonal" color="secondary" class="pa-3">
            <p class="text-body-2 mb-0">{{ subStep.comment }}</p>
          </v-card>
        </div>

        <!-- Anexo existente (quando já foi enviado) -->
        <div v-if="subStep.attachmentName" class="mb-6">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="info">mdi-paperclip</v-icon>
            Anexo Enviado
          </h4>
          <v-card variant="flat" class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon :color="getAttachmentColor()" size="24" class="mr-2">
                  {{ getAttachmentIcon() }}
                </v-icon>
                <span class="text-body-2 font-weight-medium">{{ subStep.attachmentName }}</span>
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  @click="downloadAttachment"
                >
                  <v-icon start size="18">mdi-download</v-icon>
                  Baixar
                </v-btn>
              </div>
            </div>
            <v-chip
              v-if="subStep.requireSignature"
              size="x-small"
              color="warning"
              variant="tonal"
              class="mt-2"
            >
              <v-icon start size="12">mdi-draw-pen</v-icon>
              Requer assinatura
            </v-chip>
          </v-card>
        </div>

        <!-- Campo de anexo (quando permitido) -->
        <div v-if="canExecute && subStep.subTaskTemplate?.allowAttachment" class="mb-4">
          <h4 class="text-subtitle-2 font-weight-medium mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2" color="info">mdi-paperclip</v-icon>
            Anexo
          </h4>
          <v-file-input
            v-model="attachmentFile"
            label="Selecione um arquivo"
            variant="outlined"
            density="comfortable"
            prepend-icon=""
            prepend-inner-icon="mdi-upload"
            :show-size="true"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            @change="handleFileChange"
            aria-label="Selecionar arquivo para anexar"
          >
            <template v-slot:selection="{ fileNames }">
              <v-chip
                v-for="fileName in fileNames"
                :key="fileName"
                color="primary"
                size="small"
                label
                class="me-2"
              >
                {{ fileName }}
              </v-chip>
            </template>
          </v-file-input>
          <p class="text-caption text-grey mt-1">
            Formatos aceitos: imagens, PDF, documentos do Office, texto
          </p>

          <!-- Configuração de assinatura para PDFs -->
          <div v-if="attachmentFile && isPdfFile" class="signature-config-section mt-4">
            <v-card variant="flat" class="pa-4" :class="{ 'signature-enabled': showSignatureConfig }">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center">
                  <v-icon color="warning" class="mr-2" size="24">mdi-file-sign</v-icon>
                  <div>
                    <h4 class="text-subtitle-2 font-weight-bold">Assinatura Digital</h4>
                    <p class="text-caption text-medium-emphasis ma-0">Configure quem deve assinar este documento</p>
                  </div>
                </div>
                <v-chip
                  size="small"
                  :color="showSignatureConfig ? 'warning' : 'grey'"
                  variant="flat"
                >
                  {{ showSignatureConfig ? 'Habilitado' : 'Opcional' }}
                </v-chip>
              </div>

              <v-switch
                v-model="showSignatureConfig"
                color="warning"
                density="compact"
                hide-details
                class="mb-3"
              >
                <template v-slot:label>
                  <span class="text-body-2">Requer assinatura digital</span>
                </template>
              </v-switch>

              <v-expand-transition>
                <div v-if="showSignatureConfig">
                  <!-- Tipo de assinatura -->
                  <div class="mb-4">
                    <label class="text-caption font-weight-medium mb-2 d-block text-medium-emphasis">Tipo de Assinatura</label>
                    <v-btn-toggle
                      v-model="signatureType"
                      mandatory
                      divided
                      variant="outlined"
                      color="primary"
                      density="compact"
                      class="w-100"
                    >
                      <v-btn value="SEQUENTIAL" size="small" class="text-none flex-1">
                        <v-icon start size="18">mdi-order-numeric-ascending</v-icon>
                        <span class="text-body-2">Sequencial</span>
                      </v-btn>
                      <v-btn value="PARALLEL" size="small" class="text-none flex-1">
                        <v-icon start size="18">mdi-account-multiple</v-icon>
                        <span class="text-body-2">Paralelo</span>
                      </v-btn>
                    </v-btn-toggle>
                  </div>

                  <!-- Autocomplete de assinantes -->
                  <v-autocomplete
                    v-model="selectedSigners"
                    :items="availableSigners"
                    :loading="loadingSigners"
                    item-value="id"
                    item-title="name"
                    label="Assinantes"
                    placeholder="Digite para buscar..."
                    multiple
                    chips
                    closable-chips
                    variant="outlined"
                    density="compact"
                    hide-details
                  >
                    <template v-slot:chip="{ props, item }">
                      <v-chip v-bind="props" size="small" color="warning" variant="tonal">
                        <v-avatar :color="getAvatarColor(item.raw.name)" size="20" class="mr-1">
                          <span style="font-size: 9px; font-weight: bold;" class="text-white">
                            {{ getInitials(item.raw.name) }}
                          </span>
                        </v-avatar>
                        {{ item.raw.name }}
                      </v-chip>
                    </template>
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" :title="null" :subtitle="null">
                        <template v-slot:prepend>
                          <v-avatar :color="getAvatarColor(item.raw.name)" size="32">
                            <span class="text-caption font-weight-bold text-white">
                              {{ getInitials(item.raw.name) }}
                            </span>
                          </v-avatar>
                        </template>
                        <v-list-item-title class="text-body-2 font-weight-medium">
                          {{ item.raw.name }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-medium-emphasis">
                          {{ item.raw.email }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-autocomplete>

                  <!-- Lista ordenável (modo sequencial) -->
                  <div v-if="signatureType === 'SEQUENTIAL' && selectedSigners.length > 0" class="mt-3">
                    <div class="d-flex align-center mb-2">
                      <v-icon size="16" class="mr-1">mdi-order-numeric-ascending</v-icon>
                      <span class="text-caption font-weight-medium">Ordem de Assinatura</span>
                    </div>
                    <v-list density="compact" class="signature-order-list">
                      <v-list-item v-for="(signerId, signerIndex) in selectedSigners" :key="signerId" class="px-2 py-1">
                        <template v-slot:prepend>
                          <span class="order-number">{{ signerIndex + 1 }}</span>
                        </template>
                        <v-list-item-title class="text-body-2">{{ getSignerName(signerId) }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption">{{ getSignerEmail(signerId) }}</v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn-group density="compact" variant="text">
                            <v-btn v-if="signerIndex > 0" icon="mdi-arrow-up" size="x-small" @click="moveSignerUp(signerIndex)" />
                            <v-btn v-if="signerIndex < selectedSigners.length - 1" icon="mdi-arrow-down" size="x-small" @click="moveSignerDown(signerIndex)" />
                          </v-btn-group>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>

                  <!-- Resumo (modo paralelo) -->
                  <div v-else-if="signatureType === 'PARALLEL' && selectedSigners.length > 0" class="mt-3">
                    <v-alert type="info" density="compact" variant="tonal">
                      <span class="text-caption">{{ selectedSigners.length }} pessoa(s) poderá(ão) assinar em qualquer ordem</span>
                    </v-alert>
                  </div>
                </div>
              </v-expand-transition>
            </v-card>
          </div>
        </div>

        <!-- Alerta quando não pode executar -->
        <v-alert
          v-if="blockMessage && subStep.status !== 'COMPLETED' && subStep.status !== 'SKIPPED'"
          type="warning"
          variant="tonal"
          class="mb-4"
          density="compact"
        >
          <v-icon start>mdi-lock</v-icon>
          {{ blockMessage }}
        </v-alert>

        <!-- Campo de comentário (para execução) -->
        <div v-if="canExecute" class="mb-4">
          <v-textarea
            v-model="comment"
            label="Comentário (opcional)"
            placeholder="Adicione um comentário sobre a execução desta sub-etapa..."
            variant="outlined"
            density="comfortable"
            rows="3"
            prepend-inner-icon="mdi-comment-text-outline"
            aria-label="Comentário sobre a execução"
          />
        </div>
      </v-card-text>

      <v-divider />

      <!-- Ações -->
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="close">
          {{ canExecute ? 'Cancelar' : 'Fechar' }}
        </v-btn>

        <v-spacer />

        <!-- Ações quando pode executar -->
        <template v-if="canExecute">
          <!-- Iniciar -->
          <v-btn
            v-if="subStep.status === 'PENDING'"
            variant="tonal"
            color="primary"
            :loading="starting"
            @click="start"
          >
            <v-icon start>mdi-play</v-icon>
            Iniciar
          </v-btn>

          <!-- Concluir -->
          <v-btn
            v-if="subStep.status === 'IN_PROGRESS'"
            variant="elevated"
            color="success"
            :loading="completing"
            @click="complete"
          >
            <v-icon start>mdi-check</v-icon>
            Concluir
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import dayjs from 'dayjs'

const authStore = useAuthStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  subStep: {
    type: Object,
    default: null
  },
  stepStatus: {
    type: String,
    default: 'PENDING'
  }
})

const emit = defineEmits(['update:modelValue', 'executed'])

const comment = ref('')
const attachmentFile = ref(null)
const uploading = ref(false)
const starting = ref(false)
const completing = ref(false)

// Configuração de assinatura
const showSignatureConfig = ref(false)
const signatureType = ref('SEQUENTIAL')
const selectedSigners = ref([])
const availableSigners = ref([])
const loadingSigners = ref(false)

const canExecute = computed(() => {
  if (!props.subStep) return false
  if (props.stepStatus !== 'IN_PROGRESS') return false
  if (props.subStep.status === 'COMPLETED' ||
      props.subStep.status === 'CANCELLED' ||
      props.subStep.status === 'SKIPPED') return false

  // Se tem responsável definido, só ele pode executar
  if (props.subStep.executorId && props.subStep.executorId !== authStore.user?.id) {
    return false
  }

  return true
})

// Verifica se é o responsável da sub-tarefa
const isResponsible = computed(() => {
  if (!props.subStep) return false
  // Se não tem responsável definido, qualquer um pode
  if (!props.subStep.executorId) return true
  return props.subStep.executorId === authStore.user?.id
})

// Mensagem de bloqueio para exibir
const blockMessage = computed(() => {
  if (!props.subStep) return null
  if (props.stepStatus !== 'IN_PROGRESS') return 'A etapa pai não está em andamento'
  if (props.subStep.executorId && props.subStep.executorId !== authStore.user?.id) {
    return `Apenas ${props.subStep.executor?.name || 'o responsável'} pode executar esta sub-etapa`
  }
  return null
})

const isOverdue = computed(() => {
  if (!props.subStep?.dueAt) return false
  if (props.subStep.status === 'COMPLETED' || props.subStep.status === 'SKIPPED') return false
  return dayjs().isAfter(dayjs(props.subStep.dueAt))
})

const isPdfFile = computed(() => {
  if (!attachmentFile.value) return false
  // No Vuetify 3, v-file-input sem 'multiple' retorna um File, não um array
  const file = Array.isArray(attachmentFile.value) ? attachmentFile.value[0] : attachmentFile.value
  if (!file) return false
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')
})

function getHeaderClass() {
  if (props.subStep?.status === 'IN_PROGRESS') return 'header-active'
  if (props.subStep?.status === 'COMPLETED') return 'header-completed'
  return ''
}

function getHeaderIconColor() {
  if (props.subStep?.status === 'IN_PROGRESS') return 'white'
  return 'secondary'
}

function getStatusColor(status) {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    SKIPPED: 'grey',
    CANCELLED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check',
    SKIPPED: 'mdi-skip-next',
    CANCELLED: 'mdi-close'
  }
  return icons[status] || 'mdi-help'
}

function getStatusLabel(status) {
  const labels = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluída',
    SKIPPED: 'Pulada',
    CANCELLED: 'Cancelada'
  }
  return labels[status] || status
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function getAttachmentIcon() {
  const name = props.subStep?.attachmentName || ''
  const ext = name.split('.').pop()?.toLowerCase()
  const icons = {
    pdf: 'mdi-file-pdf-box',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    png: 'mdi-file-image',
    gif: 'mdi-file-image',
    doc: 'mdi-file-word',
    docx: 'mdi-file-word',
    xls: 'mdi-file-excel',
    xlsx: 'mdi-file-excel',
    txt: 'mdi-file-document'
  }
  return icons[ext] || 'mdi-file'
}

function getAttachmentColor() {
  const name = props.subStep?.attachmentName || ''
  const ext = name.split('.').pop()?.toLowerCase()
  const colors = {
    pdf: 'error',
    jpg: 'info',
    jpeg: 'info',
    png: 'info',
    gif: 'info',
    doc: 'indigo',
    docx: 'indigo',
    xls: 'success',
    xlsx: 'success',
    txt: 'warning'
  }
  return colors[ext] || 'grey'
}

async function downloadAttachment() {
  if (!props.subStep?.id) return

  try {
    const response = await api.get(`/sub-tasks/attachment/${props.subStep.id}/download`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.subStep.attachmentName || 'anexo'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)

    window.showSnackbar?.('Download iniciado!', 'success')
  } catch (err) {
    console.error('Erro ao baixar anexo:', err)
    window.showSnackbar?.('Erro ao baixar anexo', 'error')
  }
}

function close() {
  comment.value = ''
  attachmentFile.value = null
  showSignatureConfig.value = false
  signatureType.value = 'SEQUENTIAL'
  selectedSigners.value = []
  emit('update:modelValue', false)
}

// Funções para assinantes
async function loadSigners() {
  loadingSigners.value = true
  try {
    const response = await api.get('/users')
    availableSigners.value = response.data || []
  } catch (err) {
    console.error('Erro ao carregar usuários:', err)
    availableSigners.value = []
  } finally {
    loadingSigners.value = false
  }
}

function getSignerName(signerId) {
  const signer = availableSigners.value.find(s => s.id === signerId)
  return signer?.name || 'Usuário não encontrado'
}

function getSignerEmail(signerId) {
  const signer = availableSigners.value.find(s => s.id === signerId)
  return signer?.email || ''
}

function getAvatarColor(name) {
  if (!name) return 'grey'
  const colors = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function moveSignerUp(index) {
  if (index > 0) {
    const temp = selectedSigners.value[index]
    selectedSigners.value[index] = selectedSigners.value[index - 1]
    selectedSigners.value[index - 1] = temp
  }
}

function moveSignerDown(index) {
  if (index < selectedSigners.value.length - 1) {
    const temp = selectedSigners.value[index]
    selectedSigners.value[index] = selectedSigners.value[index + 1]
    selectedSigners.value[index + 1] = temp
  }
}

function handleFileChange(event) {
  // O v-model já atualiza attachmentFile, mas podemos adicionar validação aqui se necessário
  if (attachmentFile.value) {
    // No Vuetify 3, v-file-input sem 'multiple' retorna um File, não um array
    const file = Array.isArray(attachmentFile.value) ? attachmentFile.value[0] : attachmentFile.value
    if (file) {
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        window.showSnackbar?.('Arquivo muito grande. Máximo: 10MB', 'error')
        attachmentFile.value = null
      }
    }
  }
}

async function uploadAttachment() {
  if (!attachmentFile.value) {
    return null
  }

  // No Vuetify 3, v-file-input sem 'multiple' retorna um File, não um array
  const file = Array.isArray(attachmentFile.value) ? attachmentFile.value[0] : attachmentFile.value
  if (!file) {
    return null
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('subTaskId', props.subStep.id)
  formData.append('requireSignature', showSignatureConfig.value ? 'true' : 'false')

  // Adicionar dados de assinatura se habilitado
  if (showSignatureConfig.value && selectedSigners.value.length > 0) {
    formData.append('signatureType', signatureType.value)
    formData.append('signers', JSON.stringify(selectedSigners.value))
  }

  try {
    const response = await api.post('/sub-tasks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (err) {
    console.error('Erro ao fazer upload:', err)
    throw err
  }
}

async function start() {
  starting.value = true
  try {
    const response = await api.post('/sub-tasks/execute', {
      subTaskId: props.subStep.id,
      status: 'IN_PROGRESS',
      comment: comment.value || undefined
    })
    emit('executed', response.data)
    window.showSnackbar?.('Sub-etapa iniciada!', 'success')
  } catch (err) {
    window.showSnackbar?.('Erro ao iniciar sub-etapa', 'error')
  } finally {
    starting.value = false
  }
}

async function complete() {
  completing.value = true
  try {
    // Se há anexo, fazer upload primeiro
    if (attachmentFile.value) {
      uploading.value = true
      try {
        await uploadAttachment()
      } catch (err) {
        window.showSnackbar?.('Erro ao enviar anexo', 'error')
        completing.value = false
        uploading.value = false
        return
      }
      uploading.value = false
    }

    const response = await api.post('/sub-tasks/execute', {
      subTaskId: props.subStep.id,
      status: 'COMPLETED',
      comment: comment.value || undefined
    })
    emit('executed', response.data)
    close()
    window.showSnackbar?.('Sub-etapa concluída!', 'success')
  } catch (err) {
    window.showSnackbar?.('Erro ao concluir sub-etapa', 'error')
  } finally {
    completing.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Carregar usuários quando o modal abrir
    if (availableSigners.value.length === 0) {
      loadSigners()
    }
  } else {
    comment.value = ''
    attachmentFile.value = null
    showSignatureConfig.value = false
    signatureType.value = 'SEQUENTIAL'
    selectedSigners.value = []
  }
})
</script>

<style scoped>
.execute-substep-card {
  border-radius: 16px;
  overflow: hidden;
}

.substep-header {
  background: white;
  transition: all 0.3s ease;
}

.header-active {
  background: linear-gradient(135deg, #FF9800, #f57c00);
}

.header-completed {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(156, 39, 176, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(156, 39, 176, 0.1);
}

.info-card.error-bg {
  background: rgba(244, 67, 54, 0.04);
  border-color: rgba(244, 67, 54, 0.2);
}

.info-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

/* Seção de configuração de assinatura */
.signature-config-section .v-card {
  transition: all 0.3s ease;
}

.signature-config-section .signature-enabled {
  border-color: #ff9800 !important;
  background: rgba(255, 152, 0, 0.02);
}

.signature-order-list {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.signature-order-list .v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.signature-order-list .v-list-item:last-child {
  border-bottom: none;
}

.order-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #1976d2;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
}
</style>
