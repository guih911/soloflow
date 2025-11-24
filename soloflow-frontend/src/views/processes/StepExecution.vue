<template>
  <!-- Modal de visualização de anexos -->
  <AttachmentPreviewModal
    v-model="showPreview"
    :attachment="selectedAttachment"
  />

  <div v-if="stepExecution && process" class="step-execution-container">
    <div class="execution-header mb-8">
      <div class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-4" size="large" />
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <v-avatar :color="getStepTypeColor(stepExecution.step.type)" size="56" class="mr-8 step-avatar">
              <v-icon size="28" color="white">{{ getStepTypeIcon(stepExecution.step.type) }}</v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h4 font-weight-bold text-primary">{{ stepExecution.step.name }}</h1>
              <p class="text-h6 text-medium-emphasis">  {{ process.processType?.name || 'Processo' }}</p>
              <p v-if="process.title && process.title !== 'undefined'" class="text-body-2 text-medium-emphasis">{{ process.title }}</p>
            </div>
          </div>
          <div class="d-flex flex-wrap mt-3 chips-container">
            <v-chip size="small" :color="getStepTypeColor(stepExecution.step.type)" variant="tonal">
              <v-icon start size="16">{{ getStepTypeIcon(stepExecution.step.type) }}</v-icon>
              {{ getStepTypeText(stepExecution.step.type) }}
            </v-chip>
            <v-chip v-if="stepExecution.step.requiresSignature" size="small" color="error" variant="tonal">
              <v-icon start size="16">mdi-draw-pen</v-icon> Requer Assinatura
            </v-chip>
            <v-chip v-if="stepExecution.step.allowAttachment" size="small" color="info" variant="tonal">
              <v-icon start size="16">mdi-paperclip</v-icon> Permite Anexos
            </v-chip>
            <v-chip size="small" color="primary" variant="outlined">
              <v-icon start size="16">mdi-account-check</v-icon> {{ getResponsibleName(stepExecution) }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <v-row>
      <v-col cols="12" lg="8">
        <v-card class="execution-form-card mb-6" elevation="4">
          <div class="form-card-header pa-6">
            <div class="d-flex align-center">
              <v-icon color="primary" size="32" class="mr-3">mdi-clipboard-edit</v-icon>
              <div>
                <h2 class="text-h5 font-weight-bold">Executar Etapa</h2>
                <p class="text-body-1 text-medium-emphasis mt-1">Preencha as informações necessárias para concluir esta etapa</p>
              </div>
            </div>
          </div>
          <v-divider />

          <div class="form-card-content pa-6">
            <div v-if="slaStatus.hasDeadline" class="sla-progress-container mb-6">
              <div class="d-flex align-center mb-1">
                <v-icon :color="progressColor" class="mr-2">mdi-timer-outline</v-icon>
                <div class="text-subtitle-1 font-weight-medium">Prazo de Conclusão</div>
                <v-spacer />
                <div class="text-body-2 font-weight-medium" :class="`text-${progressColor}`">
                  <span v-if="!slaStatus.isOverdue">Restam {{ slaStatus.remainingText }}</span>
                  <span v-else>Atrasado {{ slaStatus.overdueText }}</span>
                </div>
              </div>
              <v-progress-linear :model-value="progressPercentage" :color="progressColor" height="8" rounded />
              <div class="text-caption text-medium-emphasis text-right mt-1">
                Prazo final: {{ slaStatus.deadline }}
              </div>
            </div>

            <!-- Seção de Documentos do Processo para etapas de REVISÃO -->
            <div v-if="stepExecution.step.type === 'REVIEW' && processDocuments.length > 0" class="form-section mb-6">
              <div class="section-header mb-4">
                <h3 class="text-subtitle-1 font-weight-bold d-flex align-center">
                  <v-icon color="teal" class="mr-2">mdi-file-document-multiple</v-icon>
                  Documentos para Revisão
                  <v-chip size="x-small" color="teal" variant="tonal" class="ml-2">
                    {{ processDocuments.length }}
                  </v-chip>
                </h3>
                <p class="text-caption text-medium-emphasis mt-1">
                  Documentos das etapas anteriores selecionadas para revisão
                </p>
              </div>

              <div class="documents-review-list">
                <div
                  v-for="(doc, index) in processDocuments"
                  :key="doc.id || index"
                  class="document-review-item"
                >
                  <div class="d-flex align-center">
                    <v-avatar :color="getFileTypeColor(doc.mimeType)" size="44" class="mr-3">
                      <v-icon color="white" size="22">{{ getFileIcon(doc.mimeType) }}</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-medium">{{ doc.originalName }}</div>
                      <div class="text-caption text-medium-emphasis d-flex align-center ga-2">
                        <span class="d-flex align-center">
                          <v-icon size="12" class="mr-1">mdi-debug-step-over</v-icon>
                          Etapa {{ doc.stepOrder }}: {{ doc.fieldLabel }}
                        </span>
                        <span>•</span>
                        <span>{{ formatFileSize(doc.size) }}</span>
                        <template v-if="doc.isSigned">
                          <span>•</span>
                          <v-chip size="x-small" color="success" variant="tonal">
                            <v-icon start size="10">mdi-check</v-icon>
                            Assinado
                          </v-chip>
                        </template>
                      </div>
                    </div>
                    <div class="d-flex align-center ga-1">
                      <v-btn
                        size="small"
                        variant="tonal"
                        color="primary"
                        @click="viewProcessDocument(doc)"
                      >
                        <v-icon start size="16">mdi-eye</v-icon>
                        Visualizar
                      </v-btn>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="grey-darken-1"
                        @click="downloadProcessDocument(doc)"
                      >
                        <v-icon>mdi-download</v-icon>
                        <v-tooltip activator="parent" location="top">Baixar</v-tooltip>
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <v-form ref="form" v-model="valid" class="execution-form">
              <div v-if="stepExecution.step.type === 'INPUT'" class="form-section mb-2">
                <v-row v-if="stepFormFields.length > 0" dense>
                  <v-col v-for="field in stepFormFields" :key="field.name" :cols="getFieldCols(field)" class="pa-2">
                    <!-- Campo especial para arquivo -->
                    <template v-if="field.type === 'FILE'">
                      <div class="file-field-container" style="position: relative;">
                        <v-text-field
                          :model-value="getFileFieldDisplayValue(field.name)"
                          :label="getFieldLabel(field)"
                          :placeholder="field.placeholder || 'Clique para selecionar arquivo(s)'"
                          :hint="field.helpText"
                          :persistent-hint="!!field.helpText"
                          :rules="getFieldRules(field)"
                          variant="outlined"
                          density="comfortable"
                          readonly
                          @click="triggerFileInput(field.name)"
                          class="file-input-field"
                          style="cursor: pointer;"
                        >
                          <template v-slot:append-inner>
                            <v-icon>mdi-paperclip</v-icon>
                          </template>
                        </v-text-field>
                        
                        <input 
                          :ref="el => setFileInputRef(`fileInput_${field.name}`, el)"
                          type="file" 
                          style="display: none" 
                          :multiple="(field.maxFiles || 1) > 1"
                          @change="handleFieldFileSelect($event, field)"
                          :accept="getFieldFileTypes(field)"
                        />
                        
                        <!-- Chips dos arquivos selecionados abaixo do input -->
                        <div v-if="getFieldFiles(field.name).length > 0" class="selected-files-chips mt-2">
                          <v-chip
                            v-for="(file, fileIndex) in getFieldFiles(field.name)"
                            :key="fileIndex"
                            size="small"
                            color="primary"
                            variant="outlined"
                            closable
                            @click:close="removeFieldFile(field.name, fileIndex)"
                            class="mr-2 mb-1"
                          >
                            <v-icon start size="14">{{ getFileIcon(file.type) }}</v-icon>
                            {{ file.name }}
                          </v-chip>
                        </div>
                      </div>
                    </template>
                    
                    <!-- Campos normais -->
                    <template v-else>
                      <component 
                        :is="getFieldComponent(field.type)" 
                        v-model="formData.metadata[field.name]" 
                        :label="getFieldLabel(field)" 
                        :placeholder="field.placeholder" 
                        :hint="field.helpText" 
                        :persistent-hint="!!field.helpText" 
                        :rules="getFieldRules(field)" 
                        :items="getFieldOptions(field)" 
                        :type="getFieldInputType(field.type)" 
                        variant="outlined" 
                        density="comfortable" 
                      />
                    </template>
                  </v-col>
                </v-row>
              </div>

              <div v-if="stepExecution.step.type === 'APPROVAL'" class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="orange" class="mr-2">mdi-check-decagram</v-icon>Decisão de Aprovação</h3>
                  <p class="text-body-2 text-medium-emphasis">Analise as informações e tome sua decisão</p>
                </div>
                <v-card variant="outlined" class="approval-decision-card">
                  <v-card-text class="pa-4">
                    <v-radio-group v-model="formData.action" :rules="[v => !!v || 'Selecione uma decisão']" class="approval-radio-group">
                      <div class="approval-options">
                        <v-card class="approval-option approval-approve" :class="{ 'approval-selected': formData.action === 'aprovar' }" variant="outlined" @click="formData.action = 'aprovar'">
                          <v-card-text class="pa-4 text-center"><v-radio value="aprovar" class="mb-2" /><v-icon size="32" color="success" class="mb-2">mdi-check-circle</v-icon><div class="approval-label text-success">Aprovar</div><div class="approval-description">Aprovar e avançar</div></v-card-text>
                        </v-card>
                        <v-card class="approval-option approval-reject" :class="{ 'approval-selected': formData.action === 'reprovar' }" variant="outlined" @click="formData.action = 'reprovar'">
                          <v-card-text class="pa-4 text-center"><v-radio value="reprovar" class="mb-2" /><v-icon size="32" color="error" class="mb-2">mdi-close-circle</v-icon><div class="approval-label text-error">Reprovar</div><div class="approval-description">Reprovar e encerrar</div></v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                    <v-alert v-if="formData.action === 'reprovar'" type="warning" variant="tonal" class="mt-4"><strong>Atenção:</strong> A reprovação encerrará este processo.</v-alert>
                  </v-card-text>
                </v-card>
              </div>

              <div v-else-if="availableActions.length > 0" class="form-section mb-6">
                 <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="primary" class="mr-2">mdi-gesture-tap</v-icon>Ação a Executar</h3>
                  <p class="text-body-2 text-medium-emphasis">Selecione a ação que deseja executar</p>
                </div>
                <v-card variant="outlined" class="action-selection-card">
                  <v-card-text class="pa-4">
                    <v-radio-group v-model="formData.action" :rules="[v => !!v || 'Selecione uma ação']" class="action-radio-group">
                      <div class="actions-grid">
                        <v-card v-for="action in availableActions" :key="action" class="action-option" :class="{ 'action-selected': formData.action === action }" variant="outlined" @click="formData.action = action">
                          <v-card-text class="pa-4 text-center"><v-radio :value="action" class="mb-2" /><div class="action-label">{{ getActionLabel(action) }}</div><div class="action-description">{{ getActionDescription(action) }}</div></v-card-text>
                        </v-card>
                      </div>
                    </v-radio-group>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Seção de Anexos - Design Profissional Limpo -->
              <div v-if="stepExecution.step.allowAttachment" class="form-section mb-6">
                <div class="section-header mb-3">
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <h3 class="text-subtitle-1 font-weight-bold">Anexos</h3>
                      <p class="text-caption text-medium-emphasis mt-1">Adicione os documentos necessários</p>
                    </div>
                    <v-chip
                      v-if="stepExecution.step.requireAttachment"
                      size="small"
                      color="error"
                      variant="flat"
                    >
                      Obrigatório
                    </v-chip>
                  </div>
                </div>

                <!-- Upload Area - Minimalista -->
                <div class="upload-zone mb-4" @click="fileInput?.click()">
                  <input
                    ref="fileInput"
                    type="file"
                    style="display: none"
                    multiple
                    @change="handleFileSelect"
                    :accept="allowedFileTypes"
                  />
                  <v-icon size="32" color="primary" class="mb-2">mdi-cloud-upload</v-icon>
                  <p class="text-body-2 font-weight-medium mb-1">Clique para selecionar arquivos</p>
                  <p class="text-caption text-medium-emphasis">PDF, Imagens, Office • Máx. 10MB</p>
                </div>
                <!-- Lista de Arquivos - Design Limpo -->
                <div v-if="attachments.length > 0" class="files-list">
                  <div v-for="(file, index) in attachments" :key="index">
                    <v-list class="pa-0">
                      <v-list-item class="file-item">
                        <template v-slot:prepend>
                          <v-icon :color="getFileTypeColor(file.type)" size="24">
                            {{ getFileIcon(file.type) }}
                          </v-icon>
                        </template>

                        <v-list-item-title class="text-body-2">
                          {{ file.name }}
                        </v-list-item-title>

                        <v-list-item-subtitle class="text-caption">
                          {{ formatFileSize(file.size) }}
                          <span v-if="file.signers && file.signers.length > 0" class="ml-2 text-success">
                            • {{ file.signers.length }} assinante(s)
                          </span>
                        </v-list-item-subtitle>

                        <template v-slot:append>
                          <div class="d-flex align-center ga-1">
                            <v-btn
                              v-if="file.type === 'application/pdf'"
                              @click="toggleSignatureConfig(index)"
                              :color="file.signers && file.signers.length > 0 ? 'success' : 'primary'"
                              variant="text"
                              size="small"
                              icon
                            >
                              <v-icon size="20">
                                {{ file.signers && file.signers.length > 0 ? 'mdi-account-check' : 'mdi-file-sign' }}
                              </v-icon>
                              <v-tooltip activator="parent" location="top">
                                {{ file.signers && file.signers.length > 0 ? 'Editar assinantes' : 'Configurar assinantes' }}
                              </v-tooltip>
                            </v-btn>

                            <v-btn
                              icon
                              size="small"
                              variant="text"
                              color="error"
                              @click="removeFile(index)"
                            >
                              <v-icon size="20">mdi-delete</v-icon>
                              <v-tooltip activator="parent" location="top">Remover</v-tooltip>
                            </v-btn>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>

                    <!-- Lista de assinantes configurados (sempre visível quando há assinantes) -->
                    <div
                      v-if="file.signers && file.signers.length > 0 && !file.showSignatureConfig"
                      class="signers-summary pa-3"
                      style="background: #f9fafb; border-left: 3px solid #4caf50;"
                    >
                      <div class="d-flex align-center mb-2">
                        <v-icon size="18" color="success" class="mr-2">mdi-account-check</v-icon>
                        <span class="text-body-2 font-weight-medium text-success">
                          Assinantes Configurados ({{ file.signatureType === 'SEQUENTIAL' ? 'Sequencial' : 'Paralelo' }})
                        </span>
                      </div>
                      <v-chip-group column>
                        <v-chip
                          v-for="(signerId, signerIndex) in file.signers"
                          :key="signerId"
                          size="small"
                          :prepend-icon="file.signatureType === 'SEQUENTIAL' ? `mdi-numeric-${signerIndex + 1}-circle` : 'mdi-account'"
                          color="success"
                          variant="tonal"
                        >
                          {{ getSignerName(signerId) }}
                        </v-chip>
                      </v-chip-group>
                    </div>

                    <!-- Painel de configuração de assinantes (aparece quando expandido) -->
                    <v-expand-transition>
                      <div v-if="file.showSignatureConfig" class="signature-config-panel pa-4">
                        <div class="d-flex align-center justify-space-between mb-4">
                          <div class="d-flex align-center">
                            <v-icon color="primary" class="mr-2" size="24">mdi-file-sign</v-icon>
                            <div>
                              <h4 class="text-subtitle-1 font-weight-bold">Assinatura Digital</h4>
                              <p class="text-caption text-medium-emphasis ma-0">Configure quem deve assinar este documento</p>
                            </div>
                          </div>
                          <v-chip
                            size="small"
                            :color="stepExecution.step.requiresSignature ? 'error' : 'primary'"
                            variant="flat"
                            prepend-icon="mdi-information"
                          >
                            {{ stepExecution.step.requiresSignature ? 'Obrigatório' : 'Opcional' }}
                          </v-chip>
                        </div>

                        <!-- Tipo de assinatura - Design minimalista -->
                        <div class="mb-4">
                          <label class="text-caption font-weight-medium mb-2 d-block text-medium-emphasis">Tipo de Assinatura</label>
                          <v-btn-toggle
                            v-model="file.signatureType"
                            mandatory
                            divided
                            variant="outlined"
                            color="primary"
                            density="compact"
                            class="w-100"
                          >
                            <v-btn value="SEQUENTIAL" size="small" class="text-none flex-1">
                              <v-icon start size="18">mdi-order-numeric-ascending</v-icon>
                              <span class="text-body-2">Sequencial</span>
                            </v-btn>
                            <v-btn value="PARALLEL" size="small" class="text-none flex-1">
                              <v-icon start size="18">mdi-account-multiple</v-icon>
                              <span class="text-body-2">Paralelo</span>
                            </v-btn>
                          </v-btn-toggle>
                        </div>

                        <!-- Autocomplete de assinantes - Design Profissional Minimalista -->
                        <v-autocomplete
                          v-model="file.signers"
                          :items="availableSigners"
                          item-value="id"
                          item-title="name"
                          label="Assinantes"
                          placeholder="Digite para buscar..."
                          multiple
                          chips
                          closable-chips
                          variant="outlined"
                          density="compact"
                          @update:model-value="onSignersChanged(index)"
                          clearable
                          :custom-filter="customSignerFilter"
                          hide-details
                        >
                          <template v-slot:chip="{ props, item }">
                            <v-chip v-bind="props" size="small" class="signer-chip-minimal">
                              <v-avatar :color="getAvatarColor(item.raw.name)" size="20" class="mr-1">
                                <span style="font-size: 9px; font-weight: bold;" class="text-white">
                                  {{ getInitials(item.raw.name) }}
                                </span>
                              </v-avatar>
                              {{ item.raw.name }}
                            </v-chip>
                          </template>
                          <template v-slot:item="{ props, item }">
                            <v-list-item v-bind="props" :title="null" :subtitle="null" class="signer-item-minimal">
                              <template v-slot:prepend>
                                <v-avatar :color="getAvatarColor(item.raw.name)" size="32">
                                  <span class="text-caption font-weight-bold text-white">
                                    {{ getInitials(item.raw.name) }}
                                  </span>
                                </v-avatar>
                              </template>
                              <v-list-item-title class="text-body-2 font-weight-medium">
                                {{ item.raw.name }}
                              </v-list-item-title>
                              <v-list-item-subtitle class="text-caption text-medium-emphasis">
                                {{ item.raw.email }}
                              </v-list-item-subtitle>
                            </v-list-item>
                          </template>
                        </v-autocomplete>

                        <!-- Lista ordenável (modo sequencial) - Minimalista -->
                        <div v-if="file.signatureType === 'SEQUENTIAL' && file.signers && file.signers.length > 0" class="mt-3">
                          <div class="d-flex align-center mb-2">
                            <v-icon size="16" class="mr-1">mdi-order-numeric-ascending</v-icon>
                            <span class="text-caption font-weight-medium">Ordem de Assinatura</span>
                          </div>
                          <v-list density="compact" class="signature-order-list-minimal">
                            <v-list-item v-for="(signerId, signerIndex) in file.signers" :key="signerId" class="px-2 py-1">
                              <template v-slot:prepend>
                                <span class="order-number">{{ signerIndex + 1 }}</span>
                              </template>
                              <v-list-item-title class="text-body-2">{{ getSignerName(signerId) }}</v-list-item-title>
                              <v-list-item-subtitle class="text-caption">{{ getSignerEmail(signerId) }}</v-list-item-subtitle>
                              <template v-slot:append>
                                <v-btn-group density="compact" variant="text">
                                  <v-btn v-if="signerIndex > 0" icon="mdi-arrow-up" size="x-small" @click="moveSignerUpInFile(index, signerIndex)" />
                                  <v-btn v-if="signerIndex < file.signers.length - 1" icon="mdi-arrow-down" size="x-small" @click="moveSignerDownInFile(index, signerIndex)" />
                                </v-btn-group>
                              </template>
                            </v-list-item>
                          </v-list>
                        </div>

                        <!-- Resumo (modo paralelo) -->
                        <div v-else-if="file.signatureType === 'PARALLEL' && file.signers && file.signers.length > 0" class="mt-3">
                          <v-alert type="info" density="compact" variant="tonal">
                            <span class="text-caption">{{ file.signers.length }} pessoa(s) poderá(ão) assinar em qualquer ordem</span>
                          </v-alert>
                        </div>
                      </div>
                    </v-expand-transition>

                    <v-divider v-if="index < attachments.length - 1" />
                  </div>
                </div>
              </div>

              <div v-if="showReviewField" class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center">
                    <v-icon color="teal" class="mr-2">mdi-note-text</v-icon>
                    {{ reviewFieldLabel }}
                    <v-chip
                      v-if="reviewSettings.required"
                      size="x-small"
                      color="error"
                      class="ml-2"
                    >
                      Obrigatório
                    </v-chip>
                  </h3>
                  <p v-if="reviewFieldHint" class="text-body-2 text-medium-emphasis">
                    {{ reviewFieldHint }}
                  </p>
                </div>
                <v-textarea
                  v-model="reviewFieldValue"
                  :label="reviewFieldLabel"
                  :rules="reviewFieldRules"
                  :hint="reviewFieldHint || undefined"
                  :persistent-hint="!!reviewFieldHint"
                  rows="4"
                  counter="1000"
                  variant="outlined"
                />
              </div>

              <!-- Seção de Comentário -->
              <div class="form-section mb-6">
                <div class="section-header mb-4">
                  <h3 class="text-h6 font-weight-bold d-flex align-center"><v-icon color="primary" class="mr-2">mdi-comment-edit</v-icon>Comentário<v-chip v-if="isCommentRequired" size="x-small" color="error" class="ml-2">Obrigatório</v-chip></h3>
                  <p class="text-body-2 text-medium-emphasis">{{ getCommentHelpText() }}</p>
                </div>
                <v-textarea v-model="formData.comment" label="Seu comentário sobre esta etapa" :placeholder="getCommentPlaceholder()" rows="4" counter="1000" :rules="getCommentRules()" variant="outlined" class="comment-textarea" />
              </div>
            </v-form>
          </div>

          <v-divider />
          
          <div class="form-card-actions pa-6">
            <div class="d-flex align-center justify-space-between">
              <v-btn variant="text" size="large" @click="goBack">
                <v-icon start>mdi-arrow-left</v-icon>
                Cancelar
              </v-btn>
              <v-btn color="primary" variant="elevated" size="large" :loading="saving" :disabled="!canSubmit" @click="executeStep" class="execute-btn">
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                Concluir Etapa
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="info-card mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4"><v-icon color="primary" class="mr-2">mdi-information-outline</v-icon>Detalhes da Etapa</v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-list density="comfortable">
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-format-title</v-icon></template><v-list-item-title>Nome</v-list-item-title><v-list-item-subtitle>{{ stepExecution.step.name }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-shape</v-icon></template><v-list-item-title>Tipo</v-list-item-title><v-list-item-subtitle>{{ getStepTypeText(stepExecution.step.type) }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-account-check</v-icon></template><v-list-item-title>Responsável</v-list-item-title><v-list-item-subtitle>{{ getResponsibleName(stepExecution) }}</v-list-item-subtitle></v-list-item>
              <v-list-item><template v-slot:prepend><v-icon color="primary">mdi-calendar</v-icon></template><v-list-item-title>Iniciada em</v-list-item-title><v-list-item-subtitle>{{ formatDate(stepExecution.createdAt) }}</v-list-item-subtitle></v-list-item>
              <v-list-item v-if="slaStatus.hasDeadline"><template v-slot:prepend><v-icon color="primary">mdi-timer-outline</v-icon></template><v-list-item-title>Prazo</v-list-item-title><v-list-item-subtitle>{{ slaStatus.deadline }}</v-list-item-subtitle></v-list-item>
            </v-list>
          </v-card-text>
          
          <!-- Instruções movidas para dentro do card de detalhes -->
          <template v-if="stepExecution.step.instructions">
            <v-divider />
            <v-expansion-panels variant="accordion" class="instructions-panel">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <div class="d-flex align-center">
                    <v-icon class="mr-3" color="info">mdi-lightbulb</v-icon>
                    <div class="font-weight-medium text-info">Instruções para Execução</div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="formatted-instructions" v-html="formatInstructions(stepExecution.step.instructions)" />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
        </v-card>

        <!-- Componente de informações de etapas anteriores -->
        <PreviousStepsInfo 
          v-if="previousStepsData.length > 0" 
          :previous-steps-data="previousStepsData" 
          class="mb-4"
        />

        <ProcessHistory :history="process.stepExecutions" :process-form-fields="process.processType?.formFields || []" />
      </v-col>
    </v-row>
  </div>

  <div v-else-if="loading" class="loading-container"><div class="text-center py-12"><v-progress-circular indeterminate color="primary" size="64" width="6" /><p class="text-h6 mt-4 text-medium-emphasis">Carregando etapa...</p><p class="text-body-2 text-grey">Preparando ambiente de execução</p></div></div>
  <div v-else-if="!loading && !stepExecution" class="error-container"><div class="text-center py-12"><v-icon size="64" color="error" class="mb-4">mdi-alert-circle-outline</v-icon><h2 class="text-h5 font-weight-bold mb-2">Erro ao carregar a etapa</h2><p class="text-body-1 text-medium-emphasis">Não foi possível encontrar os dados da etapa.</p><v-btn class="mt-6" color="primary" variant="tonal" @click="goBack"><v-icon start>mdi-arrow-left</v-icon>Voltar</v-btn></div></div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcessStore } from '@/stores/processes'
import { useUserStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useSignaturesStore } from '@/stores/signatures'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/pt-br'

import ProcessHistory from '@/components/ProcessHistory.vue'
import PreviousStepsInfo from '@/components/PreviousStepsInfo.vue'
import AttachmentPreviewModal from '@/components/AttachmentPreviewModal.vue'
import { VTextField, VTextarea, VSelect, VCheckbox, VSwitch } from 'vuetify/components'

dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('pt-br')

const router = useRouter()
const route = useRoute()
const processStore = useProcessStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const signaturesStore = useSignaturesStore()

const valid = ref(false)
const saving = ref(false)
const attachments = ref([])
const uploadedAttachments = ref([])
const fieldFiles = ref({}) // Arquivos específicos dos campos FILE
const fileInputRefs = ref({}) // Referências dos inputs de arquivo
const instructionsExpanded = ref(false)
const form = ref(null)
const fileInput = ref(null)
const now = ref(dayjs())
const showPreview = ref(false)
const selectedAttachment = ref(null)
let timer = null

// Nota: Configuração de assinantes agora é por arquivo (dentro de attachments)

const formData = ref({
  action: null,
  comment: '',
  metadata: {}
})

const DEFAULT_REVIEW_SETTINGS = {
  enabled: false,
  fieldName: 'reviewNotes',
  fieldLabel: 'Notas da Revisão',
  required: false,
  hint: ''
}

function normalizeReviewSettings(settings) {
  if (!settings) return { ...DEFAULT_REVIEW_SETTINGS }
  let parsed = settings
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      parsed = null
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_REVIEW_SETTINGS }
  }
  return {
    enabled: parsed.enabled ?? true,
    fieldName: (parsed.fieldName || 'reviewNotes').toString(),
    fieldLabel: parsed.fieldLabel || 'Notas da Revisão',
    required: Boolean(parsed.required),
    hint: parsed.hint || ''
  }
}

