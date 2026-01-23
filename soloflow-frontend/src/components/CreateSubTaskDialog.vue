<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    persistent
    aria-labelledby="subtask-dialog-title"
  >
    <v-card class="subtask-dialog-card" role="dialog" aria-modal="true">
      <v-card-title id="subtask-dialog-title" class="d-flex align-center py-4 px-6 bg-secondary">
        <v-icon class="mr-3" color="white" aria-hidden="true">mdi-subdirectory-arrow-right</v-icon>
        <span class="text-white font-weight-medium">Nova Sub-etapa</span>
      </v-card-title>

      <v-form ref="subTaskForm" v-model="formValid">
        <v-card-text class="pa-6">
          <!-- Informações Básicas -->
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="subTaskData.name"
                label="Nome da Sub-etapa"
                placeholder="Ex: Verificar documentação, Aprovar orçamento..."
                :rules="[v => !!v || 'O nome da sub-etapa é obrigatório']"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-title"
                required
                aria-required="true"
                aria-describedby="name-hint"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="subTaskData.description"
                label="Descrição (opcional)"
                placeholder="Descreva o que deve ser feito nesta sub-etapa..."
                variant="outlined"
                density="comfortable"
                rows="2"
                prepend-inner-icon="mdi-text"
                aria-label="Descrição da sub-etapa"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="subTaskData.instructions"
                label="Instruções (opcional)"
                placeholder="Instruções detalhadas para o executor..."
                variant="outlined"
                density="comfortable"
                rows="3"
                prepend-inner-icon="mdi-clipboard-text"
                aria-label="Instruções para o executor"
              />
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Responsável -->
          <h4 class="text-subtitle-1 font-weight-medium mb-4 d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-account-check</v-icon>
            Responsável
          </h4>

          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="responsibleType"
                :items="responsibleTypeOptions"
                item-title="title"
                item-value="value"
                label="Tipo de Responsável"
                variant="outlined"
                density="comfortable"
                aria-label="Selecionar tipo de responsável"
              >
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props" :title="undefined">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" md="6">
              <!-- Usuário -->
              <v-autocomplete
                v-if="responsibleType === 'user'"
                v-model="subTaskData.assignedToUserId"
                :items="users"
                item-value="id"
                item-title="name"
                label="Usuário Responsável"
                placeholder="Digite nome ou email..."
                variant="outlined"
                density="comfortable"
                clearable
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="undefined">
                    <template v-slot:prepend>
                      <v-avatar :color="getAvatarColor(item.raw.name)" size="36">
                        <span class="text-caption font-weight-bold text-white">
                          {{ getInitials(item.raw.name) }}
                        </span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">{{ item.raw.name }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ item.raw.email }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <!-- Setor -->
              <v-select
                v-else-if="responsibleType === 'sector'"
                v-model="subTaskData.assignedToSectorId"
                :items="sectors"
                item-title="name"
                item-value="id"
                label="Setor Responsável"
                variant="outlined"
                density="comfortable"
                clearable
              />

              <!-- Herdar/Criador -->
              <v-alert
                v-else
                type="info"
                variant="tonal"
                density="compact"
              >
                <v-icon start size="18">
                  {{ responsibleType === 'inherit' ? 'mdi-account-arrow-left' : 'mdi-account-plus' }}
                </v-icon>
                {{ responsibleType === 'inherit'
                  ? 'A sub-etapa será atribuída ao responsável atual da etapa.'
                  : 'A sub-etapa será atribuída ao criador do processo.'
                }}
              </v-alert>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Prazo (SLA) -->
          <h4 class="text-subtitle-1 font-weight-medium mb-4 d-flex align-center">
            <v-icon class="mr-2" color="warning">mdi-clock-outline</v-icon>
            Prazo
          </h4>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="subTaskData.slaDays"
                label="Prazo em Dias"
                type="number"
                variant="outlined"
                density="comfortable"
                min="0"
                prepend-inner-icon="mdi-calendar-clock"
                hint="Deixe vazio para sem prazo"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Configurações -->
          <h4 class="text-subtitle-1 font-weight-medium mb-4 d-flex align-center">
            <v-icon class="mr-2" color="info">mdi-cog</v-icon>
            Configurações
          </h4>

          <v-row>
            <v-col cols="12" md="6">
              <v-switch
                v-model="subTaskData.isRequired"
                label="Sub-etapa Obrigatória"
                color="primary"
                hide-details
              >
                <template v-slot:label>
                  <div>
                    <span class="font-weight-medium">Obrigatória</span>
                    <p class="text-caption text-grey mb-0">
                      A etapa só pode ser concluída após esta sub-etapa
                    </p>
                  </div>
                </template>
              </v-switch>
            </v-col>

            <v-col cols="12" md="6">
              <v-switch
                v-model="subTaskData.allowAttachment"
                label="Permitir Anexos"
                color="primary"
                hide-details
              >
                <template v-slot:label>
                  <div>
                    <span class="font-weight-medium">Permitir Anexos</span>
                    <p class="text-caption text-grey mb-0">
                      O executor pode anexar arquivos
                    </p>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="close"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="secondary"
            variant="elevated"
            :loading="loading"
            :disabled="!formValid"
            @click="save"
          >
            <v-icon start>mdi-check</v-icon>
            Criar Sub-etapa
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSubTaskStore } from '@/stores/subTasks'
import api from '@/services/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  stepExecution: {
    type: Object,
    default: null
  },
  companyId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const subTaskStore = useSubTaskStore()

