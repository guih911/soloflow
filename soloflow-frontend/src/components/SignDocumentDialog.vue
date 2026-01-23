<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="480" persistent aria-labelledby="sign-dialog-title">
    <v-card class="signature-dialog" role="dialog" aria-modal="true">
      <!-- Modern Header -->
      <div class="dialog-header">
        <div class="header-icon-wrapper" aria-hidden="true">
          <div class="header-icon">
            <v-icon size="32" color="white">mdi-draw-pen</v-icon>
          </div>
          <div class="icon-pulse"></div>
        </div>
        <h2 id="sign-dialog-title" class="header-title">Assinar Documento</h2>
        <p class="header-subtitle">Confirme sua identidade para assinar digitalmente</p>
      </div>

      <v-form ref="signForm" v-model="signValid" @submit.prevent="handleSign">
        <v-card-text class="dialog-content">
          <!-- Document Info Card -->
          <div class="document-card">
            <div class="document-icon">
              <v-icon size="24" color="primary">mdi-file-document</v-icon>
            </div>
            <div class="document-details">
              <span class="document-name">{{ attachment?.originalName || 'Documento' }}</span>
              <span class="document-meta">{{ formatFileSize(attachment?.size) }} • {{ stepName }}</span>
            </div>
          </div>

          <!-- Password Field -->
          <div class="password-section">
            <label class="field-label" id="password-label">Digite sua senha para confirmar</label>
            <v-text-field
              v-model="signData.userPassword"
              type="password"
              placeholder="••••••••"
              prepend-inner-icon="mdi-lock-outline"
              :rules="[v => !!v || 'A senha é obrigatória']"
              required
              variant="outlined"
              density="comfortable"
              class="password-field"
              autofocus
              hide-details="auto"
              aria-required="true"
              aria-labelledby="password-label"
              @keyup.enter="handleSign"
            />
          </div>

          <!-- Error Alert -->
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="errorMessage = ''"
          >
            {{ errorMessage }}
          </v-alert>

          <!-- Info Alert -->
          <div class="info-box">
            <v-icon size="18" color="info">mdi-shield-check</v-icon>
            <span>Seus dados (nome, CPF, e-mail e data/hora) serão registrados no documento.</span>
          </div>
        </v-card-text>

        <div class="dialog-actions">
          <v-btn variant="text" color="grey" @click="close" :disabled="loading">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="!signValid"
            :loading="loading"
            prepend-icon="mdi-draw-pen"
            @click="handleSign"
            class="sign-btn"
          >
            Assinar Documento
          </v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Dialog de Sucesso -->
    <v-dialog v-model="successDialog" max-width="400" persistent aria-labelledby="success-dialog-title">
      <v-card class="success-dialog" role="alertdialog" aria-modal="true">
        <div class="success-content">
          <div class="success-icon-wrapper" aria-hidden="true">
            <div class="success-icon">
              <v-icon size="48" color="white">mdi-check</v-icon>
            </div>
            <div class="success-pulse"></div>
          </div>
          <h2 id="success-dialog-title" class="success-title">Documento Assinado!</h2>
          <p class="success-text">Sua assinatura digital foi aplicada com sucesso ao documento.</p>
          <v-btn
            color="success"
            variant="flat"
            size="large"
            block
            @click="closeSuccess"
            class="success-btn"
          >
            Concluir
          </v-btn>
        </div>
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
  requirement: Object,
  isSubTaskAttachment: Boolean,
  subTaskId: String
})

const emit = defineEmits(['update:modelValue', 'signed'])

const signaturesStore = useSignaturesStore()

const signValid = ref(false)
const successDialog = ref(false)
const errorMessage = ref('')

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
    // Resetar form e erro
    errorMessage.value = ''
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

  try {
    errorMessage.value = ''
    let result

    if (props.isSubTaskAttachment && props.subTaskId) {
      const subTaskSignData = {
        subTaskId: props.subTaskId,
        userPassword: signData.value.userPassword,
        reason: signData.value.reason,
        location: signData.value.location,
        contactInfo: signData.value.contactInfo
      }
      result = await signaturesStore.signSubTaskDocument(subTaskSignData)
    } else {
      result = await signaturesStore.signDocument(signData.value)
    }

    successDialog.value = true
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Erro ao assinar documento. Verifique sua senha e tente novamente.'
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
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
}

/* Dialog Header */
.dialog-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  text-align: center;
}

.header-icon-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.header-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.icon-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.header-title {
  font-size: 1.375rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.header-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 8px 0 0 0;
}

/* Dialog Content */
.dialog-content {
  padding: 24px !important;
}

/* Document Card */
.document-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 12px;
  margin-bottom: 24px;
}

.document-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.document-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.document-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-meta {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
}

/* Password Section */
.password-section {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin-bottom: 8px;
}

.password-field :deep(.v-field) {
  border-radius: 10px;
  font-size: 1rem;
}

.password-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* Info Box */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-info-50);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: var(--color-info-700);
  line-height: 1.5;
}

/* Dialog Actions */
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-neutral-200);
}

.dialog-actions :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}

.sign-btn {
  padding: 0 24px !important;
}

/* Success Dialog */
.success-dialog {
  border-radius: 20px !important;
  overflow: hidden;
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px;
  text-align: center;
}

.success-icon-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.success-icon {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-success-400), var(--color-success-500));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.success-pulse {
  position: absolute;
  top: 0;
  left: 0;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-success-200);
  animation: successPulse 1.5s ease-out infinite;
}

@keyframes successPulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.success-title {
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 8px 0;
}

.success-text {
  font-size: 0.9375rem;
  color: var(--color-neutral-500);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.success-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}
</style>
