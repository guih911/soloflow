const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugParallelIssue() {
  try {
    console.log('🔍 DEBUG: Por que PARALLEL não aparece?\n');

    const userId = '7d6bb1ac-64d6-48cb-acd8-b83bc20c438b'; // Matheus Araujo
    const companyId = '708e2a13-c044-48df-8067-749c0b5a20f6';

    // 1. Buscar TODOS os requisitos do usuário
    const allRequirements = await prisma.signatureRequirement.findMany({
      where: {
        userId: userId
      },
      include: {
        stepVersion: {
          select: {
            name: true,
            id: true
          }
        },
        signatureRecords: {
          where: {
            signerId: userId,
            status: 'COMPLETED'
          }
        }
      }
    });

    console.log(`📋 Total de requisitos do usuário: ${allRequirements.length}\n`);

    allRequirements.forEach((req, i) => {
      const isCompleted = req.signatureRecords.length > 0;
      console.log(`${i + 1}. ${req.type} - Order ${req.order} - ${isCompleted ? '✅ ASSINADO' : '⏳ PENDENTE'}`);
      console.log(`   Step: ${req.stepVersion.name}`);
      console.log(`   Step Version ID: ${req.stepVersionId}`);
      console.log(`   Registros: ${req.signatureRecords.length}`);
    });

    // 2. Para cada requisito PENDENTE, buscar a StepExecution
    const pendingRequirements = allRequirements.filter(req => req.signatureRecords.length === 0);

    console.log(`\n\n⏳ Requisitos PENDENTES: ${pendingRequirements.length}`);

    for (const req of pendingRequirements) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Requisito ${req.type} - Ordem ${req.order}`);
      console.log(`   Step: ${req.stepVersion.name}`);
      console.log(`   Step Version ID: ${req.stepVersionId}`);

      // Buscar StepExecutions para essa Step Version
      const executions = await prisma.stepExecution.findMany({
        where: {
          stepVersionId: req.stepVersionId,
          processInstance: {
            companyId: companyId
          }
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          processInstance: {
            select: {
              code: true,
              title: true,
              status: true
            }
          }
        }
      });

      console.log(`\n   📊 Step Executions encontradas: ${executions.length}`);
      executions.forEach((exec, i) => {
        console.log(`\n   ${i + 1}. Execution ${exec.id}`);
        console.log(`      Status: ${exec.status}`);
        console.log(`      Processo: ${exec.processInstance.code} (${exec.processInstance.status})`);
        console.log(`      Criado: ${exec.createdAt.toLocaleString('pt-BR')}`);
      });

      // Testar query específica
      console.log(`\n   🔍 Testando query do backend para este requisito...`);

      const result = await prisma.stepExecution.findMany({
        where: {
          stepVersionId: req.stepVersionId,
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
        select: {
          id: true,
          status: true
        }
      });

      console.log(`   ${result.length > 0 ? '✅' : '❌'} Query retornou ${result.length} execuções`);
      if (result.length === 0) {
        console.log(`   ⚠️  PROBLEMA ENCONTRADO: StepExecution não foi retornada pela query!`);

        // Verificar por que não foi retornada
        console.log(`\n   🔍 Investigando o problema...`);

        // Testar sem o filtro de signatureRequirements
        const withoutSignatureFilter = await prisma.stepExecution.findMany({
          where: {
            stepVersionId: req.stepVersionId,
            processInstance: { companyId }
          },
          select: {
            id: true,
            status: true
          }
        });

        console.log(`      - Sem filtro de assinatura: ${withoutSignatureFilter.length} execuções`);

        if (withoutSignatureFilter.length > 0 && result.length === 0) {
          console.log(`      ⚠️  A execução existe, mas o filtro de signatureRequirements está bloqueando!`);
        }
      }
    }

    // 3. Verificar se há diferença entre IN_PROGRESS e COMPLETED
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 Testando query com diferentes status de StepExecution...\n');

    for (const status of ['IN_PROGRESS', 'COMPLETED', 'PENDING']) {
      const tasks = await prisma.stepExecution.findMany({
        where: {
          processInstance: { companyId },
          status: status,
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
              signatureRequirements: {
                where: {
                  userId: userId
                },
                select: {
                  type: true,
                  order: true
                }
              }
            }
          }
        }
      });

      console.log(`${status}: ${tasks.length} tarefas`);
      tasks.forEach(task => {
        const reqTypes = task.stepVersion.signatureRequirements.map(r => r.type).join(', ');
        console.log(`   - ${task.stepVersion.name} (${reqTypes})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugParallelIssue();
