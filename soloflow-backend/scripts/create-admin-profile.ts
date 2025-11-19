import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Criando perfil de Administrador com acesso total...');

  try {
    // 1. Buscar o usuário admin
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@soloflow.com.br' },
    });

    if (!adminUser) {
      console.error('❌ Usuário admin@soloflow.com.br não encontrado!');
      console.log('💡 Crie o usuário admin primeiro antes de executar este script.');
      return;
    }

    console.log(`✅ Usuário admin encontrado: ${adminUser.name}`);

    // 2. Buscar empresas do admin
    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: adminUser.id },
      include: { company: true },
    });

    const companyId = userCompanies[0]?.companyId || null;

    console.log(
      `📍 Empresa: ${companyId ? userCompanies[0].company.name : 'Perfil Global'}`,
    );

    // 3. Verificar se já existe um perfil "Administrador"
    let adminProfile = await prisma.profiles.findFirst({
      where: {
        name: 'Administrador',
        companyId: companyId,
      },
    });

    if (adminProfile) {
      console.log('⚠️  Perfil "Administrador" já existe, atualizando...');
    } else {
      console.log('➕ Criando novo perfil "Administrador"...');
    }

    // 4. Criar ou atualizar o perfil Administrador com TODAS as permissões
    adminProfile = await prisma.profiles.upsert({
      where: {
        id: adminProfile?.id || 'new-admin-profile',
      },
      update: {
        description:
          'Perfil com acesso total ao sistema. Pode gerenciar usuários, empresas, processos e todas as funcionalidades.',
        isDefault: true,
        profile_permissions: {
          deleteMany: {},
          create: [
            // Permissões de TODAS as telas
            { id: 'perm-dashboard-view', resource: 'dashboard', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-users-view', resource: 'users', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-users-create', resource: 'users', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-users-edit', resource: 'users', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-users-delete', resource: 'users', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-users-manage', resource: 'users', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-companies-view', resource: 'companies', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-companies-create', resource: 'companies', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-companies-edit', resource: 'companies', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-companies-delete', resource: 'companies', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-companies-manage', resource: 'companies', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-profiles-view', resource: 'profiles', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-profiles-create', resource: 'profiles', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-profiles-edit', resource: 'profiles', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-profiles-delete', resource: 'profiles', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-profiles-manage', resource: 'profiles', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-processes-view', resource: 'processes', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-processes-create', resource: 'processes', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-processes-edit', resource: 'processes', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-processes-delete', resource: 'processes', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-processes-execute', resource: 'processes', action: 'execute', scope: Prisma.JsonNull },
            { id: 'perm-processes-manage', resource: 'processes', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-process-types-view', resource: 'process-types', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-process-types-create', resource: 'process-types', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-process-types-edit', resource: 'process-types', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-process-types-delete', resource: 'process-types', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-process-types-manage', resource: 'process-types', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-sectors-view', resource: 'sectors', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-sectors-create', resource: 'sectors', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-sectors-edit', resource: 'sectors', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-sectors-delete', resource: 'sectors', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-sectors-manage', resource: 'sectors', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-reports-view', resource: 'reports', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-reports-export', resource: 'reports', action: 'export', scope: Prisma.JsonNull },
            { id: 'perm-settings-view', resource: 'settings', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-settings-edit', resource: 'settings', action: 'edit', scope: Prisma.JsonNull },
          ],
        },
        profile_process_types: {
          deleteMany: {},
          create: [
            {
              id: 'ppt-admin-all',
              processTypeId: '*',
              canView: true,
              canCreate: true,
              canExecute: true,
              updatedAt: new Date(),
            },
          ],
        },
      },
      create: {
        id: adminProfile?.id || 'admin-profile',
        name: 'Administrador',
        description:
          'Perfil com acesso total ao sistema. Pode gerenciar usuários, empresas, processos e todas as funcionalidades.',
        companyId: companyId,
        isDefault: true,
        updatedAt: new Date(),
        profile_permissions: {
          create: [
            // Permissões de TODAS as telas
            { id: 'perm-dashboard-view', resource: 'dashboard', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-users-view', resource: 'users', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-users-create', resource: 'users', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-users-edit', resource: 'users', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-users-delete', resource: 'users', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-users-manage', resource: 'users', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-companies-view', resource: 'companies', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-companies-create', resource: 'companies', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-companies-edit', resource: 'companies', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-companies-delete', resource: 'companies', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-companies-manage', resource: 'companies', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-profiles-view', resource: 'profiles', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-profiles-create', resource: 'profiles', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-profiles-edit', resource: 'profiles', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-profiles-delete', resource: 'profiles', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-profiles-manage', resource: 'profiles', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-processes-view', resource: 'processes', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-processes-create', resource: 'processes', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-processes-edit', resource: 'processes', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-processes-delete', resource: 'processes', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-processes-execute', resource: 'processes', action: 'execute', scope: Prisma.JsonNull },
            { id: 'perm-processes-manage', resource: 'processes', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-process-types-view', resource: 'process-types', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-process-types-create', resource: 'process-types', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-process-types-edit', resource: 'process-types', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-process-types-delete', resource: 'process-types', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-process-types-manage', resource: 'process-types', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-sectors-view', resource: 'sectors', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-sectors-create', resource: 'sectors', action: 'create', scope: Prisma.JsonNull },
            { id: 'perm-sectors-edit', resource: 'sectors', action: 'edit', scope: Prisma.JsonNull },
            { id: 'perm-sectors-delete', resource: 'sectors', action: 'delete', scope: Prisma.JsonNull },
            { id: 'perm-sectors-manage', resource: 'sectors', action: 'manage', scope: Prisma.JsonNull },
            { id: 'perm-reports-view', resource: 'reports', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-reports-export', resource: 'reports', action: 'export', scope: Prisma.JsonNull },
            { id: 'perm-settings-view', resource: 'settings', action: 'view', scope: Prisma.JsonNull },
            { id: 'perm-settings-edit', resource: 'settings', action: 'edit', scope: Prisma.JsonNull },
          ],
        },
        profile_process_types: {
          create: [
            {
              id: 'ppt-admin-all',
              processTypeId: '*',
              canView: true,
              canCreate: true,
              canExecute: true,
              updatedAt: new Date(),
            },
          ],
        },
      },
    });

    console.log(`✅ Perfil "Administrador" criado/atualizado com ID: ${adminProfile.id}`);

    // Contar permissões
    const permissionsCount = await prisma.profile_permissions.count({
      where: { profileId: adminProfile.id },
    });
    const processTypesCount = await prisma.profile_process_types.count({
      where: { profileId: adminProfile.id },
    });

    console.log(`   - ${permissionsCount} permissões de tela`);
    console.log(`   - ${processTypesCount} permissões de processo`);

    // 5. Associar o perfil ao usuário admin em todas as suas empresas
    console.log('\n🔗 Associando perfil Administrador ao usuário admin...');

    for (const userCompany of userCompanies) {
      // Gerar ID único para user_profile
      const userProfileId = `up-${adminUser.id.substring(0, 8)}-${adminProfile.id.substring(0, 8)}-${userCompany.companyId.substring(0, 8)}`;

      const updated = await prisma.user_profiles.upsert({
        where: {
          userId_companyId_profileId: {
            userId: adminUser.id,
            companyId: userCompany.companyId,
            profileId: adminProfile.id,
          },
        },
        update: {},
        create: {
          id: userProfileId,
          userId: adminUser.id,
          profileId: adminProfile.id,
          companyId: userCompany.companyId,
        },
      });

      console.log(
        `   ✅ Perfil associado à empresa: ${userCompany.company.name}`,
      );
    }

    console.log('\n🎉 Sucesso! O usuário admin@soloflow.com.br agora tem o perfil Administrador com acesso total.');
    console.log('💡 Este perfil será usado como padrão para novos usuários.');
  } catch (error) {
    console.error('❌ Erro ao criar perfil:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
