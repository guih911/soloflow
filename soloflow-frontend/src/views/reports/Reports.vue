<template>
  <div class="reports-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Relatórios e Performance</h1>
        <p class="page-subtitle">Indicadores de desempenho e análise operacional</p>
      </div>
      <div class="header-actions">
        <v-btn
          v-if="authStore.hasPermission('reports', 'export')"
          color="primary"
          variant="flat"
          prepend-icon="mdi-file-pdf-box"
          :loading="exporting"
          @click="handleExport"
          class="export-btn"
        >
          Exportar PDF
        </v-btn>
      </div>
    </div>

    <!-- Tabs -->
    <v-card v-if="hasAnyReportAccess" elevation="0" class="tabs-card mb-6">
      <v-tabs v-model="activeTab" color="primary" density="comfortable">
        <v-tab v-if="canViewReport('dashboard')" value="dashboard">
          <v-icon start size="18">mdi-view-dashboard-variant</v-icon>
          Visão Geral
        </v-tab>
        <v-tab v-if="canViewReport('performance')" value="performance">
          <v-icon start size="18">mdi-chart-timeline-variant-shimmer</v-icon>
          Performance
        </v-tab>
        <v-tab v-if="canViewReport('processes')" value="processes">
          <v-icon start size="18">mdi-file-document-multiple</v-icon>
          Processos
        </v-tab>
        <v-tab v-if="canViewReport('tasks')" value="tasks">
          <v-icon start size="18">mdi-account-check</v-icon>
          Produtividade
        </v-tab>
        <v-tab v-if="canViewReport('sectors')" value="sectors">
          <v-icon start size="18">mdi-office-building</v-icon>
          Setores
        </v-tab>
        <v-tab v-if="canViewReport('audit')" value="audit">
          <v-icon start size="18">mdi-shield-check</v-icon>
          Auditoria
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- No Reports Access -->
    <v-card v-if="!hasAnyReportAccess" elevation="0" class="no-access-card">
      <div class="no-access-content">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-box-outline</v-icon>
        <h3 class="mt-4">Sem acesso a relatórios</h3>
        <p class="text-medium-emphasis">Você não tem permissão para visualizar nenhum tipo de relatório. Entre em contato com o administrador.</p>
      </div>
    </v-card>

    <!-- Global Filters (for managers) -->
    <v-card v-if="canManage && hasAnyReportAccess" elevation="0" class="global-filters-card mb-4">
      <div class="d-flex flex-wrap ga-3 align-center pa-4">
        <div class="filter-label">
          <v-icon size="16" color="primary" class="mr-1">mdi-filter-variant</v-icon>
          <span>Filtros Globais</span>
        </div>
        <v-select
          v-model="globalFilters.sectorId"
          :items="sectorOptions"
          label="Setor"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 200px;"
          @update:model-value="onGlobalFilterChange"
        />
        <v-select
          v-model="globalFilters.userId"
          :items="userOptions"
          label="Usuário"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 220px;"
          @update:model-value="onGlobalFilterChange"
        />
        <v-btn
          v-if="globalFilters.sectorId || globalFilters.userId"
          variant="text"
          size="small"
          color="secondary"
          prepend-icon="mdi-close"
          @click="clearGlobalFilters"
        >
          Limpar
        </v-btn>
      </div>
    </v-card>

    <!-- Loading -->
    <div v-if="reportsStore.loading && hasAnyReportAccess" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="48" width="3" />
      <p class="mt-4 text-medium-emphasis">Carregando dados...</p>
    </div>

    <!-- Tab Content -->
    <div v-else-if="hasAnyReportAccess">

      <!-- ===================== DASHBOARD ===================== -->
      <div v-if="activeTab === 'dashboard'">
        <div v-if="dashboardData" class="dashboard-content">

          <!-- KPI Cards -->
          <div class="stats-grid">
            <div class="stat-card stat-card--primary">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--primary">
                  <v-icon size="22">mdi-file-document-multiple</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Total de Processos</span>
                  <span class="stat-card__value">{{ dashboardData.cards.total }}</span>
                </div>
                <div v-if="dashboardData.trends?.processes" class="stat-card__trend" :class="'trend--' + dashboardData.trends.processes.direction">
                  <v-icon size="14">{{ dashboardData.trends.processes.direction === 'up' ? 'mdi-trending-up' : dashboardData.trends.processes.direction === 'down' ? 'mdi-trending-down' : 'mdi-minus' }}</v-icon>
                  <span>{{ dashboardData.trends.processes.value }}%</span>
                </div>
              </div>
              <div class="stat-card__sublabel">{{ dashboardData.cards.newProcesses30d }} novos nos últimos 30 dias</div>
            </div>

            <div class="stat-card stat-card--success">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--success">
                  <v-icon size="22">mdi-check-decagram</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Taxa de Conclusão</span>
                  <span class="stat-card__value">{{ dashboardData.cards.completionRate }}<span class="stat-card__unit">%</span></span>
                </div>
                <div v-if="dashboardData.trends?.completed" class="stat-card__trend" :class="'trend--' + dashboardData.trends.completed.direction">
                  <v-icon size="14">{{ dashboardData.trends.completed.direction === 'up' ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                  <span>{{ dashboardData.trends.completed.value }}%</span>
                </div>
              </div>
              <div class="stat-card__sublabel">{{ dashboardData.cards.completed }} concluídos de {{ dashboardData.cards.total }}</div>
            </div>

            <div class="stat-card stat-card--warning">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--warning">
                  <v-icon size="22">mdi-clock-fast</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Tempo Médio</span>
                  <span class="stat-card__value">{{ formatAvgTime(dashboardData.cards.avgCompletionHours) }}</span>
                </div>
              </div>
              <div class="stat-card__sublabel">Baseado nos últimos 200 processos</div>
            </div>

            <div class="stat-card stat-card--error">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--error">
                  <v-icon size="22">mdi-alert-circle</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Tarefas Pendentes</span>
                  <span class="stat-card__value">{{ dashboardData.cards.pendingTasks }}</span>
                </div>
              </div>
              <div class="stat-card__sublabel">{{ dashboardData.cards.inProgress }} processos em andamento</div>
            </div>
          </div>

          <!-- Charts Row 1: Timeline + Status -->
          <div class="content-grid">
            <div class="content-card content-card--wide">
              <div class="card-header">
                <div class="card-header__left">
                  <v-icon color="primary" size="20" class="mr-2">mdi-chart-line</v-icon>
                  <h3 class="card-title">Fluxo de Processos</h3>
                </div>
                <v-chip size="x-small" variant="tonal" color="grey">6 meses</v-chip>
              </div>
              <div class="chart-body">
                <Line v-if="flowChartData" :data="flowChartData" :options="areaChartOptions" />
              </div>
            </div>

            <div class="content-card content-card--narrow">
              <div class="card-header">
                <div class="card-header__left">
                  <v-icon color="primary" size="20" class="mr-2">mdi-chart-donut</v-icon>
                  <h3 class="card-title">Distribuição por Status</h3>
                </div>
              </div>
              <div class="chart-body chart-body--centered">
                <Doughnut v-if="statusChartData" :data="statusChartData" :options="doughnutOptions" />
              </div>
            </div>
          </div>

          <!-- Charts Row 2: Sector + Rankings -->
          <div class="content-grid mt-4">
            <div class="content-card content-card--wide">
              <div class="card-header">
                <div class="card-header__left">
                  <v-icon color="primary" size="20" class="mr-2">mdi-office-building</v-icon>
                  <h3 class="card-title">Volume por Setor</h3>
                </div>
              </div>
              <div class="chart-body">
                <Bar v-if="sectorChartData" :data="sectorChartData" :options="horizontalBarOptions" />
              </div>
            </div>

            <div class="content-card content-card--narrow">
              <div class="card-header">
                <div class="card-header__left">
                  <v-icon color="primary" size="20" class="mr-2">mdi-trophy</v-icon>
                  <h3 class="card-title">Top Colaboradores</h3>
                </div>
                <v-chip size="x-small" variant="tonal" color="grey">30 dias</v-chip>
              </div>
              <div class="ranking-list">
                <div v-for="(executor, idx) in dashboardData.topExecutors" :key="executor.userId" class="ranking-item">
                  <div class="ranking-position" :class="'ranking--' + (idx + 1)">{{ idx + 1 }}</div>
                  <div class="ranking-info">
                    <span class="ranking-name">{{ executor.name }}</span>
                    <v-progress-linear
                      :model-value="getExecutorProgress(executor.count)"
                      color="primary"
                      height="4"
                      rounded
                      class="mt-1"
                    />
                  </div>
                  <div class="ranking-value">{{ executor.count }}</div>
                </div>
                <div v-if="!dashboardData.topExecutors?.length" class="empty-ranking">
                  <span class="text-medium-emphasis text-caption">Sem dados no período</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 3: Top Process Types -->
          <div v-if="dashboardData.topProcessTypes?.length" class="content-card mt-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="primary" size="20" class="mr-2">mdi-file-tree</v-icon>
                <h3 class="card-title">Tipos de Processo Mais Utilizados</h3>
              </div>
            </div>
            <div class="chart-body chart-body--sm">
              <Bar v-if="processTypesChartData" :data="processTypesChartData" :options="barChartOptions" />
            </div>
          </div>

        </div>
      </div>

      <!-- ===================== PERFORMANCE (NOVA) ===================== -->
      <div v-if="activeTab === 'performance'">
        <div v-if="performanceData" class="performance-content">

          <!-- Alert KPI Cards -->
          <div class="stats-grid">
            <div class="stat-card stat-card--error">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--error">
                  <v-icon size="22">mdi-alert-octagon</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Processos Atrasados</span>
                  <span class="stat-card__value">{{ performanceData.summary.staleCount }}</span>
                </div>
              </div>
              <div class="stat-card__sublabel">Parados há mais de 3 dias</div>
            </div>

            <div class="stat-card stat-card--warning">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--warning">
                  <v-icon size="22">mdi-traffic-cone</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Gargalos Detectados</span>
                  <span class="stat-card__value">{{ performanceData.summary.bottleneckCount }}</span>
                </div>
              </div>
              <div class="stat-card__sublabel">Etapas com maior tempo de espera</div>
            </div>

            <div class="stat-card stat-card--violet">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--violet">
                  <v-icon size="22">mdi-account-alert</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Carga Máxima</span>
                  <span class="stat-card__value">{{ performanceData.summary.maxWorkloadPending }}</span>
                </div>
              </div>
              <div class="stat-card__sublabel">{{ performanceData.summary.maxWorkloadUser }}</div>
            </div>

            <div class="stat-card stat-card--success">
              <div class="stat-card__content">
                <div class="stat-card__icon stat-card__icon--success">
                  <v-icon size="22">mdi-speedometer</v-icon>
                </div>
                <div class="stat-card__info">
                  <span class="stat-card__label">Eficiência Média</span>
                  <span class="stat-card__value">{{ performanceData.summary.avgEfficiency }}<span class="stat-card__unit">%</span></span>
                </div>
              </div>
              <div class="stat-card__sublabel">Taxa média de conclusão (30 dias)</div>
            </div>
          </div>

          <!-- Gargalos -->
          <div v-if="performanceData.bottlenecks?.length" class="content-card mt-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="warning" size="20" class="mr-2">mdi-traffic-cone</v-icon>
                <h3 class="card-title">Gargalos - Etapas Mais Lentas</h3>
              </div>
              <v-chip size="x-small" variant="tonal" color="warning">{{ performanceData.bottlenecks.length }} etapas</v-chip>
            </div>
            <div class="bottleneck-list">
              <div v-for="item in performanceData.bottlenecks" :key="item.name" class="bottleneck-item">
                <div class="bottleneck-info">
                  <span class="bottleneck-name">{{ item.name }}</span>
                  <div class="bottleneck-meta">
                    <span class="bottleneck-time">{{ formatAvgTime(item.avgHours) }} em média</span>
                    <span class="bottleneck-count">{{ item.count }} paradas</span>
                  </div>
                </div>
                <div class="bottleneck-bar-container">
                  <div class="bottleneck-bar" :style="{ width: item.percentage + '%' }"></div>
                </div>
                <span class="bottleneck-percentage">{{ item.percentage }}%</span>
              </div>
            </div>
          </div>

          <!-- Carga de Trabalho -->
          <div v-if="performanceData.workload?.length" class="content-card mt-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="primary" size="20" class="mr-2">mdi-account-group</v-icon>
                <h3 class="card-title">Carga de Trabalho por Colaborador</h3>
              </div>
              <v-chip size="x-small" variant="tonal" color="primary">{{ performanceData.workload.length }} colaboradores</v-chip>
            </div>
            <div class="chart-body chart-body--lg">
              <Bar v-if="workloadChartData" :data="workloadChartData" :options="workloadBarOptions" />
            </div>
          </div>

          <!-- Processos Atrasados -->
          <div v-if="performanceData.staleProcesses?.length" class="content-card mt-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="error" size="20" class="mr-2">mdi-alert-octagon</v-icon>
                <h3 class="card-title">Processos Atrasados</h3>
              </div>
              <v-chip size="x-small" variant="tonal" color="error">{{ performanceData.staleProcesses.length }} processos</v-chip>
            </div>
            <v-data-table
              :headers="staleHeaders"
              :items="performanceData.staleProcesses"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.daysStopped="{ item }">
                <v-chip
                  :color="item.daysStopped > 7 ? 'error' : 'warning'"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ item.daysStopped }}d
                </v-chip>
              </template>
              <template #item.currentStep="{ item }">
                <span class="text-body-2">{{ item.currentStep }}</span>
              </template>
              <template #item.responsible="{ item }">
                <span class="text-body-2">{{ item.responsible }}</span>
              </template>
            </v-data-table>
          </div>

          <!-- Eficiência por Colaborador -->
          <div v-if="performanceData.efficiency?.length" class="content-card mt-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="success" size="20" class="mr-2">mdi-speedometer</v-icon>
                <h3 class="card-title">Eficiência por Colaborador</h3>
              </div>
              <v-chip size="x-small" variant="tonal" color="success">30 dias</v-chip>
            </div>
            <v-data-table
              :headers="efficiencyHeaders"
              :items="performanceData.efficiency"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.avgResponseHours="{ item }">
                <span v-if="item.avgResponseHours != null" class="font-weight-medium">
                  {{ formatAvgTime(item.avgResponseHours) }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.completionRate="{ item }">
                <div class="d-flex align-center ga-2">
                  <v-progress-linear
                    :model-value="item.completionRate"
                    :color="item.completionRate >= 70 ? '#22c55e' : item.completionRate >= 40 ? '#f59e0b' : '#ef4444'"
                    height="8"
                    rounded
                    style="max-width: 80px;"
                  />
                  <span class="text-body-2 font-weight-bold">{{ item.completionRate }}%</span>
                </div>
              </template>
            </v-data-table>
          </div>

          <!-- Empty state -->
          <div v-if="!performanceData.bottlenecks?.length && !performanceData.staleProcesses?.length" class="empty-state mt-6">
            <v-icon size="48" color="success" class="mb-3">mdi-check-circle-outline</v-icon>
            <p class="text-body-1 font-weight-medium">Nenhum problema de performance detectado</p>
            <p class="text-body-2 text-medium-emphasis">Todos os processos estão fluindo normalmente.</p>
          </div>

        </div>
      </div>

      <!-- ===================== PROCESSOS ===================== -->
      <div v-if="activeTab === 'processes'">
        <ReportFilters :show-status="true" :status-options="processStatusOptions" @apply="loadProcesses" />
        <div v-if="reportData">
          <div class="content-grid">
            <div class="content-card content-card--wide">
              <div class="card-header">
                <div class="card-header__left">
                  <h3 class="card-title">Evolução Temporal</h3>
                </div>
              </div>
              <div class="chart-body">
                <Line v-if="processTimelineData" :data="processTimelineData" :options="areaChartOptions" />
              </div>
            </div>
            <div v-if="reportData.byType?.length" class="content-card content-card--narrow">
              <div class="card-header">
                <div class="card-header__left">
                  <h3 class="card-title">Por Tipo</h3>
                </div>
              </div>
              <div class="chart-body chart-body--centered">
                <Doughnut :data="processTypeDistData" :options="doughnutOptions" />
              </div>
            </div>
          </div>
          <div class="content-card mt-4">
            <v-data-table
              :headers="processHeaders"
              :items="reportData.data"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
              <template #item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal" class="font-weight-medium">
                  {{ translateStatus(item.status) }}
                </v-chip>
              </template>
              <template #item.processType="{ item }">
                {{ item.processTypeVersion?.processType?.name || '-' }}
              </template>
              <template #item.createdByUser="{ item }">
                {{ item.createdBy?.name || '-' }}
              </template>
            </v-data-table>
          </div>
        </div>
      </div>

      <!-- ===================== PRODUTIVIDADE ===================== -->
      <div v-if="activeTab === 'tasks'">
        <ReportFilters :show-status="true" :status-options="taskStatusOptions" @apply="loadTasks" />
        <div v-if="reportData">
          <!-- Mini KPIs -->
          <div class="mini-kpi-row" v-if="reportData.byStatus">
            <div class="mini-kpi" v-for="s in reportData.byStatus" :key="s.status">
              <div class="mini-kpi-value">{{ s.count }}</div>
              <div class="mini-kpi-label">{{ translateStatus(s.status) }}</div>
            </div>
          </div>

          <div class="content-grid">
            <div class="content-card content-card--equal">
              <div class="card-header">
                <div class="card-header__left">
                  <h3 class="card-title">Tarefas por Colaborador</h3>
                </div>
              </div>
              <div class="chart-body">
                <Bar v-if="executorChartData" :data="executorChartData" :options="barChartOptions" />
              </div>
            </div>
            <div class="content-card content-card--equal">
              <div class="card-header">
                <div class="card-header__left">
                  <h3 class="card-title">Tempo Médio por Colaborador</h3>
                </div>
              </div>
              <div class="chart-body">
                <Bar v-if="avgTimeChartData" :data="avgTimeChartData" :options="avgTimeBarOptions" />
              </div>
            </div>
          </div>

          <div class="content-card mt-4">
            <v-data-table
              :headers="taskHeaders"
              :items="reportData.data"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
              <template #item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal" class="font-weight-medium">
                  {{ translateStatus(item.status) }}
                </v-chip>
              </template>
              <template #item.stepVersion="{ item }">
                {{ item.stepVersion?.name || '-' }}
              </template>
              <template #item.assignedUser="{ item }">
                {{ item.executor?.name || '-' }}
              </template>
              <template #item.process="{ item }">
                {{ item.processInstance?.code || '-' }}
              </template>
              <template #item.executionTime="{ item }">
                <span v-if="item.executionTime != null" class="execution-time">
                  {{ item.executionTime }}h
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
            </v-data-table>
          </div>
        </div>
      </div>

      <!-- ===================== SETORES ===================== -->
      <div v-if="activeTab === 'sectors'">
        <div v-if="sectorsData">
          <div class="content-card mb-4">
            <div class="card-header">
              <div class="card-header__left">
                <v-icon color="primary" size="20" class="mr-2">mdi-chart-bar-stacked</v-icon>
                <h3 class="card-title">Comparativo de Setores</h3>
              </div>
            </div>
            <div class="chart-body">
              <Bar v-if="sectorComparisonData" :data="sectorComparisonData" :options="stackedBarOptions" />
            </div>
          </div>

          <div class="content-card">
            <v-data-table
              :headers="sectorHeaders"
              :items="sectorsData.data"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.completionRate="{ item }">
                <div class="d-flex align-center ga-2">
                  <v-progress-linear
                    :model-value="item.completionRate"
                    :color="item.completionRate >= 70 ? '#22c55e' : item.completionRate >= 40 ? '#f59e0b' : '#ef4444'"
                    height="8"
                    rounded
                    style="max-width: 80px;"
                  />
                  <span class="text-body-2 font-weight-medium">{{ item.completionRate }}%</span>
                </div>
              </template>
              <template #item.avgHours="{ item }">
                <span v-if="item.avgHours">{{ formatAvgTime(item.avgHours) }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
            </v-data-table>
          </div>
        </div>
      </div>

      <!-- ===================== AUDITORIA ===================== -->
      <div v-if="activeTab === 'audit'">
        <ReportFilters @apply="loadAudit" />
        <div v-if="reportData">
          <div v-if="reportData.byAction?.length" class="content-card mb-4">
            <div class="card-header">
              <div class="card-header__left">
                <h3 class="card-title">Ações Mais Frequentes</h3>
              </div>
            </div>
            <div class="chart-body chart-body--sm">
              <Bar :data="auditActionsData" :options="horizontalBarOptions" />
            </div>
          </div>
          <div class="content-card">
            <v-data-table
              :headers="auditHeaders"
              :items="reportData.data"
              :items-per-page="10"
              class="report-table"
            >
              <template #item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
              <template #item.user="{ item }">
                {{ item.user?.name || '-' }}
              </template>
              <template #item.details="{ item }">
                <span class="text-truncate d-inline-block" style="max-width: 200px;">
                  {{ formatDetails(item.details) }}
                </span>
              </template>
            </v-data-table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useReportsStore } from '@/stores/reports'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/users'
import { useSectorStore } from '@/stores/sectors'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Filler, Title, Tooltip, Legend)

