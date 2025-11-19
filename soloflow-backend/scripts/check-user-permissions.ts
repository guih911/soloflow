import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserPermissions() {
  console.log('🔍 Verificando usuários e permissões...\n');

  // Buscar últimos usuários criados
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      userCompanies: {
        include: {
          company: true,
          sector: true,
        },
      },
      user_profiles: {
        include: {
          profiles: {
            include: {
              profile_permissions: true,
              profile_process_types: true,
            },
          },
        },
      },
    },
  });

  console.log(`📊 Total de usuários encontrados: ${users.length}\n`);

  for (const user of users) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Usuário: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📅 Criado em: ${user.createdAt}`);

    console.log(`\n🏢 Empresas (${user.userCompanies.length}):`);
    for (const uc of user.userCompanies) {
      console.log(`  • ${uc.company.name}`);
      console.log(`    - Role: ${uc.role}`);
      console.log(`    - Setor: ${uc.sector?.name || 'Nenhum'}`);
      console.log(`    - Padrão: ${uc.isDefault ? 'Sim' : 'Não'}`);
    }

    console.log(`\n🎭 Perfis Atribuídos (${user.user_profiles.length}):`);
    if (user.user_profiles.length === 0) {
      console.log(`  ⚠️  NENHUM PERFIL ATRIBUÍDO!`);
      console.log(`  ⚠️  Este usuário NÃO TEM PERMISSÕES!`);
    } else {
      for (const up of user.user_profiles) {
        console.log(`  • ${up.profiles.name}`);
        console.log(`    - Empresa: ${up.companyId}`);
        console.log(`    - Permissões: ${up.profiles.profile_permissions.length}`);
        console.log(`    - Tipos de Processo: ${up.profiles.profile_process_types.length}`);

        if (up.profiles.profile_permissions.length > 0) {
          console.log(`    - Detalhes das Permissões:`);
          for (const perm of up.profiles.profile_permissions) {
            console.log(`      ✓ ${perm.resource}:${perm.action}`);
          }
        }

        if (up.profiles.profile_process_types.length > 0) {
          console.log(`    - Detalhes dos Tipos de Processo:`);
          for (const pt of up.profiles.profile_process_types) {
            console.log(`      ✓ ProcessTypeId: ${pt.processTypeId}`);
            console.log(`        View: ${pt.canView} | Create: ${pt.canCreate} | Execute: ${pt.canExecute}`);
          }
        }
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Verificar perfis disponíveis
  const profiles = await prisma.profiles.findMany({
    include: {
      profile_permissions: true,
      profile_process_types: true,
      _count: {
        select: {
          user_profiles: true,
        },
      },
    },
  });

  console.log(`\n📋 Perfis Disponíveis (${profiles.length}):\n`);
  for (const profile of profiles) {
    console.log(`🎭 ${profile.name}`);
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - Empresa: ${profile.companyId || 'Global'}`);
    console.log(`   - Padrão: ${profile.isDefault ? 'Sim' : 'Não'}`);
    console.log(`   - Usuários usando: ${profile._count.user_profiles}`);
    console.log(`   - Permissões: ${profile.profile_permissions.length}`);
    console.log(`   - Tipos de Processo: ${profile.profile_process_types.length}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkUserPermissions().catch((e) => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