const formValid = ref(false)
const loading = ref(false)
const users = ref([])
const sectors = ref([])
const responsibleType = ref('inherit')

const subTaskData = ref({
  name: '',
  description: '',
  instructions: '',
  assignedToUserId: null,
  assignedToSectorId: null,
  slaHours: null,
  slaDays: null,
  isRequired: false,
  allowAttachment: false
})

const responsibleTypeOptions = [
  {
    value: 'inherit',
    title: 'Herdar da Etapa',
    description: 'Mesmo responsável da etapa atual',
    icon: 'mdi-account-arrow-left',
    color: 'info'
  },
  {
    value: 'user',
    title: 'Usuário Específico',
    description: 'Selecione um usuário',
    icon: 'mdi-account',
    color: 'primary'
  },
  {
    value: 'sector',
    title: 'Setor',
    description: 'Qualquer membro do setor',
    icon: 'mdi-account-group',
    color: 'success'
  },
  {
    value: 'creator',
    title: 'Criador do Processo',
    description: 'Quem iniciou o processo',
    icon: 'mdi-account-plus',
    color: 'warning'
  }
]

function getAvatarColor(name) {
  const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  const index = name ? name.charCodeAt(0) % colors.length : 0
  return colors[index]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

async function loadUsers() {
  if (!props.companyId) return
  try {
    const response = await api.get('/users', { params: { companyId: props.companyId } })
    users.value = response.data?.data || response.data || []
  } catch (err) {
    users.value = []
  }
}

async function loadSectors() {
  if (!props.companyId) return
  try {
    const response = await api.get('/sectors', { params: { companyId: props.companyId } })
    sectors.value = response.data?.data || response.data || []
  } catch (err) {
    sectors.value = []
  }
}

function resetForm() {
  subTaskData.value = {
    name: '',
    description: '',
    instructions: '',
    assignedToUserId: null,
    assignedToSectorId: null,
    slaHours: null,
    slaDays: null,
    isRequired: false,
    allowAttachment: false
  }
  responsibleType.value = 'inherit'
}

function close() {
  resetForm()
  emit('update:modelValue', false)
}

async function save() {
  if (!formValid.value || !props.stepExecution) return

  loading.value = true
  try {
    // Determinar userId baseado no tipo de responsável
    let assignedToUserId = null
    if (responsibleType.value === 'user') {
      assignedToUserId = subTaskData.value.assignedToUserId
    }

    // Calcular SLA total em horas
    let slaHours = subTaskData.value.slaHours || 0
    if (subTaskData.value.slaDays) {
      slaHours += subTaskData.value.slaDays * 24
    }

    await subTaskStore.createSubTask({
      stepExecutionId: props.stepExecution.id,
      name: subTaskData.value.name,
      description: subTaskData.value.description || undefined,
      instructions: subTaskData.value.instructions || undefined,
      assignedToUserId: assignedToUserId || undefined,
      slaHours: slaHours > 0 ? slaHours : undefined,
      allowAttachment: subTaskData.value.allowAttachment || false
    })

    window.showSnackbar?.('Sub-etapa criada com sucesso!', 'success')
    emit('created')
    close()
  } catch (err) {
    window.showSnackbar?.('Erro ao criar sub-etapa', 'error')
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadUsers()
    loadSectors()
  }
})

watch(() => responsibleType.value, (type) => {
  if (type !== 'user') {
    subTaskData.value.assignedToUserId = null
  }
  if (type !== 'sector') {
    subTaskData.value.assignedToSectorId = null
  }
})
</script>

<style scoped>
.subtask-dialog-card {
  border-radius: 12px;
  overflow: hidden;
}
</style>
