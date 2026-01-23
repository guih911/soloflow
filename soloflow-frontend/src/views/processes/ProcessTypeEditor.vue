<template>
  <div class="process-type-editor">
    <!-- Modern Page Header -->
    <div class="page-header">
      <div class="header-left">
        <v-btn
          icon
          variant="text"
          color="white"
          @click="goBack"
          class="back-btn"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="header-text">
          <h1 class="page-title">{{ isEditing ? 'Editar' : 'Novo' }} Tipo de Processo</h1>
          <p class="page-subtitle">Configure o fluxo de trabalho, campos e etapas</p>
        </div>
      </div>
      <div class="header-actions">
        <v-btn
          variant="outlined"
          color="white"
          @click="goBack"
          class="cancel-btn"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="white"
          variant="flat"
          :loading="saving"
          :disabled="!valid || formData.steps.length === 0"
          @click="save"
          class="save-btn"
        >
          <v-icon start>mdi-check</v-icon>
          {{ isEditing ? 'Salvar' : 'Criar' }}
        </v-btn>
      </div>
    </div>

    <!-- Main Content -->
    <v-form ref="form" v-model="valid" class="editor-content">
      <!-- Navigation Tabs -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            <v-icon size="20">{{ tab.icon }}</v-icon>
            <span class="tab-label">{{ tab.label }}</span>
            <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Basic Info Tab -->
        <div v-if="activeTab === 'basic'" class="tab-panel">
          <div class="panel-card">
            <div class="panel-header">
              <div class="panel-icon panel-icon--primary">
                <v-icon size="20">mdi-information</v-icon>
              </div>
              <div>
                <h3 class="panel-title">Informações Básicas</h3>
                <p class="panel-subtitle">Nome, descrição e configurações gerais</p>
              </div>
            </div>

            <div class="panel-body">
              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label class="form-label">Nome do Processo *</label>
                  <v-text-field
                    v-model="formData.name"
                    placeholder="Ex: Solicitação de Férias"
                    :rules="nameRules"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="form-input"
                  />
                </div>

                <div class="form-group form-group--full">
                  <label class="form-label">Descrição</label>
                  <v-textarea
                    v-model="formData.description"
                    placeholder="Descreva o propósito deste tipo de processo..."
                    rows="3"
                    counter="500"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="form-input"
                  />
                </div>
              </div>

              <div class="config-section">
                <h4 class="config-title">
                  <v-icon size="18" class="mr-2">mdi-cog</v-icon>
                  Configurações
                </h4>

                <div class="config-grid">
                  <div class="config-card" :class="{ 'config-card--active': formData.isChildProcessOnly }">
                    <div class="config-card-header">
                      <v-switch
                        v-model="formData.isChildProcessOnly"
                        color="secondary"
                        hide-details
                        density="compact"
                      />
                      <div class="config-card-icon">
                        <v-icon size="20">mdi-source-branch</v-icon>
                      </div>
                    </div>
                    <h5 class="config-card-title">Somente Subprocesso</h5>
                    <p class="config-card-desc">Este tipo só pode ser usado como subprocesso de outro processo</p>
                  </div>

                  <div class="config-card" :class="{ 'config-card--active': formData.allowSubProcesses }">
                    <div class="config-card-header">
                      <v-switch
                        v-model="formData.allowSubProcesses"
                        color="primary"
                        hide-details
                        density="compact"
                      />
                      <div class="config-card-icon">
                        <v-icon size="20">mdi-file-tree</v-icon>
                      </div>
                    </div>
                    <h5 class="config-card-title">Permitir Subprocessos</h5>
                    <p class="config-card-desc">Habilita a criação de subprocessos vinculados</p>
                  </div>

                  <div class="config-card" :class="{ 'config-card--active': formData.allowSubTasks }">
                    <div class="config-card-header">
                      <v-switch
                        v-model="formData.allowSubTasks"
                        color="primary"
                        hide-details
                        density="compact"
                      />
                      <div class="config-card-icon">
                        <v-icon size="20">mdi-checkbox-multiple-marked</v-icon>
                      </div>
                    </div>
                    <h5 class="config-card-title">Permitir Subtarefas</h5>
                    <p class="config-card-desc">Habilita a criação de subtarefas nas etapas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Fields Tab -->
        <div v-if="activeTab === 'fields'" class="tab-panel">
          <div class="panel-card">
            <div class="panel-header">
              <div class="panel-icon panel-icon--info">
                <v-icon size="20">mdi-form-textbox</v-icon>
              </div>
              <div>
                <h3 class="panel-title">Campos do Formulário</h3>
                <p class="panel-subtitle">Campos que serão preenchidos ao iniciar o processo</p>
              </div>
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                @click="addField"
                class="ml-auto"
              >
                <v-icon start size="18">mdi-plus</v-icon>
                Adicionar Campo
              </v-btn>
            </div>

            <div class="panel-body">
              <!-- Empty State -->
              <div v-if="formData.formFields.length === 0" class="empty-panel">
                <div class="empty-panel-icon">
                  <v-icon size="32">mdi-form-textbox</v-icon>
                </div>
                <h4 class="empty-panel-title">Nenhum campo adicionado</h4>
                <p class="empty-panel-text">Adicione campos que serão preenchidos ao iniciar o processo</p>
                <v-btn color="primary" variant="flat" @click="addField">
                  <v-icon start>mdi-plus</v-icon>
                  Adicionar Primeiro Campo
                </v-btn>
              </div>

              <!-- Fields List -->
              <div v-else class="items-list">
                <div
                  v-for="(field, index) in formData.formFields"
                  :key="field.id || field.tempId || index"
                  class="item-row"
                  :class="{ 'item-row--dragging': dragOverFieldIndex === index }"
                  draggable="true"
                  @dragstart="onFieldDragStart($event, index)"
                  @dragend="onFieldDragEnd"
                  @dragover="onFieldDragOver($event, index)"
                  @dragleave="onFieldDragLeave"
                  @drop="onFieldDrop($event, index)"
                >
                  <div class="item-drag">
                    <v-icon size="20" color="grey">mdi-drag-vertical</v-icon>
                  </div>

                  <div class="item-icon" :class="`item-icon--${getFieldTypeColor(field.type)}`">
                    <v-icon size="18">{{ getFieldTypeIcon(field.type) }}</v-icon>
                  </div>

                  <div class="item-content">
                    <div class="item-header">
                      <span class="item-name">{{ field.label }}</span>
                      <span v-if="field.required" class="item-badge item-badge--error">Obrigatório</span>
                    </div>
                    <div class="item-meta">
                      <span class="meta-tag">
                        <v-icon size="12">mdi-code-tags</v-icon>
                        {{ field.name }}
                      </span>
                      <span class="meta-tag">
                        <v-icon size="12">mdi-format-list-bulleted-type</v-icon>
                        {{ getFieldTypeText(field.type) }}
                      </span>
                    </div>
                  </div>

                  <div class="item-actions">
                    <v-btn icon size="small" variant="text" @click="editField(index)">
                      <v-icon size="18">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" color="error" @click="removeField(index)">
                      <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Steps Tab -->
        <div v-if="activeTab === 'steps'" class="tab-panel">
          <div class="panel-card">
            <div class="panel-header">
              <div class="panel-icon panel-icon--warning">
                <v-icon size="20">mdi-debug-step-over</v-icon>
              </div>
              <div>
                <h3 class="panel-title">Etapas do Processo</h3>
                <p class="panel-subtitle">Defina o fluxo de trabalho do processo</p>
              </div>
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                @click="addStep"
                class="ml-auto"
              >
                <v-icon start size="18">mdi-plus</v-icon>
                Adicionar Etapa
              </v-btn>
            </div>

            <div class="panel-body">
              <!-- Empty State -->
              <div v-if="formData.steps.length === 0" class="empty-panel">
                <div class="empty-panel-icon empty-panel-icon--warning">
                  <v-icon size="32">mdi-debug-step-over</v-icon>
                </div>
                <h4 class="empty-panel-title">Nenhuma etapa adicionada</h4>
                <p class="empty-panel-text">Adicione as etapas que compõem o fluxo do processo</p>
                <v-btn color="primary" variant="flat" @click="addStep">
                  <v-icon start>mdi-plus</v-icon>
                  Adicionar Primeira Etapa
                </v-btn>
              </div>

              <!-- Steps List -->
              <div v-else class="steps-flow">
                <div
                  v-for="(step, index) in formData.steps"
                  :key="step.id || step.tempId || index"
                  class="step-item"
                  :class="{ 'step-item--dragging': dragOverStepIndex === index }"
                  draggable="true"
                  @dragstart="onStepDragStart($event, index)"
                  @dragend="onStepDragEnd"
                  @dragover="onStepDragOver($event, index)"
                  @dragleave="onStepDragLeave"
                  @drop="onStepDrop($event, index)"
                >
                  <div class="step-connector" v-if="index > 0">
                    <div class="connector-line"></div>
                    <v-icon size="16" color="grey">mdi-chevron-down</v-icon>
                  </div>

                  <div class="step-card">
                    <div class="step-drag">
                      <v-icon size="20" color="grey">mdi-drag-vertical</v-icon>
                    </div>

                    <div class="step-number" :class="`step-number--${getStepTypeColor(step.type)}`">
                      {{ index + 1 }}
                    </div>

                    <div class="step-content">
                      <div class="step-header">
                        <span class="step-name">{{ step.name }}</span>
                        <span class="step-type-badge" :class="`badge--${getStepTypeColor(step.type)}`">
                          {{ getStepTypeText(step.type) }}
                        </span>
                        <span v-if="step.assignedToCreator" class="step-type-badge badge--secondary">
                          <v-icon size="12">mdi-account-plus</v-icon>
                          Criador
                        </span>
                      </div>

                      <div class="step-details">
                        <span v-if="!step.assignedToCreator && (step.assignedToSectorId || step.assignedToUserId)" class="detail-item">
                          <v-icon size="14">mdi-account-check</v-icon>
                          {{ getResponsibleName(step) }}
                        </span>
                        <span v-if="step.slaDays" class="detail-item">
                          <v-icon size="14">mdi-clock-outline</v-icon>
                          SLA: {{ step.slaDays }} dia(s)
                        </span>
                      </div>

                      <div class="step-features">
                        <span v-if="step.allowAttachment" class="feature-chip">
                          <v-icon size="12">mdi-paperclip</v-icon>
                          Anexos
                        </span>
                        <span v-if="step.requiresSignature" class="feature-chip feature-chip--error">
                          <v-icon size="12">mdi-draw-pen</v-icon>
                          Assinatura
                        </span>
                        <span v-if="step.actions?.length > 0" class="feature-chip">
                          {{ step.actions.length }} ações
                        </span>
                      </div>
                    </div>

                    <div class="step-actions">
                      <v-btn icon size="small" variant="text" @click="editStep(index)">
                        <v-icon size="18">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon size="small" variant="text" color="error" @click="removeStep(index)">
                        <v-icon size="18">mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Subprocesses Tab -->
        <div v-if="activeTab === 'subprocesses'" class="tab-panel">
          <div class="panel-card">
            <div class="panel-header">
              <div class="panel-icon panel-icon--success">
                <v-icon size="20">mdi-source-branch</v-icon>
              </div>
              <div>
                <h3 class="panel-title">Sub-Processos Permitidos</h3>
                <p class="panel-subtitle">Configure quais tipos de processo podem ser vinculados</p>
              </div>
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                @click="openCreateChildTypeDialog"
                class="ml-auto"
              >
                <v-icon start size="18">mdi-plus</v-icon>
                Criar Novo Tipo
              </v-btn>
            </div>

            <div class="panel-body">
              <div class="subprocess-selector">
                <v-select
                  v-model="formData.allowedChildProcessTypes"
                  :items="availableProcessTypesForChild"
                  item-title="name"
                  item-value="id"
                  label="Selecione os tipos de sub-processo permitidos"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  :loading="loadingProcessTypes"
                  class="form-input"
                  @update:model-value="saveAllowedChildProcessTypes"
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
                      <v-icon start size="14">mdi-file-document-outline</v-icon>
                      {{ item.raw.name }}
                    </v-chip>
                  </template>
                </v-select>
              </div>

              <!-- Selected Types -->
              <div v-if="formData.allowedChildProcessTypes?.length > 0" class="selected-types">
                <h4 class="selected-title">
                  <v-icon start size="18">mdi-check-circle</v-icon>
                  {{ formData.allowedChildProcessTypes.length }} tipo(s) selecionado(s)
                </h4>
                <div class="selected-list">
                  <div
                    v-for="typeId in formData.allowedChildProcessTypes"
                    :key="typeId"
                    class="selected-item"
                  >
                    <v-icon color="success" size="18">mdi-check-circle</v-icon>
                    <span class="selected-name">{{ getProcessTypeName(typeId) }}</span>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      @click="removeAllowedChildType(typeId)"
                    >
                      <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-panel empty-panel--small">
                <v-icon size="32" color="grey">mdi-source-branch</v-icon>
                <p class="empty-panel-text">Nenhum sub-processo configurado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-form>

    <!-- Field Dialog -->
    <v-dialog v-model="fieldDialog" max-width="800" persistent>
      <v-card class="dialog-card">
        <div class="dialog-header">
          <div class="dialog-header-icon">
            <v-icon size="24" color="white">mdi-form-textbox</v-icon>
          </div>
          <div class="dialog-header-text">
            <h3 class="dialog-title">{{ editingFieldIndex !== null ? 'Editar' : 'Novo' }} Campo</h3>
            <p class="dialog-subtitle">Configure os atributos do campo</p>
          </div>
          <v-btn icon variant="text" @click="closeFieldDialog" class="dialog-close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-form ref="fieldForm" v-model="fieldValid">
          <v-card-text class="dialog-content">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Nome do Campo (identificador) *</label>
                <v-text-field
                  v-model="fieldData.name"
                  placeholder="Ex: data_nascimento"
                  :rules="[v => !!v || 'O nome do campo é obrigatório', v => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(v) || 'Use apenas letras, números e underscore']"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Rótulo (exibido ao usuário) *</label>
                <v-text-field
                  v-model="fieldData.label"
                  placeholder="Ex: Data de Nascimento"
                  :rules="[v => !!v || 'O rótulo é obrigatório']"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Tipo de Campo *</label>
                <v-select
                  v-model="fieldData.type"
                  :items="fieldTypes"
                  :rules="[v => !!v || 'O tipo do campo é obrigatório']"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Placeholder</label>
                <v-text-field
                  v-model="fieldData.placeholder"
                  placeholder="Texto de exemplo..."
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </div>

              <div class="form-group">
                <label class="form-label">Valor Padrão</label>
                <v-text-field
                  v-model="fieldData.defaultValue"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </div>

              <div class="form-group form-group--switch">
                <v-switch
                  v-model="fieldData.required"
                  label="Campo Obrigatório"
                  color="primary"
                  hide-details
                />
              </div>

              <div class="form-group form-group--full">
                <label class="form-label">Texto de Ajuda</label>
                <v-textarea
                  v-model="fieldData.helpText"
                  rows="2"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </div>

              <!-- Dropdown Options -->
              <div v-if="fieldData.type === 'DROPDOWN'" class="form-group form-group--full">
                <div class="options-header">
                  <label class="form-label">Opções da Lista Suspensa</label>
                  <v-btn size="small" variant="tonal" color="primary" @click="addDropdownOption">
                    <v-icon start size="16">mdi-plus</v-icon>
                    Adicionar
                  </v-btn>
                </div>

                <v-alert v-if="!fieldData.options?.length" type="info" variant="tonal" density="compact" class="mt-2">
                  Clique em "Adicionar" para criar as opções
                </v-alert>

                <div v-else class="options-list">
                  <div v-for="(option, idx) in fieldData.options" :key="idx" class="option-row">
                    <v-text-field
                      v-model="option.label"
                      placeholder="Texto exibido"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                    <v-text-field
                      v-model="option.value"
                      placeholder="Valor interno"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                    <v-btn icon size="small" color="error" variant="text" @click="removeDropdownOption(idx)">
                      <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Checkbox Options -->
              <div v-if="fieldData.type === 'CHECKBOX'" class="form-group form-group--full">
                <div class="options-header">
                  <label class="form-label">Opções de Checkbox</label>
                  <v-btn size="small" variant="tonal" color="primary" @click="addCheckboxOption">
                    <v-icon start size="16">mdi-plus</v-icon>
                    Adicionar
                  </v-btn>
                </div>

                <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                  Sem opções = checkbox único. Com opções = múltipla seleção.
                </v-alert>

                <div v-if="fieldData.options?.length" class="options-list">
                  <div v-for="(option, idx) in fieldData.options" :key="idx" class="option-row option-row--single">
                    <v-text-field
                      v-model="fieldData.options[idx]"
                      placeholder="Opção"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                    <v-btn icon size="small" color="error" variant="text" @click="removeCheckboxOption(idx)">
                      <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Table Columns -->
              <div v-if="fieldData.type === 'TABLE'" class="form-group form-group--full">
                <div class="options-header">
                  <label class="form-label">
                    <v-icon start size="18">mdi-table</v-icon>
                    Colunas da Tabela (máx. 5)
                  </label>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    :disabled="fieldData.tableColumns?.length >= 5"
                    @click="addTableColumn"
                  >
                    <v-icon start size="16">mdi-plus</v-icon>
                    Adicionar
                  </v-btn>
                </div>

                <v-alert v-if="!fieldData.tableColumns?.length" type="info" variant="tonal" density="compact" class="mt-2">
                  Configure as colunas da tabela dinâmica
                </v-alert>

                <div v-else class="table-columns-list">
                  <div v-for="(column, idx) in fieldData.tableColumns" :key="idx" class="table-column-item">
                    <div class="column-header">
                      <span class="column-number">{{ idx + 1 }}</span>
                      <div class="column-actions">
                        <v-btn icon size="x-small" variant="text" :disabled="idx === 0" @click="moveTableColumn(idx, -1)">
                          <v-icon size="16">mdi-arrow-up</v-icon>
                        </v-btn>
                        <v-btn icon size="x-small" variant="text" :disabled="idx === fieldData.tableColumns.length - 1" @click="moveTableColumn(idx, 1)">
                          <v-icon size="16">mdi-arrow-down</v-icon>
                        </v-btn>
                        <v-btn icon size="x-small" variant="text" color="error" @click="removeTableColumn(idx)">
                          <v-icon size="16">mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </div>
                    <div class="column-fields">
                      <v-text-field
                        v-model="column.label"
                        label="Nome"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                      <v-select
                        v-model="column.type"
                        :items="tableColumnTypes"
                        label="Tipo"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                      <v-switch
                        v-model="column.required"
                        label="Obrig."
                        density="compact"
                        hide-details
                      />
                    </div>
                  </div>
                </div>

                <div class="table-limits">
                  <v-text-field
                    v-model.number="fieldData.minRows"
                    label="Mín. linhas"
                    type="number"
                    min="0"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                  <v-text-field
                    v-model.number="fieldData.maxRows"
                    label="Máx. linhas"
                    type="number"
                    min="1"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </div>
              </div>
            </div>
          </v-card-text>

          <div class="dialog-actions">
            <v-btn variant="text" @click="closeFieldDialog">Cancelar</v-btn>
            <v-btn color="primary" variant="flat" :disabled="!fieldValid" @click="saveField">
              {{ editingFieldIndex !== null ? 'Salvar' : 'Adicionar' }}
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Step Dialog Component -->
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

    <!-- Create Child Type Dialog -->
    <v-dialog v-model="createChildTypeDialog" max-width="600" persistent>
      <v-card class="dialog-card">
        <div class="dialog-header dialog-header--secondary">
          <div class="dialog-header-icon">
            <v-icon size="24" color="white">mdi-file-document-plus</v-icon>
          </div>
          <div class="dialog-header-text">
            <h3 class="dialog-title">Criar Novo Tipo de Sub-Processo</h3>
            <p class="dialog-subtitle">Será automaticamente vinculado como sub-processo permitido</p>
          </div>
          <v-btn icon variant="text" @click="closeCreateChildTypeDialog" class="dialog-close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-form ref="childTypeForm" v-model="childTypeFormValid">
          <v-card-text class="dialog-content">
            <div class="form-grid">
              <div class="form-group form-group--full">
                <label class="form-label">Nome do Tipo de Processo *</label>
                <v-text-field
                  v-model="childTypeData.name"
                  placeholder="Ex: Aditivo de Contrato"
                  :rules="[v => !!v || 'O nome é obrigatório', v => (v?.length ?? 0) >= 3 || 'O nome deve ter no mínimo 3 caracteres']"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="form-group form-group--full">
                <label class="form-label">Descrição</label>
                <v-textarea
                  v-model="childTypeData.description"
                  placeholder="Descreva o propósito..."
                  rows="2"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </div>

              <div class="form-group form-group--full">
                <label class="form-label">Modalidade</label>
                <v-btn-toggle
                  v-model="childTypeData.modality"
                  mandatory
                  color="primary"
                  variant="outlined"
                  class="modality-toggle"
                >
                  <v-btn value="MANUAL">
                    <v-icon start size="18">mdi-hand-pointing-up</v-icon>
                    Manual
                  </v-btn>
                  <v-btn value="RECURRENT">
                    <v-icon start size="18">mdi-refresh</v-icon>
                    Recorrente
                  </v-btn>
                  <v-btn value="SCHEDULED">
                    <v-icon start size="18">mdi-calendar-clock</v-icon>
                    Agendado
                  </v-btn>
                </v-btn-toggle>
              </div>

              <!-- Recurrence Config -->
              <div v-if="childTypeData.modality === 'RECURRENT'" class="form-group form-group--full">
                <div class="config-box">
                  <label class="form-label">Configuração de Recorrência</label>
                  <div class="inline-fields">
                    <v-text-field
                      v-model.number="childTypeData.recurrenceInterval"
                      type="number"
                      label="Intervalo"
                      min="1"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                    <v-select
                      v-model="childTypeData.recurrenceUnit"
                      :items="recurrenceUnits"
                      label="Unidade"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </div>
                </div>
              </div>

              <!-- Schedule Config -->
              <div v-if="childTypeData.modality === 'SCHEDULED'" class="form-group form-group--full">
                <div class="config-box">
                  <label class="form-label">Configuração de Agendamento</label>
                  <div class="inline-fields">
                    <v-text-field
                      v-model="childTypeData.scheduledDate"
                      type="date"
                      label="Data"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                    <v-text-field
                      v-model="childTypeData.scheduledTime"
                      type="time"
                      label="Hora"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </div>
                </div>
              </div>

              <div class="form-group form-group--full">
                <v-checkbox
                  v-model="childTypeData.createBasicStep"
                  label="Criar com uma etapa básica de aprovação"
                  color="primary"
                  hide-details
                />
              </div>
            </div>
          </v-card-text>

          <div class="dialog-actions">
            <v-btn variant="text" @click="closeCreateChildTypeDialog" :disabled="savingChildType">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="savingChildType"
              :disabled="!childTypeFormValid"
              @click="createChildType"
            >
              <v-icon start>mdi-plus</v-icon>
              Criar e Vincular
            </v-btn>
          </div>
        </v-form>
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

