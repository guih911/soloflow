const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeSignatureFlow() {
  console.log('=== Analisando Fluxo de Assinaturas ===\n');

  try {
    // Buscar o último processo
    const process = await prisma.processInstance.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        stepExecutions: {
          include: {
            stepVersion: {
              include: {
                signatureRequirements: {
                  include: {
                    user: true,
                    attachment: {
                      include: {
                        stepExecution: {
                          include: {
                            processInstance: true,
                          },
                        },
                      },
                    },
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
      console.log('Nenhum processo encontrado');
      return;
    }

    console.log(`📋 Processo: ${process.code}`);
    console.log(`   ID: ${process.id}\n`);

    for (const execution of process.stepExecutions) {
      console.log(`🔹 Etapa: ${execution.stepVersion.name || 'N/A'}`);

      // Mostrar anexos da execução
      console.log(`\n   Anexos desta execução:`);
      if (execution.attachments.length === 0) {
        console.log(`   (nenhum)`);
      } else {
        execution.attachments.forEach((att, idx) => {
          console.log(`   ${idx + 1}. ${att.originalName}`);
          console.log(`      ID: ${att.id}`);
        });
      }

      // Mostrar requisitos da stepVersion
      console.log(`\n   Requisitos de assinatura da stepVersion:`);
      if (!execution.stepVersion.signatureRequirements || execution.stepVersion.signatureRequirements.length === 0) {
        console.log(`   (nenhum)`);
      } else {
        execution.stepVersion.signatureRequirements.forEach((req, idx) => {
          console.log(`   ${idx + 1}. Usuário: ${req.user.name}`);
          console.log(`      AttachmentId: ${req.attachmentId}`);

          if (req.attachment) {
            console.log(`      Arquivo: ${req.attachment.originalName}`);
            console.log(`      Processo do anexo: ${req.attachment.stepExecution?.processInstance?.code || 'N/A'}`);

            // Verificar se o anexo pertence ao processo atual
            const belongsToCurrentProcess = req.attachment.stepExecution?.processInstanceId === process.id;
            console.log(`      Pertence ao processo atual? ${belongsToCurrentProcess ? '✅ SIM' : '❌ NÃO'}`);
          } else {
            console.log(`      ❌ Anexo não encontrado (órfão)`);
          }
        });
      }

      console.log(`\n   ${'='.repeat(60)}\n`);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSignatureFlow();
