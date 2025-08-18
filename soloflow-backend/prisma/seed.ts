import { PrismaClient, UserRole, StepType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar empresa padrão
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0000-00' },
    update: {},
    create: {
      name: 'Empresa Demo',
      cnpj: '00.000.000/0000-00',
      email: 'contato@demo.com',
      phone: '(11) 99999-9999',
    },
  });

  // Criar setores
  const sectorRH = await prisma.sector.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Recursos Humanos',
      },
    },
    update: {},
    create: {
      name: 'Recursos Humanos',
      description: 'Setor de RH',
      companyId: company.id,
    },
  });

  const sectorFinanceiro = await prisma.sector.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Financeiro',
      },
    },
    update: {},
    create: {
      name: 'Financeiro',
      description: 'Setor Financeiro',
      companyId: company.id,
    },
  });

  const sectorTI = await prisma.sector.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'TI',
      },
    },
    update: {},
    create: {
      name: 'TI',
      description: 'Tecnologia da Informação',
      companyId: company.id,
    },
  });

  const sectorJuridico = await prisma.sector.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Jurídico',
      },
    },
    update: {},
    create: {
      name: 'Jurídico',
      description: 'Departamento Jurídico',
      companyId: company.id,
    },
  });

  // Criar usuários
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@demo.com',
      password: hashedPassword,
    },
  });

  // Criar vínculo do admin com a empresa
  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: adminUser.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      companyId: company.id,
      role: UserRole.ADMIN,
      isDefault: true,
    },
  });

  // Manager RH
  const managerUser = await prisma.user.upsert({
    where: { email: 'gerente@demo.com' },
    update: {},
    create: {
      name: 'Gerente RH',
      email: 'gerente@demo.com',
      password: hashedPassword,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: managerUser.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: managerUser.id,
      companyId: company.id,
      sectorId: sectorRH.id,
      role: UserRole.MANAGER,
      isDefault: true,
    },
  });

  // User Financeiro
  const userFinanceiro = await prisma.user.upsert({
    where: { email: 'financeiro@demo.com' },
    update: {},
    create: {
      name: 'Analista Financeiro',
      email: 'financeiro@demo.com',
      password: hashedPassword,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: userFinanceiro.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: userFinanceiro.id,
      companyId: company.id,
      sectorId: sectorFinanceiro.id,
      role: UserRole.USER,
      isDefault: true,
    },
  });

  // User Jurídico
  const userJuridico = await prisma.user.upsert({
    where: { email: 'juridico@demo.com' },
    update: {},
    create: {
      name: 'Analista Jurídico',
      email: 'juridico@demo.com',
      password: hashedPassword,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: userJuridico.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      userId: userJuridico.id,
      companyId: company.id,
      sectorId: sectorJuridico.id,
      role: UserRole.USER,
      isDefault: true,
    },
  });

  // ✅ MELHORADO: Tipo de processo - Solicitação de Férias com SLA e instruções detalhadas
  const processTypeFerias = await prisma.processType.create({
    data: {
      name: 'Solicitação de Férias',
      description: 'Processo completo para solicitação de férias dos colaboradores com controle de prazos',
      companyId: company.id,
      steps: {
        create: [
          {
            name: 'Preencher Solicitação',
            description: 'Colaborador preenche os dados da solicitação de férias',
            instructions: `📋 INSTRUÇÕES PARA PREENCHIMENTO:

• Verifique seu saldo de férias antes de solicitar
• Informe as datas de início e fim das férias desejadas
• Certifique-se de que não há conflitos com projetos importantes
• Anexe documentos se necessário (atestados médicos, etc.)
• Confirme os dados antes de enviar

⚠️ ATENÇÃO: Após enviar, a solicitação não poderá ser alterada. Em caso de erro, será necessário cancelar e criar nova solicitação.`,
            slaHours: 24,
            type: StepType.INPUT,
            order: 1,
            allowAttachment: true,
            requiresSignature: false,
            actions: ['enviar'],
          },
          {
            name: 'Aprovação do Gestor Direto',
            description: 'Gestor imediato analisa e aprova/rejeita a solicitação',
            instructions: `🔍 CRITÉRIOS PARA ANÁLISE:

• Verificar se as datas não conflitam com entregas importantes
• Confirmar se o colaborador possui saldo de férias suficiente
• Avaliar impacto na equipe e projetos em andamento
• Verificar se há cobertura adequada durante o período
• Consultar cronograma de férias da equipe

✅ APROVAÇÃO: Quando todos os critérios estão atendidos
❌ REJEIÇÃO: Quando há impedimentos justificáveis (sempre informar motivo no comentário)`,
            slaHours: 48,
            type: StepType.APPROVAL,
            order: 2,
            allowAttachment: true,
            requiresSignature: false,
            actions: ['aprovar', 'rejeitar'],
            assignedToSectorId: sectorRH.id,
            conditions: {
              aprovar: 3,
              rejeitar: 'END'
            },
          },
          {
            name: 'Validação Final RH',
            description: 'RH valida disponibilidade final e processa a solicitação',
            instructions: `📊 VALIDAÇÕES OBRIGATÓRIAS DO RH:

• Confirmar saldo de férias no sistema
• Verificar cumprimento da legislação trabalhista
• Validar período aquisitivo e vencimentos
• Atualizar cronograma geral de férias
• Verificar documentação anexada

📝 PROCESSOS ADMINISTRATIVOS:
• Gerar termo de férias para assinatura
• Atualizar sistema de ponto/frequência
• Comunicar setores relacionados (TI, Segurança, etc.)
• Arquivar documentação no prontuário

⚡ URGÊNCIA: Esta etapa deve ser concluída rapidamente para garantir o planejamento do colaborador.`,
            slaHours: 72,
            type: StepType.REVIEW,
            order: 3,
            allowAttachment: true,
            requiresSignature: true,
            actions: ['aprovar', 'devolver'],
            assignedToSectorId: sectorRH.id,
          },
        ],
      },
    },
  });

  // ✅ NOVO: Tipo de processo - Solicitação de Compra com múltiplos tipos de etapa e SLAs diferenciados
  const processTypeCompra = await prisma.processType.create({
    data: {
      name: 'Solicitação de Compra',
      description: 'Processo completo de aquisição com cotações, aprovações e contratos',
      companyId: company.id,
      formFields: {
        create: [
          {
            name: 'descricao_item',
            label: 'Descrição do Item',
            type: 'TEXT',
            required: true,
            order: 1,
            placeholder: 'Descreva detalhadamente o item a ser comprado',
          },
          {
            name: 'quantidade',
            label: 'Quantidade',
            type: 'NUMBER',
            required: true,
            order: 2,
            validations: {
              min: 1,
              max: 9999,
            },
          },
          {
            name: 'valor_estimado',
            label: 'Valor Estimado',
            type: 'CURRENCY',
            required: true,
            order: 3,
            placeholder: '0.00',
          },
          {
            name: 'justificativa',
            label: 'Justificativa Comercial',
            type: 'TEXTAREA',
            required: true,
            order: 4,
            placeholder: 'Explique a necessidade comercial e impacto da compra',
          },
          {
            name: 'urgencia',
            label: 'Nível de Urgência',
            type: 'DROPDOWN',
            required: true,
            order: 5,
            options: [
              { value: 'baixa', label: 'Baixa - Até 30 dias' },
              { value: 'media', label: 'Média - Até 15 dias' },
              { value: 'alta', label: 'Alta - Até 7 dias' },
              { value: 'urgente', label: 'Urgente - Até 3 dias' },
            ],
          },
          {
            name: 'especificacoes',
            label: 'Especificações Técnicas',
            type: 'FILE',
            required: false,
            order: 6,
            placeholder: 'Anexe especificações técnicas se necessário',
            validations: {
              maxFiles: 3,
              allowedTypes: ['.pdf', '.doc', '.docx'],
              maxSize: 5242880 // 5MB
            }
          },
        ],
      },
      steps: {
        create: [
          {
            name: 'Criação da Solicitação',
            description: 'Solicitante preenche dados detalhados da compra',
            instructions: `📝 PREENCHIMENTO DA SOLICITAÇÃO:

• Seja específico na descrição do item (marca, modelo, características)
• Pesquise valores de referência no mercado
• Justifique claramente a necessidade do negócio
• Defina prazo realista conforme urgência
• Anexe especificações técnicas quando aplicável

💡 DICAS IMPORTANTES:
• Solicitações bem detalhadas aceleram o processo
• Valores estimados ajudam na negociação
• Justificativas sólidas facilitam aprovações`,
            slaHours: 12,
            type: StepType.INPUT,
            order: 1,
            allowAttachment: true,
            requiresSignature: false,
            actions: ['enviar'],
          },
          {
            name: 'Coleta de Cotações',
            description: 'Financeiro busca cotações de fornecedores',
            instructions: `💰 PROCESSO DE COTAÇÃO:

📋 OBRIGATÓRIO:
• Obter mínimo 3 cotações de fornecedores diferentes
• Verificar idoneidade dos fornecedores (CNPJ ativo, certidões)
• Comparar preços, prazos e condições de pagamento
• Negociar melhores condições quando possível

📎 DOCUMENTAÇÃO NECESSÁRIA:
• Salvar cotações em PDF
• Preencher planilha comparativa
• Verificar garantias e assistência técnica
• Documentar observações sobre cada fornecedor

⏰ PRAZO CRÍTICO: Este processo define a viabilidade econômica da compra.`,
            slaHours: 120, // 5 dias úteis
            type: StepType.UPLOAD,
            order: 2,
            allowAttachment: true,
            requireAttachment: true,
            minAttachments: 3,
            requiresSignature: false,
            actions: ['enviar'],
            assignedToUserId: userFinanceiro.id,
          },
          {
            name: 'Aprovação Financeira',
            description: 'Análise e aprovação orçamentária',
            instructions: `💼 ANÁLISE FINANCEIRA COMPLETA:

🔍 VERIFICAÇÕES OBRIGATÓRIAS:
• Confirmar disponibilidade orçamentária
• Analisar custo-benefício das opções
• Verificar conformidade com políticas de compras
• Avaliar impacto no fluxo de caixa

📊 CRITÉRIOS DE APROVAÇÃO:
• Valor dentro do orçamento aprovado
• Fornecedor com menor preço E melhor condição
• Prazo de entrega compatível com necessidade
• Garantias adequadas ao tipo de produto

⚠️ EM CASO DE REJEIÇÃO: Informar claramente os motivos e sugerir alternativas.`,
            slaHours: 24,
            type: StepType.APPROVAL,
            order: 3,
            allowAttachment: true,
            requiresSignature: false,
            actions: ['aprovar', 'rejeitar', 'solicitar_revisao'],
            assignedToSectorId: sectorFinanceiro.id,
            conditions: {
              aprovar: 4,
              rejeitar: 'END',
              solicitar_revisao: 2
            },
          },
          {
            name: 'Revisão Jurídica',
            description: 'Análise de contratos e aspectos legais',
            instructions: `⚖️ ANÁLISE JURÍDICA DETALHADA:

📋 DOCUMENTOS PARA REVISÃO:
• Contrato ou proposta comercial
• Termos e condições de fornecimento
• Cláusulas de garantia e assistência
• Condições de pagamento e penalidades

🔍 PONTOS DE ATENÇÃO:
• Verificar cláusulas abusivas ou desequilibradas
• Confirmar adequação à legislação vigente
• Analisar responsabilidades de cada parte
• Validar foro e legislação aplicável

✅ APROVAÇÃO FINAL: Confirma que todos os aspectos legais estão adequados e o contrato pode ser assinado.`,
            slaHours: 48,
            type: StepType.REVIEW,
            order: 4,
            allowAttachment: true,
            requiresSignature: true,
            actions: ['aprovar', 'solicitar_ajustes'],
            assignedToSectorId: sectorJuridico.id,
            conditions: {
              aprovar: 5,
              solicitar_ajustes: 3
            },
          },
          {
            name: 'Assinatura do Contrato',
            description: 'Assinatura digital do contrato final',
            instructions: `✍️ ASSINATURA DIGITAL DO CONTRATO:

📄 DOCUMENTO FINAL:
• Revisar todos os termos antes de assinar
• Verificar dados das partes (CNPJ, endereços)
• Confirmar valores, prazos e condições
• Validar anexos e especificações técnicas

🔐 PROCESSO DE ASSINATURA:
• Utilizar certificado digital válido
• Verificar integridade do documento
• Salvar cópia assinada em local seguro
• Comunicar conclusão aos interessados

✅ CONCLUSÃO: Após assinatura, o processo está finalizado e a compra autorizada.`,
            slaHours: 24,
            type: StepType.SIGNATURE,
            order: 5,
            allowAttachment: true,
            requireAttachment: true,
            requiresSignature: true,
            actions: ['assinar', 'solicitar_correcao'],
            assignedToUserId: adminUser.id,
            conditions: {
              assinar: 'END',
              solicitar_correcao: 4
            },
          },
        ],
      },
    },
  });

  // ✅ NOVO: Processo simples para demonstrar diferentes tipos de etapa
  const processTypeOnboarding = await prisma.processType.create({
    data: {
      name: 'Onboarding de Funcionário',
      description: 'Processo de integração de novos colaboradores',
      companyId: company.id,
      formFields: {
        create: [
          {
            name: 'nome_funcionario',
            label: 'Nome Completo',
            type: 'TEXT',
            required: true,
            order: 1,
          },
          {
            name: 'cargo',
            label: 'Cargo',
            type: 'TEXT',
            required: true,
            order: 2,
          },
          {
            name: 'setor',
            label: 'Setor',
            type: 'DROPDOWN',
            required: true,
            order: 3,
            options: [
              { value: 'rh', label: 'Recursos Humanos' },
              { value: 'ti', label: 'Tecnologia' },
              { value: 'financeiro', label: 'Financeiro' },
              { value: 'juridico', label: 'Jurídico' },
            ],
          },
          {
            name: 'data_inicio',
            label: 'Data de Início',
            type: 'DATE',
            required: true,
            order: 4,
          },
        ],
      },
      steps: {
        create: [
          {
            name: 'Cadastro de Dados',
            description: 'RH registra informações básicas do novo funcionário',
            instructions: `👤 CADASTRO DE NOVO FUNCIONÁRIO:

📋 DADOS OBRIGATÓRIOS:
• Nome completo conforme documentos
• Cargo exato conforme contratação
• Setor de lotação
• Data de início das atividades

⚠️ IMPORTANTE: Dados incorretos podem gerar problemas trabalhistas e administrativos.`,
            slaHours: 4,
            type: StepType.INPUT,
            order: 1,
            actions: ['cadastrar'],
            assignedToSectorId: sectorRH.id,
          },
          {
            name: 'Preparação do Ambiente',
            description: 'TI configura equipamentos e acessos',
            instructions: `💻 SETUP TECNOLÓGICO:

🔧 CONFIGURAÇÕES NECESSÁRIAS:
• Criar usuário de rede corporativa
• Configurar e-mail institucional
• Instalar softwares necessários ao cargo
• Preparar equipamentos (notebook, celular, etc.)
• Configurar acessos aos sistemas corporativos

📱 ENTREGA DE EQUIPAMENTOS:
• Notebook com softwares instalados
• Celular corporativo (se aplicável)
• Acessórios necessários (mouse, fone, etc.)

⏰ PRAZO: Equipamentos devem estar prontos antes do primeiro dia de trabalho.`,
            slaHours: 48,
            type: StepType.UPLOAD,
            order: 2,
            allowAttachment: true,
            actions: ['configurar'],
            assignedToSectorId: sectorTI.id,
          },
          {
            name: 'Entrega de Documentos',
            description: 'Funcionário entrega documentação pessoal',
            instructions: `📄 DOCUMENTAÇÃO PESSOAL OBRIGATÓRIA:

🆔 DOCUMENTOS DE IDENTIDADE:
• RG e CPF (cópia autenticada)
• Carteira de Trabalho
• Título de Eleitor
• Certificado de Reservista (se aplicável)

🏠 COMPROVANTES:
• Comprovante de residência atualizado
• Comprovante de escolaridade
• Certidão de nascimento/casamento

👨‍👩‍👧‍👦 DEPENDENTES (se houver):
• Certidão de nascimento dos filhos
• Cartão de vacinação (menores de 14 anos)
• Comprovante de matrícula escolar

📋 OBSERVAÇÕES: Todos os documentos devem ser legíveis e dentro da validade.`,
            slaHours: 8,
            type: StepType.UPLOAD,
            order: 3,
            allowAttachment: true,
            requireAttachment: true,
            minAttachments: 5,
            actions: ['entregar'],
          },
          {
            name: 'Aprovação Final',
            description: 'Gestor aprova conclusão do onboarding',
            instructions: `✅ VALIDAÇÃO FINAL DO ONBOARDING:

🔍 VERIFICAÇÕES FINAIS:
• Confirmar que todos os equipamentos foram entregues
• Validar que documentação está completa
• Verificar criação de acessos e e-mail
• Confirmar preparação do ambiente de trabalho

👥 INTEGRAÇÃO DA EQUIPE:
• Apresentar novo funcionário à equipe
• Explicar dinâmica de trabalho
• Definir agenda da primeira semana
• Agendar follow-ups de acompanhamento

📊 APROVAÇÃO: Confirma que o funcionário está pronto para iniciar atividades produtivas.`,
            slaHours: 4,
            type: StepType.APPROVAL,
            order: 4,
            actions: ['aprovar', 'solicitar_pendencias'],
            assignedToSectorId: sectorRH.id,
          },
        ],
      },
    },
  });

  console.log('✅ Seed executado com sucesso!');
  console.log('');
  console.log('👥 USUÁRIOS CRIADOS:');
  console.log('• admin@demo.com (senha: admin123) - Administrador');
  console.log('• gerente@demo.com (senha: admin123) - Gerente RH');
  console.log('• financeiro@demo.com (senha: admin123) - Analista Financeiro');
  console.log('• juridico@demo.com (senha: admin123) - Analista Jurídico');
  console.log('');
  console.log('🏢 SETORES CRIADOS:');
  console.log('• Recursos Humanos');
  console.log('• Financeiro');
  console.log('• TI');
  console.log('• Jurídico');
  console.log('');
  console.log('📋 TIPOS DE PROCESSO CRIADOS:');
  console.log('• Solicitação de Férias (3 etapas com SLA e instruções)');
  console.log('• Solicitação de Compra (5 etapas com todos os tipos)');
  console.log('• Onboarding de Funcionário (4 etapas demonstrativas)');
  console.log('');
  console.log('🚀 Sistema pronto para uso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });