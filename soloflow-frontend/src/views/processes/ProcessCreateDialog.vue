<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2">
            mdi-file-document-multiple-outline
          </v-icon>
          <div>
            <div class="text-h6">
              {{ selectedProcessType ? 'Criar Processo' : 'Criar Novo Processo' }}
            </div>
            <div v-if="selectedProcessType" class="text-caption text-success">
              ✓ Tipo: {{ selectedProcessType.name }}
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <!-- Indicador de tipo pré-selecionado -->
      <v-alert
        v-if="selectedProcessType"
        type="success"
        variant="tonal"
        class="ma-4 mb-0"
        density="compact"
      >
        <v-icon start>mdi-lightning-bolt</v-icon>
        <strong>Criação Rápida Ativada:</strong> 
        Tipo "{{ selectedProcessType.name }}" já selecionado
      </v-alert>

      <v-stepper 
        v-model="currentStep" 
        :items="stepperItems"
        class="elevation-0"
      >
        <!-- Step 1: Seleção do Tipo (apenas se não foi pré-selecionado) -->
        <v-stepper-window-item :value="1" v-if="!selectedProcessType">
          <v-card-text>
            <h3 class="text-h6 mb-4">Selecione o tipo de processo</h3>
            
            <v-text-field
              v-model="searchType"
              label="Buscar tipo de processo"
              prepend-inner-icon="mdi-magnify"
              clearable
              class="mb-4"
            />

            <v-list lines="two">
              <v-list-item
                v-for="processType in filteredProcessTypes"
                :key="processType.id"
                @click="selectProcessType(processType)"
                :active="selectedProcessTypeId === processType.id"
                class="rounded mb-2"
                border
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="40">
                    <v-icon>mdi-file-document-multiple-outline</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ processType.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ processType.description }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-radio
                    :model-value="selectedProcessTypeId"
                    :value="processType.id"
                    @click.stop="selectProcessType(processType)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              :disabled="!selectedProcessTypeId"
              @click="nextStep"
            >
              Próximo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <!-- Step 2: Campos do Formulário (se existirem, agora vem primeiro) -->
        <v-stepper-window-item :value="selectedProcessType ? 1 : 2" v-if="hasFormFields">
          <v-card-text>
            <!-- Resumo do tipo selecionado -->
            <div v-if="getProcessType()" class="mb-4">
              <v-card variant="outlined" color="primary">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-3">mdi-information</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium">
                        {{ getProcessType().name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ getProcessType().description }}
                      </div>
                    </div>
                    <v-btn
                      v-if="!selectedProcessType"
                      variant="text"
                      size="small"
                      @click="goBackToTypeSelection"
                    >
                      <v-icon start>mdi-pencil</v-icon>
                      Alterar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <h3 class="text-h6 mb-4">Dados do Processo</h3>
            
            <v-form ref="dynamicForm" v-model="formValid">
              <v-row>
                <v-col
                  v-for="field in getVisibleFormFields(getProcessType())"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >
                  <!-- ✨ Campo de Texto -->
                  <v-text-field
                    v-if="field.type === 'TEXT'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo Numérico -->
                  <v-text-field
                    v-else-if="field.type === 'NUMBER'"
                    v-model.number="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    type="number"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de Data -->
                  <v-text-field
                    v-else-if="field.type === 'DATE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    type="date"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de Email -->
                  <v-text-field
                    v-else-if="field.type === 'EMAIL'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || 'email@exemplo.com'"
                    type="email"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de CPF -->
                  <v-text-field
                    v-else-if="field.type === 'CPF'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '000.000.000-00'"
                    v-mask="'###.###.###-##'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de CNPJ -->
                  <v-text-field
                    v-else-if="field.type === 'CNPJ'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '00.000.000/0000-00'"
                    v-mask="'##.###.###/####-##'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de Telefone -->
                  <v-text-field
                    v-else-if="field.type === 'PHONE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '(00) 00000-0000'"
                    v-mask="['(##) ####-####', '(##) #####-####']"
                    maxlength="15"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-phone"
                  />

                  <!-- ✨ Campo de Moeda -->
                  <v-text-field
                    v-else-if="field.type === 'CURRENCY'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    prefix="R$"
                    type="number"
                    step="0.01"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Dropdown -->
                  <v-select
                    v-else-if="field.type === 'DROPDOWN'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :items="getFieldOptions(field)"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Checkbox -->
                  <div v-else-if="field.type === 'CHECKBOX'">
                    <p class="text-subtitle-2 mb-2">{{ field.label }}</p>
                    <div class="border rounded pa-3">
                      <v-checkbox
                        v-for="option in getFieldOptions(field)"
                        :key="option.value"
                        v-model="formData[field.name]"
                        :label="option.label"
                        :value="option.value"
                        multiple
                        hide-details
                        density="compact"
                      />
                    </div>
                    <p v-if="field.helpText" class="text-caption text-grey mt-1">
                      {{ field.helpText }}
                    </p>
                  </div>

                  <!-- ✨ Textarea -->
                  <v-textarea
                    v-else-if="field.type === 'TEXTAREA'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    rows="3"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                  />

                  <!-- ✨ Campo de Arquivo -->
                  <div v-else-if="field.type === 'FILE'" class="file-field mb-3">
                    <p class="text-subtitle-2 mb-3 d-flex align-center">
                      <v-icon color="primary" size="20" class="mr-2">mdi-paperclip</v-icon>
                      {{ field.label }}
                      <span v-if="field.required" class="text-error ml-1">*</span>
                    </p>
                    
                    <v-card variant="outlined" class="pa-3">
                      <!-- Área de upload -->
                      <div class="d-flex align-center justify-space-between mb-3">
                        <div>
                          <v-btn
                            size="small"
                            color="primary"
                            variant="tonal"
                            @click="openFileDialog(field)"
                          >
                            <v-icon start>mdi-upload</v-icon>
                            Selecionar Arquivos
                          </v-btn>
                          <input
                            :ref="`fileInput_${field.name}`"
                            type="file"
                            style="display: none"
                            :multiple="!field.validations?.maxFiles || field.validations.maxFiles > 1"
                            :accept="getFileAcceptTypes(field)"
                            @change="handleFileSelect($event, field)"
                          />
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ getFileHelpText(field) }}
                        </div>
                      </div>

                      <!-- Lista de arquivos selecionados -->
                      <div v-if="getFieldFiles(field).length > 0">
                        <v-list density="compact" class="pa-0">
                          <v-list-item
                            v-for="(file, index) in getFieldFiles(field)"
                            :key="index"
                            class="px-0"
                          >
                            <template v-slot:prepend>
                              <v-icon :color="getFileIconColor(file)">
                                {{ getFileIcon(file.type) }}
                              </v-icon>
                            </template>

                            <v-list-item-title class="text-body-2">
                              {{ file.name }}
                            </v-list-item-title>
                            
                            <v-list-item-subtitle class="text-caption">
                              {{ formatFileSize(file.size) }}
                            </v-list-item-subtitle>

                            <template v-slot:append>
                              <v-btn
                                icon="mdi-delete"
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="removeFile(field, index)"
                              />
                            </template>
                          </v-list-item>
                        </v-list>
                      </div>

                      <!-- Estado vazio -->
                      <div v-else class="text-center py-4">
                        <v-icon size="48" color="grey-lighten-2">mdi-cloud-upload</v-icon>
                        <p class="text-body-2 text-medium-emphasis mt-2">
                          Nenhum arquivo selecionado
                        </p>
                        <p class="text-caption text-medium-emphasis">
                          {{ field.placeholder || 'Clique em "Selecionar Arquivos" para adicionar' }}
                        </p>
                      </div>
                    </v-card>
                    
                    <p v-if="field.helpText" class="text-caption text-grey mt-2">
                      <v-icon size="16" class="mr-1">mdi-information</v-icon>
                      {{ field.helpText }}
                    </p>
                  </div>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn 
              v-if="!selectedProcessType" 
              variant="text" 
              @click="previousStep"
            >
              <v-icon start>mdi-arrow-left</v-icon>
              Voltar
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="nextStep"
              variant="elevated"
            >
              <v-icon start>mdi-arrow-right</v-icon>
              Próximo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>

        <!-- Step 3: Observações (ex-informações básicas, agora por último) -->
        <v-stepper-window-item :value="selectedProcessType ? (hasFormFields ? 2 : 1) : (hasFormFields ? 3 : 2)">
          <v-card-text>
            <!-- Resumo do tipo selecionado (se não foi mostrado antes) -->
            <div v-if="!hasFormFields && getProcessType()" class="mb-4">
              <v-card variant="outlined" color="primary">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-3">mdi-information</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-subtitle-1 font-weight-medium">
                        {{ getProcessType().name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ getProcessType().description }}
                      </div>
                      <div class="mt-1">
                        <v-chip size="x-small" class="mr-1" variant="tonal">
                          {{ getProcessType().steps?.length || 0 }} etapas
                        </v-chip>
                      </div>
                    </div>
                    <v-btn
                      v-if="!selectedProcessType"
                      variant="text"
                      size="small"
                      @click="goBackToTypeSelection"
                    >
                      <v-icon start>mdi-pencil</v-icon>
                      Alterar
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <h3 class="text-h6 mb-4">Observações Adicionais</h3>
            
            <v-row>
              <v-col cols="12">
                <!-- ✨ Título gerado automaticamente, não editável -->
                <v-alert 
                  type="info" 
                  variant="tonal" 
                  class="mb-4"
                >
                  <v-icon start>mdi-auto-fix</v-icon>
                  <strong>Título será gerado automaticamente:</strong><br>
                  {{ generateProcessTitle() }}
                </v-alert>
                
                <!-- ✨ Campo de observações (ex-descrição) -->
                <v-textarea
                  v-model="processData.observations"
                  label="Observações sobre este processo"
                  rows="4"
                  counter="1000"
                  :rules="[v => !v || v.length <= 1000 || 'Máximo 1000 caracteres']"
                  variant="outlined"
                  placeholder="Adicione informações adicionais, contexto ou observações específicas sobre este processo..."
                  hint="Campo opcional para informações complementares"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <!-- Preview do que será criado -->
            <v-alert
              type="success"
              variant="tonal"
              class="mt-4"
            >
              <v-icon start>mdi-check-circle</v-icon>
              <strong>Pronto para criar!</strong> 
              {{ hasFormFields ? 'Dados preenchidos e' : '' }} Processo será iniciado automaticamente.
            </v-alert>
          </v-card-text>

          <v-card-actions>
            <v-btn 
              variant="text" 
              @click="previousStep"
              v-if="hasFormFields || !selectedProcessType"
            >
              <v-icon start>mdi-arrow-left</v-icon>
              Voltar
            </v-btn>
            
            <v-btn
              variant="text"
              @click="close"
              v-if="!hasFormFields && selectedProcessType"
            >
              Cancelar
            </v-btn>
            
            <v-spacer />
            <v-btn variant="text" @click="close">Cancelar</v-btn>
            <v-btn
              color="primary"
              @click="createProcess"
              :loading="creating"
              variant="elevated"
            >
              <v-icon start>mdi-rocket-launch</v-icon>
              Criar Processo
            </v-btn>
          </v-card-actions>
        </v-stepper-window-item>
      </v-stepper>

      <!-- Loading overlay -->
      <v-overlay
        :model-value="creating"
        contained
        class="align-center justify-center"
      >
        <div class="text-center">
          <v-progress-circular
            indeterminate
            size="64"
            color="primary"
          />
          <p class="text-h6 mt-4">Criando processo...</p>
          <p class="text-body-2 text-medium-emphasis">
            {{ selectedProcessType ? `Tipo: ${selectedProcessType.name}` : 'Aguarde...' }}
          </p>
        </div>
      </v-overlay>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'

