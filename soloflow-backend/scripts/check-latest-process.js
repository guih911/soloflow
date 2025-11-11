const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestProcess() {
  try {
    console.log('=== Verificando Último Processo Criado ===\n');

    // Buscar últimos 3 processos criados
    const processes = await prisma.processInstance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
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
            attachments: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                isSigned: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    for (const process of processes) {
      console.log(`\n📋 Processo: ${process.code}`);
      console.log(`   ID: ${process.id}`);
      console.log(`   Título: ${process.title || 'N/A'}`);
      console.log(`   Status: ${process.status}`);
      console.log(`   Criado por: ${process.createdBy?.name || 'N/A'}`);
      console.log(`   Criado em: ${process.createdAt}`);
      console.log(`   Etapas: ${process.stepExecutions.length}`);

      for (const execution of process.stepExecutions) {
        console.log(`\n   🔹 Etapa: ${execution.stepVersion.name}`);
        console.log(`      Status: ${execution.status}`);
        console.log(`      Requer assinatura: ${execution.stepVersion.requiresSignature ? 'SIM' : 'NÃO'}`);
        console.log(`      Anexos: ${execution.attachments.length}`);

        if (execution.attachments.length > 0) {
          execution.attachments.forEach((att, idx) => {
            console.log(`        ${idx + 1}. ${att.originalName} (${att.mimeType})`);
          });
        }

        console.log(`      Requisitos de assinatura: ${execution.stepVersion.signatureRequirements.length}`);

        if (execution.stepVersion.signatureRequirements.length > 0) {
          execution.stepVersion.signatureRequirements.forEach((req, idx) => {
            console.log(`        ${idx + 1}. ${req.user?.name || 'N/A'} (${req.userId})`);
            console.log(`           Anexo: ${req.attachment?.originalName || req.attachmentId || 'N/A'}`);
            console.log(`           Ordem: ${req.order} | Tipo: ${req.type}`);
            console.log(`           Registros: ${req.signatureRecords.length}`);
          });
        }
      }

      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestProcess();
