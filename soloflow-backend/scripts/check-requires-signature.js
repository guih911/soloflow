const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRequiresSignature() {
  try {
    const stepVersions = await prisma.stepVersion.findMany({
      where: {
        signatureRequirements: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        requiresSignature: true,
        signatureRequirements: {
          select: {
            id: true,
            user: { select: { name: true } }
          }
        }
      }
    });

    console.log('=== Etapas com Requisitos de Assinatura ===\n');
    stepVersions.forEach(sv => {
      console.log(`Etapa: ${sv.name}`);
      console.log(`  requiresSignature: ${sv.requiresSignature}`);
      console.log(`  Requisitos: ${sv.signatureRequirements.length}`);
      sv.signatureRequirements.forEach(req => {
        console.log(`    - ${req.user?.name || 'N/A'}`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequiresSignature();
