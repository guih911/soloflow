<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    persistent
    scrollable
  >
    <v-card class="child-process-dialog">
      <!-- Header -->
      <v-card-title class="child-process-dialog-header d-flex align-center justify-center flex-column py-8">
        <div class="icon-container mb-4">
          <v-icon size="64" color="white">mdi-source-branch-plus</v-icon>
        </div>
        <span class="text-h5 font-weight-bold text-white text-center">
          Criar Sub-Processo
        </span>
        <span class="text-body-2 text-white-50 mt-2 text-center">
          Vincular um novo processo a este
        </span>
      </v-card-title>

      <v-divider />

      <!-- Conteúdo -->
      <v-card-text class="pa-6" style="max-height: 60vh; overflow-y: auto;">
        <!-- Formulário -->
        <v-form ref="formRef" v-model="formValid" @submit.prevent="handleCreate">
          <!-- Tipo de Processo -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
              Tipo de Sub-Processo *
            </label>
            <v-select
              v-model="form.childProcessTypeId"
              :items="availableProcessTypes"
              item-title="name"
              item-value="id"
              variant="outlined"
              placeholder="Selecione o tipo de processo"
              :rules="[rules.required]"
              :loading="loadingTypes"
              bg-color="grey-lighten-5"
              density="comfortable"
              prepend-inner-icon="mdi-file-tree"
              @update:model-value="onProcessTypeChange"
            />
          </div>

          <!-- Título -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
              Título do Sub-Processo
            </label>
            <v-text-field
              v-model="form.title"
              variant="outlined"
              placeholder="Ex: Aditivo ao Contrato"
              bg-color="grey-lighten-5"
              density="comfortable"
              prepend-inner-icon="mdi-text"
            />
          </div>

          <!-- Descrição -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
              Descrição (opcional)
            </label>
            <v-textarea
              v-model="form.description"
              variant="outlined"
              placeholder="Descreva o motivo da criação deste sub-processo..."
              rows="2"
              bg-color="grey-lighten-5"
              density="comfortable"
              prepend-inner-icon="mdi-text-box-outline"
            />
          </div>

          <!-- Campos do Formulário do Tipo de Processo -->
          <div v-if="selectedProcessType?.formFields?.length > 0" class="mb-4">
            <v-divider class="mb-4" />
            <div class="d-flex align-center mb-3">
              <v-icon class="mr-2" color="primary">mdi-form-textbox</v-icon>
              <span class="text-subtitle-2 font-weight-bold">Dados do Formulário</span>
            </div>

            <div v-for="field in selectedProcessType.formFields" :key="field.id" class="mb-3">
              <!-- TEXT -->
              <v-text-field
                v-if="field.type === 'TEXT'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- TEXTAREA -->
              <v-textarea
                v-else-if="field.type === 'TEXTAREA'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
                rows="2"
              />

              <!-- NUMBER -->
              <v-text-field
                v-else-if="field.type === 'NUMBER'"
                v-model.number="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                type="number"
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- CURRENCY -->
              <v-text-field
                v-else-if="field.type === 'CURRENCY'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                prefix="R$"
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- DATE -->
              <v-text-field
                v-else-if="field.type === 'DATE'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                type="date"
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- EMAIL -->
              <v-text-field
                v-else-if="field.type === 'EMAIL'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required, rules.email] : [rules.email]"
                :hint="field.helpText"
                persistent-hint
                type="email"
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- PHONE -->
              <v-text-field
                v-else-if="field.type === 'PHONE'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder || '(00) 00000-0000'"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- CPF -->
              <v-text-field
                v-else-if="field.type === 'CPF'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder || '000.000.000-00'"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- CNPJ -->
              <v-text-field
                v-else-if="field.type === 'CNPJ'"
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder || '00.000.000/0000-00'"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- DROPDOWN -->
              <v-select
                v-else-if="field.type === 'DROPDOWN'"
                v-model="formData[field.name]"
                :label="field.label"
                :items="field.options || []"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />

              <!-- FILE -->
              <div v-else-if="field.type === 'FILE'" class="mb-3">
                <v-file-input
                  v-model="formData[field.name]"
                  :label="field.label"
                  :required="field.required"
                  :rules="field.required ? [rules.required] : []"
                  :hint="field.helpText"
                  :accept="getAcceptedFileTypes(field)"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  bg-color="grey-lighten-5"
                  prepend-icon=""
                  prepend-inner-icon="mdi-paperclip"
                  :multiple="field.validations?.maxFiles > 1"
                  show-size
                  counter
                  :chips="field.validations?.maxFiles > 1"
                />
                <p v-if="field.validations?.allowedTypes?.length" class="text-caption text-grey ml-1">
                  Tipos permitidos: {{ field.validations.allowedTypes.join(', ') }}
                </p>
              </div>

              <!-- Outros tipos -->
              <v-text-field
                v-else
                v-model="formData[field.name]"
                :label="field.label"
                :placeholder="field.placeholder"
                :required="field.required"
                :rules="field.required ? [rules.required] : []"
                :hint="field.helpText"
                persistent-hint
                variant="outlined"
                density="comfortable"
                bg-color="grey-lighten-5"
              />
            </div>
          </div>

          <!-- Herdar dados -->
          <v-divider class="mb-4" />
          <v-checkbox
            v-model="form.inheritData"
            label="Copiar dados do processo pai"
            color="primary"
            density="comfortable"
            hide-details
            class="mb-2"
          />
          <p class="text-caption text-grey mb-4 ml-8">
            Os campos em comum serão preenchidos automaticamente com os dados do processo pai.
          </p>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Ações -->
      <v-card-actions class="pa-4 d-flex justify-space-between">
        <v-btn
          variant="text"
          color="grey-darken-1"
          size="large"
          @click="handleClose"
          :disabled="loading"
        >
          <v-icon start>mdi-close</v-icon>
          Cancelar
        </v-btn>

        <v-btn
          color="primary"
          variant="elevated"
          size="large"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="handleCreate"
          class="px-6"
        >
          <v-icon start>mdi-plus</v-icon>
          Criar Sub-Processo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useChildProcessStore } from '@/stores/childProcesses'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  parentProcess: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const childProcessStore = useChildProcessStore()
