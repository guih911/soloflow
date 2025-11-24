import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando SignatureRequirements ===\n');

  const requirements = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true } },
      stepVersion: { select: { id: true, name: true } },
      signatureRecords: {
        include: {
          signer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ stepVersionId: 'asc' }, { order: 'asc' }],
  });

  console.log(`Total de requisitos: ${requirements.length}\n`);

  let currentStepVersion = '';
  for (const req of requirements) {
    if (req.stepVersionId !== currentStepVersion) {
      currentStepVersion = req.stepVersionId;
      console.log(`\n--- StepVersion: ${req.stepVersion.name} (${req.stepVersionId}) ---`);
    }

    const signedBy = req.signatureRecords.length > 0
      ? req.signatureRecords.map(r => `${r.signer.name} (${r.status})`).join(', ')
      : 'Não assinado';

    console.log(`  Ordem ${req.order}: ${req.type}`);
    console.log(`    - Responsável: ${req.user?.name || req.sector?.name || 'N/A'}`);
    console.log(`    - userId: ${req.userId || 'null'}`);
    console.log(`    - sectorId: ${req.sectorId || 'null'}`);
    console.log(`    - attachmentId: ${req.attachmentId || 'global (null)'}`);
    console.log(`    - Assinaturas: ${signedBy}`);
  }

  // Verificar usuários e seus setores
  console.log('\n\n=== Usuários e Setores ===\n');
  const userCompanies = await prisma.userCompany.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      sector: { select: { id: true, name: true } },
    },
  });

  for (const uc of userCompanies) {
    console.log(`${uc.user.name} (${uc.user.email})`);
    console.log(`  - userId: ${uc.userId}`);
    console.log(`  - sectorId: ${uc.sectorId || 'null'}`);
    console.log(`  - sector: ${uc.sector?.name || 'N/A'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
