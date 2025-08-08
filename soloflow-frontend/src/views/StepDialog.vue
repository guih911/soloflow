<template>
  <v-dialog :model-value="modelValue" max-width="800" persistent @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title>
        {{ editingIndex !== null ? 'Editar' : 'Nova' }} Etapa
      </v-card-title>
      <v-divider />
      
      <v-form ref="form" v-model="valid">
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="localStepData.name"
                label="Nome da Etapa"
                :rules="[v => !!v || 'Nome é obrigatório']"
                required
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="localStepData.description"
                label="Descrição"
                rows="2"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="localStepData.type"
                :items="stepTypes"
                label="Tipo de Etapa"
                :rules="[v => !!v || 'Tipo é obrigatório']"
                required
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="localStepData.assignedToSectorId"
                :items="sectors"
                item-title="name"
                item-value="id"
                label="Setor Responsável"
                clearable
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="localStepData.assignedToUserId"
                :items="users"
                item-title="name"
                item-value="id"
                label="Usuário Responsável"
                clearable
              />
            </v-col>
            
            <v-col cols="12">
              <v-row>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="localStepData.allowAttachment"
                    label="Permitir Anexos"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="localStepData.requireAttachment"
                    label="Anexos Obrigatórios"
                    :disabled="!localStepData.allowAttachment"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="localStepData.requiresSignature"
                    label="Requer Assinatura"
                  />
                </v-col>
              </v-row>
            </v-col>
            
            <!-- Ações -->
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  Ações Disponíveis
                  <v-btn
                    icon="mdi-plus"
                    size="small"
                    variant="text"
                    @click="addAction"
                    class="ml-2"
                  />
                </v-card-title>
                <v-card-text>
                  <div
                    v-for="(action, idx) in localStepData.actions"
                    :key="idx"
                    class="d-flex align-center gap-2 mb-2"
                  >
                    <v-text-field
                      v-model="localStepData.actions[idx]"
                      label="Ação"
                      density="compact"
                      hide-details
                    />
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeAction(idx)"
                    />
                  </div>
                  <v-alert v-if="localStepData.actions.length === 0" type="info" variant="tonal">
                    Nenhuma ação definida. Adicione ações como "aprovar", "rejeitar", etc.
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!valid"
            @click="save"
          >
            {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  stepData: Object,
  editingIndex: Number,
  sectors: Array,
  users: Array,
  steps: Array
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const valid = ref(false)
const form = ref(null)

const localStepData = ref({
  name: '',
  description: '',
  type: 'INPUT',
  allowAttachment: false,
  requiresSignature: false,
  requireAttachment: false,
  actions: [],
  assignedToUserId: null,
  assignedToSectorId: null
})

const stepTypes = [
  { title: 'Entrada de Dados', value: 'INPUT' },
  { title: 'Aprovação', value: 'APPROVAL' },
  { title: 'Upload de Arquivo', value: 'UPLOAD' },
  { title: 'Revisão', value: 'REVIEW' },
  { title: 'Assinatura', value: 'SIGNATURE' }
]

// Watch para sincronizar dados
watch(() => props.stepData, (newStepData) => {
  if (newStepData) {
    localStepData.value = {
      name: newStepData.name || '',
      description: newStepData.description || '',
      type: newStepData.type || 'INPUT',
      allowAttachment: newStepData.allowAttachment || false,
      requiresSignature: newStepData.requiresSignature || false,
      requireAttachment: newStepData.requireAttachment || false,
      actions: Array.isArray(newStepData.actions) ? [...newStepData.actions] : [],
      assignedToUserId: newStepData.assignedToUserId || null,
      assignedToSectorId: newStepData.assignedToSectorId || null
    }
  }
}, { immediate: true, deep: true })

function addAction() {
  localStepData.value.actions.push('')
}

function removeAction(index) {
  localStepData.value.actions.splice(index, 1)
}

function save() {
  if (!valid.value) return
  
  // Validação básica
  if (!localStepData.value.assignedToUserId && !localStepData.value.assignedToSectorId) {
    window.showSnackbar?.('Defina um responsável para a etapa', 'error')
    return
  }
  
  emit('save', { ...localStepData.value })
}

function close() {
  emit('close')
}
</script>