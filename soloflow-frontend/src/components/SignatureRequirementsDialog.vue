<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <v-icon start color="primary">mdi-draw-pen</v-icon>
          Configurar Assinantes
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="text-body-2">
            Configure quem deve assinar os documentos desta etapa e em qual ordem.
            <ul class="mt-2">
              <li><strong>Sequencial:</strong> Os assinantes devem assinar na ordem definida</li>
              <li><strong>Paralelo:</strong> Os assinantes podem assinar em qualquer ordem</li>
            </ul>
          </div>
        </v-alert>

        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-h6">Assinantes ({{ requirements.length }})</h3>
          <v-btn
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            @click="openRequirementDialog()"
          >
            Adicionar Assinante
          </v-btn>
        </div>

        <v-list v-if="requirements.length > 0" lines="two">
          <v-list-item
            v-for="(req, index) in sortedRequirements"
            :key="req.tempId || req.id"
            class="mb-2"
            border
          >
            <template #prepend>
              <v-avatar :color="req.type === 'SEQUENTIAL' ? 'primary' : 'secondary'" size="40">
                <span class="text-h6">{{ req.order }}</span>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ getSignerName(req) }}
              <v-chip
                size="x-small"
                :color="req.type === 'SEQUENTIAL' ? 'primary' : 'secondary'"
                class="ml-2"
              >
                {{ req.type === 'SEQUENTIAL' ? 'Sequencial' : 'Paralelo' }}
              </v-chip>
              <v-chip v-if="req.isRequired" size="x-small" color="error" class="ml-1">
                Obrigatório
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle>
              {{ req.description || 'Sem descrição' }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-arrow-up"
                  size="small"
                  variant="text"
                  :disabled="index === 0"
                  @click="moveUp(index)"
                />
                <v-btn
                  icon="mdi-arrow-down"
                  size="small"
                  variant="text"
                  :disabled="index === requirements.length - 1"
                  @click="moveDown(index)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="openRequirementDialog(req, index)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="removeRequirement(index)"
                />
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-empty-state
          v-else
          icon="mdi-account-edit-outline"
          title="Nenhum assinante configurado"
          text="Adicione assinantes para esta etapa de assinatura."
          class="my-8"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn color="primary" variant="elevated" @click="save">Salvar</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Dialog para adicionar/editar assinante -->
    <v-dialog v-model="requirementDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editingIndex !== null ? 'Editar' : 'Adicionar' }} Assinante
        </v-card-title>

        <v-divider />

        <v-form ref="requirementForm" v-model="requirementValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="requirementData.order"
                  label="Ordem"
                  type="number"
                  min="1"
                  :rules="[v => !!v || 'Ordem obrigatória', v => v > 0 || 'Ordem deve ser maior que 0']"
                  required
                  hint="Ordem de assinatura"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="requirementData.type"
                  :items="[
                    { title: 'Sequencial', value: 'SEQUENTIAL' },
                    { title: 'Paralelo', value: 'PARALLEL' }
                  ]"
                  label="Tipo de Assinatura"
                  :rules="[v => !!v || 'Tipo obrigatório']"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="signerType"
                  :items="['user', 'sector']"
                  label="Tipo de Assinante"
                  @update:modelValue="onSignerTypeChange"
                >
                  <template v-slot:item="{ item, props }">
                    <v-list-item v-bind="props">
                      <template v-slot:prepend>
                        <v-icon>
                          {{ item.value === 'user' ? 'mdi-account' : 'mdi-office-building' }}
                        </v-icon>
                      </template>
                      <v-list-item-title>
                        {{ item.value === 'user' ? 'Usuário' : 'Setor' }}
                      </v-list-item-title>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-if="signerType === 'user'"
                  v-model="requirementData.userId"
                  :items="users"
                  item-title="name"
                  item-value="id"
                  label="Usuário"
                  :rules="[v => !!v || 'Usuário obrigatório']"
                  required
                />
                <v-select
                  v-else-if="signerType === 'sector'"
                  v-model="requirementData.sectorId"
                  :items="sectors"
                  item-title="name"
                  item-value="id"
                  label="Setor"
                  :rules="[v => !!v || 'Setor obrigatório']"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="requirementData.description"
                  label="Descrição"
                  rows="2"
                  hint="Descreva o que deve ser assinado e por quê"
                  persistent-hint
                />
              </v-col>

              <v-col cols="12">
                <v-switch
                  v-model="requirementData.isRequired"
                  label="Assinatura obrigatória"
                  color="primary"
                  hint="Se marcado, a etapa só pode ser concluída após esta assinatura"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeRequirementDialog">Cancelar</v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!requirementValid"
              @click="saveRequirement"
            >
              {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  initialRequirements: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  },
  sectors: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const requirements = ref([])
