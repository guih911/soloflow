import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando PROC-2025-0022 ===\n');

  const process = await prisma.processInstance.findFirst({
    where: { code: { contains: '0022' } },
    include: {
      stepExecutions: {
        include: {
          stepVersion: {
            select: { id: true, name: true },
          },
          attachments: {
            select: { id: true, originalName: true },
          },
        },
      },
    },
  });

  if (!process) {
    console.log('Processo não encontrado');
    return;
  }

  console.log(`Processo: ${process.code}\n`);

  for (const exec of process.stepExecutions) {
    console.log(`Etapa: ${exec.stepVersion.name} (${exec.stepVersion.id})`);
    console.log(`Anexos: ${exec.attachments.length}`);
    for (const att of exec.attachments) {
      console.log(`  - ${att.originalName} (${att.id})`);
    }
  }

  // Buscar todos os requisitos
  console.log('\n=== SignatureRequirements no banco ===\n');
  const reqs = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true } },
      attachment: { select: { id: true, originalName: true } },
      stepVersion: { select: { id: true, name: true } },
    },
    orderBy: [{ stepVersionId: 'asc' }, { attachmentId: 'asc' }, { order: 'asc' }],
  });

  console.log(`Total: ${reqs.length}\n`);

  for (const req of reqs) {
    console.log(`StepVersion: ${req.stepVersion.name}`);
    console.log(`  Ordem ${req.order}: ${req.type}`);
    console.log(`  Responsável: ${req.user?.name || req.sector?.name || 'N/A'} (userId: ${req.userId})`);
    console.log(`  Anexo: ${req.attachment?.originalName || 'GLOBAL'} (${req.attachmentId || 'null'})`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
