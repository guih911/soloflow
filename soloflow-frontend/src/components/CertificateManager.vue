<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <v-icon start color="primary">mdi-certificate</v-icon>
          Meus Certificados Digitais
        </div>
        <v-btn color="primary" prepend-icon="mdi-upload" @click="uploadDialog = true">
          Adicionar Certificado
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert v-if="expiringSoon.length > 0" type="warning" class="mb-4">
          <v-icon start>mdi-alert</v-icon>
          Você tem {{ expiringSoon.length }} certificado(s) expirando em breve!
        </v-alert>

        <v-list v-if="certificates.length > 0">
          <v-list-item
            v-for="cert in certificates"
            :key="cert.id"
            :class="{ 'bg-grey-lighten-4': cert.isExpired }"
          >
            <template #prepend>
              <v-avatar :color="getCertificateColor(cert)">
                <v-icon>{{ getCertificateIcon(cert) }}</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="d-flex align-center">
              {{ cert.name }}
              <v-chip v-if="cert.isDefault" size="x-small" color="primary" class="ml-2">
                Padrão
              </v-chip>
              <v-chip v-if="cert.isExpired" size="x-small" color="error" class="ml-2">
                Expirado
              </v-chip>
              <v-chip
                v-else-if="cert.daysUntilExpiration <= 30"
                size="x-small"
                color="warning"
                class="ml-2"
              >
                Expira em {{ cert.daysUntilExpiration }} dias
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle>
              <div>
                <strong>CPF:</strong> {{ cert.cpf || 'N/A' }}
                <strong class="ml-4">CNPJ:</strong> {{ cert.cnpj || 'N/A' }}
              </div>
              <div>
                <strong>Validade:</strong>
                {{ new Date(cert.validFrom).toLocaleDateString('pt-BR') }} até
                {{ new Date(cert.validTo).toLocaleDateString('pt-BR') }}
              </div>
              <div class="text-caption">{{ cert.subject }}</div>
            </v-list-item-subtitle>

            <template #append>
              <v-btn
                v-if="!cert.isDefault && !cert.isExpired"
                icon="mdi-star-outline"
                size="small"
                variant="text"
                @click="setAsDefault(cert.id)"
                title="Definir como padrão"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="confirmDelete(cert)"
                title="Remover certificado"
              />
            </template>
          </v-list-item>
        </v-list>

        <v-empty-state
          v-else
          icon="mdi-certificate-outline"
          title="Nenhum certificado cadastrado"
          text="Faça upload de um certificado A1 (.pfx ou .p12) para começar a assinar documentos digitalmente."
        />
      </v-card-text>
    </v-card>

    <!-- Dialog de Upload -->
    <v-dialog v-model="uploadDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          <v-icon start color="primary">mdi-upload</v-icon>
          Adicionar Certificado A1
        </v-card-title>

        <v-divider />

        <v-form ref="uploadForm" v-model="uploadValid">
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-4">
              <div class="text-body-2">
                <strong>Importante:</strong>
                <ul class="mt-2">
                  <li>Apenas certificados ICP-Brasil tipo A1 (.pfx ou .p12)</li>
                  <li>Seus dados são criptografados e armazenados com segurança</li>
                  <li>O certificado será usado para assinar documentos no sistema</li>
                </ul>
              </div>
            </v-alert>

            <v-file-input
              v-model="certificateFile"
              label="Arquivo do Certificado"
              accept=".pfx,.p12"
              prepend-icon="mdi-file-certificate"
              :rules="[v => !!v || 'Arquivo obrigatório']"
              required
              hint="Arquivo .pfx ou .p12"
              persistent-hint
              class="mb-4"
            />

            <v-text-field
              v-model="uploadData.name"
              label="Nome do Certificado"
              prepend-icon="mdi-label"
              :rules="[v => !!v || 'Nome obrigatório']"
              required
              hint="Ex: Meu Certificado A1"
              persistent-hint
              class="mb-4"
            />

            <v-text-field
              v-model="uploadData.password"
              label="Senha do Certificado"
              type="password"
              prepend-icon="mdi-lock"
              :rules="[v => !!v || 'Senha obrigatória']"
              required
              hint="Senha do arquivo .pfx/.p12"
              persistent-hint
              class="mb-4"
            />

            <v-switch
              v-model="uploadData.isDefault"
              label="Definir como certificado padrão"
              color="primary"
              hint="Este certificado será usado automaticamente para assinaturas"
              persistent-hint
            />
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeUploadDialog">Cancelar</v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!uploadValid"
              :loading="loading"
              @click="handleUpload"
            >
              Adicionar
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de Confirmação de Exclusão -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start>mdi-alert</v-icon>
          Confirmar Exclusão
        </v-card-title>
        <v-card-text>
          Tem certeza que deseja remover o certificado
          <strong>{{ certificateToDelete?.name }}</strong>?
          <br /><br />
          Esta ação não pode ser desfeita.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" :loading="loading" @click="handleDelete">
            Remover
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSignaturesStore } from '../stores/signatures'

const signaturesStore = useSignaturesStore()

const uploadDialog = ref(false)
const deleteDialog = ref(false)
const uploadValid = ref(false)
const certificateFile = ref(null)
const certificateToDelete = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const uploadData = ref({
  name: '',
  password: '',
  isDefault: false
})

const loading = computed(() => signaturesStore.loading)
const certificates = computed(() => signaturesStore.certificates)
const expiringSoon = computed(() => signaturesStore.expiringSoonCertificates)

onMounted(() => {
  signaturesStore.fetchMyCertificates()
})

function getCertificateColor(cert) {
  if (cert.isExpired) return 'error'
  if (cert.daysUntilExpiration <= 30) return 'warning'
  return 'success'
}

function getCertificateIcon(cert) {
  if (cert.isExpired) return 'mdi-certificate-outline'
  return 'mdi-certificate'
}

async function handleUpload() {
  if (!uploadValid.value || !certificateFile.value) return

  try {
    await signaturesStore.uploadCertificate(certificateFile.value[0], uploadData.value)
    showSnackbar('Certificado adicionado com sucesso!', 'success')
    closeUploadDialog()
  } catch (error) {
    showSnackbar(error.response?.data?.message || 'Erro ao adicionar certificado', 'error')
  }
}

function closeUploadDialog() {
  uploadDialog.value = false
  certificateFile.value = null
  uploadData.value = {
    name: '',
    password: '',
    isDefault: false
  }
}

async function setAsDefault(certificateId) {
  try {
    await signaturesStore.setDefaultCertificate(certificateId)
    showSnackbar('Certificado padrão atualizado!', 'success')
  } catch (error) {
    showSnackbar(error.response?.data?.message || 'Erro ao definir certificado padrão', 'error')
  }
}

function confirmDelete(cert) {
  certificateToDelete.value = cert
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await signaturesStore.deleteCertificate(certificateToDelete.value.id)
    showSnackbar('Certificado removido com sucesso!', 'success')
    deleteDialog.value = false
    certificateToDelete.value = null
  } catch (error) {
    showSnackbar(error.response?.data?.message || 'Erro ao remover certificado', 'error')
  }
}

function showSnackbar(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>
