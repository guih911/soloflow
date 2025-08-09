<template>
  <div class="create-process-page">
    <!-- Background com gradiente moderno -->
    <div class="page-background">
      <div class="gradient-overlay"></div>
      <div class="geometric-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>

    <!-- Container principal -->
    <v-container fluid class="pa-0">
      <!-- Header moderno -->
      <div class="modern-header">
        <v-container>
          <div class="d-flex align-center">
            <v-btn
              icon
              variant="text"
              class="header-back-btn"
              @click="goBack"
            >
              <v-icon size="24">mdi-arrow-left</v-icon>
            </v-btn>
            
            <div class="header-content ml-4">
              <h1 class="header-title">
                Criar Novo Processo
              </h1>
              <p class="header-subtitle">
                {{ processType ? processType.name : 'Carregando...' }}
              </p>
            </div>

            <!-- Progress indicator -->
            <v-spacer />
            <div class="progress-indicator">
              <div class="progress-steps">
                <div class="step active">
                  <v-icon>mdi-file-document-edit</v-icon>
                  <span>Informações</span>
                </div>
                <div class="step-connector"></div>
                <div class="step" :class="{ active: hasFormFields }">
                  <v-icon>mdi-form-textbox</v-icon>
                  <span>Formulário</span>
                </div>
                <div class="step-connector"></div>
                <div class="step">
                  <v-icon>mdi-rocket-launch</v-icon>
                  <span>Finalizar</span>
                </div>
              </div>
            </div>
          </div>
        </v-container>
      </div>

      <!-- Conteúdo principal -->
      <v-container class="main-content">
        <v-row justify="center">
          <v-col cols="12" lg="10" xl="8">
            <!-- Card do tipo de processo selecionado -->
            <div class="process-type-card" v-if="processType">
              <div class="card-glow"></div>
              <v-card class="glass-card elevation-12">
                <div class="card-header">
                  <div class="type-icon">
                    <v-icon size="32" color="primary">mdi-file-document-multiple</v-icon>
                  </div>
                  <div class="type-info">
                    <h3 class="type-name">{{ processType.name }}</h3>
                    <p class="type-description">{{ processType.description }}</p>
                    <div class="type-badges">
                      <v-chip size="small" variant="tonal" color="primary">
                        <v-icon start size="16">mdi-debug-step-over</v-icon>
                        {{ processType.steps?.length || 0 }} etapas
                      </v-chip>
                      <v-chip 
                        v-if="processType.formFields?.length > 0" 
                        size="small" 
                        variant="tonal" 
                        color="info"
                      >
                        <v-icon start size="16">mdi-form-textbox</v-icon>
                        {{ processType.formFields.length }} campos
                      </v-chip>
                    </div>
                  </div>
                  <div class="type-status">
                    <v-chip color="success" variant="flat" size="small">
                      <v-icon start size="16">mdi-check-circle</v-icon>
                      Selecionado
                    </v-chip>
                  </div>
                </div>
              </v-card>
            </div>

            <!-- Formulário principal -->
            <div class="form-container">
              <v-form ref="mainForm" v-model="formValid" @submit.prevent="createProcess">
                <v-row>
                  <!-- Seção: Informações Básicas -->
                  <v-col cols="12">
                    <div class="form-section">
                      <div class="section-header">
                        <div class="section-icon">
                          <v-icon size="24" color="primary">mdi-information-outline</v-icon>
                        </div>
                        <div class="section-title">
                          <h2>Informações Básicas</h2>
                          <p>Configure os dados principais do seu processo</p>
                        </div>
                      </div>

                      <div class="section-content">
                        <v-row>
                          <v-col cols="12">
                            <div class="modern-field">
                              <label class="field-label">
                                <v-icon class="field-icon">mdi-format-title</v-icon>
                                Título do Processo
                              </label>
                              <v-text-field
                                v-model="processData.title"
                                :placeholder="`Ex: ${processType?.name} - ${new Date().toLocaleDateString()}`"
                                variant="outlined"
                                density="comfortable"
                                class="modern-input"
                                :rules="titleRules"
                                hide-details="auto"
                              />
                              <div class="field-help">
                                Deixe vazio para usar o nome do tipo automaticamente
                              </div>
                            </div>
                          </v-col>

                          <v-col cols="12">
                            <div class="modern-field">
                              <label class="field-label">
                                <v-icon class="field-icon">mdi-text-long</v-icon>
                                Descrição
                                <span class="field-optional">(opcional)</span>
                              </label>
                              <v-textarea
                                v-model="processData.description"
                                placeholder="Descreva o objetivo ou contexto deste processo..."
                                variant="outlined"
                                rows="4"
                                counter="500"
                                class="modern-input"
                                :rules="descriptionRules"
                                hide-details="auto"
                              />
                            </div>
                          </v-col>
                        </v-row>
                      </div>
                    </div>
                  </v-col>

                  <!-- Seção: Formulário Específico (se houver) -->
                  <v-col cols="12" v-if="hasFormFields">
                    <div class="form-section">
                      <div class="section-header">
                        <div class="section-icon">
                          <v-icon size="24" color="secondary">mdi-form-textbox</v-icon>
                        </div>
                        <div class="section-title">
                          <h2>Dados Específicos</h2>
                          <p>Preencha as informações específicas para este tipo de processo</p>
                        </div>
                        <div class="section-badge">
                          <v-chip color="secondary" variant="tonal" size="small">
                            {{ processType?.formFields?.length }} campos
                          </v-chip>
                        </div>
                      </div>

                      <div class="section-content">
                        <v-row>
                          <v-col
                            v-for="field in processType?.formFields"
                            :key="field.id"
                            :cols="getFieldCols(field)"
                          >
                            <div class="modern-field">
                              <!-- Campo de Texto -->
                              <template v-if="field.type === 'TEXT'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-format-text</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-text-field
                                  v-model="formData[field.name]"
                                  :placeholder="field.placeholder"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Campo Numérico -->
                              <template v-else-if="field.type === 'NUMBER'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-numeric</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-text-field
                                  v-model.number="formData[field.name]"
                                  :placeholder="field.placeholder"
                                  type="number"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Campo de Data -->
                              <template v-else-if="field.type === 'DATE'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-calendar</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-text-field
                                  v-model="formData[field.name]"
                                  type="date"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Campo de Email -->
                              <template v-else-if="field.type === 'EMAIL'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-email</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-text-field
                                  v-model="formData[field.name]"
                                  :placeholder="field.placeholder || 'email@exemplo.com'"
                                  type="email"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Campo de Moeda -->
                              <template v-else-if="field.type === 'CURRENCY'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-currency-brl</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-text-field
                                  v-model="formData[field.name]"
                                  :placeholder="field.placeholder"
                                  prefix="R$"
                                  type="number"
                                  step="0.01"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Dropdown -->
                              <template v-else-if="field.type === 'DROPDOWN'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-menu-down</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-select
                                  v-model="formData[field.name]"
                                  :items="getFieldOptions(field)"
                                  variant="outlined"
                                  density="comfortable"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Textarea -->
                              <template v-else-if="field.type === 'TEXTAREA'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-text-long</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <v-textarea
                                  v-model="formData[field.name]"
                                  :placeholder="field.placeholder"
                                  rows="4"
                                  variant="outlined"
                                  class="modern-input"
                                  :rules="getFieldRules(field)"
                                  hide-details="auto"
                                />
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>

                              <!-- Checkbox -->
                              <template v-else-if="field.type === 'CHECKBOX'">
                                <label class="field-label">
                                  <v-icon class="field-icon">mdi-checkbox-marked</v-icon>
                                  {{ field.label }}
                                  <span v-if="field.required" class="field-required">*</span>
                                </label>
                                <div class="checkbox-group">
                                  <v-checkbox
                                    v-for="option in getFieldOptions(field)"
                                    :key="option.value"
                                    v-model="formData[field.name]"
                                    :label="option.label"
                                    :value="option.value"
                                    multiple
                                    color="primary"
                                    density="comfortable"
                                    hide-details
                                  />
                                </div>
                                <div v-if="field.helpText" class="field-help">
                                  {{ field.helpText }}
                                </div>
                              </template>
                            </div>
                          </v-col>
                        </v-row>
                      </div>
                    </div>
                  </v-col>
                </v-row>

                <!-- Actions fixas no bottom -->
                <div class="floating-actions">
                  <v-card class="actions-card glass-card" elevation="12">
                    <v-card-text class="pa-4">
                      <div class="d-flex align-center justify-space-between">
                        <div class="action-info">
                          <div class="info-text">
                            <strong>{{ processType?.name }}</strong>
                          </div>
                          <div class="info-subtext">
                            {{ hasFormFields ? 'Formulário preenchido' : 'Pronto para criar' }}
                          </div>
                        </div>

                        <div class="action-buttons">
                          <v-btn
                            variant="outlined"
                            size="large"
                            class="mr-3"
                            @click="goBack"
                          >
                            <v-icon start>mdi-arrow-left</v-icon>
                            Voltar
                          </v-btn>
                          
                          <v-btn
                            color="primary"
                            variant="elevated"
                            size="large"
                            :loading="creating"
                            :disabled="!formValid"
                            @click="createProcess"
                            class="create-btn"
                          >
                            <v-icon start>mdi-rocket-launch</v-icon>
                            Criar Processo
                            <div class="btn-glow"></div>
                          </v-btn>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </v-form>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-container>

    <!-- Loading overlay -->
    <v-overlay
      :model-value="creating"
      class="align-center justify-center"
      persistent
    >
      <div class="loading-container">
        <div class="loading-animation">
          <v-progress-circular
            indeterminate
            size="64"
            width="6"
            color="primary"
          />
        </div>
        <h3 class="loading-title">Criando processo...</h3>
        <p class="loading-subtitle">{{ processType?.name }}</p>
        <div class="loading-steps">
          <div class="step-dot active"></div>
          <div class="step-dot active"></div>
          <div class="step-dot"></div>
        </div>
      </div>
    </v-overlay>

    <!-- Success notification -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      location="top right"
      :timeout="4000"
      elevation="6"
    >
      <div class="d-flex align-center">
        <v-icon start size="20">mdi-check-circle</v-icon>
        <div>
          <strong>Processo criado com sucesso!</strong>
          <br>
          <span class="text-caption">Redirecionando...</span>
        </div>
      </div>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const formValid = ref(false)
