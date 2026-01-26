<template>
  <v-card class="history-card" elevation="0">
    <!-- Cabeçalho -->
    <div class="history-header px-6 py-5">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" size="24" class="mr-3">mdi-history</v-icon>
          <div>
            <h2 class="text-h6 font-weight-bold mb-0">Histórico do Processo</h2>
            <p class="text-caption text-medium-emphasis mb-0 mt-1">
              Acompanhe cada decisão registrada neste fluxo
            </p>
          </div>
        </div>
        <div v-if="completedExecutions.length > 0" class="text-body-2 text-medium-emphasis">
          {{ completedExecutions.length }} {{ completedExecutions.length === 1 ? 'etapa' : 'etapas' }}
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Modal de visualização de anexos -->
    <AttachmentPreviewModal
      v-model="showPreview"
      :attachment="selectedAttachment"
    />

    <!-- Conteúdo: Expansion Panels -->
    <div v-if="completedExecutions.length > 0" class="history-content pa-4">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="(execution, index) in completedExecutions"
          :key="execution.id"
          class="history-panel mb-3"
          elevation="0"
        >
          <!-- Título do painel -->
          <v-expansion-panel-title class="panel-title">
            <div class="d-flex align-center w-100">
              <!-- Indicador de Status -->
              <div class="status-indicator" :class="getStatusClass(execution)">
                <v-icon size="20" color="white">{{ getExecutionIcon(execution) }}</v-icon>
              </div>

              <!-- Informações da Etapa -->
              <div class="step-info">
                <div class="step-name">{{ execution.step.name }}</div>
                <div class="step-details">
                  <span class="detail-item">
                    <v-icon size="14">mdi-account-outline</v-icon>
                    {{ execution.executor?.name || 'Sistema' }}
                  </span>
                  <span class="detail-separator">•</span>
                  <span class="detail-item">
                    <v-icon size="14">mdi-clock-outline</v-icon>
                    {{ formatDateTime(execution.completedAt) }}
                  </span>
                </div>
              </div>
            </div>
          </v-expansion-panel-title>

          <!-- Conteúdo do painel -->
          <v-expansion-panel-text class="panel-content">
            <!-- Tipo de Etapa -->
            <div v-if="execution.step?.type" class="info-row mb-3">
              <span class="info-label">Tipo de etapa</span>
              <span class="info-value">{{ getStepTypeText(execution.step.type) }}</span>
            </div>

            <!-- Comentário -->
            <div v-if="execution.comment" class="comment-box mb-4">
              <div class="comment-header">
                <v-icon size="16" class="mr-2">mdi-message-text-outline</v-icon>
                <span>Comentário</span>
              </div>
              <div class="comment-text">{{ execution.comment }}</div>
            </div>

            <!-- Anexos -->
            <div v-if="execution.attachments && execution.attachments.length > 0" class="attachments-section">
              <div class="attachments-header mb-3">
                <v-icon size="16" class="mr-2">mdi-paperclip</v-icon>
                <span>Anexos</span>
                <span class="attachments-count">({{ execution.attachments.length }})</span>
              </div>

              <div class="attachments-list">
                <div
                  v-for="attachment in execution.attachments"
                  :key="attachment.id"
                  class="attachment-item"
                  @click="viewAttachment(attachment)"
                >
                  <div class="attachment-icon" :class="`file-${getFileTypeClass(attachment.mimeType)}`">
                    <v-icon size="20" color="white">{{ getFileIcon(attachment.mimeType) }}</v-icon>
                  </div>
                  <div class="attachment-info">
                    <div class="attachment-name">{{ attachment.originalName }}</div>
                    <div class="attachment-size">{{ formatFileSize(attachment.size) }}</div>
                  </div>
                  <v-icon size="20" color="primary">mdi-open-in-new</v-icon>
                </div>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Estado vazio -->
    <div v-else class="empty-state pa-12 text-center">
      <div class="empty-icon mb-4">
        <v-icon size="64" color="grey-lighten-1">mdi-clock-outline</v-icon>
      </div>
      <h3 class="text-h6 font-weight-medium mb-2">Nenhuma etapa concluída</h3>
      <p class="text-body-2 text-medium-emphasis mb-0">
        As decisões e ações registradas aparecerão aqui
      </p>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import AttachmentPreviewModal from './AttachmentPreviewModal.vue';

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

const showPreview = ref(false);
const selectedAttachment = ref(null);

const completedExecutions = computed(() =>
  (props.history || [])
    .filter(e => e.status === 'COMPLETED')
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
);

function formatDateTime(date) {
  if (!date) return 'Data não informada';
  return dayjs(date).format('DD/MM/YYYY [às] HH:mm');
}

function isApprovalStep(execution) {
  return execution.step?.type === 'APPROVAL';
}

function getExecutionColor(execution) {
  return execution.action === 'reprovar' ? 'error' : 'success';
}

function getExecutionIcon(execution) {
  return execution.action === 'reprovar' ? 'mdi-close' : 'mdi-check';
}

function getStepTypeText(type) {
  const map = {
    INPUT: 'Entrada de Dados',
    APPROVAL: 'Aprovação',
    UPLOAD: 'Upload de Arquivos',
    REVIEW: 'Revisão',
    SIGNATURE: 'Assinatura',
    TASK: 'Tarefa',
  };
  return map[type] || type || 'Não informado';
}

