import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPermissions() {
  console.log('🔧 Corrigindo permissões de process_types...');

  // Atualizar permissões que usam 'processTypes' ou 'processtypes' para 'process_types'
  const result1 = await prisma.profile_permissions.updateMany({
    where: {
      resource: 'processTypes',
    },
    data: {
      resource: 'process_types',
    },
  });

  console.log(`✅ Atualizadas ${result1.count} permissões de 'processTypes' para 'process_types'`);

  const result2 = await prisma.profile_permissions.updateMany({
    where: {
      resource: 'processtypes',
    },
    data: {
      resource: 'process_types',
    },
  });

  console.log(`✅ Atualizadas ${result2.count} permissões de 'processtypes' para 'process_types'`);

  // Verificar permissões atuais
  const permissions = await prisma.profile_permissions.findMany({
    where: {
      resource: {
        contains: 'process',
      },
    },
    select: {
      id: true,
      resource: true,
      action: true,
    },
  });

  console.log('\n📋 Permissões relacionadas a processos:');
  permissions.forEach(p => {
    console.log(`  - ${p.resource}:${p.action}`);
  });

  console.log('\n✅ Correção concluída!');
}

fixPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
