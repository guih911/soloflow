import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed do banco de dados...');

  // ============================================================================
  // 1. LIMPEZA COMPLETA DO BANCO DE DADOS
  // ============================================================================
  console.log('🗑️  Limpando dados existentes...');

  try {
    await prisma.signatureRecord.deleteMany({});
    await prisma.signatureRequirement.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.stepExecution.deleteMany({});
    await prisma.processInstance.deleteMany({});
    await prisma.stepAssignment.deleteMany({});
    await prisma.stepVersion.deleteMany({});
    await prisma.formFieldVersion.deleteMany({});
    await prisma.processTypeVersion.deleteMany({});
    await prisma.processType.deleteMany({});
    await prisma.user_profiles.deleteMany({});
    await prisma.profile_process_types.deleteMany({});
    await prisma.profile_permissions.deleteMany({});
    await prisma.profiles.deleteMany({});
    await prisma.userCompany.deleteMany({});
    await prisma.sector.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  } catch (e) {
    console.log('⚠️  Algumas tabelas ainda não existem, continuando...');
  }

  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('✅ Dados limpos com sucesso!');

  // ============================================================================
  // 2. CRIAÇÃO DA EMPRESA SOLOFLOW
  // ============================================================================
  console.log('🏢 Criando empresa Soloflow...');

  const soloflow = await prisma.company.create({
    data: {
      id: uuidv4(),
      name: 'Soloflow',
      cnpj: '12.345.678/0001-99',
      email: 'contato@soloflow.com.br',
      phone: '(62) 3521-8000',
      isActive: true,
    },
  });

  console.log(`✅ Empresa criada: ${soloflow.name}`);

  // ============================================================================
  // 3. CRIAÇÃO DOS SETORES
  // ============================================================================
  console.log('🏗️  Criando setores...');

  const setorAdministracao = await prisma.sector.create({
    data: { id: uuidv4(), name: 'Administração', description: 'Setor administrativo com acesso completo', companyId: soloflow.id, isActive: true },
  });

  const setorRH = await prisma.sector.create({
    data: { id: uuidv4(), name: 'Recursos Humanos', description: 'Setor de RH responsável por contratações e férias', companyId: soloflow.id, isActive: true },
  });

  const setorFinanceiro = await prisma.sector.create({
    data: { id: uuidv4(), name: 'Financeiro', description: 'Setor financeiro responsável por pagamentos e contas', companyId: soloflow.id, isActive: true },
  });

  const setorCompras = await prisma.sector.create({
    data: { id: uuidv4(), name: 'Compras', description: 'Setor de compras e suprimentos', companyId: soloflow.id, isActive: true },
  });

  const setorJuridico = await prisma.sector.create({
    data: { id: uuidv4(), name: 'Jurídico', description: 'Setor jurídico para análise de contratos', companyId: soloflow.id, isActive: true },
  });

  console.log(`✅ Setores criados: Administração, RH, Financeiro, Compras, Jurídico`);

  // ============================================================================
  // 4. CRIAÇÃO DO PERFIL ADMINISTRADORES
  // ============================================================================
  console.log('👥 Criando perfil Administradores...');

  const perfilAdmin = await prisma.profiles.create({
    data: { id: uuidv4(), name: 'Administradores', description: 'Perfil com todas as permissões do sistema', companyId: soloflow.id, isDefault: true, updatedAt: new Date() },
  });

  const permissionsData = [
    { resource: 'dashboard', action: 'view' },
    { resource: 'processes', action: 'view' }, { resource: 'processes', action: 'create' }, { resource: 'processes', action: 'update' },
    { resource: 'processes', action: 'delete' }, { resource: 'processes', action: 'execute' }, { resource: 'processes', action: 'manage' },
    { resource: 'tasks', action: 'view' }, { resource: 'tasks', action: 'execute' },
    { resource: 'signatures', action: 'view' }, { resource: 'signatures', action: 'manage' },
    { resource: 'process_types', action: 'view' }, { resource: 'process_types', action: 'create' }, { resource: 'process_types', action: 'update' },
    { resource: 'process_types', action: 'delete' }, { resource: 'process_types', action: 'manage' },
    { resource: 'users', action: 'view' }, { resource: 'users', action: 'create' }, { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' }, { resource: 'users', action: 'manage' },
    { resource: 'companies', action: 'view' }, { resource: 'companies', action: 'create' }, { resource: 'companies', action: 'update' },
    { resource: 'companies', action: 'delete' }, { resource: 'companies', action: 'manage' },
    { resource: 'sectors', action: 'view' }, { resource: 'sectors', action: 'create' }, { resource: 'sectors', action: 'update' },
    { resource: 'sectors', action: 'delete' }, { resource: 'sectors', action: 'manage' },
    { resource: 'profiles', action: 'view' }, { resource: 'profiles', action: 'create' }, { resource: 'profiles', action: 'update' },
    { resource: 'profiles', action: 'delete' }, { resource: 'profiles', action: 'manage' },
    { resource: 'reports', action: 'view' }, { resource: 'settings', action: 'view' }, { resource: 'settings', action: 'manage' },
  ];

  for (const perm of permissionsData) {
    await prisma.profile_permissions.create({ data: { id: uuidv4(), profileId: perfilAdmin.id, resource: perm.resource, action: perm.action, updatedAt: new Date() } });
  }

  console.log(`✅ Perfil criado: ${perfilAdmin.name} com ${permissionsData.length} permissões`);

  // ============================================================================
  // 5. CRIAÇÃO DOS USUÁRIOS
  // ============================================================================
  console.log('👤 Criando usuários...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({ data: { id: uuidv4(), name: 'Administrador', email: 'admin@soloflow.com.br', password: hashedPassword, cpf: '123.456.789-00', isActive: true } });
  await prisma.userCompany.create({ data: { userId: admin.id, companyId: soloflow.id, sectorId: setorAdministracao.id, role: 'ADMIN', isDefault: true } });
  await prisma.user_profiles.create({ data: { id: uuidv4(), userId: admin.id, profileId: perfilAdmin.id, companyId: soloflow.id } });

  const gerenteRH = await prisma.user.create({ data: { id: uuidv4(), name: 'Maria Silva', email: 'maria.rh@soloflow.com.br', password: hashedPassword, cpf: '987.654.321-00', isActive: true } });
  await prisma.userCompany.create({ data: { userId: gerenteRH.id, companyId: soloflow.id, sectorId: setorRH.id, role: 'USER', isDefault: true } });
  await prisma.user_profiles.create({ data: { id: uuidv4(), userId: gerenteRH.id, profileId: perfilAdmin.id, companyId: soloflow.id } });

  const analistaFinanceiro = await prisma.user.create({ data: { id: uuidv4(), name: 'João Santos', email: 'joao.financeiro@soloflow.com.br', password: hashedPassword, cpf: '456.789.123-00', isActive: true } });
  await prisma.userCompany.create({ data: { userId: analistaFinanceiro.id, companyId: soloflow.id, sectorId: setorFinanceiro.id, role: 'USER', isDefault: true } });
  await prisma.user_profiles.create({ data: { id: uuidv4(), userId: analistaFinanceiro.id, profileId: perfilAdmin.id, companyId: soloflow.id } });

  const comprador = await prisma.user.create({ data: { id: uuidv4(), name: 'Carlos Oliveira', email: 'carlos.compras@soloflow.com.br', password: hashedPassword, cpf: '789.123.456-00', isActive: true } });
  await prisma.userCompany.create({ data: { userId: comprador.id, companyId: soloflow.id, sectorId: setorCompras.id, role: 'USER', isDefault: true } });
  await prisma.user_profiles.create({ data: { id: uuidv4(), userId: comprador.id, profileId: perfilAdmin.id, companyId: soloflow.id } });

  const advogado = await prisma.user.create({ data: { id: uuidv4(), name: 'Ana Paula Costa', email: 'ana.juridico@soloflow.com.br', password: hashedPassword, cpf: '321.654.987-00', isActive: true } });
  await prisma.userCompany.create({ data: { userId: advogado.id, companyId: soloflow.id, sectorId: setorJuridico.id, role: 'USER', isDefault: true } });
  await prisma.user_profiles.create({ data: { id: uuidv4(), userId: advogado.id, profileId: perfilAdmin.id, companyId: soloflow.id } });

  console.log(`✅ Usuários criados: Admin, Maria (RH), João (Financeiro), Carlos (Compras), Ana Paula (Jurídico)`);

  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📊 RESUMO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏢 Empresa: ${soloflow.name}`);
  console.log(`🏗️  Setores: Administração, RH, Financeiro, Compras, Jurídico`);
  console.log(`👥 Perfil: ${perfilAdmin.name} (${permissionsData.length} permissões)`);
  console.log(`👤 Usuários criados:`);
  console.log(`   - Admin (admin@soloflow.com.br) - Administração`);
  console.log(`   - Maria Silva (maria.rh@soloflow.com.br) - RH`);
  console.log(`   - João Santos (joao.financeiro@soloflow.com.br) - Financeiro`);
  console.log(`   - Carlos Oliveira (carlos.compras@soloflow.com.br) - Compras`);
  console.log(`   - Ana Paula Costa (ana.juridico@soloflow.com.br) - Jurídico`);
  console.log(`   🔐 Senha para todos: admin123`);
  console.log('');
  console.log(`📋 Tipos de Processo: Nenhum (banco zerado)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