// Inline filter component
const ReportFilters = {
  props: {
    showStatus: { type: Boolean, default: false },
    statusOptions: { type: Array, default: () => [] },
  },
  emits: ['apply'],
  template: `
    <v-card elevation="0" class="filter-card mb-4">
      <div class="d-flex flex-wrap ga-3 align-center pa-4">
        <v-text-field v-model="localFilters.startDate" label="Data Início" type="date" variant="outlined" density="compact" hide-details style="max-width: 170px;" />
        <v-text-field v-model="localFilters.endDate" label="Data Fim" type="date" variant="outlined" density="compact" hide-details style="max-width: 170px;" />
        <v-select v-if="showStatus" v-model="localFilters.status" :items="statusOptions" label="Status" variant="outlined" density="compact" hide-details clearable style="max-width: 170px;" />
        <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-magnify" @click="apply">Filtrar</v-btn>
        <v-btn variant="text" size="small" color="secondary" @click="reset">Limpar</v-btn>
      </div>
    </v-card>
  `,
  setup(props, { emit }) {
    const localFilters = ref({ startDate: '', endDate: '', status: '' })
    const apply = () => emit('apply', { ...localFilters.value })
    const reset = () => { localFilters.value = { startDate: '', endDate: '', status: '' }; emit('apply', {}) }
    return { localFilters, apply, reset }
  },
}

