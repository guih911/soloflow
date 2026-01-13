<template>
  <div class="create-process-container">
    <div class="header-section mb-6">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-3" />
        <div class="flex-grow-1">
          <h1 class="text-h4 font-weight-bold mb-2">
            <v-icon size="32" class="mr-2" color="primary">
              {{ selectedProcessType ? 'mdi-rocket-launch' : 'mdi-file-document-plus' }}
            </v-icon>
            {{ selectedProcessType ? 'Iniciar Processo' : 'Criar Novo Processo' }}
          </h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            {{ selectedProcessType 
              ? 'Preencha as informações necessárias para iniciar o processo' 
              : 'Selecione o tipo de processo e preencha as informações necessárias'
            }}
          </p>
        </div>
      </div>
    </div>

    
    <div v-if="!selectedProcessType">
      
    </div>

   
    <div v-else>
      <v-card class="form-card" elevation="2">
       
        <div class="selected-process-header pa-6">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="56" class="mr-4">
              <v-icon size="28" color="white">mdi-file-document-multiple</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <h3 class="text-h5 font-weight-bold">{{ selectedProcessType.name }}</h3>
              <p v-if="selectedProcessType.description" class="text-body-1 text-medium-emphasis mt-1">
                {{ selectedProcessType.description }}
              </p>
            </div>
            
            <v-btn variant="text" size="small" @click="changeProcessType" v-if="!preselectedType">
              <v-icon start>mdi-pencil</v-icon>
              Trocar tipo
            </v-btn>
          </div>
        </div>

        <v-divider />

        <!-- ✅ FORMULÁRIO COM PROGRESSO DE UPLOAD -->
        <v-form ref="processForm" v-model="formValid">
          <div class="form-content pa-6">
            
            <!-- ✅ SEÇÃO: Campos do Formulário -->
            <div v-if="hasFormFields" class="form-section mb-6">
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="purple" class="mr-2">mdi-form-textbox</v-icon>
                Dados do Processo
              </h4>
              
              <v-row>
                <v-col
                  v-for="field in getVisibleFormFields(selectedProcessType)"
                  :key="field.id"
                  :cols="getFieldCols(field)"
                >

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
                    prepend-inner-icon="mdi-text"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'EMAIL'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-email"
                    class="mb-3"
                  />

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
                    prepend-inner-icon="mdi-numeric"
                    class="mb-3"
                  />

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
                    prepend-inner-icon="mdi-calendar"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CPF'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '000.000.000-00'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    v-mask="'###.###.###-##'"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-card-account-details"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CNPJ'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || '00.000.000/0000-00'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    v-mask="'##.###.###/####-##'"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-domain"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'PHONE'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder || 'Digite apenas números'"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    @blur="formatPhoneField(field.name)"
                    @input="onPhoneInput(field.name, $event)"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-phone"
                    class="mb-3"
                  />

                  <v-text-field
                    v-else-if="field.type === 'CURRENCY'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-currency-usd"
                    prefix="R$"
                    class="mb-3"
                  />

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
                    prepend-inner-icon="mdi-text-long"
                    class="mb-3"
                  />

                  <v-select
                    v-else-if="field.type === 'DROPDOWN'"
                    v-model="formData[field.name]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :required="field.required"
                    :rules="getFieldRules(field)"
                    :hint="field.helpText"
                    :items="field.options || []"
                    item-title="label"
                    item-value="value"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-form-dropdown"
                    class="mb-3"
                  />

                  <div v-else-if="field.type === 'CHECKBOX'" class="mb-4">
                    <label class="text-subtitle-2 mb-2 d-block font-weight-medium">
                      {{ field.label }}
                      <span v-if="field.required" class="text-error">*</span>
                    </label>
                    <v-checkbox
                      v-for="(option, idx) in (field.options || [])"
                      :key="idx"
                      v-model="formData[field.name]"
                      :label="option"
                      :value="option"
                      hide-details
                      density="compact"
                      class="mt-1"
                    />
                    <small v-if="field.helpText" class="text-caption text-medium-emphasis d-block mt-2">
                      {{ field.helpText }}
                    </small>
                  </div>

                  <!-- Campo de arquivo - Design Profissional -->
                  <div
                    v-else-if="field.type?.toString().toUpperCase() === 'FILE'"
                    class="file-upload-container mb-4"
                  >
                    <!-- Label do campo -->
                    <label class="file-upload-label mb-2 d-flex align-center">
                      <span class="text-body-1 font-weight-medium">{{ field.label }}</span>
                      <span v-if="field.required" class="text-error ml-1">*</span>
                    </label>

                    <!-- Área de Upload -->
                    <div
                      class="file-upload-area"
                      :class="{
                        'file-upload-area--dragover': dragStates[field.name],
                        'file-upload-area--has-file': fileInputs[field.name],
                        'file-upload-area--error': fileErrors[field.name]
                      }"
                      @dragover.prevent="dragStates[field.name] = true"
                      @dragleave.prevent="dragStates[field.name] = false"
                      @drop.prevent="handleFileDrop(field.name, $event, field)"
                      @click="triggerFileInput(field.name)"
                    >
                      <!-- Input escondido -->
                      <input
                        :ref="el => fileInputRefs[field.name] = el"
                        type="file"
                        :accept="getFileFieldConfig(field).allowedTypes.join(',')"
                        @change="handleFileInputChange(field.name, $event, field)"
                        class="file-input-hidden"
                      />

                      <!-- Estado: Sem arquivo -->
                      <div v-if="!fileInputs[field.name]" class="file-upload-empty">
                        <div class="file-upload-icon-wrapper">
                          <v-icon
                            size="48"
                            :color="dragStates[field.name] ? 'primary' : 'grey-lighten-1'"
                            class="file-upload-icon"
                          >
                            {{ dragStates[field.name] ? 'mdi-cloud-upload' : 'mdi-cloud-upload-outline' }}
                          </v-icon>
                        </div>

                        <div class="file-upload-text mt-3">
                          <p class="text-body-1 font-weight-medium mb-1">
                            {{ dragStates[field.name] ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar' }}
                          </p>
                          <p class="text-caption text-medium-emphasis">
                            {{ getFileFieldHint(field) }}
                          </p>
                        </div>

                        <v-btn
                          color="primary"
                          variant="tonal"
                          size="small"
                          class="mt-3"
                          @click.stop="triggerFileInput(field.name)"
                        >
                          <v-icon start size="18">mdi-folder-open</v-icon>
                          Escolher Arquivo
                        </v-btn>
                      </div>

                      <!-- Estado: Com arquivo selecionado -->
                      <div v-else class="file-upload-preview">
                        <div class="file-preview-card">
                          <!-- Ícone do tipo de arquivo -->
                          <div class="file-preview-icon">
                            <v-avatar
                              :color="getFileIconColor(fileInputs[field.name]?.name)"
                              size="56"
                              rounded="lg"
                            >
                              <v-icon size="28" color="white">
                                {{ getFileIcon(fileInputs[field.name]?.name) }}
                              </v-icon>
                            </v-avatar>
                          </div>

                          <!-- Informações do arquivo -->
                          <div class="file-preview-info">
                            <p class="file-preview-name text-body-1 font-weight-medium">
                              {{ fileInputs[field.name]?.name }}
                            </p>
                            <p class="file-preview-size text-caption text-medium-emphasis">
                              {{ formatFileSize(fileInputs[field.name]?.size) }}
                            </p>
                          </div>

                          <!-- Ações -->
                          <div class="file-preview-actions">
                            <v-btn
                              icon
                              size="small"
                              variant="text"
                              color="primary"
                              @click.stop="triggerFileInput(field.name)"
                            >
                              <v-icon size="20">mdi-pencil</v-icon>
                              <v-tooltip activator="parent" location="top">Trocar arquivo</v-tooltip>
                            </v-btn>
                            <v-btn
                              icon
                              size="small"
                              variant="text"
                              color="error"
                              @click.stop="removeFile(field.name)"
                            >
                              <v-icon size="20">mdi-delete</v-icon>
                              <v-tooltip activator="parent" location="top">Remover</v-tooltip>
                            </v-btn>
                          </div>
                        </div>

                        <!-- Indicador de sucesso -->
                        <div class="file-success-indicator">
                          <v-icon size="16" color="success" class="mr-1">mdi-check-circle</v-icon>
                          <span class="text-caption text-success">Arquivo selecionado</span>
                        </div>
                      </div>
                    </div>

                    <!-- Mensagem de erro -->
                    <div v-if="fileErrors[field.name]" class="file-upload-error mt-2">
                      <v-icon size="16" color="error" class="mr-1">mdi-alert-circle</v-icon>
                      <span class="text-caption text-error">{{ fileErrors[field.name] }}</span>
                    </div>

                    <!-- Hint do campo -->
                    <p v-if="field.helpText && !fileErrors[field.name]" class="text-caption text-medium-emphasis mt-2">
                      {{ field.helpText }}
                    </p>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Observações (mantido igual) -->
            <div class="form-section">
              <v-divider v-if="hasFormFields" class="mb-6" />
              
              <h4 class="text-h6 font-weight-medium mb-4 d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-note-text</v-icon>
                Observações Adicionais
              </h4>
              
              <v-row>
                <v-col cols="12">
                  <v-textarea
                    v-model="processData.observations"
                    label="Observações sobre este processo"
                    placeholder="Adicione informações adicionais, contexto ou observações específicas sobre este processo..."
                    rows="4"
                    counter="1000"
                    :rules="[v => !v || v.length <= 1000 || 'Máximo 1000 caracteres']"
                    variant="outlined"
                    prepend-inner-icon="mdi-note-text"
                    hint="Campo opcional para informações complementares"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </div>
          </div>
        </v-form>

        <v-divider />

        <!-- ✅ ACTIONS COM FEEDBACK DE PROGRESSO -->
        <v-card-actions class="pa-6">
          <v-btn variant="text" @click="changeProcessType" v-if="!preselectedType">
            <v-icon start>mdi-arrow-left</v-icon>
            Trocar Tipo
          </v-btn>
          
          <v-btn variant="text" @click="goBack" v-else>
            Cancelar
          </v-btn>
          
          <v-spacer />
          
        
          
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :loading="creating"
            :disabled="!formValid"
            @click="createProcessWithFiles"
          >
            <v-icon start>mdi-rocket-launch</v-icon>
            Criar Processo
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const processTypeStore = useProcessTypeStore()
const authStore = useAuthStore()

// Props
const props = defineProps({
  typeId: String
})

// ✅ ESTADO REFATORADO
const searchType = ref('')
const selectedProcessTypeId = ref(null)
const formValid = ref(true)
const creating = ref(false)



const processForm = ref(null)
const processData = ref({
  observations: ''
})
const formData = ref({})
const fileInputs = ref({})
const uploadedFileIds = ref({})
const dragStates = ref({})
const fileErrors = ref({})
const fileInputRefs = ref({})

const loadingTypes = computed(() => processTypeStore.loading)
const processTypes = computed(() => {
  const allTypes = processTypeStore.processTypes

  // Identificar IDs de tipos usados como sub-processos
  const subProcessTypeIds = new Set()
  allTypes.forEach(pt => {
    if (Array.isArray(pt.allowedChildProcessTypes) && pt.allowedChildProcessTypes.length > 0) {
      pt.allowedChildProcessTypes.forEach(childId => {
        subProcessTypeIds.add(childId)
      })
    }
  })

  // Filtrar apenas tipos ativos
  const activeTypes = allTypes.filter(pt => pt.isActive !== false)

  // Filtrar tipos que o usuário tem permissão E que não são sub-processos exclusivos
  return activeTypes.filter(pt => {
    const hasPermission = authStore.canAccessProcessType(pt.id, 'create')
    const isSubProcessOnly = subProcessTypeIds.has(pt.id)
    return hasPermission && !isSubProcessOnly
  })
})
const preselectedType = computed(() => props.typeId || route.params.typeId)
const selectedProcessType = computed(() => {
  if (selectedProcessTypeId.value) {
    return processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  }
  return null
})
const hasFormFields = computed(() => {
  return getVisibleFieldsCount(selectedProcessType.value) > 0
})


async function createProcessWithFiles() {
  if (!formValid.value || !selectedProcessType.value) {
    window.showSnackbar?.('Por favor, corrija os erros no formulário', 'error')
    return
  }

  creating.value = true

  try {
    // Preparar formData com campos não-arquivo
    const processFormData = { ...formData.value }

    // Criar o processo primeiro
    const basePayload = {
      processTypeId: selectedProcessType.value.id,
      title: generateProcessTitle(),
      description: processData.value.observations?.trim() || null,
      formData: processFormData
    }

    const createdProcess = await processStore.createProcess(basePayload)

    // Fazer upload dos arquivos se houver
    const fileFields = selectedProcessType.value.formFields.filter(f => f.type?.toString().toUpperCase() === 'FILE')

    if (fileFields.length > 0) {
      for (const field of fileFields) {
        const file = fileInputs.value[field.name]

        if (file) {
          try {
            // Upload único por campo
            const uploadedFile = await processStore.uploadProcessFieldFile(createdProcess.id, field.name, file)
            console.log(`✅ Arquivo enviado para campo ${field.name}:`, uploadedFile)
          } catch (uploadError) {
            console.error(`Erro ao fazer upload do campo ${field.name}:`, uploadError)
            window.showSnackbar?.(`Aviso: Erro ao fazer upload de ${field.label}`, 'warning')
          }
        }
      }
    }

    window.showSnackbar?.('Processo criado com sucesso!', 'success')

    setTimeout(() => {
      router.push(`/processes/${createdProcess.id}`)
    }, 500)

  } catch (error) {
    console.error('Erro ao criar processo:', error)
    window.showSnackbar?.(error.message || 'Erro ao criar processo', 'error')
  } finally {
    creating.value = false
  }
}


function generateProcessTitle() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // ✅ CORRIGIDO: Removido 'codigo' que não existe no modelo
  // Agora usa apenas o nome do tipo de processo
  return selectedProcessType.value?.name || 'Novo Processo'
}


function getVisibleFormFields(processType) {
  if (!processType?.formFields) return []
  return processType.formFields
}

function getVisibleFieldsCount(processType) {
  return getVisibleFormFields(processType).length
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
    case 'FILE':
      return 12  // Largura completa (uma linha inteira)
    default:
      return 4  // 3 campos por linha em desktop
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
  }

  return rules
}

// Funções para formatação de telefone
function formatPhone(value) {
  if (!value) return ''
  // Remove tudo que não é número
  const digits = value.replace(/\D/g, '')

  if (digits.length === 0) return ''

  // Formata de acordo com a quantidade de dígitos
  if (digits.length <= 2) {
    return `(${digits}`
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  } else if (digits.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  } else {
    // Celular: (XX) XXXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
}

function formatPhoneField(fieldName) {
  const value = formData.value[fieldName]
  if (value) {
    formData.value[fieldName] = formatPhone(value)
  }
}

function onPhoneInput(fieldName, event) {
  // Permite que o usuário digite livremente, mas remove caracteres não numéricos
  // A formatação acontece no blur
  const value = event.target?.value || formData.value[fieldName] || ''
  // Mantém apenas números enquanto digita (máximo 11 dígitos)
  const digits = value.replace(/\D/g, '').slice(0, 11)
  formData.value[fieldName] = digits
}

// Métodos de navegação (mantidos)
function goBack() {
  router.push('/processes')
}

// Funções para campos de arquivo
function getFileFieldConfig(field) {
  const defaultConfig = {
    multiple: false,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
  }

  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? field.validations : JSON.parse(field.validations)
      return {
        multiple: validations.maxFiles ? validations.maxFiles > 1 : defaultConfig.multiple,
        maxFiles: validations.maxFiles || defaultConfig.maxFiles,
        maxSize: validations.maxSize || defaultConfig.maxSize,
        allowedTypes: validations.allowedTypes || defaultConfig.allowedTypes
      }
    } catch {
      return defaultConfig
    }
  }

  return defaultConfig
}

