import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper para criar permissão com ID
const perm = (resource: string, action: string, scope: any = {}) => ({
  id: randomUUID(),
  resource,
  action,
  scope,
});

async function createDefaultProfiles() {
  console.log('🔧 Criando perfis padrão...');

  // Buscar todas as empresas
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    console.log(`\n📌 Criando perfis para empresa: ${company.name}`);

    // Perfil de Administrador
    const adminProfile = await prisma.profiles.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Administrador',
        },
      },
      create: {
        id: randomUUID(),
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        companyId: company.id,
        isDefault: false,
        updatedAt: new Date(),
        profile_permissions: {
          create: [
            perm('users', 'view'),
            perm('users', 'create'),
            perm('users', 'edit'),
            perm('users', 'delete'),
            perm('processes', 'view'),
            perm('processes', 'create'),
            perm('processes', 'edit'),
            perm('processes', 'delete'),
            perm('process_types', 'view'),
            perm('process_types', 'create'),
            perm('process_types', 'edit'),
            perm('process_types', 'delete'),
            perm('profiles', 'view'),
            perm('profiles', 'create'),
            perm('profiles', 'edit'),
            perm('profiles', 'delete'),
          ],
        },
      },
      update: {},
    });

    console.log(`✅ Perfil criado: ${adminProfile.name}`);

    // Perfil de Gerente
    const managerProfile = await prisma.profiles.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Gerente',
        },
      },
      create: {
        id: randomUUID(),
        name: 'Gerente',
        description: 'Gerenciamento de processos e visualização de usuários',
        companyId: company.id,
        isDefault: false,
        updatedAt: new Date(),
        profile_permissions: {
          create: [
            perm('users', 'view'),
            perm('processes', 'view'),
            perm('processes', 'create'),
            perm('processes', 'edit'),
            perm('process_types', 'view'),
          ],
        },
      },
      update: {},
    });

    console.log(`✅ Perfil criado: ${managerProfile.name}`);

    // Perfil de Usuário Padrão
    const userProfile = await prisma.profiles.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: 'Usuário',
        },
      },
      create: {
        id: randomUUID(),
        name: 'Usuário',
        description: 'Visualização e execução de processos',
        companyId: company.id,
        isDefault: true, // Perfil padrão
        updatedAt: new Date(),
        profile_permissions: {
          create: [
            perm('processes', 'view'),
            perm('processes', 'create'),
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
      const existingProfile = await prisma.user_profiles.findFirst({
        where: {
          userId: uc.userId,
          companyId: company.id,
          profileId: profileId,
        },
      });

      if (!existingProfile) {
        await prisma.user_profiles.create({
          data: {
            id: randomUUID(),
            userId: uc.userId,
            companyId: company.id,
            profileId: profileId,
          },
        });
      }

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