// DEBUG: Log quando activeTab mudar
watch(activeTab, (newVal, oldVal) => {
  console.log('🔄 activeTab changed:', oldVal, '→', newVal)
  console.trace('Stack trace para identificar origem:')
})

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

// Tabs configuration
const tabs = computed(() => [
  { value: 'basic', label: 'Informações', icon: 'mdi-information', count: 0 },
  { value: 'fields', label: 'Campos', icon: 'mdi-form-textbox', count: formData.value.formFields.length },
  { value: 'steps', label: 'Etapas', icon: 'mdi-debug-step-over', count: formData.value.steps.length },
  { value: 'subprocesses', label: 'Sub-Processos', icon: 'mdi-source-branch', count: formData.value.allowedChildProcessTypes?.length || 0 }
])

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

const fieldData = ref({
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
})

const isEditing = computed(() => !!route.params.id && route.params.id !== 'new')
const sectors = computed(() => sectorStore.sectors || [])
const users = computed(() => userStore.users || [])

// Tipos de processo disponíveis para serem sub-processos
const availableProcessTypesForChild = computed(() => {
  return allProcessTypes.value.filter(pt => {
    if (isEditing.value && pt.id === formData.value.id) return false
    if (!pt.isActive) return false
    if (pt.isChildProcessOnly !== true) return false
    return true
  })
})

