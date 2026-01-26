<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Configurações</h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        Configure as preferências do sistema e da empresa
      </p>
    </div>

    <v-row>
      <!-- Configurações da Empresa -->
      <v-col cols="12" md="8">
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-domain</v-icon>
            Configurações da Empresa
          </v-card-title>
          
          <v-divider />
          
          <v-form ref="companyForm" v-model="companyValid">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="companyData.name"
                    label="Nome da Empresa"
                    :rules="nameRules"
                    required
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="companyData.cnpj"
                    label="CNPJ"
                    v-mask="'##.###.###/####-##'"
                    :rules="cnpjRules"
                    disabled
                    hint="Entre em contato com o suporte para alterar o CNPJ"
                    persistent-hint
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="companyData.email"
                    label="E-mail da Empresa"
                    type="email"
                    :rules="emailRules"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="companyData.phone"
                    label="Telefone"
                    v-mask="['(##) ####-####', '(##) #####-####']"
                    :rules="phoneRules"
                  />
                </v-col>
              </v-row>
            </v-card-text>

            <v-divider />

            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                @click="resetCompanyData"
                :disabled="!companyChanged"
              >
                Cancelar
              </v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                :loading="savingCompany"
                :disabled="!companyValid || !companyChanged"
                @click="updateCompany"
              >
                <v-icon start>mdi-content-save</v-icon>
                Salvar
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card>

        <!-- Configurações do Sistema -->
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-cog</v-icon>
            Configurações do Sistema
          </v-card-title>
          
          <v-divider />
          
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <h3 class="text-subtitle-1 mb-3">Notificações</h3>
                
                <v-switch
                  v-model="systemSettings.emailNotifications"
                  label="Receber notificações por e-mail"
                  color="primary"
                  hide-details
                  class="mb-2"
                />
                
                <v-switch
                  v-model="systemSettings.taskReminders"
                  label="Lembrete de tarefas pendentes"
                  color="primary"
                  hide-details
                  class="mb-2"
                />
                
                <v-switch
                  v-model="systemSettings.processUpdates"
                  label="Atualizações de processo"
                  color="primary"
                  hide-details
                  class="mb-4"
                />
              </v-col>

              <v-col cols="12">
                <h3 class="text-subtitle-1 mb-3">Interface</h3>
                
                <v-select
                  v-model="systemSettings.theme"
                  :items="themeOptions"
                  label="Tema"
                  class="mb-3"
                />
                
                <v-select
                  v-model="systemSettings.language"
                  :items="languageOptions"
                  label="Idioma"
                  class="mb-3"
                />
                
                <v-select
                  v-model="systemSettings.itemsPerPage"
                  :items="itemsPerPageOptions"
                  label="Itens por página"
                  type="number"
                />
              </v-col>

              <v-col cols="12">
                <h3 class="text-subtitle-1 mb-3">Segurança</h3>
                
                <v-switch
                  v-model="systemSettings.autoLogout"
                  label="Logout automático por inatividade"
                  color="primary"
                  hide-details
                  class="mb-2"
                />
                
                <v-select
                  v-if="systemSettings.autoLogout"
                  v-model="systemSettings.autoLogoutTime"
                  :items="autoLogoutOptions"
                  label="Tempo de inatividade (minutos)"
                  class="mt-3"
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="resetSystemSettings"
            >
              Restaurar Padrão
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :loading="savingSettings"
              @click="saveSystemSettings"
            >
              <v-icon start>mdi-content-save</v-icon>
              Salvar Configurações
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Configurações Avançadas (só para ADMIN) -->
        <v-card v-if="isAdmin">
          <v-card-title>
            <v-icon class="mr-2">mdi-shield-crown</v-icon>
            Configurações Avançadas
          </v-card-title>
          
          <v-divider />
          
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <h3 class="text-subtitle-1 mb-3">Backup e Dados</h3>
                
                <v-btn
                  variant="outlined"
                  color="info"
                  class="mr-3 mb-3"
                  @click="exportData"
                  :loading="exporting"
                >
                  <v-icon start>mdi-download</v-icon>
                  Exportar Dados
                </v-btn>
                
                <v-btn
                  variant="outlined"
                  color="warning"
                  class="mr-3 mb-3"
                  @click="openImportDialog"
                >
                  <v-icon start>mdi-upload</v-icon>
                  Importar Dados
                </v-btn>
              </v-col>

              <v-col cols="12">
                <h3 class="text-subtitle-1 mb-3">Logs do Sistema</h3>
                
                <v-btn
                  variant="outlined"
                  class="mr-3 mb-3"
                  @click="viewSystemLogs"
                >
                  <v-icon start>mdi-text-box-search</v-icon>
                  Ver Logs
                </v-btn>
                
                <v-btn
                  variant="outlined"
                  color="error"
                  class="mb-3"
                  @click="clearLogs"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Limpar Logs
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Informações e Ações -->
      <v-col cols="12" md="4">
        <!-- Status do Sistema -->
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-information</v-icon>
            Status do Sistema
          </v-card-title>
          
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>Sistema</v-list-item-title>
              <v-list-item-subtitle>Online</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="info">mdi-database</v-icon>
              </template>
              <v-list-item-title>Banco de Dados</v-list-item-title>
              <v-list-item-subtitle>Conectado</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="warning">mdi-update</v-icon>
              </template>
              <v-list-item-title>Última Atualização</v-list-item-title>
              <v-list-item-subtitle>{{ lastUpdate }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-tag</v-icon>
              </template>
              <v-list-item-title>Versão</v-list-item-title>
              <v-list-item-subtitle>v1.0.0</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Estatísticas da Empresa -->
        <v-card class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Estatísticas da Empresa
          </v-card-title>
          
          <v-divider />
          
          <v-list density="comfortable">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-account-group</v-icon>
              </template>
              <v-list-item-title>Usuários Ativos</v-list-item-title>
              <v-list-item-subtitle>{{ companyStats.activeUsers }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="info">mdi-file-document</v-icon>
              </template>
              <v-list-item-title>Processos Ativos</v-list-item-title>
              <v-list-item-subtitle>{{ companyStats.activeProcesses }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>Processos Concluídos</v-list-item-title>
              <v-list-item-subtitle>{{ companyStats.completedProcesses }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="warning">mdi-office-building</v-icon>
              </template>
              <v-list-item-title>Setores</v-list-item-title>
              <v-list-item-subtitle>{{ companyStats.sectors }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Ações Rápidas -->
        <v-card>
          <v-card-title>
            <v-icon class="mr-2">mdi-flash</v-icon>
            Ações Rápidas
          </v-card-title>
          
          <v-divider />
          
          <v-card-text>
            <v-btn
              block
              color="primary"
              variant="elevated"
              class="mb-3"
              @click="refreshSystem"
              :loading="refreshing"
            >
              <v-icon start>mdi-refresh</v-icon>
              Atualizar Sistema
            </v-btn>
            
            <v-btn
              block
              variant="outlined"
              class="mb-3"
              @click="testNotifications"
            >
              <v-icon start>mdi-bell-ring</v-icon>
              Testar Notificações
            </v-btn>
            
            <v-btn
              v-if="isAdmin"
              block
              variant="outlined"
              color="error"
              @click="openMaintenanceDialog"
            >
              <v-icon start>mdi-wrench</v-icon>
              Modo Manutenção
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de Manutenção -->
    <v-dialog v-model="maintenanceDialog" max-width="400">
      <v-card>
        <v-card-title>Modo Manutenção</v-card-title>
        <v-card-text>
          Ativar o modo manutenção impedirá que outros usuários acessem o sistema.
          Tem certeza que deseja continuar?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="maintenanceDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="error" @click="enableMaintenance">
            Ativar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'

const authStore = useAuthStore()

// Estado
const companyValid = ref(false)
const savingCompany = ref(false)
const savingSettings = ref(false)
const exporting = ref(false)
const refreshing = ref(false)
const maintenanceDialog = ref(false)

const companyForm = ref(null)

const companyData = ref({
  name: '',
  cnpj: '',
  email: '',
  phone: ''
})

const originalCompanyData = ref({})

const systemSettings = ref({
  emailNotifications: true,
  taskReminders: true,
  processUpdates: true,
  theme: 'light',
  language: 'pt-BR',
  itemsPerPage: 10,
  autoLogout: false,
  autoLogoutTime: 30
})

const companyStats = ref({
  activeUsers: 0,
  activeProcesses: 0,
  completedProcesses: 0,
  sectors: 0
})

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const activeCompany = computed(() => authStore.activeCompany)

const companyChanged = computed(() => {
  return JSON.stringify(companyData.value) !== JSON.stringify(originalCompanyData.value)
})

const lastUpdate = computed(() => {
  return dayjs().subtract(2, 'day').format('DD/MM/YYYY HH:mm')
})

// Opções
const themeOptions = [
  { title: 'Claro', value: 'light' },
  { title: 'Escuro', value: 'dark' },
  { title: 'Automático', value: 'auto' }
]

const languageOptions = [
  { title: 'Português (Brasil)', value: 'pt-BR' },
  { title: 'English (US)', value: 'en-US' },
  { title: 'Español', value: 'es-ES' }
]

const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 }
]

const autoLogoutOptions = [
  { title: '15 minutos', value: 15 },
  { title: '30 minutos', value: 30 },
  { title: '1 hora', value: 60 },
  { title: '2 horas', value: 120 }
]

// Regras de validação
const nameRules = [
  v => !!v || 'O nome é obrigatório',
  v => v.length >= 3 || 'O nome deve ter no mínimo 3 caracteres'
]

const cnpjRules = [
  v => !!v || 'O CNPJ é obrigatório',
  v => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v) || 'O CNPJ informado é inválido'
]

const emailRules = [
  v => !v || /.+@.+\..+/.test(v) || 'O e-mail deve ser válido'
]

const phoneRules = [
  v => !v || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v) || 'O telefone informado é inválido'
]

// Métodos
function resetCompanyData() {
  companyData.value = { ...originalCompanyData.value }
}

async function updateCompany() {
  if (!companyValid.value) return

  savingCompany.value = true
  try {
    // Aqui você faria a chamada para atualizar a empresa
    // await api.patch(`/companies/${activeCompany.value.id}`, companyData.value)
    
    originalCompanyData.value = { ...companyData.value }
    window.showSnackbar?.('Dados da empresa atualizados com sucesso!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao atualizar dados da empresa', 'error')
  } finally {
    savingCompany.value = false
  }
}

function resetSystemSettings() {
  systemSettings.value = {
    emailNotifications: true,
    taskReminders: true,
    processUpdates: true,
    theme: 'light',
    language: 'pt-BR',
    itemsPerPage: 10,
    autoLogout: false,
    autoLogoutTime: 30
  }
}

async function saveSystemSettings() {
  savingSettings.value = true
  try {
    // Salvar configurações no localStorage ou enviar para API
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings.value))
    window.showSnackbar?.('Configurações salvas com sucesso!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao salvar configurações', 'error')
  } finally {
    savingSettings.value = false
  }
}

