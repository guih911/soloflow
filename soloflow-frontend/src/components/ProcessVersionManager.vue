<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon start color="primary">mdi-source-branch</v-icon>
        <div>
          <div class="text-h5">Versões do Processo</div>
          <div class="text-subtitle-2 text-medium-emphasis">{{ processType?.name }}</div>
        </div>
      </div>
      
      <div class="d-flex align-center gap-2">
        <v-btn
          variant="outlined"
          @click="refreshVersions"
          :loading="loading"
        >
          <v-icon start>mdi-refresh</v-icon>
          Atualizar
        </v-btn>
        
        <v-btn
          color="primary"
          variant="elevated"
          @click="openVersionDialog()"
          prepend-icon="mdi-plus"
        >
          Nova Versão
        </v-btn>
      </div>
    </v-card-title>
    
    <v-divider />
    
    <v-card-text class="pa-0">
      <!-- Lista de versões -->
      <div v-if="versions.length > 0" class="versions-list">
        <v-list lines="three">
          <template v-for="(version, index) in sortedVersions" :key="version.id">
            <v-list-item class="version-item pa-4">
              <template #prepend>
                <v-avatar 
                  :color="getVersionStatusColor(version)" 
                  size="48"
                  class="version-avatar"
                >
                  <span class="text-h6 font-weight-bold">
                    v{{ version.version }}
                  </span>
                </v-avatar>
              </template>

              <v-list-item-title class="d-flex align-center mb-1">
                <span class="font-weight-bold mr-2">
                  {{ version.versionLabel || `v${version.version}.0` }}
                </span>
                
                <!-- Status badges -->
                <v-chip
                  v-if="version.isDraft"
                  size="small"
                  color="orange"
                  variant="tonal"
                  class="mr-2"
                >
                  <v-icon start size="12">mdi-pencil</v-icon>
                  Rascunho
                </v-chip>
                
                <v-chip
                  v-else
                  size="small"
                  color="success"
                  variant="tonal"
                  class="mr-2"
                >
                  <v-icon start size="12">mdi-check-decagram</v-icon>
                  Publicado
                </v-chip>
                
                <v-chip
                  v-if="isCurrentVersion(version)"
                  size="small"
                  color="primary"
                  variant="tonal"
                >
                  <v-icon start size="12">mdi-star</v-icon>
                  Atual
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="version-details">
                <div class="mb-1">
                  <strong>Criado:</strong> {{ formatDate(version.createdAt) }}
                  <span v-if="version.publishedAt" class="ml-4">
                    <strong>Publicado:</strong> {{ formatDate(version.publishedAt) }}
                  </span>
                </div>
                
                <div v-if="version.description" class="mb-1">
                  <strong>Descrição:</strong> {{ version.description }}
                </div>

              </v-list-item-subtitle>
                
              <v-list-item-subtitle class="version-details">
                <div class="mb-1">
                  <strong>Criado:</strong> {{ formatDate(version.createdAt) }}
                  <span v-if="version.publishedAt" class="ml-4">
                    <strong>Publicado:</strong> {{ formatDate(version.publishedAt) }}
                  </span>
                </div>
                
                <div v-if="version.description" class="mb-1">
                  <strong>Descrição:</strong> {{ version.description }}
                </div>
                
                <div class="version-stats d-flex align-center flex-wrap gap-3 mt-2">
                  <v-chip size="x-small" variant="outlined">
                    <v-icon start size="12">mdi-debug-step-over</v-icon>
                    {{ version.stepsCount || version.steps?.length || 0 }} etapas
                  </v-chip>
                  
                  <v-chip size="x-small" variant="outlined">
                    <v-icon start size="12">mdi-form-textbox</v-icon>
                    {{ version.fieldsCount || version.formFields?.length || 0 }} campos
                  </v-chip>
                  
                  <v-chip 
                    v-if="version.instancesCount > 0"
                    size="x-small" 
                    variant="outlined"
                    color="info"
                  >
                    <v-icon start size="12">mdi-file-multiple</v-icon>
                    {{ version.instancesCount }} processo(s) em uso
                  </v-chip>
                </div>
              </v-list-item-subtitle>

              <template #append>
                <div class="version-actions d-flex align-center gap-1">
                  <!-- Visualizar -->
                  <v-btn
                    icon="mdi-eye"
                    variant="text"
                    size="small"
                    @click="viewVersion(version)"
                  >
                    <v-tooltip activator="parent">Visualizar</v-tooltip>
                  </v-btn>
                  
                  <!-- Editar (apenas rascunhos) -->
                  <v-btn
                    v-if="version.isDraft"
                    icon="mdi-pencil"
                    variant="text"
                    size="small"
                    color="primary"
                    @click="editVersion(version)"
                  >
                    <v-tooltip activator="parent">Editar</v-tooltip>
                  </v-btn>
                  
                  <!-- Publicar (apenas rascunhos) -->
                  <v-btn
                    v-if="version.isDraft"
                    icon="mdi-publish"
                    variant="text"
                    size="small"
                    color="success"
                    @click="publishVersion(version)"
                  >
                    <v-tooltip activator="parent">Publicar</v-tooltip>
                  </v-btn>
                  
                  <!-- Duplicar -->
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    size="small"
                    @click="duplicateVersion(version)"
                  >
                    <v-tooltip activator="parent">Duplicar</v-tooltip>
                  </v-btn>
                  
                  <!-- Menu de ações -->
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-dots-vertical"
                        variant="text"
                        size="small"
                      />
                    </template>
                    
                    <v-list>
                      <v-list-item
                        v-if="!version.isDraft && !isCurrentVersion(version)"
                        @click="setAsCurrentVersion(version)"
                      >
                        <template #prepend>
                          <v-icon>mdi-star</v-icon>
                        </template>
                        <v-list-item-title>Definir como Atual</v-list-item-title>
                      </v-list-item>
                      
                      <v-list-item @click="compareVersions(version)">
                        <template #prepend>
                          <v-icon>mdi-compare</v-icon>
                        </template>
                        <v-list-item-title>Comparar</v-list-item-title>
                      </v-list-item>
                      
                      <v-list-item @click="exportVersion(version)">
                        <template #prepend>
                          <v-icon>mdi-download</v-icon>
                        </template>
                        <v-list-item-title>Exportar</v-list-item-title>
                      </v-list-item>
                      
                      <v-divider />
                      
                      <v-list-item
                        v-if="version.isDraft || version.instancesCount === 0"
                        @click="deleteVersion(version)"
                        class="text-error"
                      >
                        <template #prepend>
                          <v-icon>mdi-delete</v-icon>
                        </template>
                        <v-list-item-title>Excluir</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </template>
            </v-list-item>
            
            <v-divider v-if="index < sortedVersions.length - 1" />
          </template>
        </v-list>
      </div>

      <!-- Estado vazio -->
      <div v-else class="empty-state pa-6 text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-source-branch</v-icon>
        <p class="text-h6 mt-4 text-grey">Nenhuma versão encontrada</p>
        <p class="text-body-2 text-grey mb-4">
          Crie a primeira versão deste tipo de processo
        </p>
        <v-btn
          color="primary"
          variant="elevated"
          @click="openVersionDialog()"
        >
          Criar Primeira Versão
        </v-btn>
      </div>
    </v-card-text>

    <!-- Dialog de nova/editar versão -->
    <v-dialog v-model="versionDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-source-branch-plus</v-icon>
          {{ editingVersion ? 'Editar Versão' : 'Nova Versão' }}
        </v-card-title>
        
        <v-divider />

        <v-form ref="versionForm" v-model="versionValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="versionData.versionLabel"
                  label="Rótulo da Versão"
                  placeholder="v2.0, v1.5-beta, etc."
                  :rules="[v => !!v || 'Rótulo é obrigatório']"
                  hint="Como esta versão será identificada"
                  persistent-hint
                />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-select
                  v-model="versionData.baseVersion"
                  :items="baseVersionOptions"
                  label="Baseado na Versão"
                  clearable
                  hint="Versão base para copiar configurações"
                  persistent-hint
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-chip size="small" :color="getVersionStatusColor(item.raw)">
                          v{{ item.raw.version }}
                        </v-chip>
                      </template>
                      <v-list-item-title>{{ item.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              
              <v-col cols="12">
                <v-textarea
                  v-model="versionData.description"
                  label="Descrição das Mudanças"
                  placeholder="Descreva as principais alterações desta versão"
                  rows="3"
                  counter="500"
                  :rules="[v => !v || v.length <= 500 || 'Máximo 500 caracteres']"
                />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-switch
                  v-model="versionData.publishImmediately"
                  label="Publicar Imediatamente"
                  color="primary"
                  hint="Se desmarcado, será salvo como rascunho"
                  persistent-hint
                />
              </v-col>
              
              <v-col cols="12" md="6">
                <v-switch
                  v-model="versionData.setAsCurrent"
                  label="Definir como Versão Atual"
                  color="primary"
                  :disabled="!versionData.publishImmediately"
                  hint="Processos novos usarão esta versão"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <!-- Preview das alterações -->
            <div v-if="versionData.baseVersion" class="changes-preview mt-4">
              <v-divider class="mb-3" />
              <h4 class="text-subtitle-1 mb-2">Preview das Alterações:</h4>
              <v-alert type="info" variant="tonal">
                <v-icon start>mdi-information</v-icon>
                <div>
                  <div class="font-weight-medium">Baseado na {{ getVersionLabel(versionData.baseVersion) }}</div>
                  <div class="mt-1">As configurações serão copiadas e você poderá editá-las após criar a versão.</div>
                </div>
              </v-alert>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeVersionDialog">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="!versionValid"
              :loading="saving"
              @click="saveVersion"
            >
              {{ editingVersion ? 'Salvar' : 'Criar Versão' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Dialog de comparação -->
    <v-dialog v-model="compareDialog" max-width="1200">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="info">mdi-compare</v-icon>
          Comparar Versões
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="compareData.version1"
                :items="versionCompareOptions"
                label="Versão 1"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="compareData.version2"
                :items="versionCompareOptions"
                label="Versão 2"
              />
            </v-col>
          </v-row>

          <!-- Resultado da comparação -->
          <div v-if="compareData.version1 && compareData.version2" class="comparison-result mt-4">
            <VersionComparison 
              :version1="getVersionById(compareData.version1)"
              :version2="getVersionById(compareData.version2)"
            />
          </div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="compareDialog = false">
            Fechar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog de confirmação para exclusão -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start>mdi-alert</v-icon>
          Confirmar Exclusão
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <p>Tem certeza que deseja excluir a versão <strong>{{ versionToDelete?.versionLabel }}</strong>?</p>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Esta ação não pode ser desfeita.
          </p>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="deleting"
            @click="confirmDelete"
          >
            Excluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import VersionComparison from './VersionComparison.vue'
import dayjs from 'dayjs'

const router = useRouter()

const props = defineProps({
  processTypeId: {
    type: String,
    required: true
  },
  processType: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['version-created', 'version-updated', 'version-deleted'])

// Estado
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const versions = ref([])
const currentVersionId = ref(null)

// Dialogs
const versionDialog = ref(false)
const compareDialog = ref(false)
const deleteDialog = ref(false)

// Formulários
const versionForm = ref(null)
const versionValid = ref(false)

// Dados
const editingVersion = ref(null)
const versionToDelete = ref(null)

const versionData = ref({
  versionLabel: '',
  description: '',
  baseVersion: null,
  publishImmediately: false,
  setAsCurrent: false
})

const compareData = ref({
  version1: null,
  version2: null
})

// Computed
const sortedVersions = computed(() => {
  return [...versions.value].sort((a, b) => b.version - a.version)
})

const baseVersionOptions = computed(() => {
  return versions.value
    .filter(v => !v.isDraft)
    .map(version => ({
      title: `${version.versionLabel || `v${version.version}.0`}`,
      value: version.id,
      ...version
    }))
})

const versionCompareOptions = computed(() => {
  return versions.value.map(version => ({
    title: `${version.versionLabel || `v${version.version}.0`} ${version.isDraft ? '(Rascunho)' : ''}`,
    value: version.id
  }))
})

// Métodos auxiliares
function getVersionStatusColor(version) {
  if (version.isDraft) return 'orange'
  if (isCurrentVersion(version)) return 'success'
  return 'primary'
}

function isCurrentVersion(version) {
  return version.id === currentVersionId.value
}

function formatDate(date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function getVersionLabel(versionId) {
  const version = versions.value.find(v => v.id === versionId)
  return version?.versionLabel || `v${version?.version}.0`
}

function getVersionById(versionId) {
  return versions.value.find(v => v.id === versionId)
}

// Métodos principais
async function refreshVersions() {
  loading.value = true
  try {
    // Simular chamada API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Aqui faria a chamada real: 
    // const response = await api.get(`/process-types/${props.processTypeId}/versions`)
    // versions.value = response.data.versions
    // currentVersionId.value = response.data.currentVersionId
    
    console.log('Refreshing versions for process type:', props.processTypeId)
  } catch (error) {
    console.error('Error loading versions:', error)
    window.showSnackbar?.('Erro ao carregar versões', 'error')
  } finally {
    loading.value = false
  }
}

function openVersionDialog(version = null) {
  editingVersion.value = version
  
  if (version) {
    versionData.value = {
      versionLabel: version.versionLabel,
      description: version.description,
      baseVersion: null,
      publishImmediately: !version.isDraft,
      setAsCurrent: isCurrentVersion(version)
    }
  } else {
    // Nova versão
    const lastVersion = sortedVersions.value[0]
    const nextVersionNumber = lastVersion ? lastVersion.version + 1 : 1
    
    versionData.value = {
      versionLabel: `v${nextVersionNumber}.0`,
      description: '',
      baseVersion: lastVersion?.id || null,
      publishImmediately: true,
      setAsCurrent: true
    }
  }
  
  versionDialog.value = true
}

function closeVersionDialog() {
  versionDialog.value = false
  editingVersion.value = null
}

async function saveVersion() {
  if (!versionValid.value) return
  
  saving.value = true
  try {
    const payload = {
      ...versionData.value,
      processTypeId: props.processTypeId
    }
    
    if (editingVersion.value) {
      // Atualizar versão existente
      console.log('Updating version:', editingVersion.value.id, payload)
      // const response = await api.put(`/process-type-versions/${editingVersion.value.id}`, payload)
      
      window.showSnackbar?.('Versão atualizada com sucesso!', 'success')
      emit('version-updated', editingVersion.value.id)
    } else {
      // Criar nova versão
      console.log('Creating new version:', payload)
      // const response = await api.post('/process-type-versions', payload)
      
      window.showSnackbar?.('Nova versão criada com sucesso!', 'success')
      emit('version-created', payload)
    }
    
    closeVersionDialog()
    await refreshVersions()
  } catch (error) {
    console.error('Error saving version:', error)
    window.showSnackbar?.('Erro ao salvar versão', 'error')
  } finally {
    saving.value = false
  }
}

function viewVersion(version) {
  // Redirecionar para editor em modo visualização
  router.push({
    name: 'TipoDeProcessoEditar',
    params: { id: props.processTypeId },
    query: { version: version.id, mode: 'view' }
  })
}

function editVersion(version) {
  // Redirecionar para editor em modo edição
  router.push({
    name: 'TipoDeProcessoEditar',
    params: { id: props.processTypeId },
    query: { version: version.id, mode: 'edit' }
  })
}

async function publishVersion(version) {
  try {
    console.log('Publishing version:', version.id)
    // await api.post(`/process-type-versions/${version.id}/publish`)
    
    window.showSnackbar?.(`Versão ${version.versionLabel} publicada!`, 'success')
    await refreshVersions()
  } catch (error) {
    console.error('Error publishing version:', error)
    window.showSnackbar?.('Erro ao publicar versão', 'error')
  }
}

async function duplicateVersion(version) {
  try {
    const nextVersion = sortedVersions.value[0].version + 1
    
    const duplicateData = {
      versionLabel: `v${nextVersion}.0`,
      description: `Cópia da ${version.versionLabel}`,
      baseVersion: version.id,
      publishImmediately: false,
      setAsCurrent: false
    }
    
    console.log('Duplicating version:', version.id, duplicateData)
    // await api.post('/process-type-versions', { ...duplicateData, processTypeId: props.processTypeId })
    
    window.showSnackbar?.(`Versão ${version.versionLabel} duplicada!`, 'success')
    await refreshVersions()
  } catch (error) {
    console.error('Error duplicating version:', error)
    window.showSnackbar?.('Erro ao duplicar versão', 'error')
  }
}

async function setAsCurrentVersion(version) {
  try {
    console.log('Setting as current version:', version.id)
    // await api.post(`/process-type-versions/${version.id}/set-current`)
    
    currentVersionId.value = version.id
    window.showSnackbar?.(`${version.versionLabel} definida como versão atual!`, 'success')
    await refreshVersions()
  } catch (error) {
    console.error('Error setting current version:', error)
    window.showSnackbar?.('Erro ao definir versão atual', 'error')
  }
}

function compareVersions(version) {
  compareData.value = {
    version1: version.id,
    version2: currentVersionId.value
  }
  compareDialog.value = true
}

async function exportVersion(version) {
  try {
    console.log('Exporting version:', version.id)
    // const response = await api.get(`/process-type-versions/${version.id}/export`)
    
    // Simular download
    const dataStr = JSON.stringify({
      processType: props.processType?.name,
      version: version,
      exportedAt: new Date().toISOString()
    }, null, 2)
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.processType?.name}_${version.versionLabel}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    window.showSnackbar?.('Versão exportada com sucesso!', 'success')
  } catch (error) {
    console.error('Error exporting version:', error)
    window.showSnackbar?.('Erro ao exportar versão', 'error')
  }
}

function deleteVersion(version) {
  versionToDelete.value = version
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!versionToDelete.value) return
  
  deleting.value = true
  try {
    console.log('Deleting version:', versionToDelete.value.id)
    // await api.delete(`/process-type-versions/${versionToDelete.value.id}`)
    
    window.showSnackbar?.(`Versão ${versionToDelete.value.versionLabel} excluída!`, 'success')
    emit('version-deleted', versionToDelete.value.id)
    
    deleteDialog.value = false
    versionToDelete.value = null
    await refreshVersions()
  } catch (error) {
    console.error('Error deleting version:', error)
    window.showSnackbar?.('Erro ao excluir versão', 'error')
  } finally {
    deleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  refreshVersions()
})

// Watchers
watch(() => props.processTypeId, () => {
  refreshVersions()
})
</script>

<style scoped>
.version-item {
  transition: all 0.3s ease;
}

.version-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.version-avatar {
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.version-details {
  font-size: 0.875rem;
}

.version-stats {
  margin-top: 8px;
}

.version-actions {
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.version-item:hover .version-actions {
  opacity: 1;
}

.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.changes-preview {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 16px;
}

.comparison-result {
  max-height: 600px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>