const nameRules = [
  v => !!v || 'O nome é obrigatório',
  v => (v?.length ?? 0) >= 3 || 'O nome deve ter no mínimo 3 caracteres'
]

// Flag para ignorar a primeira mudança do watcher (carga inicial)
const ignoreNextAllowedChildProcessTypesChange = ref(true)
// Guarda o último valor salvo para evitar saves desnecessários
const lastSavedChildProcessTypes = ref('')

// Função para salvar sub-processos manualmente (chamada pelo botão ou blur)
async function saveAllowedChildProcessTypes() {
  if (!isEditing.value || !formData.value.id) return

  const currentIds = (formData.value.allowedChildProcessTypes || []).sort().join(',')
  if (currentIds === lastSavedChildProcessTypes.value) return

  try {
    await processTypeStore.updateProcessType(formData.value.id, {
      allowedChildProcessTypes: formData.value.allowedChildProcessTypes || []
    })
    lastSavedChildProcessTypes.value = currentIds
    window.showSnackbar?.('Sub-processos atualizados!', 'success')
  } catch (err) {
    console.error('Erro ao atualizar sub-processos:', err)
    window.showSnackbar?.('Erro ao atualizar', 'error')
  }
}

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
]

const tableColumnTypes = [
  { title: 'Texto', value: 'TEXT' },
  { title: 'Número', value: 'NUMBER' },
  { title: 'Dinheiro', value: 'CURRENCY' },
  { title: 'Data', value: 'DATE' }
]

