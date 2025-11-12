const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttachmentsForParallel() {
  try {
    console.log('🔍 Verificando anexos para requisitos PARALLEL...\n');

    const userId = '7d6bb1ac-64d6-48cb-acd8-b83bc20c438b'; // Matheus Araujo

    // Buscar o requisito PARALLEL pendente
    const parallelReq = await prisma.signatureRequirement.findFirst({
      where: {
        userId: userId,
        type: 'PARALLEL',
        signatureRecords: {
          none: {
            signerId: userId,
            status: 'COMPLETED'
          }
        }
      },
      include: {
        attachment: true,
        stepVersion: {
          select: {
            name: true,
            id: true
          }
        }
      }
    });

    if (!parallelReq) {
      console.log('❌ Nenhum requisito PARALLEL pendente encontrado');
      return;
    }

    console.log('📋 Requisito PARALLEL pendente:');
    console.log(`   ID: ${parallelReq.id}`);
    console.log(`   Step: ${parallelReq.stepVersion.name}`);
    console.log(`   Attachment ID: ${parallelReq.attachmentId}`);
    console.log(`   Attachment: ${parallelReq.attachment?.originalName || 'N/A'}`);

    // Buscar StepExecutions relacionadas
    const executions = await prisma.stepExecution.findMany({
      where: {
        stepVersionId: parallelReq.stepVersionId
      },
      include: {
        attachments: {
          where: {
            id: parallelReq.attachmentId
          }
        },
        processInstance: {
          select: {
            code: true,
            title: true
          }
        }
      }
    });

    console.log(`\n📊 Step Executions: ${executions.length}\n`);

    executions.forEach((exec, i) => {
      console.log(`${i + 1}. Execution ${exec.id}`);
      console.log(`   Status: ${exec.status}`);
      console.log(`   Processo: ${exec.processInstance.code}`);
      console.log(`   Anexos relacionados: ${exec.attachments.length}`);

      exec.attachments.forEach(att => {
        console.log(`      - ${att.originalName || att.filename}`);
        console.log(`        ID: ${att.id}`);
        console.log(`        isSigned: ${att.isSigned}`);
        console.log(`        mimeType: ${att.mimeType}`);
      });
    });

    // Buscar TODOS os anexos dessas execuções
    console.log('\n\n📎 TODOS os anexos das execuções:\n');

    for (const exec of executions) {
      const allAttachments = await prisma.attachment.findMany({
        where: {
          stepExecutionId: exec.id
        }
      });

      console.log(`Execution ${exec.id}:`);
      console.log(`   Total de anexos: ${allAttachments.length}`);

      allAttachments.forEach(att => {
        const isTarget = att.id === parallelReq.attachmentId;
        console.log(`   ${isTarget ? '🎯' : '  '} ${att.originalName || att.filename}`);
        console.log(`      ID: ${att.id}`);
        console.log(`      isSigned: ${att.isSigned}`);
        console.log(`      mimeType: ${att.mimeType}`);
        console.log(`      Tem requisito PARALLEL: ${isTarget ? 'SIM' : 'não'}`);
      });
    }

    // Verificar o que o backend retorna
    console.log('\n\n🔍 Simulando resposta do backend (myTasks)...\n');

    const companyId = '708e2a13-c044-48df-8067-749c0b5a20f6';

    const tasks = await prisma.stepExecution.findMany({
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
            requiresSignature: true
          }
        },
        attachments: true,
        processInstance: {
          select: {
            code: true
          }
        }
      }
    });

    console.log(`✅ Tarefas retornadas: ${tasks.length}\n`);

    tasks.forEach((task, i) => {
      console.log(`${i + 1}. ${task.processInstance.code} - ${task.stepVersion.name}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   requiresSignature: ${task.stepVersion.requiresSignature}`);
      console.log(`   Total anexos: ${task.attachments.length}`);

      const pdfAttachments = task.attachments.filter(att => att.mimeType === 'application/pdf');
      const unsignedPdfs = pdfAttachments.filter(att => !att.isSigned);

      console.log(`   PDFs: ${pdfAttachments.length}`);
      console.log(`   PDFs não assinados: ${unsignedPdfs.length}`);

      unsignedPdfs.forEach(att => {
        console.log(`      - ${att.originalName || att.filename} (isSigned: ${att.isSigned})`);
      });

      if (unsignedPdfs.length === 0) {
        console.log(`   ⚠️  PROBLEMA: Nenhum PDF não assinado encontrado!`);
        console.log(`   🔍 Isso fará o frontend filtrar esta tarefa fora!`);
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttachmentsForParallel();
