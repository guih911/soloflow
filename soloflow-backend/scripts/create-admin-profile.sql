-- Script para criar perfil Administrador com acesso total
-- e associar ao usuário admin@soloflow.com.br

-- 1. Criar perfil Administrador (ou atualizar se já existir)
INSERT OR REPLACE INTO profiles (
  id,
  name,
  description,
  isDefault,
  companyId,
  parentProfileId,
  createdAt,
  updatedAt
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Administrador',
  'Perfil com acesso total ao sistema. Pode gerenciar usuários, empresas, processos e todas as funcionalidades.',
  1,
  NULL,
  NULL,
  datetime('now'),
  datetime('now')
);

-- 2. Criar permissões de tela para o perfil Administrador
-- Deletar permissões antigas
DELETE FROM profile_permissions WHERE profileId = '00000000-0000-0000-0000-000000000001';

-- Inserir todas as permissões
INSERT INTO profile_permissions (id, profileId, resource, action, scope, createdAt, updatedAt) VALUES
-- Dashboard
('perm-dash-view', '00000000-0000-0000-0000-000000000001', 'dashboard', 'view', NULL, datetime('now'), datetime('now')),

-- Usuários
('perm-users-view', '00000000-0000-0000-0000-000000000001', 'users', 'view', NULL, datetime('now'), datetime('now')),
('perm-users-create', '00000000-0000-0000-0000-000000000001', 'users', 'create', NULL, datetime('now'), datetime('now')),
('perm-users-edit', '00000000-0000-0000-0000-000000000001', 'users', 'edit', NULL, datetime('now'), datetime('now')),
('perm-users-delete', '00000000-0000-0000-0000-000000000001', 'users', 'delete', NULL, datetime('now'), datetime('now')),
('perm-users-manage', '00000000-0000-0000-0000-000000000001', 'users', 'manage', NULL, datetime('now'), datetime('now')),

-- Empresas
('perm-companies-view', '00000000-0000-0000-0000-000000000001', 'companies', 'view', NULL, datetime('now'), datetime('now')),
('perm-companies-create', '00000000-0000-0000-0000-000000000001', 'companies', 'create', NULL, datetime('now'), datetime('now')),
('perm-companies-edit', '00000000-0000-0000-0000-000000000001', 'companies', 'edit', NULL, datetime('now'), datetime('now')),
('perm-companies-delete', '00000000-0000-0000-0000-000000000001', 'companies', 'delete', NULL, datetime('now'), datetime('now')),
('perm-companies-manage', '00000000-0000-0000-0000-000000000001', 'companies', 'manage', NULL, datetime('now'), datetime('now')),

-- Perfis
('perm-profiles-view', '00000000-0000-0000-0000-000000000001', 'profiles', 'view', NULL, datetime('now'), datetime('now')),
('perm-profiles-create', '00000000-0000-0000-0000-000000000001', 'profiles', 'create', NULL, datetime('now'), datetime('now')),
('perm-profiles-edit', '00000000-0000-0000-0000-000000000001', 'profiles', 'edit', NULL, datetime('now'), datetime('now')),
('perm-profiles-delete', '00000000-0000-0000-0000-000000000001', 'profiles', 'delete', NULL, datetime('now'), datetime('now')),
('perm-profiles-manage', '00000000-0000-0000-0000-000000000001', 'profiles', 'manage', NULL, datetime('now'), datetime('now')),

-- Processos
('perm-processes-view', '00000000-0000-0000-0000-000000000001', 'processes', 'view', NULL, datetime('now'), datetime('now')),
('perm-processes-create', '00000000-0000-0000-0000-000000000001', 'processes', 'create', NULL, datetime('now'), datetime('now')),
('perm-processes-edit', '00000000-0000-0000-0000-000000000001', 'processes', 'edit', NULL, datetime('now'), datetime('now')),
('perm-processes-delete', '00000000-0000-0000-0000-000000000001', 'processes', 'delete', NULL, datetime('now'), datetime('now')),
('perm-processes-execute', '00000000-0000-0000-0000-000000000001', 'processes', 'execute', NULL, datetime('now'), datetime('now')),
('perm-processes-manage', '00000000-0000-0000-0000-000000000001', 'processes', 'manage', NULL, datetime('now'), datetime('now')),

