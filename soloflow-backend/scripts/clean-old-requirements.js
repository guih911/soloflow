const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOldRequirements() {
  try {
    console.log('\n🧹 Limpando requisitos de assinatura órfãos...\n');

    // Buscar todos os requisitos
    const allRequirements = await prisma.$queryRaw`
      SELECT sr.id, sr."attachmentId", a.id as realAttachmentId, a.originalName
      FROM signature_requirements sr
      LEFT JOIN attachments a ON a.id = sr."attachmentId"
    `;

    console.log(`Total de requisitos: ${allRequirements.length}\n`);

    let orphaned = 0;
    let valid = 0;

    for (const req of allRequirements) {
      if (!req.realAttachmentId) {
        console.log(`❌ Requisito órfão encontrado:`);
        console.log(`   ID: ${req.id}`);
        console.log(`   AttachmentId inexistente: ${req.attachmentId}\n`);
        orphaned++;

        // Deletar o requisito órfão
        await prisma.$executeRaw`
          DELETE FROM signature_requirements
          WHERE id = ${req.id}
        `;
        console.log(`   ✅ Deletado\n`);
      } else {
        console.log(`✅ Requisito válido:`);
        console.log(`   ID: ${req.id}`);
        console.log(`   Anexo: ${req.originalName}\n`);
        valid++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Válidos: ${valid}`);
    console.log(`   Órfãos deletados: ${orphaned}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldRequirements();