function getFileFieldHint(field) {
  const config = getFileFieldConfig(field)
  const sizeInMB = (config.maxSize / (1024 * 1024)).toFixed(0)
  const types = config.allowedTypes.join(', ')

  return `Tamanho máximo: ${sizeInMB}MB. Tipos permitidos: ${types}`
}

function getFileFieldRules(field) {
  const rules = []
  const config = getFileFieldConfig(field)

  if (field.required) {
    rules.push(v => !!v || `${field.label} é obrigatório`)
  }

  // Validar tamanho do arquivo
  rules.push(v => {
    if (!v) return true

    if (v.size > config.maxSize) {
      const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0)
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    }

    return true
  })

  return rules
}

async function handleFileChange(fieldName, file) {
  fileInputs.value[fieldName] = file

  if (!file) {
    delete uploadedFileIds.value[fieldName]
    delete formData.value[fieldName]
    return
  }

  // Upload será feito no submit
  console.log('File selected for field', fieldName, ':', file)
}

// ✅ Novas funções para o design de upload profissional
function triggerFileInput(fieldName) {
  const input = fileInputRefs.value[fieldName]
  if (input) {
    input.click()
  }
}

function handleFileInputChange(fieldName, event, field) {
  const file = event.target.files?.[0]
  if (file) {
    validateAndSetFile(fieldName, file, field)
  }
}