function getFieldTypeColor(type) {
  const colors = { TEXT: 'blue', NUMBER: 'green', DATE: 'orange', EMAIL: 'purple', DROPDOWN: 'teal', FILE: 'red', TABLE: 'indigo', CURRENCY: 'green', TEXTAREA: 'blue', CPF: 'purple', CNPJ: 'purple', PHONE: 'blue' }
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

function getProcessTypeName(typeId) {
  const pt = allProcessTypes.value.find(p => p.id === typeId)
  return pt?.name || 'Tipo não encontrado'
}

function removeAllowedChildType(typeId) {
  const index = formData.value.allowedChildProcessTypes.indexOf(typeId)
  if (index > -1) {
    formData.value.allowedChildProcessTypes.splice(index, 1)
    saveAllowedChildProcessTypes()
  }
}

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
}

async function createChildType() {
  if (!childTypeFormValid.value) return

  savingChildType.value = true
  try {
    const payload = {
      name: childTypeData.value.name,
      description: childTypeData.value.description || '',
      companyId: authStore.activeCompanyId,
      formFields: [],
      steps: []
    }

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

    const newType = await processTypeStore.createProcessType(payload)

    if (newType && newType.id) {
      if (!formData.value.allowedChildProcessTypes) {
        formData.value.allowedChildProcessTypes = []
      }
      formData.value.allowedChildProcessTypes.push(newType.id)

      if (isEditing.value && formData.value.id) {
        await processTypeStore.updateProcessType(formData.value.id, {
          allowedChildProcessTypes: formData.value.allowedChildProcessTypes
        })
      }

      await loadAllProcessTypes()
      window.showSnackbar?.(`Tipo "${newType.name}" criado!`, 'success')
      closeCreateChildTypeDialog()
    }
  } catch (err) {
    console.error('Erro ao criar tipo:', err)
    window.showSnackbar?.(err.response?.data?.message || 'Erro ao criar tipo', 'error')
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
    console.error('Erro ao carregar tipos:', err)
  } finally {
    loadingProcessTypes.value = false
  }
}

