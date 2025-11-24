import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Corrigindo flag isSigned dos anexos ===\n');

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
    // Buscar requisitos de assinatura para este anexo específico
    const requirements = await prisma.signatureRequirement.findMany({
      where: {
        stepVersionId: attachment.stepExecution.stepVersionId,
        attachmentId: attachment.id, // Requisitos específicos para este anexo
        isRequired: true,
      },
      include: {
        signatureRecords: {
          where: {
            attachmentId: attachment.id,
            status: 'COMPLETED',
          },
        },
      },
    });

    // Se não há requisitos específicos para este anexo, pode haver requisitos globais
    // ou o anexo foi assinado sem sistema de requisitos (processo antigo)
    if (requirements.length === 0) {
      // Verificar se há assinaturas registradas para este anexo
      const signatures = await prisma.signatureRecord.count({
        where: {
          attachmentId: attachment.id,
          status: 'COMPLETED',
        },
      });

      if (signatures === 0) {
        console.log(`  ${attachment.originalName} (${attachment.id.substring(0, 8)}): sem requisitos e sem assinaturas - CORRIGINDO para isSigned=false`);
        await prisma.attachment.update({
          where: { id: attachment.id },
          data: { isSigned: false },
        });
        fixedCount++;
      } else {
        console.log(`  ${attachment.originalName} (${attachment.id.substring(0, 8)}): sem requisitos mas tem ${signatures} assinatura(s) - mantendo`);
      }
      continue;
    }

    const signedCount = requirements.filter(r => r.signatureRecords.length > 0).length;
    const allSigned = signedCount === requirements.length;

    if (!allSigned) {
      console.log(`  ${attachment.originalName} (${attachment.id.substring(0, 8)}): ${signedCount}/${requirements.length} assinados - CORRIGINDO para isSigned=false`);

      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { isSigned: false },
      });

      fixedCount++;
    } else {
      console.log(`  ${attachment.originalName} (${attachment.id.substring(0, 8)}): ${signedCount}/${requirements.length} assinados - OK`);
    }
  }

  console.log(`\n✅ ${fixedCount} anexo(s) corrigido(s)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
