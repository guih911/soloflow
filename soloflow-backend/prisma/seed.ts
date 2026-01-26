import { PrismaClient, FieldType, StepType, AssignmentType, UserRole, DynamicRole, ChildProcessMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ============================================================================
// HELPER: Função para criar Tipos de Processo de forma otimizada
// ============================================================================
async function createProcessType(
  companyId: string,
  name: string,
  description: string,
  options: {
    isChildOnly?: boolean;
    allowedChildTypes?: string[];
    fields: any[];
    steps: any[];
  }
) {
  // 1. Cria o Tipo
  const processType = await prisma.processType.create({
    data: {
      id: uuidv4(),
      name,
      description,
      companyId,
      isChildProcessOnly: options.isChildOnly || false,
      allowSubProcesses: true,
      allowSubTasks: true,
      allowedChildProcessTypes: options.allowedChildTypes ? JSON.stringify(options.allowedChildTypes) : undefined,
      isActive: true,
    },
  });

  // 2. Cria a Versão 1.0 (Publicada)
  const version = await prisma.processTypeVersion.create({
    data: {
      id: uuidv4(),
      processTypeId: processType.id,
      version: 1,
      versionLabel: 'v1.0 - Inicial',
      description: `Versão inicial do processo ${name}`,
      isDraft: false,
      isActive: true,
      publishedAt: new Date(),
    },
  });

  // 3. Cria os Campos do Formulário
  for (const [index, field] of options.fields.entries()) {
    await prisma.formFieldVersion.create({
      data: {
        id: uuidv4(),
        processTypeVersionId: version.id,
        order: index + 1,
        ...field,
      },
    });
  }

  // 4. Cria as Etapas e Atribuições
  for (const [index, step] of options.steps.entries()) {
    const stepVersion = await prisma.stepVersion.create({
      data: {
        id: uuidv4(),
        processTypeVersionId: version.id,
        order: index + 1,
        name: step.name,
        type: step.type,
        description: step.description,
        instructions: step.instructions,
        slaHours: step.slaHours,
        allowAttachment: step.allowAttachment ?? false,
        requiresSignature: step.requiresSignature ?? false,
        assignedToCreator: step.assignedToCreator ?? false,
        conditions: step.conditions,
      },
    });

    // Cria as atribuições (Assignments)
    if (step.assignments && step.assignments.length > 0) {
      for (const assignment of step.assignments) {
        await prisma.stepAssignment.create({
          data: {
            id: uuidv4(),
            stepVersionId: stepVersion.id,
            type: assignment.type,
            sectorId: assignment.sectorId,
            userId: assignment.userId,
            dynamicRole: assignment.role,
            priority: 1,
          },
        });
      }
    }
  }

  return processType;
}

async function main() {
  console.log('🚀 Iniciando Seed SoloFlow Enterprise - Otimizado BPM...');

  // ============================================================================
  // 1. LIMPEZA TOTAL
  // ============================================================================
  console.log('🗑️  Limpando banco de dados...');
  try {
    await prisma.auditLog.deleteMany({});
    await prisma.childProcessInstance.deleteMany({});
    await prisma.childProcessConfig.deleteMany({});
    await prisma.signatureRecord.deleteMany({});
    await prisma.signatureRequirement.deleteMany({});
    await prisma.subTask.deleteMany({});
    await prisma.subTaskTemplate.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.stepExecution.deleteMany({});
    await prisma.processInstance.deleteMany({});
    await prisma.stepAssignment.deleteMany({});
    await prisma.stepVersion.deleteMany({});
    await prisma.formFieldVersion.deleteMany({});
    await prisma.processTypeVersion.deleteMany({});
    await prisma.processType.deleteMany({});
    await prisma.user_profiles.deleteMany({});
    await prisma.profile_permissions.deleteMany({});
    await prisma.profile_process_types.deleteMany({});
    await prisma.profiles.deleteMany({});
    await prisma.userCompany.deleteMany({});
    await prisma.sector.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  } catch (error) {
    console.warn('⚠️  Aviso na limpeza:', error);
  }

  // ============================================================================
  // 2. EMPRESA PRINCIPAL
  // ============================================================================
  console.log('🏢 Criando Empresa...');
  
  const company = await prisma.company.create({
    data: {
      id: uuidv4(),
      name: 'SoloFlow Sistemas',
      cnpj: '12.345.678/0001-90',
      email: 'contato@soloflow.com.br',
      phone: '(62) 3000-0000',
      isActive: true,
    },
  });

  // ============================================================================
  // 3. SETORES
  // ============================================================================
  console.log('🏗️  Criando Setores...');
  
  const sectorsData = [
    'Diretoria',
    'Administrativo',
    'Financeiro',
    'Compras',
    'Recursos Humanos',
    'Tecnologia da Informação',
    'Jurídico',
    'Operacional',
  ];

  const sectorsMap: Record<string, string> = {};
  
  for (const name of sectorsData) {
    const sector = await prisma.sector.create({
      data: {
        id: uuidv4(),
        name,
        description: `Setor de ${name}`,
        companyId: company.id,
        isActive: true,
      },
    });
    sectorsMap[name] = sector.id;
  }

  // ============================================================================
  // 4. PERFIS E PERMISSÕES COMPLETAS
  // ============================================================================
  console.log('🛡️  Criando Perfis e Permissões...');

  const profilesData = [
    { name: 'Super Admin', desc: 'Perfil com acesso total ao sistema' },
    { name: 'Analista', desc: 'Perfil para análise e execução de processos' },
    { name: 'Coordenação', desc: 'Perfil para coordenação e gestão de processos' },
  ];

  // Permissões diferenciadas por perfil
  const superAdminPermissions = [
    { resource: '*', action: '*' }, // Wildcard - acesso total
    { resource: 'dashboard', action: 'view' },
    { resource: 'processes', action: 'view' },
    { resource: 'processes', action: 'create' },
    { resource: 'processes', action: 'edit' },
    { resource: 'processes', action: 'delete' },
    { resource: 'processes', action: 'manage' },
    { resource: 'tasks', action: 'view' },
    { resource: 'tasks', action: 'execute' },
    { resource: 'tasks', action: 'reassign' },
    { resource: 'users', action: 'view' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'edit' },
    { resource: 'users', action: 'delete' },
    { resource: 'users', action: 'manage' },
    { resource: 'profiles', action: 'view' },
    { resource: 'profiles', action: 'manage' },
    { resource: 'process_types', action: 'view' },
    { resource: 'process_types', action: 'create' },
    { resource: 'process_types', action: 'edit' },
    { resource: 'process_types', action: 'delete' },
    { resource: 'process_types', action: 'publish' },
    { resource: 'process_types', action: 'manage' },
    { resource: 'companies', action: 'view' },
    { resource: 'companies', action: 'create' },
    { resource: 'companies', action: 'edit' },
    { resource: 'companies', action: 'delete' },
    { resource: 'companies', action: 'manage' },
    { resource: 'sectors', action: 'view' },
    { resource: 'sectors', action: 'create' },
    { resource: 'sectors', action: 'edit' },
    { resource: 'sectors', action: 'delete' },
    { resource: 'sectors', action: 'manage' },
    { resource: 'settings', action: 'manage' },
    { resource: 'audit', action: 'view' },
    { resource: 'reports', action: 'view' },
    { resource: 'reports', action: 'export' },
    { resource: 'signatures', action: 'view' },
    { resource: 'signatures', action: 'sign' },
  ];

  const coordenacaoPermissions = [
    { resource: 'dashboard', action: 'view' },
    { resource: 'processes', action: 'view' },
    { resource: 'processes', action: 'create' },
    { resource: 'processes', action: 'edit' },
    { resource: 'processes', action: 'delete' },
    { resource: 'processes', action: 'manage' },
    { resource: 'tasks', action: 'view' },
    { resource: 'tasks', action: 'execute' },
    { resource: 'tasks', action: 'reassign' },
    { resource: 'users', action: 'view' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'edit' },
    { resource: 'profiles', action: 'view' },
    { resource: 'process_types', action: 'view' },
    { resource: 'process_types', action: 'create' },
    { resource: 'process_types', action: 'edit' },
    { resource: 'process_types', action: 'manage' },
    { resource: 'sectors', action: 'view' },
    { resource: 'audit', action: 'view' },
    { resource: 'reports', action: 'view' },
    { resource: 'reports', action: 'export' },
    { resource: 'signatures', action: 'view' },
    { resource: 'signatures', action: 'sign' },
    { resource: 'settings', action: 'manage' },
  ];

  const analistaPermissions = [
    { resource: 'dashboard', action: 'view' },
    { resource: 'processes', action: 'view' },
    { resource: 'processes', action: 'create' },
    { resource: 'tasks', action: 'view' },
    { resource: 'tasks', action: 'execute' },
    { resource: 'users', action: 'view' },
    { resource: 'sectors', action: 'view' },
    { resource: 'reports', action: 'view' },
    { resource: 'signatures', action: 'view' },
    { resource: 'signatures', action: 'sign' },
  ];

  const permissionsByProfile: Record<string, typeof superAdminPermissions> = {
    'Super Admin': superAdminPermissions,
    'Coordenação': coordenacaoPermissions,
    'Analista': analistaPermissions,
  };

  const profilesMap: Record<string, string> = {};

  for (const pData of profilesData) {
    const profile = await prisma.profiles.create({
      data: {
        id: uuidv4(),
        name: pData.name,
        description: pData.desc,
        companyId: company.id,
        isActive: true,
        updatedAt: new Date(),
      },
    });
    profilesMap[pData.name] = profile.id;

    const perms = permissionsByProfile[pData.name] || analistaPermissions;
    for (const perm of perms) {
      await prisma.profile_permissions.create({
        data: {
          id: uuidv4(),
          profileId: profile.id,
          resource: perm.resource,
          action: perm.action,
        },
      });
    }
  }

  console.log(`   -> ✅ ${profilesData.length} perfis criados com permissões diferenciadas`);

  // ============================================================================
  // 5. USUÁRIO ADMIN
  // ============================================================================
  console.log('👥 Criando Usuário Admin...');
  
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Administrador do Sistema',
      email: 'admin@soloflow.com.br',
      password: passwordHash,
      isActive: true,
      cpf: '000.000.000-00',
    },
  });

  // Vincula Admin à empresa
  await prisma.userCompany.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      sectorId: sectorsMap['Diretoria'],
      role: UserRole.ADMIN,
      isDefault: true,
    },
  });

  // Atribui TODOS os 3 perfis ao admin
  for (const profileName of ['Super Admin', 'Analista', 'Coordenação']) {
    await prisma.user_profiles.create({
      data: {
        id: uuidv4(),
        userId: admin.id,
        companyId: company.id,
        profileId: profilesMap[profileName],
      },
    });
  }

  // ============================================================================
  // 5.1 USUÁRIOS POR SETOR
  // ============================================================================
  console.log('👥 Criando Usuários por Setor...');

  const userPassword = await bcrypt.hash('123456', 10);

  const sectorUsersData = [
    { name: 'Carlos Diretor', email: 'carlos@soloflow.com.br', sector: 'Diretoria', cpf: '111.111.111-11' },
    { name: 'Ana Administrativa', email: 'ana@soloflow.com.br', sector: 'Administrativo', cpf: '222.222.222-22' },
    { name: 'Roberto Financeiro', email: 'roberto@soloflow.com.br', sector: 'Financeiro', cpf: '333.333.333-33' },
    { name: 'Juliana Compras', email: 'juliana@soloflow.com.br', sector: 'Compras', cpf: '444.444.444-44' },
    { name: 'Fernanda RH', email: 'fernanda@soloflow.com.br', sector: 'Recursos Humanos', cpf: '555.555.555-55' },
    { name: 'Lucas TI', email: 'lucas@soloflow.com.br', sector: 'Tecnologia da Informação', cpf: '666.666.666-66' },
    { name: 'Marcos Jurídico', email: 'marcos@soloflow.com.br', sector: 'Jurídico', cpf: '777.777.777-77' },
    { name: 'Patricia Operacional', email: 'patricia@soloflow.com.br', sector: 'Operacional', cpf: '888.888.888-88' },
  ];

  const usersMap: Record<string, string> = {};

  for (const userData of sectorUsersData) {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: userData.name,
        email: userData.email,
        password: userPassword,
        isActive: true,
        cpf: userData.cpf,
      },
    });

    usersMap[userData.sector] = user.id;

    // Vincula à empresa no setor correspondente
    await prisma.userCompany.create({
      data: {
        userId: user.id,
        companyId: company.id,
        sectorId: sectorsMap[userData.sector],
        role: UserRole.USER,
        isDefault: true,
      },
    });

    // Atribui perfil Analista
    await prisma.user_profiles.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        companyId: company.id,
        profileId: profilesMap['Analista'],
      },
    });
  }

  console.log(`   -> ✅ ${sectorUsersData.length} usuários criados (1 por setor)`);

  // ============================================================================
  // 6. PROCESSOS PRINCIPAIS - OTIMIZADOS BPM
  // ============================================================================
  console.log('📋 Criando Processos Principais...');

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 1: CHAMADOS TI
  // ═══════════════════════════════════════════════════════════════════════════
  const chamadosTI = await createProcessType(
    company.id,
    'Chamados TI',
    'Processo para abertura e resolução de chamados de TI',
    {
      fields: [
        {
          name: 'categoria',
          label: 'Categoria',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Hardware', 'Software', 'Rede/Internet', 'E-mail', 'Acesso/Senha', 'Impressora', 'Telefonia', 'Outro']),
        },
        {
          name: 'prioridade',
          label: 'Prioridade',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Baixa', 'Média', 'Alta', 'Crítica']),
        },
        {
          name: 'titulo',
          label: 'Título do Chamado',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'descricao_problema',
          label: 'Descrição Detalhada do Problema',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'equipamento_patrimonio',
          label: 'Equipamento/Patrimônio (se aplicável)',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'local',
          label: 'Localização/Sala',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'impacto',
          label: 'Impacto no Trabalho',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Não consigo trabalhar', 'Trabalho prejudicado', 'Trabalho parcialmente afetado', 'Sem impacto imediato']),
        },
      ],
      steps: [
        {
          name: 'Triagem e Classificação',
          type: StepType.INPUT,
          description: 'TI analisa e classifica o chamado',
          instructions: 'Verificar prioridade real, categoria e direcionar para técnico responsável',
          slaHours: 2,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Tecnologia da Informação'] }],
          conditions: {
            fields: [
              { name: 'prioridade_reclassificada', label: 'Prioridade Ajustada', type: 'DROPDOWN', options: ['Baixa', 'Média', 'Alta', 'Crítica'], required: true },
              { name: 'tecnico_responsavel', label: 'Técnico Responsável', type: 'TEXT', required: true },
              { name: 'previsao_atendimento', label: 'Previsão de Atendimento', type: 'DATE', required: false },
              { name: 'observacoes_triagem', label: 'Observações da Triagem', type: 'TEXTAREA', required: false },
            ]
          },
        },
        {
          name: 'Resolução Técnica',
          type: StepType.INPUT,
          description: 'Técnico executa a solução',
          instructions: 'Resolver o problema e documentar detalhadamente a solução aplicada',
          slaHours: 24,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Tecnologia da Informação'] }],
          conditions: {
            fields: [
              { name: 'diagnostico', label: 'Diagnóstico do Problema', type: 'TEXTAREA', required: true },
              { name: 'solucao_aplicada', label: 'Solução Aplicada', type: 'TEXTAREA', required: true },
              { name: 'tipo_solucao', label: 'Tipo de Solução', type: 'DROPDOWN', options: ['Remota', 'Presencial', 'Telefone', 'Substituição Equipamento'], required: true },
              { name: 'tempo_resolucao', label: 'Tempo de Resolução (minutos)', type: 'NUMBER', required: false },
              { name: 'necessita_acompanhamento', label: 'Necessita Acompanhamento?', type: 'DROPDOWN', options: ['Não', 'Sim'], required: true },
              { name: 'recomendacoes', label: 'Recomendações ao Usuário', type: 'TEXTAREA', required: false },
            ]
          },
        },
        {
          name: 'Validação do Solicitante',
          type: StepType.APPROVAL,
          description: 'Solicitante confirma resolução',
          instructions: 'Confirmar se o problema foi resolvido satisfatoriamente',
          slaHours: 8,
          assignedToCreator: true,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.PROCESS_CREATOR }],
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 2: SOLICITAÇÃO DE COMPRAS
  // ═══════════════════════════════════════════════════════════════════════════
  const solicitacaoCompras = await createProcessType(
    company.id,
    'Solicitação de Compras',
    'Processo para solicitação e aprovação de compras de materiais e serviços',
    {
      allowedChildTypes: ['Pagamento de Serviço'],
      fields: [
        {
          name: 'centro_custo',
          label: 'Centro de Custo',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'tipo_compra',
          label: 'Tipo de Compra',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Material de Escritório', 'Equipamento', 'Serviço', 'Software', 'Outros']),
        },
        {
          name: 'itens',
          label: 'Itens da Solicitação',
          type: FieldType.TABLE,
          required: true,
          tableColumns: JSON.stringify([
            { name: 'descricao', label: 'Descrição do Item', type: 'text' },
            { name: 'especificacao', label: 'Especificação Técnica', type: 'text' },
            { name: 'quantidade', label: 'Qtd', type: 'number' },
            { name: 'valor_estimado', label: 'Valor Unit. Estimado', type: 'currency' },
          ]),
          minRows: 1,
        },
        {
          name: 'justificativa',
          label: 'Justificativa da Compra',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'data_necessidade',
          label: 'Data de Necessidade',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'urgente',
          label: 'Compra Urgente?',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Não', 'Sim']),
        },
      ],
      steps: [
        {
          name: 'Aprovação Gestor',
          type: StepType.APPROVAL,
          description: 'Gestor aprova a necessidade',
          instructions: 'Verificar justificativa, necessidade e urgência da compra',
          slaHours: 24,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.SECTOR_MANAGER }],
        },
        {
          name: 'Cotação de Fornecedores',
          type: StepType.INPUT,
          description: 'Compras realiza cotação com no mínimo 3 fornecedores',
          instructions: 'Solicitar no mínimo 3 cotações, anexar propostas e selecionar melhor opção',
          slaHours: 72,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Compras'] }],
          conditions: {
            fields: [
              { 
                name: 'fornecedores_cotacao', 
                label: 'Cotações Realizadas', 
                type: 'TABLE', 
                required: true,
                tableColumns: [
                  { name: 'fornecedor', label: 'Fornecedor', type: 'TEXT' },
                  { name: 'cnpj', label: 'CNPJ', type: 'CNPJ' },
                  { name: 'valor_total', label: 'Valor Total', type: 'CURRENCY' },
                  { name: 'prazo_entrega', label: 'Prazo Entrega (dias)', type: 'NUMBER' },
                  { name: 'condicao_pagamento', label: 'Condição Pagto', type: 'TEXT' },
                ]
              },
              { name: 'fornecedor_selecionado', label: 'Fornecedor Selecionado', type: 'TEXT', required: true },
              { name: 'cnpj_selecionado', label: 'CNPJ', type: 'CNPJ', required: true },
              { name: 'valor_total_cotacao', label: 'Valor Total da Cotação', type: 'CURRENCY', required: true },
              { name: 'justificativa_selecao', label: 'Justificativa da Seleção', type: 'TEXTAREA', required: true },
            ]
          },
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova valores e condições',
          instructions: 'Verificar disponibilidade orçamentária, analisar condições e aprovar',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Emissão de Pedido',
          type: StepType.INPUT,
          description: 'Compras emite pedido ao fornecedor',
          instructions: 'Gerar pedido de compra, enviar ao fornecedor e agendar recebimento',
          slaHours: 24,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Compras'] }],
          conditions: {
            fields: [
              { name: 'numero_pedido', label: 'Número do Pedido de Compra', type: 'TEXT', required: true },
              { name: 'data_pedido', label: 'Data do Pedido', type: 'DATE', required: true },
              { name: 'previsao_entrega', label: 'Previsão de Entrega', type: 'DATE', required: true },
              { name: 'condicao_pagamento_final', label: 'Condição de Pagamento', type: 'TEXT', required: true },
              { name: 'observacoes_pedido', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 3: CONTRATAÇÃO DE SERVIÇO
  // ═══════════════════════════════════════════════════════════════════════════
  const contratacaoServico = await createProcessType(
    company.id,
    'Contratação de Serviço',
    'Processo para contratação de serviços terceirizados',
    {
      allowedChildTypes: ['Pagamento de Serviço', 'Aditivo de Contrato'],
      fields: [
        {
          name: 'tipo_servico',
          label: 'Tipo de Serviço',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Consultoria', 'Manutenção', 'Treinamento', 'Desenvolvimento', 'Limpeza', 'Segurança', 'Outros']),
        },
        {
          name: 'descricao_servico',
          label: 'Descrição Detalhada do Serviço',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'escopo_trabalho',
          label: 'Escopo de Trabalho',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'prazo_estimado',
          label: 'Prazo Estimado (meses)',
          type: FieldType.NUMBER,
          required: true,
        },
        {
          name: 'valor_estimado',
          label: 'Valor Estimado',
          type: FieldType.CURRENCY,
          required: false,
        },
        {
          name: 'data_inicio_desejada',
          label: 'Data de Início Desejada',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'justificativa',
          label: 'Justificativa da Contratação',
          type: FieldType.TEXTAREA,
          required: true,
        },
      ],
      steps: [
        {
          name: 'Aprovação Gestor',
          type: StepType.APPROVAL,
          description: 'Gestor aprova necessidade do serviço',
          instructions: 'Verificar justificativa e necessidade da contratação',
          slaHours: 24,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.SECTOR_MANAGER }],
        },
        {
          name: 'Cotação de Fornecedores',
          type: StepType.INPUT,
          description: 'Compras realiza cotação com no mínimo 3 fornecedores',
          instructions: 'Buscar no mínimo 3 cotações, anexar propostas e selecionar melhor custo-benefício',
          slaHours: 120,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Compras'] }],
          conditions: {
            fields: [
              { 
                name: 'propostas_recebidas', 
                label: 'Propostas Recebidas', 
                type: 'TABLE', 
                required: true,
                tableColumns: [
                  { name: 'fornecedor', label: 'Fornecedor', type: 'TEXT' },
                  { name: 'cnpj', label: 'CNPJ', type: 'CNPJ' },
                  { name: 'valor_proposto', label: 'Valor Total', type: 'CURRENCY' },
                  { name: 'prazo_proposto', label: 'Prazo (meses)', type: 'NUMBER' },
                  { name: 'forma_pagamento', label: 'Forma Pagto', type: 'TEXT' },
                ]
              },
              { name: 'fornecedor_selecionado', label: 'Fornecedor Selecionado', type: 'TEXT', required: true },
              { name: 'cnpj_fornecedor_selecionado', label: 'CNPJ do Fornecedor', type: 'CNPJ', required: true },
              { name: 'valor_final', label: 'Valor Total do Contrato', type: 'CURRENCY', required: true },
              { name: 'valor_mensal', label: 'Valor Mensal', type: 'CURRENCY', required: false },
              { name: 'justificativa_selecao', label: 'Justificativa da Seleção', type: 'TEXTAREA', required: true },
            ]
          },
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova valores e condições',
          instructions: 'Verificar orçamento disponível e condições de pagamento',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Elaboração Contrato',
          type: StepType.INPUT,
          description: 'Jurídico elabora contrato',
          instructions: 'Elaborar minuta de contrato conforme proposta aprovada',
          slaHours: 72,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Jurídico'] }],
          conditions: {
            fields: [
              { name: 'numero_contrato', label: 'Número do Contrato', type: 'TEXT', required: true },
              { name: 'prazo_final', label: 'Prazo Final (meses)', type: 'NUMBER', required: true },
              { name: 'data_inicio', label: 'Data de Início', type: 'DATE', required: true },
              { name: 'data_termino', label: 'Data de Término', type: 'DATE', required: true },
              { name: 'forma_pagamento', label: 'Forma de Pagamento', type: 'DROPDOWN', options: ['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Único'], required: true },
              { name: 'clausulas_especiais', label: 'Cláusulas Especiais', type: 'TEXTAREA', required: false },
              { name: 'garantias_multas', label: 'Garantias e Multas', type: 'TEXTAREA', required: false },
              { name: 'parecer_juridico', label: 'Parecer Jurídico', type: 'TEXTAREA', required: true },
            ]
          },
        },
        {
          name: 'Aprovação Diretoria',
          type: StepType.APPROVAL,
          description: 'Diretoria aprova contratação',
          instructions: 'Aprovar contratação e autorizar assinatura',
          slaHours: 48,
          requiresSignature: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Diretoria'] }],
        },
        {
          name: 'Formalização e Assinatura',
          type: StepType.INPUT,
          description: 'Administrativo formaliza contrato',
          instructions: 'Coletar assinaturas, arquivar contrato e registrar no sistema',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Administrativo'] }],
          conditions: {
            fields: [
              { name: 'data_assinatura', label: 'Data da Assinatura', type: 'DATE', required: true },
              { name: 'numero_protocolo', label: 'Número de Protocolo', type: 'TEXT', required: true },
              { name: 'local_arquivo', label: 'Local de Arquivamento', type: 'TEXT', required: true },
              { name: 'contato_fornecedor', label: 'Contato do Fornecedor', type: 'TEXT', required: true },
              { name: 'observacoes_formalizacao', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 4: PAGAMENTO DE SERVIÇOS (SUBPROCESSO)
  // ═══════════════════════════════════════════════════════════════════════════
  const pagamentoServico = await createProcessType(
    company.id,
    'Pagamento de Serviço',
    'Subprocesso para pagamento de serviços contratados',
    {
      isChildOnly: true,
      fields: [
        {
          name: 'fornecedor',
          label: 'Fornecedor',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'numero_nota',
          label: 'Número da Nota Fiscal',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'data_emissao',
          label: 'Data de Emissão',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'valor',
          label: 'Valor',
          type: FieldType.CURRENCY,
          required: true,
        },
        {
          name: 'data_vencimento',
          label: 'Data de Vencimento',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'mes_referencia',
          label: 'Mês de Referência',
          type: FieldType.TEXT,
          required: false,
          helpText: 'Ex: Janeiro/2026',
        },
        {
          name: 'servico_executado',
          label: 'Serviço Foi Executado?',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Sim', 'Não']),
        },
        {
          name: 'descricao',
          label: 'Descrição/Observações',
          type: FieldType.TEXTAREA,
          required: false,
        },
      ],
      steps: [
        {
          name: 'Conferência de Nota Fiscal',
          type: StepType.INPUT,
          description: 'Administrativo confere NF e anexa documentos',
          instructions: 'Conferir dados da NF e anexar documentação fiscal',
          slaHours: 24,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Administrativo'] }],
          conditions: {
            fields: [
              { name: 'dados_conferidos', label: 'Dados Conferidos', type: 'DROPDOWN', options: ['Correto', 'Com Divergência'], required: true },
              { name: 'observacoes_conferencia', label: 'Observações da Conferência', type: 'TEXTAREA', required: false },
              { name: 'impostos_retidos', label: 'Impostos Retidos', type: 'CURRENCY', required: false },
            ]
          },
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova pagamento',
          instructions: 'Verificar disponibilidade financeira e aprovar',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Pagamento',
          type: StepType.INPUT,
          description: 'Financeiro realiza pagamento',
          instructions: 'Efetuar transferência bancária e anexar comprovante',
          slaHours: 24,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
          conditions: {
            fields: [
              { name: 'data_pagamento', label: 'Data do Pagamento', type: 'DATE', required: true },
              { name: 'valor_pago', label: 'Valor Pago', type: 'CURRENCY', required: true },
              { name: 'numero_transacao', label: 'Número da Transação', type: 'TEXT', required: true },
              { name: 'banco', label: 'Banco', type: 'TEXT', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 5: SOLICITAÇÃO DE CONTRATAÇÃO DE PESSOA
  // ═══════════════════════════════════════════════════════════════════════════
  const contratacaoPessoa = await createProcessType(
    company.id,
    'Solicitação de Contratação de Pessoa',
    'Processo para abertura de vaga e contratação de novo colaborador',
    {
      fields: [
        {
          name: 'cargo',
          label: 'Cargo',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'setor',
          label: 'Setor',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'tipo_contratacao',
          label: 'Tipo de Contratação',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['CLT', 'PJ', 'Estágio', 'Temporário']),
        },
        {
          name: 'salario',
          label: 'Salário/Remuneração',
          type: FieldType.CURRENCY,
          required: true,
        },
        {
          name: 'jornada',
          label: 'Jornada de Trabalho',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'requisitos',
          label: 'Requisitos e Qualificações',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'atribuicoes',
          label: 'Principais Atribuições',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'justificativa',
          label: 'Justificativa da Contratação',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'data_inicio',
          label: 'Data de Início Prevista',
          type: FieldType.DATE,
          required: true,
        },
      ],
      steps: [
        {
          name: 'Aprovação RH',
          type: StepType.APPROVAL,
          description: 'RH valida requisitos e adequação',
          instructions: 'Verificar adequação de cargo, salário e requisitos',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova orçamento',
          instructions: 'Verificar disponibilidade orçamentária para contratação',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Aprovação Diretoria',
          type: StepType.APPROVAL,
          description: 'Diretoria aprova contratação',
          instructions: 'Aprovar abertura de vaga',
          slaHours: 72,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Diretoria'] }],
        },
        {
          name: 'Recrutamento e Seleção',
          type: StepType.INPUT,
          description: 'RH realiza processo seletivo',
          instructions: 'Divulgar vaga, realizar entrevistas e selecionar candidato',
          slaHours: 240,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'total_curriculos', label: 'Total de Currículos Recebidos', type: 'NUMBER', required: false },
              { name: 'total_entrevistados', label: 'Total de Candidatos Entrevistados', type: 'NUMBER', required: false },
              { name: 'canais_divulgacao', label: 'Canais de Divulgação Utilizados', type: 'TEXT', required: false },
              { name: 'candidato_selecionado', label: 'Nome do Candidato Selecionado', type: 'TEXT', required: true },
              { name: 'resumo_perfil', label: 'Resumo do Perfil do Candidato', type: 'TEXTAREA', required: true },
              { name: 'avaliacao_tecnica', label: 'Avaliação Técnica', type: 'DROPDOWN', options: ['Excelente', 'Bom', 'Regular'], required: true },
              { name: 'pretensao_salarial', label: 'Pretensão Salarial do Candidato', type: 'CURRENCY', required: false },
            ]
          },
        },
        {
          name: 'Aprovação do Candidato',
          type: StepType.APPROVAL,
          description: 'Gestor aprova candidato selecionado',
          instructions: 'Revisar perfil do candidato e aprovar contratação',
          slaHours: 48,
          assignedToCreator: true,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.PROCESS_CREATOR }],
        },
        {
          name: 'Admissão',
          type: StepType.INPUT,
          description: 'RH formaliza admissão',
          instructions: 'Coletar documentação completa, registrar dados e realizar integração',
          slaHours: 72,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'nome_completo', label: 'Nome Completo', type: 'TEXT', required: true },
              { name: 'cpf_colaborador', label: 'CPF', type: 'CPF', required: true },
              { name: 'data_nascimento', label: 'Data de Nascimento', type: 'DATE', required: true },
              { name: 'email_colaborador', label: 'E-mail', type: 'EMAIL', required: true },
              { name: 'telefone_colaborador', label: 'Telefone', type: 'PHONE', required: true },
              { name: 'data_admissao', label: 'Data de Admissão', type: 'DATE', required: true },
              { name: 'numero_ctps', label: 'Número da CTPS', type: 'TEXT', required: true },
              { name: 'numero_pis', label: 'Número do PIS/PASEP', type: 'TEXT', required: false },
              { name: 'salario_contratado', label: 'Salário Contratado', type: 'CURRENCY', required: true },
              { name: 'exame_admissional', label: 'Exame Admissional Realizado', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'documentacao_completa', label: 'Documentação Completa', type: 'DROPDOWN', options: ['Sim', 'Pendente'], required: true },
              { name: 'observacoes_admissao', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 6: DESLIGAMENTO DE COLABORADOR
  // ═══════════════════════════════════════════════════════════════════════════
  const desligamentoColaborador = await createProcessType(
    company.id,
    'Desligamento de Colaborador',
    'Processo para desligamento de colaborador',
    {
      fields: [
        {
          name: 'colaborador',
          label: 'Nome do Colaborador',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'cpf',
          label: 'CPF',
          type: FieldType.CPF,
          required: true,
        },
        {
          name: 'matricula',
          label: 'Matrícula',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'cargo',
          label: 'Cargo',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'setor',
          label: 'Setor',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'data_admissao',
          label: 'Data de Admissão',
          type: FieldType.DATE,
          required: false,
        },
        {
          name: 'tipo_desligamento',
          label: 'Tipo de Desligamento',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Demissão sem justa causa', 'Demissão com justa causa', 'Pedido de demissão', 'Término de contrato']),
        },
        {
          name: 'data_desligamento',
          label: 'Data do Desligamento',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'motivo',
          label: 'Motivo do Desligamento',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'aviso_previo',
          label: 'Cumprirá Aviso Prévio?',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Sim - Trabalhado', 'Sim - Indenizado', 'Não se aplica']),
        },
      ],
      steps: [
        {
          name: 'Aprovação RH',
          type: StepType.APPROVAL,
          description: 'RH valida informações',
          instructions: 'Verificar dados e procedimentos legais aplicáveis',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
        },
        {
          name: 'Aprovação Diretoria',
          type: StepType.APPROVAL,
          description: 'Diretoria aprova desligamento',
          instructions: 'Aprovar desligamento do colaborador',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Diretoria'] }],
        },
        {
          name: 'Checklist de Desligamento',
          type: StepType.INPUT,
          description: 'RH realiza procedimentos de desligamento',
          instructions: 'Executar checklist: devolução de equipamentos, desligamento de acessos, etc.',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'cracha_devolvido', label: 'Crachá Devolvido', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'equipamentos_devolvidos', label: 'Equipamentos Devolvidos', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'acessos_desativados', label: 'Acessos Desativados', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'pendencias', label: 'Pendências Identificadas', type: 'TEXTAREA', required: false },
            ]
          },
        },
        {
          name: 'Cálculos Rescisórios',
          type: StepType.INPUT,
          description: 'RH calcula verbas rescisórias',
          instructions: 'Calcular férias, 13º, FGTS e outras verbas devidas',
          slaHours: 72,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'saldo_salario', label: 'Saldo de Salário', type: 'CURRENCY', required: true },
              { name: 'ferias_proporcionais', label: 'Férias Proporcionais', type: 'CURRENCY', required: true },
              { name: 'decimo_terceiro', label: '13º Salário Proporcional', type: 'CURRENCY', required: true },
              { name: 'aviso_previo_valor', label: 'Aviso Prévio', type: 'CURRENCY', required: false },
              { name: 'fgts_valor', label: 'FGTS + Multa 40%', type: 'CURRENCY', required: true },
              { name: 'total_liquido', label: 'Total Líquido a Receber', type: 'CURRENCY', required: true },
            ]
          },
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova pagamento rescisório',
          instructions: 'Verificar valores e aprovar pagamento',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Homologação',
          type: StepType.INPUT,
          description: 'RH agenda e realiza homologação',
          instructions: 'Agendar homologação e formalizar rescisão contratual',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'data_homologacao', label: 'Data da Homologação', type: 'DATE', required: true },
              { name: 'local_homologacao', label: 'Local da Homologação', type: 'TEXT', required: true },
              { name: 'homologacao_realizada', label: 'Homologação Realizada', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'observacoes_homologacao', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 7: SOLICITAÇÃO DE FÉRIAS
  // ═══════════════════════════════════════════════════════════════════════════
  const solicitacaoFerias = await createProcessType(
    company.id,
    'Solicitação de Férias',
    'Processo para solicitação e aprovação de férias',
    {
      fields: [
        {
          name: 'colaborador',
          label: 'Colaborador',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'setor',
          label: 'Setor',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'periodo_aquisitivo',
          label: 'Período Aquisitivo',
          type: FieldType.TEXT,
          required: true,
          helpText: 'Ex: 01/01/2025 a 31/12/2025',
        },
        {
          name: 'saldo_dias_disponiveis',
          label: 'Saldo de Dias Disponíveis',
          type: FieldType.NUMBER,
          required: false,
          helpText: 'Quantidade de dias de férias disponíveis',
        },
        {
          name: 'data_inicio',
          label: 'Data de Início das Férias',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'data_fim',
          label: 'Data de Término das Férias',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'dias_ferias',
          label: 'Dias de Férias',
          type: FieldType.NUMBER,
          required: true,
        },
        {
          name: 'vender_10_dias',
          label: 'Deseja vender 10 dias?',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Não', 'Sim']),
        },
        {
          name: 'abono_pecuniario',
          label: 'Solicita Abono Pecuniário?',
          type: FieldType.DROPDOWN,
          required: false,
          options: JSON.stringify(['Não', 'Sim']),
        },
        {
          name: 'observacoes',
          label: 'Observações',
          type: FieldType.TEXTAREA,
          required: false,
        },
      ],
      steps: [
        {
          name: 'Aprovação Gestor Imediato',
          type: StepType.APPROVAL,
          description: 'Gestor aprova período de férias',
          instructions: 'Verificar disponibilidade da equipe e aprovar período',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Coordenação'] }],
        },
        {
          name: 'Validação RH',
          type: StepType.APPROVAL,
          description: 'RH valida período aquisitivo e direitos',
          instructions: 'Conferir período aquisitivo, saldo de férias e prazos legais',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova adiantamento/pagamento',
          instructions: 'Aprovar pagamento de adiantamento de férias',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Formalização',
          type: StepType.INPUT,
          description: 'RH formaliza férias e agenda pagamento',
          instructions: 'Registrar férias no sistema, gerar recibo e programar pagamento',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Recursos Humanos'] }],
          conditions: {
            fields: [
              { name: 'recibo_ferias', label: 'Número do Recibo de Férias', type: 'TEXT', required: true },
              { name: 'valor_ferias', label: 'Valor das Férias', type: 'CURRENCY', required: true },
              { name: 'data_pagamento_ferias', label: 'Data do Pagamento', type: 'DATE', required: true },
              { name: 'observacoes_formalizacao_ferias', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 8: ADITIVO DE CONTRATO (SUBPROCESSO)
  // ═══════════════════════════════════════════════════════════════════════════
  const aditivoContrato = await createProcessType(
    company.id,
    'Aditivo de Contrato',
    'Subprocesso para aditivos contratuais',
    {
      isChildOnly: true,
      fields: [
        {
          name: 'numero_contrato',
          label: 'Número do Contrato Original',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'fornecedor',
          label: 'Fornecedor',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'tipo_aditivo',
          label: 'Tipo de Aditivo',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Prorrogação de Prazo', 'Alteração de Valor', 'Alteração de Escopo', 'Múltiplas Alterações']),
        },
        {
          name: 'descricao_alteracao',
          label: 'Descrição das Alterações',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'novo_prazo',
          label: 'Novo Prazo de Término',
          type: FieldType.DATE,
          required: false,
        },
        {
          name: 'novo_valor',
          label: 'Novo Valor (se aplicável)',
          type: FieldType.CURRENCY,
          required: false,
        },
        {
          name: 'justificativa',
          label: 'Justificativa',
          type: FieldType.TEXTAREA,
          required: true,
        },
      ],
      steps: [
        {
          name: 'Análise Técnica',
          type: StepType.APPROVAL,
          description: 'Área técnica valida alterações',
          instructions: 'Verificar adequação técnica das alterações propostas',
          slaHours: 48,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Operacional'] }],
        },
        {
          name: 'Análise Jurídica',
          type: StepType.INPUT,
          description: 'Jurídico elabora termo aditivo',
          instructions: 'Elaborar minuta do termo aditivo',
          slaHours: 72,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Jurídico'] }],
          conditions: {
            fields: [
              { name: 'numero_aditivo', label: 'Número do Termo Aditivo', type: 'TEXT', required: true },
              { name: 'clausulas_alteradas', label: 'Cláusulas Alteradas', type: 'TEXTAREA', required: true },
              { name: 'impacto_orcamentario', label: 'Impacto Orçamentário', type: 'CURRENCY', required: false },
              { name: 'parecer_aditivo', label: 'Parecer Jurídico', type: 'TEXTAREA', required: true },
            ]
          },
        },
        {
          name: 'Aprovação Diretoria',
          type: StepType.APPROVAL,
          description: 'Diretoria aprova aditivo',
          instructions: 'Aprovar termo aditivo e autorizar assinatura',
          slaHours: 48,
          requiresSignature: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Diretoria'] }],
        },
        {
          name: 'Formalização',
          type: StepType.INPUT,
          description: 'Administrativo formaliza aditivo',
          instructions: 'Solicitar assinaturas, arquivar e atualizar cadastro do contrato',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Administrativo'] }],
          conditions: {
            fields: [
              { name: 'data_assinatura_aditivo', label: 'Data da Assinatura', type: 'DATE', required: true },
              { name: 'vigencia_nova', label: 'Nova Data de Vigência', type: 'DATE', required: false },
              { name: 'protocolo_aditivo', label: 'Número de Protocolo', type: 'TEXT', required: true },
              { name: 'observacoes_aditivo', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 9: SOLICITAÇÃO DE LIMPEZA
  // ═══════════════════════════════════════════════════════════════════════════
  const solicitacaoLimpeza = await createProcessType(
    company.id,
    'Solicitação de Limpeza',
    'Processo para solicitação de serviços de limpeza e manutenção',
    {
      fields: [
        {
          name: 'tipo_servico',
          label: 'Tipo de Serviço',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Limpeza Geral', 'Limpeza Pesada', 'Dedetização', 'Desratização', 'Limpeza de Vidros', 'Jardinagem', 'Outro']),
        },
        {
          name: 'local_servico',
          label: 'Local do Serviço',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'descricao_necessidade',
          label: 'Descrição da Necessidade',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'urgencia',
          label: 'Nível de Urgência',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Normal', 'Urgente', 'Emergencial']),
        },
        {
          name: 'data_desejada',
          label: 'Data Desejada para Execução',
          type: FieldType.DATE,
          required: true,
        },
        {
          name: 'horario_preferencial',
          label: 'Horário Preferencial',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'observacoes_solicitacao',
          label: 'Observações Adicionais',
          type: FieldType.TEXTAREA,
          required: false,
        },
      ],
      steps: [
        {
          name: 'Análise da Solicitação',
          type: StepType.APPROVAL,
          description: 'Administrativo valida necessidade',
          instructions: 'Verificar viabilidade e urgência da solicitação',
          slaHours: 12,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Administrativo'] }],
        },
        {
          name: 'Agendamento',
          type: StepType.INPUT,
          description: 'Administrativo agenda serviço',
          instructions: 'Agendar serviço com equipe de limpeza ou terceirizado',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Administrativo'] }],
          conditions: {
            fields: [
              { name: 'data_agendada', label: 'Data Agendada', type: 'DATE', required: true },
              { name: 'horario_agendado', label: 'Horário Agendado', type: 'TEXT', required: true },
              { name: 'responsavel_execucao', label: 'Responsável pela Execução', type: 'TEXT', required: true },
              { name: 'materiais_necessarios', label: 'Materiais Necessários', type: 'TEXTAREA', required: false },
            ]
          },
        },
        {
          name: 'Execução e Validação',
          type: StepType.INPUT,
          description: 'Registro da execução do serviço',
          instructions: 'Registrar execução e validar qualidade do serviço',
          slaHours: 48,
          allowAttachment: true,
          assignedToCreator: true,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.PROCESS_CREATOR }],
          conditions: {
            fields: [
              { name: 'servico_executado', label: 'Serviço Executado', type: 'DROPDOWN', options: ['Sim', 'Não'], required: true },
              { name: 'data_execucao', label: 'Data de Execução', type: 'DATE', required: true },
              { name: 'avaliacao_servico', label: 'Avaliação do Serviço', type: 'DROPDOWN', options: ['Excelente', 'Bom', 'Regular', 'Ruim'], required: true },
              { name: 'observacoes_execucao', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSO 10: REEMBOLSO DE DESPESAS
  // ═══════════════════════════════════════════════════════════════════════════
  const reembolsoDespesas = await createProcessType(
    company.id,
    'Reembolso de Despesas',
    'Processo para solicitação de reembolso de despesas corporativas',
    {
      fields: [
        {
          name: 'tipo_despesa',
          label: 'Tipo de Despesa',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['Transporte (Táxi/Uber)', 'Alimentação', 'Hospedagem', 'Combustível', 'Estacionamento', 'Pedágio', 'Material de Escritório', 'Outro']),
        },
        {
          name: 'motivo_despesa',
          label: 'Motivo da Despesa',
          type: FieldType.TEXTAREA,
          required: true,
        },
        {
          name: 'centro_custo_reembolso',
          label: 'Centro de Custo',
          type: FieldType.TEXT,
          required: true,
        },
        {
          name: 'projeto_relacionado',
          label: 'Projeto/Atividade Relacionada',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'itens_despesa',
          label: 'Detalhamento dos Comprovantes',
          type: FieldType.TABLE,
          required: true,
          tableColumns: JSON.stringify([
            { name: 'data_item', label: 'Data', type: 'date' },
            { name: 'descricao_item', label: 'Descrição', type: 'text' },
            { name: 'tipo_comprovante', label: 'Tipo Doc', type: 'text' },
            { name: 'numero_documento', label: 'Nº Doc/NF', type: 'text' },
            { name: 'valor_item', label: 'Valor', type: 'currency' },
          ]),
          minRows: 1,
        },
        {
          name: 'forma_recebimento',
          label: 'Forma de Recebimento',
          type: FieldType.DROPDOWN,
          required: true,
          options: JSON.stringify(['PIX', 'Transferência Bancária']),
        },
        {
          name: 'chave_pix',
          label: 'Chave PIX (CPF, E-mail, Telefone ou Aleatória)',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'banco',
          label: 'Banco (para transferência)',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'agencia',
          label: 'Agência',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'conta',
          label: 'Conta',
          type: FieldType.TEXT,
          required: false,
        },
        {
          name: 'tipo_conta',
          label: 'Tipo de Conta',
          type: FieldType.DROPDOWN,
          required: false,
          options: JSON.stringify(['Corrente', 'Poupança']),
        },
      ],
      steps: [
        {
          name: 'Validação Documental',
          type: StepType.INPUT,
          description: 'Financeiro valida comprovantes fiscais',
          instructions: 'Verificar se todos os comprovantes estão legíveis, válidos e dentro da política',
          slaHours: 24,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
          conditions: {
            fields: [
              { 
                name: 'analise_comprovantes', 
                label: 'Análise de Comprovantes', 
                type: 'TABLE', 
                required: true,
                tableColumns: [
                  { name: 'item', label: 'Item', type: 'TEXT' },
                  { name: 'status', label: 'Status', type: 'TEXT' },
                  { name: 'valor_apresentado', label: 'Valor Apresentado', type: 'CURRENCY' },
                  { name: 'valor_aprovado', label: 'Valor Aprovado', type: 'CURRENCY' },
                  { name: 'motivo_glosa', label: 'Motivo Glosa', type: 'TEXT' },
                ]
              },
              { name: 'valor_total_aprovado', label: 'Valor Total Aprovado', type: 'CURRENCY', required: true },
              { name: 'comprovantes_conformes', label: 'Comprovantes Conforme Política', type: 'DROPDOWN', options: ['Sim', 'Não', 'Parcialmente'], required: true },
              { name: 'observacoes_validacao', label: 'Observações da Validação', type: 'TEXTAREA', required: false },
            ]
          },
        },
        {
          name: 'Aprovação Gestor',
          type: StepType.APPROVAL,
          description: 'Gestor aprova reembolso',
          instructions: 'Verificar se a despesa era necessária e pertinente à atividade profissional',
          slaHours: 48,
          assignments: [{ type: AssignmentType.ROLE, role: DynamicRole.SECTOR_MANAGER }],
        },
        {
          name: 'Aprovação Financeira',
          type: StepType.APPROVAL,
          description: 'Financeiro aprova pagamento',
          instructions: 'Verificar disponibilidade orçamentária e aprovar desembolso',
          slaHours: 24,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
        },
        {
          name: 'Processamento de Pagamento',
          type: StepType.INPUT,
          description: 'Financeiro processa reembolso',
          instructions: 'Efetuar transferência bancária e registrar contabilmente',
          slaHours: 48,
          allowAttachment: true,
          assignments: [{ type: AssignmentType.SECTOR, sectorId: sectorsMap['Financeiro'] }],
          conditions: {
            fields: [
              { name: 'data_pagamento_reembolso', label: 'Data do Pagamento', type: 'DATE', required: true },
              { name: 'valor_pago_reembolso', label: 'Valor Pago', type: 'CURRENCY', required: true },
              { name: 'numero_transacao_reembolso', label: 'Número da Transação/DOC', type: 'TEXT', required: true },
              { name: 'lancamento_contabil', label: 'Nº Lançamento Contábil', type: 'TEXT', required: false },
              { name: 'observacoes_pagamento', label: 'Observações', type: 'TEXTAREA', required: false },
            ]
          },
        },
      ],
    }
  );

  console.log('   -> ✅ 10 Processos criados com sucesso!');

  // ============================================================================
  // 7. VINCULAR PERFIS AOS PROCESSOS
  // ============================================================================
  console.log('🔗 Vinculando Perfis aos Processos...');

  const allProcessTypes = await prisma.processType.findMany({ where: { companyId: company.id } });

  for (const profile of Object.values(profilesMap)) {
    for (const processType of allProcessTypes) {
      await prisma.profile_process_types.create({
        data: {
          id: uuidv4(),
          profileId: profile,
          processTypeId: processType.id,
          canView: true,
          canCreate: true,
          canExecute: true,
          updatedAt: new Date(),
        },
      });
    }
  }

  // ============================================================================
  // 8. CRIAR SUB-TAREFAS PARA PROCESSOS
  // ============================================================================
  console.log('📋 Criando Templates de Sub-tarefas...');

  // Sub-tarefas para Admissão (Contratação de Pessoa)
  const contratacaoPessoaType = await prisma.processType.findFirst({
    where: { companyId: company.id, name: 'Solicitação de Contratação de Pessoa' },
  });

  if (contratacaoPessoaType) {
    const version = await prisma.processTypeVersion.findFirst({
      where: { processTypeId: contratacaoPessoaType.id },
    });

    if (version) {
      const admissaoStep = await prisma.stepVersion.findFirst({
        where: { processTypeVersionId: version.id, name: 'Admissão' },
      });

      if (admissaoStep) {
        const subtasks = [
          'Solicitar cópia de RG e CPF',
          'Solicitar Comprovante de Residência',
          'Solicitar Carteira de Trabalho',
          'Solicitar Certificado de Escolaridade',
          'Agendar Exame Admissional (ASO)',
          'Solicitar dados de Conta Bancária',
          'Solicitar Declaração de Dependentes IR',
          'Preparar Contrato de Trabalho',
          'Realizar Integração (Onboarding)',
          'Cadastrar no Sistema',
        ];

        for (const [idx, task] of subtasks.entries()) {
          await prisma.subTaskTemplate.create({
            data: {
              id: uuidv4(),
              stepVersionId: admissaoStep.id,
              name: task,
              order: idx + 1,
              isRequired: true,
            },
          });
        }
      }
    }
  }

  // Sub-tarefas para Desligamento
  const desligamentoType = await prisma.processType.findFirst({
    where: { companyId: company.id, name: 'Desligamento de Colaborador' },
  });

  if (desligamentoType) {
    const version = await prisma.processTypeVersion.findFirst({
      where: { processTypeId: desligamentoType.id },
    });

    if (version) {
      const checklistStep = await prisma.stepVersion.findFirst({
        where: { processTypeVersionId: version.id, name: 'Checklist de Desligamento' },
      });

      if (checklistStep) {
        const subtasks = [
          'Recolher Crachá',
          'Recolher Equipamentos (Notebook, Mouse, etc)',
          'Desativar E-mail Corporativo',
          'Desativar Acessos aos Sistemas',
          'Recolher Chaves',
          'Entrevista de Desligamento',
          'Termo de Quitação',
        ];

        for (const [idx, task] of subtasks.entries()) {
          await prisma.subTaskTemplate.create({
            data: {
              id: uuidv4(),
              stepVersionId: checklistStep.id,
              name: task,
              order: idx + 1,
              isRequired: true,
            },
          });
        }
      }
    }
  }

  // ============================================================================
  // 9. LOGS DE AUDITORIA
  // ============================================================================
  console.log('📝 Criando Logs de Auditoria...');

  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      action: 'SEED_DATABASE',
      resource: 'system',
      details: JSON.stringify({ message: 'Seed Enterprise executado com sucesso' }),
      userId: admin.id,
      companyId: company.id,
      ipAddress: '127.0.0.1',
      userAgent: 'SoloFlow-Seed-Enterprise',
    },
  });

  // ============================================================================
  // ESTATÍSTICAS FINAIS
  // ============================================================================
  const stats = {
    companies: await prisma.company.count(),
    sectors: await prisma.sector.count(),
    users: await prisma.user.count(),
    profiles: await prisma.profiles.count(),
    permissions: await prisma.profile_permissions.count(),
    processTypes: await prisma.processType.count(),
    profileProcessTypes: await prisma.profile_process_types.count(),
    subTaskTemplates: await prisma.subTaskTemplate.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('\n🎉 Seed Concluído com Sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 CREDENCIAIS DE ACESSO:');
  console.log('   Admin:  admin@soloflow.com.br / admin123');
  console.log('   Demais: carlos|ana|roberto|juliana|fernanda|lucas|marcos|patricia@soloflow.com.br / 123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ESTATÍSTICAS:');
  console.log(`   Empresas: ${stats.companies}`);
  console.log(`   Setores: ${stats.sectors}`);
  console.log(`   Usuários: ${stats.users}`);
  console.log(`   Perfis: ${stats.profiles} (Super Admin, Analista, Coordenação)`);
  console.log(`   Permissões: ${stats.permissions}`);
  console.log(`   Processos: ${stats.processTypes}`);
  console.log(`     - Chamados TI`);
  console.log(`     - Solicitação de Compras`);
  console.log(`     - Contratação de Serviço`);
  console.log(`     - Pagamento de Serviço (Subprocesso)`);
  console.log(`     - Contratação de Pessoa`);
  console.log(`     - Desligamento de Colaborador`);
  console.log(`     - Solicitação de Férias`);
  console.log(`     - Aditivo de Contrato (Subprocesso)`);
  console.log(`     - Solicitação de Limpeza`);
  console.log(`     - Reembolso de Despesas`);
  console.log(`   Vinculações Perfil→Processo: ${stats.profileProcessTypes}`);
  console.log(`   Templates de Sub-tarefas: ${stats.subTaskTemplates}`);
  console.log(`   Logs de Auditoria: ${stats.auditLogs}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CARACTERÍSTICAS IMPLEMENTADAS:');
  console.log('   ✅ 9 usuários (1 admin + 8 analistas por setor)');
  console.log('   ✅ Usuário admin com 3 perfis (Super Admin, Analista, Coordenação)');
  console.log('   ✅ Perfis diferenciados (Super Admin: *:*, Coordenação: gestão, Analista: operacional)');
  console.log('   ✅ 10 Processos otimizados com análise BPM profissional');
  console.log('   ✅ 2 Subprocessos vinculados (Pagamento e Aditivo)');
  console.log('   ✅ Campos de formulário em TODAS as etapas INPUT');
  console.log('   ✅ Fluxos inteligentes sem etapas vazias');
  console.log('   ✅ Sub-tarefas (checklists) para RH');
  console.log('   ✅ Sistema de rastreabilidade com Audit Log');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erro Fatal no Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
