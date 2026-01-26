export const SCREEN_CATALOG = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'mdi-view-dashboard',
    actions: [
      { id: 'view', label: 'Visualizar' },
    ],
  },
  {
    id: 'processes',
    label: 'Processos',
    icon: 'mdi-clipboard-text',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'create', label: 'Criar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'tasks',
    label: 'Tarefas',
    icon: 'mdi-clipboard-check',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'execute', label: 'Executar' },
    ],
  },
  {
    id: 'process_types',
    label: 'Tipos de Processo',
    icon: 'mdi-file-cog',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'profiles',
    label: 'Perfis',
    icon: 'mdi-badge-account',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: 'mdi-account-group',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'sectors',
    label: 'Setores',
    icon: 'mdi-office-building',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'companies',
    label: 'Empresas',
    icon: 'mdi-domain',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'manage', label: 'Gerenciar' },
    ],
  },
  {
    id: 'signatures',
    label: 'Assinaturas',
    icon: 'mdi-draw-pen',
    actions: [
      { id: 'view', label: 'Visualizar' },
      { id: 'sign', label: 'Assinar' },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: 'mdi-chart-bar',
    actions: [
      { id: 'view', label: 'Acesso básico (apenas seu setor)' },
      { id: 'manage', label: 'Acesso completo (todos os setores)' },
      { id: 'export', label: 'Exportar PDF' },
    ],
    reportTypes: [
      { id: 'dashboard', label: 'Visão Geral', icon: 'mdi-view-dashboard-variant' },
      { id: 'performance', label: 'Performance', icon: 'mdi-chart-timeline-variant-shimmer' },
      { id: 'processes', label: 'Processos', icon: 'mdi-file-document-multiple' },
      { id: 'tasks', label: 'Produtividade', icon: 'mdi-account-check' },
      { id: 'sectors', label: 'Setores', icon: 'mdi-office-building' },
      { id: 'audit', label: 'Auditoria', icon: 'mdi-shield-check' },
    ],
  },
]
