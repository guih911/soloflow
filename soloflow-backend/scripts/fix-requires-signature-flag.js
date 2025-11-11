const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRequiresSignatureFlag() {
  console.log('=== Corrigindo Flag requiresSignature ===\n');

  try {
    // Buscar etapas com requisitos mas requiresSignature = false
    const stepVersions = await prisma.stepVersion.findMany({
      where: {
        requiresSignature: false,
        signatureRequirements: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        signatureRequirements: { select: { id: true } }
      }
    });

    console.log(`📊 Encontradas ${stepVersions.length} etapas com requisitos mas requiresSignature=false\n`);

    for (const sv of stepVersions) {
      console.log(`Etapa: ${sv.name}`);
      console.log(`  Requisitos: ${sv.signatureRequirements.length}`);

      await prisma.stepVersion.update({
        where: { id: sv.id },
        data: { requiresSignature: true }
      });

      console.log(`  ✅ requiresSignature atualizado para true\n`);
    }

    console.log('\n=== Resumo ===');
    console.log(`${stepVersions.length} etapas atualizadas com requiresSignature=true`);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRequiresSignatureFlag();