const props = defineProps({
  modelValue: Boolean,
  selectedProcessType: Object // ✅ Tipo de processo pré-selecionado
})

const emit = defineEmits(['update:modelValue', 'created', 'close'])

const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()

// Estado
const currentStep = ref(1)
const creating = ref(false)
const formValid = ref(true)
const searchType = ref('')
const selectedProcessTypeId = ref(null)

const dynamicForm = ref(null)
const processData = ref({
  observations: '' // ✨ Mudança: description virou observations
})
const formData = ref({})
const fileData = ref({}) // ✨ Dados dos arquivos por campo

// Computed
const processTypes = computed(() => processTypeStore.processTypes)

const filteredProcessTypes = computed(() => {
  if (!searchType.value) return processTypes.value.filter(pt => pt.isActive)
  
  const search = searchType.value.toLowerCase()
  return processTypes.value.filter(pt => 
    pt.isActive &&
    (pt.name.toLowerCase().includes(search) ||
    pt.description?.toLowerCase().includes(search))
  )
})

const stepperItems = computed(() => {
  const items = []
  
  if (!props.selectedProcessType) {
    items.push('Tipo de Processo')
  }
  
  if (hasFormFields.value) {
    items.push('Dados do Processo')
  }
  
  items.push('Observações')
  
  return items
})