const authStore = useAuthStore()

// Estado do formulário
const formRef = ref(null)
const formValid = ref(false)
const loading = ref(false)
const loadingTypes = ref(false)
const availableProcessTypes = ref([])
const formData = ref({}) // Dados dos campos do formulário

const form = ref({
  childProcessTypeId: null,
  title: '',
  description: '',
  inheritData: true
})

// Tipo de processo selecionado
const selectedProcessType = computed(() => {
  if (!form.value.childProcessTypeId) return null
  return availableProcessTypes.value.find(pt => pt.id === form.value.childProcessTypeId)
})

// Regras de validação
const rules = {
  required: v => !!v || 'Campo obrigatório',
  email: v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido'
}

// Mapear tipos de arquivo permitidos para o accept do input
function getAcceptedFileTypes(field) {
  if (!field.validations?.allowedTypes?.length) {
    return undefined // Aceita qualquer tipo
  }

  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed'
  }

  return field.validations.allowedTypes
    .map(type => mimeTypes[type.toLowerCase()] || `.${type}`)
    .join(',')
}

// Quando mudar o tipo de processo, resetar formData e preencher com dados do pai se habilitado
function onProcessTypeChange(typeId) {
  formData.value = {}

  if (form.value.inheritData && props.parentProcess?.formData) {
    // Copiar dados do pai que sejam compatíveis
    const parentData = props.parentProcess.formData
    const selectedType = availableProcessTypes.value.find(pt => pt.id === typeId)

    if (selectedType?.formFields) {
      selectedType.formFields.forEach(field => {
        if (parentData[field.name] !== undefined) {
          formData.value[field.name] = parentData[field.name]
        } else if (field.defaultValue) {
          formData.value[field.name] = field.defaultValue
        }
      })
    }
  }
}

