<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <div class="ml-4">
        <h1 class="text-h4 font-weight-bold">
          {{ isEditing ? 'Editar' : 'Novo' }} Tipo de Processo
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Configure o fluxo de trabalho, campos e etapas
        </p>
      </div>
    </div>

    <v-form ref="form" v-model="valid">
      <v-tabs v-model="activeTab" class="mb-6">
        <v-tab value="basic">
          <v-icon start>mdi-information</v-icon>
          Informações Básicas
        </v-tab>
        <v-tab value="fields">
          <v-icon start>mdi-form-textbox</v-icon>
          Campos do Formulário Principal
          <v-chip v-if="formData.formFields.length > 0" size="small" class="ml-2">
            {{ formData.formFields.length }}
          </v-chip>
        </v-tab>
        <v-tab value="steps">
          <v-icon start>mdi-debug-step-over</v-icon>
          Etapas do Processo
          <v-chip v-if="formData.steps.length > 0" size="small" class="ml-2">
            {{ formData.steps.length }}
          </v-chip>
        </v-tab>
        <v-tab value="subprocesses">
          <v-icon start>mdi-source-branch</v-icon>
          Sub-Processos
          <v-chip v-if="formData.allowedChildProcessTypes?.length > 0" size="small" class="ml-2">
            {{ formData.allowedChildProcessTypes.length }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="basic">
          <v-card>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="formData.name" label="Nome do Processo" :rules="nameRules" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="formData.isChildProcessOnly"
                    color="secondary"
                    hide-details
                    class="mt-2"
                  >
                    <template v-slot:label>
                      <div>
                        <span class="font-weight-medium">Somente Subprocesso</span>
                        <p class="text-caption text-grey mb-0">
                          Este tipo só pode ser usado como subprocesso de outro processo
                        </p>
                      </div>
                    </template>
                  </v-switch>
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="formData.description" label="Descrição" rows="3" counter="500" />
                </v-col>
                <v-col cols="12">
                  <v-divider class="mb-4" />
                  <h3 class="text-subtitle-1 font-weight-bold mb-4">
                    <v-icon start color="primary">mdi-cog</v-icon>
                    Configurações de Exibição
                  </h3>
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="formData.allowSubProcesses"
                    color="primary"
                    hide-details
                    class="mt-0"
                  >
                    <template v-slot:label>
                      <div>
                        <span class="font-weight-medium">Permitir Subprocessos</span>
                        <p class="text-caption text-grey mb-0">
                          Habilita a criação de subprocessos vinculados a este tipo
                        </p>
                      </div>
                    </template>
                  </v-switch>
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="formData.allowSubTasks"
                    color="primary"
                    hide-details
                    class="mt-0"
                  >
                    <template v-slot:label>
                      <div>
                        <span class="font-weight-medium">Permitir Subtarefas</span>
                        <p class="text-caption text-grey mb-0">
                          Habilita a criação de subtarefas nas etapas do processo
                        </p>
                      </div>
                    </template>
                  </v-switch>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item value="fields">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Campos do Formulário Principal</span>
              <v-btn color="primary" size="small" @click="addField" prepend-icon="mdi-plus">
                Adicionar Campo
              </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="formData.formFields.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">
                mdi-form-textbox
              </v-icon>
              <p class="text-body-1 text-grey mt-2">
                Nenhum campo adicionado
              </p>
              <p class="text-body-2 text-grey">
                Adicione campos que serão preenchidos ao iniciar o processo
              </p>
            </v-card-text>

            <v-list v-else lines="three">
              <template v-for="(field, index) in formData.formFields" :key="field.id || field.tempId || index">
                <v-list-item
                  class="px-4 py-3 draggable-field"
                  :class="{ 'dragging-over': dragOverFieldIndex === index }"
                  draggable="true"
                  @dragstart="onFieldDragStart($event, index)"
                  @dragend="onFieldDragEnd"
                  @dragover="onFieldDragOver($event, index)"
                  @dragleave="onFieldDragLeave"
                  @drop="onFieldDrop($event, index)"
                >
                  <template #prepend>
                    <v-icon class="mr-3 drag-handle" color="grey" style="cursor: grab;">mdi-drag-vertical</v-icon>
                    <v-avatar :color="getFieldTypeColor(field.type)" size="40">
                      <v-icon :icon="getFieldTypeIcon(field.type)" size="20" />
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ field.label }}
                    <v-chip v-if="field.required" size="x-small" color="error" class="ml-2">
                      Obrigatório
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div>
                      <v-icon size="16">mdi-code-tags</v-icon>
                      Nome: {{ field.name }}
                      <span class="mx-2">•</span>
                      <v-icon size="16">mdi-format-list-bulleted-type</v-icon>
                      Tipo: {{ getFieldTypeText(field.type) }}
                    </div>
                    <div v-if="field.placeholder" class="mt-1">
                      <v-icon size="16">mdi-form-textbox-hint</v-icon>
                      {{ field.placeholder }}
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon="mdi-pencil" size="small" variant="text" @click="editField(index)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeField(index)" />
                  </template>
                </v-list-item>
                <v-divider v-if="index < formData.formFields.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-window-item>

        <v-window-item value="steps">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Etapas do Processo</span>
              <v-btn color="primary" size="small" @click="addStep" prepend-icon="mdi-plus">
                Adicionar Etapa
              </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text v-if="formData.steps.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">
                mdi-debug-step-over
              </v-icon>
              <p class="text-body-1 text-grey mt-2">
                Nenhuma etapa adicionada
              </p>
              <p class="text-body-2 text-grey">
                Adicione as etapas que compõem o fluxo do processo
              </p>
            </v-card-text>

            <v-list v-else lines="three">
              <template v-for="(step, index) in formData.steps" :key="step.id || step.tempId || index">
                <v-list-item
                  class="px-4 py-3 draggable-step"
                  :class="{ 'dragging-over': dragOverStepIndex === index }"
                  draggable="true"
                  @dragstart="onStepDragStart($event, index)"
                  @dragend="onStepDragEnd"
                  @dragover="onStepDragOver($event, index)"
                  @dragleave="onStepDragLeave"
                  @drop="onStepDrop($event, index)"
                >
                  <template #prepend>
                    <v-icon class="mr-3 drag-handle" color="grey" style="cursor: grab;">mdi-drag-vertical</v-icon>
                    <v-avatar :color="getStepTypeColor(step.type)" size="40">
                      <span class="text-h6">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ step.name }}
                    <v-chip size="x-small" class="ml-2" variant="tonal">
                      {{ getStepTypeText(step.type) }}
                    </v-chip>
                    <v-chip v-if="step.assignedToCreator" size="x-small" color="purple" class="ml-2" variant="tonal">
                      <v-icon start size="12">mdi-account-plus</v-icon>
                      Criador
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div v-if="!step.assignedToCreator && (step.assignedToSectorId || step.assignedToUserId)">
                      <v-icon size="16">mdi-account-check</v-icon>
                      Responsável: {{ getResponsibleName(step) }}
                    </div>
                    <div v-if="step.assignmentConditions">
                      <v-icon size="16">mdi-code-braces</v-icon>
                      Atribuição condicional configurada
                    </div>
                    <div v-if="step.slaDays" class="mt-1">
                      <v-icon size="16">mdi-clock-outline</v-icon>
                      SLA: {{ step.slaDays }} dia(s)
                    </div>
                    <div v-if="step.instructions" class="mt-1">
                      <v-icon size="16">mdi-text-box</v-icon>
                      Instruções: {{ step.instructions.substring(0, 50) }}{{ step.instructions.length > 50 ? '...' : '' }}
                    </div>
                    <div v-if="step.type === 'INPUT'" class="mt-1">
                      <v-icon size="16">mdi-form-textbox</v-icon>
                      {{ getInputFieldsCount(step) }}
                    </div>
                    <div v-if="step.reuseData" class="mt-1">
                      <v-icon size="16">mdi-refresh</v-icon>
                      Reutiliza dados de {{ getReuseDataCount(step.reuseData) }} campo(s)
                    </div>
                    <div class="mt-1">
                      <v-chip v-if="step.allowAttachment" size="x-small" class="mr-1">
                        <v-icon start size="12">mdi-paperclip</v-icon>
                        Anexos{{ step.requireAttachment ? ' (obrigatório)' : '' }}
                      </v-chip>
                      <v-chip v-if="step.requiresSignature" size="x-small" class="mr-1">
                        <v-icon start size="12">mdi-draw-pen</v-icon>
                        Assinatura
                      </v-chip>
                      <v-chip v-if="step.actions?.length > 0" size="x-small">
                        {{ step.actions.length }} ações
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon="mdi-pencil" size="small" variant="text" @click="editStep(index)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeStep(index)" />
                  </template>
                </v-list-item>
                <v-divider v-if="index < formData.steps.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-window-item>

        <v-window-item value="subprocesses">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Sub-Processos Permitidos</span>
              <v-btn color="primary" size="small" @click="openCreateChildTypeDialog" prepend-icon="mdi-plus">
                Criar Novo Tipo
              </v-btn>
            </v-card-title>
            <v-divider />

            <v-card-text>
              <v-select
                v-model="formData.allowedChildProcessTypes"
                :items="availableProcessTypesForChild"
                item-title="name"
                item-value="id"
                label="Tipos de Sub-Processo Permitidos"
                multiple
                chips
                closable-chips
                variant="outlined"
                :loading="loadingProcessTypes"
                hint="Selecione os tipos de processo que podem ser sub-processos"
                persistent-hint
              >
                <template v-slot:prepend-inner>
                  <v-icon color="grey">mdi-source-branch</v-icon>
                </template>
                <template v-slot:chip="{ props, item }">
                  <v-chip
                    v-bind="props"
                    color="primary"
                    variant="tonal"
                    closable
                  >
                    <v-icon start size="16">mdi-file-document-outline</v-icon>
                    {{ item.raw.name }}
                  </v-chip>
                </template>
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon color="primary">mdi-file-document-outline</v-icon>
                    </template>
                    <v-list-item-subtitle v-if="item.raw.description">
                      {{ item.raw.description }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>

              <!-- Lista de tipos selecionados -->
              <div v-if="formData.allowedChildProcessTypes?.length > 0" class="mt-6">
                <h4 class="text-subtitle-1 font-weight-medium mb-3">
                  <v-icon start>mdi-check-circle</v-icon>
                  {{ formData.allowedChildProcessTypes.length }} tipo(s) selecionado(s)
                </h4>
                <v-list density="compact" class="bg-grey-lighten-5 rounded-lg">
                  <v-list-item
                    v-for="typeId in formData.allowedChildProcessTypes"
                    :key="typeId"
                  >
                    <template v-slot:prepend>
                      <v-icon color="success">mdi-check-circle</v-icon>
                    </template>
                    <v-list-item-title>{{ getProcessTypeName(typeId) }}</v-list-item-title>
                    <template v-slot:append>
                      <v-btn
                        icon="mdi-close"
                        size="small"
                        variant="text"
                        @click="removeAllowedChildType(typeId)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </div>

              <div v-else class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-source-branch</v-icon>
                <p class="text-body-1 text-grey mt-2">Nenhum sub-processo configurado</p>
                <p class="text-body-2 text-grey">
                  Selecione acima os tipos de processo que podem ser vinculados como sub-processos
                </p>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>

      <div class="d-flex justify-end mt-6 gap-2">
        <v-btn variant="text" @click="goBack">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!valid || formData.steps.length === 0" @click="save">
          {{ isEditing ? 'Salvar Alterações' : 'Criar Tipo de Processo' }}
        </v-btn>
      </div>
    </v-form>

    <!-- Dialog de Campo -->
    <v-dialog v-model="fieldDialog" max-width="800" persistent>
      <v-card>
        <v-card-title>
          {{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo do Formulário
        </v-card-title>
        <v-divider />

        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.name" label="Nome do Campo (identificador)"
                  :rules="[v => !!v || 'Nome é obrigatório', v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e underscore']"
                  hint="Ex: data_nascimento, valor_total" persistent-hint required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.label" label="Rótulo (exibido ao usuário)"
                  :rules="[v => !!v || 'Rótulo é obrigatório']" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="fieldData.type" :items="fieldTypes" label="Tipo de Campo"
                  :rules="[v => !!v || 'Tipo é obrigatório']" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.placeholder" label="Placeholder" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="fieldData.defaultValue" label="Valor Padrão" />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="fieldData.required" label="Campo Obrigatório" color="primary" />
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
                  <div
                    v-for="(option, idx) in fieldData.options"
                    :key="idx"
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
                  </div>
                </div>
              </v-col>

              <!-- Opções para Checkbox -->
              <v-col v-if="fieldData.type === 'CHECKBOX'" cols="12">
                <v-divider class="my-4" />
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h4 class="text-h6 mb-1">Opções de Checkbox</h4>
                    <p class="text-caption text-medium-emphasis">Configure múltiplas opções ou deixe vazio para checkbox único</p>
                  </div>
                  <v-btn
                    color="primary"
                    size="small"
                    prepend-icon="mdi-plus"
                    variant="elevated"
                    @click="addCheckboxOption"
                  >
                    Adicionar Opção
                  </v-btn>
                </div>

                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                  icon="mdi-information"
                >
                  <strong>Dica:</strong> Sem opções = checkbox único (sim/não). Com opções = múltipla seleção.
                </v-alert>

                <div v-if="fieldData.options && fieldData.options.length > 0" class="options-container">
                  <div
                    v-for="(option, idx) in fieldData.options"
                    :key="idx"
                    class="mb-3 pa-3"
                  >
                    <v-row dense align="center">
                      <v-col cols="10">
                        <v-text-field
                          v-model="fieldData.options[idx]"
                          label="Opção"
                          density="comfortable"
                          variant="outlined"
                          hide-details="auto"
                          :rules="[v => !!v?.trim() || 'Campo obrigatório']"
                          prepend-inner-icon="mdi-checkbox-marked"
                        />
                      </v-col>
                      <v-col cols="2" class="text-center">
                        <v-btn
                          icon="mdi-delete"
                          size="small"
                          color="error"
                          variant="tonal"
                          @click="removeCheckboxOption(idx)"
                        />
                      </v-col>
                    </v-row>
                  </div>
                </div>
              </v-col>

              <!-- Configuração de Colunas para Tabela -->
              <v-col v-if="fieldData.type === 'TABLE'" cols="12">
                <v-divider class="my-4" />
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h4 class="text-h6 mb-1">
                      <v-icon start color="indigo">mdi-table</v-icon>
                      Configuração da Tabela
                    </h4>
                    <p class="text-caption text-medium-emphasis">
                      Configure até 5 colunas para a tabela dinâmica
                    </p>
                  </div>
                  <v-btn
                    color="indigo"
                    size="small"
                    prepend-icon="mdi-table-column-plus-after"
                    variant="elevated"
                    :disabled="fieldData.tableColumns && fieldData.tableColumns.length >= 5"
                    @click="addTableColumn"
                  >
                    Adicionar Coluna
                  </v-btn>
                </div>

                <!-- Indicador de colunas -->
                <v-chip 
                  v-if="fieldData.tableColumns && fieldData.tableColumns.length > 0"
                  size="small" 
                  color="indigo" 
                  variant="tonal"
                  class="mb-3"
                >
                  {{ fieldData.tableColumns.length }}/5 colunas configuradas
                </v-chip>

                <v-alert v-if="!fieldData.tableColumns || fieldData.tableColumns.length === 0"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                  icon="mdi-information"
                >
                  Clique em "Adicionar Coluna" para configurar as colunas da tabela (máximo 5)
                </v-alert>

                <div v-if="fieldData.tableColumns && fieldData.tableColumns.length > 0" class="table-columns-container">
                  <v-card
                    v-for="(column, idx) in fieldData.tableColumns"
                    :key="idx"
                    variant="flat"
                    class="mb-3 pa-4 column-card"
                  >
                    <div class="d-flex align-center mb-3">
                      <v-avatar color="indigo" size="32" class="mr-3">
                        <span class="text-body-2 font-weight-bold text-white">{{ idx + 1 }}</span>
                      </v-avatar>
                      <span class="text-subtitle-1 font-weight-medium">Coluna {{ idx + 1 }}</span>
                      <v-spacer />
                      <v-btn
                        icon="mdi-arrow-up"
                        size="small"
                        variant="text"
                        :disabled="idx === 0"
                        @click="moveTableColumn(idx, -1)"
                        title="Mover para cima"
                      />
                      <v-btn
                        icon="mdi-arrow-down"
                        size="small"
                        variant="text"
                        :disabled="idx === fieldData.tableColumns.length - 1"
                        @click="moveTableColumn(idx, 1)"
                        title="Mover para baixo"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        variant="text"
                        @click="removeTableColumn(idx)"
                        title="Remover coluna"
                      />
                    </div>
                    <v-row dense>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="column.label"
                          label="Nome da Coluna *"
                          placeholder="Ex: Produto, Quantidade..."
                          density="comfortable"
                          variant="outlined"
                          hide-details="auto"
                          :rules="[v => !!v?.trim() || 'Nome é obrigatório']"
                          prepend-inner-icon="mdi-format-text"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-select
                          v-model="column.type"
                          :items="tableColumnTypes"
                          label="Tipo *"
                          density="comfortable"
                          variant="outlined"
                          hide-details="auto"
                          prepend-inner-icon="mdi-format-list-bulleted-type"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-switch
                          v-model="column.required"
                          label="Obrigatório"
                          density="comfortable"
                          hide-details
                          color="indigo"
                          class="mt-1"
                        />
                      </v-col>
                    </v-row>
                  </v-card>
                </div>

                <v-alert 
                  v-if="fieldData.tableColumns && fieldData.tableColumns.length >= 5"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                  icon="mdi-alert"
                >
                  Limite máximo de 5 colunas atingido
                </v-alert>

                <v-divider class="my-4" />
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model.number="fieldData.minRows"
                      label="Mínimo de linhas"
                      type="number"
                      min="0"
                      max="50"
                      density="comfortable"
                      variant="outlined"
                      hint="0 = sem mínimo"
                      persistent-hint
                      prepend-inner-icon="mdi-table-row"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model.number="fieldData.maxRows"
                      label="Máximo de linhas"
                      type="number"
                      min="1"
                      max="100"
                      density="comfortable"
                      variant="outlined"
                      hint="Deixe vazio para ilimitado"
                      persistent-hint
                      prepend-inner-icon="mdi-table-row-plus-after"
                    />
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeFieldDialog">
              Cancelar
            </v-btn>
            <v-btn color="primary" variant="elevated" :disabled="!fieldValid" @click="saveField">
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- StepDialog Component Integration -->
    <StepDialog
      v-model="stepDialog"
      :step-data="editingStepData"
      :editing-index="editingStepIndex"
      :sectors="sectors"
      :users="users"
      :steps="formData.steps"
      :form-fields="formData.formFields"
      @save="handleStepSave"
      @close="handleStepClose"
    />

    <!-- Modal para criar novo tipo de processo como sub-processo -->
    <v-dialog v-model="createChildTypeDialog" max-width="700" persistent scrollable>
      <v-card class="create-child-type-dialog">
        <!-- Header -->
        <v-card-title class="create-child-type-header d-flex align-center justify-center flex-column py-8">
          <div class="icon-container mb-4">
            <v-icon size="64" color="white">mdi-file-document-plus</v-icon>
          </div>
          <span class="text-h5 font-weight-bold text-white text-center">
            Criar Novo Tipo de Sub-Processo
          </span>
          <span class="text-body-2 text-white-50 mt-2 text-center">
            Este tipo será automaticamente vinculado como sub-processo permitido
          </span>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="childTypeForm" v-model="childTypeFormValid">
            <!-- Nome -->
            <div class="mb-4">
              <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
                Nome do Tipo de Processo *
              </label>
              <v-text-field
                v-model="childTypeData.name"
                variant="outlined"
                placeholder="Ex: Aditivo de Contrato"
                :rules="[v => !!v || 'Nome é obrigatório', v => (v?.length ?? 0) >= 3 || 'Mínimo 3 caracteres']"
                bg-color="grey-lighten-5"
                density="comfortable"
              >
                <template v-slot:prepend-inner>
                  <v-icon color="grey" size="20">mdi-text</v-icon>
                </template>
              </v-text-field>
            </div>

            <!-- Descrição -->
            <div class="mb-4">
              <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
                Descrição (opcional)
              </label>
              <v-textarea
                v-model="childTypeData.description"
                variant="outlined"
                placeholder="Descreva o propósito deste tipo de processo..."
                rows="2"
                bg-color="grey-lighten-5"
                density="comfortable"
              >
                <template v-slot:prepend-inner>
                  <v-icon color="grey" size="20" class="mt-1">mdi-text-box-outline</v-icon>
                </template>
              </v-textarea>
            </div>

            <!-- Modalidade do Sub-Processo -->
            <div class="mb-4">
              <label class="text-caption font-weight-bold text-grey-darken-2 mb-2 d-block">
                Modalidade *
              </label>
              <v-btn-toggle
                v-model="childTypeData.modality"
                mandatory
                color="primary"
                variant="outlined"
                class="w-100 modality-toggle"
              >
                <v-btn value="MANUAL" class="flex-grow-1">
                  <v-icon start>mdi-hand-pointing-up</v-icon>
                  Manual
                </v-btn>
                <v-btn value="RECURRENT" class="flex-grow-1">
                  <v-icon start>mdi-refresh</v-icon>
                  Recorrente
                </v-btn>
                <v-btn value="SCHEDULED" class="flex-grow-1">
                  <v-icon start>mdi-calendar-clock</v-icon>
                  Agendado
                </v-btn>
              </v-btn-toggle>
              <p class="text-caption text-grey mt-2">
                <template v-if="childTypeData.modality === 'MANUAL'">
                  O sub-processo será criado manualmente pelo usuário quando necessário.
                </template>
                <template v-else-if="childTypeData.modality === 'RECURRENT'">
                  O sub-processo será criado automaticamente em intervalos regulares.
                </template>
                <template v-else-if="childTypeData.modality === 'SCHEDULED'">
                  O sub-processo será criado automaticamente em uma data/hora específica.
                </template>
              </p>
            </div>

            <!-- Configurações de Recorrência -->
            <div v-if="childTypeData.modality === 'RECURRENT'" class="mb-4 pa-4 bg-blue-lighten-5 rounded-lg">
              <label class="text-caption font-weight-bold text-grey-darken-2 mb-3 d-block">
                <v-icon start size="18" color="primary">mdi-refresh</v-icon>
                Configuração de Recorrência
              </label>

              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model.number="childTypeData.recurrenceInterval"
                    type="number"
                    label="Intervalo"
                    variant="outlined"
                    density="comfortable"
                    min="1"
                    bg-color="white"
                    :rules="[v => v > 0 || 'Intervalo deve ser maior que 0']"
                  />
                </v-col>
                <v-col cols="6">
                  <v-select
                    v-model="childTypeData.recurrenceUnit"
                    :items="recurrenceUnits"
                    label="Unidade"
                    variant="outlined"
                    density="comfortable"
                    bg-color="white"
                  />
                </v-col>
              </v-row>
              <p class="text-caption text-grey">
                Ex: A cada {{ childTypeData.recurrenceInterval || 1 }} {{ getRecurrenceUnitLabel(childTypeData.recurrenceUnit) }}
              </p>
            </div>

            <!-- Configurações de Agendamento -->
            <div v-if="childTypeData.modality === 'SCHEDULED'" class="mb-4 pa-4 bg-orange-lighten-5 rounded-lg">
              <label class="text-caption font-weight-bold text-grey-darken-2 mb-3 d-block">
                <v-icon start size="18" color="orange">mdi-calendar-clock</v-icon>
                Configuração de Agendamento
              </label>

              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model="childTypeData.scheduledDate"
                    type="date"
                    label="Data"
                    variant="outlined"
                    density="comfortable"
                    bg-color="white"
                    :rules="[v => !!v || 'Data é obrigatória']"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="childTypeData.scheduledTime"
                    type="time"
                    label="Hora"
                    variant="outlined"
                    density="comfortable"
                    bg-color="white"
                  />
                </v-col>
              </v-row>
            </div>

            <!-- Opção de criar com etapa básica -->
            <v-checkbox
              v-model="childTypeData.createBasicStep"
              label="Criar com uma etapa básica de aprovação"
              color="primary"
              density="comfortable"
              hide-details
              class="mb-2"
            />
            <p class="text-caption text-grey mb-4 ml-8">
              Cria automaticamente uma etapa de aprovação inicial. Você pode editar o tipo completo depois.
            </p>

            <v-alert type="info" variant="tonal" density="compact" class="mb-0" icon="mdi-information">
              Após criar, você poderá editar este tipo de processo para adicionar campos e etapas.
            </v-alert>
          </v-form>
        </v-card-text>

        <v-divider />

        <!-- Ações -->
        <v-card-actions class="pa-4 d-flex justify-space-between">
          <v-btn
            variant="text"
            color="grey-darken-1"
            size="large"
            @click="closeCreateChildTypeDialog"
            :disabled="savingChildType"
          >
            <v-icon start>mdi-close</v-icon>
            Cancelar
          </v-btn>

          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            :loading="savingChildType"
            :disabled="!childTypeFormValid || savingChildType"
            @click="createChildType"
            class="px-6"
          >
            <v-icon start>mdi-plus</v-icon>
            Criar e Vincular
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useSectorStore } from '@/stores/sectors'
import { useUserStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import StepDialog from '@/components/StepDialog.vue'

const router = useRouter()
const route = useRoute()
const processTypeStore = useProcessTypeStore()
const sectorStore = useSectorStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const valid = ref(false)
const fieldValid = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const fieldDialog = ref(false)
const stepDialog = ref(false)
const editingFieldIndex = ref(null)
const editingStepIndex = ref(null)
const editingStepData = ref(null)

const form = ref(null)
const fieldForm = ref(null)

// Drag and drop state
const draggedFieldIndex = ref(null)
const dragOverFieldIndex = ref(null)
const draggedStepIndex = ref(null)
const dragOverStepIndex = ref(null)

const formData = ref({
  id: null,
  name: '',
  description: '',
  isChildProcessOnly: false,
  allowSubProcesses: true,
  allowSubTasks: true,
  steps: [],
  formFields: [],
  allowedChildProcessTypes: []
})

// Estado para carregar tipos de processo disponíveis
const loadingProcessTypes = ref(false)
const allProcessTypes = ref([])

// Estado para criar novo tipo de sub-processo
const createChildTypeDialog = ref(false)
const childTypeFormValid = ref(false)
const savingChildType = ref(false)
const childTypeForm = ref(null)
const childTypeData = ref({
  name: '',
  description: '',
  modality: 'MANUAL',
  recurrenceInterval: 1,
  recurrenceUnit: 'DAYS',
  scheduledDate: '',
  scheduledTime: '',
  createBasicStep: true
})

// Unidades de recorrência
const recurrenceUnits = [
  { title: 'Dias', value: 'DAYS' },
  { title: 'Semanas', value: 'WEEKS' },
  { title: 'Meses', value: 'MONTHS' },
  { title: 'Anos', value: 'YEARS' }
]

function getRecurrenceUnitLabel(unit) {
  const labels = {
    'DAYS': 'dia(s)',
    'WEEKS': 'semana(s)',
    'MONTHS': 'mês(es)',
    'YEARS': 'ano(s)'
  }
  return labels[unit] || unit
}

const fieldData = ref({
  name: '', 
  label: '', 
  type: 'TEXT', 
  placeholder: '', 
  required: false, 
  defaultValue: '', 
  helpText: '', 
  options: [], 
  validations: {}
})

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors || [])
const users = computed(() => userStore.users || [])

// Tipos de processo disponíveis para serem sub-processos (excluindo o próprio tipo em edição)
const availableProcessTypesForChild = computed(() => {
  return allProcessTypes.value.filter(pt => {
    // Não mostrar o próprio tipo de processo
    if (isEditing.value && pt.id === formData.value.id) return false
    // Apenas tipos ativos
    if (!pt.isActive) return false
    // Apenas tipos que são "Somente Subprocesso"
    if (pt.isChildProcessOnly !== true) return false
    return true
  })
})

const nameRules = [
  v => !!v || 'Nome é obrigatório',
  v => (v?.length ?? 0) >= 3 || 'Nome deve ter no mínimo 3 caracteres'
]

// Variável para controlar se deve ignorar o próximo watch (evita salvar durante carregamento)
const ignoreNextAllowedChildProcessTypesChange = ref(true)

// Watcher para salvar automaticamente quando mudar sub-processos permitidos (apenas em modo edição)
watch(() => formData.value.allowedChildProcessTypes, async (newValue, oldValue) => {
  // Ignorar durante carregamento inicial
  if (ignoreNextAllowedChildProcessTypesChange.value) {
    ignoreNextAllowedChildProcessTypesChange.value = false
    return
  }

  // Só salvar automaticamente se estiver editando um tipo existente
  if (!isEditing.value || !formData.value.id) return

  // Verificar se realmente mudou (comparar arrays)
  const oldIds = (oldValue || []).sort().join(',')
  const newIds = (newValue || []).sort().join(',')
  if (oldIds === newIds) return

  try {
    await processTypeStore.updateProcessType(formData.value.id, {
      allowedChildProcessTypes: newValue || []
    })
    window.showSnackbar?.('Sub-processos permitidos atualizados!', 'success')
  } catch (err) {
    console.error('Erro ao atualizar sub-processos:', err)
    window.showSnackbar?.('Erro ao atualizar sub-processos', 'error')
  }
}, { deep: true })

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
  { title: 'Arquivo', value: 'FILE' },
  { title: 'Tabela', value: 'TABLE' }
  // CHECKBOX removido - usar DROPDOWN para múltiplas opções
]

function getFieldTypeColor(type) {
  const colors = { TEXT: 'blue', NUMBER: 'green', DATE: 'orange', EMAIL: 'purple', DROPDOWN: 'teal', FILE: 'red', TABLE: 'indigo' }
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
    FILE: 'mdi-paperclip',
    TABLE: 'mdi-table'
  }
  return icons[type] || 'mdi-help-circle'
}