function getActionColor(action) {
  const actionLower = action?.toLowerCase() || '';
  if (actionLower.includes('aprov') || actionLower.includes('aceitar')) return 'success';
  if (actionLower.includes('reprov') || actionLower.includes('rejeitar') || actionLower.includes('recusar')) return 'error';
  return 'primary';
}

function getActionIcon(action) {
  const actionLower = action?.toLowerCase() || '';
  if (actionLower.includes('aprov') || actionLower.includes('aceitar')) return 'mdi-check-circle';
  if (actionLower.includes('reprov') || actionLower.includes('rejeitar') || actionLower.includes('recusar')) return 'mdi-close-circle';
  if (actionLower.includes('devolver')) return 'mdi-arrow-u-left-top';
  if (actionLower.includes('enviar')) return 'mdi-send';
  return 'mdi-checkbox-marked-circle';
}

function getStatusClass(execution) {
  const actionLower = execution.action?.toLowerCase() || '';
  if (actionLower.includes('aprov') || actionLower.includes('aceitar')) {
    return 'status-success';
  }
  if (actionLower.includes('reprov') || actionLower.includes('rejeitar') || actionLower.includes('recusar')) {
    return 'status-error';
  }
  return 'status-default';
}

function getActionType(action) {
  const actionLower = action?.toLowerCase() || '';
  if (actionLower.includes('aprov') || actionLower.includes('aceitar')) {
    return 'approved';
  }
  if (actionLower.includes('reprov') || actionLower.includes('rejeitar') || actionLower.includes('recusar')) {
    return 'rejected';
  }
  return 'default';
}

function getFileTypeClass(mimeType) {
  if (mimeType?.includes('pdf')) return 'pdf';
  if (mimeType?.includes('image')) return 'image';
  if (mimeType?.includes('word')) return 'word';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'excel';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'zip';
  return 'default';
}

function getFileIcon(mimeType) {
  if (mimeType?.includes('pdf')) return 'mdi-file-pdf-box';
  if (mimeType?.includes('image')) return 'mdi-file-image';
  if (mimeType?.includes('word')) return 'mdi-file-word';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'mdi-file-excel';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'mdi-folder-zip';
  return 'mdi-file-document';
}

function getFileTypeColor(mimeType) {
  if (mimeType?.includes('pdf')) return 'error';
  if (mimeType?.includes('image')) return 'info';
  if (mimeType?.includes('word')) return 'primary';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'success';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'warning';
  return 'grey';
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function viewAttachment(attachment) {
  selectedAttachment.value = attachment;
  showPreview.value = true;
}
</script>

<style scoped>
/* Card Principal */
.history-card {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Cabeçalho */
.history-header {
  background: white;
}

/* Conteúdo com scroll */
.history-content {
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
}

.history-content::-webkit-scrollbar {
  width: 6px;
}

.history-content::-webkit-scrollbar-track {
  background: transparent;
}

.history-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.2);
  border-radius: 3px;
}

.history-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.4);
}

/* Expansion Panel */
.history-panel {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: 12px !important;
  overflow: hidden;
  background: white;
  transition: all 0.2s ease;
}

.history-panel:hover {
  border-color: rgba(var(--v-theme-primary), 0.2) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.history-panel :deep(.v-expansion-panel-title) {
  padding: 18px 20px;
  min-height: 72px;
}

.history-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 20px 20px;
}

/* Indicador de Status */
.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16px;
  transition: all 0.2s ease;
}

.status-success {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
}

.status-error {
  background: linear-gradient(135deg, #f44336, #ef5350);
}

.status-default {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.8));
}

/* Informações da Etapa */
.step-info {
  flex: 1;
  min-width: 0;
}

.step-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 4px;
  line-height: 1.4;
}

.step-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.813rem;
  color: rgba(0, 0, 0, 0.6);
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.detail-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 300;
}

/* Conteúdo do Painel */
.panel-content {
  background: rgba(0, 0, 0, 0.02);
}

/* Badge de Ação/Decisão */
.action-badge {
  display: inline-flex;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
}

.badge-approved {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.badge-rejected {
  background: linear-gradient(135deg, #f44336, #ef5350);
  color: white;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.badge-default {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.8));
  color: white;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

.badge-label {
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Info Row */
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.info-label {
  font-size: 0.813rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  min-width: 120px;
}

.info-value {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
}

/* Caixa de Comentário */
.comment-box {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
}

.comment-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 0.813rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.comment-text {
  font-size: 0.938rem;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.87);
  white-space: pre-wrap;
}

/* Anexos */
.attachments-section {
  background: white;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.attachments-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 0.813rem;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.attachments-count {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.4);
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
  transform: translateX(4px);
}

.attachment-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-pdf { background: #f44336; }
.file-image { background: #2196f3; }
.file-word { background: #1976d2; }
.file-excel { background: #4caf50; }
.file-zip { background: #ff9800; }
.file-default { background: #757575; }

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 2px;
}

/* Estado Vazio */
.empty-state {
  background: linear-gradient(to bottom, rgba(var(--v-theme-primary), 0.02), transparent);
}

.empty-icon {
  opacity: 0.6;
}

/* Responsive */
@media (max-width: 768px) {
  .history-content {
    max-height: 500px;
  }

  .step-details {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .history-content {
    max-height: 400px;
  }

  .status-indicator {
    width: 36px;
    height: 36px;
    margin-right: 12px;
  }

  .step-name {
    font-size: 0.938rem;
  }
}
</style>
