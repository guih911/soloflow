import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Limpando requisitos globais (attachmentId = null) ===\n');

  // Contar antes
  const countBefore = await prisma.signatureRequirement.count();
  const globalCount = await prisma.signatureRequirement.count({
    where: { attachmentId: null },
  });

  console.log(`Total de requisitos: ${countBefore}`);
  console.log(`Requisitos globais (attachmentId = null): ${globalCount}`);

  // Deletar apenas os globais
  const result = await prisma.signatureRequirement.deleteMany({
    where: { attachmentId: null },
  });

  console.log(`\n✅ ${result.count} requisitos globais deletados`);

  // Verificar restantes
  const remaining = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { name: true } },
      attachment: { select: { originalName: true } },
    },
  });

  console.log(`\nRequisitos restantes: ${remaining.length}`);
  for (const req of remaining) {
    console.log(`  - ${req.user?.name || 'N/A'} - Anexo: ${req.attachment?.originalName || 'N/A'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