function getFieldTypeText(type) {
  const field = fieldTypes.find(f => f.value === type)
  return field?.title || type
}

function getStepTypeColor(type) {
  const colors = { INPUT: 'blue', APPROVAL: 'orange', UPLOAD: 'purple', REVIEW: 'teal', SIGNATURE: 'red' }
  return colors[type] || 'grey'
}

function getStepTypeText(type) {
  const stepTypes = [
    { title: 'Entrada de Dados', value: 'INPUT' }, 
    { title: 'Aprovação', value: 'APPROVAL' }, 
    { title: 'Upload de Arquivo', value: 'UPLOAD' }, 
    { title: 'Revisão', value: 'REVIEW' }, 
    { title: 'Assinatura', value: 'SIGNATURE' }
  ]
  const step = stepTypes.find(s => s.value === type)
  return step?.title || type
}

function getResponsibleName(step) {
  if (step.assignedToUser?.name) return step.assignedToUser.name
  if (step.assignedToSector?.name) return step.assignedToSector.name
  if (step.assignedToUserId) {
    const user = users.value.find(u => u.id === step.assignedToUserId)
    return user?.name || 'Usuário'
  }
  if (step.assignedToSectorId) {
    const sector = sectors.value.find(s => s.id === step.assignedToSectorId)
    return sector?.name || 'Setor'
  }
  return 'Não definido'
}

