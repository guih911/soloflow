<template>
  <v-dialog
    :model-value="internalValue"
    persistent
    max-width="960"
    scrollable
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-toolbar color="primary" flat>
        <v-toolbar-title class="text-white">
          {{ form.id ? 'Editar perfil' : 'Novo perfil' }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" class="text-white" @click="closeDialog" />
      </v-toolbar>

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.name"
                label="Nome do perfil"
                placeholder="Ex.: Supervisor de Processos"
                :rules="[requiredRule]"
                required
              />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch
                v-model="form.isDefault"
                inset
                label="Perfil padrão da empresa"
              />
              <v-tooltip activator="parent" location="top">
                <span>Aplicado automaticamente a novos usuários da empresa</span>
              </v-tooltip>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Descrição"
                rows="2"
                placeholder="Explique brevemente quando este perfil deve ser utilizado."
              />
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <section class="mb-6">
            <header class="d-flex align-center mb-2">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">Telas liberadas</h3>
              <v-spacer />
              <v-chip size="small" variant="tonal" color="primary">
                {{ totalSelectedScreens }} selecionada(s)
              </v-chip>
            </header>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Ative as ações desejadas em cada tela. Essas permissões serão convertidas automaticamente
              em regras de acesso.
            </p>

            <v-expansion-panels multiple>
              <v-expansion-panel
                v-for="screen in screenCatalog"
                :key="screen.id"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center w-100">
                    <v-icon class="mr-3">{{ screen.icon }}</v-icon>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">{{ screen.label }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ selectedActionsSummary(screen.id) }}
                      </div>
                    </div>
                    <v-chip
                      v-if="selectedActionsCount(screen.id) > 0"
                      size="small"
                      color="success"
                      variant="tonal"
                    >
                      {{ selectedActionsCount(screen.id) }}
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="action in screen.actions"
                      :key="`${screen.id}-${action.id}`"
                      cols="12"
                      sm="6"
                      md="4"
                    >
                      <v-switch
                        v-model="screenStates[screen.id][action.id]"
                        :label="action.label"
                        color="primary"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </section>

          <v-divider class="my-6" />

          <section class="mb-6">
            <header class="d-flex align-center mb-2">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">Tipos de processo</h3>
              <v-spacer />
              <v-chip size="small" variant="tonal" color="primary">
                {{ processTypeSelections.length }} selecionado(s)
              </v-chip>
            </header>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Selecione os tipos de processo que este perfil poderá acessar.
              <strong>Ao adicionar um tipo, o perfil terá acesso completo</strong> (visualizar, criar e executar).
            </p>
            <v-autocomplete
              v-model="selectedProcessTypeIds"
              :items="processTypeItems"
              item-title="title"
              item-value="value"
              item-subtitle="subtitle"
              class="process-type-combobox"
              color="primary"
              density="comfortable"
              variant="outlined"
              multiple
              chips
              closable-chips
              hide-details="auto"
              clearable
              :menu-props="{ maxHeight: 260 }"
              prepend-inner-icon="mdi-file-tree"
              label="Adicionar tipo de processo"
              placeholder="Selecione um ou mais tipos disponíveis"
            />

            <v-expand-transition>
              <div v-if="processTypeSelections.length" class="process-type-list mt-4">
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="item in processTypeSelections"
                    :key="item.key"
                    color="primary"
                    variant="tonal"
                    closable
                    @click:close="removeProcessType(item.key)"
                  >
                    <v-icon start size="18">
                      {{ item.processTypeId === '*' ? 'mdi-asterisk' : 'mdi-file-tree' }}
                    </v-icon>
                    {{ item.label }}
                  </v-chip>
                </div>
              </div>
            </v-expand-transition>

            <v-alert
              v-if="!processTypeSelections.length"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              Selecione um tipo de processo para dar acesso a este perfil.
            </v-alert>
          </section>

          <v-divider class="my-6" />

        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
        <v-btn color="primary" :loading="loading" @click="handleSubmit">
          {{ form.id ? 'Salvar alterações' : 'Criar perfil' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { SCREEN_CATALOG } from '@/constants/permissions'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  profile: { type: Object, default: null },
  processTypes: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save'])

const internalValue = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  name: '',
  description: '',
  isDefault: false,
})

const screenCatalog = SCREEN_CATALOG
const screenStates = reactive({})
const processTypeSelections = reactive([])

const requiredRule = (value) => !!String(value || '').trim() || 'Campo obrigatório'

const processTypeItems = computed(() => {
  const selectedIds = new Set(processTypeSelections.map((item) => item.processTypeId))

  const items = [
    {
      value: '*',
      title: 'Todos os tipos (*)',
      subtitle: 'Aplica capacidades em todos os processos.',
    },
    ...props.processTypes.map((type) => ({
      value: type.id,
      title: type.name,
      subtitle: type.description || undefined,
    })),
  ]

  return items.map((item) => ({
    ...item,
    disabled: selectedIds.has(item.value),
  }))
})

const processTypeLookup = computed(() => {
  const map = new Map()
  processTypeItems.value.forEach((item) => {
    map.set(item.value, item.title)
  })
  return map
})

const selectedProcessTypeIds = computed({
  get: () => processTypeSelections.map((item) => item.processTypeId),
  set: (ids) => {
    const currentIds = processTypeSelections.map((item) => item.processTypeId)
    ids.forEach((id) => {
      if (!currentIds.includes(id)) {
        addProcessTypeSelection(id)
      }
    })

    const allowed = new Set(ids)
    currentIds.forEach((id) => {
      if (!allowed.has(id)) {
        removeProcessTypeById(id)
      }
    })
  },
})

const totalSelectedScreens = computed(() =>
  screenCatalog.reduce((count, screen) => count + selectedActionsCount(screen.id), 0),
)

watch(
  () => props.modelValue,
  (value) => {
    internalValue.value = value
    if (value) {
      initializeForm(props.profile)
    }
  },
  { immediate: true },
)

watch(
  () => props.profile,
  (profile) => {
    if (internalValue.value) {
      initializeForm(profile)
    }
  },
  { deep: true },
)

function onDialogToggle(value) {
  internalValue.value = value
  if (!value) {
    emit('update:modelValue', false)
  }
}

function closeDialog() {
  internalValue.value = false
  emit('update:modelValue', false)
}

function resetScreenStates() {
  screenCatalog.forEach((screen) => {
    screenStates[screen.id] = {}
    screen.actions.forEach((action) => {
      screenStates[screen.id][action.id] = false
    })
  })
}

function initializeForm(profile) {
  form.id = profile?.id ?? null
  form.name = profile?.name ?? ''
  form.description = profile?.description ?? ''
  form.isDefault = Boolean(profile?.isDefault)

  resetScreenStates()
  processTypeSelections.splice(0, processTypeSelections.length)

  const existingPermissions = Array.isArray(profile?.permissions) ? profile.permissions : []

  existingPermissions.forEach((permission) => {
    const screen = screenCatalog.find((item) => item.id === permission.resource)
    const actionExists = screen?.actions.some((action) => action.id === permission.action)

    if (screen && actionExists) {
      screenStates[screen.id][permission.action] = true
    }
  })

  const existingProcessTypes = Array.isArray(profile?.processTypePermissions)
    ? profile.processTypePermissions
    : []

  existingProcessTypes.forEach((item) => {
    addProcessTypeSelection(item.processTypeId || '*')
  })
}

function normalizeProcessTypeId(value) {
  if (!value) return undefined
  if (typeof value === 'object') {
    return value.id ?? value.value ?? value.processTypeId ?? '*'
  }
  return value
}

function addProcessTypeSelection(processTypeId) {
  const normalizedId = normalizeProcessTypeId(processTypeId) ?? '*'
  const exists = processTypeSelections.some((item) => item.processTypeId === normalizedId)
  if (exists) return

  const label = processTypeLookup.value.get(normalizedId) || 'Tipo desconhecido'

  // Ao selecionar um tipo, SEMPRE tem ACESSO COMPLETO (view, create, execute)
  const base = {
    key: generateKey('process-type'),
    processTypeId: normalizedId,
    label,
    canView: true,
    canCreate: true,
    canExecute: true,
  }

  processTypeSelections.push(base)
}

function removeProcessType(key) {
  const index = processTypeSelections.findIndex((item) => item.key === key)
  if (index !== -1) {
    processTypeSelections.splice(index, 1)
  }
}

function removeProcessTypeById(processTypeId) {
  const index = processTypeSelections.findIndex((item) => item.processTypeId === processTypeId)
  if (index !== -1) {
    processTypeSelections.splice(index, 1)
  }
}

function selectedActionsCount(screenId) {
  return Object.values(screenStates[screenId] ?? {}).filter(Boolean).length
}

function selectedActionsSummary(screenId) {
  const screen = screenCatalog.find((item) => item.id === screenId)
  if (!screen) return 'Nenhuma ação selecionada'
  const actions = screen.actions
    .filter((action) => screenStates[screenId][action.id])
    .map((action) => action.label)
  return actions.length ? actions.join(', ') : 'Nenhuma ação selecionada'
}

function collectScreenPermissions() {
  const output = []

  screenCatalog.forEach((screen) => {
    screen.actions.forEach((action) => {
      if (screenStates[screen.id][action.id]) {
        output.push({
          resource: screen.id,
          action: action.id,
          scope: null,
        })
      }
    })
  })

  return output
}

async function handleSubmit() {
  if (!form.name.trim()) {
    window.showSnackbar?.('Informe o nome do perfil.', 'warning')
    return
  }

  try {
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      isDefault: Boolean(form.isDefault),
      permissions: collectScreenPermissions(),
      // Ao adicionar tipo de processo, SEMPRE tem acesso completo
      processTypes: processTypeSelections.map((item) => ({
        processTypeId: item.processTypeId || '*',
        canView: true,
        canCreate: true,
        canExecute: true,
      })),
    }

    emit('save', { id: form.id, payload })
  } catch (error) {
    window.showSnackbar?.(error.message ?? 'Erro ao validar as permissões.', 'error')
  }
}

function generateKey(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`
}

resetScreenStates()
</script>


<style scoped>
section + section {
  margin-top: 32px;
}

.process-type-combobox {
  max-width: 480px;
}

.process-type-list__row {
  margin: 0;
}

.process-type-card {
  border-radius: 14px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.process-type-card:hover {
  box-shadow: 0 12px 32px rgba(32, 90, 167, 0.14);
  transform: translateY(-2px);
}

.process-type-card__chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 960px) {
  .process-type-card__chips {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
