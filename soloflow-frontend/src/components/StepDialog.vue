<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900"
    persistent>
    <v-card class="step-dialog-card">
      <v-card-title class="d-flex align-center py-4 px-6 bg-primary">
        <v-icon class="mr-3" color="white">mdi-debug-step-over</v-icon>
        <span class="text-white font-weight-medium">{{ editingIndex !== null ? 'Editar' : 'Nova' }} Etapa</span>
      </v-card-title>

      <v-form ref="stepForm" v-model="stepValid">
        <v-card-text class="pa-6">
          <v-tabs v-model="tab" class="mb-6" color="primary" slider-color="primary">
            <v-tab value="basic">
              <v-icon start size="18">mdi-information</v-icon>
              Informações Básicas
            </v-tab>
            <v-tab value="instructions">
              <v-icon start size="18">mdi-text-box</v-icon>
              Instruções e Prazo
            </v-tab>
            <v-tab value="attachment">
              <v-icon start size="18">mdi-paperclip</v-icon>
              Anexos
            </v-tab>
            <v-tab v-if="localStepData.type === 'REVIEW'" value="review-config">
              <v-icon start size="18">mdi-file-search</v-icon>
              Revisão de Anexos
            </v-tab>
            <v-tab v-if="localStepData.type === 'INPUT'" value="input-config">
              <v-icon start size="18">mdi-form-textbox</v-icon>
              Formulário da Etapa
            </v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <v-window-item value="basic">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="localStepData.name" label="Nome da Etapa"
                    :rules="[v => !!v || 'Nome é obrigatório']" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="localStepData.type" :items="[
                    { title: 'Entrada de Dados', value: 'INPUT' },
                    { title: 'Aprovação', value: 'APPROVAL' },
                    { title: 'Upload de Arquivo', value: 'UPLOAD' },
                    { title: 'Revisão', value: 'REVIEW' }
                  ]" item-title="title" item-value="value" label="Tipo de Etapa" :rules="[v => !!v || 'Tipo é obrigatório']"
                    required />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="localStepData.description" label="Descrição" rows="2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="responsibleType"
                    :items="responsibleTypeOptions"
                    item-title="title"
                    item-value="value"
                    label="Tipo de Responsável"
                    @update:modelValue="onResponsibleTypeChange"
                  >
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props" :title="undefined" :subtitle="undefined">
                        <template v-slot:prepend>
                          <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                        </template>
                        <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption">{{ item.raw.description }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                      <div class="d-flex align-center">
                        <v-icon :color="item.raw.color" size="20" class="mr-2">{{ item.raw.icon }}</v-icon>
                        <span>{{ item.raw.title }}</span>
                      </div>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <!-- Autocomplete para usuário -->
                  <v-autocomplete
                    v-if="responsibleType === 'user'"
                    v-model="localStepData.assignedToUserId"
                    :items="users"
                    item-value="id"
                    item-title="name"
                    label="Usuário Responsável"
                    placeholder="Digite nome ou email..."
                    :custom-filter="customUserFilter"
                    clearable
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" :title="undefined" :subtitle="undefined">
                        <template v-slot:prepend>
                          <v-avatar :color="getAvatarColor(item.raw.name)" size="36">
                            <span class="text-caption font-weight-bold text-white">
                              {{ getInitials(item.raw.name) }}
                            </span>
                          </v-avatar>
                        </template>
                        <v-list-item-title class="font-weight-medium">
                          {{ item.raw.name }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption">
                          {{ item.raw.email }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                      <div class="d-flex align-center">
                        <v-avatar :color="getAvatarColor(item.raw.name)" size="24" class="mr-2">
                          <span style="font-size: 10px; font-weight: bold;" class="text-white">
                            {{ getInitials(item.raw.name) }}
                          </span>
                        </v-avatar>
                        <span>{{ item.raw.name }}</span>
                      </div>
                    </template>
                  </v-autocomplete>

                  <!-- Select para setor -->
                  <v-select
                    v-else-if="responsibleType === 'sector'"
                    v-model="localStepData.assignedToSectorId"
                    :items="sectors"
                    item-title="name"
                    item-value="id"
                    label="Setor Responsável"
                    clearable
                  />

                  <!-- Info para Criador do Processo -->
                  <v-alert
                    v-else-if="responsibleType === 'creator'"
                    type="info"
                    variant="tonal"
                    density="compact"
                  >
                    <v-icon start size="18">mdi-account-plus</v-icon>
                    A tarefa será atribuída automaticamente ao usuário que criou o processo.
                  </v-alert>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="instructions">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-text-box</v-icon>
                    Instruções para Execução
                  </h3>
                  <v-textarea v-model="localStepData.instructions" label="Instruções detalhadas"
                    placeholder="Descreva como executar esta etapa, quais informações são importantes, critérios de aprovação, etc."
                    rows="4" counter="2000" :rules="[v => !v || v.length <= 2000 || 'Máximo 2000 caracteres']"
                    hint="Texto que será exibido ao executar esta etapa para orientar o usuário" persistent-hint />
                </v-col>

                <v-col cols="12" md="6">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="warning" class="mr-2">mdi-calendar-clock</v-icon>
                    Prazo (SLA)
                  </h3>
                  <v-text-field v-model.number="localStepData.slaDays" label="Prazo em dias" type="number" min="1"
                    max="365" :rules="slaRules" hint="Tempo limite para conclusão desta etapa (1 a 365 dias)"
                    persistent-hint suffix="dias" required />
                </v-col>

                <v-col cols="12" md="6">
                  <v-alert v-if="localStepData.slaDays" type="info" variant="tonal" density="compact">
                    <v-icon start>mdi-information</v-icon>
                    Prazo: {{ formatSlaDescription(localStepData.slaDays) }}
                  </v-alert>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="attachment">
              <v-row>
                <v-col cols="12">
                  <v-switch
                    v-model="localStepData.allowAttachment"
                    label="Permitir anexos"
                    color="primary"
                    :disabled="localStepData.type === 'UPLOAD'"
                    hint="Etapas de Upload habilitam anexos automaticamente"
                    persistent-hint
                  />
                </v-col>

                <template v-if="localStepData.allowAttachment">
                  <v-col cols="12">
                    <v-switch v-model="localStepData.requireAttachment" label="Anexo obrigatório" color="error"
                      hint="Etapa não poderá ser concluída sem anexos" persistent-hint />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field v-model.number="localStepData.minAttachments" label="Número mínimo de anexos"
                      type="number" min="0" :rules="attachmentRules" />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field v-model.number="localStepData.maxAttachments" label="Número máximo de anexos"
                      type="number" min="1" :rules="attachmentRules" />
                  </v-col>

                  <v-col cols="12">
                    <v-select v-model="localStepData.allowedFileTypes" :items="fileTypes"
                      label="Tipos de arquivo permitidos" multiple chips closable-chips
                      hint="Deixe vazio para permitir todos os tipos" persistent-hint />
                  </v-col>

                  <template v-if="localStepData.type === 'UPLOAD'">
                    <v-divider class="my-4" />
                    <v-col cols="12">
                      <h4 class="text-subtitle-1 font-weight-medium mb-2">
                        Assinaturas dos documentos enviados
                      </h4>
                      <p class="text-body-2 text-medium-emphasis mb-3">
                        Defina se os arquivos anexados nesta etapa precisarão de assinatura digital e quem deverá assinar.
                      </p>
                      <v-switch
                        v-model="localStepData.requiresSignature"
                        label="Requer assinatura digital dos anexos"
                        color="primary"
                      />
                    </v-col>

                    <v-col cols="12" v-if="localStepData.requiresSignature">
                      <v-alert
                        v-if="signatureConfig.value.requirements.length === 0"
                        type="info"
                        variant="tonal"
                        class="mb-3"
                      >
                        Nenhum assinante configurado ainda. Clique em "Configurar assinantes" para definir a ordem, usuário ou setor responsável pela assinatura.
                      </v-alert>

                      <v-chip-group
                        v-else
                        multiple
                        class="mb-3 d-flex flex-wrap gap-2"
                      >
                        <v-chip
                          v-for="req in signatureConfig.value.requirements"
                          :key="req.tempId || `${req.order}-${req.userId || req.sectorId || 'all'}`"
                          size="small"
                          color="primary"
                          variant="tonal"
                        >
                          <v-icon start size="16">mdi-order-numeric-descending</v-icon>
                          {{ req.order }}. {{ getSignerDisplayName(req) }}
                        </v-chip>
                      </v-chip-group>

                      <div class="d-flex flex-wrap gap-2">
                        <v-btn
                          color="primary"
                          variant="elevated"
                          size="small"
                          @click="openSignatureRequirementsDialog"
                          prepend-icon="mdi-account-edit"
                        >
                          Configurar assinantes
                        </v-btn>
                        <v-btn
                          variant="text"
                          color="secondary"
                          size="small"
                          @click="signatureConfig.value.requirements = []"
                          prepend-icon="mdi-broom"
                          v-if="signatureConfig.value.requirements.length > 0"
                        >
                          Limpar lista
                        </v-btn>
                      </div>
                    </v-col>
                  </template>
                </template>
              </v-row>
            </v-window-item>

        <v-window-item value="review-config">
          <v-row>
            <v-col cols="12">
              <v-card variant="flat" class="mb-4 card-soft-border">
                <v-card-title class="d-flex align-center">
                  <v-icon start color="primary">mdi-note-text</v-icon>
                  Registro da Revisão
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-switch
                    v-model="localStepData.reviewSettings.enabled"
                    label="Capturar resumo da revisão nesta etapa"
                    color="primary"
                    hint="Ao habilitar, será exibido um campo para que o revisor registre o resultado desta etapa."
                    persistent-hint
                  />

                  <v-expand-transition>
                    <div v-if="localStepData.reviewSettings.enabled">
                      <v-row class="mt-2">
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="localStepData.reviewSettings.fieldLabel"
                            label="Rótulo exibido para o revisor"
                            :rules="[v => !!v?.trim() || 'Informe um rótulo']"
                            maxlength="80"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="localStepData.reviewSettings.fieldName"
                            label="Identificador interno"
                            hint="Usado para salvar o dado no processo (sem espaços ou acentos)"
                            persistent-hint
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-switch
                            v-model="localStepData.reviewSettings.required"
                            label="Campo obrigatório"
                            color="primary"
                          />
                        </v-col>
                        <v-col cols="12">
                          <v-textarea
                            v-model="localStepData.reviewSettings.hint"
                            label="Dica/Orientação ao revisor (opcional)"
                            rows="2"
                            counter="200"
                          />
                        </v-col>
                      </v-row>
                    </div>
                  </v-expand-transition>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12">
              <v-card variant="flat" class="card-soft-border">
                <v-card-title class="d-flex align-center">
                  <v-icon start color="primary">mdi-file-search</v-icon>
                  Reutilização de Anexos
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Escolha de quais etapas anteriores os anexos serão reaproveitados durante esta revisão.
                    Apenas etapas anteriores que coletam arquivos podem ser selecionadas.
                  </p>

                  <v-alert
                    v-if="reviewAttachmentOptions.length === 0"
                    type="info"
                    variant="tonal"
                    class="mb-4"
                  >
                    Nenhuma etapa anterior com anexos disponível. Adicione uma etapa de upload antes desta etapa de revisão.
                  </v-alert>

                  <v-select
                    v-else
                    v-model="reviewAttachmentSelection"
                    :items="reviewAttachmentOptions"
                    item-title="title"
                    item-value="value"
                    label="Etapas com anexos"
                    multiple
                    chips
                    closable-chips
                    hint="Os anexos selecionados serão exibidos automaticamente durante a revisão."
                    persistent-hint
                  />
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

            <v-window-item value="input-config">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4">Formulário Específico da Etapa</h3>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configure campos específicos que serão exibidos apenas nesta etapa de entrada de dados.
                    Estes campos são independentes do formulário principal do processo.
                  </p>

                  <v-card variant="flat" class="mb-4 card-soft-border">
                    <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between">
                      <span>
                        <v-icon start color="primary">mdi-form-textbox</v-icon>
                        Campos da Etapa ({{ inputConfig.fields.length }})
                      </span>
                      <v-btn color="primary" size="small" @click="addInputField" prepend-icon="mdi-plus">
                        Adicionar Campo
                      </v-btn>
                    </v-card-title>

                    <v-card-text v-if="inputConfig.fields.length === 0" class="text-center py-6">
                      <v-icon size="48" color="grey-lighten-1">mdi-form-select</v-icon>
                      <p class="text-body-1 text-grey mt-2">Nenhum campo específico</p>
                      <p class="text-body-2 text-grey">
                        Adicione campos que aparecerão apenas nesta etapa
                      </p>
                    </v-card-text>

                    <v-list v-else lines="two" class="py-0">
                      <template v-for="(field, index) in inputConfig.fields" :key="field.tempId || index">
                        <v-list-item>
                          <template #prepend>
                            <v-avatar :color="getFieldTypeColor(field.type)" size="36">
                              <v-icon :icon="getFieldTypeIcon(field.type)" size="18" />
                            </v-avatar>
                          </template>

                          <v-list-item-title class="font-weight-medium">
                            {{ field.label }}
                            <v-chip v-if="field.required" size="x-small" color="error" class="ml-2">
                              Obrigatório
                            </v-chip>
                          </v-list-item-title>

                          <v-list-item-subtitle>
                            Nome: {{ field.name }} • Tipo: {{ getFieldTypeText(field.type) }}
                            <span v-if="field.placeholder"> • Placeholder: {{ field.placeholder }}</span>
                          </v-list-item-subtitle>

                          <template #append>
                            <v-btn icon="mdi-pencil" size="small" variant="text" @click="editInputField(index)" />
                            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeInputField(index)" />
                          </template>
                        </v-list-item>
                        <v-divider v-if="index < inputConfig.fields.length - 1" />
                      </template>
                    </v-list>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

          </v-window>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="close" class="mr-2">
            Cancelar
          </v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!stepValid" @click="save" prepend-icon="mdi-check">
            {{ editingIndex !== null ? 'Salvar Alterações' : 'Adicionar Etapa' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <v-dialog v-model="fieldDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo do Formulário
        </v-card-title>
        <v-divider />

        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="fieldData.name" 
                  label="Nome do Campo" 
                  :rules="[
                    v => !!v || 'Nome é obrigatório',
                    v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e _'
                  ]"
                  hint="Ex: valor_total, data_vencimento"
                  persistent-hint
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="fieldData.label" 
                  label="Rótulo" 
                  :rules="[v => !!v || 'Rótulo é obrigatório']"
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select 
                  v-model="fieldData.type" 
                  :items="fieldTypes" 
                  label="Tipo do Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']"
                  required 
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="fieldData.required" label="Campo Obrigatório" color="primary" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.placeholder" label="Placeholder" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.defaultValue" label="Valor Padrão" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="fieldData.helpText" label="Texto de Ajuda" rows="2" />
              </v-col>

              <!-- Opções para Lista Suspensa -->
              <v-col v-if="fieldData.type === 'DROPDOWN'" cols="12">
                <v-divider class="my-4" />
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h4 class="text-h6 mb-1">Opções da Lista Suspensa</h4>
                    <p class="text-caption text-medium-emphasis">Configure as opções que aparecerão no campo</p>
                  </div>
                  <v-btn
                    color="primary"
                    size="small"
                    prepend-icon="mdi-plus"
                    variant="elevated"
                    @click="addDropdownOption"
                  >
                    Adicionar Opção
                  </v-btn>
                </div>

                <v-alert v-if="!fieldData.options || fieldData.options.length === 0"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                  icon="mdi-information"
                >
                  Clique em "Adicionar Opção" para criar as opções da lista suspensa
                </v-alert>

                <div v-if="fieldData.options && fieldData.options.length > 0" class="options-container">
                  <v-card
                    v-for="(option, idx) in fieldData.options"
                    :key="idx"
                    variant="outlined"
                    class="mb-3 pa-3"
                  >
                    <v-row dense align="center">
                      <v-col cols="12" sm="5">
                        <v-text-field
                          v-model="option.label"
                          label="Texto exibido ao usuário"
                          density="comfortable"
                          variant="outlined"
                          hide-details="auto"
                          :rules="[v => !!v?.trim() || 'Campo obrigatório']"
                          prepend-inner-icon="mdi-format-text"
                        />
                      </v-col>
                      <v-col cols="12" sm="5">
                        <v-text-field
                          v-model="option.value"
                          label="Valor interno (identificador)"
                          density="comfortable"
                          variant="outlined"
                          hide-details="auto"
                          :rules="[v => !!v?.trim() || 'Campo obrigatório']"
                          prepend-inner-icon="mdi-code-tags"
                        />
                      </v-col>
                      <v-col cols="12" sm="2" class="text-center">
                        <v-btn
                          icon="mdi-delete"
                          size="small"
                          color="error"
                          variant="tonal"
                          @click="removeDropdownOption(idx)"
                        />
                      </v-col>
                    </v-row>
                  </v-card>
                </div>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeFieldDialog">Cancelar</v-btn>
            <v-btn color="primary" variant="elevated" :disabled="!fieldValid" @click="saveInputField">
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de Configuração de Assinantes -->
    <SignatureRequirementsDialog
      v-model="signatureRequirementsDialog"
      :initial-requirements="signatureConfig.requirements"
      :users="users"
      :sectors="sectors"
      @save="saveSignatureRequirements"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SignatureRequirementsDialog from './SignatureRequirementsDialog.vue'
import StepTransitionEditor from './StepTransitionEditor.vue'

const props = defineProps({
  modelValue: Boolean,
  stepData: Object,
  editingIndex: Number,
  sectors: Array,
  users: Array,
  steps: Array,
  formFields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const stepValid = ref(false)
const fieldValid = ref(false)
const tab = ref('basic')
const responsibleType = ref('sector')
const fieldDialog = ref(false)
const editingFieldIndex = ref(null)
const signatureRequirementsDialog = ref(false)

const localStepData = ref(getEmptyStepData())

const inputConfig = ref({
  fields: []
})

const signatureConfig = ref({
  requirements: []
})

function getDefaultReviewSettings() {
  return {
    enabled: true,
    fieldName: 'reviewNotes',
    fieldLabel: 'Notas da Revisão',
    required: false,
    hint: ''
  }
}

function cloneReviewSettings(settings) {
  if (!settings) return getDefaultReviewSettings()
  const parsed = typeof settings === 'string'
    ? (() => { try { return JSON.parse(settings) } catch { return {} } })()
    : settings
  return {
    enabled: parsed.enabled ?? true,
    fieldName: parsed.fieldName || 'reviewNotes',
    fieldLabel: parsed.fieldLabel || 'Notas da Revisão',
    required: Boolean(parsed.required),
    hint: parsed.hint || ''
  }
}

function sanitizeFieldIdentifier(value, fallback = 'reviewNotes') {
  if (!value) return fallback
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '') || fallback
}

const reviewAttachmentSelection = ref([])

const fieldData = ref({
  name: '',
  label: '',
  type: 'TEXT',
  required: false,
  placeholder: '',
  defaultValue: '',
  helpText: ''
})

const fieldTypes = [
  { title: 'Texto', value: 'TEXT' },
  { title: 'Número', value: 'NUMBER' },
  { title: 'Data', value: 'DATE' },
  { title: 'E-mail', value: 'EMAIL' },
  { title: 'CPF', value: 'CPF' },
  { title: 'CNPJ', value: 'CNPJ' },
  { title: 'Telefone', value: 'PHONE' },
  { title: 'Lista Suspensa', value: 'DROPDOWN' },
  { title: 'Área de Texto', value: 'TEXTAREA' },
  { title: 'Moeda', value: 'CURRENCY' },
  { title: 'Arquivo', value: 'FILE' }
]

const responsibleTypeOptions = [
  {
    value: 'creator',
    title: 'Criador do Processo',
    icon: 'mdi-account-plus',
    color: 'purple',
    description: 'Atribuído automaticamente a quem iniciou o processo'
  },
  {
    value: 'user',
    title: 'Usuário Específico',
    icon: 'mdi-account',
    color: 'blue',
    description: 'Selecione um usuário específico'
  },
  {
    value: 'sector',
    title: 'Setor',
    icon: 'mdi-office-building',
    color: 'teal',
    description: 'Qualquer usuário do setor pode executar'
  }
]

function resolveStepOrder(step, index) {
  if (step?.order) return step.order
  return index + 1
}

function toArray(value, fallback = []) {
  if (value === null || value === undefined) return [...fallback]
  if (Array.isArray(value)) return [...value]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [...fallback]
    } catch {
      return [...fallback]
    }
  }
  return [...fallback]
}

function toObject(value, fallback = {}) {
  if (!value) return { ...fallback }
  if (typeof value === 'object') return { ...fallback, ...value }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null ? { ...fallback, ...parsed } : { ...fallback }
    } catch {
      return { ...fallback }
    }
  }
  return { ...fallback }
}