const reportsStore = useReportsStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const sectorStore = useSectorStore()

const activeTab = ref(null)
const exporting = ref(false)
const reportData = ref(null)
const sectorsData = ref(null)

// Global Filters (visible only for managers)
const globalFilters = ref({ sectorId: '', userId: '' })

const canManage = computed(() => {
  return authStore.hasPermission('reports', 'manage')
})

// Tipos de relatório disponíveis
const reportTypes = ['dashboard', 'performance', 'processes', 'tasks', 'sectors', 'audit']

// Verifica se o usuário tem acesso a um tipo de relatório específico
function canViewReport(reportType) {
  // Se tem permissão 'manage', pode ver todos os relatórios
  if (authStore.hasPermission('reports', 'manage')) {
    return true
  }
  // Se tem a permissão específica view_<reportType>
  if (authStore.hasPermission('reports', `view_${reportType}`)) {
    return true
  }
  // Fallback: se tem permissão 'view' básica E não há nenhuma permissão específica configurada,
  // permitir acesso (compatibilidade com perfis antigos)
  if (authStore.hasPermission('reports', 'view')) {
    // Verificar se existem permissões específicas de relatório configuradas
    const hasSpecificReportPermissions = reportTypes.some(rt =>
      authStore.hasPermission('reports', `view_${rt}`)
    )
    // Se não tem nenhuma permissão específica, permite todos (perfil antigo)
    if (!hasSpecificReportPermissions) {
      return true
    }
  }
  return false
}

