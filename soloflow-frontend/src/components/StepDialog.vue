<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900"
    persistent>
    <v-card>
      <v-card-title>
        {{ editingIndex !== null ? 'Editar' : 'Nova' }} Etapa
      </v-card-title>
      <v-divider />

      <v-form ref="stepForm" v-model="stepValid">
        <v-card-text>
          <v-tabs v-model="tab" class="mb-4">
            <v-tab value="basic">Informações Básicas</v-tab>
            <v-tab value="instructions">Instruções e Prazo</v-tab>
            <v-tab value="attachment">Anexos</v-tab>
          <v-tab value="flow">Fluxo e Condições</v-tab>
          <v-tab v-if="localStepData.type === 'REVIEW'" value="review-config">
            Revisão de Anexos
          </v-tab>
          <v-tab v-if="localStepData.type === 'INPUT'" value="input-config">
            Formulário da Etapa
          </v-tab>
          <v-tab v-if="localStepData.requiresSignature || localStepData.type === 'SIGNATURE'" value="signature-config">
            Assinaturas Digitais
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
                    { title: 'Revisão', value: 'REVIEW' },
                    { title: 'Assinatura', value: 'SIGNATURE' }
                  ]" item-title="title" item-value="value" label="Tipo de Etapa" :rules="[v => !!v || 'Tipo é obrigatório']"
                    required />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="localStepData.description" label="Descrição" rows="2" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="responsibleType" :items="['user', 'sector']" label="Tipo de Responsável"
                    @update:modelValue="onResponsibleTypeChange">
                    <template v-slot:item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-icon>
                            {{ item === 'user' ? 'mdi-account' : 'mdi-office-building' }}
                          </v-icon>
                        </template>
                        <v-list-item-title>
                          {{ item === 'user' ? 'Usuário' : 'Setor' }}
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <!-- Autocomplete aprimorado para usuário -->
                  <v-autocomplete
                    v-if="responsibleType === 'user'"
                    v-model="localStepData.assignedToUserId"
                    :items="users"
                    item-value="id"
                    label="Usuário Responsável"
                    placeholder="Digite nome ou email..."
                    :custom-filter="customUserFilter"
                    variant="outlined"
                    clearable
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
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
                          <v-icon size="12" class="mr-1">mdi-email</v-icon>
                          {{ item.raw.email }}
                        </v-list-item-subtitle>
                      </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                      <v-chip size="small" :color="getAvatarColor(item.raw.name)">
                        <v-avatar start size="20">
                          <span class="text-caption font-weight-bold text-white">
                            {{ getInitials(item.raw.name) }}
                          </span>
                        </v-avatar>
                        {{ item.raw.name }}
                      </v-chip>
                    </template>
                  </v-autocomplete>

                  <v-select
                    v-else-if="responsibleType === 'sector'"
                    v-model="localStepData.assignedToSectorId"
                    :items="sectors"
                    item-title="name"
                    item-value="id"
                    label="Setor Responsável"
                    variant="outlined"
                    clearable
                  />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="localStepData.requiresSignature" label="Requer assinatura digital" color="primary"
                    hint="O usuário deverá assinar digitalmente os documentos" persistent-hint />
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

        <v-window-item value="flow">
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">
                  Ações disponíveis
                </v-card-title>
                <v-card-text>
                  <v-combobox
                    v-model="localStepData.actions"
                    label="Ações disponíveis"
                    multiple
                    chips
                    closable-chips
                    hint="Digite e pressione Enter para adicionar (ex: aprovar, rejeitar, devolver)"
                    persistent-hint
                  />
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12">
              <StepTransitionEditor
                v-model="localStepData.flowConditions"
                :source-step-order="currentStepOrder"
                :available-steps="availableStepsForTransitions"
                :available-fields="availableFieldsForConditions"
                :step-type="localStepData.type"
                :sectors="sectors"
              />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="review-config">
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined" class="mb-4">
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
              <v-card>
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

                  <v-card variant="outlined" class="mb-4">
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

            <v-window-item value="signature-config">
              <v-row>
                <v-col cols="12">
                  <h3 class="text-h6 mb-4 d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-draw-pen</v-icon>
                    Configuração de Assinaturas Digitais
                  </h3>
                  <p class="text-body-2 text-medium-emphasis mb-4">
                    Configure quem deve assinar os documentos desta etapa e em qual ordem.
                    As assinaturas serão feitas com certificados digitais ICP-Brasil tipo A1.
                  </p>

                  <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between">
                      <span>
                        <v-icon start color="primary">mdi-account-group</v-icon>
                        Assinantes Configurados ({{ signatureConfig.requirements.length }})
                      </span>
                      <v-btn
                        color="primary"
                        size="small"
                        @click="openSignatureRequirementsDialog"
                        prepend-icon="mdi-plus"
                      >
                        Gerenciar Assinantes
                      </v-btn>
                    </v-card-title>

                    <v-card-text v-if="signatureConfig.requirements.length === 0" class="text-center py-6">
                      <v-icon size="48" color="grey-lighten-1">mdi-file-sign</v-icon>
                      <p class="text-body-1 text-grey mt-2">Nenhum assinante configurado</p>
                      <p class="text-body-2 text-grey">
                        Clique em "Gerenciar Assinantes" para adicionar assinantes
                      </p>
                    </v-card-text>

                    <v-list v-else lines="two" class="py-0">
                      <template v-for="(req, index) in sortedSignatureRequirements" :key="req.tempId || index">
                        <v-list-item>
                          <template #prepend>
                            <v-avatar :color="req.type === 'SEQUENTIAL' ? 'primary' : 'secondary'" size="36">
                              <span class="text-h6">{{ req.order }}</span>
                            </v-avatar>
                          </template>

                          <v-list-item-title class="font-weight-medium">
                            {{ getSignerDisplayName(req) }}
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
                            {{ req.description || 'Assinatura digital do documento' }}
                          </v-list-item-subtitle>
                        </v-list-item>
                        <v-divider v-if="index < signatureConfig.requirements.length - 1" />
                      </template>
                    </v-list>
                  </v-card>
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

