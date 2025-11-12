const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkParallelVisibility() {
  try {
    console.log('🔍 Verificando visibilidade de assinaturas PARALLEL...\n');

    // ID do usuário Matheus Araujo
    const userId = 'f39c6c45-fd10-45dd-8f0d-c68cc1d90858'; // admin@soloflow.com.br

    // 1. Buscar o requisito PARALLEL
    const parallelReq = await prisma.signatureRequirement.findFirst({
      where: {
        type: 'PARALLEL'
      },
      include: {
        user: { select: { name: true, email: true } },
        stepVersion: {
          select: {
            name: true,
            id: true,
            processTypeVersionId: true
          }
        },
        attachment: { select: { originalName: true } },
        signatureRecords: {
          where: {
            signerId: userId,
            status: 'COMPLETED'
          }
        }
      }
    });

    if (!parallelReq) {
      console.log('⚠️  Nenhum requisito PARALLEL encontrado');
      return;
    }

    console.log('📋 Requisito PARALLEL encontrado:');
    console.log(`   ID: ${parallelReq.id}`);
    console.log(`   Tipo: ${parallelReq.type}`);
    console.log(`   Usuário: ${parallelReq.user?.name} (${parallelReq.user?.email})`);
    console.log(`   Step Version ID: ${parallelReq.stepVersionId}`);
    console.log(`   Etapa: ${parallelReq.stepVersion?.name}`);
    console.log(`   Anexo: ${parallelReq.attachment?.originalName || 'N/A'}`);
    console.log(`   Assinaturas completas do usuário: ${parallelReq.signatureRecords.length}`);

    // 2. Buscar StepExecution relacionada
    const stepExecutions = await prisma.stepExecution.findMany({
      where: {
        stepVersionId: parallelReq.stepVersionId
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        processInstance: {
          select: {
            id: true,
            code: true,
            title: true,
            companyId: true
          }
        }
      }
    });

    console.log(`\n📊 Step Executions encontradas para essa etapa: ${stepExecutions.length}`);
    stepExecutions.forEach((exec, i) => {
      console.log(`\n   ${i + 1}. Execution ID: ${exec.id}`);
      console.log(`      Status: ${exec.status}`);
      console.log(`      Processo: ${exec.processInstance.code} - ${exec.processInstance.title || 'N/A'}`);
      console.log(`      Company ID: ${exec.processInstance.companyId}`);
      console.log(`      Criado em: ${exec.createdAt.toLocaleString('pt-BR')}`);
    });

    // 3. Simular a query do backend (getMyTasks)
    console.log('\n\n🔍 Simulando query do backend (getMyTasks)...');

    const companyId = stepExecutions[0]?.processInstance?.companyId;
    if (!companyId) {
      console.log('⚠️  Não foi possível determinar o companyId');
      return;
    }

    const signatureTasks = await prisma.stepExecution.findMany({
      where: {
        processInstance: { companyId },
        stepVersion: {
          signatureRequirements: {
            some: {
              userId: userId,
              signatureRecords: {
                none: {
                  signerId: userId,
                  status: 'COMPLETED',
                },
              },
            },
          },
        },
      },
      include: {
        stepVersion: {
          select: {
            name: true,
            requiresSignature: true,
            signatureRequirements: {
              where: {
                userId: userId
              },
              include: {
                signatureRecords: {
                  where: {
                    signerId: userId
                  }
                }
              }
            }
          }
        },
        processInstance: {
          select: {
            id: true,
            code: true,
            title: true
          }
        }
      }
    });

    console.log(`\n✅ Tarefas de assinatura retornadas: ${signatureTasks.length}`);

    signatureTasks.forEach((task, i) => {
      console.log(`\n${i + 1}. Task ID: ${task.id}`);
      console.log(`   Processo: ${task.processInstance.code} - ${task.processInstance.title || 'N/A'}`);
      console.log(`   Etapa: ${task.stepVersion.name}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Requires Signature: ${task.stepVersion.requiresSignature}`);
      console.log(`   Requisitos de assinatura: ${task.stepVersion.signatureRequirements.length}`);

      task.stepVersion.signatureRequirements.forEach((req, j) => {
        console.log(`      ${j + 1}. Tipo: ${req.type}, Ordem: ${req.order}, Registros: ${req.signatureRecords.length}`);
      });
    });

    // Verificar se o requisito PARALLEL está incluído
    const hasParallel = signatureTasks.some(task =>
      task.stepVersion.signatureRequirements.some(req => req.id === parallelReq.id)
    );

    console.log(`\n\n${hasParallel ? '✅' : '❌'} Requisito PARALLEL está ${hasParallel ? '' : 'NÃO '}incluído nas tarefas retornadas`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParallelVisibility();