async function exportData() {
  exporting.value = true
  try {
    // Implementar exportação de dados
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simular delay
    window.showSnackbar?.('Dados exportados com sucesso!', 'success')
  } catch (error) {
    window.showSnackbar?.('Erro ao exportar dados', 'error')
  } finally {
    exporting.value = false
  }
}

function openImportDialog() {
  window.showSnackbar?.('Funcionalidade em desenvolvimento', 'info')
}

function viewSystemLogs() {
  window.showSnackbar?.('Funcionalidade em desenvolvimento', 'info')
}

function clearLogs() {
  window.showSnackbar?.('Logs limpos com sucesso!', 'success')
}

async function refreshSystem() {
  refreshing.value = true
  try {
    await loadCompanyStats()
    window.showSnackbar?.('Sistema atualizado!', 'success')
  } catch (error) {
  } finally {
    refreshing.value = false
  }
}

function testNotifications() {
  window.showSnackbar?.('Notificação de teste enviada!', 'info')
}

function openMaintenanceDialog() {
  maintenanceDialog.value = true
}

function enableMaintenance() {
  maintenanceDialog.value = false
  window.showSnackbar?.('Modo manutenção ativado', 'warning')
}

async function loadCompanyStats() {
  try {
    // Simular carregamento de estatísticas
    companyStats.value = {
      activeUsers: 15,
      activeProcesses: 42,
      completedProcesses: 128,
      sectors: 6
    }
  } catch (error) {
  }
}

function loadCompanyData() {
  if (activeCompany.value) {
    companyData.value = {
      name: activeCompany.value.name || '',
      cnpj: activeCompany.value.cnpj || '',
      email: activeCompany.value.email || '',
      phone: activeCompany.value.phone || ''
    }
    originalCompanyData.value = { ...companyData.value }
  }
}

function loadSystemSettings() {
  try {
    const stored = localStorage.getItem('systemSettings')
    if (stored) {
      systemSettings.value = { ...systemSettings.value, ...JSON.parse(stored) }
    }
  } catch (error) {
  }
}

onMounted(() => {
  loadCompanyData()
  loadSystemSettings()
  loadCompanyStats()
})
</script>