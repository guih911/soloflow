import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Debug: Estrutura dos SignatureRequirements ===\n');

  // Buscar todos os requisitos
  const allRequirements = await prisma.signatureRequirement.findMany({
    include: {
      user: { select: { name: true } },
      sector: { select: { name: true } },
      attachment: { select: { id: true, originalName: true } },
      stepVersion: { select: { id: true, name: true } },
    },
    orderBy: [{ stepVersionId: 'asc' }, { attachmentId: 'asc' }, { order: 'asc' }],
  });

  console.log(`Total de SignatureRequirements: ${allRequirements.length}\n`);

  // Agrupar por stepVersionId
  const byStepVersion = new Map<string, typeof allRequirements>();
  for (const req of allRequirements) {
    const key = req.stepVersionId;
    if (!byStepVersion.has(key)) {
      byStepVersion.set(key, []);
    }
    byStepVersion.get(key)!.push(req);
  }

  for (const [stepVersionId, reqs] of byStepVersion) {
    console.log(`\n=== StepVersion: ${reqs[0].stepVersion.name} (${stepVersionId.substring(0, 8)}) ===`);

    // Agrupar por attachmentId
    const byAttachment = new Map<string | null, typeof reqs>();
    for (const req of reqs) {
      const key = req.attachmentId;
      if (!byAttachment.has(key)) {
        byAttachment.set(key, []);
      }
      byAttachment.get(key)!.push(req);
    }

    for (const [attachmentId, attReqs] of byAttachment) {
      const attName = attReqs[0].attachment?.originalName || 'GLOBAL';
      console.log(`\n  Anexo: ${attName} (${attachmentId?.substring(0, 8) || 'null'})`);

      for (const req of attReqs) {
        console.log(`    Ordem ${req.order}: ${req.type} - ${req.user?.name || req.sector?.name || 'N/A'}`);
      }
    }
  }

  // Agora verificar quais anexos têm isSigned=true mas estão em stepExecutions
  // que deveriam ter requisitos
  console.log('\n\n=== Anexos com isSigned=true ===\n');

  const signedAttachments = await prisma.attachment.findMany({
    where: { isSigned: true },
    include: {
      stepExecution: {
        include: {
          stepVersion: { select: { id: true, name: true } },
        },
      },
    },
  });

  for (const att of signedAttachments) {
    console.log(`\n${att.originalName} (${att.id.substring(0, 8)})`);
    console.log(`  StepExecution: ${att.stepExecution.id.substring(0, 8)}`);
    console.log(`  StepVersion: ${att.stepExecution.stepVersion.name} (${att.stepExecution.stepVersionId.substring(0, 8)})`);

    // Buscar requisitos para este stepVersionId
    const reqs = await prisma.signatureRequirement.findMany({
      where: { stepVersionId: att.stepExecution.stepVersionId },
      select: { attachmentId: true },
    });

    const uniqueAttIds = [...new Set(reqs.map(r => r.attachmentId))];
    console.log(`  Requisitos encontrados: ${reqs.length} (attachmentIds únicos: ${uniqueAttIds.length})`);
    console.log(`  AttachmentIds nos requisitos: ${uniqueAttIds.map(id => id?.substring(0, 8) || 'null').join(', ')}`);

    // Verificar se este anexo está nos requisitos
    const thisAttachmentReqs = reqs.filter(r => r.attachmentId === att.id);
    console.log(`  Requisitos para ESTE anexo específico: ${thisAttachmentReqs.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
