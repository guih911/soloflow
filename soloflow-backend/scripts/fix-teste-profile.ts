import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTesteProfile() {
  console.log('🔧 Corrigindo permissões do perfil "Teste"...\n');

  // Buscar o perfil "Teste"
  const profile = await prisma.profiles.findFirst({
    where: { name: 'Teste' },
    include: {
      profile_permissions: true,
    },
  });

  if (!profile) {
    console.log('❌ Perfil "Teste" não encontrado!');
    return;
  }

  console.log(`✅ Perfil encontrado: ${profile.name} (${profile.id})\n`);
  console.log('📋 Permissões atuais:');
  profile.profile_permissions.forEach((perm) => {
    console.log(`  • ${perm.resource}:${perm.action}`);
  });

  // Deletar a permissão processes:manage
  const deleted = await prisma.profile_permissions.deleteMany({
    where: {
      profileId: profile.id,
      resource: 'processes',
      action: 'manage',
    },
  });

  console.log(`\n🗑️  Removidas ${deleted.count} permissão(ões) "processes:manage"`);

  // Buscar as permissões atualizadas
  const updated = await prisma.profiles.findUnique({
    where: { id: profile.id },
    include: {
      profile_permissions: true,
    },
  });

  console.log('\n✅ Permissões atualizadas:');
  if (updated) {
    updated.profile_permissions.forEach((perm) => {
      console.log(`  • ${perm.resource}:${perm.action}`);
    });
  }

  console.log('\n🎉 Perfil "Teste" corrigido com sucesso!');
  console.log('\n📝 Itens do menu que devem aparecer:');
  console.log('  ✓ Dashboard');
  console.log('  ✓ Criar Processo (processes:create)');
  console.log('  ✓ Minhas Tarefas');
  console.log('  ✓ Meus Processos');
  console.log('  ✓ Assinaturas');
  console.log('\n📝 Itens que NÃO devem aparecer:');
  console.log('  ✗ Gerenciar Processos (processes:manage - REMOVIDO)');
  console.log('  ✗ Tipos de Processo');
  console.log('  ✗ Setores');
  console.log('  ✗ Usuários');
  console.log('  ✗ Perfis');
  console.log('  ✗ Empresas');

  await prisma.$disconnect();
}

fixTesteProfile().catch((e) => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
