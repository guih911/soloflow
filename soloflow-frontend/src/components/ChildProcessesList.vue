<template>
  <v-card class="mb-4">
    <v-card-title>
      <v-icon class="mr-2">mdi-source-branch</v-icon>
      Sub-Processos
    </v-card-title>
    <v-divider />

    <!-- Loading -->
    <v-card-text v-if="loading" class="text-center py-6">
      <v-progress-circular indeterminate color="primary" size="32" />
      <p class="text-caption text-grey mt-2">Carregando...</p>
    </v-card-text>

    <!-- Lista vazia -->
    <v-list v-else-if="childProcesses.length === 0" density="comfortable">
      <v-list-item>
        <v-list-item-title class="text-center text-medium-emphasis">
          <v-icon class="mr-2">mdi-information-outline</v-icon>
          Nenhum sub-processo vinculado
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Lista de sub-processos -->
    <v-list v-else density="comfortable">
      <v-list-item
        v-for="child in childProcesses"
        :key="child.id"
        @click="$emit('view', child.childProcessInstance)"
        class="child-item"
      >
        <template v-slot:prepend>
          <v-icon :color="getStatusColor(child.status)">
            {{ getStatusIcon(child.status) }}
          </v-icon>
        </template>
        <v-list-item-title class="text-caption font-weight-medium">
          {{ child.childProcessInstance?.code }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip
            size="x-small"
            :color="getStatusColor(child.status)"
            variant="tonal"
          >
            {{ getStatusLabel(child.status) }}
          </v-chip>
          <span class="ml-2 text-caption">
            {{ child.childProcessInstance?.processTypeVersion?.processType?.name }}
          </span>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <!-- Botão de criar -->
    <v-divider v-if="canCreateChildProcess" />
    <v-card-actions v-if="canCreateChildProcess">
      <v-btn
        color="primary"
        variant="text"
        block
        @click="$emit('create')"
      >
        <v-icon start>mdi-plus</v-icon>
        Novo Sub-Processo
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  childProcesses: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  parentStatus: {
    type: String,
    default: 'IN_PROGRESS'
  }
})

defineEmits(['create', 'view'])

const canCreateChildProcess = computed(() => {
  return props.parentStatus !== 'CANCELLED'
})

function getStatusColor(status) {
  const colors = {
    PENDING: 'grey',
    ACTIVE: 'info',
    COMPLETED: 'success',
    CANCELLED: 'error',
    FAILED: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status) {
  const icons = {
    PENDING: 'mdi-clock-outline',
    ACTIVE: 'mdi-play-circle',
    COMPLETED: 'mdi-check-circle',
    CANCELLED: 'mdi-cancel',
    FAILED: 'mdi-alert-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

function getStatusLabel(status) {
  const labels = {
    PENDING: 'Pendente',
    ACTIVE: 'Em andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    FAILED: 'Falhou'
  }
  return labels[status] || status
}
</script>

<style scoped>
.child-item {
  cursor: pointer;
}

.child-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