-- Tipos de Processo
('perm-process-types-view', '00000000-0000-0000-0000-000000000001', 'process-types', 'view', NULL, datetime('now'), datetime('now')),
('perm-process-types-create', '00000000-0000-0000-0000-000000000001', 'process-types', 'create', NULL, datetime('now'), datetime('now')),
('perm-process-types-edit', '00000000-0000-0000-0000-000000000001', 'process-types', 'edit', NULL, datetime('now'), datetime('now')),
('perm-process-types-delete', '00000000-0000-0000-0000-000000000001', 'process-types', 'delete', NULL, datetime('now'), datetime('now')),
('perm-process-types-manage', '00000000-0000-0000-0000-000000000001', 'process-types', 'manage', NULL, datetime('now'), datetime('now')),

-- Setores
('perm-sectors-view', '00000000-0000-0000-0000-000000000001', 'sectors', 'view', NULL, datetime('now'), datetime('now')),
('perm-sectors-create', '00000000-0000-0000-0000-000000000001', 'sectors', 'create', NULL, datetime('now'), datetime('now')),
('perm-sectors-edit', '00000000-0000-0000-0000-000000000001', 'sectors', 'edit', NULL, datetime('now'), datetime('now')),
('perm-sectors-delete', '00000000-0000-0000-0000-000000000001', 'sectors', 'delete', NULL, datetime('now'), datetime('now')),
('perm-sectors-manage', '00000000-0000-0000-0000-000000000001', 'sectors', 'manage', NULL, datetime('now'), datetime('now')),

-- Relatórios
('perm-reports-view', '00000000-0000-0000-0000-000000000001', 'reports', 'view', NULL, datetime('now'), datetime('now')),
('perm-reports-export', '00000000-0000-0000-0000-000000000001', 'reports', 'export', NULL, datetime('now'), datetime('now')),

-- Configurações
('perm-settings-view', '00000000-0000-0000-0000-000000000001', 'settings', 'view', NULL, datetime('now'), datetime('now')),
('perm-settings-edit', '00000000-0000-0000-0000-000000000001', 'settings', 'edit', NULL, datetime('now'), datetime('now'));

-- 3. Criar permissões de tipo de processo
DELETE FROM profile_process_types WHERE profileId = '00000000-0000-0000-0000-000000000001';

INSERT INTO profile_process_types (id, profileId, processTypeId, canView, canCreate, canExecute, createdAt, updatedAt) VALUES
('proc-perm-all', '00000000-0000-0000-0000-000000000001', '*', 1, 1, 1, datetime('now'), datetime('now'));

-- 4. Associar perfil ao usuário admin em todas as suas empresas
INSERT OR REPLACE INTO user_profiles (id, userId, profileId, companyId, createdAt, updatedAt)
SELECT
  'up-' || hex(randomblob(16)),
  u.id,
  '00000000-0000-0000-0000-000000000001',
  uc.companyId,
  datetime('now'),
  datetime('now')
FROM users u
JOIN user_companies uc ON uc.userId = u.id
WHERE u.email = 'admin@soloflow.com.br';

-- 5. Verificação
SELECT
  'Perfil criado: ' || name || ' (' || id || ')' as resultado
FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT
  'Permissões de tela: ' || COUNT(*) as resultado
FROM profile_permissions
WHERE profileId = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT
  'Permissões de processo: ' || COUNT(*) as resultado
FROM profile_process_types
WHERE profileId = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT
  'Usuários com perfil: ' || COUNT(*) as resultado
FROM user_profiles
WHERE profileId = '00000000-0000-0000-0000-000000000001';
