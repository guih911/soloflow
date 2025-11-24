import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pegar o attachment 0a25dd07
  const attId = '0a25dd07-f5e9-4bc7-8ac2-7fda95beb3a2';

  console.log(`=== Debug: Buscando requisitos para attachmentId: ${attId} ===\n`);

  // Busca simples
  const req1 = await prisma.signatureRequirement.findMany({
    where: {
      attachmentId: attId,
    },
  });
  console.log(`Busca simples (attachmentId = ${attId}): ${req1.length} resultados`);

  // Busca com isRequired
  const req2 = await prisma.signatureRequirement.findMany({
    where: {
      attachmentId: attId,
      isRequired: true,
    },
  });
  console.log(`Busca com isRequired: ${req2.length} resultados`);

  // Verificar o valor de isRequired nos requisitos
  console.log('\nValores de isRequired nos requisitos encontrados:');
  for (const r of req1) {
    console.log(`  ${r.id.substring(0, 8)}: isRequired = ${r.isRequired}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
