const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  console.log('\n=== Anexos Marcados como Assinados ===\n');

  const attachments = await prisma.attachment.findMany({
    where: { isSigned: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      originalName: true,
      filename: true,
      path: true,
      signedPath: true,
      isSigned: true,
      createdAt: true,
    }
  });

  if (attachments.length === 0) {
    console.log('❌ Nenhum anexo assinado encontrado\n');
    return;
  }

  attachments.forEach((att, index) => {
    console.log(`${index + 1}. ${att.originalName}`);
    console.log(`   ✅ Assinado: ${att.isSigned}`);
    console.log(`   📂 Path original: ${att.path}`);
    console.log(`   📝 Path assinado: ${att.signedPath || 'N/A'}`);
    console.log(`   📅 Criado: ${att.createdAt.toLocaleString('pt-BR')}`);

    // Verificar se o arquivo existe
    if (att.signedPath) {
      const exists = fs.existsSync(att.signedPath);
      console.log(`   💾 Arquivo existe: ${exists ? 'SIM' : 'NÃO'}`);
    }

    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