const DEFAULT_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z'

const loading = computed(() => processStore.loading)
const process = computed(() => processStore.currentProcess)
const stepExecution = computed(() => process.value?.stepExecutions.find(se => se.id === route.params.stepId))

const stepFormFields = computed(() => {
  if (stepExecution.value?.step.type !== 'INPUT') return []
  const conditions = stepExecution.value.step.conditions
  if (!conditions) return []
  try {
    const parsed = typeof conditions === 'string' ? JSON.parse(conditions) : conditions
    return Array.isArray(parsed.fields) ? parsed.fields : []
  } catch (error) {
    console.error('Error parsing step conditions:', error); return []
  }
})

// Documentos do processo para etapas de REVIEW (baseado em reuseData configurado)
const processDocuments = computed(() => {
  if (!process.value || !stepExecution.value?.step) return []

  const docs = []
  const seenIds = new Set()
  const step = stepExecution.value.step

  if (step.reuseData) {
    try {
      const reuseConfig = typeof step.reuseData === 'string'
        ? JSON.parse(step.reuseData)
        : step.reuseData

      if (Array.isArray(reuseConfig)) {
        reuseConfig.forEach((config) => {
          if (config.type === 'attachment') {
            // Anexos do formulário principal (primeira etapa/criação)
            if (config.source === 'form') {
              const firstStep = process.value?.stepExecutions?.find(
                exec => exec.step.order === 1
              )
              if (firstStep?.attachments?.length > 0) {
                firstStep.attachments.forEach(att => {
                  if (seenIds.has(att.id)) return

                  // Filtrar por campo específico se configurado
                  if (config.fieldName) {
                    const sigData = att.signatureData
                      ? (typeof att.signatureData === 'string' ? JSON.parse(att.signatureData) : att.signatureData)
                      : {}
                    const attFieldName = sigData.fieldName || sigData.sourceFieldName || ''
                    if (attFieldName !== config.fieldName) return
                  }

                  seenIds.add(att.id)
                  docs.push({
                    id: att.id,
                    originalName: att.originalName || 'Arquivo',
                    size: att.size || 0,
                    mimeType: att.mimeType || 'application/octet-stream',
                    fieldLabel: 'Formulário',
                    stepOrder: 1,
                    isSigned: att.isSigned || false
                  })
                })
              }
            } else {
              // Anexos de etapas específicas
              const sourceStep = process.value?.stepExecutions?.find(
                exec => exec.step.order === config.sourceStep
              )

              if (sourceStep?.attachments?.length > 0) {
                sourceStep.attachments.forEach(att => {
                  if (seenIds.has(att.id)) return

                  // Se fieldName foi especificado, filtrar por ele
                  if (config.fieldName) {
                    const sigData = att.signatureData
                      ? (typeof att.signatureData === 'string' ? JSON.parse(att.signatureData) : att.signatureData)
                      : {}
                    const attFieldName = sigData.fieldName || sigData.sourceFieldName || ''
                    if (attFieldName !== config.fieldName) return
                  }

                  seenIds.add(att.id)
                  docs.push({
                    id: att.id,
                    originalName: att.originalName || 'Arquivo',
                    size: att.size || 0,
                    mimeType: att.mimeType || 'application/octet-stream',
                    fieldLabel: sourceStep.step.name,
                    stepOrder: sourceStep.step.order,
                    isSigned: att.isSigned || false
                  })
                })
              }
            }
          }
        })
      }
    } catch (error) {
      console.error('Error parsing reuseData for processDocuments:', error)
    }
  }

  return docs
})