const requirementDialog = ref(false)
const requirementValid = ref(false)
const editingIndex = ref(null)
const signerType = ref('user')

const requirementData = ref({
  order: 1,
  type: 'SEQUENTIAL',
  userId: null,
  sectorId: null,
  description: '',
  isRequired: true
})

const sortedRequirements = computed(() => {
  return [...requirements.value].sort((a, b) => a.order - b.order)
})

watch(() => props.modelValue, (newVal) => {
  if (newVal && props.initialRequirements) {
    requirements.value = JSON.parse(JSON.stringify(props.initialRequirements))
  }
})

function getSignerName(req) {
  if (req.userName) return req.userName
  if (req.sectorName) return `Setor: ${req.sectorName}`
  if (req.userId) {
    const user = props.users.find(u => u.id === req.userId)
    return user?.name || 'Usuário'
  }
  if (req.sectorId) {
    const sector = props.sectors.find(s => s.id === req.sectorId)
    return `Setor: ${sector?.name || 'Setor'}`
  }
  return 'Não definido'
}

function openRequirementDialog(requirement = null, index = null) {
  editingIndex.value = index

  if (requirement) {
    requirementData.value = { ...requirement }
    signerType.value = requirement.userId ? 'user' : 'sector'
  } else {
    resetRequirementData()
    requirementData.value.order = requirements.value.length + 1
  }

  requirementDialog.value = true
}

function closeRequirementDialog() {
  requirementDialog.value = false
  resetRequirementData()
  editingIndex.value = null
}

function resetRequirementData() {
  requirementData.value = {
    order: 1,
    type: 'SEQUENTIAL',
    userId: null,
    sectorId: null,
    description: '',
    isRequired: true
  }
  signerType.value = 'user'
}

function onSignerTypeChange() {
  requirementData.value.userId = null
  requirementData.value.sectorId = null
}

function saveRequirement() {
  if (!requirementValid.value) return

  const requirement = {
    ...requirementData.value,
    tempId: editingIndex.value !== null
      ? requirements.value[editingIndex.value].tempId
      : Date.now() + Math.random()
  }

  // Adicionar nome do usuário/setor para exibição
  if (requirement.userId) {
    const user = props.users.find(u => u.id === requirement.userId)
    requirement.userName = user?.name
  } else if (requirement.sectorId) {
    const sector = props.sectors.find(s => s.id === requirement.sectorId)
    requirement.sectorName = sector?.name
  }

  if (editingIndex.value !== null) {
    requirements.value[editingIndex.value] = requirement
  } else {
    requirements.value.push(requirement)
  }

  closeRequirementDialog()
}

function removeRequirement(index) {
  requirements.value.splice(index, 1)
  // Reordenar
  requirements.value.forEach((req, idx) => {
    req.order = idx + 1
  })
}

function moveUp(index) {
  if (index === 0) return
  const temp = requirements.value[index]
  requirements.value[index] = requirements.value[index - 1]
  requirements.value[index - 1] = temp

  // Atualizar ordem
  requirements.value.forEach((req, idx) => {
    req.order = idx + 1
  })
}

function moveDown(index) {
  if (index === requirements.value.length - 1) return
  const temp = requirements.value[index]
  requirements.value[index] = requirements.value[index + 1]
  requirements.value[index + 1] = temp

  // Atualizar ordem
  requirements.value.forEach((req, idx) => {
    req.order = idx + 1
  })
}

function close() {
  emit('update:modelValue', false)
}

function save() {
  emit('save', requirements.value)
  close()
}
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}
</style>
