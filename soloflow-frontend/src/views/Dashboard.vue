<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Bem-vindo(a), {{ user?.name }}!
      </h1>
      <p class="text-subtitle-1 text-medium-emphasis">
        {{ greeting }} Aqui está um resumo das suas atividades.
      </p>
    </div>

    <!-- Cards de estatísticas -->
    <v-row class="mb-6">
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card
          class="pa-4"
          :color="stat.color"
          variant="tonal"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-subtitle-2 text-medium-emphasis mb-1">
                {{ stat.title }}
              </p>
              <p class="text-h4 font-weight-bold">
                {{ stat.value }}
              </p>
              <p class="text-caption mt-1">
                <v-icon
                  size="16"
                  :color="stat.trend > 0 ? 'success' : 'error'"
                >
                  {{ stat.trend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                </v-icon>
                <span :class="stat.trend > 0 ? 'text-success' : 'text-error'">
                  {{ Math.abs(stat.trend) }}%
                </span>
                vs mês anterior
              </p>
            </div>
            <v-avatar
              :color="stat.color"
              size="48"
            >
              <v-icon
                :icon="stat.icon"
                size="24"
              />
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráficos e tabelas -->
    <v-row>
      <!-- Processos Recentes -->
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Processos Recentes</span>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="goToProcesses"
            >
              Ver todos
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-title>
          
          <v-divider />

          <v-data-table
            :headers="processHeaders"
            :items="recentProcesses"
            :items-per-page="5"
            class="elevation-0"
          >
            <template v-slot:item.status="{ item }">
              <v-chip
                :color="getStatusColor(item.status)"
                size="small"
                label
              >
                {{ getStatusText(item.status) }}
              </v-chip>
            </template>
            
            <template v-slot:item.actions="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                @click="viewProcess(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <!-- Atividades Recentes -->
      <v-col cols="12" lg="4">
        <v-card>
          <v-card-title>Atividades Recentes</v-card-title>
          
          <v-divider />

          <v-list lines="two">
            <v-list-item
              v-for="activity in recentActivities"
              :key="activity.id"
              class="px-4"
            >
              <template v-slot:prepend>
                <v-avatar :color="activity.color" size="40">
                  <v-icon :icon="activity.icon" size="20" />
                </v-avatar>
              </template>

              <v-list-item-title>{{ activity.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ activity.subtitle }}</v-list-item-subtitle>

              <template v-slot:append>
                <v-list-item-action>
                  <v-list-item-action-text>{{ activity.time }}</v-list-item-action-text>
                </v-list-item-action>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráfico de Processos por Mês -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Processos por Mês</v-card-title>
          
          <v-divider />

          <v-card-text>
            <div class="chart-container">
              <!-- Placeholder para gráfico -->
              <div class="text-center py-12">
                <v-icon size="64" color="grey-lighten-1">mdi-chart-line</v-icon>
                <p class="text-h6 text-grey mt-4">Gráfico em desenvolvimento</p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

// Saudação baseada no horário
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia!'
  if (hour < 18) return 'Boa tarde!'
  return 'Boa noite!'
})

// Estatísticas
const stats = ref([
  {
    title: 'Processos Ativos',
    value: 42,
    icon: 'mdi-file-document-multiple',
    color: 'primary',
    trend: 12
  },
  {
    title: 'Concluídos',
    value: 156,
    icon: 'mdi-check-circle',
    color: 'success',
    trend: 8
  },
  {
    title: 'Pendentes',
    value: 23,
    icon: 'mdi-clock-outline',
    color: 'warning',
    trend: -5
  },
  {
    title: 'Taxa de Conclusão',
    value: '87%',
    icon: 'mdi-chart-line',
    color: 'info',
    trend: 3
  }
])

// Headers da tabela
const processHeaders = [
  { title: 'ID', key: 'id', width: '100' },
  { title: 'Tipo', key: 'type' },
  { title: 'Responsável', key: 'responsible' },
  { title: 'Data', key: 'date' },
  { title: 'Status', key: 'status', align: 'center' },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false }
]

// Dados mockados
const recentProcesses = ref([
  {
    id: '#2341',
    type: 'Solicitação de Compra',
    responsible: 'João Silva',
    date: '28/07/2025',
    status: 'pending'
  },
  {
    id: '#2340',
    type: 'Aprovação de Férias',
    responsible: 'Maria Santos',
    date: '27/07/2025',
    status: 'approved'
  },
  {
    id: '#2339',
    type: 'Reembolso',
    responsible: 'Pedro Oliveira',
    date: '26/07/2025',
    status: 'in_progress'
  },
  {
    id: '#2338',
    type: 'Contratação',
    responsible: 'Ana Costa',
    date: '25/07/2025',
    status: 'rejected'
  },
  {
    id: '#2337',
    type: 'Solicitação de TI',
    responsible: 'Carlos Lima',
    date: '24/07/2025',
    status: 'completed'
  }
])

const recentActivities = ref([
  {
    id: 1,
    title: 'Novo processo criado',
    subtitle: 'Solicitação de compra #2341',
    icon: 'mdi-plus-circle',
    color: 'primary',
    time: '5 min'
  },
  {
    id: 2,
    title: 'Processo aprovado',
    subtitle: 'Férias aprovadas para Maria',
    icon: 'mdi-check',
    color: 'success',
    time: '1h'
  },
  {
    id: 3,
    title: 'Comentário adicionado',
    subtitle: 'No processo #2339',
    icon: 'mdi-comment',
    color: 'info',
    time: '2h'
  },
  {
    id: 4,
    title: 'Processo rejeitado',
    subtitle: 'Contratação #2338',
    icon: 'mdi-close-circle',
    color: 'error',
    time: '3h'
  }
])

// Funções auxiliares
function getStatusColor(status) {
  const colors = {
    pending: 'warning',
    approved: 'success',
    in_progress: 'info',
    rejected: 'error',
    completed: 'success'
  }
  return colors[status] || 'grey'
}

function getStatusText(status) {
  const texts = {
    pending: 'Pendente',
    approved: 'Aprovado',
    in_progress: 'Em Progresso',
    rejected: 'Rejeitado',
    completed: 'Concluído'
  }
  return texts[status] || status
}

function goToProcesses() {
  router.push('/processes')
}

function viewProcess(process) {
  window.showSnackbar(`Visualizando processo ${process.id}`, 'info')
  // router.push(`/processes/${process.id}`)
}

onMounted(() => {
  // Aqui você pode carregar dados reais da API
  console.log('Dashboard carregado')
})
</script>

<style scoped>
.chart-container {
  min-height: 300px;
}
</style>
              