function getInputFieldsCount(step) {
  try {
    const conditions = typeof step.conditions === 'string'
      ? JSON.parse(step.conditions)
      : step.conditions
    const count = conditions?.fields?.length || 0
    return count > 0 ? `${count} campo(s) dinâmico(s)` : 'Nenhum campo dinâmico'
  } catch {
    return '0 campos dinâmicos'
  }
}

function getReuseDataCount(reuseData) {
  if (!reuseData || !Array.isArray(reuseData)) return 0
  return reuseData.length
}

// Funções para sub-processos
function getProcessTypeName(typeId) {
  const pt = allProcessTypes.value.find(p => p.id === typeId)
  return pt?.name || 'Tipo não encontrado'
}

function removeAllowedChildType(typeId) {
  const index = formData.value.allowedChildProcessTypes.indexOf(typeId)
  if (index > -1) {
    formData.value.allowedChildProcessTypes.splice(index, 1)
  }
}

// Funções para criar novo tipo de sub-processo
function openCreateChildTypeDialog() {
  childTypeData.value = {
    name: '',
    description: '',
    modality: 'MANUAL',
    recurrenceInterval: 1,
    recurrenceUnit: 'DAYS',
    scheduledDate: '',
    scheduledTime: '',
    createBasicStep: true
  }
  childTypeFormValid.value = false
  createChildTypeDialog.value = true
}