function getEmptyStepData() {
  return {
    name: '',
    description: '',
    type: 'INPUT',
    instructions: '',
    slaDays: null,
    allowAttachment: false,
    requiresSignature: false,
    requireAttachment: false,
    minAttachments: null,
    maxAttachments: null,
    allowedFileTypes: [],
    actions: [],
    assignedToUserId: null,
    assignedToSectorId: null,
    assignedToCreator: false,
    assignmentConditions: null,
    conditions: {},
    flowConditions: [],
    reuseData: [],
    reviewSettings: getDefaultReviewSettings()
  }
}

const orderedSteps = computed(() =>
  (props.steps || []).map((step, index) => ({
    id: step.id ?? step.tempId ?? index,
    name: step.name || `Etapa ${index + 1}`,
    type: step.type || 'INPUT',
    order: resolveStepOrder(step, index),
    allowAttachment: Boolean(step.allowAttachment),
    actions: toArray(step.actions),
    conditions: step.conditions ?? {},
    reuseData: toArray(step.reuseData),
    flowConditions: toArray(step.flowConditions)
  }))
)

const currentStepOrder = computed(() => {
  if (props.stepData?.order) return props.stepData.order
  if (props.editingIndex !== undefined && props.editingIndex !== null) {
    const step = orderedSteps.value[props.editingIndex]
    if (step) return step.order
  }
  return orderedSteps.value.length + 1
})

