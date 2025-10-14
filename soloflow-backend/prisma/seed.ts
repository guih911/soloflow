import { PrismaClient, StepType, FieldType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Limpar dados existentes em ordem de dependência
  console.log('Cleaning existing data...');
  
  // Deletar apenas as tabelas que existem
  try {
    await prisma.attachment.deleteMany({});
  } catch (e) {
    console.log('Attachment table does not exist yet, skipping...');
  }
  
  await prisma.stepExecution.deleteMany({});
  await prisma.processInstance.deleteMany({});
  await prisma.stepAssignment.deleteMany({});
  await prisma.formFieldVersion.deleteMany({});
  await prisma.stepVersion.deleteMany({});
  await prisma.processTypeVersion.deleteMany({});
  await prisma.processType.deleteMany({});
  await prisma.userCompany.deleteMany({});
  await prisma.sector.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  // 2. Criar Entidades Fundamentais
  console.log('Creating core entities...');

  // Criar a Empresa (Soloflow)
  const soloflow = await prisma.company.create({
    data: {
      name: 'Soloflow',
      cnpj: '11.222.333/0001-44',
      email: 'contato@soloflow.com.br',
      phone: '(62) 3222-4444',
      isActive: true,
    },
  });

  // Criar Setores
  const financeiro = await prisma.sector.create({
    data: { name: 'Financeiro', companyId: soloflow.id },
  });
  const diretoria = await prisma.sector.create({
    data: { name: 'Diretoria', companyId: soloflow.id },
  });
  const juridico = await prisma.sector.create({
    data: { name: 'Jurídico', companyId: soloflow.id },
  });
  const compras = await prisma.sector.create({
    data: { name: 'Compras', companyId: soloflow.id },
  });
  const equipe = await prisma.sector.create({
    data: { name: 'Equipe Geral', companyId: soloflow.id },
  });

  // Criar Usuários com diferentes papéis
  const hashedPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin do Sistema',
      email: 'admin@soloflow.com.br',
      password: hashedPassword,
    },
  });
  const diretor = await prisma.user.create({
    data: { name: 'Carlos Diretor', email: 'diretor@soloflow.com.br', password: hashedPassword },
  });
  const gestorFinanceiro = await prisma.user.create({
    data: { name: 'Ana Financeiro', email: 'financeiro@soloflow.com.br', password: hashedPassword },
  });
  const advogado = await prisma.user.create({
    data: { name: 'João Jurídico', email: 'juridico@soloflow.com.br', password: hashedPassword },
  });
  const comprador = await prisma.user.create({
    data: { name: 'Maria Compras', email: 'compras@soloflow.com.br', password: hashedPassword },
  });
  const membroEquipe = await prisma.user.create({
    data: { name: 'Pedro Equipe', email: 'equipe@soloflow.com.br', password: hashedPassword },
  });

  // Associar Usuários à Empresa e Setores
  await prisma.userCompany.createMany({
    data: [
      { userId: admin.id, companyId: soloflow.id, role: UserRole.ADMIN },
      { userId: diretor.id, companyId: soloflow.id, role: UserRole.ADMIN, sectorId: diretoria.id },
      { userId: gestorFinanceiro.id, companyId: soloflow.id, role: UserRole.USER, sectorId: financeiro.id },
      { userId: advogado.id, companyId: soloflow.id, role: UserRole.USER, sectorId: juridico.id },
      { userId: comprador.id, companyId: soloflow.id, role: UserRole.USER, sectorId: compras.id },
      { userId: membroEquipe.id, companyId: soloflow.id, role: UserRole.USER, sectorId: equipe.id },
    ],
  });
  
  console.log('Core entities created successfully!');

  // --- PROCESSO 1: PAGAMENTO DE FORNECEDOR ---
  console.log('Creating "Pagamento de Fornecedor" process...');
  
  const pagamentosProcess = await prisma.processType.create({
    data: {
      name: 'Pagamento de Fornecedor',
      description: 'Fluxo para solicitar, aprovar e realizar pagamentos de notas fiscais de fornecedores e terceiros.',
      companyId: soloflow.id,
      versions: {
        create: {
          version: 1,
          versionLabel: 'v1.0',
          isActive: true,
          formFields: {
            create: [
              { name: 'nomeFornecedor', label: 'Nome do Fornecedor/Prestador', type: FieldType.TEXT, required: true, order: 1 },
              { name: 'cnpjFornecedor', label: 'CPF/CNPJ', type: FieldType.CNPJ, required: true, order: 2 },
              { name: 'valorPagamento', label: 'Valor a Pagar', type: FieldType.CURRENCY, required: true, order: 3 },
              { name: 'dataVencimento', label: 'Data de Vencimento', type: FieldType.DATE, required: true, order: 4 },
              { name: 'descricaoServico', label: 'Descrição do Serviço/Produto', type: FieldType.TEXTAREA, required: true, order: 5 },
              { name: 'notaFiscal', label: 'Anexar Nota Fiscal e Boleto', type: FieldType.FILE, required: true, order: 6 },
            ],
          },
          steps: {
            create: [
              // Etapa 1
              {
                order: 1, name: 'Solicitação de Pagamento', type: StepType.INPUT, slaDays: 2,
                assignedToCreator: true,
                description: 'Preenchimento dos dados do fornecedor e da cobrança.',
                instructions: 'Preencha todos os campos do formulário e anexe a nota fiscal e o boleto para pagamento.',
              },
              // Etapa 2
              {
                order: 2, name: 'Aprovação Financeira', type: StepType.APPROVAL, slaDays: 3,
                description: 'O setor Financeiro valida as informações e o valor.',
                flowConditions: { aprovar: { rules: [{ field: 'valorPagamento', condition: 'GREATER_THAN', value: '5000', targetStep: 3, }], defaultTargetStep: 4, }, reprovar: 'END', },
                assignments: { create: { type: 'SECTOR', sectorId: financeiro.id, priority: 1 } }
              },
              // Etapa 3
              {
                order: 3, name: 'Aprovação da Diretoria', type: StepType.APPROVAL, slaDays: 5,
                description: 'Aprovação final da diretoria para pagamentos de alto valor.',
                instructions: 'Analisar o pagamento e aprovar ou reprovar. Esta etapa só ocorre para valores acima de R$5.000,00.',
                reuseData: JSON.stringify([ { sourceStep: 1, fieldName: 'nomeFornecedor', type: 'field' }, { sourceStep: 1, fieldName: 'valorPagamento', type: 'field' }, { sourceStep: 1, fieldName: 'notaFiscal', type: 'attachment' } ]),
                assignments: { create: { type: 'SECTOR', sectorId: diretoria.id, priority: 1 } }
              },
              // Etapa 4
              {
                order: 4, name: 'Agendar Pagamento', type: StepType.INPUT, allowAttachment: true, requireAttachment: true, slaDays: 2,
                description: 'O financeiro agenda o pagamento no banco e anexa o comprovante de agendamento.',
                assignments: { create: { type: 'SECTOR', sectorId: financeiro.id, priority: 1 } }
              },
              // Etapa 5
              {
                order: 5, name: 'Arquivar Comprovante Final', type: StepType.INPUT, allowAttachment: true, requireAttachment: true, slaDays: 1,
                description: 'Após a confirmação do débito, o financeiro anexa o comprovante final.',
                instructions: 'Anexe o comprovante definitivo do pagamento para concluir o processo.',
                assignments: { create: { type: 'SECTOR', sectorId: financeiro.id, priority: 1 } }
              },
            ],
          },
        },
      },
    },
  });

  // --- PROCESSO 2: CONTRATAÇÃO DE SERVIÇO ---
  console.log('Creating "Contratação de Serviço" process...');
  
  await prisma.processType.create({
      data: {
          name: 'Contratação de Novo Serviço',
          description: 'Fluxo para requisitar, cotar, aprovar e formalizar a contratação de novos serviços.',
          companyId: soloflow.id,
          versions: {
              create: {
                  version: 1,
                  versionLabel: 'v1.0',
                  isActive: true,
                  formFields: {
                      create: [
                          { name: 'nomeServico', label: 'Nome do Serviço a ser Contratado', type: FieldType.TEXT, required: true, order: 1 },
                          { name: 'justificativa', label: 'Justificativa da Contratação', type: FieldType.TEXTAREA, required: true, order: 2 },
                          { name: 'fornecedorSugerido', label: 'Fornecedor Sugerido (se houver)', type: FieldType.TEXT, order: 3 },
                          { name: 'custoEstimado', label: 'Custo Mensal Estimado', type: FieldType.CURRENCY, required: true, order: 4 },
                      ]
                  },
                  steps: {
                      create: [
                          { order: 1, name: 'Requisição do Serviço', type: StepType.INPUT, slaDays: 1, assignedToCreator: true },
                          { order: 2, name: 'Cotação de Preços', description: 'O setor de Compras deve realizar e anexar no mínimo 3 cotações.', type: StepType.INPUT, slaDays: 7, allowAttachment: true, requireAttachment: true, minAttachments: 3, assignments: { create: { type: 'SECTOR', sectorId: compras.id, priority: 1 } } },
                          { order: 3, name: 'Análise Jurídica', description: 'Análise da minuta de contrato e dos termos legais.', type: StepType.APPROVAL, slaDays: 5, allowAttachment: true, assignments: { create: { type: 'SECTOR', sectorId: juridico.id, priority: 1 } } },
                          { order: 4, name: 'Aprovação da Diretoria', description: 'Aprovação final para a contratação do serviço.', type: StepType.APPROVAL, slaDays: 3, assignments: { create: { type: 'SECTOR', sectorId: diretoria.id, priority: 1 } } },
                          { order: 5, name: 'Assinatura do Contrato', description: 'Coleta de assinaturas e arquivamento do contrato assinado.', type: StepType.INPUT, slaDays: 4, allowAttachment: true, requireAttachment: true, minAttachments: 1, assignments: { create: { type: 'SECTOR', sectorId: compras.id, priority: 1 } } }
                      ]
                  }
              }
          }
      }
  });

  // --- PROCESSO 3: DISTRATO DE CONTRATO ---
  console.log('Creating "Distrato de Contrato" process...');

  await prisma.processType.create({
      data: {
          name: 'Distrato de Contrato',
          description: 'Fluxo para solicitar e formalizar o encerramento de um contrato de serviço existente.',
          companyId: soloflow.id,
          versions: {
              create: {
                  version: 1,
                  versionLabel: 'v1.0',
                  isActive: true,
                  formFields: {
                      create: [
                          { name: 'nomeFornecedorDistrato', label: 'Nome do Fornecedor', type: FieldType.TEXT, required: true, order: 1 },
                          { name: 'numeroContrato', label: 'Número do Contrato', type: FieldType.TEXT, required: true, order: 2 },
                          { name: 'motivoDistrato', label: 'Motivo do Distrato', type: FieldType.TEXTAREA, required: true, order: 3 },
                          { name: 'dataTerminoDesejada', label: 'Data Desejada para o Término', type: FieldType.DATE, required: true, order: 4 },
                      ]
                  },
                  steps: {
                      create: [
                          { order: 1, name: 'Solicitação de Distrato', description: 'Gestor do contrato preenche as informações para iniciar o processo de encerramento.', type: StepType.INPUT, slaDays: 2, assignedToCreator: true, },
                          { order: 2, name: 'Análise Jurídica do Contrato', description: 'Jurídico analisa o contrato vigente, verifica cláusulas de rescisão, multas e prepara a minuta do distrato.', type: StepType.INPUT, slaDays: 7, allowAttachment: true, requireAttachment: true, assignments: { create: { type: 'SECTOR', sectorId: juridico.id, priority: 1 } } },
                          { order: 3, name: 'Aprovação da Diretoria', description: 'Diretoria aprova os termos do distrato, incluindo possíveis custos de rescisão.', type: StepType.APPROVAL, slaDays: 4, assignments: { create: { type: 'SECTOR', sectorId: diretoria.id, priority: 1 } } },
                          { order: 4, name: 'Coleta de Assinatura do Distrato', description: 'Administrativo envia o documento para o fornecedor e anexa a versão final assinada por ambas as partes.', type: StepType.INPUT, slaDays: 10, allowAttachment: true, requireAttachment: true, assignments: { create: { type: 'SECTOR', sectorId: compras.id, priority: 1 } } },
                          { order: 5, name: 'Encerramento Financeiro', description: 'Financeiro realiza o pagamento de multas (se houver) e encerra o cadastro do fornecedor.', type: StepType.INPUT, slaDays: 3, assignments: { create: { type: 'SECTOR', sectorId: financeiro.id, priority: 1 } } }
                      ]
                  }
              }
          }
      }
  });

  // 4. Criar uma Instância de Processo de Exemplo
  console.log('Creating a sample process instance...');
  
  const pagamentosVersion = await prisma.processTypeVersion.findFirst({ where: { processTypeId: pagamentosProcess.id } });
  
  if (pagamentosVersion) {
      const instance = await prisma.processInstance.create({
          data: {
              title: 'Pagamento de Consultoria de TI - Agosto',
              description: 'Referente ao serviço de manutenção de servidores do mês de Agosto/2025.',
              code: 'PROC-2025-0001',
              status: 'IN_PROGRESS',
              currentStepOrder: 2,
              formData: {
                nomeFornecedor: 'Tech Solutions Ltda',
                cnpjFornecedor: '98.765.432/0001-10',
                valorPagamento: '4500.00',
                dataVencimento: '2025-09-10T00:00:00.000Z',
                descricaoServico: 'Manutenção mensal de servidores em nuvem',
              },
              processTypeVersionId: pagamentosVersion.id,
              createdById: membroEquipe.id,
              companyId: soloflow.id,
          }
      });

      const steps = await prisma.stepVersion.findMany({ where: { processTypeVersionId: pagamentosVersion.id }, orderBy: { order: 'asc' }});

      // Simular que a primeira etapa foi concluída
      await prisma.stepExecution.create({
          data: {
              processInstanceId: instance.id,
              stepVersionId: steps[0].id,
              status: 'COMPLETED',
              executorId: membroEquipe.id,
              completedAt: new Date(),
              comment: 'Dados preenchidos e nota fiscal anexada.'
          }
      });
      // Deixar a segunda etapa em progresso para o financeiro
      await prisma.stepExecution.create({
        data: {
            processInstanceId: instance.id,
            stepVersionId: steps[1].id,
            status: 'IN_PROGRESS',
        }
      });
      // Deixar as demais pendentes
      for(let i = 2; i < steps.length; i++) {
        await prisma.stepExecution.create({
            data: {
                processInstanceId: instance.id,
                stepVersionId: steps[i].id,
                status: 'PENDING',
            }
        });
      }
  }

  console.log('---');
  console.log('Seed completed successfully!');
  console.log('---');
  console.log('Login details:');
  console.log(`- Admin: admin@soloflow.com.br / 123456`);
  console.log(`- Diretor: diretor@soloflow.com.br / 123456`);
  console.log(`- Financeiro: financeiro@soloflow.com.br / 123456`);
  console.log('---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });