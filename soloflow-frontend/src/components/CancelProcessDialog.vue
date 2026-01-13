<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="520"
    persistent
    scrollable
  >
    <v-card class="cancel-dialog">
      <!-- Header com ícone de alerta -->
      <v-card-title class="cancel-dialog-header d-flex align-center justify-center flex-column py-8">
        <div class="icon-container mb-4">
          <v-icon size="64" color="white">mdi-alert-circle</v-icon>
        </div>
        <span class="text-h5 font-weight-bold text-white text-center">
          Cancelar Processo
        </span>
        <span class="text-body-2 text-white-50 mt-2 text-center">
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
  required: v => !!v?.trim() || 'Justificativa é obrigatória',
  minLength: v => (v && v.trim().length >= 10) || 'Mínimo de 10 caracteres'
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
  border-radius: 16px !important;
  overflow: hidden;
}

.cancel-dialog-header {
  background: linear-gradient(135deg, #e53935, #c62828);
  position: relative;
}

.cancel-dialog-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.icon-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7) !important;
}

.process-info :deep(.v-list-item) {
  min-height: 48px;
}

.reason-field :deep(.v-field) {
  border-radius: 12px;
}

.reason-field :deep(.v-field__outline) {
  border-radius: 12px;
}
</style>
