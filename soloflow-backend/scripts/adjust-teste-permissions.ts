import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function adjustTestePermissions() {
  console.log('🔧 Ajustando permissões do perfil "Teste"...\n');
  console.log('📝 Objetivo: Mostrar APENAS "Criar Processo" e "Minhas Tarefas"\n');

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

  // Remover permissões desnecessárias
  const toRemove = [
    { resource: 'processes', action: 'view' },  // Remove "Meus Processos"
    { resource: 'signatures', action: 'view' }, // Remove "Assinaturas" (se existir)
    { resource: 'dashboard', action: 'view' },  // Remove "Dashboard" (se existir)
  ];

  for (const perm of toRemove) {
    const deleted = await prisma.profile_permissions.deleteMany({
      where: {
        profileId: profile.id,
        resource: perm.resource,
        action: perm.action,
      },
    });

    if (deleted.count > 0) {
      console.log(`\n🗑️  Removida permissão "${perm.resource}:${perm.action}"`);
    }
  }

  // Buscar as permissões atualizadas
  const updated = await prisma.profiles.findUnique({
    where: { id: profile.id },
    include: {
      profile_permissions: true,
    },
  });

  console.log('\n✅ Permissões finais:');
  if (updated) {
    updated.profile_permissions.forEach((perm) => {
      console.log(`  • ${perm.resource}:${perm.action}`);
    });
  }

  console.log('\n🎉 Perfil "Teste" ajustado com sucesso!');
  console.log('\n📝 Itens do menu que devem aparecer:');
  console.log('  ✓ Criar Processo (processes:create)');
  console.log('  ✓ Minhas Tarefas (tasks:view)');
  console.log('\n📝 Itens que NÃO devem aparecer:');
  console.log('  ✗ Dashboard');
  console.log('  ✗ Gerenciar Processos');
  console.log('  ✗ Meus Processos');
  console.log('  ✗ Assinaturas');
  console.log('  ✗ Tipos de Processo');
  console.log('  ✗ Setores');
  console.log('  ✗ Usuários');
  console.log('  ✗ Perfis');
  console.log('  ✗ Empresas');

  await prisma.$disconnect();
}

adjustTestePermissions().catch((e) => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