const availableActions = computed(() => {
  if (!stepExecution.value?.step.actions) return []
  try {
    const actions = typeof stepExecution.value.step.actions === 'string' ? JSON.parse(stepExecution.value.step.actions) : stepExecution.value.step.actions
    return Array.isArray(actions) ? actions : []
  } catch { return [] }
})

const stepExecutionMetadata = computed(() => {
  const metadata = stepExecution.value?.metadata
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) || {}
    } catch {
      return {}
    }
  }
  return { ...metadata }
})

const reviewSettings = computed(() => {
  const step = stepExecution.value?.step
  if (!step || step.type !== 'REVIEW') return { ...DEFAULT_REVIEW_SETTINGS }
  return normalizeReviewSettings(step.reviewSettings)
})

const showReviewField = computed(() => stepExecution.value?.step.type === 'REVIEW' && reviewSettings.value.enabled)
const reviewFieldName = computed(() => reviewSettings.value.fieldName || 'reviewNotes')
const reviewFieldLabel = computed(() => reviewSettings.value.fieldLabel || 'Notas da Revisão')
const reviewFieldHint = computed(() => reviewSettings.value.hint || '')
const reviewFieldRules = computed(() => reviewSettings.value.required
  ? [
      v => !!(v && v.toString().trim()) || `${reviewFieldLabel.value} é obrigatório`
    ]
  : []
)

