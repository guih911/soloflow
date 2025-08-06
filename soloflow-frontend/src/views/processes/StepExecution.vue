<template>
  <div v-if="stepExecution && process">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="goBack"
      />
      <div class="ml-4">
        <h1 class="text-h4 font-weight-bold">
          Executar Etapa
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          {{ process.code }} - {{ process.title }}
        </p>
      </div>
    </div>

    <v-row>
      <!-- Informações da Etapa -->
      <v-col cols="12" md="8">
        <v-card class="mb-6">
          <v-card-title>
            <v-icon
              :color="getStepTypeColor(stepExecution.step.type)"
              class="mr-2"
            >
              {{ getStepTypeIcon(stepExecution.step.type) }}
            </v-icon>
            {{ stepExecution.step.name }}
          </v-card-title>
          
          <v-divider />

          <v-card-text>
            <v-alert
              v-if="stepExecution.step.description"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              {{ stepExecution.step.description }}
            </v-alert>

            <!-- Formulário dinâmico baseado no tipo de etapa -->
            <v-form ref="form" v-model="valid">
              <!-- Campo de comentário (sempre presente) -->
              <v-textarea
                v-model="formData.comment"
                label="Comentário"
                rows="3"
                :rules="stepExecution.step.type === 'INPUT' ? [v => !!v || 'Comentário é obrigatório'] : []"
                class="mb-4"
              />

              <!-- Ações disponíveis -->
              <div v-if="stepExecution.step.actions && JSON.parse(stepExecution.step.actions).length > 0">
                <p class="text-subtitle-2 mb-2">Ação:</p>
                <v-radio-group
                  v-model="formData.action"
                  :rules="[v => !!v || 'Selecione uma ação']"
                >
                  <v-radio
                    v-for="action in JSON.parse(stepExecution.step.actions)"
                    :key="action"
                    :label="getActionLabel(action)"
                    :value="action"
                  />
                </v-radio-group>
              </div>
            </v-form>

            <!-- Área de Anexos -->
            <div v-if="stepExecution.step.allowAttachment" class="mt-6">
              <v-divider class="mb-4" />
              
              <div class="d-flex align-center justify-space-between mb-3">
                <h3 class="text-h6">Anexos</h3>
                <v-btn
                  size="small"
                  color="primary"
                  variant="tonal"
                  @click="$refs.fileInput.click()"
                >
                  <v-icon start>mdi-upload</v-icon>
                  Adicionar Arquivo
                </v-btn>
                <input
                  ref="fileInput"
                  type="file"
                  style="display: none"
                  multiple
                  @change="handleFileSelect"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              <!-- Lista de anexos -->
              <v-list v-if="attachments.length > 0" density="compact">
                <v-list-item
                  v-for="(file, index) in attachments"
                  :key="index"
                  class="px-0"
                >
                  <template v-slot:prepend>
                    <v-icon>{{ getFileIcon(file.type) }}</v-icon>
                  </template>

                  <v-list-item-title>{{ file.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatFileSize(file.size) }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-btn
                      v-if="stepExecution.step.requiresSignature && file.type === 'application/pdf' && !file.signed"
                      icon="mdi-draw-pen"
                      size="small"
                      variant="text"
                      color="primary"
                      @click="openSignatureDialog(file, index)"
                    />
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeFile(index)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <v-alert
                v-else
                type="info"
                variant="tonal"
                text="Nenhum arquivo anexado"
              />

              <v-alert
                v-if="stepExecution.step.requiresSignature"
                type="warning"
                variant="tonal"
                class="mt-3"
              >
                <v-icon>mdi-alert</v-icon>
                Esta etapa requer assinatura digital em documentos PDF
              </v-alert>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="goBack"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :loading="saving"
              :disabled="!canSubmit"
              @click="executeStep"
            >
              <v-icon start>mdi-check</v-icon>
              Concluir Etapa
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Histórico do Processo -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Histórico</v-card-title>
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item
              v-for="execution in process.stepExecutions.filter(e => e.status === 'COMPLETED')"
              :key="execution.id"
            >
              <template v-slot:prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              
              <v-list-item-title>{{ execution.step.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <div>{{ execution.executor?.name || 'Sistema' }}</div>
                <div>{{ formatDate(execution.completedAt) }}</div>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de Assinatura -->
    <v-dialog
      v-model="signatureDialog"
      max-width="600"
    >
      <v-card>
        <v-card-title>Assinar Documento</v-card-title>
        <v-divider />
        
        <v-card-text>
          <p class="mb-4">
            Documento: <strong>{{ signingFile?.name }}</strong>
          </p>

          <v-tabs v-model="signatureTab" class="mb-4">
            <v-tab value="draw">Desenhar</v-tab>
            <v-tab value="text">Texto</v-tab>
          </v-tabs>

          <v-window v-model="signatureTab">
            <!-- Assinatura por Desenho -->
            <v-window-item value="draw">
              <div class="signature-pad-container">
                <canvas
                  ref="signaturePad"
                  class="signature-pad"
                  width="550"
                  height="200"
                />
              </div>
              <v-btn
                size="small"
                variant="text"
                @click="clearSignature"
                class="mt-2"
              >
                <v-icon start>mdi-eraser</v-icon>
                Limpar
              </v-btn>
            </v-window-item>

            <!-- Assinatura por Texto -->
            <v-window-item value="text">
              <v-text-field
                v-model="textSignature"
                label="Digite seu nome completo"
                variant="outlined"
              />
              <div
                class="text-signature-preview mt-3"
                v-if="textSignature"
              >
                {{ textSignature }}
              </div>
            </v-window-item>
          </v-window>

          <v-alert
            type="info"
            variant="tonal"
            class="mt-4"
          >
            Ao assinar, você confirma que leu e concorda com o conteúdo do documento.
            Data e hora serão registradas automaticamente.
          </v-alert>
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
            :disabled="!hasSignature"
            @click="applySignature"
          >
            Assinar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="text-center py-12">
    <v-progress-circular
      indeterminate
      color="primary"
      size="64"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'

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

const canSubmit = computed(() => {
  if (!valid.value) return false
  
  // Se requer assinatura, verificar se todos os PDFs foram assinados
  if (stepExecution.value?.step.requiresSignature) {
    const pdfs = attachments.value.filter(f => f.type === 'application/pdf')
    return pdfs.length > 0 && pdfs.every(f => f.signed)
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

function getActionLabel(action) {
  const labels = {
    aprovar: 'Aprovar',
    rejeitar: 'Rejeitar',
    enviar: 'Enviar',
    devolver: 'Devolver'
  }
  return labels[action] || action
}

function getFileIcon(type) {
  if (type.includes('pdf')) return 'mdi-file-pdf-box'
  if (type.includes('image')) return 'mdi-file-image'
  if (type.includes('word')) return 'mdi-file-word'
  return 'mdi-file'
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

// Métodos de arquivo
async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  
  for (const file of files) {
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      window.showSnackbar(`Arquivo ${file.name} muito grande (máx: 10MB)`, 'error')
      continue
    }
    
    attachments.value.push({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      signed: false
    })
  }
  
  // Limpar input
  event.target.value = ''
}

function removeFile(index) {
  attachments.value.splice(index, 1)
}

// Métodos de assinatura
function openSignatureDialog(file, index) {
  signingFile.value = file
  signingFileIndex.value = index
  signatureDialog.value = true
  
  nextTick(() => {
    if (signaturePad.value) {
      const canvas = signaturePad.value
      signaturePadContext.value = canvas.getContext('2d')
      
      // Configurar canvas
      signaturePadContext.value.strokeStyle = '#000'
      signaturePadContext.value.lineWidth = 2
      signaturePadContext.value.lineCap = 'round'
      
      // Adicionar eventos de desenho
      let isDrawing = false
      
      canvas.addEventListener('mousedown', startDrawing)
      canvas.addEventListener('mousemove', draw)
      canvas.addEventListener('mouseup', stopDrawing)
      canvas.addEventListener('mouseout', stopDrawing)
      
      // Touch events para mobile
      canvas.addEventListener('touchstart', handleTouch)
      canvas.addEventListener('touchmove', handleTouch)
      canvas.addEventListener('touchend', stopDrawing)
      
      function startDrawing(e) {
        isDrawing = true
        const rect = canvas.getBoundingClientRect()
        signaturePadContext.value.beginPath()
        signaturePadContext.value.moveTo(
          e.clientX - rect.left,
          e.clientY - rect.top
        )
      }
      
      function draw(e) {
        if (!isDrawing) return
        const rect = canvas.getBoundingClientRect()
        signaturePadContext.value.lineTo(
          e.clientX - rect.left,
          e.clientY - rect.top
        )
        signaturePadContext.value.stroke()
      }
      
      function stopDrawing() {
        isDrawing = false
      }
      
      function handleTouch(e) {
        e.preventDefault()
        const touch = e.touches[0]
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY
        })
        canvas.dispatchEvent(mouseEvent)
      }
    }
  })
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
    signaturePadContext.value.clearRect(
      0, 0, 
      signaturePad.value.width, 
      signaturePad.value.height
    )
  }
}

function isCanvasEmpty() {
  if (!signaturePad.value) return true
  const canvas = signaturePad.value
  const blank = document.createElement('canvas')
  blank.width = canvas.width
  blank.height = canvas.height
  return canvas.toDataURL() === blank.toDataURL()
}

async function applySignature() {
  if (!hasSignature.value) return
  
  // Marcar arquivo como assinado
  attachments.value[signingFileIndex.value].signed = true
  
  // TODO: Aqui você implementaria a lógica real de assinatura
  // Por exemplo, enviar para o backend processar o PDF
  
  window.showSnackbar('Documento assinado com sucesso!', 'success')
  closeSignatureDialog()
}

// Métodos principais
function goBack() {
  router.push(`/processes/${route.params.id}`)
}

async function executeStep() {
  if (!valid.value || !canSubmit.value) return
  
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
      if (attachment.signed) {
        const signatureData = {
          signature: signatureTab.value === 'draw' 
            ? signaturePad.value.toDataURL() 
            : textSignature.value,
          signatureType: signatureTab.value
        }
        
        await processStore.signAttachment(uploaded.id, signatureData)
      }
    }
    
    // Executar etapa
    await processStore.executeStep({
      stepExecutionId: stepExecution.value.id,
      action: formData.value.action,
      comment: formData.value.comment,
      metadata: formData.value.metadata
    })
    
    window.showSnackbar('Etapa concluída com sucesso!', 'success')
    router.push(`/processes/${route.params.id}`)
  } catch (error) {
    window.showSnackbar(error.message || 'Erro ao executar etapa', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await processStore.fetchProcess(route.params.id)
  
  // Se a etapa tem apenas uma ação, selecionar automaticamente
  if (stepExecution.value?.step.actions) {
    const actions = JSON.parse(stepExecution.value.step.actions)
    if (actions.length === 1) {
      formData.value.action = actions[0]
    }
  }
})
</script>

<style scoped>
.signature-pad-container {
  border: 2px dashed #ccc;
  border-radius: 4px;
  background: white;
  display: inline-block;
}

.signature-pad {
  cursor: crosshair;
}

.text-signature-preview {
  font-family: 'Brush Script MT', cursive;
  font-size: 32px;
  text-align: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
}
</style>