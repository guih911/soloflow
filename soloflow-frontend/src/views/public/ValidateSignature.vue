<template>
  <div class="validate-page">
    <!-- Background com gradiente -->
    <div class="page-background">
      <div class="gradient-orb gradient-orb--1"></div>
      <div class="gradient-orb gradient-orb--2"></div>
    </div>

    <div class="validate-container">
      <!-- Card Principal -->
      <div class="validate-card" :class="{ 'validate-card--expanded': result }">
        <!-- Header com Logo -->
        <div class="card-header">
          <img src="/logo.png" alt="SoloFlow" class="logo-image" />
          <div class="header-badge">
            <v-icon size="16" color="white">mdi-shield-check</v-icon>
            <span>Validação de Assinatura</span>
          </div>
        </div>

        <!-- Formulário de Validação -->
        <div v-if="!result" class="card-content">
          <div class="content-header">
            <h1 class="content-title">Verificar Autenticidade</h1>
            <p class="content-subtitle">
              Insira o código de validação presente no documento assinado para verificar sua autenticidade
            </p>
          </div>

          <!-- Instruções -->
          <div class="info-box">
            <div class="info-box__icon">
              <v-icon size="20" color="primary">mdi-information-outline</v-icon>
            </div>
            <div class="info-box__content">
              <p class="info-box__title">Como encontrar o código?</p>
              <p class="info-box__text">O código de validação está localizado no rodapé do documento PDF assinado, junto com o QR Code.</p>
            </div>
          </div>

          <v-form ref="form" v-model="formValid" @submit.prevent="validateSignature" class="validate-form">
            <div class="form-group">
              <label class="form-label">Código de Validação</label>
              <v-text-field
                v-model="token"
                placeholder="Ex: A1B2C3D4E5F6G7H8"
                prepend-inner-icon="mdi-key-variant"
                :rules="[v => !!v || 'Código obrigatório']"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="modern-input"
                @input="token = token.toUpperCase()"
              />
            </div>

            <v-btn
              type="submit"
              color="primary"
              size="x-large"
              block
              :loading="loading"
              :disabled="!formValid"
              class="validate-button"
            >
              <v-icon start>mdi-check-circle-outline</v-icon>
              Verificar Assinatura
            </v-btn>
          </v-form>
        </div>

        <!-- Resultado da Validação -->
        <div v-else class="card-content">
          <!-- Assinatura Válida -->
          <template v-if="result.valid">
            <div class="result-header result-header--success">
              <div class="result-icon result-icon--success">
                <v-icon size="32" color="white">mdi-check-decagram</v-icon>
              </div>
              <div class="result-info">
                <h2 class="result-title">Assinatura Válida</h2>
                <p class="result-subtitle">Documento autêntico verificado</p>
              </div>
            </div>

            <!-- Dados do Assinante -->
            <div class="data-section">
              <div class="section-header">
                <v-icon size="18" color="primary">mdi-account-circle</v-icon>
                <h3 class="section-title">Dados do Assinante</h3>
              </div>
              <div class="data-grid">
                <div class="data-item">
                  <span class="data-label">Nome</span>
                  <span class="data-value">{{ result.signature.signerName }}</span>
                </div>
                <div v-if="result.signature.signerCPF" class="data-item">
                  <span class="data-label">CPF</span>
                  <span class="data-value data-value--mono">{{ maskCPF(result.signature.signerCPF) }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">E-mail</span>
                  <span class="data-value">{{ result.signature.signerEmail }}</span>
                </div>
              </div>
            </div>

            <!-- Dados da Assinatura -->
            <div class="data-section">
              <div class="section-header">
                <v-icon size="18" color="primary">mdi-file-sign</v-icon>
                <h3 class="section-title">Dados da Assinatura</h3>
              </div>
              <div class="data-grid">
                <div class="data-item">
                  <span class="data-label">Data e Hora</span>
                  <span class="data-value">{{ formatDateTime(result.signature.signedAt) }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Documento</span>
                  <span class="data-value">{{ result.signature.documentName }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Processo</span>
                  <span class="data-value">{{ result.signature.processCode }} - {{ result.signature.processTitle }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">Etapa</span>
                  <span class="data-value">{{ result.signature.stepName }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">IP de Origem</span>
                  <span class="data-value data-value--mono">{{ result.signature.ipAddress }}</span>
                </div>
              </div>
            </div>

            <!-- Código de Verificação -->
            <div class="verification-code">
              <v-icon size="16" color="primary" class="mr-2">mdi-key-variant</v-icon>
              <span class="verification-label">Código:</span>
              <span class="verification-value">{{ result.token }}</span>
            </div>

            <!-- Integridade do Documento -->
            <div v-if="result.documentIntegrity" class="integrity-section" :class="result.documentIntegrity.isValid ? 'integrity-section--valid' : 'integrity-section--invalid'">
              <div class="integrity-header">
                <v-icon size="20" :color="result.documentIntegrity.isValid ? 'success' : 'error'">
                  {{ result.documentIntegrity.isValid ? 'mdi-file-check' : 'mdi-file-alert' }}
                </v-icon>
                <span>{{ result.documentIntegrity.message }}</span>
              </div>
              <div class="integrity-hashes">
                <div class="hash-item">
                  <span class="hash-label">Hash Fornecido:</span>
                  <code class="hash-value">{{ result.documentIntegrity.providedHash }}</code>
                </div>
                <div class="hash-item">
                  <span class="hash-label">Hash Original:</span>
                  <code class="hash-value">{{ result.documentIntegrity.originalHash }}</code>
                </div>
              </div>
            </div>
          </template>

          <!-- Assinatura Inválida -->
          <template v-else>
            <div class="result-header result-header--error">
              <div class="result-icon result-icon--error">
                <v-icon size="32" color="white">mdi-alert-circle</v-icon>
              </div>
              <div class="result-info">
                <h2 class="result-title">Assinatura Não Encontrada</h2>
                <p class="result-subtitle">Não foi possível validar a assinatura</p>
              </div>
            </div>

            <div class="error-message">
              <v-icon size="20" color="error" class="mr-2">mdi-information-outline</v-icon>
              <p>{{ result.message }}</p>
            </div>

            <div class="error-tips">
              <p class="tips-title">Possíveis causas:</p>
              <ul class="tips-list">
                <li>O código foi digitado incorretamente</li>
                <li>O documento não foi assinado pelo sistema SoloFlow</li>
                <li>A assinatura foi revogada ou expirou</li>
              </ul>
            </div>
          </template>

          <!-- Botão Nova Validação -->
          <v-btn
            variant="outlined"
            color="primary"
            size="large"
            block
            @click="reset"
            class="new-validation-btn"
          >
            <v-icon start>mdi-refresh</v-icon>
            Nova Validação
          </v-btn>
        </div>

        <!-- Rodapé Legal -->
        <div class="card-footer">
          <div class="legal-info">
            <v-icon size="14" color="primary" class="mr-1">mdi-scale-balance</v-icon>
            <span>
              Assinatura eletrônica em conformidade com a
              <strong>MP 2.200-2/2001</strong> e
              <strong>Lei 14.063/2020</strong>
            </span>
          </div>
          <div class="footer-divider"></div>
          <div class="validation-timestamp">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            Verificação realizada em {{ currentDateTime }}
          </div>
        </div>
      </div>

      <!-- Informações Adicionais -->
      <div class="additional-info">
        <div class="info-item">
          <v-icon size="18" color="primary">mdi-shield-lock</v-icon>
          <span>Verificação segura e criptografada</span>
        </div>
        <div class="info-item">
          <v-icon size="18" color="primary">mdi-certificate</v-icon>
          <span>Validade jurídica garantida</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const token = ref('')
const loading = ref(false)
const result = ref(null)
const formValid = ref(false)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const currentDateTime = computed(() => {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function maskCPF(cpf) {
  if (!cpf) return ''
  // Remove formatação existente
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  // Exibe apenas os 3 primeiros e 2 últimos dígitos: 123.***.***-45
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`
}

async function validateSignature() {
  if (!formValid.value || !token.value) return

  loading.value = true
  result.value = null

  try {
    const response = await axios.post(`${API_URL}/signatures/public/validate`, {
      signatureToken: token.value.trim().toUpperCase()
    })

    result.value = response.data
  } catch (error) {
    result.value = {
      valid: false,
      message: error.response?.data?.message || 'Erro ao validar assinatura. Verifique o código e tente novamente.'
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  token.value = ''
  result.value = null
}
</script>

<style scoped>
.validate-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Background Effects */
.page-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.gradient-orb--1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  top: -200px;
  right: -100px;
}

.gradient-orb--2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  bottom: -150px;
  left: -100px;
}

/* Container */
.validate-container {
  width: 100%;
  max-width: 520px;
  position: relative;
  z-index: 1;
}

/* Card */
.validate-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 2px 4px rgba(0, 0, 0, 0.03),
    0 12px 24px rgba(0, 0, 0, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.06);
  animation: cardAppear 0.5s ease-out;
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Card Header */
.card-header {
  background: linear-gradient(135deg, var(--color-primary-600, #2563eb) 0%, var(--color-primary-700, #1d4ed8) 100%);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo-image {
  height: 44px;
  width: auto;
  filter: brightness(0) invert(1);
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
}

/* Card Content */
.card-content {
  padding: 32px;
}

.content-header {
  text-align: center;
  margin-bottom: 24px;
}

.content-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-neutral-900, #0f172a);
  margin: 0 0 8px 0;
}

.content-subtitle {
  font-size: 0.9375rem;
  color: var(--color-neutral-500, #64748b);
  margin: 0;
  line-height: 1.5;
}

/* Info Box */
.info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--color-primary-50, #eff6ff);
  border-radius: 12px;
  margin-bottom: 24px;
}

.info-box__icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-box__content {
  flex: 1;
}

.info-box__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-700, #1d4ed8);
  margin: 0 0 4px 0;
}

.info-box__text {
  font-size: 0.8125rem;
  color: var(--color-neutral-600, #475569);
  margin: 0;
  line-height: 1.5;
}

/* Form */
.validate-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700, #334155);
}

.modern-input :deep(.v-field) {
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

.modern-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.modern-input :deep(.v-field input) {
  text-transform: uppercase;
}

/* Validate Button */
.validate-button {
  height: 52px !important;
  border-radius: 12px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  text-transform: none !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35) !important;
}

.validate-button:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45) !important;
  transform: translateY(-1px);
}

/* Result Header */
.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.result-header--success {
  background: linear-gradient(135deg, var(--color-success-50, #ecfdf5) 0%, var(--color-success-100, #d1fae5) 100%);
}

.result-header--error {
  background: linear-gradient(135deg, var(--color-error-50, #fef2f2) 0%, var(--color-error-100, #fee2e2) 100%);
}

.result-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-icon--success {
  background: linear-gradient(135deg, var(--color-success-500, #10b981) 0%, var(--color-success-600, #059669) 100%);
}

.result-icon--error {
  background: linear-gradient(135deg, var(--color-error-500, #ef4444) 0%, var(--color-error-600, #dc2626) 100%);
}

.result-info {
  flex: 1;
}

.result-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-neutral-900, #0f172a);
  margin: 0 0 4px 0;
}

.result-subtitle {
  font-size: 0.875rem;
  color: var(--color-neutral-600, #475569);
  margin: 0;
}

/* Data Sections */
.data-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-neutral-50, #f8fafc);
  border-radius: 12px;
  border: 1px solid var(--color-neutral-200, #e2e8f0);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-neutral-200, #e2e8f0);
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800, #1e293b);
  margin: 0;
}

.data-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.data-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-neutral-500, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.data-value {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-neutral-800, #1e293b);
}

.data-value--mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

/* Verification Code */
.verification-code {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--color-primary-50, #eff6ff);
  border-radius: 12px;
  margin-bottom: 20px;
}

.verification-label {
  font-size: 0.875rem;
  color: var(--color-neutral-600, #475569);
  margin-right: 8px;
}

.verification-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-700, #1d4ed8);
  letter-spacing: 0.05em;
}

/* Integrity Section */
.integrity-section {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.integrity-section--valid {
  background: var(--color-success-50, #ecfdf5);
  border: 1px solid var(--color-success-200, #a7f3d0);
}

.integrity-section--invalid {
  background: var(--color-error-50, #fef2f2);
  border: 1px solid var(--color-error-200, #fecaca);
}

.integrity-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800, #1e293b);
  margin-bottom: 12px;
}

.integrity-hashes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hash-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hash-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-neutral-500, #64748b);
}

.hash-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  word-break: break-all;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  background: var(--color-error-50, #fef2f2);
  border-radius: 12px;
  margin-bottom: 16px;
}

.error-message p {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-error-700, #b91c1c);
}

.error-tips {
  padding: 16px;
  background: var(--color-neutral-50, #f8fafc);
  border-radius: 12px;
  margin-bottom: 24px;
}

.tips-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700, #334155);
  margin: 0 0 8px 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  font-size: 0.8125rem;
  color: var(--color-neutral-600, #475569);
  line-height: 1.6;
}

/* New Validation Button */
.new-validation-btn {
  height: 48px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  text-transform: none !important;
}

/* Card Footer */
.card-footer {
  padding: 20px 32px;
  background: var(--color-neutral-50, #f8fafc);
  border-top: 1px solid var(--color-neutral-200, #e2e8f0);
}

.legal-info {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-neutral-600, #475569);
  text-align: center;
  line-height: 1.5;
}

.legal-info strong {
  color: var(--color-primary-700, #1d4ed8);
  font-weight: 600;
}

.footer-divider {
  height: 1px;
  background: var(--color-neutral-200, #e2e8f0);
  margin: 12px 0;
}

.validation-timestamp {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--color-neutral-500, #64748b);
}

/* Additional Info */
.additional-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--color-neutral-600, #475569);
}

/* Responsive */
@media (max-width: 600px) {
  .validate-page {
    padding: 16px;
    align-items: flex-start;
    padding-top: 32px;
  }

  .validate-card {
    border-radius: 20px;
  }

  .card-header {
    padding: 24px;
  }

  .logo-image {
    height: 36px;
  }

  .card-content {
    padding: 24px;
  }

  .content-title {
    font-size: 1.25rem;
  }

  .result-header {
    flex-direction: column;
    text-align: center;
  }

  .additional-info {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}

/* Print Styles */
@media print {
  .validate-page {
    background: white;
  }

  .page-background,
  .validate-button,
  .new-validation-btn,
  .additional-info,
  .info-box {
    display: none !important;
  }

  .validate-card {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}
</style>
