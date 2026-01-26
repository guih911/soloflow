import { Prisma, PrismaClient, ProcessStatus, StepExecutionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

let processCounter = 0;

function nextCode(prefix: string): string {
  processCounter++;
  return `${prefix}-${String(processCounter).padStart(4, '0')}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// Tipo que define a execução de uma etapa
interface StepExecutionData {
  status: StepExecutionStatus;
  action?: string;
  comment?: string;
  metadata?: Record<string, any>;
  executorSector?: string; // setor do executor
  useCreator?: boolean; // usa o criador do processo
}

interface ProcessConfig {
  processTypeName: string;
  title: string;
  status: ProcessStatus;
  formData: Record<string, any>;
  stepExecutions: StepExecutionData[];
  createdById: string;
  createdDaysAgo: number;
}

async function createProcessInstance(
  companyId: string,
  config: ProcessConfig,
  usersMap: Record<string, string>,
  sectorsMap: Record<string, string>,
) {
  const processType = await prisma.processType.findFirst({
    where: { companyId, name: config.processTypeName },
  });
  if (!processType) {
    console.warn(`   ⚠️  Tipo "${config.processTypeName}" não encontrado`);
    return;
  }

  const version = await prisma.processTypeVersion.findFirst({
    where: { processTypeId: processType.id, isActive: true },
  });
  if (!version) return;

  const steps = await prisma.stepVersion.findMany({
    where: { processTypeVersionId: version.id },
    orderBy: { order: 'asc' },
    include: { assignments: true },
  });

  const createdAt = daysAgo(config.createdDaysAgo);
  const code = nextCode('PROC');

  // Calcular currentStepOrder com base nos step executions
  let currentStepOrder = 1;
  for (let i = 0; i < config.stepExecutions.length; i++) {
    if (config.stepExecutions[i].status === StepExecutionStatus.COMPLETED) {
      currentStepOrder = i + 2; // próxima etapa
    } else {
      currentStepOrder = i + 1;
      break;
    }
  }
  if (config.status === ProcessStatus.COMPLETED) {
    currentStepOrder = steps.length;
  }

  // Mesclar formData: dados iniciais + dados das etapas completadas
  const mergedFormData = { ...config.formData };
  for (const stepExec of config.stepExecutions) {
    if (stepExec.status === StepExecutionStatus.COMPLETED && stepExec.metadata) {
      Object.assign(mergedFormData, stepExec.metadata);
    }
  }

  const instance = await prisma.processInstance.create({
    data: {
      id: uuidv4(),
      code,
      title: config.title,
      status: config.status,
      currentStepOrder,
      formData: mergedFormData,
      createdAt,
      updatedAt: new Date(),
      completedAt: config.status === ProcessStatus.COMPLETED ? daysAgo(Math.max(0, config.createdDaysAgo - 5)) : undefined,
      processTypeVersionId: version.id,
      createdById: config.createdById,
      companyId,
    },
  });

  // Criar StepExecutions
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const execData = config.stepExecutions[i];

    let status: StepExecutionStatus = StepExecutionStatus.PENDING;
    let action: string | undefined;
    let comment: string | undefined;
    let metadata: any = undefined;
    let executorId: string | undefined;
    let sectorId: string | undefined;
    let completedAt: Date | undefined;

    // Determinar setor da etapa via assignments
    if (step.assignments.length > 0) {
      const assignment = step.assignments[0];
      if (assignment.sectorId) {
        sectorId = assignment.sectorId;
      }
    }

    if (execData) {
      status = execData.status;
      action = execData.action;
      comment = execData.comment;
      metadata = execData.metadata;

      // Definir executor
      if (execData.useCreator) {
        executorId = config.createdById;
      } else if (execData.executorSector && usersMap[execData.executorSector]) {
        executorId = usersMap[execData.executorSector];
        sectorId = sectorsMap[execData.executorSector];
      } else if (sectorId) {
        // Encontrar o usuário do setor
        const sectorName = Object.entries(sectorsMap).find(([, id]) => id === sectorId)?.[0];
        if (sectorName && usersMap[sectorName]) {
          executorId = usersMap[sectorName];
        }
      }

      if (status === StepExecutionStatus.COMPLETED) {
        completedAt = daysAgo(Math.max(0, config.createdDaysAgo - (i + 1) * 2));
      }

      // Não atribuir executor a etapas PENDING
      if (status === StepExecutionStatus.PENDING) {
        executorId = undefined;
      }
    }

    await prisma.stepExecution.create({
      data: {
        id: uuidv4(),
        status,
        action,
        comment,
        metadata: metadata || undefined,
        createdAt,
        updatedAt: completedAt || new Date(),
        completedAt,
        processInstanceId: instance.id,
        stepVersionId: step.id,
        executorId,
        sectorId,
      },
    });
  }

  return instance;
}

async function main() {
  console.log('🧪 Iniciando Seed de Dados de Teste...');

  const company = await prisma.company.findFirst({ where: { name: 'SoloFlow Sistemas' } });
  if (!company) {
    console.error('❌ Empresa não encontrada. Execute o seed principal primeiro.');
    process.exit(1);
  }

  // Buscar setores
  const sectors = await prisma.sector.findMany({ where: { companyId: company.id } });
  const sectorsMap: Record<string, string> = {};
  for (const s of sectors) {
    sectorsMap[s.name] = s.id;
  }

  // Buscar usuários vinculados à empresa com seus setores
  const userCompanies = await prisma.userCompany.findMany({
    where: { companyId: company.id },
    include: { user: true },
  });

  const usersMap: Record<string, string> = {}; // sectorName -> userId
  let adminId = '';

  for (const uc of userCompanies) {
    if (uc.role === 'ADMIN') {
      adminId = uc.userId;
    }
    // Mapear cada setor ao seu usuário
    const sectorName = Object.entries(sectorsMap).find(([, id]) => id === uc.sectorId)?.[0];
    if (sectorName) {
      if (uc.role === 'ADMIN') {
        // Admin fica como fallback se não houver outro
        if (!usersMap[sectorName]) {
          usersMap[sectorName] = uc.userId;
        }
      } else {
        usersMap[sectorName] = uc.userId;
      }
    }
  }

  if (!adminId) {
    console.error('❌ Admin não encontrado.');
    process.exit(1);
  }

  // Verificar que temos usuários para cada setor
  console.log('👥 Mapa de usuários por setor:');
  for (const [sector, userId] of Object.entries(usersMap)) {
    const user = userCompanies.find(uc => uc.userId === userId);
    console.log(`   ${sector}: ${user?.user.name || userId}`);
  }

  // Limpar dados anteriores
  console.log('\n🗑️  Limpando processos anteriores...');
  await prisma.subTask.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.signatureRecord.deleteMany({});
  await prisma.signatureRequirement.deleteMany({});
  await prisma.childProcessInstance.deleteMany({});
  await prisma.stepExecution.deleteMany({});
  await prisma.processInstance.deleteMany({});

  console.log('📋 Criando processos de teste...\n');

  // Helper: seleciona criador. Alterna entre admin e setor para variar
  const creator = (sector: string) => usersMap[sector] || adminId;

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAMADOS TI — 5 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🖥️  Chamados TI (5)...');

  // 1. CONCLUÍDO - Hardware
  await createProcessInstance(company.id, {
    processTypeName: 'Chamados TI',
    title: 'Computador não liga - Sala 201',
    status: ProcessStatus.COMPLETED,
    formData: {
      categoria: 'Hardware',
      prioridade: 'Alta',
      titulo: 'Computador não liga - Sala 201',
      descricao_problema: 'O computador da estação de trabalho 3 na sala 201 não liga desde ontem. Já tentei trocar a tomada e o cabo de força sem sucesso. A luz do monitor acende mas a CPU não dá sinal.',
      equipamento_patrimonio: 'PAT-2021-0345',
      local: 'Sala 201, Estação 3',
      impacto: 'Não consigo trabalhar',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          prioridade_reclassificada: 'Alta',
          tecnico_responsavel: 'Lucas TI',
          previsao_atendimento: '2026-01-10',
          observacoes_triagem: 'Possível problema na fonte de alimentação. Técnico irá verificar presencialmente.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          diagnostico: 'Fonte de alimentação queimada. Capacitor estufado identificado na inspeção visual.',
          solucao_aplicada: 'Substituição da fonte de alimentação por modelo compatível (500W Corsair). Equipamento testado e funcionando normalmente após troca.',
          tipo_solucao: 'Presencial',
          tempo_resolucao: 45,
          necessita_acompanhamento: 'Não',
          recomendacoes: 'Verificar instalação elétrica da sala - possível sobrecarga na rede. Sugerir instalação de no-break.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        useCreator: true,
        metadata: { approvalResult: 'aprovar' },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 15,
  }, usersMap, sectorsMap);

  // 2. CONCLUÍDO - Software
  await createProcessInstance(company.id, {
    processTypeName: 'Chamados TI',
    title: 'Erro no sistema ERP ao gerar relatório mensal',
    status: ProcessStatus.COMPLETED,
    formData: {
      categoria: 'Software',
      prioridade: 'Média',
      titulo: 'Erro no sistema ERP ao gerar relatório mensal',
      descricao_problema: 'Ao tentar gerar relatório mensal de vendas no módulo Financeiro, o sistema apresenta erro "Timeout exceeded" após 30 segundos. Problema ocorre apenas com relatórios que abrangem mais de 3 meses.',
      local: 'Sala Financeiro',
      impacto: 'Trabalho prejudicado',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          prioridade_reclassificada: 'Média',
          tecnico_responsavel: 'Lucas TI',
          previsao_atendimento: '2026-01-12',
          observacoes_triagem: 'Problema de performance no banco de dados. Necessário análise de queries e índices.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          diagnostico: 'Query de relatório sem índice adequado na tabela de vendas. Consulta fazia full table scan em tabela com 2M+ registros.',
          solucao_aplicada: 'Criado índice composto (data_venda, status, filial) na tabela tb_vendas. Otimizada a query do relatório para usar CTEs em vez de subqueries. Tempo de execução reduzido de 45s para 2s.',
          tipo_solucao: 'Remota',
          tempo_resolucao: 120,
          necessita_acompanhamento: 'Sim',
          recomendacoes: 'Monitorar performance nos próximos 7 dias. Se o problema recorrer, considerar particionamento da tabela por ano.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        useCreator: true,
        metadata: { approvalResult: 'aprovar' },
      },
    ],
    createdById: usersMap['Financeiro'] || adminId,
    createdDaysAgo: 12,
  }, usersMap, sectorsMap);

  // 3. EM ANDAMENTO - Resolução técnica
  await createProcessInstance(company.id, {
    processTypeName: 'Chamados TI',
    title: 'Sem acesso ao e-mail corporativo',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      categoria: 'E-mail',
      prioridade: 'Alta',
      titulo: 'Sem acesso ao e-mail corporativo',
      descricao_problema: 'Desde hoje cedo não consigo acessar meu e-mail corporativo (juliana@soloflow.com.br). O Outlook mostra erro "Falha na autenticação" tanto no desktop quanto no celular. Já tentei resetar a senha sem sucesso.',
      impacto: 'Não consigo trabalhar',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          prioridade_reclassificada: 'Alta',
          tecnico_responsavel: 'Lucas TI',
          previsao_atendimento: '2026-01-22',
          observacoes_triagem: 'Conta possivelmente bloqueada por tentativas de login excessivas. Verificar no AD e Office 365.',
        },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Tecnologia da Informação',
      },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 2,
  }, usersMap, sectorsMap);

  // 4. EM ANDAMENTO - Na triagem
  await createProcessInstance(company.id, {
    processTypeName: 'Chamados TI',
    title: 'Impressora do 2º andar com defeito',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      categoria: 'Impressora',
      prioridade: 'Média',
      titulo: 'Impressora do 2º andar com defeito',
      descricao_problema: 'A impressora HP LaserJet do 2º andar está imprimindo com manchas e listras horizontais em todas as páginas. Já tentei limpar o cabeçote pelo menu da impressora 3 vezes sem sucesso. O toner foi trocado há 2 semanas.',
      equipamento_patrimonio: 'PAT-2020-0123',
      local: '2º Andar, Sala de impressão',
      impacto: 'Trabalho parcialmente afetado',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Tecnologia da Informação',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Recursos Humanos'] || adminId,
    createdDaysAgo: 1,
  }, usersMap, sectorsMap);

  // 5. REJEITADO - Validação do solicitante reprovou
  await createProcessInstance(company.id, {
    processTypeName: 'Chamados TI',
    title: 'Internet lenta no setor operacional',
    status: ProcessStatus.REJECTED,
    formData: {
      categoria: 'Rede/Internet',
      prioridade: 'Alta',
      titulo: 'Internet lenta no setor operacional',
      descricao_problema: 'A internet no setor operacional está extremamente lenta há 3 dias. Downloads que antes levavam segundos agora demoram minutos. Vídeo-chamadas travam constantemente.',
      local: 'Setor Operacional - Térreo',
      impacto: 'Trabalho prejudicado',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          prioridade_reclassificada: 'Alta',
          tecnico_responsavel: 'Lucas TI',
          previsao_atendimento: '2026-01-16',
          observacoes_triagem: 'Possível saturação do link. Verificar uso de banda por setor.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Tecnologia da Informação',
        metadata: {
          diagnostico: 'Switch do setor operacional com porta defeituosa causando broadcast storm intermitente. Substituído o switch.',
          solucao_aplicada: 'Substituição do switch TP-Link 24 portas por modelo Cisco SG350. Reconfiguração de VLANs e QoS para priorizar tráfego de vídeo.',
          tipo_solucao: 'Presencial',
          tempo_resolucao: 180,
          necessita_acompanhamento: 'Sim',
          recomendacoes: 'Monitorar velocidade nos próximos dias. Equipamento antigo será descartado.',
        },
      },
      {
        status: StepExecutionStatus.REJECTED,
        action: 'reprovar',
        useCreator: true,
        comment: 'O problema persiste. A internet continua lenta em horários de pico (10h-12h e 14h-16h). Favor reabrir o chamado.',
        metadata: { approvalResult: 'reprovar' },
      },
    ],
    createdById: usersMap['Operacional'] || adminId,
    createdDaysAgo: 8,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLICITAÇÃO DE COMPRAS — 3 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🛒 Solicitações de Compras (3)...');

  // 1. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Compras',
    title: 'Compra de notebooks para equipe de TI',
    status: ProcessStatus.COMPLETED,
    formData: {
      centro_custo: 'CC-TI-001',
      tipo_compra: 'Equipamento',
      itens: [
        { descricao: 'Notebook Dell Inspiron 15', especificacao: 'Intel i7-13700H, 16GB RAM DDR5, SSD 512GB NVMe, Tela 15.6" FHD', quantidade: 3, valor_estimado: 5500 },
        { descricao: 'Mouse sem fio Logitech MX Master 3', especificacao: 'Bluetooth, ergonômico, bateria recarregável', quantidade: 3, valor_estimado: 450 },
        { descricao: 'Teclado mecânico Keychron K2', especificacao: 'Layout ABNT2, switches brown, wireless', quantidade: 3, valor_estimado: 550 },
      ],
      justificativa: 'Substituição de equipamentos com mais de 4 anos. Notebooks atuais não suportam Docker + múltiplas IDEs simultaneamente, causando travamentos frequentes e perda de produtividade.',
      data_necessidade: '2026-02-15',
      urgente: 'Não',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Compras',
        metadata: {
          fornecedores_cotacao: [
            { fornecedor: 'Dell Brasil', cnpj: '72.381.189/0001-10', valor_total: 19200, prazo_entrega: 15, condicao_pagamento: '30/60/90 dias' },
            { fornecedor: 'Kabum Corporativo', cnpj: '05.570.714/0001-59', valor_total: 18500, prazo_entrega: 7, condicao_pagamento: 'À vista com 5% desconto' },
            { fornecedor: 'TechStore Distribuição', cnpj: '33.456.789/0001-12', valor_total: 19800, prazo_entrega: 10, condicao_pagamento: '28 dias' },
          ],
          fornecedor_selecionado: 'Kabum Corporativo',
          cnpj_selecionado: '05.570.714/0001-59',
          valor_total_cotacao: 18500,
          justificativa_selecao: 'Menor preço com prazo de entrega mais curto. Fornecedor com bom histórico de entregas anteriores. Garantia de 3 anos inclusa.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Compras',
        metadata: {
          numero_pedido: 'PC-2026-00045',
          data_pedido: '2026-01-08',
          previsao_entrega: '2026-01-15',
          condicao_pagamento_final: 'Boleto à vista com 5% desconto - R$ 17.575,00',
          observacoes_pedido: 'Pedido confirmado por e-mail. Entrega no endereço da empresa com agendamento prévio. Contato: vendas@kabum.com.br',
        },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 25,
  }, usersMap, sectorsMap);

  // 2. EM ANDAMENTO - Na cotação
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Compras',
    title: 'Material de escritório - Reposição mensal',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      centro_custo: 'CC-ADM-002',
      tipo_compra: 'Material de Escritório',
      itens: [
        { descricao: 'Resma de papel A4 Chamex', especificacao: '75g/m², 500 folhas, branco', quantidade: 50, valor_estimado: 28 },
        { descricao: 'Caneta esferográfica BIC Cristal', especificacao: 'Azul, ponta média 1.0mm', quantidade: 100, valor_estimado: 2.5 },
        { descricao: 'Grampeador metal 26/6', especificacao: 'Capacidade 25 folhas', quantidade: 10, valor_estimado: 25 },
        { descricao: 'Clips niquelado nº 2/0', especificacao: 'Caixa com 100 unidades', quantidade: 30, valor_estimado: 5 },
        { descricao: 'Post-it 76x76mm', especificacao: 'Bloco 100 folhas, amarelo', quantidade: 50, valor_estimado: 8 },
      ],
      justificativa: 'Reposição mensal de materiais de escritório. Estoque atual abaixo do mínimo para 5 dos 8 itens controlados. Consumo médio mensal verificado nos últimos 6 meses.',
      data_necessidade: '2026-02-01',
      urgente: 'Não',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Compras',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 5,
  }, usersMap, sectorsMap);

  // 3. EM ANDAMENTO - Aprovação pendente (gestor)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Compras',
    title: 'Cadeiras ergonômicas para sala de reunião',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      centro_custo: 'CC-ADM-003',
      tipo_compra: 'Equipamento',
      itens: [
        { descricao: 'Cadeira ergonômica presidente', especificacao: 'Couro sintético preto, apoio lombar regulável, braços 3D, rodízios em PU, suporta até 150kg', quantidade: 8, valor_estimado: 1200 },
      ],
      justificativa: 'As 8 cadeiras da sala de reunião principal têm mais de 5 anos e apresentam estofado rasgado, mecanismo de inclinação quebrado em 3 delas. Causam desconforto em reuniões que duram mais de 1 hora.',
      data_necessidade: '2026-03-01',
      urgente: 'Não',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.PENDING,
        executorSector: 'Diretoria',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Administrativo'] || adminId,
    createdDaysAgo: 3,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRATAÇÃO DE SERVIÇO — 2 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   📝 Contratações de Serviço (2)...');

  // 1. EM ANDAMENTO - No jurídico (etapa 4)
  await createProcessInstance(company.id, {
    processTypeName: 'Contratação de Serviço',
    title: 'Consultoria em segurança da informação',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      tipo_servico: 'Consultoria',
      descricao_servico: 'Consultoria especializada em segurança da informação para adequação à LGPD, pentest e implementação de políticas de segurança.',
      escopo_trabalho: '1) Diagnóstico de vulnerabilidades (pentest interno/externo)\n2) Elaboração de políticas de segurança\n3) Treinamento de equipe (40h)\n4) Implementação de SIEM e controles técnicos\n5) Relatório final com plano de ação',
      prazo_estimado: 6,
      valor_estimado: 85000,
      data_inicio_desejada: '2026-03-01',
      justificativa: 'Auditoria interna identificou 12 não-conformidades em segurança da informação. Necessidade urgente de adequação à LGPD (prazo regulatório). Risco de multa de até 2% do faturamento.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Compras',
        metadata: {
          propostas_recebidas: [
            { fornecedor: 'SecureTech Consultoria', cnpj: '12.345.678/0001-90', valor_proposto: 82000, prazo_proposto: 6, forma_pagamento: 'Mensal' },
            { fornecedor: 'CyberDefense Brasil', cnpj: '23.456.789/0001-01', valor_proposto: 95000, prazo_proposto: 5, forma_pagamento: 'Mensal com 20% entrada' },
            { fornecedor: 'InfoSec Partners', cnpj: '34.567.890/0001-12', valor_proposto: 78000, prazo_proposto: 8, forma_pagamento: 'Trimestral' },
          ],
          fornecedor_selecionado: 'SecureTech Consultoria',
          cnpj_fornecedor_selecionado: '12.345.678/0001-90',
          valor_final: 82000,
          valor_mensal: 13666.67,
          justificativa_selecao: 'Melhor custo-benefício. Prazo adequado (6 meses), equipe com certificações CISSP e CEH. Referências de 3 clientes do mesmo porte verificadas.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Jurídico',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 30,
  }, usersMap, sectorsMap);

  // 2. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Contratação de Serviço',
    title: 'Manutenção predial preventiva e corretiva',
    status: ProcessStatus.COMPLETED,
    formData: {
      tipo_servico: 'Manutenção',
      descricao_servico: 'Serviço de manutenção predial preventiva e corretiva para o edifício sede, incluindo áreas comuns e estacionamento.',
      escopo_trabalho: '1) Manutenção elétrica preventiva mensal\n2) Manutenção hidráulica sob demanda\n3) Pintura anual de áreas comuns\n4) Limpeza de fachada semestral\n5) Manutenção de elevadores conforme NBR',
      prazo_estimado: 12,
      valor_estimado: 120000,
      data_inicio_desejada: '2025-12-01',
      justificativa: 'Contrato anterior com Predial Express encerrou em novembro. Manutenção contínua obrigatória para preservação do patrimônio e segurança dos colaboradores.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Compras',
        metadata: {
          propostas_recebidas: [
            { fornecedor: 'Predial Serviços Ltda', cnpj: '45.678.901/0001-23', valor_proposto: 108000, prazo_proposto: 12, forma_pagamento: 'Mensal' },
            { fornecedor: 'Conserva Tudo', cnpj: '56.789.012/0001-34', valor_proposto: 132000, prazo_proposto: 12, forma_pagamento: 'Mensal + 10% reajuste semestral' },
            { fornecedor: 'ManuPred Goiás', cnpj: '67.890.123/0001-45', valor_proposto: 115000, prazo_proposto: 12, forma_pagamento: 'Mensal' },
          ],
          fornecedor_selecionado: 'Predial Serviços Ltda',
          cnpj_fornecedor_selecionado: '45.678.901/0001-23',
          valor_final: 108000,
          valor_mensal: 9000,
          justificativa_selecao: 'Menor valor mensal, sem reajuste no primeiro ano. Empresa atua na região há 15 anos com boas referências. Equipe técnica certificada pelo CREA.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Jurídico',
        metadata: {
          numero_contrato: 'CT-2025-00078',
          prazo_final: 12,
          data_inicio: '2025-12-01',
          data_termino: '2026-11-30',
          forma_pagamento: 'Mensal',
          clausulas_especiais: 'Multa de 20% sobre valor remanescente em caso de rescisão antecipada sem justa causa. Reajuste pelo IGPM após 12 meses.',
          garantias_multas: 'Garantia de 90 dias sobre serviços executados. Seguro de responsabilidade civil obrigatório R$ 500.000,00.',
          parecer_juridico: 'Contrato em conformidade com legislação vigente. Cláusulas de rescisão e multa adequadas. Recomendo aprovação.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Administrativo',
        metadata: {
          data_assinatura: '2025-11-28',
          numero_protocolo: 'PROT-2025-01234',
          local_arquivo: 'Armário 3, Pasta Contratos 2025, Gaveta 2',
          contato_fornecedor: 'Sr. Carlos Mendes - (62) 3222-4567 - carlos@predialservicos.com.br',
          observacoes_formalizacao: 'Contrato assinado em 2 vias. Cópia digital arquivada no SharePoint. Fornecedor orientado sobre normas internas de acesso.',
        },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 55,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGAMENTO DE SERVIÇO — 2 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   💰 Pagamentos de Serviço (2)...');

  // 1. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Pagamento de Serviço',
    title: 'Pagamento NF manutenção predial - Jan/2026',
    status: ProcessStatus.COMPLETED,
    formData: {
      fornecedor: 'Predial Serviços Ltda',
      numero_nota: 'NF-2026-00123',
      data_emissao: '2026-01-05',
      valor: 9000,
      data_vencimento: '2026-01-20',
      mes_referencia: 'Janeiro/2026',
      servico_executado: 'Sim',
      descricao: 'Manutenção preventiva realizada conforme cronograma: inspeção elétrica, limpeza de caixa d\'água, manutenção dos elevadores.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Administrativo',
        metadata: {
          dados_conferidos: 'Correto',
          observacoes_conferencia: 'NF conferida com contrato CT-2025-00078. Valores e serviços correspondem ao escopo mensal contratado.',
          impostos_retidos: 990,
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Financeiro',
        metadata: {
          data_pagamento: '2026-01-18',
          valor_pago: 8010,
          numero_transacao: 'TED-2026-00567890',
          banco: 'Banco do Brasil - Ag 1234-5 CC 98765-0',
        },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 18,
  }, usersMap, sectorsMap);

  // 2. EM ANDAMENTO - Aprovação financeira pendente
  await createProcessInstance(company.id, {
    processTypeName: 'Pagamento de Serviço',
    title: 'Pagamento NF consultoria TI - Parcela 1/6',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      fornecedor: 'SecureTech Consultoria',
      numero_nota: 'NF-2026-00456',
      data_emissao: '2026-01-15',
      valor: 13666.67,
      data_vencimento: '2026-02-05',
      mes_referencia: 'Janeiro/2026',
      servico_executado: 'Sim',
      descricao: 'Primeira parcela - Fase de diagnóstico: levantamento de ativos, análise de vulnerabilidades, entrevistas com gestores de TI.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Administrativo',
        metadata: {
          dados_conferidos: 'Correto',
          observacoes_conferencia: 'NF confere com contrato. Relatório parcial de diagnóstico entregue e validado pelo gestor de TI.',
          impostos_retidos: 1503.33,
        },
      },
      {
        status: StepExecutionStatus.PENDING,
        executorSector: 'Financeiro',
      },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 7,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRATAÇÃO DE PESSOA — 3 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   👤 Contratações de Pessoa (3)...');

  // 1. EM ANDAMENTO - Na seleção (etapa 4)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Contratação de Pessoa',
    title: 'Desenvolvedor Full Stack Sênior',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      cargo: 'Desenvolvedor Full Stack Sênior',
      setor: 'Tecnologia da Informação',
      tipo_contratacao: 'CLT',
      salario: 12000,
      jornada: '8h/dia - Segunda a Sexta (Híbrido: 3 dias presencial)',
      requisitos: '- 5+ anos com Node.js/TypeScript\n- Experiência com React ou Vue.js\n- PostgreSQL, Redis\n- Docker, CI/CD\n- Desejável: AWS, Kubernetes, GraphQL',
      atribuicoes: '- Desenvolvimento de novas funcionalidades\n- Code review e mentoria de júniors\n- Arquitetura de soluções\n- Documentação técnica\n- Participação em dailies e sprints',
      justificativa: 'Equipe de 3 devs está sobrecarregada com 2 projetos simultâneos. Backlog de 47 itens. Lead time aumentou 60% nos últimos 3 meses.',
      data_inicio: '2026-03-01',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Recursos Humanos',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Tecnologia da Informação'] || adminId,
    createdDaysAgo: 30,
  }, usersMap, sectorsMap);

  // 2. EM ANDAMENTO - Na admissão (etapa 6)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Contratação de Pessoa',
    title: 'Analista Financeiro Pleno',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      cargo: 'Analista Financeiro Pleno',
      setor: 'Financeiro',
      tipo_contratacao: 'CLT',
      salario: 7500,
      jornada: '8h/dia - Segunda a Sexta',
      requisitos: '- Graduação em Ciências Contábeis, Economia ou Administração\n- 3+ anos em contas a pagar/receber\n- Excel avançado\n- Desejável: Power BI, ERP SAP',
      atribuicoes: '- Gestão de contas a pagar e receber\n- Conciliação bancária diária\n- Elaboração de DRE e balanço\n- Apoio ao fechamento mensal e anual\n- Interface com auditoria externa',
      justificativa: 'Colaborador anterior (João Pedro) pediu demissão em 20/12. Vaga crítica para continuidade das operações financeiras. Setor operando com 1 pessoa a menos há 30 dias.',
      data_inicio: '2026-02-15',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          total_curriculos: 45,
          total_entrevistados: 8,
          canais_divulgacao: 'LinkedIn, Catho, Gupy, Indicação interna',
          candidato_selecionado: 'Mariana Costa Oliveira',
          resumo_perfil: 'Formada em Ciências Contábeis pela UFG (2020). 4 anos de experiência em empresas de médio porte. Último cargo: Analista Financeiro Jr na Construtora Goiás. Domínio de SAP FI e Power BI.',
          avaliacao_tecnica: 'Excelente',
          pretensao_salarial: 7200,
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        useCreator: true,
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Recursos Humanos',
      },
    ],
    createdById: usersMap['Financeiro'] || adminId,
    createdDaysAgo: 40,
  }, usersMap, sectorsMap);

  // 3. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Contratação de Pessoa',
    title: 'Estagiário de Administração',
    status: ProcessStatus.COMPLETED,
    formData: {
      cargo: 'Estagiário de Administração',
      setor: 'Administrativo',
      tipo_contratacao: 'Estágio',
      salario: 1800,
      jornada: '6h/dia - Segunda a Sexta (8h às 14h)',
      requisitos: '- Cursando Administração a partir do 3º semestre\n- Pacote Office intermediário\n- Boa comunicação verbal e escrita\n- Organização e proatividade',
      atribuicoes: '- Apoio em rotinas administrativas\n- Organização e digitalização de documentos\n- Atendimento telefônico e presencial\n- Controle de agenda da diretoria\n- Apoio na organização de eventos internos',
      justificativa: 'Setor administrativo com acúmulo de atividades operacionais. Estagiário irá absorver tarefas rotineiras permitindo que equipe efetiva foque em atividades estratégicas.',
      data_inicio: '2026-01-10',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          total_curriculos: 23,
          total_entrevistados: 5,
          canais_divulgacao: 'CIEE, Universidades locais (UFG, PUC-GO), Instagram da empresa',
          candidato_selecionado: 'Pedro Henrique Souza',
          resumo_perfil: 'Cursando 4º semestre de Administração na UFG. Experiência anterior como menor aprendiz no Banco Itaú. Perfil organizado e comunicativo.',
          avaliacao_tecnica: 'Bom',
          pretensao_salarial: 1500,
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        useCreator: true,
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          nome_completo: 'Pedro Henrique Souza Lima',
          cpf_colaborador: '456.789.123-00',
          data_nascimento: '2003-05-15',
          email_colaborador: 'pedro.souza@soloflow.com.br',
          telefone_colaborador: '(62) 99876-5432',
          data_admissao: '2026-01-10',
          numero_ctps: 'N/A - Estágio',
          numero_pis: '123.45678.90-1',
          salario_contratado: 1800,
          exame_admissional: 'Sim',
          documentacao_completa: 'Sim',
          observacoes_admissao: 'TCE assinado com a UFG. Supervisor designado: Ana Administrativa. Integração realizada em 10/01/2026.',
        },
      },
    ],
    createdById: usersMap['Administrativo'] || adminId,
    createdDaysAgo: 50,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // DESLIGAMENTO — 2 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🚪 Desligamentos (2)...');

  // 1. EM ANDAMENTO - No checklist (etapa 3)
  await createProcessInstance(company.id, {
    processTypeName: 'Desligamento de Colaborador',
    title: 'Desligamento - José Pereira da Silva',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      colaborador: 'José Pereira da Silva',
      cpf: '123.456.789-00',
      matricula: 'MAT-2022-0089',
      cargo: 'Assistente Administrativo',
      setor: 'Administrativo',
      data_admissao: '2022-03-15',
      tipo_desligamento: 'Pedido de demissão',
      data_desligamento: '2026-02-15',
      motivo: 'Colaborador recebeu proposta de emprego em multinacional com salário 40% superior e plano de carreira internacional. Decisão pessoal e profissional.',
      aviso_previo: 'Sim - Trabalhado',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Recursos Humanos',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 10,
  }, usersMap, sectorsMap);

  // 2. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Desligamento de Colaborador',
    title: 'Desligamento - Maria Santos Oliveira',
    status: ProcessStatus.COMPLETED,
    formData: {
      colaborador: 'Maria Santos Oliveira',
      cpf: '987.654.321-00',
      matricula: 'MAT-2021-0056',
      cargo: 'Auxiliar de Serviços Gerais',
      setor: 'Operacional',
      data_admissao: '2021-08-10',
      tipo_desligamento: 'Término de contrato',
      data_desligamento: '2026-01-10',
      motivo: 'Término do contrato temporário de 12 meses conforme Termo Aditivo TA-2024-003. Sem renovação por reestruturação do setor.',
      aviso_previo: 'Não se aplica',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          cracha_devolvido: 'Sim',
          equipamentos_devolvidos: 'Sim',
          acessos_desativados: 'Sim',
          pendencias: 'Uniforme 2 peças não devolvido - valor será descontado na rescisão (R$ 120,00).',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          saldo_salario: 1320,
          ferias_proporcionais: 1540,
          decimo_terceiro: 440,
          aviso_previo_valor: 0,
          fgts_valor: 2640,
          total_liquido: 5820,
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          data_homologacao: '2026-01-15',
          local_homologacao: 'Sala de Reuniões 2 - RH',
          homologacao_realizada: 'Sim',
          observacoes_homologacao: 'Colaboradora assinou TRCT sem ressalvas. Chave de conectividade FGTS entregue. Guias de seguro-desemprego entregues (5 parcelas).',
        },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 25,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLICITAÇÃO DE FÉRIAS — 3 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🏖️  Solicitações de Férias (3)...');

  // 1. EM ANDAMENTO - Aprovação financeira (etapa 3)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Férias',
    title: 'Férias - Lucas TI - Março/2026',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      colaborador: 'Lucas TI',
      setor: 'Tecnologia da Informação',
      periodo_aquisitivo: '01/01/2025 a 31/12/2025',
      saldo_dias_disponiveis: 30,
      data_inicio: '2026-03-10',
      data_fim: '2026-03-24',
      dias_ferias: 15,
      vender_10_dias: 'Sim',
      abono_pecuniario: 'Não',
      observacoes: 'Gostaria de tirar os 15 dias restantes em julho. Projetos em andamento serão transferidos para equipe.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.PENDING,
        executorSector: 'Financeiro',
      },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Tecnologia da Informação'] || adminId,
    createdDaysAgo: 8,
  }, usersMap, sectorsMap);

  // 2. EM ANDAMENTO - Pendente gestor (etapa 1)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Férias',
    title: 'Férias - Roberto Financeiro - Fevereiro/2026',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      colaborador: 'Roberto Financeiro',
      setor: 'Financeiro',
      periodo_aquisitivo: '01/06/2024 a 31/05/2025',
      saldo_dias_disponiveis: 30,
      data_inicio: '2026-02-17',
      data_fim: '2026-03-18',
      dias_ferias: 30,
      vender_10_dias: 'Não',
      abono_pecuniario: 'Não',
      observacoes: 'Férias vencendo em maio/2026. Período escolhido é o de menor movimento no setor financeiro.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.PENDING,
        executorSector: 'Diretoria',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Financeiro'] || adminId,
    createdDaysAgo: 4,
  }, usersMap, sectorsMap);

  // 3. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Férias',
    title: 'Férias - Ana Administrativa - Janeiro/2026',
    status: ProcessStatus.COMPLETED,
    formData: {
      colaborador: 'Ana Administrativa',
      setor: 'Administrativo',
      periodo_aquisitivo: '01/03/2024 a 28/02/2025',
      saldo_dias_disponiveis: 30,
      data_inicio: '2026-01-06',
      data_fim: '2026-01-20',
      dias_ferias: 15,
      vender_10_dias: 'Não',
      abono_pecuniario: 'Sim',
      observacoes: 'Aprovação prévia do gestor obtida verbalmente. Cobertura durante ausência: Patricia Operacional.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Recursos Humanos',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Recursos Humanos',
        metadata: {
          recibo_ferias: 'RF-2026-000012',
          valor_ferias: 4250.75,
          data_pagamento_ferias: '2026-01-03',
          observacoes_formalizacao_ferias: 'Pagamento de 15 dias de férias + 1/3 constitucional + abono pecuniário de 10 dias. Depósito na conta salário BB.',
        },
      },
    ],
    createdById: adminId,
    createdDaysAgo: 30,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLICITAÇÃO DE LIMPEZA — 2 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🧹 Solicitações de Limpeza (2)...');

  // 1. EM ANDAMENTO - Agendado (etapa 2)
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Limpeza',
    title: 'Limpeza pesada do depósito principal',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      tipo_servico: 'Limpeza Pesada',
      local_servico: 'Depósito principal - Subsolo, Galpão B',
      descricao_necessidade: 'Limpeza pesada após reorganização completa do estoque. Poeira acumulada de 6 meses, marcas de óleo no piso, teias de aranha no teto. Área de aproximadamente 200m².',
      urgencia: 'Normal',
      data_desejada: '2026-02-01',
      horario_preferencial: 'Sábado das 8h às 14h (sem expediente)',
      observacoes_solicitacao: 'Piso epóxi - usar apenas produtos neutros. Necessário hidrojateamento nas paredes. Equipe mínima de 4 pessoas.',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Administrativo',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Administrativo',
      },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: usersMap['Operacional'] || adminId,
    createdDaysAgo: 5,
  }, usersMap, sectorsMap);

  // 2. CONCLUÍDO
  await createProcessInstance(company.id, {
    processTypeName: 'Solicitação de Limpeza',
    title: 'Dedetização semestral - Edifício sede',
    status: ProcessStatus.COMPLETED,
    formData: {
      tipo_servico: 'Dedetização',
      local_servico: 'Edifício sede - Todos os 4 andares + subsolo + estacionamento',
      descricao_necessidade: 'Dedetização preventiva semestral conforme cronograma de manutenção predial. Última realizada em julho/2025.',
      urgencia: 'Normal',
      data_desejada: '2026-01-11',
      horario_preferencial: 'Sábado (sem expediente) - das 7h às 15h',
      observacoes_solicitacao: 'Comunicar todos os setores com 5 dias de antecedência. Copa e refeitório precisam de atenção especial. Produtos com baixa toxicidade (ambiente com ar condicionado central).',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Administrativo',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Administrativo',
        metadata: {
          data_agendada: '2026-01-11',
          horario_agendado: '07:00 às 15:00',
          responsavel_execucao: 'Dedetiza Goiás - Equipe do Sr. Antônio (4 pessoas)',
          materiais_necessarios: 'Gel barata, inseticida piretróide (baixa toxicidade), armadilhas para roedores, raticida em blocos parafinados para áreas externas.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        useCreator: true,
        metadata: {
          servico_executado: 'Sim',
          data_execucao: '2026-01-11',
          avaliacao_servico: 'Excelente',
          observacoes_execucao: 'Serviço realizado dentro do prazo. Equipe profissional e organizada. Certificado de dedetização emitido (validade 6 meses). Nenhum odor residual detectado na segunda-feira.',
        },
      },
    ],
    createdById: usersMap['Administrativo'] || adminId,
    createdDaysAgo: 15,
  }, usersMap, sectorsMap);

  // ═══════════════════════════════════════════════════════════════════════════
  // REEMBOLSO DE DESPESAS — 3 processos
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('   🧾 Reembolsos de Despesas (3)...');

  // 1. EM ANDAMENTO - Na validação documental (etapa 1)
  await createProcessInstance(company.id, {
    processTypeName: 'Reembolso de Despesas',
    title: 'Reembolso viagem a cliente - São Paulo',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      tipo_despesa: 'Transporte (Táxi/Uber)',
      motivo_despesa: 'Deslocamento para reunião presencial com cliente Banco ABC em São Paulo. Apresentação do módulo de assinaturas digitais e negociação de contrato anual.',
      centro_custo_reembolso: 'CC-COM-001',
      projeto_relacionado: 'Projeto Expansão Bancário SP',
      itens_despesa: [
        { data_item: '2026-01-15', descricao_item: 'Uber residência → Aeroporto GYN', tipo_comprovante: 'Recibo Uber', numero_documento: 'UBER-GYN-20260115', valor_item: 65 },
        { data_item: '2026-01-15', descricao_item: 'Uber Congonhas → Escritório cliente (Faria Lima)', tipo_comprovante: 'Recibo Uber', numero_documento: 'UBER-SP-20260115-1', valor_item: 85 },
        { data_item: '2026-01-15', descricao_item: 'Almoço de negócios com cliente (2 pessoas)', tipo_comprovante: 'NF-e', numero_documento: 'NF-45678', valor_item: 185 },
        { data_item: '2026-01-15', descricao_item: 'Uber escritório → Hotel ibis Paulista', tipo_comprovante: 'Recibo Uber', numero_documento: 'UBER-SP-20260115-2', valor_item: 42 },
        { data_item: '2026-01-15', descricao_item: 'Jantar (individual)', tipo_comprovante: 'NF-e', numero_documento: 'NF-45901', valor_item: 78 },
        { data_item: '2026-01-16', descricao_item: 'Uber Hotel → Congonhas', tipo_comprovante: 'Recibo Uber', numero_documento: 'UBER-SP-20260116', valor_item: 92 },
        { data_item: '2026-01-16', descricao_item: 'Uber Aeroporto GYN → residência', tipo_comprovante: 'Recibo Uber', numero_documento: 'UBER-GYN-20260116', valor_item: 58 },
      ],
      forma_recebimento: 'PIX',
      chave_pix: 'carlos@soloflow.com.br',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Financeiro',
      },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
      { status: StepExecutionStatus.PENDING },
    ],
    createdById: adminId,
    createdDaysAgo: 5,
  }, usersMap, sectorsMap);

  // 2. EM ANDAMENTO - Aprovado, aguardando pagamento (etapa 4)
  await createProcessInstance(company.id, {
    processTypeName: 'Reembolso de Despesas',
    title: 'Reembolso combustível - Visitas técnicas Janeiro',
    status: ProcessStatus.IN_PROGRESS,
    formData: {
      tipo_despesa: 'Combustível',
      motivo_despesa: 'Abastecimento de veículo próprio para visitas técnicas a 4 clientes na região metropolitana de Goiânia durante janeiro/2026.',
      centro_custo_reembolso: 'CC-OP-002',
      projeto_relacionado: 'Suporte Técnico Presencial - Contratos Premium',
      itens_despesa: [
        { data_item: '2026-01-06', descricao_item: 'Gasolina Aditivada - Posto Shell BR-153 km 5', tipo_comprovante: 'NF-e (CNPJ posto)', numero_documento: 'NF-789010', valor_item: 250 },
        { data_item: '2026-01-10', descricao_item: 'Pedágio GO-060 (ida e volta)', tipo_comprovante: 'Recibo', numero_documento: 'PED-2026-001', valor_item: 18.40 },
        { data_item: '2026-01-13', descricao_item: 'Gasolina Comum - Posto Ipiranga Av. T-63', tipo_comprovante: 'NF-e', numero_documento: 'NF-789020', valor_item: 280 },
        { data_item: '2026-01-17', descricao_item: 'Estacionamento Shopping Flamboyant (cliente Varejo+)', tipo_comprovante: 'Ticket', numero_documento: 'EST-20260117', valor_item: 25 },
        { data_item: '2026-01-20', descricao_item: 'Gasolina Aditivada - Posto BR Av. Anhanguera', tipo_comprovante: 'NF-e', numero_documento: 'NF-789030', valor_item: 265 },
        { data_item: '2026-01-22', descricao_item: 'Pedágio GO-060 (ida e volta)', tipo_comprovante: 'Recibo', numero_documento: 'PED-2026-002', valor_item: 18.40 },
      ],
      forma_recebimento: 'Transferência Bancária',
      banco: 'Banco do Brasil',
      agencia: '1234-5',
      conta: '67890-1',
      tipo_conta: 'Corrente',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Financeiro',
        metadata: {
          analise_comprovantes: [
            { item: 'Gasolina Shell', status: 'Aprovado', valor_apresentado: 250, valor_aprovado: 250, motivo_glosa: '' },
            { item: 'Pedágio 06/01', status: 'Aprovado', valor_apresentado: 18.40, valor_aprovado: 18.40, motivo_glosa: '' },
            { item: 'Gasolina Ipiranga', status: 'Aprovado', valor_apresentado: 280, valor_aprovado: 280, motivo_glosa: '' },
            { item: 'Estacionamento', status: 'Aprovado', valor_apresentado: 25, valor_aprovado: 25, motivo_glosa: '' },
            { item: 'Gasolina BR', status: 'Aprovado', valor_apresentado: 265, valor_aprovado: 265, motivo_glosa: '' },
            { item: 'Pedágio 22/01', status: 'Aprovado', valor_apresentado: 18.40, valor_aprovado: 18.40, motivo_glosa: '' },
          ],
          valor_total_aprovado: 856.80,
          comprovantes_conformes: 'Sim',
          observacoes_validacao: 'Todos os comprovantes legíveis e dentro da política de reembolso. Quilometragem compatível com visitas registradas no CRM.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.IN_PROGRESS,
        executorSector: 'Financeiro',
      },
    ],
    createdById: usersMap['Operacional'] || adminId,
    createdDaysAgo: 6,
  }, usersMap, sectorsMap);

  // 3. CONCLUÍDO - Pago
  await createProcessInstance(company.id, {
    processTypeName: 'Reembolso de Despesas',
    title: 'Reembolso materiais treinamento interno',
    status: ProcessStatus.COMPLETED,
    formData: {
      tipo_despesa: 'Material de Escritório',
      motivo_despesa: 'Compra de materiais para treinamento de integração dos 3 novos colaboradores admitidos em janeiro/2026. Materiais não disponíveis no almoxarifado.',
      centro_custo_reembolso: 'CC-RH-001',
      projeto_relacionado: 'Programa de Integração e Onboarding 2026',
      itens_despesa: [
        { data_item: '2026-01-03', descricao_item: 'Impressão apostilas (3 kits x 180 páginas, colorido, encadernado)', tipo_comprovante: 'NF-e', numero_documento: 'NF-34567', valor_item: 350 },
        { data_item: '2026-01-03', descricao_item: 'Pastas executivas personalizadas c/ logomarca (3 unidades)', tipo_comprovante: 'NF-e', numero_documento: 'NF-34568', valor_item: 150 },
        { data_item: '2026-01-03', descricao_item: 'Kit caneta Parker + bloco Moleskine (3 kits boas-vindas)', tipo_comprovante: 'NF-e', numero_documento: 'NF-34569', valor_item: 285 },
        { data_item: '2026-01-04', descricao_item: 'Banner rollup "Bem-vindos ao SoloFlow" (1.20x2.00m)', tipo_comprovante: 'NF-e', numero_documento: 'NF-34590', valor_item: 180 },
      ],
      forma_recebimento: 'PIX',
      chave_pix: 'fernanda@soloflow.com.br',
    },
    stepExecutions: [
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Financeiro',
        metadata: {
          analise_comprovantes: [
            { item: 'Apostilas', status: 'Aprovado', valor_apresentado: 350, valor_aprovado: 350, motivo_glosa: '' },
            { item: 'Pastas personalizadas', status: 'Aprovado', valor_apresentado: 150, valor_aprovado: 150, motivo_glosa: '' },
            { item: 'Kit caneta+bloco', status: 'Parcial', valor_apresentado: 285, valor_aprovado: 210, motivo_glosa: 'Política limita kit boas-vindas a R$ 70/pessoa' },
            { item: 'Banner rollup', status: 'Aprovado', valor_apresentado: 180, valor_aprovado: 180, motivo_glosa: '' },
          ],
          valor_total_aprovado: 890,
          comprovantes_conformes: 'Parcialmente',
          observacoes_validacao: 'Glosa de R$ 75,00 no item "Kit caneta+bloco" conforme política corporativa (limite R$ 70/kit). Demais itens conformes.',
        },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Diretoria',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'aprovar',
        executorSector: 'Financeiro',
        metadata: { approvalResult: 'aprovar' },
      },
      {
        status: StepExecutionStatus.COMPLETED,
        action: 'concluir',
        executorSector: 'Financeiro',
        metadata: {
          data_pagamento_reembolso: '2026-01-10',
          valor_pago_reembolso: 890,
          numero_transacao_reembolso: 'PIX-2026-00089345',
          lancamento_contabil: 'LC-2026-001234',
          observacoes_pagamento: 'Reembolso com glosa de R$ 75,00. Colaboradora notificada sobre política de limite para kits. Pagamento via PIX em 10/01.',
        },
      },
    ],
    createdById: usersMap['Recursos Humanos'] || adminId,
    createdDaysAgo: 20,
  }, usersMap, sectorsMap);

  // ============================================================================
  // ESTATÍSTICAS FINAIS
  // ============================================================================
  const stats = {
    processInstances: await prisma.processInstance.count(),
    stepExecutions: await prisma.stepExecution.count(),
    completed: await prisma.processInstance.count({ where: { status: ProcessStatus.COMPLETED } }),
    inProgress: await prisma.processInstance.count({ where: { status: ProcessStatus.IN_PROGRESS } }),
    rejected: await prisma.processInstance.count({ where: { status: ProcessStatus.REJECTED } }),
  };

  // Verificar step executions com executor
  const withExecutor = await prisma.stepExecution.count({ where: { executorId: { not: null } } });
  const withMetadata = await prisma.stepExecution.count({ where: { metadata: { not: Prisma.DbNull } } });

  console.log('\n🎉 Seed de Teste Concluído!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ESTATÍSTICAS:');
  console.log(`   Processos: ${stats.processInstances} (✅${stats.completed} 🔄${stats.inProgress} ❌${stats.rejected})`);
  console.log(`   Step Executions: ${stats.stepExecutions}`);
  console.log(`   Com executor atribuído: ${withExecutor}`);
  console.log(`   Com metadata preenchida: ${withMetadata}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erro Fatal no Seed de Teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
