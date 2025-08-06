<template>
  <div v-if="process">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="goBack"
      />
      <div class="ml-4 flex-grow-1">
        <div class="d-flex align-center">
          <h1 class="text-h4 font-weight-bold">
            {{ process.title || process.code }}
          </h1>
          <v-chip
            :color="getStatusColor(process.status)"
            class="ml-3"
            label
          >
            {{ getStatusText(process.status) }}
          </v-chip>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis">
          {{ process.processType.name }}
        </p>
      </div>
    </div>

    <v-row>
      <!-- Informações do Processo -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Informações</v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-identifier</v-icon>
              </template>
              <v-list-item-title>Código</v-list-item-title>
              <v-list-item-subtitle>{{ process.code }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>Solicitante</v-list-item-title>
              <v-list-item-subtitle>{{ process.createdBy.name }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon>mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Criado em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.createdAt) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="process.completedAt">
              <template v-slot:prepend>
                <v-icon>mdi-calendar-check</v-icon>
              </template>
              <v-list-item-title>Concluído em</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(process.completedAt) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider v-if="process.description" />
          
          <v-card-text v-if="process.description">
            <p class="text-caption text-medium-emphasis mb-1">Descrição</p>
            <p class="text-body-2">{{ process.description }}</p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Timeline das Etapas -->
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Fluxo do Processo</v-card-title>
          <v-divider />
          
          <v-timeline
            side="end"
            density="comfortable"
            class="pa-4"
          >
            <v-timeline-item
              v-for="(execution, index) in process.stepExecutions"
              :key="execution.id"
              :dot-color="getExecutionColor(execution)"
              :icon="getExecutionIcon(execution)"
              :size="execution.status === 'IN_PROGRESS' ? 'large' : 'default'"
            >
              <template v-slot:opposite>
                <div class="text-caption">
                  Etapa {{ index + 1 }}
                </div>
              </template>

              <v-card
                :color="execution.status === 'IN_PROGRESS' ? 'primary' : ''"
                :variant="execution.status === 'IN_PROGRESS' ? 'tonal' : 'outlined'"
              >
                <v-card-title class="text-h6">
                  {{ execution.step.name }}
                  <v-chip
                    v-if="execution.status === 'IN_PROGRESS'"
                    size="small"
                    color="warning"
                    class="ml-2"
                  >
                    Em Andamento
                  </v-chip>
                </v-card-title>

                <v-card-subtitle v-if="execution.step.description">
                  {{ execution.step.description }}
                </v-card-subtitle>

                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-1">mdi-account-check</v-icon>
                    <span class="text-body-2">
                      Responsável: {{ getResponsibleName(execution) }}
                    </span>
                  </div>

                  <div v-if="execution.executor" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-1">mdi-account-edit</v-icon>
                    <span class="text-body-2">
                      Executado por: {{ execution.executor.name }}
                    </span>
                  </div>

                  <div v-if="execution.completedAt" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-1">mdi-clock-check</v-icon>
                    <span class="text-body-2">
                      Concluído em: {{ formatDate(execution.completedAt) }}
                    </span>
                  </div>

                  <div v-if="execution.action" class="d-flex align-center mb-2">
                    <v-icon size="16" class="mr-1">mdi-gesture-tap</v-icon>
                    <span class="text-body-2">
                      Ação: <v-chip size="x-small">{{ execution.action }}</v-chip>
                    </span>
                  </div>

                  <div v-if="execution.comment" class="mt-3">
                    <p class="text-caption text-medium-emphasis">Comentário:</p>
                    <p class="text-body-2">{{ execution.comment }}</p>
                  </div>

                  <div v-if="execution.attachments?.length > 0" class="mt-3">
                    <p class="text-caption text-medium-emphasis mb-1">Anexos:</p>
                    <v-chip
                      v-for="attachment in execution.attachments"
                      :key="attachment.id"
                      size="small"
                      class="mr-1"
                      @click="downloadAttachment(attachment)"
                    >
                      <v-icon start size="16">mdi-paperclip</v-icon>
                      {{ attachment.originalName }}
                    </v-chip>
                  </div>
                </v-card-text>

                <v-card-actions v-if="canExecuteStep(execution)">
                  <v-btn
                    color="primary"
                    variant="elevated"
                    @click="executeStep(execution)"
                  >
                    <v-icon start>mdi-play</v-icon>
                    Executar Etapa
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="text-center py-12">
    <v-progress-circular
      indeterminate
      color="primary"
      size="64"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProcessStore } from '@/stores/processes'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const processStore = useProcessStore()

// Computed
const loading = computed(() => processStore.loading)
const process = computed(() => processStore.currentProcess)

// Métodos auxiliares
function getStatusColor(status) {
  const colors = {
    DRAFT: 'grey',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    REJECTED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = {
    DRAFT: 'Rascunho',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rejeitado'
  }
  return texts[status] || status
}

function getExecutionColor(execution) {
  const colors = {
    PENDING: 'grey',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    REJECTED: 'error',
    SKIPPED: 'grey'
  }
  return colors[execution.status] || 'grey'
}

function getExecutionIcon(execution) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    IN_PROGRESS: 'mdi-progress-clock',
    COMPLETED: 'mdi-check',
    REJECTED: 'mdi-close',
    SKIPPED: 'mdi-skip-next'
  }
  return icons[execution.status] || 'mdi-help'
}

function getResponsibleName(execution) {
  if (execution.step.assignedToUser) {
    return execution.step.assignedToUser.name
  }
  if (execution.step.assignedToSector) {
    return `Setor ${execution.step.assignedToSector.name}`
  }
  return 'Não definido'
}

function canExecuteStep(execution) {
  if (execution.status !== 'IN_PROGRESS') return false

  const user = authStore.user
  const step = execution.step

  // Verificar se é responsável direto
  if (step.assignedToUserId === user.id) return true
  
  // Verificar se pertence ao setor responsável
  if (step.assignedToSectorId && user.sectorId === step.assignedToSectorId) return true

  return false
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

// Métodos
function goBack() {
  router.push('/processes')
}

function executeStep(execution) {
  router.push(`/processes/${process.value.id}/execute/${execution.id}`)
}

async function downloadAttachment(attachment) {
  try {
    const response = await api.get(`/attachments/${attachment.id}`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', attachment.originalName)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    window.showSnackbar('Erro ao baixar arquivo', 'error')
  }
}

onMounted(() => {
  processStore.fetchProcess(route.params.id)
})
</script>