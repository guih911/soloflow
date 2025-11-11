import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultProfiles() {
  console.log('🔧 Criando perfis padrão...');

  // Buscar todas as empresas
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    console.log(`\n📌 Criando perfis para empresa: ${company.name}`);

    // Perfil de Administrador
    const adminProfile = await prisma.profile.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Administrador',
        },
      },
      create: {
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        companyId: company.id,
        isDefault: false,
        permissions: {
          create: [
            { resource: 'users', action: 'view', scope: {} },
            { resource: 'users', action: 'create', scope: {} },
            { resource: 'users', action: 'edit', scope: {} },
            { resource: 'users', action: 'delete', scope: {} },
            { resource: 'processes', action: 'view', scope: {} },
            { resource: 'processes', action: 'create', scope: {} },
            { resource: 'processes', action: 'edit', scope: {} },
            { resource: 'processes', action: 'delete', scope: {} },
            { resource: 'process_types', action: 'view', scope: {} },
            { resource: 'process_types', action: 'create', scope: {} },
            { resource: 'process_types', action: 'edit', scope: {} },
            { resource: 'process_types', action: 'delete', scope: {} },
            { resource: 'profiles', action: 'view', scope: {} },
            { resource: 'profiles', action: 'create', scope: {} },
            { resource: 'profiles', action: 'edit', scope: {} },
            { resource: 'profiles', action: 'delete', scope: {} },
          ],
        },
      },
      update: {},
    });

    console.log(`✅ Perfil criado: ${adminProfile.name}`);

    // Perfil de Gerente
    const managerProfile = await prisma.profile.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Gerente',
        },
      },
      create: {
        name: 'Gerente',
        description: 'Gerenciamento de processos e visualização de usuários',
        companyId: company.id,
        isDefault: false,
        permissions: {
          create: [
            { resource: 'users', action: 'view', scope: {} },
            { resource: 'processes', action: 'view', scope: {} },
            { resource: 'processes', action: 'create', scope: {} },
            { resource: 'processes', action: 'edit', scope: {} },
            { resource: 'process_types', action: 'view', scope: {} },
          ],
        },
      },
      update: {},
    });

    console.log(`✅ Perfil criado: ${managerProfile.name}`);

    // Perfil de Usuário Padrão
    const userProfile = await prisma.profile.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Usuário',
        },
      },
      create: {
        name: 'Usuário',
        description: 'Visualização e execução de processos',
        companyId: company.id,
        isDefault: true, // Perfil padrão
        permissions: {
          create: [
            { resource: 'processes', action: 'view', scope: {} },
            { resource: 'processes', action: 'create', scope: {} },
          ],
        },
      },
      update: {},
    });

    console.log(`✅ Perfil criado: ${userProfile.name}`);

    // Migrar usuários existentes baseado em suas roles antigas
    const userCompanies = await prisma.userCompany.findMany({
      where: { companyId: company.id },
      include: { user: true },
    });

    for (const uc of userCompanies) {
      // Determinar qual perfil usar baseado na role antiga
      let profileId: string;

      // Nota: Precisaria acessar a role antiga aqui
      // Por enquanto, vou atribuir o perfil padrão
      profileId = userProfile.id;

      // Criar ou atualizar UserProfile
      await prisma.userProfile.upsert({
        where: {
          userId_companyId: {
            userId: uc.userId,
            companyId: company.id,
          },
        },
        create: {
          userId: uc.userId,
          companyId: company.id,
          profileId: profileId,
        },
        update: {
          profileId: profileId,
        },
      });

      console.log(`  👤 Usuário ${uc.user.name} → Perfil: ${userProfile.name}`);
    }
  }

  console.log('\n✨ Perfis padrão criados com sucesso!');
}

createDefaultProfiles()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
