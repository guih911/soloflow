import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando requisitos do processo mais recente ===\n');

  // Buscar o processo mais recente
  const process = await prisma.processInstance.findFirst({
    where: {
      code: { contains: '0021' }
    },
    include: {
      stepExecutions: {
        include: {
          stepVersion: {
            include: {
              signatureRequirements: {
                include: {
                  user: { select: { name: true } },
                  sector: { select: { name: true } },
                  attachment: { select: { id: true, originalName: true } },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          attachments: {
            select: {
              id: true,
              originalName: true,
              isSigned: true,
            },
          },
        },
      },
    },
  });

  if (!process) {
    console.log('Processo não encontrado');
    return;
  }

  console.log(`Processo: ${process.code}`);
  console.log(`Status: ${process.status}\n`);

  for (const exec of process.stepExecutions) {
    console.log(`\n=== Etapa: ${exec.stepVersion.name} ===`);
    console.log(`Status: ${exec.status}`);
    console.log(`Anexos: ${exec.attachments.length}`);

    for (const att of exec.attachments) {
      console.log(`  - ${att.originalName} (${att.id.substring(0, 8)}...) - Assinado: ${att.isSigned}`);
    }

    console.log(`\nRequisitos de assinatura: ${exec.stepVersion.signatureRequirements.length}`);
    for (const req of exec.stepVersion.signatureRequirements) {
      console.log(`  Ordem ${req.order}: ${req.type}`);
      console.log(`    - Responsável: ${req.user?.name || req.sector?.name || 'N/A'}`);
      console.log(`    - Anexo: ${req.attachment?.originalName || 'GLOBAL (todos)'}`);
      console.log(`    - attachmentId: ${req.attachmentId || 'null'}`);
    }
  }

  // Buscar TODOS os requisitos separadamente para garantir que não há requisitos específicos por anexo
  console.log('\n\n=== Todos os SignatureRequirements no banco ===\n');
  const allReqs = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { name: true } },
      attachment: { select: { originalName: true } },
      stepVersion: { select: { name: true } },
    },
    orderBy: [{ stepVersionId: 'asc' }, { order: 'asc' }],
  });

  for (const req of allReqs) {
    console.log(`${req.stepVersion.name} - Ordem ${req.order}: ${req.type}`);
    console.log(`  Usuário: ${req.user?.name || 'N/A'}`);
    console.log(`  Anexo: ${req.attachment?.originalName || 'GLOBAL'}`);
    console.log(`  attachmentId: ${req.attachmentId || 'null'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