function closeCreateChildTypeDialog() {
  createChildTypeDialog.value = false
  childTypeData.value = {
    name: '',
    description: '',
    modality: 'MANUAL',
    recurrenceInterval: 1,
    recurrenceUnit: 'DAYS',
    scheduledDate: '',
    scheduledTime: '',
    createBasicStep: true
  }
}

async function createChildType() {
  if (!childTypeFormValid.value) return

  savingChildType.value = true
  try {
    // Preparar payload para criar o novo tipo
    const payload = {
      name: childTypeData.value.name,
      description: childTypeData.value.description || '',
      companyId: authStore.activeCompanyId,
      formFields: [],
      steps: []
    }

    // Se optou por criar etapa básica, adicionar uma etapa de aprovação
    if (childTypeData.value.createBasicStep) {
      payload.steps = [
        {
          name: 'Aprovação',
          type: 'APPROVAL',
          order: 1,
          instructions: 'Revise e aprove o sub-processo.',
          slaDays: null,
          assignedToCreator: true,
          actions: [],
          allowedFileTypes: [],
          flowConditions: [],
          reuseData: [],
          signatureRequirements: []
        }
      ]
    }

    // Criar o novo tipo de processo
    const newType = await processTypeStore.createProcessType(payload)

    if (newType && newType.id) {
      // Adicionar o novo tipo à lista de sub-processos permitidos
      if (!formData.value.allowedChildProcessTypes) {
        formData.value.allowedChildProcessTypes = []
      }
      formData.value.allowedChildProcessTypes.push(newType.id)

      // Se estamos editando um tipo existente, salvar a vinculação imediatamente
      if (isEditing.value && formData.value.id) {
        await processTypeStore.updateProcessType(formData.value.id, {
          allowedChildProcessTypes: formData.value.allowedChildProcessTypes
        })
      }

      // Recarregar a lista de tipos para incluir o novo
      await loadAllProcessTypes()

      window.showSnackbar?.(`Tipo "${newType.name}" criado e vinculado com sucesso!`, 'success')
      closeCreateChildTypeDialog()
    } else {
      throw new Error('Falha ao criar tipo de processo')
    }
  } catch (err) {
    console.error('Erro ao criar tipo de sub-processo:', err)
    window.showSnackbar?.(err.response?.data?.message || 'Erro ao criar tipo de processo', 'error')
  } finally {
    savingChildType.value = false
  }
}

