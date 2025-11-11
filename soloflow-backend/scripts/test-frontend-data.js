const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFrontendData() {
  console.log('=== Testando Dados para o Frontend ===\n');

  try {
    // Buscar processo como o backend faz
    const process = await prisma.processInstance.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        stepExecutions: {
          include: {
            stepVersion: {
              include: {
                assignments: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    sector: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                signatureRequirements: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    signatureRecords: {
                      select: {
                        id: true,
                        status: true,
                        signerId: true,
                        requirementId: true,
                      },
                    },
                  },
                },
              },
            },
            executor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            attachments: {
              include: {
                signatureRecords: {
                  select: {
                    id: true,
                    status: true,
                    signerId: true,
                    requirementId: true,
                  },
                },
              },
            },
          },
          orderBy: { stepVersion: { order: 'asc' } },
        },
      },
    });

    if (!process) {
      console.log('Nenhum processo encontrado');
      return;
    }

    console.log(`📋 Processo: ${process.code}`);
    console.log(`   Etapas: ${process.stepExecutions.length}\n`);

    for (const execution of process.stepExecutions) {
      console.log(`🔹 Etapa: ${execution.stepVersion.name}`);
      console.log(`   requiresSignature: ${execution.stepVersion.requiresSignature}`);
      console.log(`   Anexos: ${execution.attachments.length}`);
      console.log(`   Requisitos: ${execution.stepVersion.signatureRequirements?.length || 0}\n`);

      if (execution.stepVersion.signatureRequirements?.length > 0) {
        console.log(`   📝 Requisitos de assinatura (templates):`);
        execution.stepVersion.signatureRequirements.forEach((req, idx) => {
          console.log(`     ${idx + 1}. ${req.user?.name || 'N/A'} (${req.userId})`);
          console.log(`        attachmentId: ${req.attachmentId || 'NULL (template genérico)'}`);
        });
        console.log('');
      }

      if (execution.attachments.length > 0) {
        console.log(`   📎 Anexos:`);
        execution.attachments.forEach((att, idx) => {
          console.log(`     ${idx + 1}. ${att.originalName}`);
          console.log(`        ID: ${att.id}`);
          console.log(`        signatureRecords: ${att.signatureRecords?.length || 0}`);

          if (att.signatureRecords?.length > 0) {
            att.signatureRecords.forEach(record => {
              console.log(`          - Requirement: ${record.requirementId}, Status: ${record.status}`);
            });
          }
        });
        console.log('');
      }

      console.log(`   ${'='.repeat(60)}\n`);
    }

    console.log('\n✅ Dados que o frontend precisa:');
    console.log('   1. stepVersion.requiresSignature = true');
    console.log('   2. stepVersion.signatureRequirements = array de usuários');
    console.log('   3. attachment.signatureRecords = array de assinaturas completas');
    console.log('\n✅ O frontend vai:');
    console.log('   1. Para cada anexo');
    console.log('   2. Se requiresSignature = true');
    console.log('   3. Verificar quais requisitos NÃO tem signatureRecord completo');
    console.log('   4. Mostrar esses como "pendentes"');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendData();
