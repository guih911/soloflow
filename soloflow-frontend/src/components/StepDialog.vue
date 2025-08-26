<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="1000"
    persistent scrollable>
    <v-card>
      <v-card-title>
        {{ editingIndex !== null ? 'Editar' : 'Nova' }} Etapa
      </v-card-title>
      <v-divider />

      <v-form ref="stepForm" v-model="stepValid">
        <v-card-text>
          <v-tabs v-model="tab" class="mb-4">
            <v-tab value="basic">Informações Básicas</v-tab>
            <v-tab value="assignment">Responsável</v-tab>
            <v-tab value="instructions">Instruções e Prazo</v-tab>
            <v-tab value="attachment">Anexos</v-tab>
            <v-tab value="flow">Fluxo e Condições</v-tab>
            <v-tab v-if="localStepData.type === 'INPUT'" value="input-config">
              Formulário da Etapa
            </v-tab>
            <v-tab value="reuse-data">Reutilização de Dados</v-tab>
          </v-tabs>

          <v-window v-model="tab">
            <!-- Aba: Informações Básicas -->
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
                    { title: 'Revisão', value: 'REVIEW' },
                    { title: 'Assinatura', value: 'SIGNATURE' }
                  ]" item-title="title" item-value="value" label="Tipo de Etapa"
                    :rules="[v => !!v || 'Tipo é obrigatório']" required @update:model-value="onStepTypeChange" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="localStepData.description" label="Descrição" rows="2" />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="localStepData.requiresSignature" label="Requer assinatura digital" color="primary"
                    hint="O usuário deverá assinar digitalmente os documentos" persistent-hint />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Aba: Responsável -->
            <v-window-item value="assignment">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-account-check</v-icon>
                    Definir Responsável pela Etapa
                  </h3>
                  <p class="text-body-2 text-medium-emphasis mb-6">
                    Configure quem será responsável por executar esta etapa do processo.
                  </p>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select v-model="responsibleType" :items="[
                    { title: 'Usuário Específico', value: 'user', icon: 'mdi-account' },
                    { title: 'Setor', value: 'sector', icon: 'mdi-office-building' },
                    { title: 'Criador do Processo', value: 'creator', icon: 'mdi-account-plus' },
                    { title: 'Condicional', value: 'conditional', icon: 'mdi-code-braces' }
                  ]" label="Tipo de Responsável" @update:model-value="onResponsibleTypeChange">
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-icon>{{ item.raw.icon }}</v-icon>
                        </template>
                        <v-list-item-title>{{ item.title }}</v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <!-- Usuário Específico -->
                  <v-select v-if="responsibleType === 'user'" v-model="localStepData.assignedToUserId" :items="users"
                    item-title="name" item-value="id" label="Usuário Responsável" clearable>
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-avatar size="32" color="primary">
                            <span class="text-caption">{{ getInitials(item.raw.name) }}</span>
                          </v-avatar>
                        </template>
                        <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>

                  <!-- Setor -->
                  <v-select v-else-if="responsibleType === 'sector'" v-model="localStepData.assignedToSectorId"
                    :items="sectors" item-title="name" item-value="id" label="Setor Responsável" clearable>
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-icon>mdi-office-building</v-icon>
                        </template>
                        <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>

                  <!-- Criador do Processo -->
                  <v-alert v-else-if="responsibleType === 'creator'" type="info" variant="tonal">
                    <v-icon start>mdi-account-plus</v-icon>
                    <div>
                      <div class="font-weight-medium">Criador do Processo</div>
                      <div class="mt-1">Esta etapa será automaticamente atribuída ao usuário que iniciou o processo.
                      </div>
                    </div>
                  </v-alert>

                  <!-- Condicional -->
                  <div v-else-if="responsibleType === 'conditional'">
                    <v-alert type="warning" variant="tonal" class="mb-4">
                      <v-icon start>mdi-code-braces</v-icon>
                      <div>
                        <div class="font-weight-medium">Atribuição Condicional</div>
                        <div class="mt-1">Configure regras que definirão o responsável baseado nos dados do processo.
                        </div>
                      </div>
                    </v-alert>
                    <v-textarea v-model="assignmentConditions" label="Configuração de Atribuição (JSON)" rows="4"
                      placeholder='{"field": "valor_total", "condition": ">", "value": 1000, "then": {"type": "sector", "id": "financeiro"}, "else": {"type": "creator"}}'
                      hint="Configure as condições em formato JSON" persistent-hint />
                  </div>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Aba: Instruções e Prazo -->
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
                    persistent-hint suffix="dias" />
                </v-col>

                <v-col cols="12" md="6">
                  <v-alert v-if="localStepData.slaDays" type="info" variant="tonal" density="compact">
                    <v-icon start>mdi-information</v-icon>
                    Prazo: {{ formatSlaDescription(localStepData.slaDays) }}
                  </v-alert>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Aba: Anexos -->
            <v-window-item value="attachment">
              <v-row>
                <v-col cols="12">
                  <v-switch v-model="localStepData.allowAttachment" label="Permitir anexos" color="primary" />
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
                </template>
              </v-row>
            </v-window-item>

            <!-- Aba: Fluxo e Condições -->
            <v-window-item value="flow">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-arrow-decision</v-icon>
                    Condições de Fluxo
                  </h3>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configure as condições que determinarão o próximo destino após esta etapa.
                  </p>
                </v-col>

                <v-col cols="12">
                  <v-combobox v-model="localStepData.actions" label="Ações disponíveis" multiple chips closable-chips
                    hint="Digite e pressione Enter para adicionar (ex: aprovar, rejeitar, devolver)" persistent-hint
                    class="mb-4" />
                </v-col>

                <!-- Condições de Fluxo Condicionais -->
                <v-col cols="12">
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel title="Condições de Fluxo Avançadas">
                      <v-expansion-panel-text>
                        <p class="text-body-2 text-medium-emphasis mb-4">
                          Configure regras condicionais para determinar automaticamente o próximo destino baseado nos
                          dados do
                          processo.
                        </p>

                        <v-textarea v-model="flowConditions" label="Condições de Fluxo (JSON)" rows="6"
                          placeholder='[{"field": "valor_total", "condition": ">", "value": 5000, "action": "aprovar", "targetStep": 3}, {"field": "urgencia", "condition": "=", "value": "alta", "targetStep": 2}]'
                          hint="Configure condições que determinam automaticamente o próximo destino" persistent-hint />
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-col>

                <v-col cols="12">
                  <v-card variant="outlined" v-if="localStepData.actions.length > 0">
                    <v-card-title class="text-subtitle-1">
                      Mapeamento de Ações
                    </v-card-title>
                    <v-card-text>
                      <p class="text-body-2 text-grey mb-4">
                        Configure o que acontece após cada ação
                      </p>

                      <div v-for="action in localStepData.actions" :key="action" class="mb-4">
                        <v-row align="center">
                          <v-col cols="12" md="4">
                            <v-chip color="primary" label>
                              {{ action }}
                            </v-chip>
                          </v-col>
                          <v-col cols="12" md="8">
                            <v-select v-model="localStepData.conditions[action]" :items="getFlowOptions()"
                              label="Vai para..." density="compact">
                              <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props">
                                  <template v-slot:prepend>
                                    <v-icon>{{ item.raw.icon }}</v-icon>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-select>
                          </v-col>
                        </v-row>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Aba: Formulário da Etapa INPUT -->
            <v-window-item value="input-config">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4">Formulário Específico da Etapa</h3>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configure campos específicos que serão exibidos apenas nesta etapa de entrada de dados.
                    Estes campos são independentes do formulário principal do processo.
                  </p>

                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between">
                      <span>
                        <v-icon start color="primary">mdi-form-textbox</v-icon>
                        Campos da Etapa ({{ inputConfig.fields.length }})


                        <style scoped>
                          .v-expansion-panel-title {
                            font-size: 0.875rem;
                          }

                          .v-card-title {
                            font-size: 1rem;
                            font-weight: 500;
                          }

                          .previous-step-fields {
                            background: rgba(0, 0, 0, 0.02);
                            border-radius: 8px;
                            padding: 16px;
                          }
                        </style>
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
                            <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                              @click="removeInputField(index)" />
                          </template>
                        </v-list-item>
                        <v-divider v-if="index < inputConfig.fields.length - 1" />
                      </template>
                    </v-list>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Aba: Reutilização de Dados -->
            <v-window-item value="reuse-data">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="secondary" class="mr-2">mdi-refresh</v-icon>
                    Reutilização de Dados de Etapas Anteriores
                  </h3>
                  <p class="text-body-2 text-medium-emphasis mb-6">
                    Selecione quais campos e anexos de etapas anteriores devem ser exibidos (somente leitura) nesta
                    etapa para
                    fornecer contexto ao executor.
                  </p>
                </v-col>

                <v-col cols="12">
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel v-for="(previousStep, stepIndex) in availablePreviousSteps"
                      :key="previousStep.order" :title="`${previousStep.order}. ${previousStep.name}`">
                      <v-expansion-panel-text>
                        <div class="previous-step-fields">
                          <h4 class="text-subtitle-1 mb-3">
                            Campos Dinâmicos da Etapa {{ previousStep.order }}
                          </h4>

                          <!-- Campos INPUT -->
                          <div v-if="getStepInputFields(previousStep).length > 0" class="mb-4">
                            <v-card variant="outlined">
                              <v-card-title class="text-subtitle-2 pa-3">
                                <v-icon start color="blue">mdi-form-textbox</v-icon>
                                Campos de Entrada de Dados
                              </v-card-title>
                              <v-card-text class="pa-3">
                                <v-row>
                                  <v-col v-for="field in getStepInputFields(previousStep)" :key="field.name" cols="12"
                                    md="6">
                                    <v-checkbox v-model="reuseConfig[`step_${previousStep.order}_${field.name}`]"
                                      :label="field.label || field.name" density="compact">
                                      <template #label>
                                        <div class="d-flex align-center">
                                          <v-icon :color="getFieldTypeColor(field.type)" size="16" class="mr-2">
                                            {{ getFieldTypeIcon(field.type) }}
                                          </v-icon>
                                          <span>{{ field.label || field.name }}</span>
                                          <v-chip size="x-small" variant="outlined" class="ml-2">
                                            {{ getFieldTypeText(field.type) }}
                                          </v-chip>
                                        </div>
                                      </template>
                                    </v-checkbox>
                                  </v-col>
                                </v-row>
                              </v-card-text>
                            </v-card>
                          </div>

                          <!-- Campos UPLOAD -->
                          <div v-if="getStepUploadFields(previousStep).length > 0" class="mb-4">
                            <v-card variant="outlined">
                              <v-card-title class="text-subtitle-2 pa-3">
                                <v-icon start color="purple">mdi-upload</v-icon>
                                Campos de Upload de Arquivo
                              </v-card-title>
                              <v-card-text class="pa-3">
                                <v-row>
                                  <v-col v-for="field in getStepUploadFields(previousStep)" :key="field.name" cols="12"
                                    md="6">
                                    <v-checkbox v-model="reuseConfig[`step_${previousStep.order}_${field.name}`]"
                                      :label="field.label || field.name" density="compact">
                                      <template #label>
                                        <div class="d-flex align-center">
                                          <v-icon color="red" size="16" class="mr-2">
                                            mdi-file-upload
                                          </v-icon>
                                          <span>{{ field.label || field.name }}</span>
                                          <v-chip size="x-small" variant="outlined" class="ml-2">
                                            Arquivo
                                          </v-chip>
                                        </div>
                                      </template>
                                    </v-checkbox>
                                  </v-col>
                                </v-row>
                              </v-card-text>
                            </v-card>
                          </div>

                          <!-- Anexos de Etapa -->
                          <div v-if="previousStep.allowAttachment" class="mb-4">
                            <v-card variant="outlined">
                              <v-card-title class="text-subtitle-2 pa-3">
                                <v-icon start color="info">mdi-paperclip</v-icon>
                                Anexos da Etapa
                              </v-card-title>
                              <v-card-text class="pa-3">
                                <v-checkbox v-model="reuseConfig[`step_${previousStep.order}_attachments`]"
                                  label="Exibir anexos desta etapa" density="compact" />
                              </v-card-text>
                            </v-card>
                          </div>

                          <v-alert v-if="getStepInputFields(previousStep).length === 0 &&
                            getStepUploadFields(previousStep).length === 0 &&
                            !previousStep.allowAttachment" type="info" variant="tonal">
                            Esta etapa não possui campos dinâmicos ou anexos para reutilizar.
                          </v-alert>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <v-alert v-if="availablePreviousSteps.length === 0" type="info" variant="tonal" class="mt-4">
                    <v-icon start>mdi-information</v-icon>
                    Não há etapas anteriores disponíveis para reutilização de dados.
                  </v-alert>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="close">
            Cancelar
          </v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!stepValid" @click="save">
            {{ editingIndex !== null ? 'Salvar' : 'Adicionar' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <!-- Dialog de Campo INPUT -->
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
                <v-text-field v-model="fieldData.name" label="Nome do Campo" :rules="[
                  v => !!v || 'Nome é obrigatório',
                  v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e _'
                ]" hint="Ex: valor_total, data_vencimento" persistent-hint required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.label" label="Rótulo" :rules="[v => !!v || 'Rótulo é obrigatório']"
                  required />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="fieldData.type" :items="fieldTypes" label="Tipo do Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']" required />
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
const assignmentConditions = ref('')
const flowConditions = ref('')

const localStepData = ref({
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
  conditions: {}
})

const inputConfig = ref({
  fields: []
})

const fieldData = ref({
  name: '',
  label: '',
  type: 'TEXT',
  required: false,
  placeholder: '',
  defaultValue: '',
  helpText: ''
})

// 🆕 Configuração de reutilização de dados
const reuseConfig = ref({})

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

const fileTypes = [
  { title: 'PDF', value: 'application/pdf' },
  { title: 'Imagens (JPG, PNG)', value: 'image/*' },
  { title: 'Word', value: '.doc,.docx' },
  { title: 'Excel', value: '.xls,.xlsx' },
  { title: 'Texto', value: 'text/plain' }
]

const slaRules = computed(() => {
  return [
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

// 🆕 Etapas anteriores disponíveis para reutilização
const availablePreviousSteps = computed(() => {
  if (!props.steps) return []

  const currentOrder = props.editingIndex !== null ? props.editingIndex + 1 : props.steps.length + 1

  return props.steps
    .filter((step, index) => (index + 1) < currentOrder)
    .map((step, index) => ({
      ...step,
      order: index + 1
    }))
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

function getInitials(name) {
  return name
    ?.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'
}

function getFieldTypeColor(type) {
  const colors = {
    TEXT: 'blue',
    NUMBER: 'green',
    DATE: 'orange',
    EMAIL: 'purple',
    DROPDOWN: 'teal',
    CURRENCY: 'amber',
    FILE: 'red'
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
    CURRENCY: 'mdi-currency-brl',
    FILE: 'mdi-file-upload'
  }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

function onStepTypeChange() {
  // Limpar configurações específicas ao mudar tipo
  if (localStepData.value.type !== 'INPUT') {
    inputConfig.value.fields = []
  }
}

function onResponsibleTypeChange() {
  // Limpar atribuições anteriores
  localStepData.value.assignedToUserId = null
  localStepData.value.assignedToSectorId = null
  localStepData.value.assignedToCreator = false
  localStepData.value.assignmentConditions = null
  assignmentConditions.value = ''
}

function getFlowOptions() {
  const options = [
    { title: 'Próxima etapa', value: null, icon: 'mdi-arrow-right' },
    { title: 'Finalizar processo', value: 'END', icon: 'mdi-flag-checkered' },
    { title: 'Voltar para etapa anterior', value: 'PREVIOUS', icon: 'mdi-arrow-left' }
  ]

  props.steps.forEach((step, index) => {
    if (props.editingIndex === null || index !== props.editingIndex) {
      options.push({
        title: `Ir para: ${step.name}`,
        value: index + 1,
        icon: 'mdi-debug-step-into'
      })
    }
  })

  return options
}

// 🆕 Funções para obter campos de etapas anteriores
function getStepInputFields(step) {
  if (step.type !== 'INPUT' || !step.conditions) return []

  try {
    const conditions = typeof step.conditions === 'string'
      ? JSON.parse(step.conditions)
      : step.conditions
    return conditions.fields || []
  } catch {
    return []
  }
}

function getStepUploadFields(step) {
  if (step.type !== 'UPLOAD' && step.type !== 'INPUT') return []

  // Para etapas UPLOAD ou INPUT que tenham campos de arquivo
  const fields = []

  if (step.type === 'UPLOAD') {
    fields.push({
      name: 'upload_files',
      label: 'Arquivos da Etapa',
      type: 'FILE'
    })
  }

  // Para INPUT com campos de arquivo
  if (step.type === 'INPUT') {
    const inputFields = getStepInputFields(step)
    fields.push(...inputFields.filter(f => f.type === 'FILE'))
  }

  return fields
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

function saveInputField() {
  if (!fieldValid.value) return

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

  // Converter dias para horas para compatibilidade com backend
  if (stepToSave.slaDays) {
    stepToSave.slaHours = stepToSave.slaDays * 24
    delete stepToSave.slaDays
  }

  // Configurar responsável baseado no tipo
  switch (responsibleType.value) {
    case 'user':
      stepToSave.assignedToCreator = false
      break
    case 'sector':
      stepToSave.assignedToCreator = false
      break
    case 'creator':
      stepToSave.assignedToUserId = null
      stepToSave.assignedToSectorId = null
      stepToSave.assignedToCreator = true
      break
    case 'conditional':
      stepToSave.assignedToUserId = null
      stepToSave.assignedToSectorId = null
      stepToSave.assignedToCreator = false
      try {
        stepToSave.assignmentConditions = assignmentConditions.value ?
          JSON.parse(assignmentConditions.value) : null
      } catch {
        stepToSave.assignmentConditions = null
      }
      break
  }

  // Configurar condições de INPUT
  if (stepToSave.type === 'INPUT' && inputConfig.value.fields.length > 0) {
    stepToSave.conditions = {
      fields: inputConfig.value.fields,
      ...stepToSave.conditions
    }
  }

  // Configurar reutilização de dados
  const reuseData = Object.keys(reuseConfig.value)
    .filter(key => reuseConfig.value[key])
    .map(key => {
      const parts = key.split('_')
      return {
        sourceStep: parseInt(parts[1]),
        fieldName: parts.slice(2).join('_'),
        type: parts[2] === 'attachments' ? 'attachment' : 'field'
      }
    })

  if (reuseData.length > 0) {
    stepToSave.reuseData = reuseData
  }

  // Configurar condições de fluxo
  try {
    if (flowConditions.value.trim()) {
      const parsedFlowConditions = JSON.parse(flowConditions.value)
      stepToSave.flowConditions = parsedFlowConditions
    }
  } catch {
    // Ignorar condições inválidas
  }

  // Configurações específicas por tipo
  if (stepToSave.type === 'APPROVAL') {
    stepToSave.actions = ['aprovar', 'reprovar']
    stepToSave.conditions = {
      ...stepToSave.conditions,
      requireJustification: true
    }
  }

  emit('save', stepToSave)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    if (props.stepData) {
      localStepData.value = { ...props.stepData }

      // Converter horas para dias
      if (props.stepData.slaHours) {
        localStepData.value.slaDays = Math.ceil(props.stepData.slaHours / 24)
      }

      // Determinar tipo de responsável
      if (props.stepData.assignedToCreator) {
        responsibleType.value = 'creator'
      } else if (props.stepData.assignedToUserId) {
        responsibleType.value = 'user'
      } else if (props.stepData.assignedToSectorId) {
        responsibleType.value = 'sector'
      } else if (props.stepData.assignmentConditions) {
        responsibleType.value = 'conditional'
        assignmentConditions.value = JSON.stringify(props.stepData.assignmentConditions, null, 2)
      }

      // Carregar configuração de INPUT
      if (props.stepData.type === 'INPUT' && props.stepData.conditions) {
        try {
          const conditions = typeof props.stepData.conditions === 'string'
            ? JSON.parse(props.stepData.conditions)
            : props.stepData.conditions

          inputConfig.value = {
            fields: conditions.fields || []
          }
        } catch (e) {
          console.error('Error loading INPUT conditions:', e)
          inputConfig.value = { fields: [] }
        }
      } else {
        inputConfig.value = { fields: [] }
      }

      // Carregar configuração de reutilização
      if (props.stepData.reuseData) {
        reuseConfig.value = {}
        props.stepData.reuseData.forEach(item => {
          const key = `step_${item.sourceStep}_${item.fieldName}`
          reuseConfig.value[key] = true
        })
      }

      // Carregar condições de fluxo
      if (props.stepData.flowConditions) {
        flowConditions.value = JSON.stringify(props.stepData.flowConditions, null, 2)
      }
    } else {
      // Resetar para nova etapa
      localStepData.value = {
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
        conditions: {}
      }
      responsibleType.value = 'sector'
      inputConfig.value = { fields: [] }
      reuseConfig.value = {}
      assignmentConditions.value = ''
      flowConditions.value = ''
    }
    tab.value = 'basic'
  }
})

watch(() => localStepData.value.allowAttachment, (newValue) => {
  if (!newValue) {
    localStepData.value.requireAttachment = false
  }
})

watch(() => localStepData.value.type, (newType) => {
  if (newType !== 'INPUT') {
    inputConfig.value.fields = []
  }
})

</script>