// Field management
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

function addDropdownOption() {
  if (!fieldData.value.options) fieldData.value.options = []
  fieldData.value.options.push({ label: '', value: '' })
}

function removeDropdownOption(index) {
  fieldData.value.options.splice(index, 1)
}

function addCheckboxOption() {
  if (!fieldData.value.options) fieldData.value.options = []
  fieldData.value.options.push('')
}

function removeCheckboxOption(index) {
  fieldData.value.options.splice(index, 1)
}

function addTableColumn() {
  if (!fieldData.value.tableColumns) fieldData.value.tableColumns = []
  if (fieldData.value.tableColumns.length >= 5) {
    window.showSnackbar?.('Máximo de 5 colunas', 'warning')
    return
  }
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
    window.showSnackbar?.('Corrija os erros', 'error')
    return
  }

  if (fieldData.value.type === 'DROPDOWN') {
    if (!fieldData.value.options?.length) {
      window.showSnackbar?.('Adicione opções', 'error')
      return
    }
    const hasEmpty = fieldData.value.options.some(opt => !opt.label?.trim() || !opt.value?.trim())
    if (hasEmpty) {
      window.showSnackbar?.('Preencha todas as opções', 'error')
      return
    }
  }

  if (fieldData.value.type === 'TABLE') {
    if (!fieldData.value.tableColumns?.length) {
      window.showSnackbar?.('Adicione colunas', 'error')
      return
    }
    const hasEmptyLabels = fieldData.value.tableColumns.some(col => !col.label?.trim())
    if (hasEmptyLabels) {
      window.showSnackbar?.('Preencha o nome das colunas', 'error')
      return
    }
    fieldData.value.tableColumns.forEach((col, idx) => {
      if (!col.name || col.name.startsWith('coluna_')) {
        col.name = col.label.trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          || `coluna_${idx + 1}`
      }
    })
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

  if (isEditingField) {
    formData.value.formFields[editingFieldIndex.value] = field
  } else {
    formData.value.formFields.push(field)
  }

  window.showSnackbar?.(`Campo "${field.label}" ${isEditingField ? 'atualizado' : 'adicionado'}`, 'success')
  closeFieldDialog()
}