const availableStepsForTransitions = computed(() => orderedSteps.value)

function extractFieldsFromConditions(rawConditions, stepLabel) {
  const parsed = toObject(rawConditions, {})
  if (!Array.isArray(parsed.fields)) return []
  return parsed.fields.map(field => ({
    name: field.name,
    label: field.label || field.name,
    type: field.type || 'TEXT',
    source: stepLabel
  }))
}

const availableFieldsForConditions = computed(() => {
  const fields = []

  if (Array.isArray(props.formFields)) {
    props.formFields.forEach(field => {
      fields.push({
        name: field.name,
        label: field.label || field.name,
        type: field.type || 'TEXT',
        source: 'Formulário principal'
      })
    })
  }

  orderedSteps.value.forEach(step => {
    extractFieldsFromConditions(step.conditions, `${step.order}. ${step.name}`).forEach(f => fields.push(f))
  })

  if (localStepData.value.type === 'INPUT' && Array.isArray(inputConfig.value.fields)) {
    inputConfig.value.fields.forEach(field => {
      fields.push({
        name: field.name,
        label: field.label || field.name,
        type: field.type || 'TEXT',
        source: 'Campos desta etapa'
      })
    })
  }

  return fields
})

// Opções de campos de arquivo para reutilização em etapas de revisão
const reviewAttachmentOptions = computed(() => {
  const options = []

  // Campos FILE do formulário principal
  if (Array.isArray(props.formFields)) {
    const formFileFields = props.formFields.filter(f => f.type === 'FILE')
    
    if (formFileFields.length > 0) {
      // Adicionar header do grupo
      if (formFileFields.length === 1) {
        // Se só tem 1 campo, adicionar direto
        options.push({
          title: `📋 Formulário: ${formFileFields[0].label || formFileFields[0].name}`,
          value: JSON.stringify({ source: 'form', fieldName: formFileFields[0].name })
        })
      } else {
        // Se tem múltiplos, adicionar cada um
        formFileFields.forEach(field => {
          options.push({
            title: `📋 Formulário: ${field.label || field.name}`,
            value: JSON.stringify({ source: 'form', fieldName: field.name })
          })
        })
      }
    }
  }

  // Etapas anteriores com anexos
  orderedSteps.value
    .filter(step => step.order < currentStepOrder.value)
    .forEach(step => {
      const stepConditions = toObject(step.conditions, {})
      const hasFileFields = Array.isArray(stepConditions.fields) && 
                           stepConditions.fields.some(f => f.type === 'FILE')
      const hasAttachments = step.allowAttachment || step.type === 'UPLOAD'
      
      // Se a etapa tem campos FILE específicos, listar cada um
      if (hasFileFields) {
        stepConditions.fields
          .filter(f => f.type === 'FILE')
          .forEach(field => {
            options.push({
              title: `${step.order}. ${step.name}: ${field.label || field.name}`,
              value: JSON.stringify({ sourceStep: step.order, fieldName: field.name, type: 'attachment' })
            })
          })
      }
      
      // Se a etapa permite anexos gerais (não campos específicos), adicionar opção "todos"
      if (hasAttachments && !hasFileFields) {
        options.push({
          title: `${step.order}. ${step.name}`,
          value: JSON.stringify({ sourceStep: step.order, type: 'attachment' })
        })
      }
    })

  return options
})

