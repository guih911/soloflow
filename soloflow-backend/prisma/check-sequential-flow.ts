import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando fluxo de assinatura sequencial ===\n');

  // Buscar o processo mais recente com assinatura sequencial
  const process = await prisma.processInstance.findFirst({
    where: {
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      stepExecutions: {
        include: {
          stepVersion: {
            include: {
              signatureRequirements: {
                include: {
                  user: { select: { id: true, name: true } },
                  sector: { select: { id: true, name: true } },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          attachments: {
            select: {
              id: true,
              originalName: true,
              isSigned: true,
            },
          },
        },
      },
    },
  });

  if (!process) {
    console.log('Nenhum processo encontrado');
    return;
  }

  console.log(`Processo: ${process.code}`);
  console.log(`Status: ${process.status}\n`);

  for (const exec of process.stepExecutions) {
    console.log(`\n=== Etapa: ${exec.stepVersion.name} ===`);
    console.log(`Status: ${exec.status}`);
    console.log(`StepVersionId: ${exec.stepVersionId}`);

    // Buscar requisitos com registros de assinatura
    const requirements = await prisma.signatureRequirement.findMany({
      where: { stepVersionId: exec.stepVersionId },
      include: {
        user: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        signatureRecords: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            attachmentId: true,
            signedAt: true,
            signer: { select: { name: true } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    console.log(`\nRequisitos de assinatura:`);
    for (const req of requirements) {
      const signed = req.signatureRecords.length > 0;
      const signerInfo = req.signatureRecords[0]?.signer?.name || '-';
      console.log(`  Ordem ${req.order}: ${req.type}`);
      console.log(`    - Responsável: ${req.user?.name || req.sector?.name || 'N/A'} (userId: ${req.userId || 'null'})`);
      console.log(`    - Anexo: ${req.attachmentId || 'GLOBAL'}`);
      console.log(`    - Assinado: ${signed ? `SIM por ${signerInfo}` : 'NÃO'}`);
    }

    console.log(`\nAnexos da etapa:`);
    for (const att of exec.attachments) {
      console.log(`  - ${att.originalName} (${att.id})`);
      console.log(`    isSigned: ${att.isSigned}`);

      // Buscar assinaturas deste anexo
      const sigs = await prisma.signatureRecord.findMany({
        where: {
          attachmentId: att.id,
          status: 'COMPLETED',
        },
        include: {
          signer: { select: { name: true } },
        },
      });
      console.log(`    Assinaturas: ${sigs.length}`);
      for (const sig of sigs) {
        console.log(`      - ${sig.signer.name} em ${sig.signedAt}`);
      }
    }
  }

  // Simular a lógica do getMyTasks para cada usuário
  console.log('\n\n=== Simulação do getMyTasks ===\n');

  const users = await prisma.user.findMany({
    take: 5,
    include: {
      userCompanies: {
        include: {
          sector: true,
        },
      },
    },
  });

  for (const user of users) {
    console.log(`\nUsuário: ${user.name} (${user.id.substring(0, 8)}...)`);
    const userCompany = user.userCompanies[0];
    const userSectorId = userCompany?.sectorId;

    // Buscar tasks de assinatura
    const signatureTasks = await prisma.stepExecution.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'COMPLETED'] },
        stepVersion: {
          signatureRequirements: {
            some: {
              OR: [
                { userId: user.id },
                { sectorId: userSectorId },
              ],
            },
          },
        },
      },
      include: {
        stepVersion: true,
        attachments: true,
      },
    });

    for (const task of signatureTasks) {
      const allRequirements = await prisma.signatureRequirement.findMany({
        where: { stepVersionId: task.stepVersionId },
        orderBy: { order: 'asc' },
        include: {
          signatureRecords: {
            where: { status: 'COMPLETED' },
          },
        },
      });

      // Agrupar por attachmentId
      const requirementsByAttachment = new Map<string | null, typeof allRequirements>();
      for (const req of allRequirements) {
        const key = req.attachmentId;
        if (!requirementsByAttachment.has(key)) {
          requirementsByAttachment.set(key, []);
        }
        requirementsByAttachment.get(key)!.push(req);
      }

      let canSignSomeAttachment = false;
      let reason = '';

      for (const [attachmentId, requirements] of requirementsByAttachment) {
        const userRequirement = requirements.find(r =>
          r.userId === user.id || (r.sectorId && r.sectorId === userSectorId)
        );

        if (!userRequirement) {
          continue;
        }

        const alreadySigned = userRequirement.signatureRecords.length > 0;
        if (alreadySigned) {
          reason = `Já assinou anexo ${attachmentId || 'global'}`;
          continue;
        }

        if (userRequirement.type === 'PARALLEL') {
          canSignSomeAttachment = true;
          reason = `PARALELO - pode assinar`;
          break;
        }

        if (userRequirement.type === 'SEQUENTIAL') {
          const previousRequirements = requirements.filter(r => r.order < userRequirement.order);
          const allPreviousSigned = previousRequirements.every(req =>
            req.signatureRecords.length > 0
          );

          if (allPreviousSigned) {
            canSignSomeAttachment = true;
            reason = `SEQUENCIAL - todos anteriores assinaram (${previousRequirements.length} requisitos)`;
            break;
          } else {
            const unsigned = previousRequirements.filter(req => req.signatureRecords.length === 0);
            reason = `SEQUENCIAL - aguardando ${unsigned.length} assinatura(s) anterior(es)`;
          }
        }
      }

      console.log(`  Task ${task.id.substring(0, 8)}...:`);
      console.log(`    Pode assinar: ${canSignSomeAttachment ? 'SIM' : 'NÃO'}`);
      console.log(`    Motivo: ${reason}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
