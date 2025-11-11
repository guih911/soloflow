const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProcessSignatures() {
  try {
    const processCode = 'PROC-2025-0043';

    console.log(`\n🔍 Debugando assinaturas do processo ${processCode}\n`);

    // Buscar o processo
    const process = await prisma.processInstance.findFirst({
      where: { code: processCode },
      include: {
        stepExecutions: {
          include: {
            attachments: {
              include: {
                signatureRecords: true
              }
            }
          }
        }
      }
    });

    // Buscar step versions com requirements
    if (process) {
      for (const execution of process.stepExecutions) {
        const stepVersion = await prisma.stepVersion.findUnique({
          where: { id: execution.stepVersionId },
          include: {
            step: true,
            signatureRequirements: {
              include: {
                user: true,
                signatureRecords: true
              }
            }
          }
        });
        execution.stepVersion = stepVersion;
        execution.step = stepVersion.step;
      }
    }

    if (!process) {
      console.log('❌ Processo não encontrado');
      return;
    }

    console.log(`✅ Processo: ${process.code}`);
    console.log(`   Status: ${process.status}`);
    console.log(`   Título: ${process.title || 'Sem título'}\n`);

    // Listar todas as etapas
    for (const execution of process.stepExecutions) {
      console.log(`\n📋 Etapa: ${execution.step.name}`);
      console.log(`   ID da execução: ${execution.id}`);
      console.log(`   Status: ${execution.status}`);
      console.log(`   StepVersionId: ${execution.stepVersionId}`);
      console.log(`   Requer assinatura: ${execution.step.requiresSignature ? 'SIM' : 'NÃO'}`);

      // Anexos
      console.log(`\n   📎 Anexos (${execution.attachments.length}):`);
      for (const attachment of execution.attachments) {
        console.log(`      - ${attachment.originalName}`);
        console.log(`        ID: ${attachment.id}`);
        console.log(`        Tipo: ${attachment.mimeType}`);
        console.log(`        Assinado: ${attachment.isSigned ? 'SIM' : 'NÃO'}`);
        console.log(`        Registros de assinatura: ${attachment.signatureRecords.length}`);
      }

      // Requisitos de assinatura
      const requirements = execution.stepVersion.signatureRequirements;
      console.log(`\n   ✍️  Requisitos de Assinatura (${requirements.length}):`);

      if (requirements.length === 0) {
        console.log(`      ⚠️  NENHUM REQUISITO CRIADO!`);
      } else {
        for (const req of requirements) {
          console.log(`\n      Requisito #${req.order}:`);
          console.log(`        ID: ${req.id}`);
          console.log(`        Usuário: ${req.user?.name || 'N/A'} (${req.userId})`);
          console.log(`        Anexo ID: ${req.attachmentId}`);
          console.log(`        Tipo: ${req.type}`);
          console.log(`        Obrigatório: ${req.isRequired ? 'SIM' : 'NÃO'}`);
          console.log(`        Registros de assinatura: ${req.signatureRecords.length}`);

          if (req.signatureRecords.length > 0) {
            for (const record of req.signatureRecords) {
              console.log(`          - Status: ${record.status} | Assinado em: ${record.signedAt}`);
            }
          } else {
            console.log(`          ⚠️  NENHUMA ASSINATURA REGISTRADA`);
          }
        }
      }
    }

    // Buscar assinaturas pendentes para o usuário
    console.log(`\n\n🔎 Verificando assinaturas pendentes no sistema...\n`);

    const userId = '7d6bb1ac-64d6-48cb-acd8-b83bc20c438b'; // Matheus Araujo

    const pendingSignatures = await prisma.signatureRequirement.findMany({
      where: {
        userId: userId,
        signatureRecords: {
          none: {
            signerId: userId,
            status: 'COMPLETED'
          }
        }
      },
      include: {
        attachment: {
          include: {
            stepExecution: {
              include: {
                step: true,
                processInstance: true
              }
            }
          }
        },
        user: true,
        signatureRecords: true
      }
    });

    console.log(`📝 Assinaturas pendentes para Matheus Araujo: ${pendingSignatures.length}\n`);

    for (const pending of pendingSignatures) {
      console.log(`   - Processo: ${pending.attachment.stepExecution.processInstance.code}`);
      console.log(`     Etapa: ${pending.attachment.stepExecution.step.name}`);
      console.log(`     Anexo: ${pending.attachment.originalName}`);
      console.log(`     Status do anexo: ${pending.attachment.stepExecution.status}`);
      console.log(`     Registros: ${pending.signatureRecords.length}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProcessSignatures();
