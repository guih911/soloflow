const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrphanedRequirements() {
  console.log('=== Corrigindo Requisitos Órfãos ===\n');

  try {
    // 1. Buscar todos os requisitos de assinatura
    const allRequirements = await prisma.signatureRequirement.findMany({
      include: {
        attachment: true,
        user: true,
      },
    });

    console.log(`📊 Total de requisitos encontrados: ${allRequirements.length}\n`);

    let deletedCount = 0;
    let validCount = 0;

    for (const req of allRequirements) {
      if (!req.attachment) {
        console.log(`❌ Requisito órfão encontrado:`);
        console.log(`   ID: ${req.id}`);
        console.log(`   Usuário: ${req.user?.name || 'N/A'}`);
        console.log(`   AttachmentId: ${req.attachmentId} (não existe mais)`);

        // Deletar o requisito órfão
        await prisma.signatureRequirement.delete({
          where: { id: req.id },
        });

        deletedCount++;
        console.log(`   ✅ Requisito deletado\n`);
      } else {
        validCount++;
      }
    }

    console.log('\n=== Resumo ===');
    console.log(`✅ Requisitos válidos: ${validCount}`);
    console.log(`❌ Requisitos órfãos deletados: ${deletedCount}`);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedRequirements();