const reviewFieldValue = computed({
  get() {
    if (!showReviewField.value) return ''
    const key = reviewFieldName.value
    const value = formData.value.metadata[key]
    return value ?? ''
  },
  set(value) {
    const key = reviewFieldName.value
    formData.value.metadata[key] = value
  }
})

watch(stepExecutionMetadata, (metadata) => {
  Object.entries(metadata).forEach(([key, value]) => {
    formData.value.metadata[key] = value
  })
}, { immediate: true })

watch(showReviewField, (visible) => {
  const key = reviewFieldName.value
  if (!visible) {
    delete formData.value.metadata[key]
  } else {
    const metadata = stepExecutionMetadata.value
    if (metadata[key] !== undefined) {
      formData.value.metadata[key] = metadata[key]
    }
  }
})

watch(reviewFieldName, (newName, oldName) => {
  if (!showReviewField.value) return
  if (oldName && oldName !== newName && formData.value.metadata[oldName] !== undefined) {
    formData.value.metadata[newName] = formData.value.metadata[oldName]
    delete formData.value.metadata[oldName]
  }
})

const slaStatus = computed(() => {
  if (!stepExecution.value?.dueAt) {
    return { hasDeadline: false, isOverdue: false, remainingText: '', overdueText: '', deadline: '' }
  }
  const dueAt = dayjs(stepExecution.value.dueAt)
  const deadline = dueAt.format('DD/MM/YYYY HH:mm')
  const isOverdue = now.value.isAfter(dueAt)
  const remainingText = dayjs.duration(dueAt.diff(now.value)).locale('pt-br').humanize()
  const overdueText = dayjs.duration(now.value.diff(dueAt)).locale('pt-br').humanize()
  
  return { hasDeadline: true, isOverdue, remainingText, overdueText, deadline }
})

const progressPercentage = computed(() => {
  if (!stepExecution.value?.createdAt || !stepExecution.value?.dueAt) return 0;
  const start = dayjs(stepExecution.value.createdAt);
  const end = dayjs(stepExecution.value.dueAt);
  const totalDuration = end.diff(start);
  if (totalDuration <= 0) return 100;
  const elapsed = now.value.diff(start);
  return Math.min((elapsed / totalDuration) * 100, 100);
});

const progressColor = computed(() => {
  if (slaStatus.value.isOverdue || progressPercentage.value >= 100) return 'error'
  if (progressPercentage.value > 80) return 'warning'
  return 'primary'
})

const previousStepsData = computed(() => {
  if (!process.value?.stepExecutions || !stepExecution.value) return []
  
  const currentStepOrder = stepExecution.value.step.order
  
  return process.value.stepExecutions
    .filter(exec => exec.endTime && exec.step.order < currentStepOrder)
    .sort((a, b) => dayjs(b.endTime).diff(dayjs(a.endTime)))
    .map(exec => {
      const metadata = exec.metadata ? (typeof exec.metadata === 'string' ? JSON.parse(exec.metadata) : exec.metadata) : {}
      
      const stepDefinition = process.value.processType.steps.find(s => s.id === exec.stepId)
      const stepFields = stepDefinition?.conditions?.fields || []

      const labeledData = Object.entries(metadata).reduce((acc, [key, value]) => {
          const field = stepFields.find(f => f.name === key)
          acc[field?.label || key] = value || 'Não informado';
          return acc;
      }, {});

      return {
        id: exec.id,
        stepName: exec.step.name,
        stepOrder: exec.step.order,
        completedAt: exec.endTime,
        userName: exec.completedByUser?.name || 'Sistema',
        data: labeledData,
        attachments: exec.attachments || []
      }
    })
})

const reuseDataFields = computed(() => {
  if (!stepExecution.value?.step.reuseData) return []
  
  try {
    const reuseConfig = typeof stepExecution.value.step.reuseData === 'string' 
      ? JSON.parse(stepExecution.value.step.reuseData)
      : stepExecution.value.step.reuseData
    
    const fields = []
    
    reuseConfig.forEach(config => {
      const sourceStep = process.value?.stepExecutions.find(
        exec => exec.step.order === config.sourceStep
      )
      
      if (sourceStep) {
        if (config.type === 'attachment') {
          // Anexos da etapa
          if (sourceStep.attachments?.length > 0) {
            fields.push({
              type: 'attachments',
              stepName: sourceStep.step.name,
              stepOrder: sourceStep.step.order,
              attachments: sourceStep.attachments
            })
          }
        } else {
          // Campos de dados
          let fieldValue = null
          let fieldLabel = config.fieldName
          
          // Buscar no metadata da execução
          if (sourceStep.metadata) {
            const metadata = typeof sourceStep.metadata === 'string'
              ? JSON.parse(sourceStep.metadata)
              : sourceStep.metadata
            fieldValue = metadata[config.fieldName]
          }
          
          // Buscar no formData do processo se for campo do formulário inicial
          if (!fieldValue && sourceStep.step.order === 1) {
            fieldValue = process.value?.formData?.[config.fieldName]
            
            // Obter label do campo
            const formField = process.value?.processType?.formFields?.find(
              f => f.name === config.fieldName
            )
            if (formField) {
              fieldLabel = formField.label
            }
          }
          
          if (fieldValue !== undefined && fieldValue !== null) {
            fields.push({
              type: 'field',
              stepName: sourceStep.step.name,
              stepOrder: sourceStep.step.order,
              fieldName: config.fieldName,
              fieldLabel: fieldLabel,
              value: fieldValue
            })
          }
        }
      }
    })
    
    return fields
  } catch (error) {
    console.error('Error parsing reuse data:', error)
    return []
  }
})

// Para etapas de APROVAÇÃO, mostrar dados da etapa anterior
const approvalContextData = computed(() => {
  if (stepExecution.value?.step.type !== 'APPROVAL') return null
  
  const currentOrder = stepExecution.value.step.order
  const previousStep = process.value?.stepExecutions.find(
    exec => exec.step.order === currentOrder - 1 && exec.status === 'COMPLETED'
  )
  
  if (!previousStep) return null
  
  const contextData = {
    stepName: previousStep.step.name,
    executor: previousStep.executor?.name || 'Sistema',
    completedAt: previousStep.completedAt,
    comment: previousStep.comment,
    action: previousStep.action,
    data: {}
  }
  
  // Dados do metadata
  if (previousStep.metadata) {
    const metadata = typeof previousStep.metadata === 'string'
      ? JSON.parse(previousStep.metadata)
      : previousStep.metadata
    
    // Se a etapa anterior foi INPUT, pegar os campos configurados
    if (previousStep.step.type === 'INPUT' && previousStep.step.conditions) {
      try {
        const conditions = typeof previousStep.step.conditions === 'string'
          ? JSON.parse(previousStep.step.conditions)
          : previousStep.step.conditions
        
        if (conditions.fields) {
          conditions.fields.forEach(field => {
            if (metadata[field.name] !== undefined) {
              contextData.data[field.label || field.name] = metadata[field.name]
            }
          })
        }
      } catch (e) {
        console.error('Error parsing step conditions:', e)
      }
    } else {
      // Para outros tipos de etapa, mostrar todo o metadata
      contextData.data = metadata
    }
  }
  
  // Anexos da etapa anterior
  if (previousStep.attachments?.length > 0) {
    contextData.attachments = previousStep.attachments
  }
  
  return contextData
})

const isCommentRequired = computed(() => {
  return stepExecution.value?.step.type === 'APPROVAL' && formData.value.action === 'reprovar'
})

const allowedFileTypes = computed(() => {
  const types = stepExecution.value?.step.allowedFileTypes
  console.log('🔍 allowedFileTypes - raw types:', types)

  // Se não tem tipos definidos, retornar tipos padrão
  if (!types || types === '[]' || types === '' || types === 'null') {
    console.log('✅ Sem tipos definidos, usando DEFAULT_FILE_TYPES')
    return DEFAULT_FILE_TYPES
  }

  try {
    if (typeof types === 'string') {
      const parsed = JSON.parse(types)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          console.log('✅ Array vazio após parse, usando DEFAULT_FILE_TYPES')
          return DEFAULT_FILE_TYPES
        }
        const joined = parsed.join(',')
        console.log('✅ Array parseado e juntado:', joined)
        return joined
      }
      console.log('✅ String não-array retornada:', types)
      return types
    }
    if (Array.isArray(types)) {
      if (types.length === 0) {
        console.log('✅ Array vazio direto, usando DEFAULT_FILE_TYPES')
        return DEFAULT_FILE_TYPES
      }
      const joined = types.join(',')
      console.log('✅ Array direto juntado:', joined)
      return joined
    }
    console.log('✅ Tipo não reconhecido, usando DEFAULT_FILE_TYPES')
    return DEFAULT_FILE_TYPES
  } catch (error) {
    console.warn('⚠️ Erro ao processar allowedFileTypes:', error)
    return DEFAULT_FILE_TYPES
  }
})

const availableSigners = computed(() => {
  // Retorna a lista de usuários da empresa para seleção como assinantes
  const users = userStore.users || []
  console.log('📋 availableSigners computed:', {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive !== false).length,
    allUsers: users,
  })
  // Filtrar apenas usuários ativos (ou sem propriedade isActive definida)
  return users.filter(u => u.isActive !== false)
})

const canSubmit = computed(() => {
  if (!valid.value) return false
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (!formData.value.action) return false
    if (formData.value.action === 'reprovar' && !formData.value.comment?.trim()) return false
  } else if (availableActions.value.length > 0 && !formData.value.action) {
    return false
  }
  if (stepExecution.value?.step.requireAttachment && attachments.value.length === 0) return false
  if (showReviewField.value && reviewSettings.value.required) {
    const value = reviewFieldValue.value
    if (!value || !value.toString().trim()) return false
  }
  // Validar assinantes por arquivo PDF APENAS se assinatura for obrigatória
  if (stepExecution.value?.step.requiresSignature === true) {
    const pdfs = attachments.value.filter(f => f.type === 'application/pdf')
    // Verificar se todos os PDFs têm pelo menos 1 assinante configurado
    if (pdfs.length > 0 && !pdfs.every(f => f.signers && f.signers.length > 0)) {
      console.warn('❌ Assinatura obrigatória: todos os PDFs precisam ter assinantes configurados')
      return false
    }
  }
  return true
})