// Verifica se tem acesso a pelo menos um relatório
const hasAnyReportAccess = computed(() => {
  return reportTypes.some(rt => canViewReport(rt))
})

// Lista de relatórios disponíveis para o usuário
const availableReports = computed(() => {
  return reportTypes.filter(rt => canViewReport(rt))
})

// Define a aba inicial baseada nas permissões
const initialTab = computed(() => {
  if (availableReports.value.length > 0) {
    return availableReports.value[0]
  }
  return 'dashboard'
})

const sectorOptions = computed(() => {
  return (sectorStore.sectors || []).map(s => ({ title: s.name, value: s.id }))
})

const userOptions = computed(() => {
  return (userStore.users || []).map(u => ({ title: u.name, value: u.id }))
})

function onGlobalFilterChange() {
  reloadCurrentTab()
}

function clearGlobalFilters() {
  globalFilters.value = { sectorId: '', userId: '' }
  reloadCurrentTab()
}

function getActiveFilters(extra = {}) {
  const filters = { ...extra }
  if (globalFilters.value.sectorId) filters.sectorId = globalFilters.value.sectorId
  if (globalFilters.value.userId) filters.userId = globalFilters.value.userId
  return filters
}

function reloadCurrentTab() {
  const tab = activeTab.value
  if (tab === 'dashboard') reportsStore.fetchDashboard(getActiveFilters())
  else if (tab === 'performance') reportsStore.fetchPerformance(getActiveFilters())
  else if (tab === 'processes') loadProcesses()
  else if (tab === 'tasks') loadTasks()
  else if (tab === 'audit') loadAudit()
  else if (tab === 'sectors') loadSectors()
}

