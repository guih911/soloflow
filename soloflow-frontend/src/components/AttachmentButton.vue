<template>
  <div class="attachment-button-container">
    <!-- Botão principal -->
    <v-btn
      v-if="hasAttachments"
      :variant="variant"
      :color="color"
      :size="size"
      @click="openModal"
      class="attachment-btn"
    >
      <v-icon start>mdi-paperclip</v-icon>
      Ver Anexos
      <v-chip
        v-if="attachmentCount > 0"
        :size="size === 'large' ? 'small' : 'x-small'"
        :color="color"
        variant="flat"
        class="ml-2"
      >
        {{ attachmentCount }}
      </v-chip>
    </v-btn>

    <!-- Indicador quando não há anexos -->
    <div
      v-else-if="showEmptyState"
      class="no-attachments-indicator"
    >
      <v-chip
        size="small"
        variant="tonal"
        color="grey"
      >
        <v-icon start size="16">mdi-paperclip-off</v-icon>
        Sem anexos
      </v-chip>
    </div>

    <!-- Modal de anexos -->
    <AttachmentModal
      v-model="modalOpen"
      :attachments="formattedAttachments"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AttachmentModal from './AttachmentModal.vue'

const props = defineProps({
  // Pode receber attachments diretamente ou um objeto process
  attachments: {
    type: Array,
    default: () => []
  },
  process: {
    type: Object,
    default: null
  },
  // Personalização visual
  variant: {
    type: String,
    default: 'elevated'
  },
  color: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'default'
  },
  // Se deve mostrar indicador quando não há anexos
  showEmptyState: {
    type: Boolean,
    default: false
  }
})

// Estado
const modalOpen = ref(false)

// Computed para extrair anexos de diferentes fontes
const allAttachments = computed(() => {
  // Se attachments foi passado diretamente
  if (props.attachments && props.attachments.length > 0) {
    return props.attachments
  }
  
  // Se foi passado um objeto process, extrair anexos de stepExecutions
  if (props.process?.stepExecutions) {
    const attachments = []
    
    props.process.stepExecutions.forEach(stepExecution => {
      if (stepExecution.attachments && stepExecution.attachments.length > 0) {
        stepExecution.attachments.forEach(attachment => {
          attachments.push({
            ...attachment,
            // Adicionar contexto da etapa
            stepName: stepExecution.step?.name,
            stepOrder: stepExecution.step?.order,
            stepExecutionId: stepExecution.id
          })
        })
      }
    })
    
    return attachments
  }

  // ✅ CORRIGIDO: Verificar se há dados de arquivos no formData (campos FILE)
  if (props.process?.formData) {
    const fileAttachments = []
    const formData = props.process.formData
    const formFields = props.process.processType?.formFields || []
    
    // Buscar campos do tipo FILE no formData
    formFields.forEach(field => {
      if (field.type === 'FILE' && formData[field.name]) {
        const fieldData = formData[field.name]
        
        // ✅ SUPORTE: Campo único (objeto AttachmentMeta)
        if (fieldData.attachmentId && typeof fieldData === 'object' && !Array.isArray(fieldData)) {
          fileAttachments.push({
            id: fieldData.attachmentId,
            originalName: fieldData.originalName || 'Arquivo',
            size: fieldData.size || 0,
            mimeType: fieldData.mimeType || 'application/octet-stream',
            fieldName: field.name,
            fieldLabel: field.label,
            isFormField: true
          })
        }
        // ✅ SUPORTE: Campo múltiplo (array de AttachmentMeta)
        else if (Array.isArray(fieldData)) {
          fieldData.forEach((fileItem, index) => {
            if (fileItem.attachmentId) {
              fileAttachments.push({
                id: fileItem.attachmentId,
                originalName: fileItem.originalName || `Arquivo ${index + 1}`,
                size: fileItem.size || 0,
                mimeType: fileItem.mimeType || 'application/octet-stream',
                fieldName: field.name,
                fieldLabel: `${field.label} (${index + 1})`,
                isFormField: true
              })
            }
          })
        }
      }
    })
    
    return fileAttachments
  }
  
  return []
})

// Formatar anexos para o modal
const formattedAttachments = computed(() => {
  return allAttachments.value.map(attachment => ({
    ...attachment,
    // Garantir que tem um ID único
    id: attachment.id || `temp-${Date.now()}-${Math.random()}`,
    // Garantir campos obrigatórios
    originalName: attachment.originalName || attachment.filename || 'Arquivo sem nome',
    size: attachment.size || 0,
    mimeType: attachment.mimeType || 'application/octet-stream',
    createdAt: attachment.createdAt || new Date().toISOString(),
    isSigned: Boolean(attachment.isSigned)
  }))
})

const hasAttachments = computed(() => allAttachments.value.length > 0)
const attachmentCount = computed(() => allAttachments.value.length)

// Métodos
function openModal() {
  modalOpen.value = true
}
</script>

<style scoped>
.attachment-button-container {
  display: inline-block;
}

.attachment-btn {
  text-transform: none;
  font-weight: 500;
}

.no-attachments-indicator {
  display: inline-block;
}
</style>