const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFixedQuery() {
  try {
    console.log('🧪 Testando query corrigida para PARALLEL...\n');

    const userId = '7d6bb1ac-64d6-48cb-acd8-b83bc20c438b'; // Matheus Araujo
    const companyId = '708e2a13-c044-48df-8067-749c0b5a20f6';

    console.log('📋 Query ANTIGA (retorna execuções sem anexos):');
    const oldQuery = await prisma.stepExecution.findMany({
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
      select: {
        id: true,
        status: true,
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            isSigned: true
          }
        },
        processInstance: {
          select: {
            code: true
          }
        },
        stepVersion: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`   Resultado: ${oldQuery.length} execuções\n`);
    oldQuery.forEach((exec, i) => {
      const pdfs = exec.attachments.filter(a => a.mimeType === 'application/pdf');
      const unsignedPdfs = pdfs.filter(a => !a.isSigned);
      console.log(`   ${i + 1}. ${exec.processInstance.code} - ${exec.stepVersion.name}`);
      console.log(`      Status: ${exec.status}`);
      console.log(`      Anexos: ${exec.attachments.length} total, ${pdfs.length} PDFs, ${unsignedPdfs.length} PDFs não assinados`);
      if (unsignedPdfs.length === 0) {
        console.log(`      ⚠️  Esta execução será FILTRADA FORA no frontend!`);
      }
    });

    console.log('\n\n📋 Query NOVA (filtra apenas execuções com anexos PDF não assinados):');
    const newQuery = await prisma.stepExecution.findMany({
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
        // Filtro crucial: execução DEVE ter anexos PDF não assinados
        attachments: {
          some: {
            mimeType: 'application/pdf',
            isSigned: false
          }
        }
      },
      select: {
        id: true,
        status: true,
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            isSigned: true
          }
        },
        processInstance: {
          select: {
            code: true
          }
        },
        stepVersion: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`   Resultado: ${newQuery.length} execuções\n`);
    newQuery.forEach((exec, i) => {
      const pdfs = exec.attachments.filter(a => a.mimeType === 'application/pdf');
      const unsignedPdfs = pdfs.filter(a => !a.isSigned);
      console.log(`   ${i + 1}. ${exec.processInstance.code} - ${exec.stepVersion.name}`);
      console.log(`      Status: ${exec.status}`);
      console.log(`      Anexos: ${exec.attachments.length} total, ${pdfs.length} PDFs, ${unsignedPdfs.length} PDFs não assinados`);
      console.log(`      ✅ Esta execução será exibida no frontend!`);
    });

    console.log('\n\n📊 Comparação:');
    console.log(`   Query antiga: ${oldQuery.length} execuções (algumas sem anexos)`);
    console.log(`   Query nova: ${newQuery.length} execuções (todas com anexos PDF não assinados)`);
    console.log(`   ${oldQuery.length - newQuery.length} execuções foram corretamente filtradas`);

    if (newQuery.length > 0) {
      console.log('\n✅ SUCESSO: Query corrigida agora retorna apenas execuções com anexos para assinar!');
      console.log('   As assinaturas PARALLEL agora aparecerão corretamente no frontend.');
    } else {
      console.log('\n⚠️  Nenhuma execução com anexos pendentes foi encontrada.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedQuery();
