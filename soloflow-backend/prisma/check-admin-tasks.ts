import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Usuário Administrador
  const adminUserId = '1ef5f100-aac7-426c-970a-c22c4ca9155a';

  console.log('=== Verificando tarefas do Administrador ===\n');

  // Buscar as companies do admin para pegar o sectorId
  const adminCompanies = await prisma.userCompany.findMany({
    where: { userId: adminUserId },
    select: { sectorId: true, companyId: true },
  });

  console.log('Companies do admin:', adminCompanies);
  const adminSectorId = adminCompanies[0]?.sectorId;

  // Buscar TODAS as stepExecutions que tenham requisitos onde o admin está
  const stepExecutions = await prisma.stepExecution.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
      stepVersion: {
        signatureRequirements: {
          some: {
            OR: [
              { userId: adminUserId },
              { sectorId: adminSectorId },
            ],
          },
        },
      },
    },
    include: {
      stepVersion: {
        include: {
          signatureRequirements: {
            orderBy: { order: 'asc' },
          },
        },
      },
      attachments: {
        select: { id: true, originalName: true, isSigned: true },
      },
      processInstance: {
        select: { code: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\nEncontradas ${stepExecutions.length} stepExecutions com requisitos do admin:\n`);

  for (const exec of stepExecutions) {
    console.log(`\n=== ${exec.processInstance.code} - ${exec.stepVersion.name} ===`);
    console.log(`StepExecution ID: ${exec.id}`);
    console.log(`Status: ${exec.status}`);
    console.log(`Processo status: ${exec.processInstance.status}`);

    console.log(`\nAnexos da etapa: ${exec.attachments.length}`);
    for (const att of exec.attachments) {
      console.log(`  - ${att.originalName} (${att.id}) - isSigned: ${att.isSigned}`);

      // Buscar requisitos específicos para este anexo
      const reqsForAttachment = exec.stepVersion.signatureRequirements.filter(
        r => r.attachmentId === att.id || r.attachmentId === null
      );

      // Buscar assinaturas deste anexo
      const signatures = await prisma.signatureRecord.findMany({
        where: { attachmentId: att.id, status: 'COMPLETED' },
        include: { signer: { select: { name: true } } },
      });

      console.log(`    Requisitos para este anexo: ${reqsForAttachment.length}`);
      for (const req of reqsForAttachment) {
        const signed = signatures.some(s =>
          s.requirementId === req.id ||
          (req.userId && signatures.some(sig => sig.signerId === req.userId))
        );
        const isAdmin = req.userId === adminUserId || req.sectorId === adminSectorId;
        console.log(`      Ordem ${req.order}: ${req.type} - ${isAdmin ? '👤 ADMIN' : 'outro'} - ${signed ? '✅' : '⏳'}`);
      }

      console.log(`    Assinaturas registradas: ${signatures.length}`);
      for (const sig of signatures) {
        console.log(`      - ${sig.signer.name}`);
      }
    }
  }

  // Agora simular EXATAMENTE a lógica do getMyTasks CORRIGIDA
  console.log('\n\n=== Simulação EXATA do getMyTasks CORRIGIDO para Admin ===\n');

  const signatureTasks = await prisma.stepExecution.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
      stepVersion: {
        signatureRequirements: {
          some: {
            OR: [
              { userId: adminUserId },
              { sectorId: adminSectorId },
            ],
          },
        },
      },
    },
    include: {
      stepVersion: true,
      attachments: {
        select: { id: true, originalName: true, isSigned: true },
      },
      processInstance: {
        select: { code: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total de signatureTasks: ${signatureTasks.length}\n`);

  const filteredSignatureTasks: typeof signatureTasks = [];

  for (const task of signatureTasks) {
    console.log(`\n--- Task: ${task.processInstance.code} / ${task.stepVersion.name} ---`);
    const unsignedAttachments = task.attachments.filter(a => !a.isSigned);
    console.log(`Anexos não assinados: ${unsignedAttachments.map(a => `${a.originalName} (${a.id.substring(0, 8)})`).join(', ') || 'NENHUM'}`);

    // IDs dos anexos DESTA stepExecution específica
    const taskAttachmentIds = task.attachments.map(a => a.id);

    // Se não tem anexos, não tem o que assinar
    if (taskAttachmentIds.length === 0) {
      console.log('Sem anexos - pulando');
      continue;
    }

    // Buscar requisitos de assinatura apenas para os anexos DESTA task
    const allRequirements = await prisma.signatureRequirement.findMany({
      where: {
        stepVersionId: task.stepVersionId,
        OR: [
          { attachmentId: { in: taskAttachmentIds } },
          { attachmentId: null },
        ],
      },
      orderBy: { order: 'asc' },
      include: {
        signatureRecords: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    console.log(`Requisitos filtrados para esta task: ${allRequirements.length}`);

    // Agrupar requisitos por attachmentId
    const requirementsByAttachment = new Map<string | null, typeof allRequirements>();
    for (const req of allRequirements) {
      const key = req.attachmentId;
      if (!requirementsByAttachment.has(key)) {
        requirementsByAttachment.set(key, []);
      }
      requirementsByAttachment.get(key)!.push(req);
    }

    console.log(`Grupos de attachmentId: ${requirementsByAttachment.size}`);

    // Verificar se o usuário pode assinar ALGUM anexo desta etapa
    let canSignSomeAttachment = false;
    let reasonDetails: string[] = [];

    for (const [attachmentId, requirements] of requirementsByAttachment) {
      // Verificar se o anexo já está assinado (flag isSigned)
      if (attachmentId) {
        const attachment = task.attachments.find(a => a.id === attachmentId);
        if (!attachment || attachment.isSigned) {
          reasonDetails.push(`${attachmentId.substring(0, 8)}: anexo já assinado (isSigned=true)`);
          continue;
        }
      }

      // Encontrar o requisito do usuário atual para este anexo
      const userRequirement = requirements.find(r =>
        r.userId === adminUserId || (r.sectorId && r.sectorId === adminSectorId)
      );

      if (!userRequirement) {
        continue; // Usuário não está nos requisitos deste anexo
      }

      // Verificar se já assinou este anexo
      const alreadySigned = userRequirement.signatureRecords.length > 0;
      if (alreadySigned) {
        reasonDetails.push(`${attachmentId?.substring(0, 8) || 'GLOBAL'}: já assinou`);
        continue; // Já assinou este anexo
      }

      // Se for assinatura PARALELA, pode assinar
      if (userRequirement.type === 'PARALLEL') {
        canSignSomeAttachment = true;
        reasonDetails.push(`${attachmentId?.substring(0, 8) || 'GLOBAL'}: PARALLEL - pode assinar`);
        break;
      }

      // Se for assinatura SEQUENTIAL...
      if (userRequirement.type === 'SEQUENTIAL') {
        // Verificar se todos os anteriores deste anexo já assinaram
        const previousRequirements = requirements.filter(r => r.order < userRequirement.order);
        const allPreviousSigned = previousRequirements.every(req =>
          req.signatureRecords.length > 0
        );

        if (allPreviousSigned) {
          // Todos os anteriores assinaram, é a vez deste usuário
          canSignSomeAttachment = true;
          reasonDetails.push(`${attachmentId?.substring(0, 8) || 'GLOBAL'}: SEQUENTIAL - todos anteriores assinaram (${previousRequirements.length}) - PODE ASSINAR`);
          break;
        } else {
          const pendingCount = previousRequirements.filter(r => r.signatureRecords.length === 0).length;
          reasonDetails.push(`${attachmentId?.substring(0, 8) || 'GLOBAL'}: SEQUENTIAL - aguardando ${pendingCount} anterior(es)`);
        }
      }
    }

    console.log(`Pode assinar: ${canSignSomeAttachment ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`Detalhes: ${reasonDetails.join('; ')}`);

    if (canSignSomeAttachment) {
      filteredSignatureTasks.push(task);
    }
  }

  console.log(`\n\n=== RESULTADO FINAL ===`);
  console.log(`Tasks com assinatura pendente para Admin: ${filteredSignatureTasks.length}`);
  for (const t of filteredSignatureTasks) {
    console.log(`  - ${t.processInstance.code} / ${t.stepVersion.name}`);
    console.log(`    Anexos não assinados: ${t.attachments.filter(a => !a.isSigned).map(a => a.originalName).join(', ')}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
