/**
 * Seed de Cenários de Teste para E2E
 *
 * Cria processos em diversas situações para testar:
 * - Processos em diferentes status
 * - Tarefas pendentes
 * - Assinaturas pendentes
 * - Fluxos completos e incompletos
 */

import { PrismaClient, ProcessStatus, StepExecutionStatus, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Iniciando Seed de Cenários de Teste...\n');

  // Buscar empresa existente
  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error('Empresa não encontrada. Execute o seed principal primeiro.');
  }

  // Buscar admin
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@soloflow.com.br' }
  });
  if (!admin) {
    throw new Error('Admin não encontrado. Execute o seed principal primeiro.');
  }

  // Buscar outros usuários
  const users = await prisma.user.findMany({
    where: {
      userCompanies: { some: { companyId: company.id } },
      NOT: { id: admin.id }
    },
    take: 5
  });

  // Buscar tipo de processo com versão publicada
  const processType = await prisma.processType.findFirst({
    where: {
      companyId: company.id,
    },
    include: {
      versions: {
        where: { isDraft: false },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        },
        take: 1
      }
    }
  });

  if (!processType || !processType.versions[0]) {
    console.log('⚠️  Nenhum tipo de processo publicado encontrado. Criando processos simples...');
    // Criar apenas notificações se não houver tipo de processo
    await createNotifications(admin.id, company.id);
    return;
  }

  const version = processType.versions[0];
  const steps = version.steps;

  console.log(`📋 Usando tipo de processo: ${processType.name}`);
  console.log(`   Versão: ${version.version} com ${steps.length} etapas\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CENÁRIO 1: Processos em diferentes status
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📊 Criando processos em diferentes status...');

  const statuses: ProcessStatus[] = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'];

  for (const status of statuses) {
    const code = `TEST-${status.substring(0, 3)}-${Date.now().toString().slice(-4)}`;

    const process = await prisma.processInstance.create({
      data: {
        code,
        title: `Processo de Teste - ${status}`,
        status,
        processTypeVersionId: version.id,
        companyId: company.id,
        createdById: admin.id,
        formData: {
          testField: `Valor de teste para ${status}`,
          createdAt: new Date().toISOString()
        }
      }
    });

    // Criar execuções de etapas
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let stepStatus: StepExecutionStatus = 'PENDING';

      if (status === 'COMPLETED') {
        stepStatus = 'COMPLETED';
      } else if (status === 'IN_PROGRESS' && i === 0) {
        stepStatus = 'COMPLETED';
      } else if (status === 'IN_PROGRESS' && i === 1) {
        stepStatus = 'IN_PROGRESS';
      } else if (status === 'CANCELLED' || status === 'REJECTED') {
        stepStatus = i === 0 ? 'COMPLETED' : 'SKIPPED';
      }

      await prisma.stepExecution.create({
        data: {
          processInstanceId: process.id,
          stepVersionId: step.id,
          status: stepStatus,
          executorId: users[i % users.length]?.id || admin.id,
          completedAt: stepStatus === 'COMPLETED' ? new Date() : null
        }
      });
    }

    console.log(`   ✅ Processo ${code} criado com status ${status}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CENÁRIO 2: Processos com tarefas pendentes para diferentes usuários
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Criando processos com tarefas pendentes...');

  for (let i = 0; i < 5; i++) {
    const assignedUser = users[i % users.length] || admin;
    const code = `TEST-TASK-${i + 1}-${Date.now().toString().slice(-4)}`;

    const process = await prisma.processInstance.create({
      data: {
        code,
        title: `Tarefa Pendente #${i + 1} - ${assignedUser.name?.split(' ')[0]}`,
        status: 'IN_PROGRESS',
        processTypeVersionId: version.id,
        companyId: company.id,
        createdById: admin.id,
      }
    });

    // Primeira etapa em andamento
    if (steps[0]) {
      await prisma.stepExecution.create({
        data: {
          processInstanceId: process.id,
          stepVersionId: steps[0].id,
          status: 'IN_PROGRESS',
          executorId: assignedUser.id,
        }
      });
    }

    console.log(`   ✅ Tarefa pendente ${code} atribuída para ${assignedUser.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CENÁRIO 3: Processos com tarefas para o Admin
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n👤 Criando tarefas específicas para o Admin...');

  for (let i = 0; i < 3; i++) {
    const code = `TEST-ADMIN-${i + 1}-${Date.now().toString().slice(-4)}`;

    const process = await prisma.processInstance.create({
      data: {
        code,
        title: `Tarefa Admin #${i + 1}`,
        status: 'IN_PROGRESS',
        processTypeVersionId: version.id,
        companyId: company.id,
        createdById: users[0]?.id || admin.id,
      }
    });

    if (steps[0]) {
      await prisma.stepExecution.create({
        data: {
          processInstanceId: process.id,
          stepVersionId: steps[0].id,
          status: 'IN_PROGRESS',
          executorId: admin.id,
        }
      });
    }

    console.log(`   ✅ Tarefa ${code} criada para Admin`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CENÁRIO 4: Processos concluídos recentemente
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n✔️  Criando processos concluídos recentemente...');

  for (let i = 0; i < 5; i++) {
    const code = `TEST-DONE-${i + 1}-${Date.now().toString().slice(-4)}`;
    const daysAgo = i * 2; // 0, 2, 4, 6, 8 dias atrás
    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - daysAgo);

    const process = await prisma.processInstance.create({
      data: {
        code,
        title: `Processo Concluído #${i + 1}`,
        status: 'COMPLETED',
        processTypeVersionId: version.id,
        companyId: company.id,
        createdById: admin.id,
        completedAt: completedDate
      }
    });

    // Todas as etapas concluídas
    for (const step of steps) {
      await prisma.stepExecution.create({
        data: {
          processInstanceId: process.id,
          stepVersionId: step.id,
          status: 'COMPLETED',
          executorId: admin.id,
          completedAt: completedDate
        }
      });
    }

    console.log(`   ✅ Processo ${code} concluído há ${daysAgo} dias`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CENÁRIO 5: Criar notificações de teste
  // ═══════════════════════════════════════════════════════════════════════════
  await createNotifications(admin.id, company.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUMO
  // ═══════════════════════════════════════════════════════════════════════════
  const processCount = await prisma.processInstance.count({
    where: { companyId: company.id }
  });

  const taskCount = await prisma.stepExecution.count({
    where: {
      status: 'IN_PROGRESS',
      processInstance: { companyId: company.id }
    }
  });

  const notificationCount = await prisma.notification.count({
    where: { userId: admin.id, isRead: false }
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  📊 RESUMO DOS CENÁRIOS DE TESTE');
  console.log('═'.repeat(60));
  console.log(`  Total de processos: ${processCount}`);
  console.log(`  Tarefas em andamento: ${taskCount}`);
  console.log(`  Notificações não lidas: ${notificationCount}`);
  console.log('═'.repeat(60));
  console.log('\n✅ Seed de cenários de teste concluído!\n');
}

async function createNotifications(userId: string, companyId: string) {
  console.log('\n🔔 Criando notificações de teste...');

  const notifications: { type: NotificationType; title: string; message: string }[] = [
    { type: 'TASK_ASSIGNED', title: 'Nova tarefa atribuída', message: 'Você recebeu uma nova tarefa para executar' },
    { type: 'PROCESS_COMPLETED', title: 'Processo concluído', message: 'O processo foi concluído com sucesso' },
    { type: 'SIGNATURE_PENDING', title: 'Assinatura pendente', message: 'Você tem um documento aguardando assinatura' },
    { type: 'DEADLINE_APPROACHING', title: 'Prazo se aproximando', message: 'O prazo para conclusão está próximo' },
    { type: 'PROCESS_REJECTED', title: 'Processo rejeitado', message: 'O processo foi rejeitado e requer atenção' }
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        userId,
        companyId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: Math.random() > 0.5 // 50% lidas, 50% não lidas
      }
    });
  }

  console.log(`   ✅ ${notifications.length} notificações criadas`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
