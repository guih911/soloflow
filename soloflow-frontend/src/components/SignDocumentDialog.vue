<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500" persistent>
    <v-card class="signature-dialog">
      <v-card-title class="d-flex align-center justify-center bg-primary text-white py-6">
        <div class="text-center">
          <v-icon size="48" color="white" class="mb-2">mdi-pen</v-icon>
          <div class="text-h5">Assinar Documento</div>
        </div>
      </v-card-title>

      <v-divider />

      <v-form ref="signForm" v-model="signValid">
        <v-card-text class="pa-8">
          <!-- Informações do documento -->
          <div class="document-info mb-6 pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon color="primary" class="mr-2">mdi-file-document</v-icon>
              <span class="text-subtitle-1 font-weight-medium">{{ attachment?.originalName || 'Documento' }}</span>
            </div>
            <div class="text-caption text-medium-emphasis ml-8">
              {{ formatFileSize(attachment?.size) }} • {{ stepName }}
            </div>
          </div>

          <!-- Campo de Senha - Destaque -->
          <div class="password-section">
            <v-text-field
              v-model="signData.userPassword"
              label="Digite sua senha"
              type="password"
              prepend-inner-icon="mdi-lock-outline"
              :rules="[v => !!v || 'Senha obrigatória']"
              required
              variant="outlined"
              density="comfortable"
              class="password-field"
              autofocus
            />
            <div class="text-caption text-medium-emphasis text-center mt-2">
              Sua senha é necessária para confirmar a assinatura
            </div>
          </div>

          <!-- Informação simplificada -->
          <v-alert type="info" variant="tonal" density="compact" class="mt-6" border="start">
            <div class="text-caption">
              <v-icon size="16" start>mdi-information-outline</v-icon>
              Seus dados (nome, CPF, e-mail e data/hora) serão registrados no documento.
            </div>
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="close" :disabled="loading">
            Cancelar
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :disabled="!signValid"
            :loading="loading"
            prepend-icon="mdi-pen"
            @click="handleSign"
          >
            Assinar
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <!-- Dialog de Sucesso -->
    <v-dialog v-model="successDialog" max-width="500" persistent>
      <v-card>
        <v-card-text class="text-center py-8">
          <v-icon size="80" color="success">mdi-check-circle</v-icon>
          <h2 class="text-h5 mt-4">Documento Assinado!</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Sua assinatura digital foi aplicada com sucesso.
          </p>

          <v-btn
            color="primary"
            variant="elevated"
            class="mt-6"
            block
            @click="closeSuccess"
          >
            Concluir
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSignaturesStore } from '../stores/signatures'

const props = defineProps({
  modelValue: Boolean,
  attachment: Object,
  stepExecutionId: String,
  stepName: String,
  requirement: Object
})

const emit = defineEmits(['update:modelValue', 'signed'])

const signaturesStore = useSignaturesStore()

const signValid = ref(false)
const successDialog = ref(false)

const signData = ref({
  attachmentId: '',
  stepExecutionId: '',
  userPassword: '',
  reason: 'Assinatura Digital',
  location: '',
  contactInfo: ''
})

const loading = computed(() => signaturesStore.loading)

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Resetar form
    signData.value = {
      attachmentId: props.attachment?.id || '',
      stepExecutionId: props.stepExecutionId || props.attachment?.stepExecutionId || props.attachment?.executionId || '',
      userPassword: '',
      reason: props.requirement?.description || 'Assinatura Digital',
      location: '',
      contactInfo: ''
    }
  }
})

function formatFileSize(bytes) {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function handleSign() {
  if (!signValid.value) return

  console.log('📝 Signing document:', signData.value)

  try {
    const result = await signaturesStore.signDocument(signData.value)

    console.log('✅ Document signed successfully:', result)

    // Mostrar dialog de sucesso
    successDialog.value = true
  } catch (error) {
    console.error('❌ Error signing document:', error)
  }
}

function close() {
  emit('update:modelValue', false)
}

function closeSuccess() {
  successDialog.value = false
  emit('signed')
  close()
}
</script>

<style scoped>
.signature-dialog {
  border-radius: 16px !important;
  overflow: hidden;
}

.document-info {
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 12px;
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.password-section {
  margin: 24px 0;
}

.password-field :deep(.v-field) {
  font-size: 1.1rem;
}

.password-field :deep(.v-field__input) {
  padding: 16px 12px;
}
</style>
