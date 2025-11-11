const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSignatureRequirements() {
  try {
    console.log('=== Verificando Requisitos de Assinatura ===\n');

    // Buscar processo PROC-2025-0025
    const process = await prisma.processInstance.findFirst({
      where: { code: 'PROC-2025-0025' },
      include: {
        stepExecutions: {
          include: {
            stepVersion: {
              include: {
                signatureRequirements: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    attachment: { select: { id: true, originalName: true } },
                    signatureRecords: true,
                  },
                },
              },
            },
            attachments: true,
          },
        },
      },
    });

    if (!process) {
      console.log('❌ Processo PROC-2025-0025 não encontrado!');
      return;
    }

    console.log(`✅ Processo encontrado: ${process.code} (${process.id})`);
    console.log(`   Título: ${process.title || 'N/A'}`);
    console.log(`   Status: ${process.status}`);
    console.log(`   Criado por: ${process.createdById}\n`);

    console.log('=== Etapas do Processo ===\n');

    for (const execution of process.stepExecutions) {
      console.log(`📋 Etapa: ${execution.stepVersion.name}`);
      console.log(`   ID: ${execution.id}`);
      console.log(`   Status: ${execution.status}`);
      console.log(`   Requer assinatura: ${execution.stepVersion.requiresSignature ? 'SIM' : 'NÃO'}`);
      console.log(`   Anexos: ${execution.attachments.length}`);

      if (execution.attachments.length > 0) {
        execution.attachments.forEach((att, idx) => {
          console.log(`     ${idx + 1}. ${att.originalName} (${att.mimeType}) - Assinado: ${att.isSigned ? 'SIM' : 'NÃO'}`);
        });
      }

      console.log(`   Requisitos de assinatura: ${execution.stepVersion.signatureRequirements.length}`);

      if (execution.stepVersion.signatureRequirements.length > 0) {
        execution.stepVersion.signatureRequirements.forEach((req, idx) => {
          console.log(`     ${idx + 1}. ${req.user?.name || 'N/A'} (${req.userId})`);
          console.log(`        Anexo: ${req.attachment?.originalName || 'N/A'}`);
          console.log(`        Ordem: ${req.order} | Tipo: ${req.type} | Obrigatório: ${req.isRequired ? 'SIM' : 'NÃO'}`);
          console.log(`        Registros de assinatura: ${req.signatureRecords.length}`);

          if (req.signatureRecords.length > 0) {
            req.signatureRecords.forEach((record) => {
              console.log(`           - Status: ${record.status} | Assinado em: ${record.signedAt}`);
            });
          }
        });
      }

      console.log('');
    }

    // Buscar todos os requisitos de assinatura do sistema
    const allRequirements = await prisma.signatureRequirement.findMany({
      include: {
        user: { select: { name: true, email: true } },
        attachment: { select: { originalName: true } },
        stepVersion: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log('\n=== Últimos 10 Requisitos de Assinatura no Sistema ===\n');
    allRequirements.forEach((req, idx) => {
      console.log(`${idx + 1}. ${req.stepVersion.name} - ${req.user?.name || 'N/A'}`);
      console.log(`   Anexo: ${req.attachment?.originalName || 'N/A'}`);
      console.log(`   Criado em: ${req.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignatureRequirements();
