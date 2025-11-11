const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== Últimas Assinaturas Registradas ===\n');

  const records = await prisma.signatureRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      signer: {
        select: { name: true, email: true }
      },
      attachment: {
        select: { originalName: true, isSigned: true }
      },
      requirement: {
        select: { order: true, type: true }
      }
    }
  });

  if (records.length === 0) {
    console.log('❌ Nenhuma assinatura encontrada\n');
    return;
  }

  records.forEach((record, index) => {
    console.log(`${index + 1}. ${record.signer.name} (${record.signer.email})`);
    console.log(`   📄 Documento: ${record.attachment.originalName}`);
    console.log(`   ✅ Status: ${record.status}`);
    console.log(`   🔑 Token: ${record.signatureToken}`);
    console.log(`   📅 Data: ${record.createdAt.toLocaleString('pt-BR')}`);
    console.log(`   📍 Ordem: ${record.requirement?.order || 'N/A'} (${record.requirement?.type || 'N/A'})`);
    console.log(`   💾 Arquivo assinado: ${record.signedPath || 'N/A'}`);
    console.log('');
  });

  console.log(`Total de assinaturas: ${records.length}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