const reviewAttachmentOptions = computed(() => {
  return orderedSteps.value
    .filter(step => step.order < currentStepOrder.value && (step.allowAttachment || step.type === 'UPLOAD'))
    .map(step => ({
      title: `${step.order}. ${step.name}`,
      value: step.order
    }))
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

function onResponsibleTypeChange() {
  localStepData.value.assignedToUserId = null
  localStepData.value.assignedToSectorId = null
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
    stepToSave.reuseData = Array.isArray(localStepData.value.reuseData)
      ? [...localStepData.value.reuseData]
      : reviewAttachmentSelection.value.map(order => ({
          type: 'attachment',
          sourceStep: order
        }))
  } else if (!Array.isArray(stepToSave.reuseData)) {
    stepToSave.reuseData = []
  }

  if (stepToSave.type === 'REVIEW') {
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
    } else {
      stepToSave.reviewSettings = null
    }
  } else {
    stepToSave.reviewSettings = null
  }

  // Adicionar configurações de assinatura
  if (stepToSave.requiresSignature || stepToSave.type === 'SIGNATURE') {
    stepToSave.signatureRequirements = signatureConfig.value.requirements
  } else if (stepToSave.type !== 'SIGNATURE') {
    stepToSave.signatureRequirements = []
  }

  emit('save', stepToSave)
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) return

  if (props.stepData) {
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

    responsibleType.value = props.stepData.assignedToUserId ? 'user' : 'sector'

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

    reviewAttachmentSelection.value = normalizedReuse
      .filter(item => item && item.type === 'attachment' && item.sourceStep)
      .map(item => item.sourceStep)
  } else {
    localStepData.value = getEmptyStepData()
    responsibleType.value = 'sector'
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
  const existing = Array.isArray(localStepData.value.reuseData)
    ? localStepData.value.reuseData.filter(item => item?.type !== 'attachment')
    : []
  const attachments = selected.map(order => ({
    type: 'attachment',
    sourceStep: order
  }))
  localStepData.value.reuseData = [...existing, ...attachments]
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
.v-expansion-panel-title {
  font-size: 0.875rem;
}

.v-card-title {
  font-size: 1rem;
  font-weight: 500;
}
</style>
