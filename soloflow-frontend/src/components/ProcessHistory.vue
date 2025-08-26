<template>
  <v-card class="history-card" elevation="2">
    <v-card-title class="d-flex align-center pa-4">
      <v-icon color="primary" class="mr-2">mdi-history</v-icon>
      Histórico do Processo
    </v-card-title>
    <v-divider />

    <div v-if="completedExecutions.length > 0" class="history-content">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="execution in completedExecutions"
          :key="execution.id"
        >
          <v-expansion-panel-title>
            <v-avatar size="32" :color="getExecutionColor(execution)" class="mr-3">
              <v-icon size="16" color="white">{{ getExecutionIcon(execution) }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium text-body-1">{{ execution.step.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ execution.executor?.name || 'Sistema' }} • {{ formatTimeAgo(execution.completedAt) }}
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="history-details">
            <div v-if="hasFormData(execution.formData)">
              <div class="text-subtitle-2 mb-2">Dados Preenchidos:</div>
              <v-table density="compact">
                  <tbody>
                      <tr v-for="(value, key) in execution.formData" :key="key">
                          <td class="font-weight-bold" style="width: 40%;">{{ getFieldLabel(key, execution.step) }}</td>
                          <td>{{ value }}</td>
                      </tr>
                  </tbody>
              </v-table>
            </div>
            <div v-else class="text-center text-medium-emphasis pa-2">
              Nenhum dado de formulário preenchido.
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    
    <div v-else class="text-center pa-6 text-medium-emphasis">
      <v-icon size="32" class="mb-2">mdi-information-outline</v-icon>
      <div class="text-body-2">Nenhuma etapa concluída ainda.</div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
  processFormFields: {
    type: Array,
    default: () => [],
  }
});

const completedExecutions = computed(() =>
  (props.history || [])
    .filter(e => e.status === 'COMPLETED')
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
);

function hasFormData(formData) {
  if (!formData || typeof formData !== 'object' || Object.keys(formData).length === 0) {
    return false;
  }
  return true;
}

function getFieldLabel(fieldName, step) {
    const allFields = [
        ...(props.processFormFields || []),
        ...(step?.conditions?.fields || [])
    ];
    const field = allFields.find(f => f.name === fieldName);
    return field?.label || fieldName;
}

function formatTimeAgo(date) {
  return dayjs(date).fromNow();
}

function getExecutionColor(execution) {
  return execution.action === 'reprovar' ? 'error' : 'success';
}

function getExecutionIcon(execution) {
  return execution.action === 'reprovar' ? 'mdi-close' : 'mdi-check';
}
</script>

<style scoped>
.history-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.history-content {
  max-height: 400px; 
  overflow-y: auto;
}
.history-details {
  background-color: #f9f9f9;
}
.v-table td {
    padding: 8px 16px;
}
</style>