const hasFormFields = computed(() => {
  const processType = getProcessType()
  return getVisibleFieldsCount(processType) > 0
})

// ✨ Métodos auxiliares aprimorados
function getVisibleFormFields(processType) {
  if (!processType?.formFields) {
    return []
  }
  // ✨ Incluir TODOS os campos, incluindo FILE
  return processType.formFields
}

function getVisibleFieldsCount(processType) {
  return getVisibleFormFields(processType).length
}

function getProcessType() {
  if (props.selectedProcessType) return props.selectedProcessType
  return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
      return 12
    case 'CHECKBOX':
      return 12
    case 'FILE':
      return 12 // ✨ Campos de arquivo ocupam largura total
    default:
      return { cols: 12, md: 6 }
  }
}

function getFieldOptions(field) {
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options || '[]')
    return options.map(opt => ({
      title: opt.label || opt.value,
      value: opt.value,
      label: opt.label || opt.value
    }))
  } catch {
    return []
  }
}

function getFieldRules(field) {
  const rules = []
  
  // Regra de obrigatoriedade
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      if (field.type === 'FILE') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }

  // Validações específicas por tipo
  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
    case 'PHONE':
      // Aceita formato com máscara (XX) XXXXX-XXXX ou apenas números (10-11 dígitos)
      rules.push(v => {
        if (!v) return true
        const digits = v.replace(/\D/g, '')
        return (digits.length >= 10 && digits.length <= 11) || 'Telefone deve ter 10 ou 11 dígitos'
      })
      break
    case 'FILE':
      if (field.validations?.minFiles) {
        rules.push(v => !v || v.length >= field.validations.minFiles || 
          `Mínimo ${field.validations.minFiles} arquivo(s)`)
      }
      if (field.validations?.maxFiles) {
        rules.push(v => !v || v.length <= field.validations.maxFiles || 
          `Máximo ${field.validations.maxFiles} arquivo(s)`)
      }
      break
  }

  // Validações customizadas
  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? 
        field.validations : JSON.parse(field.validations)
      
      if (validations.minLength && field.type !== 'FILE') {
        rules.push(v => !v || v.length >= validations.minLength || 
          validations.customMessage || `Mínimo ${validations.minLength} caracteres`)
      }
      
      if (validations.maxLength && field.type !== 'FILE') {
        rules.push(v => !v || v.length <= validations.maxLength || 
          validations.customMessage || `Máximo ${validations.maxLength} caracteres`)
      }
      
      if (validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || 
          validations.customMessage || `Valor mínimo: ${validations.min}`)
      }
      
      if (validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || 
          validations.customMessage || `Valor máximo: ${validations.max}`)
      }
      
      if (validations.pattern) {
        rules.push(v => !v || new RegExp(validations.pattern).test(v) || 
          validations.customMessage || 'Formato inválido')
      }
    } catch (e) {
    }
  }

  return rules
}


