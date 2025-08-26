<template>
  <div class="process-flow-visualizer">
    <div class="flow-header mb-6">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar color="primary" size="48" class="mr-4">
            <v-icon size="24">mdi-share</v-icon>
          </v-avatar>
          <div>
            <h2 class="text-h5 font-weight-bold">{{ processTitle }}</h2>
            <p class="text-subtitle-1 text-medium-emphasis">
              {{ processDescription || 'Visualização do fluxo de processo' }}
            </p>
          </div>
        </div>
        
        <div class="d-flex align-center gap-2">
          <v-btn-toggle v-model="viewMode" mandatory color="primary" variant="outlined">
            <v-btn value="flow" size="small">
              <v-icon start>mdi-share</v-icon>
              Fluxo
            </v-btn>
            <v-btn value="swimlanes" size="small">
              <v-icon start>mdi-view-column</v-icon>
              Raias
            </v-btn>
          </v-btn-toggle>
          
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-dots-vertical"
                variant="text"
                size="small"
              />
            </template>
            
            <v-list>
              <v-list-item @click="exportImage">
                <template #prepend>
                  <v-icon>mdi-download</v-icon>
                </template>
                <v-list-item-title>Exportar Imagem</v-list-item-title>
              </v-list-item>
              
              <v-list-item @click="exportData">
                <template #prepend>
                  <v-icon>mdi-code-json</v-icon>
                </template>
                <v-list-item-title>Exportar JSON</v-list-item-title>
              </v-list-item>
              
              <v-divider />
              
              <v-list-item @click="resetZoom">
                <template #prepend>
                  <v-icon>mdi-fit-to-screen</v-icon>
                </template>
                <v-list-item-title>Ajustar à Tela</v-list-item-title>
              </v-list-item>
              
              <v-list-item @click="centerFlow">
                <template #prepend>
                  <v-icon>mdi-crosshairs</v-icon>
                </template>
                <v-list-item-title>Centralizar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>

    <!-- Flow Controls -->
    <div class="flow-controls mb-4">
      <v-card variant="outlined" class="pa-2">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-btn
              icon="mdi-minus"
              variant="text"
              size="small"
              @click="zoomOut"
              :disabled="zoomLevel <= 0.2"
            />
            <div class="zoom-display">{{ Math.round(zoomLevel * 100) }}%</div>
            <v-btn
              icon="mdi-plus"
              variant="text"
              size="small"
              @click="zoomIn"
              :disabled="zoomLevel >= 2"
            />
          </div>
          
          <div class="d-flex align-center gap-2">
            <v-switch
              v-model="showTransitionLabels"
              label="Mostrar Condições"
              density="compact"
              color="primary"
              hide-details
            />
            
            <v-switch
              v-model="showStepDetails"
              label="Detalhes das Etapas"
              density="compact"
              color="primary"
              hide-details
            />
            
            <v-switch
              v-model="highlightCriticalPath"
              label="Caminho Crítico"
              density="compact"
              color="warning"
              hide-details
            />
          </div>
        </div>
      </v-card>
    </div>

    <!-- Flow Container -->
    <div class="flow-container" ref="flowContainer">
      <div 
        class="flow-canvas"
        ref="flowCanvas"
        :style="{ 
          transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
          transformOrigin: 'top left'
        }"
        @mousedown="startPan"
        @mousemove="handlePan"
        @mouseup="endPan"
        @wheel="handleWheel"
      >
        <!-- Grid Background -->
        <svg class="flow-grid" :width="canvasWidth" :height="canvasHeight">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <!-- Connection Lines -->
        <svg class="flow-connections" :width="canvasWidth" :height="canvasHeight">
          <defs>
            <!-- Arrow markers -->
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="rgb(var(--v-theme-primary))"
              />
            </marker>
            
            <marker
              id="arrowhead-success"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="rgb(var(--v-theme-success))"
              />
            </marker>
            
            <marker
              id="arrowhead-warning"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="rgb(var(--v-theme-warning))"
              />
            </marker>
            
            <marker
              id="arrowhead-error"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="rgb(var(--v-theme-error))"
              />
            </marker>
          </defs>
          
          <!-- Transition connections -->
          <g v-for="connection in connections" :key="connection.id">
            <path
              :d="connection.path"
              :stroke="getConnectionColor(connection)"
              :stroke-width="getConnectionWidth(connection)"
              :stroke-dasharray="getConnectionDashArray(connection)"
              :marker-end="`url(#${getConnectionMarker(connection)})`"
              fill="none"
              class="connection-line"
              :class="{
                'connection-critical': highlightCriticalPath && connection.isCritical,
                'connection-highlighted': connection.isHighlighted
              }"
              @click="selectConnection(connection)"
            />
            
            <!-- Transition label -->
            <g v-if="showTransitionLabels && connection.label">
              <rect
                :x="connection.labelX - connection.labelWidth / 2"
                :y="connection.labelY - 10"
                :width="connection.labelWidth"
                height="20"
                rx="10"
                :fill="getConnectionColor(connection)"
                fill-opacity="0.1"
                :stroke="getConnectionColor(connection)"
                stroke-width="1"
              />
              <text
                :x="connection.labelX"
                :y="connection.labelY + 3"
                text-anchor="middle"
                font-size="11"
                :fill="getConnectionColor(connection)"
                class="connection-label"
              >
                {{ connection.label }}
              </text>
            </g>
          </g>
        </svg>

        <!-- Process Steps -->
        <div
          v-for="step in positionedSteps"
          :key="step.id"
          class="flow-step"
          :class="{
            'step-selected': selectedStepId === step.id,
            'step-critical': highlightCriticalPath && step.isCritical,
            'step-completed': step.status === 'completed',
            'step-in-progress': step.status === 'in_progress',
            'step-pending': step.status === 'pending'
          }"
          :style="{
            left: step.x + 'px',
            top: step.y + 'px'
          }"
          @click="selectStep(step)"
        >
          <v-card
            class="step-card elevation-4"
            :color="getStepColor(step)"
            :variant="step.status === 'pending' ? 'outlined' : 'elevated'"
            width="200"
            min-height="100"
          >
            <v-card-text class="step-content pa-3">
              <!-- Step header -->
              <div class="d-flex align-center mb-2">
                <v-avatar
                  :color="getStepTypeColor(step.type)"
                  size="32"
                  class="step-avatar mr-2"
                >
                  <span class="text-caption font-weight-bold">{{ step.order }}</span>
                </v-avatar>
                
                <div class="step-info flex-grow-1">
                  <div class="step-name text-subtitle-2 font-weight-bold">
                    {{ step.name }}
                  </div>
                  <v-chip
                    size="x-small"
                    :color="getStepTypeColor(step.type)"
                    variant="tonal"
                  >
                    {{ getStepTypeText(step.type) }}
                  </v-chip>
                </div>
              </div>

              <!-- Step details (if enabled) -->
              <div v-if="showStepDetails" class="step-details">
                <!-- Responsible -->
                <div class="step-detail-item">
                  <v-icon size="14" class="mr-1">mdi-account</v-icon>
                  <span class="text-caption">{{ getStepResponsible(step) }}</span>
                </div>
                
                <!-- SLA -->
                <div v-if="step.slaHours" class="step-detail-item">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  <span class="text-caption">{{ formatSLA(step.slaHours) }}</span>
                </div>
                
                <!-- Conditions count -->
                <div v-if="getStepConditionsCount(step) > 0" class="step-detail-item">
                  <v-icon size="14" class="mr-1">mdi-code-braces</v-icon>
                  <span class="text-caption">{{ getStepConditionsCount(step) }} condição(ões)</span>
                </div>
              </div>

              <!-- Status indicator -->
              <div class="step-status mt-2">
                <v-progress-linear
                  v-if="step.status === 'in_progress'"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <div class="d-flex align-center justify-space-between">
                  <v-chip
                    size="x-small"
                    :color="getStepStatusColor(step.status)"
                    variant="tonal"
                  >
                    {{ getStepStatusText(step.status) }}
                  </v-chip>
                  
                  <div v-if="step.executionTime" class="text-caption text-medium-emphasis">
                    {{ step.executionTime }}
                  </div>
                </div>
              </div>
            </v-card-text>

            <!-- Step actions menu -->
            <div class="step-actions">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-dots-horizontal"
                    variant="text"
                    size="x-small"
                    class="step-menu-btn"
                  />
                </template>
                
                <v-list density="compact">
                  <v-list-item @click="viewStepDetails(step)">
                    <template #prepend>
                      <v-icon size="16">mdi-eye</v-icon>
                    </template>
                    <v-list-item-title>Detalhes</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    v-if="step.status === 'in_progress'"
                    @click="executeStep(step)"
                  >
                    <template #prepend>
                      <v-icon size="16">mdi-play</v-icon>
                    </template>
                    <v-list-item-title>Executar</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item @click="highlightStepPath(step)">
                    <template #prepend>
                      <v-icon size="16">mdi-map-marker-path</v-icon>
                    </template>
                    <v-list-item-title>Destacar Caminho</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-card>
        </div>

        <!-- Start/End nodes -->
        <div class="flow-node start-node" :style="{ left: startNode.x + 'px', top: startNode.y + 'px' }">
          <v-card color="success" variant="tonal" class="node-card">
            <v-card-text class="text-center pa-3">
              <v-icon size="24" color="success">mdi-play-circle</v-icon>
              <div class="text-caption font-weight-bold mt-1">Início</div>
            </v-card-text>
          </v-card>
        </div>
        
        <div class="flow-node end-node" :style="{ left: endNode.x + 'px', top: endNode.y + 'px' }">
          <v-card color="info" variant="tonal" class="node-card">
            <v-card-text class="text-center pa-3">
              <v-icon size="24" color="info">mdi-flag-checkered</v-icon>
              <div class="text-caption font-weight-bold mt-1">Fim</div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Flow Statistics Panel -->
    <div class="flow-stats mt-4">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel title="Estatísticas do Fluxo">
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <div class="text-h4 font-weight-bold">{{ steps.length }}</div>
                    <div class="text-caption">Total de Etapas</div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <div class="text-h4 font-weight-bold">{{ completedStepsCount }}</div>
                    <div class="text-caption">Concluídas</div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <div class="text-h4 font-weight-bold">{{ transitionsCount }}</div>
                    <div class="text-caption">Transições</div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="info">
                  <v-card-text class="text-center">
                    <div class="text-h4 font-weight-bold">{{ averageExecutionTime }}</div>
                    <div class="text-caption">Tempo Médio</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <v-divider class="my-4" />
            
            <!-- Process Timeline -->
            <div class="timeline-section">
              <h4 class="text-subtitle-1 mb-3">Timeline do Processo</h4>
              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="step in timelineSteps"
                  :key="step.id"
                  :dot-color="getStepStatusColor(step.status)"
                  size="small"
                >
                  <div class="d-flex align-center">
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">{{ step.name }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ getStepResponsible(step) }}
                      </div>
                    </div>
                    <div class="text-caption text-right">
                      <div>{{ step.executionTime || 'Pendente' }}</div>
                      <v-chip
                        size="x-small"
                        :color="getStepStatusColor(step.status)"
                        variant="tonal"
                      >
                        {{ getStepStatusText(step.status) }}
                      </v-chip>
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Step Details Dialog -->
    <v-dialog v-model="stepDetailsDialog" max-width="800">
      <v-card v-if="selectedStep">
        <v-card-title class="d-flex align-center">
          <v-avatar
            :color="getStepTypeColor(selectedStep.type)"
            size="40"
            class="mr-3"
          >
            <span class="text-body-2 font-weight-bold">{{ selectedStep.order }}</span>
          </v-avatar>
          <div>
            <div class="text-h6">{{ selectedStep.name }}</div>
            <v-chip
              size="small"
              :color="getStepStatusColor(selectedStep.status)"
              variant="tonal"
            >
              {{ getStepStatusText(selectedStep.status) }}
            </v-chip>
          </div>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-2">Informações Gerais</h4>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-shape</v-icon>
                  </template>
                  <v-list-item-title>Tipo</v-list-item-title>
                  <v-list-item-subtitle>{{ getStepTypeText(selectedStep.type) }}</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>Responsável</v-list-item-title>
                  <v-list-item-subtitle>{{ getStepResponsible(selectedStep) }}</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item v-if="selectedStep.slaHours">
                  <template #prepend>
                    <v-icon>mdi-clock-outline</v-icon>
                  </template>
                  <v-list-item-title>SLA</v-list-item-title>
                  <v-list-item-subtitle>{{ formatSLA(selectedStep.slaHours) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-2">Configurações</h4>
              <div class="step-config-chips">
                <v-chip
                  v-if="selectedStep.allowAttachment"
                  size="small"
                  color="info"
                  variant="tonal"
                  class="mr-1 mb-1"
                >
                  <v-icon start size="16">mdi-paperclip</v-icon>
                  Permite Anexos
                </v-chip>
                
                <v-chip
                  v-if="selectedStep.requiresSignature"
                  size="small"
                  color="warning"
                  variant="tonal"
                  class="mr-1 mb-1"
                >
                  <v-icon start size="16">mdi-draw-pen</v-icon>
                  Requer Assinatura
                </v-chip>
                
                <v-chip
                  v-if="selectedStep.requireAttachment"
                  size="small"
                  color="error"
                  variant="tonal"
                  class="mr-1 mb-1"
                >
                  <v-icon start size="16">mdi-attachment</v-icon>
                  Anexo Obrigatório
                </v-chip>
              </div>
            </v-col>
          </v-row>
          
          <div v-if="selectedStep.instructions" class="mt-4">
            <h4 class="text-subtitle-1 mb-2">Instruções</h4>
            <v-card variant="tonal" color="info">
              <v-card-text class="text-body-2">
                {{ selectedStep.instructions }}
              </v-card-text>
            </v-card>
          </div>
          
          <div v-if="getStepTransitions(selectedStep).length > 0" class="mt-4">
            <h4 class="text-subtitle-1 mb-2">Transições Configuradas</h4>
            <v-list density="compact">
              <v-list-item
                v-for="transition in getStepTransitions(selectedStep)"
                :key="transition.id"
              >
                <template #prepend>
                  <v-icon :color="getTransitionTypeColor(transition.conditionType)">
                    {{ getTransitionTypeIcon(transition.conditionType) }}
                  </v-icon>
                </template>
                <v-list-item-title>{{ transition.name || 'Transição' }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ getTransitionDescription(transition) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="stepDetailsDialog = false">
            Fechar
          </v-btn>
          <v-btn
            v-if="selectedStep.status === 'in_progress'"
            color="primary"
            variant="elevated"
            @click="executeStep(selectedStep)"
          >
            Executar Etapa
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  processType: {
    type: Object,
    required: true
  },
  processInstance: {
    type: Object,
    default: null
  },
  steps: {
    type: Array,
    default: () => []
  },
  transitions: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'step-selected', 
  'step-executed', 
  'connection-selected',
  'flow-exported'
])

// State
const viewMode = ref('flow')
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)
const showTransitionLabels = ref(true)
const showStepDetails = ref(true)
const highlightCriticalPath = ref(false)
const selectedStepId = ref(null)
const selectedConnectionId = ref(null)
const stepDetailsDialog = ref(false)