async function loadAllProcessTypes() {
  loadingProcessTypes.value = true
  try {
    await processTypeStore.fetchProcessTypes()
    allProcessTypes.value = processTypeStore.processTypes || []
  } catch (err) {
    console.error('Erro ao carregar tipos de processo:', err)
  } finally {
    loadingProcessTypes.value = false
  }
}

// Field management functions
function addField() {
  resetFieldData()
  fieldDialog.value = true
}

function editField(index) {
  const field = formData.value.formFields[index]
  editingFieldIndex.value = index
  fieldData.value = { 
    ...field,
    tableColumns: field.tableColumns || [],
    minRows: field.minRows || 0,
    maxRows: field.maxRows || null
  }
  fieldDialog.value = true
}

function removeField(index) {
  formData.value.formFields.splice(index, 1)
}

function resetFieldData() {
  editingFieldIndex.value = null
  fieldData.value = { 
    name: '', 
    label: '', 
    type: 'TEXT', 
    placeholder: '', 
    required: false, 
    defaultValue: '', 
    helpText: '', 
    options: [], 
    validations: {},
    tableColumns: [],
    minRows: 0,
    maxRows: null
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

// Checkbox options management
function addCheckboxOption() {
  if (!fieldData.value.options) {
    fieldData.value.options = []
  }
  fieldData.value.options.push('')
}

function removeCheckboxOption(index) {
  fieldData.value.options.splice(index, 1)
}

// Tipos de coluna para tabela (apenas 4 tipos: Texto, Número, Dinheiro, Data)
const tableColumnTypes = [
  { title: 'Texto', value: 'TEXT' },
  { title: 'Número', value: 'NUMBER' },
  { title: 'Dinheiro', value: 'CURRENCY' },
  { title: 'Data', value: 'DATE' }
]

// Table columns management (máximo 5 colunas)
function addTableColumn() {
  if (!fieldData.value.tableColumns) {
    fieldData.value.tableColumns = []
  }
  
  // Limitar a 5 colunas
  if (fieldData.value.tableColumns.length >= 5) {
    window.showSnackbar?.('Máximo de 5 colunas permitidas', 'warning')
    return
  }
  
  // Gerar nome único baseado no índice
  const columnIndex = fieldData.value.tableColumns.length + 1
  fieldData.value.tableColumns.push({
    name: `coluna_${columnIndex}`,
    label: '',
    type: 'TEXT',
    required: false
  })
}

function removeTableColumn(index) {
  fieldData.value.tableColumns.splice(index, 1)
}

function moveTableColumn(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= fieldData.value.tableColumns.length) return
  
  const columns = [...fieldData.value.tableColumns]
  const [removed] = columns.splice(index, 1)
  columns.splice(newIndex, 0, removed)
  fieldData.value.tableColumns = columns
}

function saveField() {
  if (!fieldValid.value) {
    window.showSnackbar?.('Por favor, corrija os erros no campo', 'error')
    return
  }

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

  // Validar colunas para TABLE
  if (fieldData.value.type === 'TABLE') {
    if (!fieldData.value.tableColumns || fieldData.value.tableColumns.length === 0) {
      window.showSnackbar?.('Adicione pelo menos uma coluna para a tabela', 'error')
      return
    }

    // Validar se todas as colunas têm label (nome visível)
    const hasEmptyLabels = fieldData.value.tableColumns.some(col => !col.label?.trim())
    if (hasEmptyLabels) {
      window.showSnackbar?.('Todas as colunas devem ter um nome preenchido', 'error')
      return
    }

    // Gerar names automáticos baseados no label (para uso interno)
    fieldData.value.tableColumns.forEach((col, idx) => {
      if (!col.name || col.name.startsWith('coluna_')) {
        // Converter label para snake_case
        col.name = col.label.trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          || `coluna_${idx + 1}`
      }
    })

    // Validar nomes únicos
    const names = fieldData.value.tableColumns.map(col => col.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      // Se houver duplicatas, adicionar sufixo numérico
      const usedNames = new Set()
      fieldData.value.tableColumns.forEach(col => {
        let baseName = col.name
        let counter = 1
        while (usedNames.has(col.name)) {
          col.name = `${baseName}_${counter}`
          counter++
        }
        usedNames.add(col.name)
      })
    }
  }

  const isEditingField = editingFieldIndex.value !== null

  const field = {
    name: fieldData.value.name.trim(),
    label: fieldData.value.label.trim(),
    type: fieldData.value.type,
    placeholder: fieldData.value.placeholder?.trim() || null,
    required: Boolean(fieldData.value.required),
    defaultValue: fieldData.value.defaultValue?.trim() || null,
    helpText: fieldData.value.helpText?.trim() || null,
    tempId: isEditingField ? formData.value.formFields[editingFieldIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingField ? formData.value.formFields[editingFieldIndex.value].order : (formData.value.formFields.length + 1),
    options: fieldData.value.options || [],
    validations: fieldData.value.validations || {},
    tableColumns: fieldData.value.tableColumns || [],
    minRows: fieldData.value.minRows || 0,
    maxRows: fieldData.value.maxRows || null
  }
  
  console.log('💾 Saving field to formData:', field)
  console.log('💾 tableColumns being saved:', field.tableColumns)
  
  if (isEditingField) {
    formData.value.formFields[editingFieldIndex.value] = field
  } else {
    formData.value.formFields.push(field)
  }

  window.showSnackbar?.(`Campo "${field.label}" ${isEditingField ? 'atualizado' : 'adicionado'}`, 'success')
  closeFieldDialog()
}

// Step management functions using StepDialog
function addStep() {
  editingStepIndex.value = null
  editingStepData.value = null
  stepDialog.value = true
}

function editStep(index) {
  editingStepIndex.value = index
  editingStepData.value = { ...formData.value.steps[index] }
  stepDialog.value = true
}

function removeStep(index) {
  formData.value.steps.splice(index, 1)
  window.showSnackbar?.('Etapa removida', 'success')
}

function handleStepSave(stepData) {
  const isEditingStep = editingStepIndex.value !== null
  
  // Ensure step has the required structure for the backend
  const processedStep = {
    ...stepData,
    tempId: isEditingStep ? formData.value.steps[editingStepIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingStep ? formData.value.steps[editingStepIndex.value].order : (formData.value.steps.length + 1),
    actions: Array.isArray(stepData.actions) ? [...stepData.actions] : [],
    allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? [...stepData.allowedFileTypes] : [],
    flowConditions: Array.isArray(stepData.flowConditions)
      ? stepData.flowConditions.map(condition => ({ ...condition }))
      : [],
    reuseData: Array.isArray(stepData.reuseData)
      ? stepData.reuseData.map(item => ({ ...item }))
      : [],
    signatureRequirements: Array.isArray(stepData.signatureRequirements)
      ? stepData.signatureRequirements.map(req => ({ ...req }))
      : [],
    reviewSettings: stepData.reviewSettings
      ? { ...stepData.reviewSettings }
      : null
  }

  if (isEditingStep) {
    formData.value.steps[editingStepIndex.value] = processedStep
  } else {
    formData.value.steps.push(processedStep)
  }

  window.showSnackbar?.(`Etapa "${stepData.name}" ${isEditingStep ? 'atualizada' : 'adicionada'}`, 'success')
  handleStepClose()
}

function handleStepClose() {
  stepDialog.value = false
  editingStepIndex.value = null
  editingStepData.value = null
}

async function save() {
  saving.value = true
  try {
    const payload = {
      name: formData.value.name,
      description: formData.value.description,
      isChildProcessOnly: formData.value.isChildProcessOnly || false,
      allowSubProcesses: formData.value.allowSubProcesses ?? true,
      allowSubTasks: formData.value.allowSubTasks ?? true,
      companyId: authStore.activeCompanyId,
      allowedChildProcessTypes: formData.value.allowedChildProcessTypes || [],
      formFields: formData.value.formFields.map((f, idx) => ({
        ...f,
        order: f.order ?? (idx + 1),
        tableColumns: f.type === 'TABLE' ? (f.tableColumns || []) : undefined,
        minRows: f.type === 'TABLE' ? (f.minRows || 0) : undefined,
        maxRows: f.type === 'TABLE' ? (f.maxRows || null) : undefined
      })),
      steps: formData.value.steps.map((s, idx) => {
        const stepPayload = { ...s }
        
        // Ensure all new fields are included in the payload
        return {
          ...stepPayload,
          order: stepPayload.order ?? (idx + 1),
          slaDays: stepPayload.slaDays || null,
          assignedToCreator: Boolean(stepPayload.assignedToCreator),
          assignmentConditions: stepPayload.assignmentConditions || null,
          actions: Array.isArray(stepPayload.actions) ? [...stepPayload.actions] : [],
          allowedFileTypes: Array.isArray(stepPayload.allowedFileTypes) ? [...stepPayload.allowedFileTypes] : [],
          flowConditions: Array.isArray(stepPayload.flowConditions)
            ? stepPayload.flowConditions.map(condition => ({ ...condition }))
            : [],
          reuseData: Array.isArray(stepPayload.reuseData)
            ? stepPayload.reuseData.map(item => ({ ...item }))
            : [],
          signatureRequirements: Array.isArray(stepPayload.signatureRequirements)
            ? stepPayload.signatureRequirements.map(req => ({ ...req }))
            : [],
          reviewSettings: stepPayload.reviewSettings
            ? { ...stepPayload.reviewSettings }
            : null
        }
      })
    }


    if (isEditing.value) {
      await processTypeStore.updateProcessType(formData.value.id, payload)
      window.showSnackbar?.('Tipo de processo atualizado com sucesso!', 'success')
    } else {
      if (!payload.companyId) {
        window.showSnackbar?.('Erro: ID da empresa não encontrado.', 'error')
        saving.value = false
        return
      }
      await processTypeStore.createProcessType(payload)
      window.showSnackbar?.('Tipo de processo criado com sucesso!', 'success')
    }
    router.push({ name: 'TiposDeProcesso' })
  } catch (e) {
    console.error('Save error:', e)
    window.showSnackbar?.(e.response?.data?.message || 'Erro ao salvar', 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.back()
}

// Drag and drop functions for fields
function onFieldDragStart(event, index) {
  draggedFieldIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target)
  event.target.style.opacity = '0.4'
}

function onFieldDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverFieldIndex.value = null
}

function onFieldDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverFieldIndex.value = index
}

function onFieldDragLeave() {
  // Opcional: pode remover o highlight
}

function onFieldDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedFieldIndex.value

  if (dragIndex !== null && dragIndex !== dropIndex) {
    const fields = [...formData.value.formFields]
    const draggedItem = fields[dragIndex]

    // Remove o item da posição original
    fields.splice(dragIndex, 1)

    // Insere na nova posição
    fields.splice(dropIndex, 0, draggedItem)

    // Atualiza as ordens
    formData.value.formFields = fields.map((field, idx) => ({
      ...field,
      order: idx + 1
    }))

    window.showSnackbar?.('Ordem dos campos atualizada', 'success')
  }

  draggedFieldIndex.value = null
  dragOverFieldIndex.value = null
}

// Drag and drop functions for steps
function onStepDragStart(event, index) {
  draggedStepIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target)
  event.target.style.opacity = '0.4'
}

function onStepDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverStepIndex.value = null
}

function onStepDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverStepIndex.value = index
}

function onStepDragLeave() {
  // Opcional: pode remover o highlight
}

function onStepDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedStepIndex.value

  if (dragIndex !== null && dragIndex !== dropIndex) {
    const steps = [...formData.value.steps]
    const draggedItem = steps[dragIndex]

    // Remove o item da posição original
    steps.splice(dragIndex, 1)

    // Insere na nova posição
    steps.splice(dropIndex, 0, draggedItem)

    // Atualiza as ordens
    formData.value.steps = steps.map((step, idx) => ({
      ...step,
      order: idx + 1
    }))

    window.showSnackbar?.('Ordem das etapas atualizada', 'success')
  }

  draggedStepIndex.value = null
  dragOverStepIndex.value = null
}

onMounted(async () => {
  try {
    // Ignorar mudanças no watcher durante o carregamento inicial
    ignoreNextAllowedChildProcessTypesChange.value = true

    await Promise.all([
      sectorStore.fetchSectors?.(),
      userStore.fetchUsers?.(),
      loadAllProcessTypes()
    ])

    if (isEditing.value) {
      await processTypeStore.fetchProcessType(route.params.id)
      const current = processTypeStore.currentProcessType
      console.log('📥 Loaded process type:', current)
      console.log('📥 FormFields loaded:', current?.formFields)
      console.log('📥 TABLE fields loaded:', current?.formFields?.filter(f => f.type === 'TABLE'))
      if (current) {
        formData.value = {
          id: current.id,
          name: current.name || '',
          description: current.description || '',
          isChildProcessOnly: current.isChildProcessOnly || false,
          allowSubProcesses: current.allowSubProcesses ?? true,
          allowSubTasks: current.allowSubTasks ?? true,
          steps: Array.isArray(current.steps) ? [...current.steps] : [],
          formFields: Array.isArray(current.formFields) ? [...current.formFields] : [],
          allowedChildProcessTypes: Array.isArray(current.allowedChildProcessTypes) ? [...current.allowedChildProcessTypes] : []
        }
      }
    }

    // Aguardar próximo tick para garantir que o watcher processou a mudança inicial
    setTimeout(() => {
      ignoreNextAllowedChildProcessTypesChange.value = false
    }, 100)
  } catch (e) {
    console.error(e)
    window.showSnackbar?.('Erro ao carregar dados', 'error')
  }
})
</script>