// Step management
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

  const processedStep = {
    ...stepData,
    tempId: isEditingStep ? formData.value.steps[editingStepIndex.value].tempId : Date.now() + Math.random(),
    order: isEditingStep ? formData.value.steps[editingStepIndex.value].order : (formData.value.steps.length + 1),
    actions: Array.isArray(stepData.actions) ? [...stepData.actions] : [],
    allowedFileTypes: Array.isArray(stepData.allowedFileTypes) ? [...stepData.allowedFileTypes] : [],
    flowConditions: Array.isArray(stepData.flowConditions) ? stepData.flowConditions.map(c => ({ ...c })) : [],
    reuseData: Array.isArray(stepData.reuseData) ? stepData.reuseData.map(i => ({ ...i })) : [],
    signatureRequirements: Array.isArray(stepData.signatureRequirements) ? stepData.signatureRequirements.map(r => ({ ...r })) : [],
    reviewSettings: stepData.reviewSettings ? { ...stepData.reviewSettings } : null
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
      steps: formData.value.steps.map((s, idx) => ({
        ...s,
        order: s.order ?? (idx + 1),
        slaDays: s.slaDays || null,
        assignedToCreator: Boolean(s.assignedToCreator),
        assignmentConditions: s.assignmentConditions || null,
        actions: Array.isArray(s.actions) ? [...s.actions] : [],
        allowedFileTypes: Array.isArray(s.allowedFileTypes) ? [...s.allowedFileTypes] : [],
        flowConditions: Array.isArray(s.flowConditions) ? s.flowConditions.map(c => ({ ...c })) : [],
        reuseData: Array.isArray(s.reuseData) ? s.reuseData.map(i => ({ ...i })) : [],
        signatureRequirements: Array.isArray(s.signatureRequirements) ? s.signatureRequirements.map(r => ({ ...r })) : [],
        reviewSettings: s.reviewSettings ? { ...s.reviewSettings } : null
      }))
    }

    if (isEditing.value) {
      await processTypeStore.updateProcessType(formData.value.id, payload)
      window.showSnackbar?.('Tipo de processo atualizado!', 'success')
    } else {
      if (!payload.companyId) {
        window.showSnackbar?.('Erro: ID da empresa não encontrado', 'error')
        saving.value = false
        return
      }
      await processTypeStore.createProcessType(payload)
      window.showSnackbar?.('Tipo de processo criado!', 'success')
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

// Drag and drop for fields
function onFieldDragStart(event, index) {
  draggedFieldIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.4'
}

function onFieldDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverFieldIndex.value = null
}

