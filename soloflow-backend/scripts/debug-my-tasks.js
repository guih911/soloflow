const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugMyTasks() {
  try {
    console.log('=== Debug My Tasks Query ===\n');

    // Buscar o usuário Matheus
    const user = await prisma.user.findFirst({
      where: {
        name: { contains: 'Matheus' },
      },
      include: {
        userCompanies: {
          include: {
            company: true,
            sector: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.id})`);
    console.log(`   Email: ${user.email}`);
    console.log(`   CPF: ${user.cpf || 'N/A'}`);

    if (user.userCompanies.length > 0) {
      console.log(`   Empresas:`);
      user.userCompanies.forEach((uc, idx) => {
        console.log(`     ${idx + 1}. ${uc.company.name} - Setor: ${uc.sector?.name || 'N/A'} (${uc.sectorId})`);
      });
    }

    const userCompany = user.userCompanies[0];
    const userId = user.id;
    const companyId = userCompany.companyId;
    const sectorId = userCompany.sectorId;

    console.log(`\n🔍 Buscando tarefas para:`);
    console.log(`   userId: ${userId}`);
    console.log(`   companyId: ${companyId}`);
    console.log(`   sectorId: ${sectorId}\n`);

    // Testar cada condição separadamente

    // 1. Atribuição direta ao usuário
    console.log('1️⃣ Buscando tarefas com atribuição direta ao usuário...');
    const directAssignment = await prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: { companyId },
        stepVersion: {
          assignments: {
            some: {
              type: 'USER',
              userId: userId,
              isActive: true,
            },
          },
        },
      },
      include: {
        stepVersion: { select: { name: true } },
        processInstance: { select: { code: true } },
      },
    });
    console.log(`   Encontradas: ${directAssignment.length}`);
    directAssignment.forEach(t => {
      console.log(`     - ${t.processInstance.code} / ${t.stepVersion.name}`);
    });

    // 2. Atribuição ao setor
    console.log('\n2️⃣ Buscando tarefas com atribuição ao setor...');
    const sectorAssignment = await prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: { companyId },
        stepVersion: {
          assignments: {
            some: {
              type: 'SECTOR',
              sectorId: sectorId,
              isActive: true,
            },
          },
        },
      },
      include: {
        stepVersion: { select: { name: true } },
        processInstance: { select: { code: true } },
      },
    });
    console.log(`   Encontradas: ${sectorAssignment.length}`);
    sectorAssignment.forEach(t => {
      console.log(`     - ${t.processInstance.code} / ${t.stepVersion.name}`);
    });

    // 3. Tarefas atribuídas ao criador
    console.log('\n3️⃣ Buscando tarefas atribuídas ao criador...');
    const creatorAssignment = await prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: {
          companyId,
          createdById: userId,
        },
        stepVersion: {
          assignedToCreator: true,
        },
      },
      include: {
        stepVersion: { select: { name: true } },
        processInstance: { select: { code: true } },
      },
    });
    console.log(`   Encontradas: ${creatorAssignment.length}`);
    creatorAssignment.forEach(t => {
      console.log(`     - ${t.processInstance.code} / ${t.stepVersion.name}`);
    });

    // 4. Tarefas com assinaturas pendentes
    console.log('\n4️⃣ Buscando tarefas com requisitos de assinatura pendentes...');

    // Primeiro verificar todos os requisitos para este usuário
    const allRequirements = await prisma.signatureRequirement.findMany({
      where: {
        userId: userId,
      },
      include: {
        stepVersion: {
          select: {
            id: true,
            name: true,
            requiresSignature: true,
          },
        },
        signatureRecords: {
          where: {
            signerId: userId,
          },
        },
      },
    });

    console.log(`   Total de requisitos para este usuário: ${allRequirements.length}`);
    allRequirements.forEach((req, idx) => {
      console.log(`     ${idx + 1}. ${req.stepVersion.name}`);
      console.log(`        requiresSignature: ${req.stepVersion.requiresSignature}`);
      console.log(`        Registros de assinatura: ${req.signatureRecords.length}`);
    });

    // Testar SEM o filtro requiresSignature
    const signatureTasks = await prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
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
              where: { userId: userId },
              include: {
                signatureRecords: true,
              },
            },
          }
        },
        processInstance: { select: { code: true } },
      },
    });

    console.log(`   Encontradas: ${signatureTasks.length}`);
    signatureTasks.forEach(t => {
      console.log(`     - ${t.processInstance.code} / ${t.stepVersion.name}`);
      console.log(`       requiresSignature: ${t.stepVersion.requiresSignature}`);
      console.log(`       Requisitos: ${t.stepVersion.signatureRequirements.length}`);
    });

    // Total usando a query real do getMyTasks
    console.log('\n5️⃣ Executando query completa (getMyTasks)...');
    const allTasks = await prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: { companyId },
        OR: [
          {
            stepVersion: {
              assignments: {
                some: {
                  type: 'USER',
                  userId: userId,
                  isActive: true,
                },
              },
            },
          },
          {
            stepVersion: {
              assignments: {
                some: {
                  type: 'SECTOR',
                  sectorId: sectorId,
                  isActive: true,
                },
              },
            },
          },
          {
            AND: [
              {
                stepVersion: {
                  assignedToCreator: true,
                },
              },
              {
                processInstance: {
                  createdById: userId,
                },
              },
            ],
          },
          {
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
        ],
      },
      include: {
        stepVersion: {
          select: {
            name: true,
            requiresSignature: true,
          }
        },
        processInstance: { select: { code: true } },
      },
    });

    console.log(`   Total de tarefas: ${allTasks.length}`);
    allTasks.forEach(t => {
      console.log(`     - ${t.processInstance.code} / ${t.stepVersion.name} (requiresSignature: ${t.stepVersion.requiresSignature})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMyTasks();
