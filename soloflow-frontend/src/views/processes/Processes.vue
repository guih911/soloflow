<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Processos</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Escolha um fluxo de trabalho e avance para a criação do processo.
        </p>
      </div>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista os Processos -->
    <v-row>
      <v-col
        v-for="processType in filteredProcessTypes"
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

            <v-card-subtitle class="mb-12" v-if="processType.description">
              {{ processType.description }}
            </v-card-subtitle>

            <v-divider />

            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                @click="duplicateProcessType(processType)"
              >
                <v-icon start>mdi-playlist-plus</v-icon>
                Criar processo
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-card
      v-if="!loading && filteredProcessTypes.length === 0"
      class="text-center py-12"
    >
      <v-icon size="64" color="grey-lighten-1">
        mdi-file-document-multiple-outline
      </v-icon>
      <p class="text-h6 mt-4 text-grey">
        Nenhum tipo de processo encontrado
      </p>
      <p class="text-body-2 text-grey mb-4">
        Tente ajustar sua busca ou crie um novo tipo de processo.
      </p>
      <v-btn color="primary" @click="createNew">
        <v-icon start>mdi-plus</v-icon>
        Criar Primeiro Tipo
      </v-btn>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const processTypeStore = useProcessTypeStore()

// Estados
const search = ref('')

// Carregamento e dados
const loading = computed(() => processTypeStore.loading)
const processTypes = computed(() => processTypeStore.processTypes)

// Filtro
const filteredProcessTypes = computed(() => {
  const query = search.value.toLowerCase().trim()
  if (!query) return processTypes.value
  return processTypes.value.filter((p) =>
    p.name.toLowerCase().includes(query)
  )
})

// Métodos
function createNew() {
  router.push('/process-types/new')
}

function duplicateProcessType(processType) {
  router.push(`/process-types/${processType.id}/new`)
}

// Lifecycle
onMounted(() => {
  processTypeStore.fetchProcessTypes()
})
</script>
