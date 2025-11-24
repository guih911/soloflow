import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar assinaturas completadas
  const signatures = await prisma.signatureRecord.findMany({
    where: { status: 'COMPLETED' },
    include: {
      requirement: true,
      signer: { select: { name: true } },
      attachment: { select: { originalName: true } },
    },
    orderBy: { signedAt: 'desc' },
    take: 10,
  });

  console.log('=== Assinaturas Completadas ===\n');
  for (const sig of signatures) {
    console.log(`${sig.signer.name} assinou ${sig.attachment?.originalName || 'N/A'}`);
    console.log(`  requirementId: ${sig.requirementId}`);
    console.log(`  attachmentId: ${sig.attachmentId}`);
    console.log(`  stepExecutionId: ${sig.stepExecutionId}`);
    console.log(`  Requirement order: ${sig.requirement?.order}, type: ${sig.requirement?.type}`);
    console.log('');
  }

  // Verificar requisitos
  const reqs = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { name: true } },
      signatureRecords: { where: { status: 'COMPLETED' } },
    },
    orderBy: [{ stepVersionId: 'asc' }, { order: 'asc' }],
  });

  console.log('\n=== Requisitos e Status ===\n');
  for (const req of reqs) {
    const signed = req.signatureRecords.length > 0 ? 'ASSINADO' : 'PENDENTE';
    console.log(`Ordem ${req.order}: ${req.user?.name} - ${signed}`);
    console.log(`  attachmentId: ${req.attachmentId || 'null (global)'}`);
    console.log(`  stepVersionId: ${req.stepVersionId}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
