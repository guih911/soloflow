import { PrismaClient, StepType, FieldType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed do banco de dados...');

  // ============================================================================
  // 1. LIMPEZA COMPLETA DO BANCO DE DADOS
  // ============================================================================
  console.log('🗑️  Limpando dados existentes...');

  try {
    await prisma.signatureRecord.deleteMany({});
    await prisma.signatureRequirement.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.stepExecution.deleteMany({});
    await prisma.processInstance.deleteMany({});
    await prisma.stepTransition.deleteMany({});
    await prisma.stepAssignment.deleteMany({});
    await prisma.stepVersion.deleteMany({});
    await prisma.formFieldVersion.deleteMany({});
    await prisma.processTypeVersion.deleteMany({});
    await prisma.processType.deleteMany({});
    await prisma.user_profiles.deleteMany({});
    await prisma.profile_process_types.deleteMany({});
    await prisma.profile_permissions.deleteMany({});
    await prisma.profiles.deleteMany({});
    await prisma.userCompany.deleteMany({});
    await prisma.sector.deleteMany({});
  } catch (e) {
    console.log('⚠️  Algumas tabelas ainda não existem, continuando...');
  }

  try {
    await prisma.auditLog.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  } catch (e) {
    console.log('⚠️  Tabelas de auditoria ainda não existem, continuando...');
  }

  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('✅ Dados limpos com sucesso!');

  // ============================================================================
  // 2. CRIAÇÃO DA EMPRESA SOLOFLOW
  // ============================================================================
  console.log('🏢 Criando empresa Soloflow...');

  const soloflow = await prisma.company.create({
    data: {
      id: uuidv4(),
      name: 'Soloflow',
      cnpj: '12.345.678/0001-99',
      email: 'contato@soloflow.com.br',
      phone: '(62) 3521-8000',
      isActive: true,
    },
  });

  console.log(`✅ Empresa criada: ${soloflow.name} (${soloflow.cnpj})`);

  // ============================================================================
  // 3. CRIAÇÃO DOS SETORES
  // ============================================================================
  console.log('🏗️  Criando setores...');

  const setores = {
    almoxarifado: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Almoxarifado',
        description: 'Setor responsável pelo controle de estoque e materiais',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    patrimonio: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Patrimônio',
        description: 'Setor responsável pelo controle patrimonial',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    compras: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Compras',
        description: 'Setor responsável pelas cotações e aquisições',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    financeiro: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Financeiro',
        description: 'Setor responsável pelo contas a pagar e receber',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    diretoria: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Diretoria',
        description: 'Diretoria executiva',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    juridico: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'Jurídico',
        description: 'Setor jurídico e compliance',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
    ti: await prisma.sector.create({
      data: {
        id: uuidv4(),
        name: 'TI',
        description: 'Tecnologia da Informação',
        companyId: soloflow.id,
        isActive: true,
      },
    }),
  };

  console.log(`✅ ${Object.keys(setores).length} setores criados`);

  // ============================================================================
  // 4. CRIAÇÃO DOS USUÁRIOS
  // ============================================================================
  console.log('👥 Criando usuários...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const usuarios = {
    admin: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Administrador do Sistema',
        email: 'admin@soloflow.com.br',
        cpf: '000.000.000-00',
        password: hashedPassword,
        isActive: true,
      },
    }),
    diretor: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Carlos Alberto - Diretor',
        email: 'diretor@soloflow.com.br',
        cpf: '222.222.222-22',
        password: hashedPassword,
        isActive: true,
      },
    }),
    compradorGestor: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Maria Silva - Gestora de Compras',
        email: 'compras@soloflow.com.br',
        cpf: '333.333.333-33',
        password: hashedPassword,
        isActive: true,
      },
    }),
    financeiro: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'João Santos - Financeiro',
        email: 'financeiro@soloflow.com.br',
        cpf: '444.444.444-44',
        password: hashedPassword,
        isActive: true,
      },
    }),
    almoxarife: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Ana Paula - Almoxarifado',
        email: 'almoxarifado@soloflow.com.br',
        cpf: '555.555.555-55',
        password: hashedPassword,
        isActive: true,
      },
    }),
    patrimonio: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Pedro Oliveira - Patrimônio',
        email: 'patrimonio@soloflow.com.br',
        cpf: '666.666.666-66',
        password: hashedPassword,
        isActive: true,
      },
    }),
    juridico: await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Dra. Fernanda Costa - Jurídico',
        email: 'juridico@soloflow.com.br',
        cpf: '777.777.777-77',
        password: hashedPassword,
        isActive: true,
      },
    }),
  };

  console.log(`✅ ${Object.keys(usuarios).length} usuários criados`);

  // ============================================================================
  // 5. VINCULAR USUÁRIOS À EMPRESA E SETORES
  // ============================================================================
  console.log('🔗 Vinculando usuários aos setores...');

  await prisma.userCompany.createMany({
    data: [
      {
        id: uuidv4(),
        userId: usuarios.admin.id,
        companyId: soloflow.id,
        role: UserRole.ADMIN,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.diretor.id,
        companyId: soloflow.id,
        sectorId: setores.diretoria.id,
        role: UserRole.ADMIN,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.compradorGestor.id,
        companyId: soloflow.id,
        sectorId: setores.compras.id,
        role: UserRole.MANAGER,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.financeiro.id,
        companyId: soloflow.id,
        sectorId: setores.financeiro.id,
        role: UserRole.USER,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.almoxarife.id,
        companyId: soloflow.id,
        sectorId: setores.almoxarifado.id,
        role: UserRole.USER,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.patrimonio.id,
        companyId: soloflow.id,
        sectorId: setores.patrimonio.id,
        role: UserRole.USER,
        isDefault: true,
      },
      {
        id: uuidv4(),
        userId: usuarios.juridico.id,
        companyId: soloflow.id,
        sectorId: setores.juridico.id,
        role: UserRole.USER,
        isDefault: true,
      },
    ],
  });

  console.log('✅ Usuários vinculados com sucesso!');

  // ============================================================================
  // 6. CRIAÇÃO DOS PERFIS DE ACESSO
  // ============================================================================
  console.log('🔐 Criando perfis de acesso...');

  const perfis = {
    administradores: await prisma.profiles.create({
      data: {
        id: uuidv4(),
        name: 'Administradores',
        description: 'Perfil com acesso total ao sistema',
        isDefault: false,
        companyId: soloflow.id,
        updatedAt: new Date(),
      },
    }),
    gestores: await prisma.profiles.create({
      data: {
        id: uuidv4(),
        name: 'Gestores',
        description: 'Perfil para gestores de setores',
        isDefault: false,
        companyId: soloflow.id,
        updatedAt: new Date(),
      },
    }),
    usuarios: await prisma.profiles.create({
      data: {
        id: uuidv4(),
        name: 'Usuários Padrão',
        description: 'Perfil básico para usuários do sistema',
        isDefault: true,
        companyId: soloflow.id,
        updatedAt: new Date(),
      },
    }),
  };

  console.log(`✅ ${Object.keys(perfis).length} perfis criados`);

  // ============================================================================
  // 7. DEFINIR PERMISSÕES DO PERFIL ADMINISTRADORES
  // ============================================================================
  console.log('⚙️  Configurando permissões dos administradores...');

  const recursos = [
    'users',
    'companies',
    'sectors',
    'processes',
    'process_types',
    'processTypes',      // ✅ ADICIONAR: frontend usa processTypes (camelCase)
    'profiles',
    'reports',
    'audit_logs',
    'dashboard',         // ✅ ADICIONAR: permissão para dashboard
    'tasks',             // ✅ ADICIONAR: permissão para tarefas
    'signatures',        // ✅ ADICIONAR: permissão para assinaturas
    'settings'           // ✅ ADICIONAR: permissão para configurações
  ];
  const acoes = ['create', 'read', 'update', 'delete', 'execute', 'approve', 'cancel', 'view', 'manage'];

  const permissoesAdmin: any[] = [];
  for (const recurso of recursos) {
    for (const acao of acoes) {
      permissoesAdmin.push({
        id: uuidv4(),
        profileId: perfis.administradores.id,
        resource: recurso,
        action: acao,
        scope: { type: 'ALL' },
        updatedAt: new Date(),
      });
    }
  }

  await prisma.profile_permissions.createMany({ data: permissoesAdmin });

  console.log(`✅ ${permissoesAdmin.length} permissões criadas para administradores`);

  // ============================================================================
  // 8. ATRIBUIR PERFIL DE ADMINISTRADOR
  // ============================================================================
  console.log('👤 Atribuindo perfil de Administradores...');

  await prisma.user_profiles.create({
    data: {
      id: uuidv4(),
      userId: usuarios.admin.id,
      companyId: soloflow.id,
      profileId: perfis.administradores.id,
      assignedBy: usuarios.admin.id,
    },
  });

  await prisma.user_profiles.create({
    data: {
      id: uuidv4(),
      userId: usuarios.diretor.id,
      companyId: soloflow.id,
      profileId: perfis.administradores.id,
      assignedBy: usuarios.admin.id,
    },
  });

  console.log('✅ Perfis atribuídos aos administradores!');

  // ============================================================================
  // 9. CRIAÇÃO DO PROCESSO DE COMPRA
  // ============================================================================
  console.log('📋 Criando processo de Solicitação de Compras...');

  const processoCompra = await prisma.processType.create({
    data: {
      id: uuidv4(),
      name: 'Solicitação de Compras',
      description: 'Fluxo completo de processo de compras: solicitação via email/almoxarifado/patrimônio → aprovação com assinatura digital → cotação (mín. 3 orçamentos) → parecer técnico → aprovação final com assinatura digital → emissão de pedido → recebimento → lançamento de nota fiscal',
      companyId: soloflow.id,
      isActive: true,
    },
  });

  const versaoProcessoCompra = await prisma.processTypeVersion.create({
    data: {
      id: uuidv4(),
      processTypeId: processoCompra.id,
      version: 1,
      versionLabel: 'v1.0 - Fluxo Wareline com Assinatura Digital',
      description: 'Processo de compras com integração ao Wareline e assinaturas digitais do Soloflow',
      isActive: true,
      isDraft: false,
      publishedAt: new Date(),
      changelog: 'Versão inicial - Fluxo completo de solicitação até contas a pagar com assinatura digital',
    },
  });

  console.log('✅ Processo de compra criado!');

  // ============================================================================
  // 10. CAMPOS DO FORMULÁRIO
  // ============================================================================
  console.log('📝 Criando campos do formulário...');

  await prisma.formFieldVersion.createMany({
    data: [
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'origem_solicitacao',
        label: 'Origem da Solicitação',
        type: FieldType.DROPDOWN,
        required: true,
        order: 1,
        options: JSON.stringify(['Email', 'Almoxarifado', 'Patrimônio']),
        helpText: 'Selecione de onde partiu a solicitação de compra',
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'descricao_item',
        label: 'Descrição do Item/Serviço',
        type: FieldType.TEXTAREA,
        required: true,
        order: 2,
        placeholder: 'Descreva detalhadamente o item ou serviço a ser adquirido',
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'quantidade',
        label: 'Quantidade',
        type: FieldType.NUMBER,
        required: true,
        order: 3,
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'justificativa',
        label: 'Justificativa da Compra',
        type: FieldType.TEXTAREA,
        required: true,
        order: 4,
        placeholder: 'Explique a necessidade da aquisição',
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'centro_custo',
        label: 'Centro de Custo',
        type: FieldType.TEXT,
        required: true,
        order: 5,
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'urgencia',
        label: 'Nível de Urgência',
        type: FieldType.DROPDOWN,
        required: true,
        order: 6,
        options: JSON.stringify(['Baixa', 'Média', 'Alta', 'Urgente']),
      },
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        name: 'valor_estimado',
        label: 'Valor Estimado',
        type: FieldType.CURRENCY,
        required: false,
        order: 7,
        helpText: 'Informe se já tiver uma estimativa de valor',
      },
    ],
  });

  console.log('✅ Campos do formulário criados!');

  // ============================================================================
  // 11. ETAPAS DO PROCESSO (STEPS)
  // ============================================================================
  console.log('🔄 Criando etapas do workflow...');

  // ETAPA 1: Solicitação via Email/Almoxarifado/Patrimônio
  const step1 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Solicitação de Compra',
      description: 'Solicitação via email, almoxarifado ou patrimônio - Lançamento no sistema Wareline',
      instructions: 'Preencha todos os dados da solicitação e anexe documentos necessários (emails, especificações técnicas, etc.). O sistema registrará automaticamente a solicitação no Wareline.',
      order: 1,
      type: StepType.INPUT,
      slaDays: 1,
      assignedToCreator: true,
      allowAttachment: true,
      requireAttachment: false,
    },
  });

  // ETAPA 2: Aprovação com Assinatura Digital (vira cotação)
  const step2 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Aprovação Inicial - Assinatura Digital',
      description: 'Aprovação da solicitação via assinatura digital do Soloflow. Após aprovação, vira cotação no Wareline.',
      instructions: 'Analisar a solicitação e aprovar/reprovar utilizando assinatura digital do sistema. A aprovação converte automaticamente a solicitação em cotação no Wareline. Anexar documentos de suporte se necessário.',
      order: 2,
      type: StepType.SIGNATURE,
      slaDays: 3,
      allowAttachment: true,
      requireAttachment: false,
      requiresSignature: true,
    },
  });

  // ETAPA 3: Cotação de Preços
  const step3 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Cotação de Preços',
      description: 'Setor de Compras realiza cotação com fornecedores. Anexar mínimo 3 orçamentos.',
      instructions: 'Buscar cotações com fornecedores e anexar os orçamentos. É OBRIGATÓRIO pelo menos 3 cotações para comparação. Registrar cotações no Wareline e anexar orçamentos detalhados no Soloflow.',
      order: 3,
      type: StepType.UPLOAD,
      slaDays: 7,
      allowAttachment: true,
      requireAttachment: true,
      minAttachments: 3,
      allowedFileTypes: JSON.stringify(['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png']),
    },
  });

  // ETAPA 4: Parecer Técnico
  const step4 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Parecer Técnico',
      description: 'Análise técnica das cotações pelo setor especializado (TI, Almoxarifado, etc.)',
      instructions: 'Analisar as especificações técnicas dos produtos/serviços cotados, comparar com as necessidades e emitir parecer técnico. Anexar documento de parecer assinado digitalmente.',
      order: 4,
      type: StepType.REVIEW,
      slaDays: 5,
      allowAttachment: true,
      requireAttachment: true,
      minAttachments: 1,
      allowedFileTypes: JSON.stringify(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    },
  });

  // ETAPA 5: Aprovação Final com Assinatura Digital (vira pedido)
  const step5 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Aprovação Final - Assinatura Digital',
      description: 'Aprovação das cotações e parecer técnico via assinatura digital. Após aprovação, vira pedido de compra no Wareline.',
      instructions: 'Revisar todas as cotações apresentadas e o parecer técnico. Aprovar/reprovar usando assinatura digital do Soloflow. A aprovação transforma automaticamente a cotação em pedido de compra no Wareline.',
      order: 5,
      type: StepType.SIGNATURE,
      slaDays: 4,
      allowAttachment: true,
      requireAttachment: false,
      requiresSignature: true,
    },
  });

  // ETAPA 6: Emissão do Pedido de Compra
  const step6 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Emissão do Pedido de Compra',
      description: 'Setor de Compras emite o pedido formal ao fornecedor selecionado',
      instructions: 'Gerar pedido de compra no Wareline com base na cotação aprovada, enviar ao fornecedor e anexar cópia do pedido emitido com confirmação de envio (email, protocolo, etc.).',
      order: 6,
      type: StepType.INPUT,
      slaDays: 2,
      allowAttachment: true,
      requireAttachment: true,
      minAttachments: 1,
      allowedFileTypes: JSON.stringify(['application/pdf', 'image/jpeg', 'image/png']),
    },
  });

  // ETAPA 7: Recebimento e Conferência
  const step7 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Recebimento e Conferência',
      description: 'Almoxarifado/Patrimônio recebe o produto/serviço e confere conforme pedido',
      instructions: 'Conferir itens recebidos (quantidade, especificações, qualidade), verificar conformidade com o pedido de compra e anexar documento de recebimento assinado digitalmente ou termo de conferência.',
      order: 7,
      type: StepType.INPUT,
      slaDays: 1,
      allowAttachment: true,
      requireAttachment: true,
      minAttachments: 1,
      allowedFileTypes: JSON.stringify(['application/pdf', 'image/jpeg', 'image/png']),
    },
  });

  // ETAPA 8: Lançamento da Nota Fiscal no Contas a Pagar
  const step8 = await prisma.stepVersion.create({
    data: {
      id: uuidv4(),
      processTypeVersionId: versaoProcessoCompra.id,
      name: 'Lançamento da Nota Fiscal - Contas a Pagar',
      description: 'Financeiro lança a nota fiscal no sistema de contas a pagar após confirmação do recebimento',
      instructions: 'Receber nota fiscal do fornecedor, conferir valores, impostos e condições de pagamento. Lançar no sistema Wareline (módulo contas a pagar) e anexar NF-e (XML e PDF) e boleto/dados bancários no Soloflow.',
      order: 8,
      type: StepType.INPUT,
      slaDays: 2,
      allowAttachment: true,
      requireAttachment: true,
      minAttachments: 1,
      allowedFileTypes: JSON.stringify(['application/pdf', 'application/xml', 'image/jpeg', 'image/png']),
    },
  });

  const steps = [step1, step2, step3, step4, step5, step6, step7, step8];
  console.log(`✅ ${steps.length} etapas criadas!`);

  // ============================================================================
  // 12. ATRIBUIÇÕES DE ETAPAS AOS SETORES
  // ============================================================================
  console.log('👔 Atribuindo etapas aos setores...');

  await prisma.stepAssignment.createMany({
    data: [
      // Step 2: Aprovação Inicial - Diretoria
      {
        id: uuidv4(),
        stepVersionId: step2.id,
        type: 'SECTOR',
        sectorId: setores.diretoria.id,
        priority: 1,
        isActive: true,
      },
      // Step 3: Cotação - Setor de Compras
      {
        id: uuidv4(),
        stepVersionId: step3.id,
        type: 'SECTOR',
        sectorId: setores.compras.id,
        priority: 1,
        isActive: true,
      },
      // Step 4: Parecer Técnico - TI (principal) e outros setores
      {
        id: uuidv4(),
        stepVersionId: step4.id,
        type: 'SECTOR',
        sectorId: setores.ti.id,
        priority: 1,
        isActive: true,
      },
      {
        id: uuidv4(),
        stepVersionId: step4.id,
        type: 'SECTOR',
        sectorId: setores.almoxarifado.id,
        priority: 2,
        isActive: true,
      },
      {
        id: uuidv4(),
        stepVersionId: step4.id,
        type: 'SECTOR',
        sectorId: setores.patrimonio.id,
        priority: 3,
        isActive: true,
      },
      // Step 5: Aprovação Final - Diretoria
      {
        id: uuidv4(),
        stepVersionId: step5.id,
        type: 'SECTOR',
        sectorId: setores.diretoria.id,
        priority: 1,
        isActive: true,
      },
      // Step 6: Emissão do Pedido - Compras
      {
        id: uuidv4(),
        stepVersionId: step6.id,
        type: 'SECTOR',
        sectorId: setores.compras.id,
        priority: 1,
        isActive: true,
      },
      // Step 7: Recebimento - Almoxarifado e Patrimônio
      {
        id: uuidv4(),
        stepVersionId: step7.id,
        type: 'SECTOR',
        sectorId: setores.almoxarifado.id,
        priority: 1,
        isActive: true,
      },
      {
        id: uuidv4(),
        stepVersionId: step7.id,
        type: 'SECTOR',
        sectorId: setores.patrimonio.id,
        priority: 2,
        isActive: true,
      },
      // Step 8: Lançamento NF - Financeiro
      {
        id: uuidv4(),
        stepVersionId: step8.id,
        type: 'SECTOR',
        sectorId: setores.financeiro.id,
        priority: 1,
        isActive: true,
      },
    ],
  });

  console.log('✅ Atribuições de etapas criadas!');

  // ============================================================================
  // 13. REQUISITOS DE ASSINATURA DIGITAL
  // ============================================================================
  console.log('✍️  Configurando requisitos de assinatura digital...');

  // Assinatura na Etapa 2 - Aprovação Inicial (Diretoria)
  await prisma.signatureRequirement.create({
    data: {
      id: uuidv4(),
      stepVersionId: step2.id,
      sectorId: setores.diretoria.id,
      order: 1,
      type: 'SEQUENTIAL',
      isRequired: true,
      description: 'Assinatura digital da Diretoria para aprovação inicial da solicitação',
    },
  });

  // Assinatura na Etapa 5 - Aprovação Final (Diretoria)
  await prisma.signatureRequirement.create({
    data: {
      id: uuidv4(),
      stepVersionId: step5.id,
      sectorId: setores.diretoria.id,
      order: 1,
      type: 'SEQUENTIAL',
      isRequired: true,
      description: 'Assinatura digital da Diretoria para aprovação final do pedido de compra',
    },
  });

  console.log('✅ Requisitos de assinatura configurados!');

  // ============================================================================
  // 14. TRANSIÇÕES ENTRE ETAPAS
  // ============================================================================
  console.log('➡️  Criando transições entre etapas...');

  await prisma.stepTransition.createMany({
    data: [
      // Step 1 -> Step 2 (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step1.id,
        targetStepId: step2.id,
        name: 'Enviar para Aprovação',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
      // Step 2 -> Step 3 (aprovado)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step2.id,
        targetStepId: step3.id,
        name: 'Aprovado - Iniciar Cotação',
        conditionType: 'ACTION_BASED',
        conditions: JSON.stringify({ action: 'approve' }),
        priority: 1,
        isActive: true,
      },
      // Step 2 -> END (reprovado)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step2.id,
        targetStepId: null,
        name: 'Reprovado - Encerrar Processo',
        conditionType: 'ACTION_BASED',
        conditions: JSON.stringify({ action: 'reject' }),
        priority: 2,
        isActive: true,
      },
      // Step 3 -> Step 4 (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step3.id,
        targetStepId: step4.id,
        name: 'Enviar para Parecer Técnico',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
      // Step 4 -> Step 5 (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step4.id,
        targetStepId: step5.id,
        name: 'Enviar para Aprovação Final',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
      // Step 5 -> Step 6 (aprovado)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step5.id,
        targetStepId: step6.id,
        name: 'Aprovado - Emitir Pedido',
        conditionType: 'ACTION_BASED',
        conditions: JSON.stringify({ action: 'approve' }),
        priority: 1,
        isActive: true,
      },
      // Step 5 -> END (reprovado)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step5.id,
        targetStepId: null,
        name: 'Reprovado - Encerrar',
        conditionType: 'ACTION_BASED',
        conditions: JSON.stringify({ action: 'reject' }),
        priority: 2,
        isActive: true,
      },
      // Step 6 -> Step 7 (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step6.id,
        targetStepId: step7.id,
        name: 'Aguardar Recebimento',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
      // Step 7 -> Step 8 (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step7.id,
        targetStepId: step8.id,
        name: 'Encaminhar para Contas a Pagar',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
      // Step 8 -> END (sempre)
      {
        id: uuidv4(),
        processTypeVersionId: versaoProcessoCompra.id,
        sourceStepId: step8.id,
        targetStepId: null,
        name: 'Finalizar Processo',
        conditionType: 'ALWAYS',
        priority: 1,
        isActive: true,
      },
    ],
  });

  console.log('✅ Transições criadas!');

  // ============================================================================
  // 15. VINCULAR PERFIL AO PROCESSO
  // ============================================================================
  console.log('🔗 Vinculando perfis aos processos...');

  await prisma.profile_process_types.createMany({
    data: [
      {
        id: uuidv4(),
        profileId: perfis.administradores.id,
        processTypeId: processoCompra.id,
        canView: true,
        canCreate: true,
        canExecute: true,
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        profileId: perfis.gestores.id,
        processTypeId: processoCompra.id,
        canView: true,
        canCreate: true,
        canExecute: true,
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        profileId: perfis.usuarios.id,
        processTypeId: processoCompra.id,
        canView: true,
        canCreate: true,
        canExecute: false,
        updatedAt: new Date(),
      },
    ],
  });

  console.log('✅ Perfis vinculados ao processo!');

  // ============================================================================
  // 16. RESUMO FINAL
  // ============================================================================
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n📊 RESUMO:');
  console.log(`   🏢 Empresa: ${soloflow.name}`);
  console.log(`   🏗️  Setores: ${Object.keys(setores).length}`);
  console.log(`   👥 Usuários: ${Object.keys(usuarios).length}`);
  console.log(`   🔐 Perfis: ${Object.keys(perfis).length}`);
  console.log(`   📋 Processos: 1 (Solicitação de Compras com Assinatura Digital)`);
  console.log(`   🔄 Etapas: ${steps.length}`);
  console.log(`   ✍️  Requisitos de Assinatura: 2 etapas configuradas`);
  console.log(`   📄 Instâncias: 0 (nenhuma instância criada)`);
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔑 CREDENCIAIS DE ACESSO:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n👨‍💼 ADMINISTRADOR (Acesso Total):');
  console.log('   Email: admin@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('   Perfil: Administradores ✅');
  console.log('\n👔 DIRETOR:');
  console.log('   Email: diretor@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('   Perfil: Administradores ✅');
  console.log('   Setor: Diretoria');
  console.log('\n🛒 COMPRAS:');
  console.log('   Email: compras@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('\n💰 FINANCEIRO:');
  console.log('   Email: financeiro@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('\n📦 ALMOXARIFADO:');
  console.log('   Email: almoxarifado@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('\n🏛️  PATRIMÔNIO:');
  console.log('   Email: patrimonio@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('\n⚖️  JURÍDICO:');
  console.log('   Email: juridico@soloflow.com.br');
  console.log('   Senha: admin123');
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 FLUXO DO PROCESSO DE COMPRAS (ASSINATURA DIGITAL):');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  Solicitação de Compra (Email/Almoxarifado/Patrimônio)');
  console.log('2️⃣  Aprovação Inicial com ASSINATURA DIGITAL → Vira Cotação');
  console.log('3️⃣  Cotação de Preços (mín. 3 orçamentos obrigatórios)');
  console.log('4️⃣  Parecer Técnico (TI/Almoxarifado/Patrimônio)');
  console.log('5️⃣  Aprovação Final com ASSINATURA DIGITAL → Vira Pedido');
  console.log('6️⃣  Emissão do Pedido de Compra');
  console.log('7️⃣  Recebimento e Conferência');
  console.log('8️⃣  Lançamento da Nota Fiscal no Contas a Pagar');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n🎯 DESTAQUES:');
  console.log('   ✅ Assinaturas DIGITAIS do Soloflow (etapas 2 e 5)');
  console.log('   ✅ Integração paralela com sistema Wareline');
  console.log('   ✅ Transições automáticas: Solicitação → Cotação → Pedido');
  console.log('   ✅ Controle de anexos obrigatórios');
  console.log('   ✅ Perfil Administradores atribuído a admin e diretor');
  console.log('   ✅ Nenhuma instância criada (banco limpo)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
