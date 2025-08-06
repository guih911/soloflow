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

  // Manager
  const managerUser = await prisma.user.upsert({
    where: { email: 'gerente@demo.com' },
    update: {},
    create: {
      name: 'Gerente RH',
      email: 'gerente@demo.com',
      password: hashedPassword,
    },
  });

  // Criar vínculo do manager com a empresa e setor
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

  // Criar vínculo do user com a empresa e setor
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

  // Criar tipo de processo exemplo: Solicitação de Férias
  const processTypeFerias = await prisma.processType.create({
    data: {
      name: 'Solicitação de Férias',
      description: 'Processo para solicitação de férias dos colaboradores',
      companyId: company.id,
      steps: {
        create: [
          {
            name: 'Preencher Solicitação',
            description: 'Colaborador preenche os dados da solicitação',
            type: StepType.INPUT,
            order: 1,
            allowAttachment: false,
            requiresSignature: false,
            actions: ['enviar'],
          },
          {
            name: 'Aprovação do Gestor',
            description: 'Gestor imediato aprova ou rejeita a solicitação',
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
            name: 'Validação RH',
            description: 'RH valida disponibilidade e documentação',
            type: StepType.REVIEW,
            order: 3,
            allowAttachment: true,
            requiresSignature: true,
            actions: ['aprovar', 'rejeitar'],
            assignedToSectorId: sectorRH.id,
          },
        ],
      },
    },
  });

  // Criar tipo de processo exemplo: Solicitação de Compra
  const processTypeCompra = await prisma.processType.create({
    data: {
      name: 'Solicitação de Compra',
      description: 'Processo para solicitação de compras',
      companyId: company.id,
      formFields: {
        create: [
          {
            name: 'descricao_item',
            label: 'Descrição do Item',
            type: 'TEXT',
            required: true,
            order: 1,
            placeholder: 'Descreva o item a ser comprado',
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
            label: 'Justificativa',
            type: 'TEXTAREA',
            required: true,
            order: 4,
            placeholder: 'Explique a necessidade da compra',
          },
          {
            name: 'urgencia',
            label: 'Urgência',
            type: 'DROPDOWN',
            required: true,
            order: 5,
            options: [
              { value: 'baixa', label: 'Baixa' },
              { value: 'media', label: 'Média' },
              { value: 'alta', label: 'Alta' },
              { value: 'urgente', label: 'Urgente' },
            ],
          },
        ],
      },
      steps: {
        create: [
          {
            name: 'Criar Solicitação',
            description: 'Preencher dados da compra',
            type: StepType.INPUT,
            order: 1,
            allowAttachment: true,
            requiresSignature: false,
            actions: ['enviar'],
          },
          {
            name: 'Cotação',
            description: 'Anexar cotações dos fornecedores',
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
            description: 'Aprovar orçamento',
            type: StepType.APPROVAL,
            order: 3,
            allowAttachment: true,
            requiresSignature: true,
            actions: ['aprovar', 'rejeitar'],
            assignedToSectorId: sectorFinanceiro.id,
          },
        ],
      },
    },
  });

  console.log('Seed executado com sucesso!');
  console.log('Usuários criados:');
  console.log('- admin@demo.com (senha: admin123)');
  console.log('- gerente@demo.com (senha: admin123)');
  console.log('- financeiro@demo.com (senha: admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });