const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSignatureTypes() {
  try {
    console.log('🔍 Verificando tipos de assinatura no banco...\n');

    // Buscar todos os requisitos de assinatura
    const requirements = await prisma.signatureRequirement.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        stepVersion: {
          select: { name: true }
        },
        attachment: {
          select: { originalName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`📊 Total de requisitos encontrados: ${requirements.length}\n`);

    if (requirements.length === 0) {
      console.log('⚠️  Nenhum requisito de assinatura encontrado no banco.');
      return;
    }

    // Agrupar por tipo
    const byType = requirements.reduce((acc, req) => {
      const type = req.type || 'NULL';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(req);
      return acc;
    }, {});

    console.log('📋 Resumo por tipo:');
    Object.keys(byType).forEach(type => {
      console.log(`   ${type}: ${byType[type].length} requisitos`);
    });

    console.log('\n📝 Detalhes dos requisitos (últimos 20):');
    requirements.forEach((req, index) => {
      console.log(`\n${index + 1}. Requisito ID: ${req.id}`);
      console.log(`   Tipo: ${req.type || 'NULL'}`);
      console.log(`   Ordem: ${req.order}`);
      console.log(`   Usuário: ${req.user?.name || 'N/A'} (${req.user?.email || 'N/A'})`);
      console.log(`   Etapa: ${req.stepVersion?.name || 'N/A'}`);
      console.log(`   Anexo: ${req.attachment?.originalName || 'N/A'}`);
      console.log(`   Obrigatório: ${req.isRequired ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${req.createdAt.toLocaleString('pt-BR')}`);
    });

    // Verificar se há requisitos com assinaturas completas
    const withRecords = await prisma.signatureRequirement.findMany({
      where: {
        signatureRecords: {
          some: {}
        }
      },
      include: {
        signatureRecords: {
          select: {
            status: true,
            signedAt: true
          }
        },
        user: {
          select: { name: true }
        }
      },
      take: 10
    });

    console.log(`\n\n✅ Requisitos com registros de assinatura: ${withRecords.length}`);
    withRecords.forEach((req, index) => {
      console.log(`\n${index + 1}. Requisito ${req.id} (${req.type || 'NULL'})`);
      console.log(`   Usuário: ${req.user?.name || 'N/A'}`);
      console.log(`   Assinaturas: ${req.signatureRecords.length}`);
      req.signatureRecords.forEach(record => {
        console.log(`      - Status: ${record.status}, Assinado em: ${record.signedAt?.toLocaleString('pt-BR') || 'N/A'}`);
      });
    });

  } catch (error) {
    console.error('❌ Erro ao verificar tipos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSignatureTypes();
