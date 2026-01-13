<template>
  <div class="attachment-button-container">
    <!-- Botão principal -->
    <v-btn
      v-if="hasStepAttachments"
      :variant="variant"
      :color="color"
      :size="size"
      @click="openModal"
      class="attachment-btn"
    >
      <v-icon start>mdi-paperclip</v-icon>
      Ver Anexos das Etapas
      <v-chip
        v-if="stepAttachmentCount > 0"
        :size="size === 'large' ? 'small' : 'x-small'"
        :color="color"
        variant="flat"
        class="ml-2"
      >
        {{ stepAttachmentCount }}
      </v-chip>
    </v-btn>

    <!-- Indicador quando não há anexos de etapas -->
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
        Sem anexos de etapas
      </v-chip>
    </div>

    <!-- ✅ CORRIGIDO: Modal apenas com anexos de etapas -->
    <AttachmentModal
      v-model="modalOpen"
      :attachments="stepAttachmentsOnly"
      title="Anexos das Etapas"
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

const stepAttachmentsOnly = computed(() => {
  if (props.attachments && props.attachments.length > 0) {
    return props.attachments.map(attachment => ({
      ...attachment,
      attachmentType: 'step',
      attachmentSource: 'Anexo de Etapa',
      displayName: attachment.originalName || attachment.filename || 'Arquivo'
    }))
  }

  if (props.process?.stepExecutions) {
    const stepAttachments = []

    props.process.stepExecutions.forEach(stepExecution => {
      if (stepExecution.attachments && stepExecution.attachments.length > 0) {
        stepExecution.attachments.forEach(attachment => {
          stepAttachments.push({
            ...attachment,
            attachmentType: 'step',
            attachmentSource: 'Anexo de Etapa',
            displayName: attachment.originalName || attachment.filename || 'Arquivo',
            stepName: stepExecution.step?.name,
            stepOrder: stepExecution.step?.order,
            stepExecutionId: stepExecution.id
          })
        })
      }
    })

    return stepAttachments
  }

  return []
})

const hasStepAttachments = computed(() => stepAttachmentsOnly.value.length > 0)
const stepAttachmentCount = computed(() => stepAttachmentsOnly.value.length)

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