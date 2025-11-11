const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSignatureRequirements() {
  console.log('=== Corrigindo Requisitos de Assinatura ===\n');

  try {
    // Buscar todos os requisitos de assinatura
    const requirements = await prisma.signatureRequirement.findMany({
      include: {
        stepVersion: {
          select: {
            id: true,
            name: true,
            processTypeVersion: {
              select: {
                id: true,
                processType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        attachment: true,
      },
    });

    console.log(`📊 Total de requisitos encontrados: ${requirements.length}\n`);

    for (const req of requirements) {
      console.log(`Requisito: ${req.id}`);
      console.log(`  Etapa: ${req.stepVersion.name}`);
      console.log(`  Tipo de Processo: ${req.stepVersion.processTypeVersion.processType.name}`);
      console.log(`  Usuário: ${req.user?.name || 'N/A'}`);
      console.log(`  AttachmentId atual: ${req.attachmentId || 'NULL'}`);

      if (req.attachmentId) {
        if (!req.attachment) {
          console.log(`  ⚠️  Anexo não existe mais - será removido`);
        } else {
          console.log(`  ⚠️  Anexo existe: ${req.attachment.originalName}`);
          console.log(`  ⚠️  Mas não deveria estar aqui - requisitos são templates!`);
        }

        // Remover attachmentId dos requisitos de template
        await prisma.signatureRequirement.update({
          where: { id: req.id },
          data: { attachmentId: null },
        });

        console.log(`  ✅ attachmentId removido (requisito agora é template genérico)\n`);
      } else {
        console.log(`  ✅ OK - Requisito já é template genérico\n`);
      }
    }

    console.log('\n=== Resumo ===');
    console.log('Os requisitos de assinatura agora são templates genéricos.');
    console.log('O attachmentId será associado dinamicamente quando assinar.');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSignatureRequirements();