const creating = ref(false)
const showSuccess = ref(false)
const processType = ref(null)

const mainForm = ref(null)
const processData = ref({
  title: '',
  description: ''
})
const formData = ref({})

// Computed
const hasFormFields = computed(() => {
  return processType.value?.formFields?.length > 0
})

// Regras de validação
const titleRules = [
  v => !v || v.length <= 100 || 'Título deve ter no máximo 100 caracteres'
]

const descriptionRules = [
  v => !v || v.length <= 500 || 'Descrição deve ter no máximo 500 caracteres'
]

// Métodos auxiliares
function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
    case 'CHECKBOX':
      return 12
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldOptions(field) {
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]')
    return options.map(opt => ({
      title: opt.label || opt.value,
      value: opt.value
    }))
  } catch {
    return []
  }
}

function getFieldRules(field) {
  const rules = []
  
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }

  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'NUMBER':
    case 'CURRENCY':
      rules.push(v => !v || !isNaN(Number(v)) || 'Deve ser um número válido')
      break
  }

  return rules
}

function initializeFormData() {
  formData.value = {}
  
  if (processType.value?.formFields) {
    processType.value.formFields.forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
}

// Métodos principais
function goBack() {
  router.push('/processes')
}

async function createProcess() {
  if (!formValid.value || !processType.value) return

  creating.value = true
  try {
    const data = {
      processTypeId: processType.value.id,
      title: processData.value.title?.trim() || null,
      description: processData.value.description?.trim() || null,
      formData: hasFormFields.value ? formData.value : undefined
    }

    const created = await processStore.createProcess(data)
    
    showSuccess.value = true
    
    // Aguardar um pouco antes de redirecionar
    setTimeout(() => {
      const firstStep = created.stepExecutions?.find(se => se.status === 'IN_PROGRESS')
      
      if (firstStep) {
        router.push(`/processes/${created.id}/execute/${firstStep.id}`)
      } else {
        router.push(`/processes/${created.id}`)
      }
    }, 2000)

  } catch (error) {
    console.error('Error creating process:', error)
    // Implementar tratamento de erro
  } finally {
    creating.value = false
  }
}

// Lifecycle
onMounted(async () => {
  const processTypeId = route.query.type
  
  if (!processTypeId) {
    router.push('/processes')
    return
  }

  try {
    processType.value = await processTypeStore.fetchProcessType(processTypeId)
    initializeFormData()
  } catch (error) {
    console.error('Error loading process type:', error)
    router.push('/processes')
  }
})
</script>

<style scoped>
.create-process-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Background moderno */
.page-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(25, 118, 210, 0.03) 0%, 
    rgba(156, 39, 176, 0.02) 50%, 
    rgba(233, 30, 99, 0.03) 100%);
}

