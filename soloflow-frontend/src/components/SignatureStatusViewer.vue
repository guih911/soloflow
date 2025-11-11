<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-file-sign</v-icon>
      Status das Assinaturas
    </v-card-title>

    <v-card-text>
      <v-timeline side="end" density="compact">
        <v-timeline-item
          v-for="(req, index) in sortedRequirements"
          :key="req.id"
          :dot-color="getStatusColor(req)"
          size="small"
        >
          <template #icon>
            <v-icon size="16" color="white">
              {{ getStatusIcon(req) }}
            </v-icon>
          </template>

          <div class="d-flex flex-column">
            <div class="d-flex align-center mb-1">
              <v-chip size="small" :color="getStatusColor(req)" class="mr-2">
                {{ req.order }}º
              </v-chip>
              <strong>{{ getSignerName(req) }}</strong>
            </div>

            <div class="text-body-2 text-medium-emphasis mb-2">
              {{ req.description || 'Assinatura digital' }}
            </div>

            <!-- Se já foi assinado -->
            <div v-if="getSignatureRecord(req)" class="mb-2">
              <v-card variant="tonal" color="success" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <v-icon start color="success">mdi-check-circle</v-icon>
                  <span class="font-weight-medium">Assinado por {{ getSignatureRecord(req).signer.name }}</span>
                </div>

                <div class="text-caption">
                  <div>
                    <v-icon size="14">mdi-calendar</v-icon>
                    {{ formatDate(getSignatureRecord(req).signedAt) }}
                  </div>
                  <div v-if="getSignatureRecord(req).certificateCPF">
                    <v-icon size="14">mdi-card-account-details</v-icon>
                    CPF: {{ getSignatureRecord(req).certificateCPF }}
                  </div>
                  <div v-if="getSignatureRecord(req).certificateCNPJ">
                    <v-icon size="14">mdi-domain</v-icon>
                    CNPJ: {{ getSignatureRecord(req).certificateCNPJ }}
                  </div>
                  <div>
                    <v-icon size="14">mdi-shield-check</v-icon>
                    Algoritmo: {{ getSignatureRecord(req).signatureAlgorithm }}
                  </div>
                  <div v-if="getSignatureRecord(req).ipAddress">
                    <v-icon size="14">mdi-ip</v-icon>
                    IP: {{ getSignatureRecord(req).ipAddress }}
                  </div>
                </div>

                <v-btn
                  v-if="showDetails"
                  size="x-small"
                  variant="text"
                  prepend-icon="mdi-information"
                  @click="showSignatureDetails(getSignatureRecord(req))"
                  class="mt-2"
                >
                  Ver Detalhes
                </v-btn>
              </v-card>
            </div>

            <!-- Se está pendente -->
            <div v-else>
              <v-card variant="tonal" color="warning" class="pa-3">
                <div class="d-flex align-center">
                  <v-icon start color="warning">mdi-clock-outline</v-icon>
                  <span class="font-weight-medium">Aguardando assinatura</span>
                </div>

                <!-- Mostrar se pode assinar agora -->
                <div v-if="canSignNow(req)" class="mt-2">
                  <v-btn
                    size="small"
                    color="primary"
                    prepend-icon="mdi-pen"
                    @click="$emit('sign', req)"
                  >
                    Assinar Agora
                  </v-btn>
                </div>

                <!-- Mostrar se precisa aguardar -->
                <div v-else-if="needsToWait(req)" class="mt-2">
                  <v-chip size="small" color="info">
                    Aguardando assinatura anterior
                  </v-chip>
                </div>
              </v-card>
            </div>

            <!-- Indicador de tipo de assinatura -->
            <div class="mt-2">
              <v-chip
                size="x-small"
                :color="req.type === 'SEQUENTIAL' ? 'primary' : 'secondary'"
                variant="outlined"
              >
                <v-icon start size="12">
                  {{ req.type === 'SEQUENTIAL' ? 'mdi-numeric' : 'mdi-shuffle-variant' }}
                </v-icon>
                {{ req.type === 'SEQUENTIAL' ? 'Sequencial' : 'Paralelo' }}
              </v-chip>
              <v-chip
                v-if="req.isRequired"
                size="x-small"
                color="error"
                variant="outlined"
                class="ml-1"
              >
                Obrigatório
              </v-chip>
            </div>
          </div>
        </v-timeline-item>
      </v-timeline>

      <!-- Resumo -->
      <v-divider class="my-4" />

      <div class="d-flex justify-space-between align-center">
        <div>
          <v-chip color="success" class="mr-2">
            <v-icon start>mdi-check</v-icon>
            {{ completedCount }} assinada(s)
          </v-chip>
          <v-chip color="warning">
            <v-icon start>mdi-clock</v-icon>
            {{ pendingCount }} pendente(s)
          </v-chip>
        </div>

        <v-btn
          v-if="allSigned"
          color="success"
          variant="tonal"
          prepend-icon="mdi-check-all"
          disabled
        >
          Todas as assinaturas concluídas
        </v-btn>
      </div>
    </v-card-text>

    <!-- Dialog de detalhes da assinatura -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedSignature">
        <v-card-title>
          <v-icon start color="primary">mdi-file-certificate</v-icon>
          Detalhes da Assinatura Digital
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-list>
            <v-list-item>
              <template #prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>Assinante</v-list-item-title>
              <v-list-item-subtitle>{{ selectedSignature.signer.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon>mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Data/Hora</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(selectedSignature.signedAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedSignature.certificateSubject">
              <template #prepend>
                <v-icon>mdi-certificate</v-icon>
              </template>
              <v-list-item-title>Certificado</v-list-item-title>
              <v-list-item-subtitle class="text-wrap">
                {{ selectedSignature.certificateSubject }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedSignature.certificateIssuer">
              <template #prepend>
                <v-icon>mdi-bank</v-icon>
              </template>
              <v-list-item-title>Autoridade Certificadora</v-list-item-title>
              <v-list-item-subtitle class="text-wrap">
                {{ selectedSignature.certificateIssuer }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedSignature.certificateSerialNumber">
              <template #prepend>
                <v-icon>mdi-barcode</v-icon>
              </template>
              <v-list-item-title>Número de Série</v-list-item-title>
              <v-list-item-subtitle>{{ selectedSignature.certificateSerialNumber }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon>mdi-shield-check</v-icon>
              </template>
              <v-list-item-title>Algoritmo</v-list-item-title>
              <v-list-item-subtitle>{{ selectedSignature.signatureAlgorithm }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon>mdi-fingerprint</v-icon>
              </template>
              <v-list-item-title>Hash da Assinatura</v-list-item-title>
              <v-list-item-subtitle class="text-wrap font-monospace">
                {{ selectedSignature.signatureHash?.substring(0, 32) }}...
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedSignature.ipAddress">
              <template #prepend>
                <v-icon>mdi-ip</v-icon>
              </template>
              <v-list-item-title>Endereço IP</v-list-item-title>
              <v-list-item-subtitle>{{ selectedSignature.ipAddress }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedSignature.signatureReason">
              <template #prepend>
                <v-icon>mdi-text</v-icon>
              </template>
              <v-list-item-title>Motivo</v-list-item-title>
              <v-list-item-subtitle>{{ selectedSignature.signatureReason }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  requirements: {
    type: Array,
    default: () => []
  },
  signatures: {
    type: Array,
    default: () => []
  },
  currentUserId: String,
  showDetails: {
    type: Boolean,
    default: true
  }
})

defineEmits(['sign'])

const detailsDialog = ref(false)
const selectedSignature = ref(null)

const sortedRequirements = computed(() => {
  return [...props.requirements].sort((a, b) => a.order - b.order)
})

const completedCount = computed(() => {
  return props.requirements.filter(req => getSignatureRecord(req)).length
})

const pendingCount = computed(() => {
  return props.requirements.length - completedCount.value
})

const allSigned = computed(() => {
  return completedCount.value === props.requirements.length
})

function getSignatureRecord(requirement) {
  return props.signatures.find(sig => sig.requirementId === requirement.id)
}

function getStatusColor(requirement) {
  const signature = getSignatureRecord(requirement)
  if (signature) {
    if (signature.status === 'COMPLETED') return 'success'
    if (signature.status === 'REJECTED') return 'error'
  }
  return 'warning'
}

function getStatusIcon(requirement) {
  const signature = getSignatureRecord(requirement)
  if (signature?.status === 'COMPLETED') return 'mdi-check'
  if (signature?.status === 'REJECTED') return 'mdi-close'
  return 'mdi-clock-outline'
}

function getSignerName(requirement) {
  if (requirement.user) return requirement.user.name
  if (requirement.sector) return `Setor: ${requirement.sector.name}`
  return 'Não definido'
}

function canSignNow(requirement) {
  // Verifica se o usuário atual pode assinar
  const isAssignedUser = requirement.userId === props.currentUserId

  // Se for sequencial, precisa verificar se as anteriores foram assinadas
  if (requirement.type === 'SEQUENTIAL') {
    const previousRequirements = props.requirements.filter(r => r.order < requirement.order)
    const allPreviousSigned = previousRequirements.every(r => getSignatureRecord(r))
    return isAssignedUser && allPreviousSigned
  }

  // Se for paralelo, pode assinar a qualquer momento
  return isAssignedUser
}

function needsToWait(requirement) {
  if (requirement.type !== 'SEQUENTIAL') return false

  const previousRequirements = props.requirements.filter(r => r.order < requirement.order)
  return !previousRequirements.every(r => getSignatureRecord(r))
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('pt-BR')
}

function showSignatureDetails(signature) {
  selectedSignature.value = signature
  detailsDialog.value = true
}
</script>

<style scoped>
.font-monospace {
  font-family: monospace;
  font-size: 0.875rem;
}
</style>