function getFieldComponent(type) {
  const componentMap = {
    TEXT: VTextField, 
    TEXTAREA: VTextarea, 
    NUMBER: VTextField, 
    DATE: VTextField, 
    EMAIL: VTextField, 
    CPF: VTextField, 
    CNPJ: VTextField, 
    PHONE: VTextField, 
    DROPDOWN: VSelect, 
    CHECKBOX: VCheckbox, 
    CURRENCY: VTextField, 
    FILE: 'file-upload-field' // Componente especial para arquivo
  }
  return componentMap[type] || VTextField
}

function getFieldInputType(type) {
  const typeMap = {
    NUMBER: 'number',
    DATE: 'date',
    EMAIL: 'email',
    CURRENCY: 'number'
  }
  return typeMap[type] || 'text'
}

function getFieldCols(field) {
  switch (field.type) {
    case 'TEXTAREA':
      return 12  // Largura completa (uma linha inteira)
    default:
      return 6  // 2 campos por linha em desktop (incluindo FILE)
  }
}

function getFieldLabel(field) {
  const label = field.label || field.name
  return field.required ? `${label} *` : label
}

function getFieldOptions(field) {
  if (!field.options) return []
  try {
    const options = Array.isArray(field.options) ? field.options : JSON.parse(field.options)
    return options.map(opt => ({
      title: opt.label || opt.value || opt,
      value: opt.value || opt
    }))
  } catch {
    return []
  }
}

function getFieldRules(field) {
  const rules = []
  if (field.required) {
    rules.push(v => {
      if (field.type === 'CHECKBOX') {
        return (v && v.length > 0) || `${field.label} é obrigatório`
      }
      return !!v || `${field.label} é obrigatório`
    })
  }
  switch (field.type) {
    case 'EMAIL':
      rules.push(v => !v || /.+@.+\..+/.test(v) || 'E-mail inválido')
      break
    case 'CPF':
      rules.push(v => !v || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || 'CPF inválido')
      break
    case 'CNPJ':
      rules.push(v => !v || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'CNPJ inválido')
      break
    case 'NUMBER':
    case 'CURRENCY':
      rules.push(v => !v || !isNaN(Number(v)) || 'Deve ser um número válido')
      break
  }
  if (field.validations) {
    try {
      const validations = typeof field.validations === 'object' ? field.validations : JSON.parse(field.validations)
      if (validations.minLength) {
        rules.push(v => !v || v.length >= validations.minLength || `Mínimo ${validations.minLength} caracteres`)
      }
      if (validations.maxLength) {
        rules.push(v => !v || v.length <= validations.maxLength || `Máximo ${validations.maxLength} caracteres`)
      }
      if (validations.min !== undefined) {
        rules.push(v => !v || Number(v) >= validations.min || `Valor mínimo: ${validations.min}`)
      }
      if (validations.max !== undefined) {
        rules.push(v => !v || Number(v) <= validations.max || `Valor máximo: ${validations.max}`)
      }
    } catch (e) {
      console.error('Error parsing field validations:', e)
    }
  }
  return rules
}

function formatInstructions(instructions) {
  if (!instructions) return ''
  return instructions.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^(.*)$/, '<p>$1</p>').replace(/• /g, '&bull; ').replace(/✅/g, '<span style="color: #4CAF50;">✅</span>').replace(/❌/g, '<span style="color: #f44336;">❌</span>').replace(/⚠️/g, '<span style="color: #FF9800;">⚠️</span>').replace(/📋/g, '<span style="color: #2196F3;">📋</span>').replace(/💡/g, '<span style="color: #FFC107;">💡</span>')
}

function getCommentHelpText() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    return formData.value.action === 'reprovar' ? 'Justifique sua decisão de reprovação (obrigatório)' : 'Adicione observações sobre sua decisão de aprovação'
  }
  return 'Comentário opcional sobre esta etapa'
}

function getCommentPlaceholder() {
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (formData.value.action === 'aprovar') return 'Ex: Processo analisado e aprovado conforme critérios estabelecidos. Documentação está completa e em conformidade...'
    if (formData.value.action === 'reprovar') return 'Ex: Processo reprovado devido a inconsistências na documentação apresentada. Necessário revisar os seguintes pontos...'
    return 'Adicione suas observações sobre a análise realizada...'
  }
  return 'Descreva sua análise, observações ou justificativa para a ação tomada...'
}

function getCommentRules() {
  const rules = []
  if (isCommentRequired.value) rules.push(v => !!v?.trim() || 'Comentário é obrigatório')
  rules.push(v => !v || v.length <= 1000 || 'Máximo 1000 caracteres')
  if (stepExecution.value?.step.type === 'APPROVAL' && formData.value.action === 'reprovar') {
    rules.push(v => (v && v.trim().length >= 10) || 'Justificativa deve ter pelo menos 10 caracteres')
  }
  return rules
}

function getStepTypeColor(type) {
  const colors = { INPUT: 'blue', APPROVAL: 'orange', UPLOAD: 'purple', REVIEW: 'teal', SIGNATURE: 'red' }
  return colors[type] || 'grey'
}

function getStepTypeIcon(type) {
  const icons = { INPUT: 'mdi-form-textbox', APPROVAL: 'mdi-check-decagram', UPLOAD: 'mdi-upload', REVIEW: 'mdi-eye-check', SIGNATURE: 'mdi-draw-pen' }
  return icons[type] || 'mdi-help-circle'
}

function getStepTypeText(type) {
  const texts = { INPUT: 'Entrada de Dados', APPROVAL: 'Aprovação', UPLOAD: 'Upload de Arquivo', REVIEW: 'Revisão', SIGNATURE: 'Assinatura' }
  return texts[type] || type
}

function getActionLabel(action) {
  const labels = { aprovar: 'Aprovar', reprovar: 'Reprovar', rejeitar: 'Rejeitar', enviar: 'Enviar', devolver: 'Devolver', aceitar: 'Aceitar', recusar: 'Recusar', continuar: 'Continuar', finalizar: 'Finalizar' }
  return labels[action.toLowerCase()] || action
}

function getActionDescription(action) {
  const descriptions = { aprovar: 'Aprovar e avançar para próxima etapa', reprovar: 'Reprovar e encerrar processo', rejeitar: 'Rejeitar e devolver para etapa anterior', enviar: 'Enviar para próxima etapa', devolver: 'Devolver para correções', aceitar: 'Aceitar as informações fornecidas', recusar: 'Recusar e solicitar alterações', continuar: 'Continuar o fluxo do processo', finalizar: 'Finalizar esta etapa' }
  return descriptions[action.toLowerCase()] || 'Executar esta ação'
}

function getResponsibleName(execution) {
  if (execution.step.assignedToUser) return execution.step.assignedToUser.name
  if (execution.step.assignedToSector) return `Setor ${execution.step.assignedToSector.name}`
  return 'Não definido'
}

function getFileIcon(type) {
  if (!type) return 'mdi-file-document'
  const typeStr = type.toLowerCase()

  // PDFs
  if (typeStr.includes('pdf')) return 'mdi-file-pdf-box'

  // Imagens
  if (typeStr.includes('image') || typeStr.includes('jpg') || typeStr.includes('jpeg') ||
      typeStr.includes('png') || typeStr.includes('gif') || typeStr.includes('bmp') ||
      typeStr.includes('webp')) return 'mdi-file-image'

  // Office
  if (typeStr.includes('word') || typeStr.includes('msword') || typeStr.includes('document')) return 'mdi-file-word'
  if (typeStr.includes('excel') || typeStr.includes('spreadsheet') || typeStr.includes('sheet')) return 'mdi-file-excel'
  if (typeStr.includes('powerpoint') || typeStr.includes('presentation')) return 'mdi-file-powerpoint'

  // Texto
  if (typeStr.includes('text') || typeStr.includes('txt') || typeStr.includes('csv')) return 'mdi-file-document-outline'

  // Compactados
  if (typeStr.includes('zip') || typeStr.includes('rar') || typeStr.includes('7z') ||
      typeStr.includes('compressed')) return 'mdi-folder-zip'

  return 'mdi-file-document'
}