function onFieldDragOver(event, index) {
  event.preventDefault()
  dragOverFieldIndex.value = index
}

function onFieldDragLeave() {}

function onFieldDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedFieldIndex.value
  if (dragIndex !== null && dragIndex !== dropIndex) {
    const fields = [...formData.value.formFields]
    const [draggedItem] = fields.splice(dragIndex, 1)
    fields.splice(dropIndex, 0, draggedItem)
    formData.value.formFields = fields.map((field, idx) => ({ ...field, order: idx + 1 }))
    window.showSnackbar?.('Ordem atualizada', 'success')
  }
  draggedFieldIndex.value = null
  dragOverFieldIndex.value = null
}

// Drag and drop for steps
function onStepDragStart(event, index) {
  draggedStepIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.style.opacity = '0.4'
}

function onStepDragEnd(event) {
  event.target.style.opacity = '1'
  dragOverStepIndex.value = null
}

function onStepDragOver(event, index) {
  event.preventDefault()
  dragOverStepIndex.value = index
}

function onStepDragLeave() {}

function onStepDrop(event, dropIndex) {
  event.preventDefault()
  const dragIndex = draggedStepIndex.value
  if (dragIndex !== null && dragIndex !== dropIndex) {
    const steps = [...formData.value.steps]
    const [draggedItem] = steps.splice(dragIndex, 1)
    steps.splice(dropIndex, 0, draggedItem)
    formData.value.steps = steps.map((step, idx) => ({ ...step, order: idx + 1 }))
    window.showSnackbar?.('Ordem atualizada', 'success')
  }
  draggedStepIndex.value = null
  dragOverStepIndex.value = null
}

onMounted(async () => {
  console.log('🚀 ProcessTypeEditor onMounted - activeTab:', activeTab.value)
  try {
    ignoreNextAllowedChildProcessTypesChange.value = true

    console.log('📥 Carregando dados iniciais...')
    await Promise.all([
      sectorStore.fetchSectors?.(),
      userStore.fetchUsers?.(),
      loadAllProcessTypes()
    ])
    console.log('✅ Dados iniciais carregados - activeTab:', activeTab.value)

    if (isEditing.value) {
      console.log('📝 Modo edição - carregando tipo de processo...')
      await processTypeStore.fetchProcessType(route.params.id)
      const current = processTypeStore.currentProcessType
      if (current) {
        const childTypes = Array.isArray(current.allowedChildProcessTypes) ? [...current.allowedChildProcessTypes] : []
        formData.value = {
          id: current.id,
          name: current.name || '',
          description: current.description || '',
          isChildProcessOnly: current.isChildProcessOnly || false,
          allowSubProcesses: current.allowSubProcesses ?? true,
          allowSubTasks: current.allowSubTasks ?? true,
          steps: Array.isArray(current.steps) ? [...current.steps] : [],
          formFields: Array.isArray(current.formFields) ? [...current.formFields] : [],
          allowedChildProcessTypes: childTypes
        }
        // Inicializa o valor salvo para evitar saves desnecessários
        lastSavedChildProcessTypes.value = childTypes.sort().join(',')
        console.log('✅ FormData carregado - activeTab:', activeTab.value)
      }
    }
  } catch (e) {
    console.error('❌ Erro no onMounted:', e)
    window.showSnackbar?.('Erro ao carregar dados', 'error')
  }
  console.log('🏁 onMounted finalizado - activeTab:', activeTab.value)
})
</script>

<style scoped>
.process-type-editor {
  min-height: 100vh;
  background: var(--color-neutral-50);
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: white !important;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 0;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  border-color: rgba(255, 255, 255, 0.4) !important;
  text-transform: none;
}

.save-btn {
  text-transform: none;
  color: var(--color-primary-600) !important;
}

/* Editor Content */
.editor-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Tabs Container */
.tabs-container {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  padding: 8px;
  margin-bottom: 24px;
}

.tabs-nav {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-800);
}

.tab-btn--active {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

.tab-label {
  display: none;
}

@media (min-width: 768px) {
  .tab-label {
    display: inline;
  }
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--color-neutral-200);
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tab-btn--active .tab-count {
  background: var(--color-primary-200);
  color: var(--color-primary-700);
}

/* Panel Card */
.panel-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 16px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-surface-border);
}

.panel-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panel-icon--primary { background: var(--color-primary-100); color: var(--color-primary-600); }
.panel-icon--info { background: var(--color-info-100); color: var(--color-info-600); }
.panel-icon--warning { background: var(--color-warning-100); color: var(--color-warning-600); }
.panel-icon--success { background: var(--color-success-100); color: var(--color-success-600); }

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.panel-subtitle {
  font-size: 0.8125rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.panel-body {
  padding: 24px;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group--full {
  grid-column: 1 / -1;
}

.form-group--switch {
  display: flex;
  align-items: center;
}

.form-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin-bottom: 8px;
}

.form-input :deep(.v-field) {
  border-radius: 10px;
}

/* Config Section */
.config-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-surface-border);
}