const dashboardData = computed(() => reportsStore.dashboardData)
const performanceData = computed(() => reportsStore.performanceData)

// Colors
const COLORS = {
  primary: '#1e3a8a',
  accent: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#64748b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  palette: ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'],
}

// Status options
const processStatusOptions = [
  { title: 'Em Andamento', value: 'IN_PROGRESS' },
  { title: 'Concluído', value: 'COMPLETED' },
  { title: 'Cancelado', value: 'CANCELLED' },
]
const taskStatusOptions = [
  { title: 'Pendente', value: 'PENDING' },
  { title: 'Em Andamento', value: 'IN_PROGRESS' },
  { title: 'Concluído', value: 'COMPLETED' },
]

// Table Headers
const processHeaders = [
  { title: 'Código', key: 'code', width: '120px' },
  { title: 'Tipo', key: 'processType' },
  { title: 'Status', key: 'status', width: '140px' },
  { title: 'Criado por', key: 'createdByUser' },
  { title: 'Data', key: 'createdAt', width: '110px' },
]
const taskHeaders = [
  { title: 'Processo', key: 'process', width: '110px' },
  { title: 'Etapa', key: 'stepVersion' },
  { title: 'Responsável', key: 'assignedUser' },
  { title: 'Status', key: 'status', width: '130px' },
  { title: 'Tempo', key: 'executionTime', width: '80px' },
  { title: 'Data', key: 'createdAt', width: '100px' },
]
const auditHeaders = [
  { title: 'Data', key: 'createdAt', width: '110px' },
  { title: 'Usuário', key: 'user' },
  { title: 'Ação', key: 'action' },
  { title: 'Recurso', key: 'resource' },
  { title: 'Detalhes', key: 'details' },
]
const sectorHeaders = [
  { title: 'Setor', key: 'sectorName' },
  { title: 'Total', key: 'totalTasks', width: '80px' },
  { title: 'Concluídas', key: 'completedTasks', width: '100px' },
  { title: 'Pendentes', key: 'pendingTasks', width: '100px' },
  { title: 'Tempo Médio', key: 'avgHours', width: '120px' },
  { title: 'Conclusão', key: 'completionRate', width: '160px' },
]
const staleHeaders = [
  { title: 'Código', key: 'code', width: '120px' },
  { title: 'Dias Parado', key: 'daysStopped', width: '120px' },
  { title: 'Etapa Atual', key: 'currentStep' },
  { title: 'Responsável', key: 'responsible' },
]
const efficiencyHeaders = [
  { title: 'Colaborador', key: 'name' },
  { title: 'Tempo Médio', key: 'avgResponseHours', width: '130px' },
  { title: 'Taxa Conclusão', key: 'completionRate', width: '180px' },
  { title: 'Total Tarefas', key: 'total', width: '120px' },
]