// ✨ Método para gerar título automaticamente
function generateProcessTitle() {
  const processType = getProcessType()
  if (!processType) return 'Novo Processo'
  
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  return `${processType.name} - ${dateStr} ${timeStr}`
}

// ✨ Funções para manipulação de arquivos
function openFileDialog(field) {
  const input = document.querySelector(`input[ref="fileInput_${field.name}"]`)
  if (input) {
    input.click()
  }
}

function handleFileSelect(event, field) {
  const files = Array.from(event.target.files)
  
  if (!fileData.value[field.name]) {
    fileData.value[field.name] = []
  }
  
  // Validar cada arquivo
  for (const file of files) {
    if (validateFile(file, field)) {
      // Adicionar arquivo à lista
      fileData.value[field.name].push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0
      })
    }
  }
  
  // Atualizar formData para validação
  formData.value[field.name] = fileData.value[field.name]
  
  // Limpar input
  event.target.value = ''
}

function removeFile(field, index) {
  if (fileData.value[field.name]) {
    fileData.value[field.name].splice(index, 1)
    formData.value[field.name] = fileData.value[field.name]
  }
}

function getFieldFiles(field) {
  return fileData.value[field.name] || []
}

function validateFile(file, field) {
  // Validar tamanho (padrão: 10MB)
  const maxSize = field.validations?.maxSize || 10 * 1024 * 1024
  if (file.size > maxSize) {
    window.showSnackbar?.(`Arquivo "${file.name}" muito grande (máx: ${formatFileSize(maxSize)})`, 'error')
    return false
  }
  
  // Validar tipo de arquivo
  const allowedTypes = getFileAcceptTypes(field)
  if (allowedTypes && allowedTypes !== '*') {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    const mimeType = file.type
    
    const isAllowed = allowedTypes.split(',').some(type => {
      type = type.trim()
      return type === mimeType || type === fileExtension || 
             (type.includes('/*') && mimeType.startsWith(type.replace('/*', '')))
    })
    
    if (!isAllowed) {
      window.showSnackbar?.(`Tipo de arquivo "${file.name}" não permitido`, 'error')
      return false
    }
  }
  
  // Validar quantidade máxima
  const maxFiles = field.validations?.maxFiles || 10
  const currentCount = getFieldFiles(field).length
  if (currentCount >= maxFiles) {
    window.showSnackbar?.(`Máximo ${maxFiles} arquivo(s) permitido(s)`, 'error')
    return false
  }
  
  return true
}