function handleFileDrop(fieldName, event, field) {
  dragStates.value[fieldName] = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    validateAndSetFile(fieldName, file, field)
  }
}

function validateAndSetFile(fieldName, file, field) {
  const config = getFileFieldConfig(field)

  // Limpar erro anterior
  delete fileErrors.value[fieldName]

  // Validar tamanho
  if (file.size > config.maxSize) {
    const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0)
    fileErrors.value[fieldName] = `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    return
  }

  // Validar tipo
  const extension = '.' + file.name.split('.').pop().toLowerCase()
  const allowedExtensions = config.allowedTypes.map(t => t.toLowerCase())
  if (!allowedExtensions.includes(extension)) {
    fileErrors.value[fieldName] = `Tipo de arquivo não permitido. Tipos aceitos: ${config.allowedTypes.join(', ')}`
    return
  }

  // Arquivo válido
  fileInputs.value[fieldName] = file
  console.log('File validated and set for field', fieldName, ':', file)
}

function removeFile(fieldName) {
  fileInputs.value[fieldName] = null
  delete fileErrors.value[fieldName]
  delete uploadedFileIds.value[fieldName]
  delete formData.value[fieldName]

  // Limpar input
  const input = fileInputRefs.value[fieldName]
  if (input) {
    input.value = ''
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(filename) {
  if (!filename) return 'mdi-file'
  const ext = filename.split('.').pop()?.toLowerCase()

  const iconMap = {
    pdf: 'mdi-file-pdf-box',
    doc: 'mdi-file-word',
    docx: 'mdi-file-word',
    xls: 'mdi-file-excel',
    xlsx: 'mdi-file-excel',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    png: 'mdi-file-image',
    gif: 'mdi-file-image',
    txt: 'mdi-file-document',
    zip: 'mdi-folder-zip',
    rar: 'mdi-folder-zip'
  }

  return iconMap[ext] || 'mdi-file'
}

function getFileIconColor(filename) {
  if (!filename) return 'grey'
  const ext = filename.split('.').pop()?.toLowerCase()

  const colorMap = {
    pdf: 'red',
    doc: 'blue',
    docx: 'blue',
    xls: 'green',
    xlsx: 'green',
    jpg: 'purple',
    jpeg: 'purple',
    png: 'purple',
    gif: 'purple',
    txt: 'grey',
    zip: 'orange',
    rar: 'orange'
  }

  return colorMap[ext] || 'grey'
}

function changeProcessType() {
  selectedProcessTypeId.value = null
  formData.value = {}
  fileInputs.value = {}
  uploadedFileIds.value = {}
}

function selectProcessType(processType) {
  selectedProcessTypeId.value = processType.id
  initializeFormData(processType)
}

function proceedToForm() {
  const processType = processTypes.value.find(pt => pt.id === selectedProcessTypeId.value)
  if (processType) {
    initializeFormData(processType)
  }
}

function initializeFormData(processType) {
  formData.value = {}

  if (processType?.formFields) {
    getVisibleFormFields(processType).forEach(field => {
      if (field.defaultValue) {
        formData.value[field.name] = field.defaultValue
      } else if (field.type === 'CHECKBOX') {
        formData.value[field.name] = []
      }
    })
  }
}

// Watchers (mantidos)
watch(() => preselectedType.value, async (newTypeId) => {
  if (newTypeId && processTypes.value.length > 0) {
    const processType = processTypes.value.find(pt => pt.id === newTypeId)
    if (processType) {
      console.log('✨ Pre-selecting process type:', processType.name)
      selectedProcessTypeId.value = newTypeId
      initializeFormData(processType)
    }
  }
}, { immediate: true })

// Lifecycle (mantido)
onMounted(async () => {
  console.log('🚀 CreateProcess mounted, typeId:', preselectedType.value)
  
  if (processTypes.value.length === 0) {
    await processTypeStore.fetchProcessTypes()
  }
  
  if (preselectedType.value) {
    const processType = processTypes.value.find(pt => pt.id === preselectedType.value)
    if (processType) {
      selectedProcessTypeId.value = preselectedType.value
      initializeFormData(processType)
    }
  }
})
</script>

<style scoped>
/* Estilos mantidos iguais + novos para upload */
.create-process-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(66, 165, 245, 0.05));
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
}

.form-card {
  border-radius: 16px;
  overflow: hidden;
}

.selected-process-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(66, 165, 245, 0.02));
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
}

.form-section h4 {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 16px;
}

/* ========================================
   UPLOAD DE ARQUIVO - DESIGN PROFISSIONAL
   ======================================== */

/* Container principal */
.file-upload-container {
  width: 100%;
}

/* Label do campo */
.file-upload-label {
  display: block;
  color: rgba(0, 0, 0, 0.87);
}

/* Input escondido */
.file-input-hidden {
  display: none;
}

/* Área de upload */
.file-upload-area {
  position: relative;
  border: 2px dashed rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.01), rgba(0, 0, 0, 0.02));
}

.file-upload-area:hover {
  border-color: rgb(var(--v-theme-primary));
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.03), rgba(25, 118, 210, 0.06));
}

/* Estado: Dragover */
.file-upload-area--dragover {
  border-color: rgb(var(--v-theme-primary));
  border-style: solid;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(25, 118, 210, 0.12));
  transform: scale(1.01);
}

.file-upload-area--dragover .file-upload-icon {
  animation: bounce 0.6s ease infinite;
}

/* Estado: Com arquivo */
.file-upload-area--has-file {
  border-style: solid;
  border-color: rgb(var(--v-theme-success));
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.03), rgba(76, 175, 80, 0.06));
  padding: 20px;
}

/* Estado: Erro */
.file-upload-area--error {
  border-color: rgb(var(--v-theme-error));
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.03), rgba(244, 67, 54, 0.06));
}

/* Ícone wrapper */
.file-upload-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.06));
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.file-upload-area:hover .file-upload-icon-wrapper {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(25, 118, 210, 0.12));
}

.file-upload-area--dragover .file-upload-icon-wrapper {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.25));
}

/* Texto de upload */
.file-upload-text p {
  margin: 0;
}

/* Estado vazio */
.file-upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Preview do arquivo */
.file-upload-preview {
  width: 100%;
}

.file-preview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #ffffff !important;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.file-preview-icon {
  flex-shrink: 0;
}

.file-preview-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.file-preview-name {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.file-preview-size {
  margin: 0;
}

.file-preview-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Indicador de sucesso */
.file-success-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  padding: 6px 12px;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 20px;
}

/* Mensagem de erro */
.file-upload-error {
  display: flex;
  align-items: center;
}

/* Animação de bounce */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* Responsividade */
@media (max-width: 768px) {
  .header-section {
    padding: 16px;
  }

  .selected-process-header .d-flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .file-upload-area {
    padding: 24px 16px;
  }

  .file-preview-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .file-preview-info {
    text-align: center;
  }

  .file-preview-name {
    max-width: 100%;
  }
}

</style>