.config-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.config-card {
  padding: 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.config-card--active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.config-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.config-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-neutral-200);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-600);
}

.config-card--active .config-card-icon {
  background: var(--color-primary-200);
  color: var(--color-primary-700);
}

.config-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 4px 0;
}

.config-card-desc {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin: 0;
  line-height: 1.4;
}

/* Empty Panel */
.empty-panel {
  text-align: center;
  padding: 48px 24px;
}

.empty-panel--small {
  padding: 32px 24px;
}

.empty-panel-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--color-neutral-400);
}

.empty-panel-icon--warning {
  background: var(--color-warning-100);
  color: var(--color-warning-600);
}

.empty-panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 4px;
}

.empty-panel-text {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0 0 20px;
}

/* Items List */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-surface-border);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.2s ease;
}

.item-row:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.item-row--dragging {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.item-drag {
  cursor: grab;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon--blue { background: var(--color-info-100); color: var(--color-info-600); }
.item-icon--green { background: var(--color-success-100); color: var(--color-success-600); }
.item-icon--orange { background: var(--color-warning-100); color: var(--color-warning-600); }
.item-icon--purple { background: #f3e8ff; color: #7c3aed; }
.item-icon--teal { background: #f0fdfa; color: #0d9488; }
.item-icon--red { background: var(--color-error-100); color: var(--color-error-600); }
.item-icon--indigo { background: #eff6ff; color: #2563eb; }
.item-icon--grey { background: var(--color-neutral-200); color: var(--color-neutral-600); }

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-neutral-800);
}

.item-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.item-badge--error {
  background: var(--color-error-100);
  color: var(--color-error-700);
}

.item-meta {
  display: flex;
  gap: 12px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.item-actions {
  display: flex;
  gap: 4px;
}

/* Steps Flow */
.steps-flow {
  display: flex;
  flex-direction: column;
}

.step-item {
  position: relative;
}

.step-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  color: var(--color-neutral-400);
}

.connector-line {
  width: 2px;
  height: 16px;
  background: var(--color-neutral-300);
}

.step-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.step-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.step-item--dragging .step-card {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.step-drag {
  cursor: grab;
  padding-top: 4px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.step-number--blue { background: var(--color-info-500); }
.step-number--orange { background: var(--color-warning-500); }
.step-number--purple { background: #7c3aed; }
.step-number--teal { background: #0d9488; }
.step-number--red { background: var(--color-error-500); }
.step-number--grey { background: var(--color-neutral-500); }

.step-content {
  flex: 1;
  min-width: 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.step-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.step-type-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.badge--blue { background: var(--color-info-100); color: var(--color-info-700); }
.badge--orange { background: var(--color-warning-100); color: var(--color-warning-700); }
.badge--purple { background: #f3e8ff; color: #7c3aed; }
.badge--teal { background: #f0fdfa; color: #0d9488; }
.badge--red { background: var(--color-error-100); color: var(--color-error-700); }
.badge--secondary { background: var(--color-secondary-100); color: var(--color-secondary-700); }

.step-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--color-neutral-600);
}

.step-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 3px 8px;
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
  border-radius: 4px;
}

.feature-chip--error {
  background: var(--color-error-50);
  color: var(--color-error-600);
}

.step-actions {
  display: flex;
  gap: 4px;
}

/* Subprocess Selector */
.subprocess-selector {
  margin-bottom: 24px;
}

.selected-types {
  margin-top: 24px;
}

.selected-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-success-50);
  border-radius: 10px;
}

.selected-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-neutral-800);
}

/* Dialog Styles */
.dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2) !important;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  color: white !important;
}

.dialog-header--secondary {
  background: linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-600));
}

.dialog-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-header-text {
  flex: 1;
  color: white !important;
}

.dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: white !important;
}

.dialog-subtitle {
  font-size: 0.8125rem;
  opacity: 0.85;
  margin: 0;
  color: white !important;
}

.dialog-close {
  color: white !important;
}

.dialog-content {
  padding: 24px !important;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--color-neutral-50);
  border-top: 1px solid var(--color-surface-border);
}

.dialog-actions :deep(.v-btn) {
  text-transform: none;
}

/* Options */
.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.option-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.option-row--single {
  grid-template-columns: 1fr auto;
}

/* Table Columns */
.table-columns-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.table-column-item {
  padding: 12px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-surface-border);
  border-radius: 10px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.column-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-500);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.column-actions {
  display: flex;
  gap: 4px;
}

.column-fields {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: center;
}

.table-limits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

/* Config Box */
.config-box {
  padding: 16px;
  background: var(--color-neutral-50);
  border-radius: 10px;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

/* Modality Toggle */
.modality-toggle {
  width: 100%;
  border-radius: 10px !important;
}

.modality-toggle .v-btn {
  flex: 1;
  text-transform: none !important;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
  }

  .header-left {
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .header-actions .v-btn {
    flex: 1;
  }

  .editor-content {
    padding: 16px;
  }

  .tabs-nav {
    overflow-x: auto;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .panel-header .v-btn {
    width: 100%;
  }
}
</style>