function getFileAcceptTypes(field) {
  // Se tem validação de tipos específicos
  if (field.validations?.allowedTypes) {
    return field.validations.allowedTypes.join(',')
  }
  
  // Tipos padrão baseados no placeholder ou configuração
  if (field.placeholder) {
    const placeholder = field.placeholder.toLowerCase()
    if (placeholder.includes('pdf')) return '.pdf'
    if (placeholder.includes('imagem')) return 'image/*'
    if (placeholder.includes('documento')) return '.pdf,.doc,.docx'
  }
  
  // Padrão: tipos mais comuns
  return '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt'
}

function getFileHelpText(field) {
  const maxSize = field.validations?.maxSize || 10 * 1024 * 1024
  const maxFiles = field.validations?.maxFiles || 10
  return `Máx: ${maxFiles} arquivo(s), ${formatFileSize(maxSize)} cada`
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'mdi-file'
  
  if (mimeType.includes('pdf')) return 'mdi-file-pdf-box'
  if (mimeType.includes('image')) return 'mdi-file-image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('text')) return 'mdi-file-document'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'mdi-folder-zip'
  
  return 'mdi-file'
}

function getFileIconColor(file) {
  if (file.type.includes('pdf')) return 'red'
  if (file.type.includes('image')) return 'blue'
  if (file.type.includes('word')) return 'indigo'
  if (file.type.includes('excel')) return 'green'
  return 'grey'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Métodos de navegação
function nextStep() {
  currentStep.value++
}

function previousStep() {
  currentStep.value--
}

function goBackToTypeSelection() {
  currentStep.value = 1
}

// Métodos principais
function selectProcessType(processType) {
  selectedProcessTypeId.value = processType.id
  initializeFormData(processType)
}

function initializeFormData(processType) {
  formData.value = {}
  fileData.value = {} // ✨ Resetar dados de arquivos
  
  // Definir valores padrão dos campos
  if (processType?.formFields) {
    // ✨ Inicializar todos os campos, incluindo FILE e TABLE
    getVisibleFormFields(processType).forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      } else if (field.type === 'FILE') {
        formData.value[field.name] = []
        fileData.value[field.name] = []
      } else if (field.type === 'TABLE') {
        // Criar novo array único para cada tabela para evitar compartilhamento de referências
        formData.value[field.name] = []
      }
    })
  }
}

