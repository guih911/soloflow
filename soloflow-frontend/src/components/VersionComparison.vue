<template>
  <div class="version-comparison">
    <div v-if="!version1 || !version2" class="empty-state">
      <v-alert type="info" variant="tonal">
        <v-icon start>mdi-information</v-icon>
        Selecione duas versões para comparar
      </v-alert>
    </div>

    <div v-else class="comparison-content">
      <!-- Cabeçalho da comparação -->
      <div class="comparison-header mb-6">
        <v-row>
          <v-col cols="6" class="text-center">
            <v-card variant="tonal" color="primary">
              <v-card-text>
                <h3 class="text-h6 mb-2">{{ version1.versionLabel || `v${version1.version}.0` }}</h3>
                <v-chip size="small" :color="getVersionStatusColor(version1)">
                  {{ version1.isDraft ? 'Rascunho' : 'Publicado' }}
                </v-chip>
                <div class="text-caption mt-2">{{ formatDate(version1.createdAt) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="6" class="text-center">
            <v-card variant="tonal" color="secondary">
              <v-card-text>
                <h3 class="text-h6 mb-2">{{ version2.versionLabel || `v${version2.version}.0` }}</h3>
                <v-chip size="small" :color="getVersionStatusColor(version2)">
                  {{ version2.isDraft ? 'Rascunho' : 'Publicado' }}
                </v-chip>
                <div class="text-caption mt-2">{{ formatDate(version2.createdAt) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Resumo das diferenças -->
      <div class="differences-summary mb-6">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon start color="info">mdi-chart-line</v-icon>
            Resumo das Diferenças
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3">
                <div class="stat-item text-center">
                  <v-icon size="32" color="primary">mdi-debug-step-over</v-icon>
                  <div class="text-h6 mt-2">{{ comparison.steps.total }}</div>
                  <div class="text-caption">Etapas Alteradas</div>
                </div>
              </v-col>
              
              <v-col cols="12" md="3">
                <div class="stat-item text-center">
                  <v-icon size="32" color="success">mdi-plus-circle</v-icon>
                  <div class="text-h6 mt-2">{{ comparison.steps.added }}</div>
                  <div class="text-caption">Etapas Adicionadas</div>
                </div>
              </v-col>
              
              <v-col cols="12" md="3">
                <div class="stat-item text-center">
                  <v-icon size="32" color="warning">mdi-pencil-circle</v-icon>
                  <div class="text-h6 mt-2">{{ comparison.steps.modified }}</div>
                  <div class="text-caption">Etapas Modificadas</div>
                </div>
              </v-col>
              
              <v-col cols="12" md="3">
                <div class="stat-item text-center">
                  <v-icon size="32" color="error">mdi-minus-circle</v-icon>
                  <div class="text-h6 mt-2">{{ comparison.steps.removed }}</div>
                  <div class="text-caption">Etapas Removidas</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </div>

      <!-- Abas de comparação -->
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="basic">Informações Básicas</v-tab>
        <v-tab value="steps">Etapas ({{ comparison.steps.total }})</v-tab>
        <v-tab value="fields">Campos ({{ comparison.fields.total }})</v-tab>
        <v-tab value="metadata">Metadados</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- Aba: Informações Básicas -->
        <v-window-item value="basic">
          <v-card variant="outlined">
            <v-card-text>
              <div class="comparison-table">
                <v-table>
                  <thead>
                    <tr>
                      <th class="text-left">Propriedade</th>
                      <th class="text-center">{{ version1.versionLabel }}</th>
                      <th class="text-center">{{ version2.versionLabel }}</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="font-weight-medium">Descrição</td>
                      <td class="text-center">{{ version1.description || '-' }}</td>
                      <td class="text-center">{{ version2.description || '-' }}</td>
                      <td class="text-center">
                        <v-chip
                          size="small"
                          :color="version1.description !== version2.description ? 'warning' : 'success'"
                        >
                          {{ version1.description !== version2.description ? 'Alterado' : 'Igual' }}
                        </v-chip>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="font-weight-medium">Status</td>
                      <td class="text-center">
                        <v-chip size="small" :color="getVersionStatusColor(version1)">
                          {{ version1.isDraft ? 'Rascunho' : 'Publicado' }}
                        </v-chip>
                      </td>
                      <td class="text-center">
                        <v-chip size="small" :color="getVersionStatusColor(version2)">
                          {{ version2.isDraft ? 'Rascunho' : 'Publicado' }}
                        </v-chip>
                      </td>
                      <td class="text-center">
                        <v-chip
                          size="small"
                          :color="version1.isDraft !== version2.isDraft ? 'warning' : 'success'"
                        >
                          {{ version1.isDraft !== version2.isDraft ? 'Alterado' : 'Igual' }}
                        </v-chip>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="font-weight-medium">Data de Criação</td>
                      <td class="text-center">{{ formatDate(version1.createdAt) }}</td>
                      <td class="text-center">{{ formatDate(version2.createdAt) }}</td>
                      <td class="text-center">-</td>
                    </tr>
                    
                    <tr v-if="version1.publishedAt || version2.publishedAt">
                      <td class="font-weight-medium">Data de Publicação</td>
                      <td class="text-center">{{ version1.publishedAt ? formatDate(version1.publishedAt) : '-' }}</td>
                      <td class="text-center">{{ version2.publishedAt ? formatDate(version2.publishedAt) : '-' }}</td>
                      <td class="text-center">-</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- Aba: Etapas -->
        <v-window-item value="steps">
          <div class="steps-comparison">
            <div v-if="comparison.steps.changes.length === 0">
              <v-alert type="success" variant="tonal">
                <v-icon start>mdi-check-circle</v-icon>
                Nenhuma alteração nas etapas entre essas versões
              </v-alert>
            </div>
            
            <div v-else>
              <v-card
                v-for="change in comparison.steps.changes"
                :key="change.id"
                class="mb-3"
                variant="outlined"
                :color="getChangeTypeColor(change.type)"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <v-chip
                      size="small"
                      :color="getChangeTypeColor(change.type)"
                      variant="tonal"
                    >
                      <v-icon start size="16">{{ getChangeTypeIcon(change.type) }}</v-icon>
                      {{ getChangeTypeText(change.type) }}
                    </v-chip>
                    
                    <h4 class="text-subtitle-1 ml-3">
                      {{ change.name || `Etapa ${change.order}` }}
                    </h4>
                  </div>

                  <!-- Comparação lado a lado para modificações -->
                  <div v-if="change.type === 'modified'" class="change-details">
                    <v-row>
                      <v-col cols="6">
                        <v-card variant="tonal" color="primary" density="compact">
                          <v-card-title class="text-caption pa-2">{{ version1.versionLabel }}</v-card-title>
                          <v-card-text class="pa-2">
                            <div class="change-item">
                              <strong>Nome:</strong> {{ change.version1.name }}
                            </div>
                            <div v-if="change.version1.description" class="change-item">
                              <strong>Descrição:</strong> {{ change.version1.description }}
                            </div>
                            <div class="change-item">
                              <strong>Tipo:</strong> {{ change.version1.type }}
                            </div>
                            <div v-if="change.version1.slaHours" class="change-item">
                              <strong>SLA:</strong> {{ change.version1.slaHours }}h
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                      
                      <v-col cols="6">
                        <v-card variant="tonal" color="secondary" density="compact">
                          <v-card-title class="text-caption pa-2">{{ version2.versionLabel }}</v-card-title>
                          <v-card-text class="pa-2">
                            <div class="change-item">
                              <strong>Nome:</strong> {{ change.version2.name }}
                            </div>
                            <div v-if="change.version2.description" class="change-item">
                              <strong>Descrição:</strong> {{ change.version2.description }}
                            </div>
                            <div class="change-item">
                              <strong>Tipo:</strong> {{ change.version2.type }}
                            </div>
                            <div v-if="change.version2.slaHours" class="change-item">
                              <strong>SLA:</strong> {{ change.version2.slaHours }}h
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>

                  <!-- Detalhes para adições/remoções -->
                  <div v-else class="change-details">
                    <div class="change-item">
                      <strong>Nome:</strong> {{ change.name }}
                    </div>
                    <div v-if="change.description" class="change-item">
                      <strong>Descrição:</strong> {{ change.description }}
                    </div>
                    <div class="change-item">
                      <strong>Tipo:</strong> {{ change.type_step }}
                    </div>
                    <div v-if="change.slaHours" class="change-item">
                      <strong>SLA:</strong> {{ change.slaHours }}h
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-window-item>

        <!-- Aba: Campos -->
        <v-window-item value="fields">
          <div class="fields-comparison">
            <div v-if="comparison.fields.changes.length === 0">
              <v-alert type="success" variant="tonal">
                <v-icon start>mdi-check-circle</v-icon>
                Nenhuma alteração nos campos entre essas versões
              </v-alert>
            </div>
            
            <div v-else>
              <v-card
                v-for="change in comparison.fields.changes"
                :key="change.id"
                class="mb-3"
                variant="outlined"
                :color="getChangeTypeColor(change.type)"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <v-chip
                      size="small"
                      :color="getChangeTypeColor(change.type)"
                      variant="tonal"
                    >
                      <v-icon start size="16">{{ getChangeTypeIcon(change.type) }}</v-icon>
                      {{ getChangeTypeText(change.type) }}
                    </v-chip>
                    
                    <h4 class="text-subtitle-1 ml-3">
                      {{ change.label || change.name }}
                    </h4>
                    
                    <v-chip size="x-small" variant="outlined" class="ml-2">
                      {{ change.field_type }}
                    </v-chip>
                  </div>

                  <!-- Comparação para modificações -->
                  <div v-if="change.type === 'modified'" class="change-details">
                    <v-simple-table density="compact">
                      <template #default>
                        <thead>
                          <tr>
                            <th>Propriedade</th>
                            <th>{{ version1.versionLabel }}</th>
                            <th>{{ version2.versionLabel }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="prop in getChangedProperties(change)" :key="prop">
                            <td class="font-weight-medium">{{ prop }}</td>
                            <td>{{ change.version1[prop] || '-' }}</td>
                            <td>{{ change.version2[prop] || '-' }}</td>
                          </tr>
                        </tbody>
                      </template>
                    </v-simple-table>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-window-item>

        <!-- Aba: Metadados -->
        <v-window-item value="metadata">
          <v-card variant="outlined">
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <h4 class="text-subtitle-1 mb-3">{{ version1.versionLabel }}</h4>
                  <v-code class="metadata-display">
                    {{ JSON.stringify(version1.metadata || {}, null, 2) }}
                  </v-code>
                </v-col>
                
                <v-col cols="6">
                  <h4 class="text-subtitle-1 mb-3">{{ version2.versionLabel }}</h4>
                  <v-code class="metadata-display">
                    {{ JSON.stringify(version2.metadata || {}, null, 2) }}
                  </v-code>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  version1: {
    type: Object,
    default: null
  },
  version2: {
    type: Object,
    default: null
  }
})

// Estado
const activeTab = ref('basic')

// Computed
const comparison = computed(() => {
  if (!props.version1 || !props.version2) {
    return {
      steps: { total: 0, added: 0, modified: 0, removed: 0, changes: [] },
      fields: { total: 0, added: 0, modified: 0, removed: 0, changes: [] }
    }
  }

  return {
    steps: compareSteps(props.version1.steps || [], props.version2.steps || []),
    fields: compareFields(props.version1.formFields || [], props.version2.formFields || [])
  }
})

// Métodos auxiliares
function getVersionStatusColor(version) {
  if (version.isDraft) return 'orange'
  return 'success'
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function getChangeTypeColor(type) {
  const colors = {
    added: 'success',
    removed: 'error',
    modified: 'warning'
  }
  return colors[type] || 'default'
}

function getChangeTypeIcon(type) {
  const icons = {
    added: 'mdi-plus-circle',
    removed: 'mdi-minus-circle',
    modified: 'mdi-pencil-circle'
  }
  return icons[type] || 'mdi-help-circle'
}

function getChangeTypeText(type) {
  const texts = {
    added: 'Adicionado',
    removed: 'Removido',
    modified: 'Modificado'
  }
  return texts[type] || type
}

function getChangedProperties(change) {
  if (!change.version1 || !change.version2) return []
  
  const props1 = Object.keys(change.version1)
  const props2 = Object.keys(change.version2)
  const allProps = [...new Set([...props1, ...props2])]
  
  return allProps.filter(prop => 
    JSON.stringify(change.version1[prop]) !== JSON.stringify(change.version2[prop])
  )
}

// Métodos de comparação
function compareSteps(steps1, steps2) {
  const changes = []
  let added = 0, removed = 0, modified = 0

  // Criar mapas para comparação mais eficiente
  const stepsMap1 = new Map(steps1.map(step => [step.id || step.order, step]))
  const stepsMap2 = new Map(steps2.map(step => [step.id || step.order, step]))

  // Encontrar etapas adicionadas
  for (const [id, step] of stepsMap2) {
    if (!stepsMap1.has(id)) {
      changes.push({
        id: `added-${id}`,
        type: 'added',
        ...step,
        type_step: step.type
      })
      added++
    }
  }

  // Encontrar etapas removidas
  for (const [id, step] of stepsMap1) {
    if (!stepsMap2.has(id)) {
      changes.push({
        id: `removed-${id}`,
        type: 'removed',
        ...step,
        type_step: step.type
      })
      removed++
    }
  }

  // Encontrar etapas modificadas
  for (const [id, step1] of stepsMap1) {
    const step2 = stepsMap2.get(id)
    if (step2 && hasStepChanged(step1, step2)) {
      changes.push({
        id: `modified-${id}`,
        type: 'modified',
        name: step2.name,
        order: step2.order,
        version1: step1,
        version2: step2
      })
      modified++
    }
  }

  // Ordenar mudanças por ordem
  changes.sort((a, b) => (a.order || 0) - (b.order || 0))

  return {
    total: changes.length,
    added,
    removed,
    modified,
    changes
  }
}

function compareFields(fields1, fields2) {
  const changes = []
  let added = 0, removed = 0, modified = 0

  // Criar mapas para comparação
  const fieldsMap1 = new Map(fields1.map(field => [field.name, field]))
  const fieldsMap2 = new Map(fields2.map(field => [field.name, field]))

  // Encontrar campos adicionados
  for (const [name, field] of fieldsMap2) {
    if (!fieldsMap1.has(name)) {
      changes.push({
        id: `added-${name}`,
        type: 'added',
        ...field,
        field_type: field.type
      })
      added++
    }
  }

  // Encontrar campos removidos
  for (const [name, field] of fieldsMap1) {
    if (!fieldsMap2.has(name)) {
      changes.push({
        id: `removed-${name}`,
        type: 'removed',
        ...field,
        field_type: field.type
      })
      removed++
    }
  }

  // Encontrar campos modificados
  for (const [name, field1] of fieldsMap1) {
    const field2 = fieldsMap2.get(name)
    if (field2 && hasFieldChanged(field1, field2)) {
      changes.push({
        id: `modified-${name}`,
        type: 'modified',
        name: field2.name,
        label: field2.label,
        field_type: field2.type,
        version1: field1,
        version2: field2
      })
      modified++
    }
  }

  // Ordenar mudanças por ordem
  changes.sort((a, b) => (a.order || 0) - (b.order || 0))

  return {
    total: changes.length,
    added,
    removed,
    modified,
    changes
  }
}

function hasStepChanged(step1, step2) {
  const compareProps = [
    'name', 'description', 'instructions', 'type', 'slaHours',
    'allowAttachment', 'requiresSignature', 'requireAttachment',
    'minAttachments', 'maxAttachments', 'assignedToUserId', 'assignedToSectorId'
  ]

  return compareProps.some(prop => 
    JSON.stringify(step1[prop]) !== JSON.stringify(step2[prop])
  )
}

function hasFieldChanged(field1, field2) {
  const compareProps = [
    'label', 'type', 'placeholder', 'required', 'defaultValue',
    'helpText', 'options', 'validations'
  ]

  return compareProps.some(prop => 
    JSON.stringify(field1[prop]) !== JSON.stringify(field2[prop])
  )
}
</script>

<style scoped>
.version-comparison {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.comparison-header {
  margin-bottom: 24px;
}

.stat-item {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.5);
}

.comparison-table {
  width: 100%;
}

.change-details {
  margin-top: 12px;
  font-size: 0.875rem;
}

.change-item {
  margin-bottom: 8px;
  padding: 4px 0;
}

.metadata-display {
  background-color: rgba(var(--v-theme-surface), 0.5);
  padding: 16px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
}

.steps-comparison,
.fields-comparison {
  max-height: 600px;
  overflow-y: auto;
}
</style>