// Carregar tipos de processo disponíveis (apenas os permitidos pelo tipo do processo pai)
async function loadProcessTypes() {
  loadingTypes.value = true
  try {
    const companyId = authStore.user?.companyId || authStore.activeCompanyId
    const response = await api.get('/process-types', { params: { companyId } })
    const data = response.data?.data || response.data || []

    // Obter os IDs dos tipos de sub-processo permitidos pelo processo pai
    const allowedChildTypes = props.parentProcess?.processType?.allowedChildProcessTypes || []

    // Filtrar tipos ativos, remover duplicados e filtrar pelos permitidos
    const uniqueTypesMap = new Map()
    data.forEach(pt => {
      if (pt.isActive && !uniqueTypesMap.has(pt.id)) {
        // Se houver tipos permitidos configurados, filtrar por eles
        // Se não houver configuração, mostrar todos (comportamento anterior)
        if (allowedChildTypes.length === 0 || allowedChildTypes.includes(pt.id)) {
          uniqueTypesMap.set(pt.id, pt)
        }
      }
    })

    availableProcessTypes.value = Array.from(uniqueTypesMap.values())
  } catch (err) {
    window.showSnackbar?.('Erro ao carregar tipos de processo', 'error')
  } finally {
    loadingTypes.value = false
  }
}

// Watch para copiar dados quando mudar a opção inheritData
watch(() => form.value.inheritData, (inherit) => {
  if (inherit && props.parentProcess?.formData && form.value.childProcessTypeId) {
    onProcessTypeChange(form.value.childProcessTypeId)
  }
})

// Limpar formulário quando abrir/fechar
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadProcessTypes()
  } else {
    form.value = {
      childProcessTypeId: null,
      title: '',
      description: '',
      inheritData: true
    }
    formData.value = {}
    formValid.value = false
    if (formRef.value) {
      formRef.value.reset()
    }
  }
})

function handleClose() {
  emit('update:modelValue', false)
}

async function handleCreate() {
  if (!formValid.value || !props.parentProcess) return

  loading.value = true

  try {
    // Separar arquivos dos outros dados
    const fileFields = {}
    const regularFormData = {}

    // Identificar campos de arquivo
    const selectedType = availableProcessTypes.value.find(pt => pt.id === form.value.childProcessTypeId)
    const fileFieldNames = selectedType?.formFields
      ?.filter(f => f.type === 'FILE')
      .map(f => f.name) || []

    // Separar dados
    Object.entries(formData.value).forEach(([key, value]) => {
      if (fileFieldNames.includes(key) && value) {
        // É um campo de arquivo
        if (Array.isArray(value)) {
          fileFields[key] = value.map(f => ({ file: f }))
        } else {
          fileFields[key] = [{ file: value }]
        }
      } else if (!fileFieldNames.includes(key)) {
        // É um campo normal
        regularFormData[key] = value
      }
    })

    // Mesclar formData preenchido com dados herdados do pai (sem arquivos)
    let finalFormData = { ...regularFormData }

    if (form.value.inheritData && props.parentProcess.formData) {
      // Dados do pai como base, sobrescritos pelos dados preenchidos
      // Excluir campos de arquivo do pai
      const parentDataWithoutFiles = {}
      Object.entries(props.parentProcess.formData).forEach(([key, value]) => {
        if (!fileFieldNames.includes(key) && !Array.isArray(value)) {
          parentDataWithoutFiles[key] = value
        }
      })

      finalFormData = {
        ...parentDataWithoutFiles,
        ...regularFormData
      }
    }

    // Preparar dados para criar
    const createData = {
      parentProcessInstanceId: props.parentProcess.id,
      childProcessTypeId: form.value.childProcessTypeId,
      title: form.value.title || undefined,
      description: form.value.description || undefined,
      formData: finalFormData
    }

    const result = await childProcessStore.createChildProcess(createData)

    // Se tiver arquivos, fazer upload
    if (Object.keys(fileFields).length > 0 && result.childProcessInstance?.id) {
      const { useProcessStore } = await import('@/stores/processes')
      const processStore = useProcessStore()

      try {
        await processStore.uploadProcessFiles(result.childProcessInstance.id, fileFields)
      } catch (uploadErr) {
        window.showSnackbar?.('Sub-processo criado, mas houve erro ao enviar arquivos', 'warning')
      }
    }

    window.showSnackbar?.('Sub-processo criado com sucesso!', 'success')

    emit('created', result)
    emit('update:modelValue', false)
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Erro ao criar sub-processo'
    window.showSnackbar?.(errorMsg, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.child-process-dialog {
  border-radius: 16px !important;
  overflow: hidden;
}

.child-process-dialog-header {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  position: relative;
}

.child-process-dialog-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.icon-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