async function createProcess() {
  if (hasFormFields.value && !formValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true
  try {
    const processType = getProcessType()
    
    if (!processType) {
      throw new Error('Tipo de processo não selecionado')
    }

    // ✨ Preparar dados do formulário incluindo arquivos
    const processFormData = { ...formData.value }
    
    // Converter dados de arquivo para o formato esperado pelo backend
    Object.keys(fileData.value).forEach(fieldName => {
      if (fileData.value[fieldName]?.length > 0) {
        processFormData[fieldName] = fileData.value[fieldName].map(fileItem => ({
          name: fileItem.name,
          size: fileItem.size,
          type: fileItem.type,
          // Note: O arquivo real (fileItem.file) será enviado separadamente
          file: fileItem.file
        }))
      }
    })

    const data = {
      processTypeId: processType.id,
      title: generateProcessTitle(), // ✨ Título gerado automaticamente
      description: processData.value.observations?.trim() || null, // ✨ Observações como descrição
      formData: hasFormFields.value ? processFormData : undefined
    }


    const created = await processStore.createProcess(data)
    
    
    emit('created', created)
    close()
  } catch (error) {
    window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}

function close() {
  emit('close')
  emit('update:modelValue', false)
  
  // Reset state
  currentStep.value = 1
  selectedProcessTypeId.value = null
  processData.value = { observations: '' }
  formData.value = {}
  fileData.value = {} // ✨ Resetar dados de arquivo
  searchType.value = ''
}

// Watchers
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Carregar tipos de processo se necessário
    if (processTypes.value.length === 0) {
      processTypeStore.fetchProcessTypes()
    }
    
    // ✅ LÓGICA PRINCIPAL: Se há um tipo pré-selecionado
    if (props.selectedProcessType) {
      selectedProcessTypeId.value = props.selectedProcessType.id
      initializeFormData(props.selectedProcessType)
      
      // ✨ Definir etapa inicial baseada na existência de campos
      if (hasFormFields.value) {
        currentStep.value = 1 // Vai para campos do formulário
      } else {
        currentStep.value = 1 // Vai direto para observações
      }
    } else {
      currentStep.value = 1 // Começa na seleção de tipo
    }
  }
})

watch(() => props.selectedProcessType, (newProcessType) => {
  if (newProcessType) {
    selectedProcessTypeId.value = newProcessType.id
    initializeFormData(newProcessType)
  }
})
</script>

<style scoped>
.v-stepper {
  box-shadow: none;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rounded {
  border-radius: 4px;
}

.pa-3 {
  padding: 12px;
}

/* Animações suaves */
.v-stepper-window-item {
  transition: all 0.3s ease;
}

/* Melhorias visuais para campos */
.v-text-field,
.v-textarea,
.v-select {
  margin-bottom: 8px;
}
</style>