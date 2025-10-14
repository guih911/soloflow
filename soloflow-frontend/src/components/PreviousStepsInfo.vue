<template>
  <v-card class="previous-steps-card" elevation="2">
    <v-card-title class="d-flex align-center pa-4">
      <v-icon color="secondary" class="mr-2">mdi-information</v-icon>
      Informações de Etapas Anteriores
    </v-card-title>
    <v-divider />

    <div v-if="previousStepsData.length > 0" class="previous-steps-content">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="stepData in previousStepsData"
          :key="stepData.id"
        >
          <v-expansion-panel-title>
            <v-avatar size="32" color="secondary" class="mr-3">
              <v-icon size="16" color="white">mdi-check-circle</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium text-body-1">{{ stepData.stepName }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ stepData.userName }} • {{ formatTimeAgo(stepData.completedAt) }}
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="previous-step-details">
            <div v-if="Object.keys(stepData.data).length > 0">
              <div class="text-subtitle-2 mb-2">Dados Informados:</div>
              <v-table density="compact">
                <tbody>
                  <tr v-for="(value, key) in stepData.data" :key="key">
                    <td class="font-weight-bold" style="width: 40%;">{{ key }}</td>
                    <td>{{ value || 'Não informado' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div v-else class="text-center text-medium-emphasis pa-2">
              Nenhum dado específico informado nesta etapa.
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    
    <div v-else class="text-center pa-6 text-medium-emphasis">
      <v-icon size="32" class="mb-2">mdi-information-outline</v-icon>
      <div class="text-body-2">Nenhuma etapa anterior com dados específicos.</div>
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
  previousStepsData: {
    type: Array,
    default: () => [],
  }
});

function formatTimeAgo(date) {
  return dayjs(date).fromNow();
}
</script>

<style scoped>
.previous-steps-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.previous-steps-content {
  max-height: 400px; 
  overflow-y: auto;
}

.previous-step-details {
  background-color: #f9f9f9;
}

.v-table td {
  padding: 8px 16px;
}
</style>