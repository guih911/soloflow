const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicateFilenames() {
  try {
    console.log('🔍 Verificando filenames duplicados no banco...\n');

    // Buscar todos os attachments
    const attachments = await prisma.attachment.findMany({
      select: {
        id: true,
        filename: true,
        originalName: true,
        createdAt: true
      },
      orderBy: { filename: 'asc' }
    });

    console.log(`📊 Total de anexos: ${attachments.length}\n`);

    // Agrupar por filename
    const grouped = attachments.reduce((acc, att) => {
      if (!acc[att.filename]) {
        acc[att.filename] = [];
      }
      acc[att.filename].push(att);
      return acc;
    }, {});

    // Encontrar duplicatas
    const duplicates = Object.entries(grouped).filter(([filename, atts]) => atts.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ Nenhum filename duplicado encontrado!');
      console.log('   É seguro adicionar a constraint @@unique([filename])');
    } else {
      console.log(`⚠️  Encontradas ${duplicates.length} filenames duplicados:\n`);

      duplicates.forEach(([filename, atts], i) => {
        console.log(`${i + 1}. Filename: ${filename}`);
        console.log(`   Aparece ${atts.length} vezes:`);
        atts.forEach(att => {
          console.log(`      - ID: ${att.id}`);
          console.log(`        Original: ${att.originalName}`);
          console.log(`        Criado: ${att.createdAt.toLocaleString('pt-BR')}`);
        });
        console.log('');
      });

      console.log('❌ AÇÃO NECESSÁRIA:');
      console.log('   Você precisa resolver as duplicatas antes de adicionar a constraint.');
      console.log('   Sugestões:');
      console.log('   1. Deletar os registros mais antigos');
      console.log('   2. Renomear os arquivos duplicados no disco e atualizar o banco');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateFilenames();