// Canvas and interaction
const flowContainer = ref(null)
const flowCanvas = ref(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(800)
const isPanning = ref(false)
const lastPanX = ref(0)
const lastPanY = ref(0)

// Computed
const processTitle = computed(() => props.processType?.name || 'Fluxo do Processo')
const processDescription = computed(() => props.processType?.description)

const selectedStep = computed(() => {
  return props.steps.find(step => step.id === selectedStepId.value)
})

const completedStepsCount = computed(() => {
  return props.steps.filter(step => step.status === 'completed').length
})

const transitionsCount = computed(() => props.transitions.length)

const averageExecutionTime = computed(() => {
  const completedSteps = props.steps.filter(step => step.executionTime)
  if (completedSteps.length === 0) return 'N/A'
  
  const totalMinutes = completedSteps.reduce((sum, step) => {
    const match = step.executionTime?.match(/(\d+)/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)
  
  return Math.round(totalMinutes / completedSteps.length) + 'min'
})

const timelineSteps = computed(() => {
  return [...props.steps].sort((a, b) => a.order - b.order)
})

// Layout calculation
const positionedSteps = computed(() => {
  if (props.steps.length === 0) return []

  const stepSpacingX = 300
  const stepSpacingY = 150
  const startX = 100
  const startY = 150

  return props.steps.map((step, index) => {
    // Simple left-to-right layout (can be enhanced with proper graph layout algorithms)
    const row = Math.floor(index / 4)
    const col = index % 4
    
    return {
      ...step,
      x: startX + col * stepSpacingX,
      y: startY + row * stepSpacingY,
      isCritical: highlightCriticalPath.value && isStepInCriticalPath(step)
    }
  })
})

const startNode = computed(() => ({
  x: 20,
  y: 150
}))

const endNode = computed(() => {
  const maxX = Math.max(...positionedSteps.value.map(s => s.x))
  return {
    x: maxX + 250,
    y: 150
  }
})

const connections = computed(() => {
  const connections = []
  
  props.transitions.forEach(transition => {
    const sourceStep = positionedSteps.value.find(s => s.id === transition.sourceStepId)
    const targetStep = transition.targetStepId ? 
      positionedSteps.value.find(s => s.id === transition.targetStepId) : 
      endNode.value
    
    if (sourceStep && targetStep) {
      const connection = createConnection(sourceStep, targetStep, transition)
      connections.push(connection)
    }
  })
  
  // Add start connection
  if (positionedSteps.value.length > 0) {
    const firstStep = positionedSteps.value.find(s => s.order === 1)
    if (firstStep) {
      connections.push(createConnection(startNode.value, firstStep, { 
        name: 'Início', 
        conditionType: 'ALWAYS' 
      }))
    }
  }
  
  return connections
})

// Watch for data changes
watch(() => props.steps, () => {
  // Recalculate positions when steps change
  selectedStepId.value = null
  selectedConnectionId.value = null
}, { deep: true })

watch(() => props.transitions, () => {
  // Update connections when transitions change
  selectedConnectionId.value = null
}, { deep: true })
</script>

<style scoped>
.process-flow-visualizer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  overflow: hidden;
}

.flow-header {
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.flow-controls {
  padding: 0 24px;
}

.zoom-display {
  min-width: 50px;
  text-align: center;
  font-weight: 500;
  font-size: 0.875rem;
}

.flow-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
  margin: 0 24px 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.flow-container:active {
  cursor: grabbing;
}

.flow-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.1s ease;
}

.flow-grid {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}

.flow-connections {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

.connection-line {
  pointer-events: stroke;
  stroke-linecap: round;
  transition: all 0.3s ease;
  cursor: pointer;
}

.connection-line:hover {
  stroke-width: 3;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.connection-critical {
  stroke-width: 3;
  filter: drop-shadow(0 2px 6px rgba(255, 152, 0, 0.4));
}

.connection-highlighted {
  stroke-width: 4;
  filter: drop-shadow(0 2px 8px rgba(25, 118, 210, 0.5));
}

.connection-label {
  font-family: 'Roboto', sans-serif;
  font-weight: 500;
  pointer-events: none;
}

.flow-step {
  position: absolute;
  z-index: 10;
  cursor: pointer;
  transition: all 0.3s ease;
}

.flow-step:hover {
  transform: translateY(-4px);
  z-index: 15;
}

.step-card {
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.step-selected .step-card {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
}

.step-critical .step-card {
  border-color: rgb(var(--v-theme-warning));
  box-shadow: 0 6px 24px rgba(255, 152, 0, 0.3);
}

.step-completed .step-card {
  background: rgba(76, 175, 80, 0.04);
}

.step-in-progress .step-card {
  background: rgba(25, 118, 210, 0.04);
  animation: pulse 2s infinite;
}

.step-pending .step-card {
  opacity: 0.7;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(25, 118, 210, 0);
  }
}

.step-content {
  position: relative;
}

.step-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid white;
}

.step-info {
  min-width: 0;
}

.step-name {
  word-break: break-word;
  line-height: 1.2;
}

.step-details {
  margin-top: 8px;
}

.step-detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.step-status {
  margin-top: 12px;
}

.step-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.flow-step:hover .step-actions {
  opacity: 1;
}

.step-menu-btn {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.flow-node {
  position: absolute;
  z-index: 5;
}

.node-card {
  border-radius: 50px;
  min-width: 80px;
  border: 2px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.flow-stats {
  background: white;
  margin: 0 24px 24px;
  border-radius: 12px;
}

.timeline-section {
  max-height: 300px;
  overflow-y: auto;
}

.step-config-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .flow-header {
    padding: 16px;
  }
  
  .flow-controls {
    padding: 0 16px;
  }
  
  .flow-container {
    margin: 0 16px 16px;
  }
  
  .flow-stats {
    margin: 0 16px 16px;
  }
  
  .step-card {
    width: 160px !important;
    min-height: 80px !important;
  }
  
  .step-content {
    padding: 8px !important;
  }
  
  .step-name {
    font-size: 0.8rem;
  }
}

/* Custom scrollbar */
.timeline-section::-webkit-scrollbar {
  width: 4px;
}

.timeline-section::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
}

.timeline-section::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.timeline-section::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Gap utilities */
.gap-2 {
  gap: 8px;
}
</style>

// Methods
function createConnection(source, target, transition) {
  const sourceX = source.x + (source.id ? 200 : 50) // Step width or node width
  const sourceY = source.y + (source.id ? 50 : 25)  // Half height
  const targetX = target.x
  const targetY = target.y + (target.id ? 50 : 25)
  
  // Create curved path
  const midX = (sourceX + targetX) / 2
  const path = `M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${targetX} ${targetY}`
  
  const labelX = midX
  const labelY = (sourceY + targetY) / 2
  const label = getTransitionLabel(transition)
  
  return {
    id: transition.id || `${source.id}-${target.id}`,
    path,
    sourceId: source.id,
    targetId: target.id,
    labelX,
    labelY,
    label,
    labelWidth: label ? label.length * 6 + 10 : 0,
    transition,
    isCritical: highlightCriticalPath.value && isTransitionInCriticalPath(transition),
    isHighlighted: selectedConnectionId.value === (transition.id || `${source.id}-${target.id}`)
  }