// Chart Options
const tooltipStyle = {
  backgroundColor: '#1e293b',
  titleColor: '#f8fafc',
  bodyColor: '#e2e8f0',
  borderColor: '#334155',
  borderWidth: 1,
  cornerRadius: 8,
  padding: 10,
  titleFont: { weight: '600' },
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipStyle },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}

const avgTimeBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { ...tooltipStyle, callbacks: { label: (ctx) => `${ctx.raw}h em média` } },
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0, callback: (v) => `${v}h` }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
}

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: tooltipStyle },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    y: { grid: { display: false } },
  },
}

const stackedBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
    tooltip: tooltipStyle,
  },
  scales: {
    y: { beginAtZero: true, stacked: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { stacked: true, grid: { display: false } },
  },
}

const workloadBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    tooltip: tooltipStyle,
  },
  scales: {
    x: { beginAtZero: true, stacked: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    y: { stacked: true, grid: { display: false } },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    tooltip: tooltipStyle,
  },
}

const areaChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', align: 'end', labels: { usePointStyle: true, padding: 16 } },
    tooltip: tooltipStyle,
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
  elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 6 } },
}

// === Chart Data Computeds ===

const flowChartData = computed(() => {
  if (!dashboardData.value) return null
  const created = dashboardData.value.processesByMonth || []
  const completed = dashboardData.value.completedByMonth || []
  const allMonths = [...new Set([...created.map(c => c.month), ...completed.map(c => c.month)])].sort()
  const createdMap = new Map(created.map(c => [c.month, c.count]))
  const completedMap = new Map(completed.map(c => [c.month, c.count]))
  return {
    labels: allMonths.map(formatMonth),
    datasets: [
      { label: 'Criados', data: allMonths.map(m => createdMap.get(m) || 0), borderColor: COLORS.accent, backgroundColor: 'rgba(59, 130, 246, 0.08)', fill: true, borderWidth: 2 },
      { label: 'Concluídos', data: allMonths.map(m => completedMap.get(m) || 0), borderColor: COLORS.emerald, backgroundColor: 'rgba(16, 185, 129, 0.08)', fill: true, borderWidth: 2 },
    ],
  }
})

const statusChartData = computed(() => {
  if (!dashboardData.value?.byStatus) return null
  const data = dashboardData.value.byStatus
  const colors = { IN_PROGRESS: COLORS.accent, COMPLETED: COLORS.emerald, CANCELLED: COLORS.rose, REJECTED: COLORS.amber, DRAFT: COLORS.slate }
  return {
    labels: data.map(d => translateStatus(d.status)),
    datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => colors[d.status] || COLORS.slate), borderWidth: 0 }],
  }
})

const sectorChartData = computed(() => {
  if (!dashboardData.value?.bySector?.length) return null
  const data = dashboardData.value.bySector.slice(0, 8)
  return {
    labels: data.map(d => d.sectorName),
    datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.accent, borderRadius: 6, barThickness: 24 }],
  }
})

const processTypesChartData = computed(() => {
  if (!dashboardData.value?.topProcessTypes?.length) return null
  const data = dashboardData.value.topProcessTypes
  return {
    labels: data.map(d => d.name),
    datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.palette.slice(0, data.length), borderRadius: 6 }],
  }
})

const processTimelineData = computed(() => {
  if (!reportData.value?.timeline) return null
  const data = reportData.value.timeline
  return {
    labels: data.map(d => formatMonth(d.month)),
    datasets: [{ label: 'Processos', data: data.map(d => d.count), borderColor: COLORS.accent, backgroundColor: 'rgba(59, 130, 246, 0.08)', fill: true, borderWidth: 2 }],
  }
})

const processTypeDistData = computed(() => {
  if (!reportData.value?.byType?.length) return null
  const data = reportData.value.byType
  return {
    labels: data.map(d => d.name),
    datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.palette.slice(0, data.length), borderWidth: 0 }],
  }
})

const executorChartData = computed(() => {
  if (!reportData.value?.byExecutor?.length) return null
  const data = reportData.value.byExecutor.slice(0, 10)
  return {
    labels: data.map(d => d.userName.split(' ')[0]),
    datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.accent, borderRadius: 6 }],
  }
})

const avgTimeChartData = computed(() => {
  if (!reportData.value?.byExecutor?.length) return null
  const data = reportData.value.byExecutor.filter(e => e.avgHours != null).slice(0, 10)
  if (!data.length) return null
  return {
    labels: data.map(d => d.userName.split(' ')[0]),
    datasets: [{ data: data.map(d => d.avgHours), backgroundColor: COLORS.amber, borderRadius: 6 }],
  }
})

