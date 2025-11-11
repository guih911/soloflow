<template>
  <v-container class="pa-8">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Card Principal -->
        <v-card elevation="8">
          <v-card-title class="text-h4 text-center pa-8 bg-primary">
            <div class="d-flex flex-column align-center">
              <v-icon size="64" color="white">mdi-shield-check</v-icon>
              <div class="mt-4 text-white">Validar Assinatura Digital</div>
            </div>
          </v-card-title>

          <v-card-text class="pa-8">
            <v-alert type="info" variant="tonal" class="mb-6">
              <div class="text-body-1">
                <strong>Como validar:</strong>
                <ul class="mt-2">
                  <li>Digite o <strong>Token de Validação</strong> que aparece no documento PDF assinado</li>
                  <li>Opcionalmente, informe o <strong>Hash do Documento</strong> para verificar integridade</li>
                  <li>Clique em "Validar Assinatura"</li>
                </ul>
              </div>
            </v-alert>

            <v-form ref="form" v-model="formValid" @submit.prevent="validateSignature">
              <v-text-field
                v-model="token"
                label="Token de Validação *"
                placeholder="Ex: A1B2C3D4E5F6G7H8"
                prepend-icon="mdi-key"
                :rules="[v => !!v || 'Token obrigatório']"
                required
                variant="outlined"
                class="mb-4"
                hint="Token exibido no documento assinado"
                persistent-hint
              />

              <v-text-field
                v-model="documentHash"
                label="Hash do Documento (Opcional)"
                placeholder="Hash SHA-256 do documento"
                prepend-icon="mdi-fingerprint"
                variant="outlined"
                class="mb-6"
                hint="Para verificar se o documento foi alterado"
                persistent-hint
              />

              <v-btn
                type="submit"
                color="primary"
                size="x-large"
                block
                :loading="loading"
                :disabled="!formValid"
              >
                <v-icon start>mdi-check-circle</v-icon>
                Validar Assinatura
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Resultado da Validação -->
        <v-card v-if="result" class="mt-8" elevation="8">
          <v-card-title
            :class="result.valid ? 'bg-success text-white' : 'bg-error text-white'"
            class="text-h5 pa-6"
          >
            <v-icon start size="32" color="white">
              {{ result.valid ? 'mdi-check-decagram' : 'mdi-alert-circle' }}
            </v-icon>
            {{ result.valid ? 'Assinatura Válida ✓' : 'Assinatura Inválida ✗' }}
          </v-card-title>

          <!-- Assinatura Válida -->
          <v-card-text v-if="result.valid" class="pa-6">
            <v-alert type="success" variant="tonal" class="mb-6">
              <div class="text-h6 mb-2">
                <v-icon start>mdi-shield-check</v-icon>
                Esta assinatura é autêntica e foi verificada no sistema
              </div>
              <div class="text-body-2">
                Validado em: {{ new Date().toLocaleString('pt-BR') }}
              </div>
            </v-alert>

            <v-list lines="two">
              <v-list-subheader class="text-h6 font-weight-bold">
                Dados do Assinante
              </v-list-subheader>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="primary" size="40">
                    <v-icon color="white">mdi-account</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Nome</v-list-item-title>
                <v-list-item-subtitle class="text-h6">
                  {{ result.signature.signerName }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="result.signature.signerCPF">
                <template #prepend>
                  <v-avatar color="secondary" size="40">
                    <v-icon color="white">mdi-card-account-details</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">CPF</v-list-item-title>
                <v-list-item-subtitle class="text-h6">
                  {{ result.signature.signerCPF }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="info" size="40">
                    <v-icon color="white">mdi-email</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Email</v-list-item-title>
                <v-list-item-subtitle>{{ result.signature.signerEmail }}</v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-4" />

              <v-list-subheader class="text-h6 font-weight-bold">
                Dados da Assinatura
              </v-list-subheader>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="success" size="40">
                    <v-icon color="white">mdi-calendar-clock</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Data/Hora</v-list-item-title>
                <v-list-item-subtitle class="text-h6">
                  {{ new Date(result.signature.signedAt).toLocaleString('pt-BR') }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="warning" size="40">
                    <v-icon color="white">mdi-file-document</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Processo</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="font-weight-bold">{{ result.signature.processCode }}</div>
                  <div>{{ result.signature.processTitle }}</div>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="purple" size="40">
                    <v-icon color="white">mdi-clipboard-text</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Etapa</v-list-item-title>
                <v-list-item-subtitle>{{ result.signature.stepName }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="teal" size="40">
                    <v-icon color="white">mdi-file-pdf-box</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Documento</v-list-item-title>
                <v-list-item-subtitle>{{ result.signature.documentName }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="result.signature.reason">
                <template #prepend>
                  <v-avatar color="orange" size="40">
                    <v-icon color="white">mdi-text</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">Motivo</v-list-item-title>
                <v-list-item-subtitle>{{ result.signature.reason }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-avatar color="indigo" size="40">
                    <v-icon color="white">mdi-ip</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">IP de Origem</v-list-item-title>
                <v-list-item-subtitle>{{ result.signature.ipAddress }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <!-- Verificação de Integridade do Documento -->
            <v-alert
              v-if="result.documentIntegrity"
              :type="result.documentIntegrity.isValid ? 'success' : 'error'"
              class="mt-6"
              prominent
            >
              <v-row align="center">
                <v-col cols="12">
                  <div class="text-h6">
                    <v-icon start>
                      {{ result.documentIntegrity.isValid ? 'mdi-check-circle' : 'mdi-alert' }}
                    </v-icon>
                    {{ result.documentIntegrity.message }}
                  </div>
                  <div class="text-caption mt-2">
                    <strong>Hash Fornecido:</strong>
                    <code class="ml-2">{{ result.documentIntegrity.providedHash }}</code>
                  </div>
                  <div class="text-caption">
                    <strong>Hash Original:</strong>
                    <code class="ml-2">{{ result.documentIntegrity.originalHash }}</code>
                  </div>
                </v-col>
              </v-row>
            </v-alert>

            <v-divider class="my-6" />

            <div class="text-center">
              <v-chip color="primary" size="large" label>
                <v-icon start>mdi-key</v-icon>
                Token: {{ result.token }}
              </v-chip>
            </div>
          </v-card-text>

          <!-- Assinatura Inválida -->
          <v-card-text v-else class="pa-6">
            <v-alert type="error" prominent>
              <v-row align="center">
                <v-col cols="12">
                  <div class="text-h6">{{ result.message }}</div>
                  <div class="text-body-2 mt-2">
                    Verifique se o token foi digitado corretamente.
                  </div>
                </v-col>
              </v-row>
            </v-alert>
          </v-card-text>

          <v-card-actions class="pa-6">
            <v-btn variant="text" @click="reset">
              <v-icon start>mdi-refresh</v-icon>
              Nova Validação
            </v-btn>
            <v-spacer />
            <v-btn color="primary" variant="elevated" @click="printResult" v-if="result.valid">
              <v-icon start>mdi-printer</v-icon>
              Imprimir Comprovante
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Informações Adicionais -->
        <v-card class="mt-6" variant="outlined">
          <v-card-text>
            <div class="text-center text-body-2 text-medium-emphasis">
              <v-icon>mdi-information</v-icon>
              Sistema de Assinatura Digital - Soloflow
              <br />
              Este sistema permite validar a autenticidade de assinaturas digitais
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const token = ref('')
const documentHash = ref('')
const loading = ref(false)
const result = ref(null)
const formValid = ref(false)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function validateSignature() {
  if (!formValid.value || !token.value) return

  loading.value = true
  result.value = null

  try {
    const response = await axios.post(`${API_URL}/signatures/public/validate`, {
      signatureToken: token.value.trim().toUpperCase(),
      documentHash: documentHash.value.trim() || undefined
    })

    result.value = response.data
  } catch (error) {
    result.value = {
      valid: false,
      message: error.response?.data?.message || 'Erro ao validar assinatura. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}

function reset() {
  token.value = ''
  documentHash.value = ''
  result.value = null
}

function printResult() {
  window.print()
}
</script>

<style scoped>
@media print {
  .v-btn,
  .v-alert:not(.success):not(.error) {
    display: none !important;
  }
}

code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>
