// Arquivo de seed corrigido para a nova estrutura
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Limpar dados existentes se necessário
  await prisma.attachment.deleteMany({});
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

  // Criar empresa
  const company = await prisma.company.create({
    data: {
      name: 'Soloflow',
      cnpj: '12.345.678/0001-90',
      email: 'contato@soloflow.com.br',
      phone: '(62) 99999-9999',
      isActive: true,
    },
  });

  // Criar setor
  const sector = await prisma.sector.create({
    data: {
      name: 'Recursos Humanos',
      description: 'Setor responsável pela gestão de pessoas',
      companyId: company.id,
      isActive: true,
    },
  });

  // Criar usuários
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Sistema',
      email: 'admin@soloflow.com.br',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: 'Gerente RH',
      email: 'gerente@soloflow.com',
      password: await bcrypt.hash('gerente123', 10),
      role: 'MANAGER',
      isActive: true,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      name: 'Usuário Comum',
      email: 'usuario@soloflow.com',
      password: await bcrypt.hash('usuario123', 10),
      role: 'USER',
      isActive: true,
    },
  });

  // Vincular usuários à empresa
  await prisma.userCompany.create({
    data: {
      userId: adminUser.id,
      companyId: company.id,
      sectorId: sector.id,
      role: 'ADMIN',
      isDefault: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: managerUser.id,
      companyId: company.id,
      sectorId: sector.id,
      role: 'MANAGER',
      isDefault: true,
    },
  });

  await prisma.userCompany.create({
    data: {
      userId: regularUser.id,
      companyId: company.id,
      sectorId: sector.id,
      role: 'USER',
      isDefault: true,
    },
  });

  // Criar ProcessType
  const processType = await prisma.processType.create({
    data: {
      name: 'Solicitação de Férias',
      description: 'Processo para solicitação e aprovação de férias',
      companyId: company.id,
      isActive: true,
    },
  });

  // Criar versão do ProcessType
  const processTypeVersion = await prisma.processTypeVersion.create({
    data: {
      processTypeId: processType.id,
      version: 1,
      versionLabel: 'v1.0',
      description: 'Versão inicial do processo de férias',
      isActive: true,
      isDraft: false,
      publishedAt: new Date(),
    },
  });

  // Criar FormFields
  const formFields = [
    {
      name: 'dataInicio',
      label: 'Data de Início',
      type: 'DATE' as const,
      required: true,
      order: 1,
    },
    {
      name: 'dataFim',
      label: 'Data de Fim',
      type: 'DATE' as const,
      required: true,
      order: 2,
    },
    {
      name: 'motivo',
      label: 'Motivo',
      type: 'TEXTAREA' as const,
      required: false,
      order: 3,
    },
  ];

  for (const field of formFields) {
    await prisma.formFieldVersion.create({
      data: {
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        order: field.order,
        processTypeVersionId: processTypeVersion.id,
      },
    });
  }

  // Criar Steps
  const step1 = await prisma.stepVersion.create({
    data: {
      name: 'Solicitação',
      description: 'Funcionário preenche solicitação de férias',
      instructions: 'Preencha todos os campos obrigatórios',
      type: 'INPUT',
      order: 1,
      allowAttachment: false,
      requiresSignature: false,
      requireAttachment: false,
      processTypeVersionId: processTypeVersion.id,
    },
  });

  const step2 = await prisma.stepVersion.create({
    data: {
      name: 'Aprovação Gerente',
      description: 'Gerente analisa e aprova/reprova solicitação',
      instructions: 'Analise a solicitação e tome uma decisão',
      type: 'APPROVAL',
      order: 2,
      allowAttachment: false,
      requiresSignature: false,
      requireAttachment: false,
      processTypeVersionId: processTypeVersion.id,
    },
  });

  const step3 = await prisma.stepVersion.create({
    data: {
      name: 'Aprovação RH',
      description: 'RH faz aprovação final',
      instructions: 'Verificar disponibilidade e aprovar',
      type: 'APPROVAL',
      order: 3,
      allowAttachment: false,
      requiresSignature: false,
      requireAttachment: false,
      processTypeVersionId: processTypeVersion.id,
    },
  });

  // Criar Assignments
  await prisma.stepAssignment.create({
    data: {
      stepVersionId: step1.id,
      type: 'USER',
      userId: regularUser.id,
      priority: 1,
      isActive: true,
    },
  });

  await prisma.stepAssignment.create({
    data: {
      stepVersionId: step2.id,
      type: 'USER',
      userId: managerUser.id,
      priority: 1,
      isActive: true,
    },
  });

  await prisma.stepAssignment.create({
    data: {
      stepVersionId: step3.id,
      type: 'SECTOR',
      sectorId: sector.id,
      priority: 1,
      isActive: true,
    },
  });

  // Criar um processo de exemplo
  const processInstance = await prisma.processInstance.create({
    data: {
      code: 'PROC-2025-0001',
      title: 'Férias Janeiro 2025',
      description: 'Solicitação de férias para janeiro',
      status: 'IN_PROGRESS',
      currentStepOrder: 1,
      formData: {
        dataInicio: '2025-01-15',
        dataFim: '2025-01-29',
        motivo: 'Descanso familiar',
      },
      processTypeVersionId: processTypeVersion.id,
      createdById: regularUser.id,
      companyId: company.id,
    },
  });

  // Criar execuções das etapas
  await prisma.stepExecution.create({
    data: {
      processInstanceId: processInstance.id,
      stepVersionId: step1.id,
      status: 'COMPLETED',
      action: 'enviar',
      executorId: regularUser.id,
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
    },
  });

  await prisma.stepExecution.create({
    data: {
      processInstanceId: processInstance.id,
      stepVersionId: step2.id,
      status: 'IN_PROGRESS',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 dia no futuro
    },
  });

  await prisma.stepExecution.create({
    data: {
      processInstanceId: processInstance.id,
      stepVersionId: step3.id,
      status: 'PENDING',
    },
  });

  console.log('Seed completed successfully!');
  console.log('---');
  console.log('Usuários criados:');
  console.log(`Admin: admin@soloflow.com / admin123`);
  console.log(`Gerente: gerente@soloflow.com / gerente123`);
  console.log(`Usuário: usuario@soloflow.com / usuario123`);
  console.log('---');
}

main()
  .catch((e) => {
    console.error('Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });