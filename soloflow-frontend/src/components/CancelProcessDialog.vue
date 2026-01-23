<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="520"
    persistent
    scrollable
    aria-labelledby="cancel-dialog-title"
  >
    <v-card class="cancel-dialog" role="alertdialog" aria-modal="true" aria-describedby="cancel-dialog-description">
      <!-- Header com ícone de alerta -->
      <v-card-title id="cancel-dialog-title" class="cancel-dialog-header d-flex align-center justify-center flex-column py-8">
        <div class="icon-container mb-4" aria-hidden="true">
          <v-icon size="64" color="white">mdi-alert-circle</v-icon>
        </div>
        <span class="text-h5 font-weight-bold text-white text-center">
          Cancelar Processo
        </span>
        <span id="cancel-dialog-description" class="text-body-2 text-white-50 mt-2 text-center">
          Esta ação não pode ser desfeita
        </span>
      </v-card-title>

      <v-divider />

      <!-- Informações do processo -->
      <v-card-text class="pa-6">
        <!-- Campo de justificativa -->
        <v-form ref="formRef" v-model="formValid" @submit.prevent="handleCancel">
          <div class="mb-2">
            <label class="text-caption font-weight-bold text-grey-darken-2">
              Justificativa do Cancelamento *
            </label>
          </div>
          <v-textarea
            v-model="reason"
            variant="outlined"
            placeholder="Informe o motivo do cancelamento do processo..."
            rows="4"
            :rules="[rules.required, rules.minLength]"
            counter="500"
            maxlength="500"
            class="reason-field"
            bg-color="grey-lighten-5"
            aria-required="true"
            aria-label="Justificativa do cancelamento"
          >
            <template v-slot:prepend-inner>
              <v-icon color="grey" size="20" class="mt-1">mdi-comment-text-outline</v-icon>
            </template>
          </v-textarea>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Ações -->
      <v-card-actions class="pa-4 d-flex justify-space-between">
        <v-btn
          variant="text"
          color="grey-darken-1"
          size="large"
          @click="handleClose"
          :disabled="loading"
        >
          <v-icon start>mdi-close</v-icon>
          Voltar
        </v-btn>

        <v-btn
          color="error"
          variant="elevated"
          size="large"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="handleCancel"
          class="px-6"
        >
          <v-icon start>mdi-cancel</v-icon>
          Confirmar Cancelamento
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  process: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'cancel'])

// Estado do formulário
const formRef = ref(null)
const formValid = ref(false)
const reason = ref('')
const loading = ref(false)

// Regras de validação
const rules = {
  required: v => !!v?.trim() || 'A justificativa é obrigatória',
  minLength: v => (v && v.trim().length >= 10) || 'A justificativa deve ter no mínimo 10 caracteres'
}

// Limpar formulário quando fechar
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    reason.value = ''
    formValid.value = false
    if (formRef.value) {
      formRef.value.reset()
    }
  }
})

function handleClose() {
  emit('update:modelValue', false)
}

async function handleCancel() {
  if (!formValid.value) return

  loading.value = true

  try {
    emit('cancel', {
      processId: props.process?.id,
      reason: reason.value.trim()
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cancel-dialog {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
}

.cancel-dialog-header {
  background: linear-gradient(135deg, var(--color-error-400), var(--color-error-500));
  position: relative;
  padding: 32px 24px !important;
}

.cancel-dialog-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
}

.icon-container {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.icon-container::after {
  content: '';
  position: absolute;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.8) !important;
}

.process-info :deep(.v-list-item) {
  min-height: 48px;
}

.reason-field :deep(.v-field) {
  border-radius: 12px;
  background: white !important;
}

.reason-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

:deep(.v-card-text) {
  padding: 24px !important;
}

:deep(.v-card-actions) {
  padding: 16px 24px !important;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-neutral-200);
}

:deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}

/* Label styling */
.text-caption.font-weight-bold {
  font-size: 0.875rem !important;
  color: var(--color-neutral-700);
  margin-bottom: 8px;
}
</style>
