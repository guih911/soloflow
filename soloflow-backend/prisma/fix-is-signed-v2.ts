import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Corrigindo flag isSigned dos anexos (v2) ===\n');

  // Buscar todos os anexos com isSigned = true
  const signedAttachments = await prisma.attachment.findMany({
    where: {
      isSigned: true,
    },
    include: {
      stepExecution: {
        include: {
          stepVersion: true,
        },
      },
    },
  });

  console.log(`Anexos com isSigned = true: ${signedAttachments.length}\n`);

  let fixedCount = 0;

  for (const attachment of signedAttachments) {
    // Buscar requisitos de assinatura que apontam para este attachmentId específico
    // Os requisitos podem estar no stepVersion, mas o attachmentId é o identificador único do anexo
    const requirements = await prisma.signatureRequirement.findMany({
      where: {
        attachmentId: attachment.id, // Busca por attachmentId direto
        // Não filtramos por isRequired - todos os requisitos contam
      },
      include: {
        signatureRecords: {
          where: {
            attachmentId: attachment.id,
            status: 'COMPLETED',
          },
        },
        user: { select: { name: true } },
        sector: { select: { name: true } },
      },
    });

    console.log(`\n${attachment.originalName} (${attachment.id.substring(0, 8)}):`);
    console.log(`  StepExecution: ${attachment.stepExecutionId.substring(0, 8)}`);

    // Se não há requisitos específicos para este anexo
    if (requirements.length === 0) {
      // Verificar se há assinaturas registradas para este anexo
      const signatures = await prisma.signatureRecord.count({
        where: {
          attachmentId: attachment.id,
          status: 'COMPLETED',
        },
      });

      if (signatures === 0) {
        console.log(`  ❌ Sem requisitos e sem assinaturas - CORRIGINDO`);
        await prisma.attachment.update({
          where: { id: attachment.id },
          data: { isSigned: false },
        });
        fixedCount++;
      } else {
        console.log(`  ⚠️ Sem requisitos mas tem ${signatures} assinatura(s) - mantendo (processo sem sistema de requisitos)`);
      }
      continue;
    }

    console.log(`  Requisitos encontrados: ${requirements.length}`);
    for (const req of requirements) {
      const signed = req.signatureRecords.length > 0;
      const signer = req.user?.name || req.sector?.name || 'N/A';
      console.log(`    - Ordem ${req.order}: ${req.type} - ${signer} - ${signed ? '✅' : '⏳'}`);
    }

    const signedCount = requirements.filter(r => r.signatureRecords.length > 0).length;
    const allSigned = signedCount === requirements.length;

    if (!allSigned) {
      console.log(`  ❌ ${signedCount}/${requirements.length} assinados - CORRIGINDO para isSigned=false`);

      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { isSigned: false },
      });

      fixedCount++;
    } else {
      console.log(`  ✅ ${signedCount}/${requirements.length} assinados - OK`);
    }
  }

  console.log(`\n\n=== RESULTADO ===`);
  console.log(`✅ ${fixedCount} anexo(s) corrigido(s)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