const sectorComparisonData = computed(() => {
  if (!sectorsData.value?.data?.length) return null
  const data = sectorsData.value.data
  return {
    labels: data.map(d => d.sectorName),
    datasets: [
      { label: 'Concluídas', data: data.map(d => d.completedTasks), backgroundColor: COLORS.emerald, borderRadius: 4 },
      { label: 'Em Andamento', data: data.map(d => d.inProgressTasks), backgroundColor: COLORS.accent, borderRadius: 4 },
      { label: 'Pendentes', data: data.map(d => d.pendingTasks), backgroundColor: COLORS.amber, borderRadius: 4 },
    ],
  }
})

const auditActionsData = computed(() => {
  if (!reportData.value?.byAction?.length) return null
  const data = reportData.value.byAction.slice(0, 8)
  return {
    labels: data.map(d => d.action),
    datasets: [{ data: data.map(d => d.count), backgroundColor: COLORS.primary, borderRadius: 6, barThickness: 20 }],
  }
})

// Workload chart (performance tab)
const workloadChartData = computed(() => {
  if (!performanceData.value?.workload?.length) return null
  const data = performanceData.value.workload.slice(0, 15)
  return {
    labels: data.map(d => d.name.split(' ')[0]),
    datasets: [
      { label: 'Pendentes', data: data.map(d => d.pending), backgroundColor: COLORS.amber, borderRadius: 4 },
      { label: 'Em Andamento', data: data.map(d => d.inProgress), backgroundColor: COLORS.accent, borderRadius: 4 },
      { label: 'Concluídas', data: data.map(d => d.completed), backgroundColor: COLORS.emerald, borderRadius: 4 },
    ],
  }
})

