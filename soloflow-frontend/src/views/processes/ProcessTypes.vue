<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Tipos de Processo</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Configure os fluxos de trabalho da empresa
        </p>
      </div>
      <v-btn
        color="primary"
        @click="createNew"
        prepend-icon="mdi-plus"
      >
        Novo Tipo
      </v-btn>
    </div>

    <!-- Lista de Tipos de Processo -->
    <v-row>
      <v-col
        v-for="processType in processTypes"
        :key="processType.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-hover v-slot="{ isHovering, props }">
          <v-card
            v-bind="props"
            :elevation="isHovering ? 8 : 2"
            class="h-100 d-flex flex-column"
          >
            <v-card-title>
              <v-icon color="primary" class="mr-2">
                mdi-file-document-multiple-outline
              </v-icon>
              {{ processType.name }}
            </v-card-title>

            <v-card-subtitle v-if="processType.description">
              {{ processType.description }}
            </v-card-subtitle>

            <v-card-text class="flex-grow-1">
              <div class="mb-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="20" class="mr-2">mdi-debug-step-over</v-icon>
                  <span class="text-body-2">
                    {{ processType.steps?.length || 0 }} etapas
                  </span>
                </div>
                <div class="d-flex align-center">
                  <v-icon size="20" class="mr-2">mdi-counter</v-icon>
                  <span class="text-body-2">
                    {{ processType._count?.instances || 0 }} processos criados
                  </span>
                </div>
              </div>

              <!-- Preview das etapas -->
              <div v-if="processType.steps?.length > 0" class="mt-3">
                <p class="text-caption text-medium-emphasis mb-2">Fluxo:</p>
                <v-chip
                  v-for="(step, idx) in processType.steps.slice(0, 3)"
                  :key="step.id"
                  size="x-small"
                  class="mr-1 mb-1"
                  variant="tonal"
                >
                  {{ idx + 1 }}. {{ step.name }}
                </v-chip>
                <v-chip
                  v-if="processType.steps.length > 3"
                  size="x-small"
                  variant="tonal"
                >
                  +{{ processType.steps.length - 3 }}
                </v-chip>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="editProcessType(processType)"
              >
                <v-icon start>mdi-pencil</v-icon>
                Editar
              </v-btn>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                @click="duplicateProcessType(processType)"
              >
                <v-icon start>mdi-content-copy</v-icon>
                Duplicar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && processTypes.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-document-multiple-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum tipo de processo criado
      </p>
      <p class="text-body-2 text-grey mb-4">
        Crie tipos de processo para que os usuários possam iniciar workflows
      </p>
      <v-btn
        color="primary"
        @click="createNew"
      >
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Tipo
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const processTypeStore = useProcessTypeStore()

// Computed
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)

// Métodos
function createNew() {
  router.push('/process-types/new')
}

function editProcessType(processType) {
  router.push(`/process-types/${processType.id}/edit`)
}

async function duplicateProcessType(processType) {
  try {
    const newData = {
      name: `${processType.name} (Cópia)`,
      description: processType.description,
      companyId: processType.companyId,
      steps: processType.steps.map(step => ({
        name: step.name,
        description: step.description,
        type: step.type,
        order: step.order,
        allowAttachment: step.allowAttachment,
        requiresSignature: step.requiresSignature,
        actions: JSON.parse(step.actions || '[]'),
        assignedToUserId: step.assignedToUserId,
        assignedToSectorId: step.assignedToSectorId,
        conditions: step.conditions ? JSON.parse(step.conditions) : null
      }))
    }

    await processTypeStore.createProcessType(newData)
    window.showSnackbar('Tipo de processo duplicado com sucesso!', 'success')
  } catch (error) {
    window.showSnackbar('Erro ao duplicar tipo de processo', 'error')
  }
}

onMounted(() => {
  processTypeStore.fetchProcessTypes()
})
</script>