const fileTypes = [
  { title: 'PDF', value: 'application/pdf' },
  { title: 'Imagens (JPG, PNG)', value: 'image/*' },
  { title: 'Word', value: '.doc,.docx' },
  { title: 'Excel', value: '.xls,.xlsx' },
  { title: 'Texto', value: 'text/plain' }
]

const slaRules = computed(() => {
  return [
    v => !!v || 'Prazo é obrigatório',
    v => !v || (v >= 1 && v <= 365) || 'Prazo deve estar entre 1 e 365 dias',
    v => !v || Number.isInteger(Number(v)) || 'Prazo deve ser um número inteiro'
  ]
})

const attachmentRules = computed(() => {
  return [
    () => {
      const min = localStepData.value.minAttachments
      const max = localStepData.value.maxAttachments
      if (min && max && min > max) {
        return 'Mínimo não pode ser maior que máximo'
      }
      return true
    }
  ]
})

function formatSlaDescription(days) {
  if (!days) return ''
  if (days === 1) return '1 dia'
  if (days <= 7) return `${days} dias`
  if (days <= 30) {
    const weeks = Math.floor(days / 7)
    const remainingDays = days % 7
    let result = `${weeks} semana${weeks > 1 ? 's' : ''}`
    if (remainingDays > 0) {
      result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`
    }
    return result
  }
  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  let result = `${months} mês${months > 1 ? 'es' : ''}`
  if (remainingDays > 0) {
    result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`
  }
  return result
}

function getFieldTypeColor(type) {
  const colors = {
    TEXT: 'blue',
    NUMBER: 'green', 
    DATE: 'orange',
    EMAIL: 'purple',
    DROPDOWN: 'teal',
    CURRENCY: 'amber'
  }
  return colors[type] || 'grey'
}

function getFieldTypeIcon(type) {
  const icons = {
    TEXT: 'mdi-format-text',
    NUMBER: 'mdi-numeric',
    DATE: 'mdi-calendar',
    EMAIL: 'mdi-email',
    CPF: 'mdi-card-account-details',
    CNPJ: 'mdi-domain',
    PHONE: 'mdi-phone',
    DROPDOWN: 'mdi-menu-down',
    TEXTAREA: 'mdi-text-long',
    CURRENCY: 'mdi-currency-brl'
  }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

function onResponsibleTypeChange(newType) {
  localStepData.value.assignedToUserId = null
  localStepData.value.assignedToSectorId = null
  localStepData.value.assignedToCreator = newType === 'creator'
}

// Funções para assinaturas
const sortedSignatureRequirements = computed(() => {
  return [...signatureConfig.value.requirements].sort((a, b) => a.order - b.order)
})

function openSignatureRequirementsDialog() {
  signatureRequirementsDialog.value = true
}

function saveSignatureRequirements(requirements) {
  signatureConfig.value.requirements = requirements
}

function getSignerDisplayName(req) {
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

function addInputField() {
  resetFieldData()
  fieldDialog.value = true
}

function editInputField(index) {
  editingFieldIndex.value = index
  fieldData.value = { ...inputConfig.value.fields[index] }
  fieldDialog.value = true
}

function removeInputField(index) {
  inputConfig.value.fields.splice(index, 1)
}

function resetFieldData() {
  editingFieldIndex.value = null
  fieldData.value = {
    name: '',
    label: '',
    type: 'TEXT',
    required: false,
    placeholder: '',
    defaultValue: '',
    helpText: ''
  }
}

function closeFieldDialog() {
  fieldDialog.value = false
  resetFieldData()
}

// Dropdown options management
function addDropdownOption() {
  if (!fieldData.value.options) {
    fieldData.value.options = []
  }
  fieldData.value.options.push({ label: '', value: '' })
}

function removeDropdownOption(index) {
  fieldData.value.options.splice(index, 1)
}

function saveInputField() {
  if (!fieldValid.value) return

  // Validar opções para DROPDOWN
  if (fieldData.value.type === 'DROPDOWN') {
    if (!fieldData.value.options || fieldData.value.options.length === 0) {
      window.showSnackbar?.('Adicione pelo menos uma opção para a lista suspensa', 'error')
      return
    }

    // Validar se todas as opções têm label e value
    const hasEmptyOptions = fieldData.value.options.some(opt => !opt.label?.trim() || !opt.value?.trim())
    if (hasEmptyOptions) {
      window.showSnackbar?.('Todas as opções devem ter texto exibido e valor interno preenchidos', 'error')
      return
    }
  }

  const field = {
    ...fieldData.value,
    tempId: editingFieldIndex.value !== null
      ? inputConfig.value.fields[editingFieldIndex.value].tempId
      : Date.now() + Math.random()
  }

  if (editingFieldIndex.value !== null) {
    inputConfig.value.fields[editingFieldIndex.value] = field
  } else {
    inputConfig.value.fields.push(field)
  }

  closeFieldDialog()
}

function close() {
  emit('close')
  emit('update:modelValue', false)
}

function save() {
  if (!stepValid.value) return

  if (!localStepData.value.allowAttachment) {
    localStepData.value.requireAttachment = false
    localStepData.value.minAttachments = null
    localStepData.value.maxAttachments = null
    localStepData.value.allowedFileTypes = []
  }

  const stepToSave = { ...localStepData.value }

  // Garantir que assignedToCreator seja mantido corretamente
  // Se for criador, limpar assignedToUserId e assignedToSectorId
  if (responsibleType.value === 'creator') {
    stepToSave.assignedToCreator = true
    stepToSave.assignedToUserId = null
    stepToSave.assignedToSectorId = null
  } else {
    stepToSave.assignedToCreator = false
  }

  console.log('💾 Salvando etapa com responsável:', {
    responsibleType: responsibleType.value,
    assignedToCreator: stepToSave.assignedToCreator,
    assignedToUserId: stepToSave.assignedToUserId,
    assignedToSectorId: stepToSave.assignedToSectorId
  })

  if (stepToSave.slaDays) {
    stepToSave.slaHours = stepToSave.slaDays * 24
    delete stepToSave.slaDays
  }

  if (stepToSave.type === 'INPUT' && inputConfig.value.fields.length > 0) {
    stepToSave.conditions = {
      fields: inputConfig.value.fields
    }
  } else if (stepToSave.type === 'APPROVAL') {
    stepToSave.actions = ['aprovar', 'reprovar']
    stepToSave.conditions = {
      requireJustification: true
    }
  } else {
    stepToSave.conditions = null
  }

  if (!Array.isArray(stepToSave.flowConditions)) {
    stepToSave.flowConditions = []
  }

  if (stepToSave.type === 'REVIEW') {
    console.log('💾 Saving REVIEW step')
    console.log('📋 localStepData.reuseData:', localStepData.value.reuseData)
    console.log('📋 reviewAttachmentSelection:', reviewAttachmentSelection.value)
    
    stepToSave.reuseData = Array.isArray(localStepData.value.reuseData) && localStepData.value.reuseData.length > 0
      ? [...localStepData.value.reuseData]
      : []
    
    console.log('✅ Final reuseData to save:', stepToSave.reuseData)
  } else if (!Array.isArray(stepToSave.reuseData)) {
    stepToSave.reuseData = []
  }

  if (stepToSave.type === 'REVIEW') {
    console.log('💾 Saving REVIEW settings')
    console.log('📋 localStepData.reviewSettings:', localStepData.value.reviewSettings)
    
    const reviewSettings = cloneReviewSettings(localStepData.value.reviewSettings)
    if (reviewSettings.enabled) {
      const fieldName = sanitizeFieldIdentifier(reviewSettings.fieldName, 'reviewNotes')
      stepToSave.reviewSettings = {
        enabled: true,
        fieldName,
        fieldLabel: reviewSettings.fieldLabel?.trim() || 'Notas da Revisão',
        required: Boolean(reviewSettings.required),
        hint: reviewSettings.hint?.trim() || ''
      }
      localStepData.value.reviewSettings = { ...stepToSave.reviewSettings }
      console.log('✅ Final reviewSettings to save:', stepToSave.reviewSettings)
    } else {
      stepToSave.reviewSettings = null
      console.log('⚠️ reviewSettings disabled, saving null')
    }
  } else {
    stepToSave.reviewSettings = null
  }

  // Adicionar configurações de assinatura - APENAS para etapas UPLOAD ou SIGNATURE
  // Etapas INPUT, APPROVAL, REVIEW não devem ter requisitos de assinatura
  const allowsSignature = stepToSave.type === 'UPLOAD' || stepToSave.type === 'SIGNATURE'
  if (allowsSignature && (stepToSave.requiresSignature || stepToSave.type === 'SIGNATURE')) {
    stepToSave.signatureRequirements = signatureConfig.value.requirements
  } else {
    // Limpar assinaturas para tipos de etapa que não suportam
    stepToSave.signatureRequirements = []
    stepToSave.requiresSignature = false
  }

  emit('save', stepToSave)
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) return

  if (props.stepData) {
    console.log('🔄 Modal opened with stepData:', props.stepData)
    console.log('📦 reuseData from props:', props.stepData.reuseData)
    console.log('📦 reviewSettings from props:', props.stepData.reviewSettings)
    
    const normalizedConditions = toObject(props.stepData.conditions, {})
    const normalizedActions = toArray(props.stepData.actions)
    const normalizedAllowedFiles = toArray(props.stepData.allowedFileTypes)
    const normalizedFlow = toArray(props.stepData.flowConditions)
    const normalizedReuse = toArray(props.stepData.reuseData)
    const normalizedSignatures = toArray(props.stepData.signatureRequirements)

    localStepData.value = {
      ...getEmptyStepData(),
      ...props.stepData,
      actions: normalizedActions,
      allowedFileTypes: normalizedAllowedFiles,
      conditions: normalizedConditions,
      flowConditions: normalizedFlow,
      reuseData: normalizedReuse,
      reviewSettings: cloneReviewSettings(props.stepData.reviewSettings)
    }

    if (props.stepData.slaHours) {
      localStepData.value.slaDays = Math.ceil(props.stepData.slaHours / 24)
    }

    // Determinar o tipo de responsável baseado nos dados
    console.log('📋 Carregando etapa:', {
      name: props.stepData.name,
      assignedToCreator: props.stepData.assignedToCreator,
      assignedToUserId: props.stepData.assignedToUserId,
      assignedToSectorId: props.stepData.assignedToSectorId
    })

    if (props.stepData.assignedToCreator) {
      responsibleType.value = 'creator'
      localStepData.value.assignedToCreator = true
      localStepData.value.assignedToUserId = null
      localStepData.value.assignedToSectorId = null
      console.log('✅ Responsável definido como CRIADOR')
    } else if (props.stepData.assignedToUserId) {
      responsibleType.value = 'user'
      localStepData.value.assignedToCreator = false
      console.log('✅ Responsável definido como USUÁRIO:', props.stepData.assignedToUserId)
    } else {
      responsibleType.value = 'sector'
      localStepData.value.assignedToCreator = false
      console.log('✅ Responsável definido como SETOR:', props.stepData.assignedToSectorId)
    }

    if (localStepData.value.type === 'INPUT') {
      inputConfig.value = {
        fields: Array.isArray(normalizedConditions.fields) ? [...normalizedConditions.fields] : []
      }
    } else {
      inputConfig.value = { fields: [] }
    }

    signatureConfig.value = {
      requirements: normalizedSignatures
    }

    // Carregar seleções de reutilização de anexos no novo formato
    console.log('📦 normalizedReuse:', normalizedReuse)
    console.log('📦 props.stepData.reuseData:', props.stepData.reuseData)
    
    reviewAttachmentSelection.value = normalizedReuse
      .filter(item => item && item.type === 'attachment')
      .map(item => {
        if (item.source === 'form') {
          return JSON.stringify({ source: 'form', fieldName: item.fieldName })
        }
        if (item.fieldName) {
          return JSON.stringify({ sourceStep: item.sourceStep, fieldName: item.fieldName })
        }
        return JSON.stringify({ sourceStep: item.sourceStep })
      })
    
    console.log('✅ reviewAttachmentSelection loaded:', reviewAttachmentSelection.value)
  } else {
    localStepData.value = getEmptyStepData()
    responsibleType.value = 'creator'  // Padrão: Criador do Processo
    inputConfig.value = { fields: [] }
    signatureConfig.value = { requirements: [] }
    reviewAttachmentSelection.value = []
  }

  if (localStepData.value.type === 'UPLOAD') {
    localStepData.value.allowAttachment = true
  }

  if (localStepData.value.type !== 'REVIEW') {
    reviewAttachmentSelection.value = []
    localStepData.value.reuseData = []
  }

  tab.value = localStepData.value.type === 'REVIEW' ? 'review-config' : 'basic'
})

watch(() => localStepData.value.allowAttachment, (newValue) => {
  if (!newValue) {
    localStepData.value.requireAttachment = false
  }
})

watch(() => localStepData.value.requiresSignature, (newValue) => {
  if (!newValue && localStepData.value.type !== 'SIGNATURE') {
    signatureConfig.value.requirements = []
  }
})

watch(() => localStepData.value.type, (newType) => {
  if (newType !== 'INPUT') {
    inputConfig.value.fields = []
  }

  if (newType === 'UPLOAD') {
    localStepData.value.allowAttachment = true
  }

  if (newType !== 'REVIEW') {
    reviewAttachmentSelection.value = []
    localStepData.value.reuseData = []
    if (tab.value === 'review-config') {
      tab.value = 'basic'
    }
  } else {
    if (!localStepData.value.reviewSettings) {
      localStepData.value.reviewSettings = getDefaultReviewSettings()
    }
    localStepData.value.reviewSettings.fieldName = sanitizeFieldIdentifier(
      localStepData.value.reviewSettings.fieldName,
      'reviewNotes'
    )
    tab.value = 'review-config'
  }
})

watch(
  () => localStepData.value.reviewSettings?.fieldName,
  (value) => {
    if (!localStepData.value.reviewSettings) return
    const sanitized = sanitizeFieldIdentifier(value, 'reviewNotes')
    if (sanitized !== value) {
      localStepData.value.reviewSettings.fieldName = sanitized
    }
  }
)

watch(
  () => localStepData.value.reviewSettings?.fieldLabel,
  (value) => {
    if (!localStepData.value.reviewSettings) return
    if (!value || !value.trim()) {
      localStepData.value.reviewSettings.fieldLabel = 'Notas da Revisão'
    }
  }
)

watch(reviewAttachmentSelection, (selected) => {
  if (localStepData.value.type !== 'REVIEW') return
  
  console.log('🔄 reviewAttachmentSelection changed:', selected)
  
  const existing = Array.isArray(localStepData.value.reuseData)
    ? localStepData.value.reuseData.filter(item => item?.type !== 'attachment')
    : []
  
  // Converter seleções JSON de volta para objetos de reutilização
  const attachments = selected.map(jsonStr => {
    try {
      const config = JSON.parse(jsonStr)
      console.log('📦 Parsed config:', config)
      return {
        type: 'attachment',
        ...config
      }
    } catch {
      console.warn('⚠️ Failed to parse:', jsonStr)
      return { type: 'attachment', sourceStep: jsonStr }
    }
  })
  
  localStepData.value.reuseData = [...existing, ...attachments]
  console.log('✅ Updated reuseData:', localStepData.value.reuseData)
})

watch(reviewAttachmentOptions, (options) => {
  if (localStepData.value.type !== 'REVIEW') return
  const allowed = new Set(options.map(option => option.value))
  const filtered = reviewAttachmentSelection.value.filter(value => allowed.has(value))
  if (filtered.length !== reviewAttachmentSelection.value.length) {
    reviewAttachmentSelection.value = filtered
  }
})

// ============================================================
// 🎯 FUNÇÕES AUXILIARES PARA UX PROFISSIONAL
// ============================================================

/**
 * Retorna as iniciais do nome para avatares
 */
function getInitials(name) {
  if (!name) return '??'

  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Gera uma cor consistente baseada no nome
 */
function getAvatarColor(name) {
  if (!name) return 'grey'

  const colors = [
    'blue', 'indigo', 'purple', 'pink', 'red',
    'orange', 'amber', 'lime', 'green', 'teal',
    'cyan', 'blue-grey', 'deep-purple', 'deep-orange'
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Filtro customizado que busca por nome OU email
 */
function customUserFilter(itemText, queryText, item) {
  if (!queryText) return true

  const query = queryText.toLowerCase()
  const name = item.raw.name?.toLowerCase() || ''
  const email = item.raw.email?.toLowerCase() || ''

  return name.includes(query) || email.includes(query)
}
</script>

<style scoped>
.step-dialog-card {
  border-radius: 12px;
  overflow: hidden;
}

.card-soft-border {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: 8px;
}

.step-dialog-card :deep(.v-field) {
  border-radius: 8px;
}

.step-dialog-card :deep(.v-field--variant-outlined .v-field__outline__start),
.step-dialog-card :deep(.v-field--variant-outlined .v-field__outline__end),
.step-dialog-card :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.step-dialog-card :deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  border-color: rgba(0, 0, 0, 0.12);
}

.step-dialog-card :deep(.v-field--focused .v-field__outline__start),
.step-dialog-card :deep(.v-field--focused .v-field__outline__end),
.step-dialog-card :deep(.v-field--focused .v-field__outline__notch::before),
.step-dialog-card :deep(.v-field--focused .v-field__outline__notch::after) {
  border-color: rgb(var(--v-theme-primary));
}

.v-expansion-panel-title {
  font-size: 0.875rem;
}

.v-card-title {
  font-size: 1rem;
  font-weight: 500;
}

:deep(.v-tabs) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

:deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  letter-spacing: normal;
}
</style>