<style scoped>
.draggable-field,
.draggable-step {
  transition: all 0.3s ease;
  cursor: move;
}

.draggable-field:hover,
.draggable-step:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.dragging-over {
  border-top: 3px solid #1976d2 !important;
  background-color: rgba(25, 118, 210, 0.08) !important;
}

.drag-handle {
  cursor: grab !important;
}

.drag-handle:active {
  cursor: grabbing !important;
}

/* Animação de arrastar */
.draggable-field[draggable="true"],
.draggable-step[draggable="true"] {
  cursor: grab;
}

.draggable-field[draggable="true"]:active,
.draggable-step[draggable="true"]:active {
  cursor: grabbing;
}

/* Estilos para o modal de criar tipo de sub-processo */
.create-child-type-dialog {
  border-radius: 16px !important;
  overflow: hidden;
}

.create-child-type-header {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  position: relative;
}

.create-child-type-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.create-child-type-header .icon-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-child-type-header .text-white-50 {
  color: rgba(255, 255, 255, 0.7) !important;
}

/* Estilos para o toggle de modalidade */
.modality-toggle {
  border-radius: 8px !important;
  overflow: hidden;
}

.modality-toggle .v-btn {
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: normal !important;
}

/* Estilo para cards de coluna da tabela */
.column-card {
  background: #f8f9fa !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
}
</style>