// === Methods ===

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatMonth(monthStr) {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`
}

function formatAvgTime(hours) {
  if (!hours || hours === 0) return '0h'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

function translateStatus(status) {
  const map = { IN_PROGRESS: 'Em Andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', REJECTED: 'Rejeitado', PENDING: 'Pendente', SIGNED: 'Assinado', DRAFT: 'Rascunho' }
  return map[status] || status || '-'
}

function getStatusColor(status) {
  const map = { IN_PROGRESS: 'info', COMPLETED: 'success', CANCELLED: 'error', REJECTED: 'warning', PENDING: 'grey', SIGNED: 'success', DRAFT: 'grey' }
  return map[status] || 'grey'
}

function formatDetails(details) {
  if (!details) return '-'
  if (typeof details === 'string') return details
  return JSON.stringify(details).slice(0, 80)
}

function getExecutorProgress(count) {
  if (!dashboardData.value?.topExecutors?.length) return 0
  const max = dashboardData.value.topExecutors[0].count
  return max > 0 ? (count / max) * 100 : 0
}

// === Data Loading ===

async function loadProcesses(filters = {}) {
  try { reportData.value = await reportsStore.fetchReport('processes', getActiveFilters(filters)) } catch (e) { window.showSnackbar?.('Erro ao carregar relatório', 'error') }
}
async function loadTasks(filters = {}) {
  try { reportData.value = await reportsStore.fetchReport('tasks', getActiveFilters(filters)) } catch (e) { window.showSnackbar?.('Erro ao carregar relatório', 'error') }
}
async function loadAudit(filters = {}) {
  try { reportData.value = await reportsStore.fetchReport('audit', getActiveFilters(filters)) } catch (e) { window.showSnackbar?.('Erro ao carregar relatório', 'error') }
}
async function loadSectors() {
  try { sectorsData.value = await reportsStore.fetchReport('sectors', getActiveFilters()) } catch (e) { window.showSnackbar?.('Erro ao carregar relatório', 'error') }
}
async function loadPerformance() {
  try { await reportsStore.fetchPerformance(getActiveFilters()) } catch (e) { window.showSnackbar?.('Erro ao carregar dados de performance', 'error') }
}

async function handleExport() {
  const typeMap = { dashboard: 'DASHBOARD', performance: 'PERFORMANCE', processes: 'PROCESSES', tasks: 'TASKS', audit: 'AUDIT', sectors: 'SECTORS' }
  exporting.value = true
  try {
    await reportsStore.exportPdf(typeMap[activeTab.value] || 'PROCESSES', getActiveFilters())
    window.showSnackbar?.('PDF exportado com sucesso!', 'success')
  } catch (e) {
    window.showSnackbar?.(e.message || 'Erro ao exportar PDF', 'error')
  } finally { exporting.value = false }
}

// Tab watcher
watch(activeTab, (tab) => {
  if (!tab) return
  reportData.value = null
  if (tab === 'dashboard') reportsStore.fetchDashboard(getActiveFilters())
  else if (tab === 'performance') loadPerformance()
  else if (tab === 'processes') loadProcesses()
  else if (tab === 'tasks') loadTasks()
  else if (tab === 'audit') loadAudit()
  else if (tab === 'sectors') loadSectors()
})

onMounted(() => {
  // Define a aba inicial baseada nas permissões
  if (availableReports.value.length > 0) {
    activeTab.value = availableReports.value[0]
  }

  // Carrega os dados da aba selecionada
  if (activeTab.value === 'dashboard') {
    reportsStore.fetchDashboard(getActiveFilters())
  } else if (activeTab.value === 'performance') {
    loadPerformance()
  } else if (activeTab.value === 'processes') {
    loadProcesses()
  } else if (activeTab.value === 'tasks') {
    loadTasks()
  } else if (activeTab.value === 'audit') {
    loadAudit()
  } else if (activeTab.value === 'sectors') {
    loadSectors()
  }

  // Carregar setores (usado pelo filtro global e relatório de setores)
  loadSectors()

  if (canManage.value) {
    userStore.fetchUsers()
    sectorStore.fetchSectors()
  }
})
</script>

<style scoped>
.reports-page {
  max-width: 1440px;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
}
.header-content {
  flex: 1;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-neutral-900, #0f172a);
  margin: 0 0 4px 0;
  line-height: 1.3;
}
.page-subtitle {
  font-size: 0.9375rem;
  color: var(--color-neutral-500, #64748b);
  margin: 0;
}
.export-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

/* Tabs */
.tabs-card {
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface, #fff);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

/* No Access Card */
.no-access-card {
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 16px;
  background: var(--color-surface, #fff);
}

.no-access-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.no-access-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-700, #334155);
  margin: 0;
}

.no-access-content p {
  font-size: 0.9375rem;
  max-width: 400px;
  margin-top: 8px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.stat-card__content {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card__icon--primary { background: var(--color-primary-50, #eff6ff); color: var(--color-primary-600, #2563eb); }
.stat-card__icon--success { background: var(--color-success-50, #ecfdf5); color: var(--color-success-600, #059669); }
.stat-card__icon--warning { background: var(--color-warning-50, #fffbeb); color: var(--color-warning-600, #d97706); }
.stat-card__icon--error { background: var(--color-error-50, #fef2f2); color: var(--color-error-600, #dc2626); }
.stat-card__icon--violet { background: #f5f3ff; color: #7c3aed; }

.stat-card__info {
  flex: 1;
  min-width: 0;
}
.stat-card__label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-500, #64748b);
}
.stat-card__value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-neutral-900, #0f172a);
  line-height: 1.2;
  margin-top: 4px;
}
.stat-card__unit {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-500, #64748b);
}
.stat-card__sublabel {
  font-size: 0.75rem;
  color: var(--color-neutral-400, #94a3b8);
  margin-top: 12px;
}
.stat-card__trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.trend--up { background: var(--color-success-50, #ecfdf5); color: var(--color-success-600, #059669); }
.trend--down { background: var(--color-error-50, #fef2f2); color: var(--color-error-600, #dc2626); }
.trend--stable { background: var(--color-neutral-100, #f1f5f9); color: var(--color-neutral-500, #64748b); }

/* Content Grid & Cards */
.content-grid {
  display: flex;
  gap: 20px;
}
.content-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}
.content-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.content-card--wide { flex: 2; }
.content-card--narrow { flex: 1; min-width: 280px; }
.content-card--equal { flex: 1; }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}
.card-header__left {
  display: flex;
  align-items: center;
}
.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800, #1e293b);
}

/* Chart Bodies */
.chart-body {
  padding: 8px 20px 20px;
  height: 260px;
}
.chart-body--sm { height: 200px; }
.chart-body--lg { height: 320px; }
.chart-body--centered {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
  padding: 16px;
}

/* Ranking */
.ranking-list {
  padding: 12px 20px 20px;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-neutral-100, #f1f5f9);
}
.ranking-item:last-child { border-bottom: none; }
.ranking-position {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-500, #64748b);
}
.ranking--1 { background: var(--color-warning-100, #fef3c7); color: var(--color-warning-700, #b45309); }
.ranking--2 { background: var(--color-neutral-200, #e2e8f0); color: var(--color-neutral-600, #475569); }
.ranking--3 { background: #ffedd5; color: #c2410c; }
.ranking-info {
  flex: 1;
  min-width: 0;
}
.ranking-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800, #1e293b);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ranking-value {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-primary-700, #1d4ed8);
}
.empty-ranking {
  padding: 32px;
  text-align: center;
}

/* Mini KPIs */
.mini-kpi-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.mini-kpi {
  flex: 1;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 12px;
  padding: 16px 18px;
  text-align: center;
  transition: all 0.2s ease;
}
.mini-kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.mini-kpi-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-neutral-900, #0f172a);
}
.mini-kpi-label {
  font-size: 0.75rem;
  color: var(--color-neutral-500, #64748b);
  font-weight: 500;
  margin-top: 4px;
}

/* Bottleneck List */
.bottleneck-list {
  padding: 12px 20px 20px;
}
.bottleneck-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-neutral-100, #f1f5f9);
}
.bottleneck-item:last-child { border-bottom: none; }
.bottleneck-info {
  flex: 1;
  min-width: 0;
}
.bottleneck-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-neutral-800, #1e293b);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bottleneck-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}
.bottleneck-time {
  font-size: 0.8125rem;
  color: var(--color-warning-600, #d97706);
  font-weight: 600;
}
.bottleneck-count {
  font-size: 0.8125rem;
  color: var(--color-neutral-400, #94a3b8);
}
.bottleneck-bar-container {
  width: 120px;
  height: 8px;
  background: var(--color-neutral-100, #f1f5f9);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.bottleneck-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-warning-500, #f59e0b), var(--color-error-500, #ef4444));
  border-radius: 4px;
  transition: width 0.6s ease;
}
.bottleneck-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-neutral-600, #475569);
  width: 44px;
  text-align: right;
  flex-shrink: 0;
}

/* Global Filters */
.global-filters-card {
  border: 1px solid var(--color-primary-100, #dbeafe);
  border-radius: 12px;
  background: var(--color-primary-50, #eff6ff);
}
.filter-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-700, #1d4ed8);
  white-space: nowrap;
}

/* Filter card */
.filter-card {
  border: 1px solid var(--color-surface-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-surface, #fff);
}

/* Table */
.report-table {
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}
.execution-time {
  font-weight: 600;
  color: var(--color-primary-700, #1d4ed8);
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1024px) {
  .content-grid { flex-direction: column; }
  .content-card--wide, .content-card--narrow { flex: none; }
  .bottleneck-bar-container { width: 80px; }
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: 1fr; }
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  .mini-kpi-row { flex-wrap: wrap; }
  .bottleneck-item { flex-wrap: wrap; }
  .bottleneck-bar-container { width: 100%; order: 3; }
}
</style>