.geometric-shapes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(156, 39, 176, 0.1));
  animation: float 20s infinite ease-in-out;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  right: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  left: 5%;
  animation-delay: 7s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  top: 60%;
  right: 20%;
  animation-delay: 14s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(20px) rotate(240deg); }
}

/* Header moderno */
.modern-header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 24px 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-back-btn {
  background: rgba(25, 118, 210, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.header-back-btn:hover {
  background: rgba(25, 118, 210, 0.2);
  transform: translateX(-2px);
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  background: linear-gradient(135deg, #1976d2, #9c27b0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  font-size: 1rem;
  color: #666;
  margin: 4px 0 0 0;
  font-weight: 500;
}

/* Progress indicator */
.progress-indicator {
  display: flex;
  align-items: center;
}

.progress-steps {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  opacity: 0.5;
}

.step.active {
  opacity: 1;
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.step span {
  font-size: 0.75rem;
  font-weight: 600;
}

.step-connector {
  width: 24px;
  height: 2px;
  background: #e0e0e0;
  border-radius: 1px;
}

/* Main content */
.main-content {
  padding: 40px 24px 120px;
}

/* Glass card effect */
.glass-card {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px !important;
}

/* Process type card */
.process-type-card {
  position: relative;
  margin-bottom: 40px;
}

.card-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #1976d2, #9c27b0);
  border-radius: 22px;
  opacity: 0.1;
  z-index: -1;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 24px;
  gap: 16px;
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(156, 39, 176, 0.1));
  border-radius: 16px;
  flex-shrink: 0;
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.type-description {
  color: #666;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.type-badges {
  display: flex;
  gap: 8px;
}

.type-status {
  display: flex;
  align-items: center;
}

/* Form sections */
.form-section {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 24px;
  background: rgba(25, 118, 210, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  gap: 16px;
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(25, 118, 210, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
}

.section-title {
  flex: 1;
}

.section-title h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.section-title p {
  color: #666;
  margin: 0;
  font-size: 0.875rem;
}

.section-badge {
  display: flex;
  align-items: center;
}

.section-content {
  padding: 32px 24px;
}

/* Modern fields */
.modern-field {
  margin-bottom: 24px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.field-icon {
  color: #1976d2;
}

.field-required {
  color: #f44336;
}

.field-optional {
  color: #999;
  font-weight: 400;
  font-size: 0.75rem;
}

.field-help {
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
  margin-left: 4px;
}

.modern-input :deep(.v-field) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.modern-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.checkbox-group {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
}

/* Floating actions */
.floating-actions {
  position: fixed;
  bottom: 24px;
  left: 24px;
  right: 24px;
  z-index: 50;
}

.actions-card {
  max-width: 1200px;
  margin: 0 auto;
}

.action-info {
  display: flex;
  flex-direction: column;
}

.info-text {
  font-size: 1rem;
  color: #1a1a1a;
}

.info-subtext {
  font-size: 0.875rem;
  color: #666;
}

.action-buttons {
  display: flex;
  align-items: center;
}

.create-btn {
  position: relative;
  overflow: hidden;
  font-weight: 600;
  text-transform: none;
}

.btn-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.create-btn:hover .btn-glow {
  left: 100%;
}

/* Loading overlay */
.loading-container {
  text-align: center;
  color: white;
}

.loading-animation {
  margin-bottom: 24px;
}

.loading-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.loading-subtitle {
  font-size: 1rem;
  opacity: 0.8;
  margin: 0 0 24px 0;
}

.loading-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: pulse 1.5s infinite ease-in-out;
}

.step-dot.active {
  background: white;
}

.step-dot:nth-child(2) {
  animation-delay: 0.3s;
}

.step-dot:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* Responsive */
@media (max-width: 768px) {
  .header-title {
    font-size: 1.5rem;
  }
  
  .progress-indicator {
    display: none;
  }
  
  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .section-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .floating-actions {
    left: 16px;
    right: 16px;
    bottom: 16px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  
  .action-buttons .v-btn {
    width: 100%;
  }
}
</style>