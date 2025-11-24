import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando SignatureRequirements no banco ===\n');

  // Buscar TODOS os requisitos que têm attachmentId não nulo
  const requirements = await prisma.signatureRequirement.findMany({
    where: {
      attachmentId: { not: null },
    },
    select: {
      id: true,
      attachmentId: true,
      stepVersionId: true,
      order: true,
      type: true,
      user: { select: { name: true } },
    },
  });

  console.log(`Requisitos com attachmentId: ${requirements.length}\n`);

  for (const req of requirements) {
    console.log(`ID: ${req.id.substring(0, 8)}`);
    console.log(`  attachmentId: ${req.attachmentId}`);
    console.log(`  stepVersionId: ${req.stepVersionId.substring(0, 8)}`);
    console.log(`  ordem: ${req.order}, tipo: ${req.type}, user: ${req.user?.name || 'N/A'}`);
    console.log('');
  }

  // Agora verificar se esses attachmentIds existem na tabela attachments
  console.log('\n=== Verificando se os attachmentIds existem ===\n');

  const attachmentIds = [...new Set(requirements.map(r => r.attachmentId).filter(id => id !== null))] as string[];

  for (const attId of attachmentIds) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attId },
      select: { id: true, originalName: true, isSigned: true, stepExecutionId: true },
    });

    if (attachment) {
      console.log(`✅ ${attId.substring(0, 8)}: ${attachment.originalName} (isSigned: ${attachment.isSigned})`);
    } else {
      console.log(`❌ ${attId.substring(0, 8)}: NÃO EXISTE NO BANCO`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
