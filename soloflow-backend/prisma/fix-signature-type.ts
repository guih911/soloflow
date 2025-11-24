import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Atualizando tipo de assinatura para SEQUENTIAL ===\n');

  // Buscar todos os requisitos
  const requirements = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { name: true } },
      sector: { select: { name: true } },
    },
  });

  console.log(`Total de requisitos: ${requirements.length}\n`);

  // Atualizar todos para SEQUENTIAL
  const result = await prisma.signatureRequirement.updateMany({
    where: {},
    data: { type: 'SEQUENTIAL' },
  });

  console.log(`✅ ${result.count} requisitos atualizados para SEQUENTIAL`);

  // Verificar resultado
  const updated = await prisma.signatureRequirement.findMany({
    select: {
      id: true,
      order: true,
      type: true,
      user: { select: { name: true } },
      sector: { select: { name: true } },
    },
    orderBy: [{ stepVersionId: 'asc' }, { order: 'asc' }],
  });

  console.log('\n=== Requisitos após atualização ===');
  for (const req of updated) {
    console.log(`  Ordem ${req.order}: ${req.type} - ${req.user?.name || req.sector?.name}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