function getFileTypeColor(type) {
  if (!type) return 'grey'
  const typeStr = type.toLowerCase()

  if (typeStr.includes('pdf')) return 'red'
  if (typeStr.includes('image') || typeStr.includes('jpg') || typeStr.includes('png')) return 'blue'
  if (typeStr.includes('word') || typeStr.includes('document')) return 'indigo'
  if (typeStr.includes('excel') || typeStr.includes('spreadsheet')) return 'green'
  if (typeStr.includes('powerpoint') || typeStr.includes('presentation')) return 'orange'
  if (typeStr.includes('text') || typeStr.includes('txt')) return 'purple'
  if (typeStr.includes('zip') || typeStr.includes('rar') || typeStr.includes('compressed')) return 'amber'

  return 'grey'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function viewProcessDocument(doc) {
  // Usar o modal de preview existente
  selectedAttachment.value = {
    id: doc.id,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size
  }
  showPreview.value = true
}

async function downloadProcessDocument(doc) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const token = localStorage.getItem('token')

  try {
    const response = await fetch(`${API_URL}/attachments/${doc.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) throw new Error('Erro ao baixar documento')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.originalName || 'documento'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erro ao baixar documento:', error)
    window.showSnackbar?.('Erro ao baixar documento', 'error')
  }
}

function formatDate(date) { 
  return dayjs(date).format('DD/MM/YYYY HH:mm') 
}

// Funções para gerenciar arquivos de campos FILE
function setFileInputRef(key, el) {
  if (el) {
    fileInputRefs.value[key] = el
  }
}

function getFieldFiles(fieldName) {
  return fieldFiles.value[fieldName] || []
}

function getFileFieldDisplayValue(fieldName) {
  const files = getFieldFiles(fieldName)
  if (files.length === 0) return ''
  if (files.length === 1) return files[0].name
  return `${files.length} arquivos selecionados`
}

function getFieldFileTypes(field) {
  if (field.allowedFileTypes && field.allowedFileTypes !== '[]') {
    try {
      const types = typeof field.allowedFileTypes === 'string' ? JSON.parse(field.allowedFileTypes) : field.allowedFileTypes
      if (Array.isArray(types)) {
        return types.length > 0 ? types.join(',') : DEFAULT_FILE_TYPES
      }
      return field.allowedFileTypes
    } catch {
      return DEFAULT_FILE_TYPES
    }
  }
  // Tipos padrão expandidos para campos FILE
  return DEFAULT_FILE_TYPES
}

function triggerFileInput(fieldName) {
  const inputKey = `fileInput_${fieldName}`
  const input = fileInputRefs.value[inputKey]
  if (input) {
    input.click()
  } else {
    // Fallback para seletor direto
    const fallbackInput = document.querySelector(`input[data-field="${fieldName}"]`)
    if (fallbackInput) fallbackInput.click()
  }
}

function handleFieldFileSelect(event, field) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  const fieldName = field.name
  const maxFiles = field.maxFiles || 1
  const allowedTypes = getFieldFileTypes(field)
  
  // Inicializar array se não existir
  if (!fieldFiles.value[fieldName]) {
    fieldFiles.value[fieldName] = []
  }
  
  const currentFiles = fieldFiles.value[fieldName]
  
  for (const file of files) {
    // Verificar limite de arquivos
    if (currentFiles.length >= maxFiles) {
      window.showSnackbar?.(`Máximo ${maxFiles} arquivo(s) permitido(s) para este campo`, 'warning')
      break
    }
    
    // Verificar tamanho do arquivo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      window.showSnackbar?.(`Arquivo ${file.name} muito grande (máx: 10MB)`, 'error')
      continue
    }
    
    // Verificar tipo de arquivo se especificado
    if (allowedTypes && allowedTypes !== '*') {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase()
      const allowedExts = allowedTypes.split(',').map(t => t.trim().toLowerCase())
      const isTypeAllowed = allowedExts.some(ext => {
        if (ext.startsWith('.')) {
          return fileExt === ext
        } else {
          return file.type.includes(ext) || file.type === ext
        }
      })
      
      if (!isTypeAllowed) {
        window.showSnackbar?.(`Tipo de arquivo ${file.name} não permitido para este campo`, 'error')
        continue
      }
    }
    
    // Verificar se arquivo já existe (evitar duplicatas)
    const isDuplicate = currentFiles.some(existing => 
      existing.name === file.name && existing.size === file.size
    )
    
    if (isDuplicate) {
      window.showSnackbar?.(`Arquivo ${file.name} já foi selecionado`, 'warning')
      continue
    }
    
    // Adicionar arquivo à lista
    currentFiles.push({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random()
    })
    
    // Atualizar o valor do campo no formData para validação
    updateFieldValue(fieldName, field)
  }
  
  // Limpar o input para permitir selecionar o mesmo arquivo novamente se necessário
  event.target.value = ''
  
  if (files.length > 0) {
    window.showSnackbar?.(`${files.length} arquivo(s) selecionado(s) para ${field.label || field.name}`, 'success')
  }
}

function updateFieldValue(fieldName, field) {
  const files = fieldFiles.value[fieldName] || []
  const maxFiles = field?.maxFiles || 1
  
  if (maxFiles === 1) {
    formData.value.metadata[fieldName] = files.length > 0 ? files[0].name : ''
  } else {
    formData.value.metadata[fieldName] = files.map(f => f.name).join(', ')
  }
}

function removeFieldFile(fieldName, fileIndex) {
  if (fieldFiles.value[fieldName]) {
    const removedFile = fieldFiles.value[fieldName][fileIndex]
    fieldFiles.value[fieldName].splice(fileIndex, 1)
    
    // Atualizar o valor no formData
    const field = stepFormFields.value.find(f => f.name === fieldName)
    updateFieldValue(fieldName, field)
    
    window.showSnackbar?.(`Arquivo "${removedFile.name}" removido`, 'info')
  }
}

function getFieldFileErrors(field) {
  const errors = []
  const fieldName = field.name
  const files = getFieldFiles(fieldName)
  
  if (field.required && files.length === 0) {
    errors.push(`${field.label || field.name} é obrigatório`)
  }
  
  const maxFiles = field.maxFiles || 1
  if (files.length > maxFiles) {
    errors.push(`Máximo ${maxFiles} arquivo(s) permitido(s)`)
  }
  
  return errors
}

// Novas funções para identificar e tratar campos de arquivo
function isFileField(field) {
  // Verifica se é um campo de arquivo baseado no nome do arquivo ou extensão
  if (!field.value) return false
  const fileExtensions = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|bmp|txt)$/i
  return fileExtensions.test(field.value)
}

function getFileTypeFromName(fileName) {
  if (!fileName) return ''
  if (fileName.toLowerCase().includes('.pdf')) return 'application/pdf'
  if (fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/)) return 'image/'
  if (fileName.toLowerCase().includes('.doc')) return 'application/word'
  if (fileName.toLowerCase().includes('.xls')) return 'application/excel'
  return 'application/octet-stream'
}

function viewFileField(field) {
  try {
    console.log('=== viewFileField DEBUG ===')
    console.log('Field received:', field)
    console.log('Field value:', field.value)
    console.log('Field value type:', typeof field.value)
    console.log('Field stepOrder:', field.stepOrder)
    console.log('Field fieldName:', field.fieldName)

    // O field.value pode ser um objeto AttachmentMeta ou um ID de arquivo
    let attachmentId = null

    // Se o valor é um objeto com attachmentId
    if (typeof field.value === 'object' && field.value.attachmentId) {
      console.log('Case 1: Object with attachmentId')
      attachmentId = field.value.attachmentId
    }
    // Se é um array (múltiplos arquivos), pegar o primeiro
    else if (Array.isArray(field.value) && field.value[0]?.attachmentId) {
      console.log('Case 2: Array with attachmentId')
      attachmentId = field.value[0].attachmentId
    }
    // Se é uma string simples (ID ou nome de arquivo)
    else if (typeof field.value === 'string') {
      console.log('Case 3: String value - searching in metadata')
      // Tentar encontrar o attachment nos dados da etapa
      const sourceStep = process.value?.stepExecutions.find(
        exec => exec.step.order === field.stepOrder
      )
      console.log('Source step found:', sourceStep)

      if (sourceStep?.metadata) {
        const metadata = typeof sourceStep.metadata === 'string'
          ? JSON.parse(sourceStep.metadata)
          : sourceStep.metadata

        console.log('Metadata:', metadata)

        // Procurar por field.fieldName_files que contém os IDs dos arquivos
        const fileIds = metadata[field.fieldName + '_files']
        console.log(`Looking for ${field.fieldName}_files:`, fileIds)

        if (fileIds && fileIds.length > 0) {
          attachmentId = Array.isArray(fileIds) ? fileIds[0] : fileIds
          console.log('Found attachmentId from metadata:', attachmentId)
        }
      }
    }

    console.log('Final attachmentId:', attachmentId)

    if (attachmentId) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const url = `${baseUrl}/processes/attachment/${attachmentId}/view`
      console.log('Opening URL:', url)
      window.open(url, '_blank')
    } else {
      console.warn('Could not find attachment ID for field:', field)
      window.showSnackbar?.('ID do arquivo não encontrado. Verifique o console para detalhes.', 'warning')
    }
  } catch (error) {
    console.error('Error viewing file field:', error)
    window.showSnackbar?.('Erro ao visualizar arquivo', 'error')
  }
}

async function handleFileSelect(event) {
  console.log('📁 handleFileSelect chamado')
  console.log('📁 event.target.files:', event.target.files)

  const files = Array.from(event.target.files)
  console.log('📁 Total de arquivos:', files.length)

  for (const file of files) {
    console.log('📁 Processando arquivo:', file.name, 'Tamanho:', file.size, 'Tipo:', file.type)

    if (file.size > 10 * 1024 * 1024) {
      console.warn('⚠️ Arquivo muito grande:', file.name)
      window.showSnackbar?.(`Arquivo ${file.name} muito grande (máx: 10MB)`, 'error')
      continue
    }

    console.log('📁 allowedFileTypes.value:', allowedFileTypes.value)

    if (allowedFileTypes.value !== '*') {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase()
      const allowedExts = allowedFileTypes.value.split(',').map(t => t.trim())
      console.log('📁 fileExt:', fileExt)
      console.log('📁 allowedExts:', allowedExts)
      console.log('📁 file.type:', file.type)

      if (!allowedExts.includes(file.type) && !allowedExts.includes(fileExt)) {
        console.warn('⚠️ Tipo de arquivo não permitido:', file.name)
        window.showSnackbar?.(`Tipo de arquivo ${file.name} não permitido`, 'error')
        continue
      }
    }

    // Adicionar arquivo com configurações de assinatura
    const newAttachment = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random(),
      // Configurações de assinatura
      showSignatureConfig: false,
      signatureType: 'SEQUENTIAL',
      signers: []
    }

    console.log('✅ Adicionando arquivo:', newAttachment)
    attachments.value.push(newAttachment)
    console.log('✅ Total de attachments:', attachments.value.length)
  }

  event.target.value = ''
  if (files.length > 0) {
    window.showSnackbar?.(`${files.length} arquivo(s) adicionado(s)`, 'success')
  }
}

function removeFile(index) {
  const fileName = attachments.value[index].name
  attachments.value.splice(index, 1)
  window.showSnackbar?.(`Arquivo "${fileName}" removido`, 'info')
}

function openSignatureDialog(file, index) {
  console.log('Opening signature dialog for:', file.name)
}

// ============================================================
// 🎯 FUNÇÕES PARA GERENCIAR ASSINANTES - SISTEMA PROFISSIONAL
// ============================================================

/**
 * Retorna o nome completo do assinante com diferenciação clara
 * Usado nas listas de assinantes selecionados
 */
function getSignerName(signerId) {
  const signer = availableSigners.value.find(u => u.id === signerId)
  if (!signer) return 'Usuário não encontrado'

  // Se houver outros usuários com o mesmo nome, adicionar email para diferenciar
  const duplicates = availableSigners.value.filter(u => u.name === signer.name)
  if (duplicates.length > 1) {
    return `${signer.name} (${signer.email})`
  }

  return signer.name
}

/**
 * Retorna o email do assinante
 * Usado para exibir informações adicionais
 */
function getSignerEmail(signerId) {
  const signer = availableSigners.value.find(u => u.id === signerId)
  return signer?.email || 'Email não encontrado'
}

/**
 * Retorna as iniciais do nome para avatares
 * Ex: "Matheus Araujo" -> "MA"
 */
function getInitials(name) {
  if (!name) return '??'

  const parts = name.trim().split(' ').filter(p => p.length > 0)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()

  // Pegar primeira letra do primeiro e último nome
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Gera uma cor consistente baseada no nome
 * Sempre retorna a mesma cor para o mesmo nome
 */
function getAvatarColor(name) {
  if (!name) return 'grey'

  const colors = [
    'blue', 'indigo', 'purple', 'pink', 'red',
    'orange', 'amber', 'lime', 'green', 'teal',
    'cyan', 'blue-grey', 'deep-purple', 'deep-orange'
  ]

  // Gerar hash simples do nome
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Retorna o nome de exibição no dropdown
 * Sempre mostra nome + email para evitar confusão
 */
function getSignerDisplayName(user) {
  if (!user) return 'Usuário desconhecido'
  return `${user.name} (${user.email})`
}

/**
 * Filtro customizado que busca por nome OU email
 * Permite buscar digitando qualquer parte do nome ou email
 */
function customSignerFilter(itemText, queryText, item) {
  if (!queryText) return true

  const query = queryText.toLowerCase()
  const name = item.raw.name?.toLowerCase() || ''
  const email = item.raw.email?.toLowerCase() || ''

  // Busca em nome OU email
  return name.includes(query) || email.includes(query)
}

function toggleSignatureConfig(fileIndex) {
  attachments.value[fileIndex].showSignatureConfig = !attachments.value[fileIndex].showSignatureConfig
}

function onSignersChanged(fileIndex) {
  // Não fecha mais automaticamente - usuário controla quando fechar
  // A configuração permanece aberta para ajustes
}

function moveSignerUpInFile(fileIndex, signerIndex) {
  if (signerIndex > 0) {
    const signers = attachments.value[fileIndex].signers
    const temp = signers[signerIndex]
    signers[signerIndex] = signers[signerIndex - 1]
    signers[signerIndex - 1] = temp
  }
}

function moveSignerDownInFile(fileIndex, signerIndex) {
  const signers = attachments.value[fileIndex].signers
  if (signerIndex < signers.length - 1) {
    const temp = signers[signerIndex]
    signers[signerIndex] = signers[signerIndex + 1]
    signers[signerIndex + 1] = temp
  }
}

// Função para agrupar dados reutilizados por etapa
function groupReuseDataByStep(fields) {
  const groups = {}
  
  fields.forEach(field => {
    const key = `${field.stepOrder}-${field.stepName}`
    if (!groups[key]) {
      groups[key] = {
        stepOrder: field.stepOrder,
        stepName: field.stepName,
        fields: []
      }
    }
    groups[key].fields.push(field)
  })
  
  return Object.values(groups).sort((a, b) => a.stepOrder - b.stepOrder)
}

// Função para visualizar anexo
async function viewAttachment(attachment) {
  try {
    console.log('=== viewAttachment DEBUG ===')
    console.log('Attachment received:', attachment)
    selectedAttachment.value = attachment
    showPreview.value = true
  } catch (error) {
    console.error('Error viewing attachment:', error)
    window.showSnackbar?.('Erro ao visualizar anexo', 'error')
  }
}

async function executeStep() {
  if (!valid.value || !canSubmit.value) {
    window.showSnackbar?.('Por favor, corrija os erros antes de continuar', 'warning')
    return
  }
  
  // Validar campos FILE obrigatórios
  for (const field of stepFormFields.value) {
    if (field.type === 'FILE' && field.required) {
      const files = getFieldFiles(field.name)
      if (files.length === 0) {
        window.showSnackbar?.(`Campo ${field.label || field.name} é obrigatório`, 'warning')
        return
      }
    }
  }
  
  if (stepExecution.value?.step.type === 'APPROVAL') {
    if (!formData.value.action || !['aprovar', 'reprovar'].includes(formData.value.action)) {
      window.showSnackbar?.('Selecione uma decisão de aprovação válida', 'warning')
      return
    }
    if (formData.value.action === 'reprovar' && !formData.value.comment?.trim()) {
      window.showSnackbar?.('Justificativa é obrigatória para reprovação', 'warning')
      return
    }
  }
  if (!stepExecution.value?.id) {
    console.error('stepExecutionId is missing:', stepExecution.value)
    window.showSnackbar?.('Erro: ID da execução da etapa não encontrado', 'error')
    return
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(stepExecution.value.id)) {
    console.error('Invalid stepExecutionId format:', stepExecution.value.id)
    window.showSnackbar?.('Erro: ID da execução da etapa em formato inválido', 'error')
    return
  }
  saving.value = true
  try {
    // Upload dos anexos gerais da etapa
    if (attachments.value.length > 0) {
      for (const attachment of attachments.value) {
        try {
          const uploaded = await processStore.uploadAttachment(attachment.file, stepExecution.value.id)
          uploadedAttachments.value.push(uploaded)
          console.log('Attachment uploaded:', uploaded.id, uploaded.originalName)
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError)
          window.showSnackbar?.(`Erro ao enviar arquivo ${attachment.name}`, 'warning')
        }
      }
    }
    
    // Upload dos arquivos de campos FILE (marcados como isStepFormField para não aparecer em assinaturas)
    const fieldFileUploads = {}
    for (const field of stepFormFields.value) {
      if (field.type === 'FILE') {
        const files = getFieldFiles(field.name)
        if (files.length > 0) {
          const uploadedFiles = []
          for (const fileObj of files) {
            try {
              // Marcar como arquivo de campo do formulário da etapa
              const uploaded = await processStore.uploadAttachment(fileObj.file, stepExecution.value.id, {
                isStepFormField: true,
                fieldName: field.name
              })
              uploadedFiles.push({
                id: uploaded.id,
                name: uploaded.originalName || fileObj.name,
                size: fileObj.size,
                type: fileObj.type
              })
            } catch (uploadError) {
              console.error('Error uploading field file:', uploadError)
              window.showSnackbar?.(`Erro ao enviar arquivo ${fileObj.name} do campo ${field.label}`, 'warning')
            }
          }
          if (uploadedFiles.length > 0) {
            // Armazenar informações dos arquivos no metadata
            fieldFileUploads[field.name] = uploadedFiles
            // Atualizar metadata com IDs dos arquivos para referência futura
            formData.value.metadata[field.name + '_files'] = uploadedFiles.map(f => f.id)
          }
        }
      }
    }
    
    const executeData = {
      stepExecutionId: stepExecution.value.id,
      action: formData.value.action || null,
      comment: formData.value.comment?.trim() || null,
      metadata: formData.value.metadata && Object.keys(formData.value.metadata).length > 0 ? formData.value.metadata : {}
    }

    if (!executeData.stepExecutionId) throw new Error('stepExecutionId é obrigatório')
    if (stepExecution.value?.step.type === 'APPROVAL' && !executeData.action) throw new Error('Ação é obrigatória para etapas de aprovação')

    // Executar a etapa
    await processStore.executeStep(executeData)

    // Criar requisitos de assinatura baseado nas configurações de cada arquivo
    // Funciona para qualquer tipo de etapa que tenha anexos com assinantes configurados
    if (uploadedAttachments.value.length > 0) {
      try {
        console.log('🔍 Checking for signature requirements in uploaded attachments...')
        console.log('📎 Uploaded attachments:', uploadedAttachments.value.map(a => ({ id: a.id, name: a.originalName })))
        console.log('📋 Original attachments with configs:', attachments.value.map(a => ({ name: a.name, signers: a.signers?.length || 0 })))

        const requirements = []
        let totalSigners = 0

        // Mapear os anexos enviados com os arquivos originais para pegar as configurações
        // IMPORTANTE: Usar índice em vez de busca por nome, pois podem existir arquivos com mesmo nome
        for (let uploadIndex = 0; uploadIndex < uploadedAttachments.value.length; uploadIndex++) {
          const uploadedAttachment = uploadedAttachments.value[uploadIndex]
          console.log(`\n🔎 Processing uploaded file [${uploadIndex}]: ${uploadedAttachment.originalName} (ID: ${uploadedAttachment.id})`)
          console.log(`   📎 Available original files:`, attachments.value.map((f, i) => ({
            index: i,
            name: f.name,
            signatureType: f.signatureType,
            signersCount: f.signers?.length || 0
          })))

          // Usar índice correspondente - os arquivos são enviados na mesma ordem
          const originalFile = attachments.value[uploadIndex]

          if (!originalFile) {
            console.log(`   ❌ No matching original file found at index ${uploadIndex}`)
            continue
          }

          console.log(`   ✅ Found original file: ${originalFile.name}`)
          console.log(`   📝 Signature type: ${originalFile.signatureType}`)
          console.log(`   👥 Signers configured: ${originalFile.signers?.length || 0}`)

          if (originalFile.signers && originalFile.signers.length > 0) {
            console.log(`   📝 Creating requirements for ${uploadedAttachment.originalName}:`, {
              signers: originalFile.signers.length,
              type: originalFile.signatureType,
              uploadedId: uploadedAttachment.id
            })

            // Criar um requisito para cada assinante deste arquivo
            for (let i = 0; i < originalFile.signers.length; i++) {
              const requirement = {
                stepVersionId: stepExecution.value.step.id,
                attachmentId: uploadedAttachment.id,
                userId: originalFile.signers[i],
                order: i + 1,
                type: originalFile.signatureType || 'SEQUENTIAL',
                isRequired: stepExecution.value?.step.requiresSignature || false,
                description: `Assinatura de ${uploadedAttachment.originalName || uploadedAttachment.filename}`
              }

              console.log(`      ${i + 1}. User: ${originalFile.signers[i]} - Attachment: ${uploadedAttachment.id}`)
              requirements.push(requirement)
            }

            totalSigners += originalFile.signers.length
          } else {
            console.log(`   ⚠️  No signers configured for this file`)
          }
        }

        if (requirements.length > 0) {
          console.log('\n✨ Creating signature requirements:', requirements)
          const result = await signaturesStore.createMultipleSignatureRequirements(requirements)
          console.log('✅ Signature requirements created:', result)
          window.showSnackbar?.(`Requisitos de assinatura criados: ${requirements.length} assinatura(s) para ${totalSigners} pessoa(s)`, 'success')
        } else {
          console.log('\n⚠️  No signature requirements to create')
        }
      } catch (signatureError) {
        console.error('❌ Error creating signature requirements:', signatureError)
        window.showSnackbar?.('Etapa concluída, mas houve erro ao configurar as assinaturas', 'warning')
      }
    }

    let successMessage = 'Etapa concluída com sucesso!'
    if (stepExecution.value?.step.type === 'APPROVAL') {
      if (formData.value.action === 'aprovar') successMessage = 'Processo aprovado com sucesso!'
      else if (formData.value.action === 'reprovar') successMessage = 'Processo reprovado.'
    }
    window.showSnackbar?.(successMessage, 'success')
    setTimeout(() => { router.push(`/processes/${route.params.id}`) }, 1000)
  } catch (error) {
    console.error('Error executing step:', error)
    let errorMessage = 'Erro ao executar etapa'
    if (error.response?.status === 400) {
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) errorMessage = error.response.data.message.join(', ')
        else errorMessage = error.response.data.message
      } else errorMessage = 'Dados inválidos. Verifique os campos preenchidos.'
    } else if (error.response?.data?.message) errorMessage = error.response.data.message
    else if (error.message) errorMessage = error.message
    window.showSnackbar?.(errorMessage, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() { 
  router.push(`/processes/${route.params.id}`) 
}

onMounted(async () => {
  try {
    processStore.loading = true
    await processStore.fetchProcess(route.params.id)

    // Debug: Verificar configuração da etapa
    console.log('=== Step Execution Debug ===')
    console.log('Step type:', stepExecution.value?.step.type)
    console.log('Allow attachment:', stepExecution.value?.step.allowAttachment)
    console.log('Requires signature:', stepExecution.value?.step.requiresSignature)
    console.log('Should show signature config:', stepExecution.value?.step.allowAttachment && stepExecution.value?.step.requiresSignature)

    // Carregar usuários da empresa para seleção de assinantes
    const companyId = authStore.activeCompany?.companyId || authStore.currentCompany?.id
    console.log('🔍 Loading users for company:', companyId)
    console.log('Auth store state:', {
      activeCompany: authStore.activeCompany,
      currentCompany: authStore.currentCompany,
    })

    if (companyId) {
      try {
        await userStore.fetchUsers(companyId)
        console.log('✅ Available signers loaded:', userStore.users.length, 'users')
        console.log('Users:', userStore.users)
      } catch (error) {
        console.error('❌ Error loading users:', error)
        window.showSnackbar?.('Erro ao carregar lista de usuários para assinatura', 'warning')
      }
    } else {
      console.error('❌ No company ID found to load users')
    }

    if (stepFormFields.value.length > 0) {
      stepFormFields.value.forEach(field => {
        if (field.defaultValue) { formData.value.metadata[field.name] = field.defaultValue }
      })
    }
    if (stepExecution.value?.step.type !== 'APPROVAL' && availableActions.value.length === 1) {
      formData.value.action = availableActions.value[0]
    }
    timer = setInterval(() => { now.value = dayjs() }, 1000)
  } catch (error) {
    console.error('Error loading step execution:', error)
    window.showSnackbar?.('Erro ao carregar etapa', 'error')
  } finally {
    processStore.loading = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.step-execution-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Documentos para Revisão */
.documents-review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-review-item {
  background: #f8fafb;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

.document-review-item:hover {
  background: #f0f4f5;
  transform: translateX(4px);
}

.execution-header { 
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(66, 165, 245, 0.04)); 
  border-radius: 20px; 
  padding: 32px; 
  border: 1px solid rgba(25, 118, 210, 0.1); 
  backdrop-filter: blur(10px); 
}

.step-avatar { 
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3); 
  border: 3px solid rgba(255, 255, 255, 0.9); 
}

/* Espaçamento entre chips */
.chips-container {
  gap: 8px;
}

.chips-container .v-chip {
  margin-right: 0 !important;
}

.instructions-panel {
  border-radius: 0;
  overflow: hidden;
  border: none;
  box-shadow: none;
}

.formatted-instructions { 
  font-size: 0.95rem; 
  line-height: 1.7; 
  color: rgba(0, 0, 0, 0.8); 
  padding: 16px; 
}

.formatted-instructions :deep(p) { 
  margin-bottom: 12px; 
}

.formatted-instructions :deep(p:last-child) { 
  margin-bottom: 0; 
}

.approval-decision-card { 
  background: rgba(255, 152, 0, 0.02); 
  border: none; 
}

.approval-options { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 24px; 
  margin-top: 16px; 
}

.approval-option { 
  cursor: pointer; 
  transition: all 0.3s ease; 
  border-radius: 16px; 
  border: 2px solid rgba(0, 0, 0, 0.08); 
  min-height: 140px; 
}

.approval-option:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); 
}

.approval-option.approval-selected { 
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); 
  transform: translateY(-2px); 
}

.approval-approve.approval-selected { 
  border-color: rgb(var(--v-theme-success)); 
  background: rgba(76, 175, 80, 0.04); 
}

.approval-reject.approval-selected { 
  border-color: rgb(var(--v-theme-error)); 
  background: rgba(244, 67, 54, 0.04); 
}

.approval-label { 
  font-weight: 700; 
  font-size: 1.1rem; 
  margin-bottom: 8px; 
}

.approval-description { 
  font-size: 0.85rem; 
  color: rgba(0, 0, 0, 0.6); 
  line-height: 1.4; 
}

.execution-form-card, .info-card { 
  border-radius: 16px; 
  border: 1px solid rgba(0, 0, 0, 0.06); 
  overflow: hidden; 
}

.form-card-header { 
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(66, 165, 245, 0.03)); 
  border-bottom: 1px solid rgba(25, 118, 210, 0.1); 
}

.form-card-content { 
  background: white; 
}

.form-card-actions { 
  background: rgba(25, 118, 210, 0.02); 
  border-top: 1px solid rgba(0, 0, 0, 0.06); 
}

.form-section { 
  margin-bottom: 32px; 
}

.section-header h3 { 
  color: rgba(0, 0, 0, 0.87); 
  margin-bottom: 8px; 
}

.section-header p { 
  margin: 0; 
}

.execute-btn { 
  border-radius: 12px; 
  font-weight: 600; 
  text-transform: none; 
  letter-spacing: 0.25px; 
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3); 
  padding: 16px 32px; 
}

.execute-btn:hover { 
  box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4); 
  transform: translateY(-1px); 
}

.actions-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
  gap: 16px; 
  margin-top: 16px; 
}

.action-option { 
  cursor: pointer; 
  transition: all 0.3s ease; 
  border-radius: 12px; 
  border: 2px solid rgba(0, 0, 0, 0.08); 
}

.action-option:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); 
}

.action-option.action-selected { 
  border-color: rgb(var(--v-theme-primary)); 
  background: rgba(var(--v-theme-primary), 0.04); 
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.2); 
  transform: translateY(-2px); 
}

.action-label { 
  font-weight: 600; 
  font-size: 1rem; 
  margin-bottom: 4px; 
}

.action-description { 
  font-size: 0.8rem; 
  color: rgba(0, 0, 0, 0.6); 
}

.cursor-pointer {
  cursor: pointer;
}

.file-field-container {
  position: relative;
}

.file-input-field {
  cursor: pointer !important;
}

.file-input-field :deep(.v-field__input) {
  cursor: pointer !important;
}

.file-input-field :deep(.v-field__field) {
  cursor: pointer !important;
}

.selected-files-chips {
  max-height: 120px;
  overflow-y: auto;
}

.bg-secondary-lighten-5 {
  background-color: rgba(var(--v-theme-secondary), 0.05) !important;
}

.reuse-data-card {
  border: 2px solid rgba(var(--v-theme-secondary), 0.2);
}

.reuse-panels {
  background: transparent;
}

.reuse-panel-content {
  background-color: #fafafa;
  padding: 16px !important;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.field-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.field-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--v-theme-secondary), 0.3);
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}

.field-value {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.87);
  word-break: break-word;
}

/* Estilos para configuração de assinatura por arquivo */
.signature-config-panel {
  border-left: 3px solid rgba(25, 118, 210, 0.3);
}

/* Botão de configurar assinantes - DESTAQUE */
.signature-config-btn {
  text-transform: none !important;
  letter-spacing: 0.5px;
  padding: 6px 16px !important;
  min-width: 160px !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.25) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border-radius: 8px !important;
}

.signature-config-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4) !important;
}

.signature-config-btn:active {
  transform: translateY(0) !important;
}

/* Botão quando já configurado (verde) */
.signature-config-btn.signature-configured {
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25) !important;
  animation: pulse-success 2s infinite;
}

.signature-config-btn.signature-configured:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4) !important;
}

/* Animação de pulso sutil para indicar que está configurado */
@keyframes pulse-success {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25);
  }
  50% {
    box-shadow: 0 2px 12px rgba(76, 175, 80, 0.35);
  }
}

.signature-order-list-compact {
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.signature-order-list-compact .v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background-color 0.2s;
}

.signature-order-list-compact .v-list-item:last-child {
  border-bottom: none;
}

.signature-order-list-compact .v-list-item:hover {
  background-color: rgba(25, 118, 210, 0.04);
}

/* Lista de ordem minimalista - sem avatares */
.signature-order-list-minimal {
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.signature-order-list-minimal .v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background-color 0.2s;
}

.signature-order-list-minimal .v-list-item:last-child {
  border-bottom: none;
}

.signature-order-list-minimal .v-list-item:hover {
  background-color: rgba(25, 118, 210, 0.04);
}

/* Número de ordem simples - sem avatar circular */
.order-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-primary));
  margin-right: 8px;
}

.attachment-item {
  transition: all 0.3s ease;
  position: relative;
}

.attachment-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

/* Indicador visual para arquivos que precisam de configuração */
.attachment-item.needs-signature-config {
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.05) 0%, transparent 100%);
  border-left: 3px solid #FFC107;
  animation: pulse-warning 3s ease-in-out infinite;
}

.attachment-item.needs-signature-config:hover {
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.1) 0%, transparent 100%);
}

/* Animação de pulso sutil para arquivos sem assinantes */
@keyframes pulse-warning {
  0%, 100% {
    border-left-color: #FFC107;
  }
  50% {
    border-left-color: #FFB300;
  }
}

.attachment-actions {
  gap: 8px;
}

.gap-2 {
  gap: 8px;
}

/* Painel de configuração de assinatura - Design Profissional */
.signature-config-panel {
  background: linear-gradient(to bottom, #fafbfc 0%, #f5f7fa 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0 0 12px 12px;
}

.signature-type-toggle {
  width: 100%;
}

.signature-type-toggle .v-btn {
  flex: 1 1 0;
  height: auto !important;
  padding: 12px 16px !important;
  border-radius: 8px !important;
}

.signature-type-toggle .v-btn .v-icon {
  margin-right: 8px;
}

/* ============================================================
   🎨 DESIGN PROFISSIONAL MINIMALISTA
   ============================================================ */

/* Upload Zone - Área de Upload Limpa */
.upload-zone {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  background: rgba(var(--v-theme-primary), 0.02);
  transition: all 0.3s ease;
}

.upload-zone:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-2px);
}

.upload-zone:active {
  transform: translateY(0);
}

/* File Item - Item de Arquivo Minimalista */
.file-item {
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.file-item:last-child {
  border-bottom: none;
}

/* Signer Item Minimal - Item de Assinante no Dropdown */
.signer-item-minimal {
  padding: 8px 12px !important;
}

.signer-item-minimal .v-list-item-title {
  font-weight: 500 !important;
  color: rgba(0, 0, 0, 0.87) !important;
  margin-bottom: 2px;
}

.signer-item-minimal .v-list-item-subtitle {
  color: rgba(0, 0, 0, 0.6) !important;
  font-size: 0.75rem !important;
}

/* Signer Chip Minimal - Chip de Assinante Selecionado */
.signer-chip-minimal {
  font-size: 0.8125rem !important;
  font-weight: 500 !important;
}

/* Signers Summary - Resumo de Assinantes Configurados */
.signers-summary {
  margin-top: 8px;
  border-radius: 0 0 12px 12px;
}

/* Files List - Container da Lista de Arquivos */
.files-list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

@media (max-width: 768px) {
  .step-execution-container {
    padding: 0 12px;
  }
  .execution-header {
    padding: 20px;
  }
  .approval-options {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .approval-option {
    min-height: 120px;
  }
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
