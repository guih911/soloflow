const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const processCode = 'PROC-2025-0043';
    const userId = '7d6bb1ac-64d6-48cb-acd8-b83bc20c438b'; // Matheus

    console.log(`\n🔍 Debugando ${processCode}\n`);

    // 1. Buscar o processo
    const process = await prisma.processInstance.findFirst({
      where: { code: processCode },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        stepExecutions: {
          select: {
            id: true,
            status: true,
            stepVersionId: true,
            attachments: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                isSigned: true
              }
            }
          }
        }
      }
    });

    if (!process) {
      console.log('❌ Processo não encontrado');
      return;
    }

    console.log(`✅ Processo: ${process.code} (${process.status})`);
    console.log(`   Título: ${process.title || 'N/A'}\n`);

    // 2. Para cada etapa, verificar anexos e requisitos
    for (const exec of process.stepExecutions) {
      console.log(`📋 Etapa ID: ${exec.id}`);
      console.log(`   Status: ${exec.status}`);
      console.log(`   StepVersionId: ${exec.stepVersionId}`);
      console.log(`   Anexos: ${exec.attachments.length}`);

      for (const att of exec.attachments) {
        console.log(`\n   📎 ${att.originalName}`);
        console.log(`      ID: ${att.id}`);
        console.log(`      Tipo: ${att.mimeType}`);
        console.log(`      Assinado: ${att.isSigned ? 'SIM' : 'NÃO'}`);

        // Buscar requisitos para este anexo
        const requirements = await prisma.$queryRaw`
          SELECT * FROM signature_requirements
          WHERE "attachmentId" = ${att.id}
        `;

        console.log(`      Requisitos de assinatura: ${requirements.length}`);

        if (requirements.length > 0) {
          for (const req of requirements) {
            console.log(`         - Requisito ID: ${req.id}`);
            console.log(`           UserId: ${req.userId}`);
            console.log(`           Order: ${req.order}`);
            console.log(`           Type: ${req.type}`);
            console.log(`           Required: ${req.isRequired}`);

            // Verificar registros
            const records = await prisma.$queryRaw`
              SELECT * FROM signature_records
              WHERE "requirementId" = ${req.id}
            `;

            console.log(`           Registros: ${records.length}`);
          }
        }
      }
      console.log('');
    }

    // 3. Buscar todas as signature requirements da etapa
    console.log(`\n🔎 Buscando TODOS os requisitos de assinatura do processo...\n`);

    for (const exec of process.stepExecutions) {
      const allReqs = await prisma.$queryRaw`
        SELECT sr.*, a.originalName as attachmentName
        FROM signature_requirements sr
        LEFT JOIN attachments a ON a.id = sr."attachmentId"
        WHERE sr."stepVersionId" = ${exec.stepVersionId}
      `;

      if (allReqs.length > 0) {
        console.log(`📋 StepVersion ${exec.stepVersionId}:`);
        for (const req of allReqs) {
          console.log(`   - ${req.attachmentName || 'N/A'}`);
          console.log(`     Req ID: ${req.id}`);
          console.log(`     UserId: ${req.userId}`);
          console.log(`     AttachmentId: ${req.attachmentId}`);
        }
        console.log('');
      }
    }

    // 4. Verificar assinaturas pendentes para o usuário
    console.log(`\n📝 Assinaturas pendentes para Matheus Araujo:\n`);

    const pending = await prisma.$queryRaw`
      SELECT
        sr.*,
        a.originalName,
        se.status as executionStatus,
        pi.code as processCode
      FROM signature_requirements sr
      LEFT JOIN attachments a ON a.id = sr."attachmentId"
      LEFT JOIN step_executions se ON se."stepVersionId" = sr."stepVersionId"
      LEFT JOIN process_instances pi ON pi.id = se."processInstanceId"
      WHERE sr."userId" = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM signature_records sig
        WHERE sig."requirementId" = sr.id
        AND sig."signerId" = ${userId}
        AND sig.status = 'COMPLETED'
      )
    `;

    console.log(`Total: ${pending.length}\n`);

    for (const p of pending) {
      console.log(`   - Processo: ${p.processCode || 'N/A'}`);
      console.log(`     Anexo: ${p.originalName || 'N/A'}`);
      console.log(`     Requisito ID: ${p.id}`);
      console.log(`     Execution Status: ${p.executionStatus || 'N/A'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
