<template>
  <v-card class="previous-steps-card" elevation="2">
    <div class="summary-header" v-if="hasSteps">
      <div class="d-flex align-center">
        <div class="header-icon mr-3">
          <v-icon color="white">mdi-timeline-clock</v-icon>
        </div>
        <div>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Resumo das etapas anteriores</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">Veja rapidamente o que aconteceu antes desta etapa atual</p>
        </div>
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <v-icon color="primary" class="mr-2">mdi-check-circle-outline</v-icon>
          <div>
            <div class="summary-value">{{ previousStepsData.length }}</div>
            <div class="summary-label">Etapa{{ previousStepsData.length === 1 ? '' : 's' }} concluída{{ previousStepsData.length === 1 ? '' : 's' }}</div>
          </div>
        </div>
        <div class="summary-card" v-if="lastStep">
          <v-icon color="success" class="mr-2">mdi-account-check</v-icon>
          <div>
            <div class="summary-value">{{ lastStep.userName || 'Sistema' }}</div>
            <div class="summary-label">Último responsável</div>
          </div>
        </div>
        <div class="summary-card" v-if="lastStep">
          <v-icon color="secondary" class="mr-2">mdi-clock-outline</v-icon>
          <div>
            <div class="summary-value">{{ formatTimeAgo(lastStep.completedAt) }}</div>
            <div class="summary-label">Última atualização</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasSteps" class="previous-steps-content">
      <v-row dense>
        <v-col
          v-for="stepData in previousStepsData"
          :key="stepData.id"
          cols="12"
        >
          <v-card class="step-summary-card" variant="tonal">
            <div class="step-summary-header d-flex justify-space-between align-center">
              <div>
                <h4 class="text-subtitle-1 font-weight-bold mb-1">{{ stepData.stepName }}</h4>
                <div class="text-caption text-medium-emphasis">
                  Executada por {{ stepData.userName || 'Sistema' }} • {{ formatDate(stepData.completedAt) }} ({{ formatTimeAgo(stepData.completedAt) }})
                </div>
              </div>
              <v-chip color="primary" size="small" variant="flat">
                Etapa {{ stepData.stepOrder || '-' }}
              </v-chip>
            </div>

            <div class="step-summary-body">
              <div v-if="Object.keys(stepData.data || {}).length > 0" class="data-grid">
                <div
                  class="data-item"
                  v-for="(value, key) in stepData.data"
                  :key="key"
                >
                  <div class="data-label">{{ key }}</div>
                  <div class="data-value">{{ value || 'Não informado' }}</div>
                </div>
              </div>
              <div v-else class="text-body-2 text-medium-emphasis">
                Nenhum dado específico foi registrado nesta etapa.
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <div v-else class="empty-state text-center pa-6">
      <v-icon size="32" color="grey" class="mb-2">mdi-information-outline</v-icon>
      <div class="text-body-2 text-medium-emphasis">Nenhuma etapa anterior concluída com dados relevantes.</div>
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

const hasSteps = computed(() => props.previousStepsData.length > 0);

const lastStep = computed(() => {
  if (!hasSteps.value) return null;
  return [...props.previousStepsData].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
});

function formatTimeAgo(date) {
  return dayjs(date).fromNow();
}

function formatDate(date) {
  return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Data não informada';
}
</script>

<style scoped>
.previous-steps-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.summary-header {
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.12), rgba(156, 39, 176, 0.03));
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7b1fa2, #ab47bc);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.2);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.summary-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(123, 31, 162, 0.08);
}

.summary-value {
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.summary-label {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.55);
}

.previous-steps-content {
  padding: 20px;
}

.step-summary-card {
  border-radius: 14px;
  padding: 16px;
  background-color: rgba(123, 31, 162, 0.04);
  border: 1px solid rgba(123, 31, 162, 0.15);
}

.step-summary-header {
  margin-bottom: 12px;
}

.step-summary-body {
  background: white;
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.data-grid {
  display: grid;
  gap: 10px;
}

.data-item {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(123, 31, 162, 0.05);
}

.data-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 4px;
}

.data-value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
}

.empty-state {
  background: rgba(123, 31, 162, 0.05);
}

@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
