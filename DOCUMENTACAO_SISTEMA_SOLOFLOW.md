# 📋 DOCUMENTAÇÃO TÉCNICA COMPLETA DO SISTEMA SOLOFLOW

## Sistema de Gestão de Processos e Workflow Empresarial

**Versão:** 1.0  
**Data:** Janeiro de 2026  
**Stack Tecnológico:**
- **Backend:** NestJS 10.x (Node.js 18+)
- **Frontend:** Vue.js 3.4+ com Composition API
- **UI Framework:** Vuetify 3.x
- **Banco de Dados:** PostgreSQL 15+
- **ORM:** Prisma 5.x
- **Autenticação:** JWT (JSON Web Tokens)
- **Criptografia:** bcrypt (senhas), SHA-256 (hashes)

---

## 📑 ÍNDICE DETALHADO

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Técnica Detalhada](#2-arquitetura-técnica-detalhada)
3. [Módulos e Funcionalidades Detalhadas](#3-módulos-e-funcionalidades-detalhadas)
   - [3.1 Autenticação e Segurança](#31-autenticação-e-segurança)
   - [3.2 Gestão de Usuários](#32-gestão-de-usuários)
   - [3.3 Gestão de Empresas](#33-gestão-de-empresas)
   - [3.4 Gestão de Setores](#34-gestão-de-setores)
   - [3.5 Gestão de Perfis e Permissões](#35-gestão-de-perfis-e-permissões)
   - [3.6 Tipos de Processo (Process Types)](#36-tipos-de-processo)
   - [3.7 Processos e Workflow (Process Instances)](#37-processos-e-workflow)
   - [3.8 Minhas Tarefas](#38-tarefas)
   - [3.9 Assinaturas Digitais](#39-assinaturas-digitais)
   - [3.10 Anexos e Arquivos](#310-anexos-e-arquivos)
   - [3.11 Sub-Processos](#311-sub-processos)
   - [3.12 Sub-Tarefas](#312-sub-tarefas)
   - [3.13 Auditoria](#313-auditoria)
   - [3.14 Dashboard e Estatísticas](#314-dashboard)
4. [Modelos de Dados Completos](#4-modelos-de-dados)
5. [APIs REST Detalhadas](#5-apis-rest)
6. [Fluxos de Trabalho Passo a Passo](#6-fluxos-de-trabalho)
7. [Mapeamento de Telas e Componentes](#7-mapeamento-de-telas)
8. [Regras de Negócio](#8-regras-de-negócio)

---

## 1. VISÃO GERAL DO SISTEMA

O **SoloFlow** é uma plataforma enterprise completa de gestão de processos e workflow empresarial, projetada para automatizar, rastrear e otimizar fluxos de trabalho organizacionais.

### 1.1 Principais Características

| Característica | Descrição |
|----------------|-----------|
| **Multi-Tenancy** | Suporte a múltiplas empresas com isolamento completo de dados |
| **Workflow Configurável** | Criação visual de tipos de processo com etapas, campos e regras |
| **Assinatura Digital** | Sistema próprio de assinatura com hash SHA-256 e validação pública |
| **RBAC Granular** | Controle de acesso por perfis com permissões por recurso/ação |
| **Sub-Processos** | Processos podem disparar sub-processos vinculados |
| **Sub-Tarefas** | Etapas podem conter sub-tarefas com checklist |
| **Auditoria Completa** | Log de todas as ações críticas do sistema |
| **Versionamento** | Tipos de processo versionados com changelog |

### 1.2 Casos de Uso

1. **Processos de Aprovação** - Solicitações que passam por múltiplos aprovadores
2. **Workflow de Documentos** - Documentos que precisam de revisão e assinatura
3. **Solicitações Internas** - Pedidos de compra, férias, reembolsos
4. **Onboarding** - Integração de novos funcionários
5. **Processos Contratuais** - Contratos com múltiplas assinaturas

---

## 2. ARQUITETURA TÉCNICA DETALHADA

### 2.1 Backend (NestJS)

**Localização:** `soloflow-backend/`

```
soloflow-backend/
├── src/
│   ├── main.ts                    # Bootstrap da aplicação
│   ├── app.module.ts              # Módulo raiz
│   ├── app.controller.ts          # Controller raiz (health check)
│   ├── app.service.ts             # Service raiz
│   │
│   ├── modules/                   # Módulos de funcionalidades
│   │   ├── auth/                  # 🔐 Autenticação
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts # Endpoints: /auth/*
│   │   │   ├── auth.service.ts    # Lógica de autenticação
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts    # Guard de proteção JWT
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts      # Estratégia Passport JWT
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       └── switch-company.dto.ts
│   │   │
│   │   ├── users/                 # 👤 Usuários
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts # Endpoints: /users/*
│   │   │   ├── users.service.ts    # CRUD de usuários
│   │   │   └── dto/
│   │   │       ├── create-user-company.dto.ts
│   │   │       ├── update-user.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   │
│   │   ├── companies/             # 🏢 Empresas
│   │   │   ├── companies.module.ts
│   │   │   ├── companies.controller.ts # Endpoints: /companies/*
│   │   │   ├── companies.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── sectors/               # 🏬 Setores
│   │   │   ├── sectors.module.ts
│   │   │   ├── sectors.controller.ts # Endpoints: /sectors/*
│   │   │   ├── sectors.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── profiles/              # 🔑 Perfis e Permissões
│   │   │   ├── profiles.module.ts
│   │   │   ├── profiles.controller.ts # Endpoints: /profiles/*
│   │   │   ├── profiles.service.ts    # Resolução de permissões
│   │   │   └── dto/
│   │   │
│   │   ├── process-types/         # 📋 Tipos de Processo
│   │   │   ├── process-types.module.ts
│   │   │   ├── process-types.controller.ts # Endpoints: /process-types/*
│   │   │   ├── process-types.service.ts    # CRUD + Versionamento
│   │   │   └── dto/
│   │   │       ├── create-process-type.dto.ts
│   │   │       ├── create-step.dto.ts
│   │   │       └── create-form-field.dto.ts
│   │   │
│   │   ├── processes/             # ⚙️ Processos (Instâncias)
│   │   │   ├── processes.module.ts
│   │   │   ├── processes.controller.ts # Endpoints: /processes/*
│   │   │   ├── processes.service.ts    # Criação, execução, tarefas
│   │   │   └── dto/
│   │   │       ├── create-process-instance.dto.ts
│   │   │       ├── execute-step.dto.ts
│   │   │       └── upload-attachment.dto.ts
│   │   │
│   │   ├── signatures/            # ✍️ Assinaturas Digitais
│   │   │   ├── signatures.module.ts
│   │   │   ├── signatures.controller.ts       # Endpoints autenticados
│   │   │   ├── signatures-public.controller.ts # Validação pública
│   │   │   ├── signatures.service.ts          # Orquestração
│   │   │   ├── simple-signature.service.ts    # Assinatura básica
│   │   │   ├── modern-signature.service.ts    # Assinatura com QR Code
│   │   │   └── digital-signature.service.ts   # Serviço auxiliar
│   │   │
│   │   ├── attachments/           # 📎 Anexos
│   │   │   ├── attachments.module.ts
│   │   │   ├── attachments.controller.ts # Endpoints: /attachments/*
│   │   │   └── attachments.service.ts
│   │   │
│   │   ├── sub-tasks/             # ✅ Sub-Tarefas
│   │   │   ├── sub-tasks.module.ts
│   │   │   ├── sub-tasks.controller.ts # Endpoints: /sub-tasks/*
│   │   │   ├── sub-tasks.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── child-processes/       # 🔀 Sub-Processos (config)
│   │   │
│   │   ├── audit/                 # 📊 Auditoria
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts # Endpoints: /audit/*
│   │   │   └── audit.service.ts
│   │   │
│   │   ├── notifications/         # 🔔 Notificações
│   │   │   └── notifications.module.ts
│   │   │
│   │   └── cache/                 # 💾 Cache
│   │       └── cache.service.ts   # Cache de permissões
│   │
│   ├── config/
│   │   └── multer.config.ts       # Configuração de upload
│   │
│   ├── common/
│   │   ├── interfaces/
│   │   └── services/
│   │       └── ip-service.ts      # Captura de IP real
│   │
│   └── prisma/
│       └── prisma.service.ts      # Serviço do Prisma ORM
│
├── prisma/
│   ├── schema.prisma              # 📝 Schema completo do banco
│   ├── seed.ts                    # Seeds de dados iniciais
│   └── migrations/                # Histórico de migrações
│
├── uploads/                       # 📁 Arquivos enviados
│   ├── attachments/               # Anexos de processos/etapas
│   ├── signatures/                # PDFs assinados (temporário)
│   └── subtasks/                  # Anexos de sub-tarefas
│
├── scripts/                       # 🔧 Scripts utilitários
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### 2.2 Frontend (Vue.js 3 + Vuetify)

**Localização:** `soloflow-frontend/`

```
soloflow-frontend/
├── src/
│   ├── main.ts                    # Bootstrap Vue
│   ├── App.vue                    # Componente raiz
│   ├── style.css                  # Estilos globais
│   │
│   ├── views/                     # 📱 Páginas/Telas
│   │   ├── auth/
│   │   │   └── Login.vue          # Tela de login
│   │   │
│   │   ├── Dashboard.vue          # Painel principal
│   │   │
│   │   ├── processes/             # Módulo de Processos
│   │   │   ├── Processes.vue          # Lista tipos para criar
│   │   │   ├── ProcessTypes.vue       # Gerenciar tipos
│   │   │   ├── ProcessTypeEditor.vue  # Editor de tipo (campos, etapas)
│   │   │   ├── CreateProcess.vue      # Criar nova instância
│   │   │   ├── ProcessDetail.vue      # Detalhes do processo
│   │   │   ├── StepExecution.vue      # Executar etapa
│   │   │   ├── ManageProcesses.vue    # Gerenciar todos (admin)
│   │   │   └── MyProcesses.vue        # Processos do usuário
│   │   │
│   │   ├── tasks/
│   │   │   └── MyTasks.vue            # Tarefas pendentes
│   │   │
│   │   ├── signatures/
│   │   │   └── PendingSignatures.vue  # Assinaturas pendentes
│   │   │
│   │   ├── users/
│   │   │   ├── Users.vue              # Gerenciar usuários
│   │   │   └── Profile.vue            # Meu perfil
│   │   │
│   │   ├── profiles/
│   │   │   ├── Profiles.vue           # Gerenciar perfis
│   │   │   └── components/
│   │   │       └── ProfileFormDialog.vue
│   │   │
│   │   ├── sectors/
│   │   │   └── Sectors.vue            # Gerenciar setores
│   │   │
│   │   ├── companies/
│   │   │   └── Companies.vue          # Gerenciar empresas
│   │   │
│   │   ├── settings/
│   │   │   └── Settings.vue           # Configurações
│   │   │
│   │   └── public/
│   │       └── ValidateSignature.vue  # Validação pública
│   │
│   ├── components/                # 🧩 Componentes Reutilizáveis
│   │   ├── AttachmentButton.vue       # Botão de anexar
│   │   ├── AttachmentList.vue         # Lista de anexos
│   │   ├── AttachmentModal.vue        # Modal de anexos
│   │   ├── AttachmentPreview.vue      # Preview inline
│   │   ├── AttachmentPreviewModal.vue # Modal de preview
│   │   ├── CancelProcessDialog.vue    # Dialog cancelamento
│   │   ├── CertificateManager.vue     # Gerenciar certificados
│   │   ├── ChildProcessesList.vue     # Lista sub-processos
│   │   ├── ConditionBuilder.vue       # Builder de condições
│   │   ├── CreateChildProcessDialog.vue
│   │   ├── CreateSubTaskDialog.vue    # Criar sub-tarefa
│   │   ├── DocumentViewer.vue         # Visualizador de docs
│   │   ├── DynamicTableInput.vue      # Campo tabela dinâmica
│   │   ├── ExecuteSubStepDialog.vue   # Executar sub-tarefa
│   │   ├── FieldFileModal.vue         # Modal arquivo de campo
│   │   ├── FileUploadField.vue        # Campo de upload
│   │   ├── InputStepExecution.vue     # Execução tipo INPUT
│   │   ├── PaginationControls.vue     # Controles de paginação
│   │   ├── PreviousStepsInfo.vue      # Info etapas anteriores
│   │   ├── ProcessAttachmentsModal.vue
│   │   ├── ProcessCreateDialog.vue    # Dialog criar processo
│   │   ├── ProcessFlowVisualizer.vue  # Visualizador de fluxo
│   │   ├── ProcessHistory.vue         # Histórico do processo
│   │   ├── ProcessTablesCard.vue      # Card de tabelas
│   │   ├── ProcessVersionManager.vue  # Gerenciar versões
│   │   ├── SignatureRequirementsDialog.vue # Config assinaturas
│   │   ├── SignatureStatusViewer.vue  # Status das assinaturas
│   │   ├── SignDocumentDialog.vue     # Modal de assinatura
│   │   ├── StepAssignmentEditor.vue   # Editor atribuições
│   │   ├── StepDialog.vue             # Dialog de etapa
│   │   ├── StepExecutionDetailDialog.vue
│   │   ├── StepExecutionInput.vue     # Input da execução
│   │   ├── StepPreviewModal.vue       # Preview da etapa
│   │   ├── StepTransitionEditor.vue   # Editor transições
│   │   ├── SubTasksList.vue           # Lista sub-tarefas
│   │   ├── VersionComparison.vue      # Comparar versões
│   │   │
│   │   ├── fields/                    # Campos de formulário
│   │   │   └── ... (componentes de campo)
│   │   │
│   │   └── ui/                        # UI genérica
│   │       └── ... (componentes UI)
│   │
│   ├── layouts/                   # 🖼️ Layouts
│   │   ├── AuthLayout.vue             # Layout de auth (login)
│   │   └── DashboardLayout.vue        # Layout principal (sidebar)
│   │
│   ├── stores/                    # 🗃️ Pinia Stores
│   │   ├── auth.js                    # Estado de autenticação
│   │   ├── processes.js               # Estado de processos
│   │   ├── processTypes.js            # Estado de tipos
│   │   ├── users.js                   # Estado de usuários
│   │   ├── sectors.js                 # Estado de setores
│   │   ├── profiles.js                # Estado de perfis
│   │   └── company.js                 # Estado de empresas
│   │
│   ├── router/                    # 🛣️ Rotas
│   │   └── index.js                   # Configuração Vue Router
│   │
│   ├── services/                  # 🌐 Serviços
│   │   └── api.js                     # Cliente Axios configurado
│   │
│   ├── composables/               # 🪝 Composables Vue
│   │   └── ... (hooks reutilizáveis)
│   │
│   ├── constants/                 # 📌 Constantes
│   │   └── permissions.js             # Catálogo de telas/permissões
│   │
│   ├── utils/                     # 🔧 Utilitários
│   │   └── ... (funções auxiliares)
│   │
│   └── plugins/                   # 🔌 Plugins Vue
│       └── vuetify.js                 # Configuração Vuetify
│
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 2.3 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js)                        │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │  Views  │───>│ Stores  │───>│Services │───>│   API   │      │
│  │ (Telas) │<───│ (Pinia) │<───│ (api.js)│<───│  Axios  │      │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘      │
└───────────────────────────────────────────────────┼────────────┘
                                                     │ HTTP/JSON
                                                     │ JWT Bearer
┌───────────────────────────────────────────────────┼────────────┐
│                         BACKEND (NestJS)          │            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──┴────┐       │
│  │ Guards  │───>│Controllers───>│Services │───>│ Prisma│       │
│  │  (JWT)  │    │ (Routes) │    │ (Logic) │    │  ORM  │       │
│  └─────────┘    └─────────┘    └─────────┘    └──┬────┘       │
└───────────────────────────────────────────────────┼────────────┘
                                                     │ SQL
┌───────────────────────────────────────────────────┼────────────┐
│                       POSTGRESQL                   │            │
│  ┌───────────────────────────────────────────────┴──┐         │
│  │  Tables: users, companies, profiles, processes,  │         │
│  │  process_types, step_executions, attachments,    │         │
│  │  signatures, audit_logs, sub_tasks, etc.         │         │
│  └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. MÓDULOS E FUNCIONALIDADES DETALHADAS

---

### 3.1 AUTENTICAÇÃO E SEGURANÇA

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/auth/auth.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/auth/auth.service.ts` | Lógica de autenticação |
| Backend Guard | `src/modules/auth/guards/jwt-auth.guard.ts` | Proteção de rotas |
| Backend Strategy | `src/modules/auth/strategies/jwt.strategy.ts` | Validação do token |
| Frontend View | `src/views/auth/Login.vue` | Tela de login |
| Frontend Store | `src/stores/auth.js` | Estado de autenticação |
| Frontend Service | `src/services/api.js` | Interceptor de token |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| `POST` | `/auth/login` | Autenticar usuário | ❌ Não |
| `POST` | `/auth/register` | Registrar novo usuário | ❌ Não |
| `POST` | `/auth/refresh` | Renovar token JWT | ✅ Sim |
| `POST` | `/auth/switch-company` | Trocar empresa ativa | ✅ Sim |
| `GET` | `/auth/me` | Obter dados do usuário logado | ✅ Sim |
| `GET` | `/auth/sessions` | Listar sessões ativas | ✅ Sim |
| `DELETE` | `/auth/sessions/:tokenId` | Revogar sessão específica | ✅ Sim |
| `POST` | `/auth/logout-all` | Encerrar todas as sessões | ✅ Sim |

#### 🔄 Fluxo Detalhado de Login

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO ACESSA /entrar                                                     │
│    Frontend: Login.vue                                                        │
│    - Exibe formulário de email e senha                                        │
│    - Validação client-side dos campos                                         │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. USUÁRIO SUBMETE FORMULÁRIO                                                 │
│    Frontend: authStore.login({ email, password })                             │
│    - Chama POST /auth/login via api.js                                        │
│    - Envia { email, password } no body                                        │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. BACKEND RECEBE REQUISIÇÃO                                                  │
│    Backend: auth.controller.ts → login()                                      │
│    - Chama authService.login(loginDto)                                        │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. VALIDAÇÃO DE CREDENCIAIS                                                   │
│    Backend: auth.service.ts → validateUser()                                  │
│    - Busca usuário por email no banco                                         │
│    - Verifica se usuário existe e está ativo                                  │
│    - Compara senha com bcrypt.compare(input, hash)                            │
│    - Se inválido: throw UnauthorizedException('Credenciais inválidas')        │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5. BUSCA EMPRESAS DO USUÁRIO                                                  │
│    Backend: auth.service.ts → login()                                         │
│    - Query: user.userCompanies WHERE company.isActive = true                  │
│    - Ordenação: isDefault DESC, lastAccessedAt DESC                           │
│    - Se nenhuma empresa: throw UnauthorizedException                          │
│    - Seleciona empresa padrão ou mais recente                                 │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 6. RESOLVE PERMISSÕES DO USUÁRIO                                              │
│    Backend: profiles.service.ts → resolveUserPermissions()                    │
│    - Busca perfis atribuídos ao usuário na empresa                            │
│    - Carrega permissões de cada perfil                                        │
│    - Carrega permissões por tipo de processo                                  │
│    - Merge de permissões (união de todos os perfis)                           │
│    - Retorna: { profileIds, permissions, processTypes }                       │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 7. GERA TOKEN JWT                                                             │
│    Backend: auth.service.ts                                                   │
│    - Payload: { sub: userId, email, companyId, role, profiles }               │
│    - Assina com jwtService.sign(payload)                                      │
│    - Token expira conforme JWT_EXPIRATION (ex: 1d)                            │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 8. RETORNA DADOS COMPLETOS                                                    │
│    Backend → Frontend                                                         │
│    Response: {                                                                │
│      access_token: "eyJhbGciOiJIUzI1...",                                     │
│      user: {                                                                  │
│        id, name, email,                                                       │
│        activeCompany: { id, name, role, sector, profileIds },                 │
│        companies: [ { id, name, role, sector, isDefault } ],                  │
│        permissions: [ { resource, action } ],                                 │
│        processTypePermissions: [ { processTypeId, canView, canCreate } ]      │
│      }                                                                        │
│    }                                                                          │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 9. FRONTEND ARMAZENA DADOS                                                    │
│    Frontend: authStore.js                                                     │
│    - localStorage.setItem('token', access_token)                              │
│    - localStorage.setItem('user', JSON.stringify(user))                       │
│    - localStorage.setItem('companies', JSON.stringify(companies))             │
│    - localStorage.setItem('activeCompany', JSON.stringify(activeCompany))     │
│    - localStorage.setItem('permissions', JSON.stringify(permissions))         │
│    - localStorage.setItem('processTypePermissions', ...)                      │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 10. REDIRECIONA PARA DASHBOARD                                                │
│     Frontend: router.push('/painel')                                          │
│     - Guard de rota verifica token                                            │
│     - Carrega DashboardLayout com sidebar                                     │
│     - Exibe Dashboard.vue                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔒 Sistema de Tokens

**Estrutura do JWT Payload:**
```typescript
{
  sub: string,      // User ID (UUID)
  email: string,    // Email do usuário
  companyId: string, // Empresa ativa (UUID)
  role: UserRole,   // ADMIN | MANAGER | USER
  profiles: string[], // IDs dos perfis atribuídos
  iat: number,      // Issued at (timestamp)
  exp: number       // Expiration (timestamp)
}
```

**Refresh Token (Banco de Dados):**
```sql
-- Tabela: refresh_tokens
id          UUID PRIMARY KEY
token       VARCHAR UNIQUE      -- Token criptografado
expiresAt   TIMESTAMP           -- Data de expiração
isRevoked   BOOLEAN DEFAULT false
userAgent   VARCHAR             -- Navegador/dispositivo
ipAddress   VARCHAR             -- IP do cliente
userId      UUID FK users(id)
createdAt   TIMESTAMP
revokedAt   TIMESTAMP
```

#### 🔐 Interceptor de Requisições (Frontend)

**Arquivo:** `src/services/api.js`

```javascript
// Interceptor de REQUEST - Adiciona token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de RESPONSE - Trata erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se 401 e não é requisição de auth
    if (error.response?.status === 401 && !isAuthRequest) {
      // Tenta renovar token com POST /auth/refresh
      // Se falhar, limpa sessão e redireciona para /entrar
    }
  }
)
```

#### 🔄 Troca de Empresa

**Quando Ocorre:** Usuário clica em outra empresa no menu do header

**Fluxo:**
1. Frontend chama `POST /auth/switch-company` com `{ companyId }`
2. Backend verifica se usuário pertence à empresa
3. Backend gera novo token com a nova empresa
4. Backend atualiza `lastAccessedAt` da empresa
5. Backend resolve permissões para a nova empresa
6. Frontend atualiza localStorage e recarrega dados

---

### 3.2 GESTÃO DE USUÁRIOS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/users/users.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/users/users.service.ts` | Lógica de negócio |
| Backend DTOs | `src/modules/users/dto/*.ts` | Validação de dados |
| Frontend View | `src/views/users/Users.vue` | Tela de listagem |
| Frontend Store | `src/stores/users.js` | Estado de usuários |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão Necessária |
|--------|----------|-----------|---------------------|
| `POST` | `/users` | Criar usuário | `users.create` |
| `GET` | `/users` | Listar usuários da empresa | `users.view` |
| `GET` | `/users/me` | Perfil do usuário logado | Autenticado |
| `PATCH` | `/users/me` | Atualizar próprio perfil | Autenticado |
| `GET` | `/users/:id` | Buscar usuário por ID | `users.view` |
| `PATCH` | `/users/:id` | Atualizar usuário | `users.manage` |
| `DELETE` | `/users/:id` | Remover usuário | `users.delete` |
| `PATCH` | `/users/:id/companies` | Atualizar empresas do usuário | `users.manage` |
| `PATCH` | `/users/:id/reset-password` | Resetar senha (admin) | `users.manage` |
| `PATCH` | `/users/me/change-password` | Alterar própria senha | Autenticado |

#### 🔄 Fluxo de Criação de Usuário

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. ADMIN ACESSA /usuarios                                                     │
│    Frontend: Users.vue                                                        │
│    - Clica em botão "Novo Usuário"                                            │
│    - Abre dialog CreateUserDialog                                             │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. PREENCHE FORMULÁRIO                                                        │
│    Frontend: CreateUserDialog.vue                                             │
│    - Nome (obrigatório)                                                       │
│    - Email (obrigatório, único)                                               │
│    - Senha (obrigatória, mín 6 chars)                                         │
│    - CPF (opcional, validado)                                                 │
│    - Telefone (opcional)                                                      │
│    - Setor (opcional, dropdown)                                               │
│    - Perfis (multi-select)                                                    │
│    - Papel: USER | MANAGER | ADMIN                                            │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. VALIDAÇÃO BACKEND                                                          │
│    Backend: users.service.ts → create()                                       │
│    - Verifica se email já existe                                              │
│    - Valida CPF (se informado)                                                │
│    - Criptografa senha: bcrypt.hash(password, 10)                             │
│    - Cria registro em User                                                    │
│    - Cria vínculo UserCompany com setor e role                                │
│    - Cria vínculos UserProfile para cada perfil selecionado                   │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. RELACIONAMENTOS CRIADOS                                                    │
│    Banco de Dados:                                                            │
│    - users: { id, name, email, password (hash), cpf, phone }                  │
│    - user_companies: { userId, companyId, sectorId, role, isActive }          │
│    - user_profiles: { userId, profileId, companyId }                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Estrutura da Tela de Usuários

**Arquivo:** `src/views/users/Users.vue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📋 USUÁRIOS                                          [+ Novo Usuário]       │
├────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Buscar: [_______________]  Status: [Todos ▼]  Setor: [Todos ▼]          │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Avatar │ Nome      │ Email           │ Setor     │ Perfis  │ Ações    │ │
│ ├────────┼───────────┼─────────────────┼───────────┼─────────┼──────────┤ │
│ │  👤    │ João Silva│ joao@empresa.com│ Financeiro│ Analista│ ✏️ 🗑️   │ │
│ │  👤    │ Maria...  │ maria@...       │ RH        │ Admin   │ ✏️ 🗑️   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────┤
│ Mostrando 1-10 de 25                               [<] 1 2 3 [>]           │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🔐 Validação de Duplicatas

**Arquivo:** `users.service.ts`

```typescript
// Verifica email duplicado antes de criar
async create(createUserDto: CreateUserDto, companyId: string) {
  // 1. Verifica se email já existe
  const existingUser = await this.prisma.user.findUnique({
    where: { email: createUserDto.email }
  });
  
  if (existingUser) {
    // 2. Se existe, verifica se já está na empresa
    const existingInCompany = await this.prisma.userCompany.findFirst({
      where: { userId: existingUser.id, companyId }
    });
    
    if (existingInCompany) {
      throw new ConflictException('Usuário já cadastrado nesta empresa');
    }
    
    // 3. Se não está na empresa, apenas vincula
    await this.prisma.userCompany.create({
      data: { userId: existingUser.id, companyId, ...vinculoData }
    });
    return existingUser;
  }
  
  // 4. Se não existe, cria novo
  return this.prisma.user.create({ data: userData });
}
```

#### 👤 Modelo de Dados Completo

```prisma
model User {
  id           String        @id @default(uuid())
  name         String
  email        String        @unique
  password     String        // Hash bcrypt
  isActive     Boolean       @default(true)
  cpf          String?       @unique
  phone        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relacionamentos
  userCompanies    UserCompany[]     // Empresas do usuário
  userProfiles     UserProfile[]     // Perfis do usuário
  refreshTokens    RefreshToken[]    // Sessões ativas
  processesCreated ProcessInstance[] // Processos criados
  stepExecutions   StepExecution[]   // Etapas executadas
  signatureRecords SignatureRecord[] // Assinaturas feitas
  subTasks         SubTask[]         // Sub-tarefas executadas
}

model UserCompany {
  id             String    @id @default(uuid())
  isActive       Boolean   @default(true)
  isDefault      Boolean   @default(false)
  role           UserRole  @default(USER)
  lastAccessedAt DateTime?
  
  userId    String
  companyId String
  sectorId  String?
  
  user    User     @relation(...)
  company Company  @relation(...)
  sector  Sector?  @relation(...)
  
  @@unique([userId, companyId])
}

model UserProfile {
  id        String @id @default(uuid())
  userId    String
  profileId String
  companyId String
  
  user    User     @relation(...)
  profile profiles @relation(...)
  company Company  @relation(...)
  
  @@unique([userId, profileId, companyId])
}

enum UserRole {
  USER      // Usuário padrão
  MANAGER   // Gerente de setor
  ADMIN     // Administrador da empresa
}
```

---

### 3.3 GESTÃO DE EMPRESAS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/companies/companies.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/companies/companies.service.ts` | Lógica de negócio |
| Frontend View | `src/views/companies/Companies.vue` | Tela de listagem |
| Frontend Store | `src/stores/company.js` | Estado de empresas |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/companies` | Criar empresa | SUPER_ADMIN |
| `GET` | `/companies` | Listar empresas | `companies.view` |
| `GET` | `/companies/:id` | Buscar empresa por ID | `companies.view` |
| `PATCH` | `/companies/:id` | Atualizar empresa | `companies.manage` |
| `DELETE` | `/companies/:id` | Remover empresa | `companies.delete` |

#### 🏢 Modelo de Multi-Tenancy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA MULTI-TENANT                            │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         EMPRESA A                                    │    │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│   │  │ Usuários │ │ Setores  │ │ Perfis   │ │  Tipos   │ │Processos │  │    │
│   │  │  (10)    │ │   (5)    │ │   (3)    │ │   (8)    │ │  (150)   │  │    │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         EMPRESA B                                    │    │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│   │  │ Usuários │ │ Setores  │ │ Perfis   │ │  Tipos   │ │Processos │  │    │
│   │  │  (25)    │ │   (8)    │ │   (5)    │ │   (12)   │ │  (500)   │  │    │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   Isolamento: WHERE companyId = @activeCompanyId em TODAS as queries          │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔄 Troca de Empresa (Switch Company)

**Quando o usuário pertence a múltiplas empresas:**

```typescript
// Backend: auth.service.ts → switchCompany()
async switchCompany(userId: string, newCompanyId: string) {
  // 1. Verifica se usuário pertence à empresa
  const userCompany = await this.prisma.userCompany.findFirst({
    where: { userId, companyId: newCompanyId, isActive: true }
  });
  
  if (!userCompany) {
    throw new ForbiddenException('Você não tem acesso a esta empresa');
  }
  
  // 2. Atualiza lastAccessedAt
  await this.prisma.userCompany.update({
    where: { id: userCompany.id },
    data: { lastAccessedAt: new Date() }
  });
  
  // 3. Resolve novas permissões
  const permissions = await this.profilesService.resolveUserPermissions(
    userId, 
    newCompanyId
  );
  
  // 4. Gera novo token JWT com nova empresa
  return this.generateToken({
    sub: userId,
    companyId: newCompanyId,
    role: userCompany.role,
    profiles: permissions.profileIds
  });
}
```

#### 🏢 Modelo de Dados Completo

```prisma
model Company {
  id        String   @id @default(uuid())
  name      String   @unique    // Nome fantasia
  cnpj      String   @unique    // CNPJ formatado
  email     String?             // Email de contato
  phone     String?             // Telefone
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relacionamentos - tudo isolado por empresa
  userCompanies        UserCompany[]
  sectors              Sector[]
  profiles             profiles[]
  processTypes         ProcessType[]
  processInstances     ProcessInstance[]
  userProfiles         UserProfile[]
  
  @@map("companies")
}
```

#### 📊 Dashboard por Empresa

**Cada empresa vê apenas seus dados:**

```typescript
// Backend: processes.service.ts → getDashboardStats()
async getDashboardStats(companyId: string, userId: string) {
  const [
    totalProcesses,
    inProgress,
    completed,
    myPendingTasks
  ] = await Promise.all([
    // Total de processos da empresa
    this.prisma.processInstance.count({
      where: { companyId }  // ← Isolamento por empresa
    }),
    
    // Em andamento
    this.prisma.processInstance.count({
      where: { companyId, status: 'IN_PROGRESS' }
    }),
    
    // Concluídos
    this.prisma.processInstance.count({
      where: { companyId, status: 'COMPLETED' }
    }),
    
    // Minhas tarefas pendentes
    this.getMyPendingTasksCount(userId, companyId)
  ]);
  
  return { totalProcesses, inProgress, completed, myPendingTasks };
}
```

---

### 3.4 GESTÃO DE SETORES

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/sectors/sectors.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/sectors/sectors.service.ts` | Lógica de negócio |
| Frontend View | `src/views/sectors/Sectors.vue` | Tela de listagem |
| Frontend Store | `src/stores/sectors.js` | Estado de setores |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/sectors` | Criar setor | `sectors.create` |
| `GET` | `/sectors` | Listar setores da empresa | `sectors.view` |
| `GET` | `/sectors/:id` | Buscar setor por ID | `sectors.view` |
| `PATCH` | `/sectors/:id` | Atualizar setor | `sectors.manage` |
| `DELETE` | `/sectors/:id` | Remover setor | `sectors.delete` |
| `POST` | `/sectors/:id/users/:userId` | Adicionar usuário | `sectors.manage` |
| `DELETE` | `/sectors/:id/users/:userId` | Remover usuário | `sectors.manage` |

#### 🏗️ Papel dos Setores no Workflow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    USO DE SETORES NO WORKFLOW                                 │
│                                                                               │
│   ATRIBUIÇÃO DE ETAPAS:                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ Etapa: "Aprovação Financeira"                                        │    │
│   │ Tipo de Atribuição: SECTOR                                           │    │
│   │ Setor: "Financeiro"                                                  │    │
│   │                                                                       │    │
│   │ Quando processo chega nesta etapa:                                   │    │
│   │ → TODOS os usuários do setor Financeiro veem na lista "Minhas Tarefas"   │
│   │ → QUALQUER UM deles pode executar                                    │    │
│   │ → Primeiro a executar "pega" a tarefa                                │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   REQUISITOS DE ASSINATURA:                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ Documento: "Contrato.pdf"                                            │    │
│   │ Tipo: SEQUENTIAL                                                     │    │
│   │ Assinantes:                                                          │    │
│   │   1. Setor: "Jurídico" (qualquer membro)                             │    │
│   │   2. Setor: "Diretoria" (qualquer membro)                            │    │
│   │                                                                       │    │
│   │ → Primeiro alguém do Jurídico assina                                 │    │
│   │ → Depois alguém da Diretoria assina                                  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔄 Lógica de Atribuição por Setor

**Arquivo:** `processes.service.ts → getMyTasks()`

```typescript
// Busca tarefas atribuídas ao setor do usuário
async getMyTasks(userId: string, companyId: string) {
  // 1. Busca setor do usuário
  const userCompany = await this.prisma.userCompany.findFirst({
    where: { userId, companyId },
    include: { sector: true }
  });
  
  const userSectorId = userCompany?.sectorId;
  
  // 2. Busca etapas pendentes
  return this.prisma.stepExecution.findMany({
    where: {
      status: 'PENDING',
      processInstance: { companyId },
      OR: [
        // Atribuídas diretamente ao usuário
        { executorId: userId },
        
        // Atribuídas ao setor do usuário (se tiver setor)
        ...(userSectorId ? [{ 
          sectorId: userSectorId,
          executorId: null  // Ainda não foi "pega" por ninguém
        }] : [])
      ]
    }
  });
}
```

#### 🏢 Modelo de Dados Completo

```prisma
model Sector {
  id          String   @id @default(uuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
  
  // Relacionamentos
  userCompanies        UserCompany[]        // Usuários do setor
  stepAssignments      StepAssignment[]     // Etapas atribuídas ao setor
  stepExecutions       StepExecution[]      // Execuções do setor
  signatureRequirements SignatureRequirement[] // Requisitos de assinatura
  
  @@unique([name, companyId])  // Nome único por empresa
  @@map("sectors")
}
```

#### 📊 Tela de Setores

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏢 SETORES                                              [+ Novo Setor]      │
├────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Buscar: [_______________]                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  Setor          │ Descrição              │ Usuários │ Status │ Ações │  │
│ ├─────────────────┼────────────────────────┼──────────┼────────┼───────┤  │
│ │ Financeiro      │ Dept. Financeiro       │   5      │ 🟢     │ ✏️ 🗑️│  │
│ │ RH              │ Recursos Humanos       │   3      │ 🟢     │ ✏️ 🗑️│  │
│ │ Jurídico        │ Departamento Jurídico  │   2      │ 🟢     │ ✏️ 🗑️│  │
│ │ TI              │ Tecnologia da Informação│   4      │ 🟢     │ ✏️ 🗑️│  │
│ └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 GESTÃO DE PERFIS E PERMISSÕES

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/profiles/profiles.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/profiles/profiles.service.ts` | Lógica de permissões |
| Frontend View | `src/views/profiles/Profiles.vue` | Tela de perfis |
| Frontend Store | `src/stores/profiles.js` | Estado de perfis |
| Frontend Constants | `src/constants/permissions.js` | Catálogo de permissões |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/profiles` | Criar perfil | `profiles.create` |
| `GET` | `/profiles` | Listar perfis da empresa | `profiles.view` |
| `GET` | `/profiles/:id` | Buscar perfil por ID | `profiles.view` |
| `PATCH` | `/profiles/:id` | Atualizar perfil | `profiles.manage` |
| `DELETE` | `/profiles/:id` | Remover perfil | `profiles.delete` |
| `POST` | `/profiles/:id/add-user` | Adicionar perfil a usuário | `profiles.manage` |
| `DELETE` | `/profiles/:id/remove-user/:userId` | Remover perfil | `profiles.manage` |
| `GET` | `/profiles/:id/users` | Listar usuários do perfil | `profiles.view` |
| `GET` | `/profiles/user/:userId/profiles` | Perfis de um usuário | `profiles.view` |

#### 🔒 Sistema de Permissões - Catálogo Completo

**Arquivo:** `src/constants/permissions.js`

| Recurso | Ações Disponíveis | Descrição |
|---------|-------------------|-----------|
| `dashboard` | `view` | Acesso ao painel inicial |
| `users` | `view`, `create`, `manage`, `delete` | Gestão de usuários |
| `sectors` | `view`, `create`, `manage`, `delete` | Gestão de setores |
| `profiles` | `view`, `create`, `manage`, `delete` | Gestão de perfis |
| `companies` | `view`, `create`, `manage`, `delete` | Gestão de empresas |
| `process_types` | `view`, `create`, `manage`, `delete` | Tipos de processo |
| `processes` | `view`, `create`, `manage`, `delete` | Instâncias de processo |
| `tasks` | `view`, `manage` | Tarefas/etapas |
| `signatures` | `view`, `manage` | Assinaturas |
| `reports` | `view` | Relatórios |
| `audit` | `view` | Logs de auditoria |

#### 🔄 Fluxo de Resolução de Permissões

**Arquivo:** `profiles.service.ts → resolveUserPermissions()`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    RESOLUÇÃO DE PERMISSÕES                                    │
│                                                                               │
│   Entrada: userId, companyId                                                  │
│                                                                               │
│   PASSO 1: Buscar perfis do usuário na empresa                               │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ SELECT * FROM user_profiles                                        │      │
│   │ WHERE userId = ? AND companyId = ?                                │      │
│   │ → Retorna: [Profile_1, Profile_2, ...]                            │      │
│   └───────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│   PASSO 2: Para cada perfil, carregar permissões                             │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ Profile_1: { users.view, users.create }                           │      │
│   │ Profile_2: { users.view, processes.view, processes.create }       │      │
│   └───────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│   PASSO 3: Merge (união) de todas as permissões                              │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ Final: {                                                           │      │
│   │   users.view,                                                      │      │
│   │   users.create,                                                    │      │
│   │   processes.view,                                                  │      │
│   │   processes.create                                                 │      │
│   │ }                                                                  │      │
│   └───────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│   PASSO 4: Carregar permissões por tipo de processo                          │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ SELECT * FROM profile_process_types                                │      │
│   │ WHERE profileId IN (Profile_1, Profile_2)                          │      │
│   │ → Merge: canView, canCreate, canExecute por processTypeId          │      │
│   └───────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│   Saída: { profileIds, permissions, processTypePermissions }                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🎭 Herança de Perfis

```typescript
// Perfil pode herdar de outro perfil (parentProfileId)
model profiles {
  id              String    @id
  name            String
  parentProfileId String?   // ← Perfil pai
  parentProfile   profiles? @relation("ProfileHierarchy", ...)
  childProfiles   profiles[] @relation("ProfileHierarchy")
}

// Exemplo de hierarquia:
// 
// [Administrador]           ← Todas as permissões
//      ↓
// [Gerente]                 ← Herda + remove algumas
//      ↓
// [Analista]                ← Herda + remove mais ainda
//      ↓
// [Visualizador]            ← Só leitura
```

#### 📊 Permissões por Tipo de Processo

```prisma
model profile_process_types {
  id            String  @id @default(uuid())
  canView       Boolean @default(true)   // Pode ver processos deste tipo
  canCreate     Boolean @default(false)  // Pode criar processos deste tipo
  canExecute    Boolean @default(false)  // Pode executar etapas
  
  profileId     String
  processTypeId String
  
  profile     profiles    @relation(...)
  processType ProcessType @relation(...)
  
  @@unique([profileId, processTypeId])
}
```

**Uso no Frontend:**

```javascript
// src/stores/auth.js
export const useAuthStore = defineStore('auth', {
  getters: {
    // Verifica permissão geral
    hasPermission: (state) => (resource, action) => {
      return state.permissions?.some(
        p => p.resource === resource && p.action === action
      ) ?? false
    },
    
    // Verifica permissão específica por tipo de processo
    canViewProcessType: (state) => (processTypeId) => {
      const perm = state.processTypePermissions?.find(
        p => p.processTypeId === processTypeId
      )
      return perm?.canView ?? false
    },
    
    canCreateProcessType: (state) => (processTypeId) => {
      const perm = state.processTypePermissions?.find(
        p => p.processTypeId === processTypeId
      )
      return perm?.canCreate ?? false
    }
  }
})
```

#### 🖥️ Tela de Edição de Perfil

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ✏️ EDITAR PERFIL: Analista Financeiro                     [Salvar] [Cancelar] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Nome: [Analista Financeiro_________]                                       │
│ Descrição: [Perfil para analistas do setor financeiro_____]                │
│ Perfil Base: [Nenhum ▼]                                                    │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ 📋 PERMISSÕES GERAIS                                                       │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Recurso        │ Ver │ Criar │ Gerenciar │ Excluir                   │  │
│ ├────────────────┼─────┼───────┼───────────┼─────────────────────────┤  │
│ │ Dashboard      │ [✓] │  -    │    -      │   -                       │  │
│ │ Usuários       │ [✓] │  [ ]  │    [ ]    │   [ ]                     │  │
│ │ Setores        │ [✓] │  [ ]  │    [ ]    │   [ ]                     │  │
│ │ Perfis         │ [ ] │  [ ]  │    [ ]    │   [ ]                     │  │
│ │ Tipos Processo │ [✓] │  [ ]  │    [ ]    │   [ ]                     │  │
│ │ Processos      │ [✓] │  [✓]  │    [ ]    │   [ ]                     │  │
│ │ Tarefas        │ [✓] │  -    │    [✓]    │   -                       │  │
│ │ Assinaturas    │ [✓] │  -    │    [✓]    │   -                       │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ 📁 PERMISSÕES POR TIPO DE PROCESSO                                        │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ Tipo de Processo         │ Visualizar │ Criar │ Executar            │  │
│ ├──────────────────────────┼────────────┼───────┼─────────────────────┤  │
│ │ Solicitação de Compra    │    [✓]     │  [✓]  │   [✓]               │  │
│ │ Aprovação de Despesa     │    [✓]     │  [✓]  │   [✓]               │  │
│ │ Contrato de Fornecedor   │    [✓]     │  [ ]  │   [ ]               │  │
│ │ Férias                   │    [ ]     │  [ ]  │   [ ]               │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🔐 Modelo de Dados Completo

```prisma
model profiles {
  id              String    @id @default(uuid())
  name            String
  description     String?
  isDefault       Boolean   @default(false)  // Perfil padrão do sistema
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  companyId       String?   // NULL = perfil global
  company         Company?  @relation(...)
  
  parentProfileId String?   // Herança
  parentProfile   profiles? @relation("ProfileHierarchy", ...)
  childProfiles   profiles[] @relation("ProfileHierarchy")
  
  // Relacionamentos
  permissions     profile_permissions[]    // Permissões gerais
  processTypes    profile_process_types[]  // Permissões por tipo
  userProfiles    UserProfile[]            // Usuários com este perfil
  stepAssignments StepAssignment[]         // Etapas atribuídas ao perfil
  
  @@unique([name, companyId])
  @@map("profiles")
}

model profile_permissions {
  id        String  @id @default(uuid())
  resource  String  // dashboard, users, sectors, etc.
  action    String  // view, create, manage, delete
  scope     Json?   // Escopo adicional (ex: só próprio setor)
  
  profileId String
  profile   profiles @relation(...)
  
  @@unique([profileId, resource, action])
  @@map("profile_permissions")
}
```

---

### 3.6 TIPOS DE PROCESSO (Process Type Editor)

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/process-types/process-types.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/process-types/process-types.service.ts` | Lógica de versionamento |
| Frontend View | `src/views/process-types/ProcessTypes.vue` | Listagem de tipos |
| Frontend View | `src/views/process-types/ProcessTypeEditor.vue` | Editor completo |
| Frontend Components | `src/components/StepDialog.vue` | Modal de etapa |
| Frontend Components | `src/components/ConditionBuilder.vue` | Builder de condições |
| Frontend Components | `src/components/StepAssignmentEditor.vue` | Editor de atribuições |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/process-types` | Criar tipo | `process_types.create` |
| `GET` | `/process-types` | Listar tipos | `process_types.view` |
| `GET` | `/process-types/:id` | Buscar tipo com versão | `process_types.view` |
| `PATCH` | `/process-types/:id` | Atualizar (nova versão) | `process_types.manage` |
| `DELETE` | `/process-types/:id` | Remover tipo | `process_types.delete` |
| `POST` | `/process-types/:id/form-fields` | Adicionar campo | `process_types.manage` |
| `PATCH` | `/process-types/form-fields/:fieldId` | Atualizar campo | `process_types.manage` |
| `DELETE` | `/process-types/form-fields/:fieldId` | Remover campo | `process_types.manage` |
| `POST` | `/process-types/:id/steps` | Adicionar etapa | `process_types.manage` |
| `PATCH` | `/process-types/steps/:stepId` | Atualizar etapa | `process_types.manage` |
| `DELETE` | `/process-types/steps/:stepId` | Remover etapa | `process_types.manage` |
| `POST` | `/process-types/:id/publish` | Publicar versão | `process_types.manage` |

#### 📋 Sistema de Versionamento

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      VERSIONAMENTO DE TIPOS DE PROCESSO                       │
│                                                                               │
│   ProcessType (imutável após criação)                                        │
│   ├── id: "tipo-001"                                                         │
│   ├── name: "Solicitação de Compra"                                          │
│   └── versions: [                                                            │
│         │                                                                    │
│         ├── ProcessTypeVersion v1 (publicada)                                │
│         │   ├── id: "versao-001-v1"                                          │
│         │   ├── version: 1                                                   │
│         │   ├── isDraft: false                                               │
│         │   ├── publishedAt: "2024-01-15"                                    │
│         │   ├── formFields: [campo1, campo2, campo3]                         │
│         │   └── steps: [etapa1, etapa2, etapa3]                              │
│         │       └── Processos usando v1: 150                                 │
│         │                                                                    │
│         ├── ProcessTypeVersion v2 (publicada)                                │
│         │   ├── version: 2                                                   │
│         │   ├── changelog: "Adicionado campo de urgência"                    │
│         │   └── Processos usando v2: 75                                      │
│         │                                                                    │
│         └── ProcessTypeVersion v3 (rascunho)                                 │
│             ├── version: 3                                                   │
│             ├── isDraft: true                                                │
│             └── Não pode ser usada até publicar                              │
│       ]                                                                      │
│                                                                               │
│   REGRA: Processos sempre vinculados a uma VERSÃO específica                 │
│          Alterar tipo → cria nova versão → não afeta processos existentes    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 📝 Tipos de Campos do Formulário

| Tipo | Enum | Descrição | Configurações |
|------|------|-----------|---------------|
| Texto | `TEXT` | Campo de texto simples | `maxLength`, `pattern` |
| Número | `NUMBER` | Campo numérico | `min`, `max`, `decimals` |
| Data | `DATE` | Seletor de data | `minDate`, `maxDate` |
| E-mail | `EMAIL` | E-mail com validação | Validação automática |
| CPF | `CPF` | CPF com máscara | Validação de dígitos |
| CNPJ | `CNPJ` | CNPJ com máscara | Validação de dígitos |
| Telefone | `PHONE` | Telefone com máscara | Formato brasileiro |
| Dropdown | `DROPDOWN` | Lista de opções | `options: [{value, label}]` |
| Checkbox | `CHECKBOX` | Caixa de seleção | `options: [{value, label}]` |
| Área de Texto | `TEXTAREA` | Texto multilinha | `rows`, `maxLength` |
| Moeda | `CURRENCY` | Valor monetário | Formato R$ 0,00 |
| Arquivo | `FILE` | Upload de arquivo | `allowedTypes`, `maxSize` |
| Tabela | `TABLE` | Tabela dinâmica | `columns`, `minRows`, `maxRows` |

#### 🎯 Tipos de Etapa

| Tipo | Enum | Descrição | Ações Disponíveis |
|------|------|-----------|-------------------|
| Entrada | `INPUT` | Preenchimento de dados | `COMPLETE` |
| Aprovação | `APPROVAL` | Aprovar ou rejeitar | `APPROVE`, `REJECT` |
| Upload | `UPLOAD` | Upload obrigatório | `COMPLETE` |
| Revisão | `REVIEW` | Revisar dados | `APPROVE`, `REJECT`, `FORWARD` |
| Assinatura | `SIGNATURE` | Assinatura digital | `SIGN`, `REJECT` |

#### 👥 Tipos de Atribuição de Etapa

```typescript
enum StepAssignmentType {
  USER         // Usuário específico selecionado
  SECTOR       // Qualquer usuário do setor
  ROLE         // Papel dinâmico (ex: criador do processo)
  CONDITIONAL  // Baseado em condição (valor de campo)
}

enum DynamicRole {
  PROCESS_CREATOR    // Quem criou o processo
  SECTOR_MANAGER     // Gerente do setor do criador
  COMPANY_ADMIN      // Administrador da empresa
  PREVIOUS_EXECUTOR  // Quem executou etapa anterior
  DATA_OWNER         // Baseado em campo do formulário
}
```

#### 🔄 Editor de Condições (ConditionBuilder)

**Arquivo:** `src/components/ConditionBuilder.vue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ CONDIÇÃO PARA PULAR ETAPA                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ SE [Campo: Valor Total ▼] [Operador: Maior que ▼] [Valor: 10000___]        │
│                                                                            │
│ [+ Adicionar condição AND]    [+ Adicionar condição OR]                    │
│                                                                            │
│ Exemplo de JSON gerado:                                                    │
│ {                                                                          │
│   "type": "AND",                                                           │
│   "conditions": [                                                          │
│     { "field": "valorTotal", "operator": "gt", "value": 10000 }            │
│   ]                                                                        │
│ }                                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**Operadores Disponíveis:**
| Operador | Símbolo | Descrição |
|----------|---------|-----------|
| `eq` | `=` | Igual a |
| `ne` | `≠` | Diferente de |
| `gt` | `>` | Maior que |
| `gte` | `≥` | Maior ou igual |
| `lt` | `<` | Menor que |
| `lte` | `≤` | Menor ou igual |
| `contains` | `⊃` | Contém |
| `in` | `∈` | Está em (lista) |

#### 🖥️ Tela do Process Type Editor

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ✏️ EDITOR: Solicitação de Compra                           [Salvar Rascunho] │
│ Versão: 3 (Rascunho)                                        [📤 Publicar]   │
├──────────────────────┬─────────────────────────────────────────────────────┤
│ 📋 CONFIGURAÇÕES     │ 📝 FORMULÁRIO          │ 🔄 FLUXO DE ETAPAS        │
│ ──────────────────── │ ────────────────────── │ ───────────────────────── │
│                      │                        │                           │
│ Nome:                │ [+ Adicionar Campo]    │ [+ Adicionar Etapa]       │
│ [Solic. Compra___]   │                        │                           │
│                      │ ┌──────────────────┐   │ ┌─────────────────────┐   │
│ Descrição:           │ │ 📝 Descrição     │   │ │ 1. Preenchimento    │   │
│ [_______________]    │ │ Tipo: TEXT       │   │ │    Tipo: INPUT      │   │
│                      │ │ Obrigatório: ✓   │   │ │    Atribuído: Criador   │
│ Opções:              │ │ [✏️] [🗑️]       │   │ │    [✏️] [🗑️]        │   │
│ ☑️ Sub-processos     │ └──────────────────┘   │ └─────────────────────┘   │
│ ☑️ Sub-tarefas       │                        │           ↓               │
│ ☐ Só sub-processo    │ ┌──────────────────┐   │ ┌─────────────────────┐   │
│                      │ │ 💰 Valor Total   │   │ │ 2. Análise Gerente  │   │
│ Tipos permitidos     │ │ Tipo: CURRENCY   │   │ │    Tipo: APPROVAL   │   │
│ como sub-processo:   │ │ Obrigatório: ✓   │   │ │    SE valor > 5000  │   │
│ ☑️ Cotação           │ │ [✏️] [🗑️]       │   │ │    [✏️] [🗑️]        │   │
│ ☑️ Ordem de Compra   │ └──────────────────┘   │ └─────────────────────┘   │
│                      │                        │           ↓               │
│                      │ ┌──────────────────┐   │ ┌─────────────────────┐   │
│                      │ │ 📎 Anexos        │   │ │ 3. Aprovação Final  │   │
│                      │ │ Tipo: FILE       │   │ │    Tipo: SIGNATURE  │   │
│                      │ │ Múltiplos: ✓     │   │ │    Assinaturas: 2   │   │
│                      │ │ [✏️] [🗑️]       │   │ │    [✏️] [🗑️]        │   │
│                      │ └──────────────────┘   │ └─────────────────────┘   │
└──────────────────────┴────────────────────────┴───────────────────────────┘
```

#### 📊 Modal de Configuração de Etapa

**Arquivo:** `src/components/StepDialog.vue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ CONFIGURAR ETAPA                                              [X]       │
├────────────────────────────────────────────────────────────────────────────┤
│ 📋 INFORMAÇÕES BÁSICAS                                                     │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Nome: [Aprovação do Gerente_______________]                            │ │
│ │ Descrição: [Gerente deve aprovar solicitações acima de R$ 5.000___]    │ │
│ │ Tipo: [APPROVAL ▼]                                                     │ │
│ │ Instruções: [Verificar se o valor está dentro do orçamento previsto___]│ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ⏱️ SLA (Prazo)                                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Horas: [24__]     ou     Dias: [___]                                   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ 👥 ATRIBUIÇÃO                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Tipo: [ROLE ▼]                                                         │ │
│ │ Papel: [SECTOR_MANAGER ▼] (Gerente do setor do criador)                │ │
│ │                                                                        │ │
│ │ [+ Adicionar atribuição alternativa]                                   │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ 📎 ANEXOS                                                                  │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ☑️ Permitir anexos                                                     │ │
│ │ ☑️ Exigir anexo (mínimo: [1__] máximo: [5__])                          │ │
│ │ Tipos permitidos: [PDF, DOC, DOCX, XLS, XLSX, JPG, PNG ▼]              │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ✍️ ASSINATURA                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ☑️ Requer assinatura nesta etapa                                       │ │
│ │ [Configurar Requisitos de Assinatura...]                               │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ 🔀 CONDIÇÕES (Pular etapa se...)                                          │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ SE [valorTotal] [menor que] [5000]                                     │ │
│ │ → Pular esta etapa                                                     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│                                              [Cancelar]  [💾 Salvar Etapa] │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🔐 Modelo de Dados Completo

```prisma
model ProcessType {
  id                       String   @id @default(uuid())
  name                     String
  description              String?
  isActive                 Boolean  @default(true)
  isChildProcessOnly       Boolean  @default(false)  // Só pode ser sub-processo
  allowSubProcesses        Boolean  @default(true)   // Permite criar sub-processos
  allowSubTasks            Boolean  @default(true)   // Permite sub-tarefas
  allowedChildProcessTypes Json?    // IDs dos tipos permitidos como filho
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
  
  companyId String
  company   Company @relation(...)
  
  versions         ProcessTypeVersion[]
  profileProcesses profile_process_types[]
  
  @@unique([name, companyId])
  @@map("process_types")
}

model ProcessTypeVersion {
  id            String    @id @default(uuid())
  version       Int       // 1, 2, 3...
  versionLabel  String?   // "v1.0", "v2.0-beta"
  description   String?   // Descrição da versão
  changelog     String?   // O que mudou nesta versão
  isActive      Boolean   @default(true)
  isDraft       Boolean   @default(true)  // true = editando, false = publicada
  publishedAt   DateTime? // Data de publicação
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  processTypeId String
  processType   ProcessType @relation(...)
  
  formFields       FormFieldVersion[]
  steps            StepVersion[]
  processInstances ProcessInstance[]  // Processos usando esta versão
  
  @@unique([processTypeId, version])
  @@map("process_type_versions")
}

model FormFieldVersion {
  id                   String            @id @default(uuid())
  name                 String            // Nome interno (camelCase)
  label                String            // Label exibido
  type                 FieldType         // TEXT, NUMBER, DATE, etc.
  placeholder          String?
  required             Boolean           @default(false)
  order                Int               // Ordem de exibição
  options              Json?             // Para DROPDOWN, CHECKBOX
  validations          Json?             // Validações customizadas
  defaultValue         String?
  helpText             String?           // Texto de ajuda
  tableColumns         Json?             // Para tipo TABLE
  minRows              Int?              // Mín de linhas (TABLE)
  maxRows              Int?              // Máx de linhas (TABLE)
  
  processTypeVersionId String
  processTypeVersion   ProcessTypeVersion @relation(...)
  
  @@map("form_field_versions")
}

model StepVersion {
  id                String   @id @default(uuid())
  name              String
  description       String?
  instructions      String?  // Instruções para o executor
  slaHours          Int?
  slaDays           Int?
  type              StepType @default(INPUT)
  order             Int
  
  // Configurações de anexo
  allowAttachment   Boolean  @default(false)
  requireAttachment Boolean  @default(false)
  minAttachments    Int?
  maxAttachments    Int?
  allowedFileTypes  Json?    // ["pdf", "doc", "jpg"]
  
  // Assinatura
  requiresSignature Boolean  @default(false)
  
  // Atribuição
  assignedToCreator Boolean  @default(false)  // Atribuir ao criador
  
  // Condições para pular
  conditions        Json?    // { type: "AND", conditions: [...] }
  
  processTypeVersionId String
  processTypeVersion   ProcessTypeVersion @relation(...)
  
  // Relacionamentos
  assignments           StepAssignment[]
  stepExecutions        StepExecution[]
  signatureRequirements SignatureRequirement[]
  subTaskTemplates      SubTaskTemplate[]
  
  @@map("step_versions")
}

model StepAssignment {
  id               String             @id @default(uuid())
  type             StepAssignmentType // USER, SECTOR, ROLE, CONDITIONAL
  order            Int                @default(1)  // Prioridade
  
  // Para tipo USER
  userId           String?
  user             User?              @relation(...)
  
  // Para tipo SECTOR
  sectorId         String?
  sector           Sector?            @relation(...)
  
  // Para tipo ROLE
  dynamicRole      String?            // PROCESS_CREATOR, SECTOR_MANAGER, etc.
  
  // Para tipo CONDITIONAL
  conditions       Json?              // Condições para esta atribuição
  
  stepVersionId    String
  stepVersion      StepVersion        @relation(...)
  
  @@map("step_assignments")
}

enum FieldType {
  TEXT
  NUMBER
  DATE
  EMAIL
  CPF
  CNPJ
  PHONE
  DROPDOWN
  CHECKBOX
  TEXTAREA
  CURRENCY
  FILE
  TABLE
}

enum StepType {
  INPUT
  APPROVAL
  UPLOAD
  REVIEW
  SIGNATURE
}

enum StepAssignmentType {
  USER
  SECTOR
  ROLE
  CONDITIONAL
}
```

---

### 3.7 PROCESSOS E WORKFLOW (Motor de Execução)

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/processes/processes.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/processes/processes.service.ts` | Motor de workflow (2034 linhas) |
| Frontend View | `src/views/processes/Processes.vue` | Listagem de processos |
| Frontend View | `src/views/processes/CreateProcess.vue` | Criação de processo |
| Frontend View | `src/views/processes/ProcessDetails.vue` | Detalhes do processo |
| Frontend View | `src/views/processes/StepExecution.vue` | Execução de etapa |
| Frontend Component | `src/components/ProcessFlowVisualizer.vue` | Visualizador de fluxo |
| Frontend Component | `src/components/ProcessHistory.vue` | Histórico do processo |
| Frontend Component | `src/components/InputStepExecution.vue` | Execução tipo INPUT |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/processes` | Criar processo | `processes.create` |
| `GET` | `/processes` | Listar processos | `processes.view` |
| `GET` | `/processes/:id` | Detalhes do processo | `processes.view` |
| `POST` | `/processes/:id/cancel` | Cancelar processo | `processes.manage` |
| `GET` | `/processes/my/tasks` | Minhas tarefas | Autenticado |
| `GET` | `/processes/my/created` | Processos criados | Autenticado |
| `GET` | `/processes/stats/dashboard` | Estatísticas | Autenticado |
| `POST` | `/processes/execute-step` | Executar etapa | `tasks.manage` |
| `POST` | `/processes/:id/upload` | Upload para processo | `processes.manage` |
| `POST` | `/processes/step-execution/:id/upload` | Upload para etapa | `tasks.manage` |
| `GET` | `/processes/attachment/:id/download` | Download anexo | Autenticado |
| `GET` | `/processes/attachment/:id/view` | Visualizar anexo | Autenticado |

#### 🔄 Ciclo de Vida de um Processo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CICLO DE VIDA DO PROCESSO                            │
│                                                                               │
│   ┌─────────┐     ┌───────────┐     ┌───────────┐     ┌──────────────┐      │
│   │ CRIAÇÃO │────>│IN_PROGRESS│────>│ COMPLETED │ ou  │  CANCELLED   │      │
│   └─────────┘     └─────┬─────┘     └───────────┘     └──────────────┘      │
│                         │                                    ▲               │
│                         │           ┌──────────┐             │               │
│                         └──────────>│ REJECTED │─────────────┘               │
│                                     └──────────┘                             │
│                                                                               │
│   DETALHAMENTO:                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 1. CRIAÇÃO                                                           │    │
│   │    - Usuário seleciona tipo de processo                              │    │
│   │    - Preenche formulário inicial                                     │    │
│   │    - Upload de anexos (se configurado)                               │    │
│   │    - Sistema gera código único: TIPO-YYYY-NNNN                       │    │
│   │    - Status inicial: IN_PROGRESS                                     │    │
│   │    - currentStepOrder: 1                                             │    │
│   │    - Primeira etapa é criada como StepExecution PENDING              │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 2. EXECUÇÃO DE ETAPAS                                                │    │
│   │    Loop enquanto houver etapas:                                      │    │
│   │    a) Responsável vê tarefa em "Minhas Tarefas"                      │    │
│   │    b) Responsável executa (aprovar/rejeitar/completar)               │    │
│   │    c) Sistema avalia condições da próxima etapa                      │    │
│   │    d) Se condição não atendida: SKIP etapa                           │    │
│   │    e) Se condição atendida: cria StepExecution PENDING               │    │
│   │    f) Incrementa currentStepOrder                                    │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 3. FINALIZAÇÃO                                                       │    │
│   │    - Última etapa concluída → status: COMPLETED                      │    │
│   │    - Etapa rejeitada → status: REJECTED                              │    │
│   │    - Admin cancela → status: CANCELLED                               │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔄 Fluxo de Criação de Processo

**Arquivo:** `processes.service.ts → create()`

```typescript
async create(createProcessDto: CreateProcessDto, userId: string, companyId: string) {
  // 1. Buscar versão publicada mais recente do tipo
  const processTypeVersion = await this.prisma.processTypeVersion.findFirst({
    where: {
      processTypeId: createProcessDto.processTypeId,
      isDraft: false,
      isActive: true
    },
    orderBy: { version: 'desc' },
    include: { 
      steps: { orderBy: { order: 'asc' } },
      formFields: true 
    }
  });

  // 2. Gerar código único
  const year = new Date().getFullYear();
  const count = await this.prisma.processInstance.count({
    where: {
      processTypeVersionId: processTypeVersion.id,
      createdAt: { gte: new Date(`${year}-01-01`) }
    }
  });
  const code = `${processType.name.slice(0,3).toUpperCase()}-${year}-${String(count + 1).padStart(4, '0')}`;
  // Exemplo: SOL-2024-0001

  // 3. Criar instância do processo
  const process = await this.prisma.processInstance.create({
    data: {
      code,
      title: createProcessDto.title,
      status: 'IN_PROGRESS',
      currentStepOrder: 1,
      formData: createProcessDto.formData, // JSON com dados do formulário
      processTypeVersionId: processTypeVersion.id,
      createdById: userId,
      companyId
    }
  });

  // 4. Criar primeira etapa
  const firstStep = processTypeVersion.steps[0];
  await this.createStepExecution(process.id, firstStep, userId);

  // 5. Registrar auditoria
  await this.auditService.log({
    action: 'PROCESS_CREATED',
    resourceType: 'PROCESS',
    resourceId: process.id,
    userId,
    companyId,
    details: { code, processTypeId: createProcessDto.processTypeId }
  });

  return process;
}
```

#### 🎯 Lógica de Execução de Etapa

**Arquivo:** `processes.service.ts → executeStep()`

```typescript
async executeStep(executeDto: ExecuteStepDto, userId: string) {
  const { stepExecutionId, action, comment, formData } = executeDto;

  // 1. Buscar execução atual com todos os relacionamentos
  const stepExecution = await this.prisma.stepExecution.findUnique({
    where: { id: stepExecutionId },
    include: {
      stepVersion: {
        include: {
          signatureRequirements: true,
          subTaskTemplates: true
        }
      },
      processInstance: {
        include: {
          processTypeVersion: {
            include: { steps: { orderBy: { order: 'asc' } } }
          }
        }
      }
    }
  });

  // 2. Validar se pode executar
  if (stepExecution.status !== 'PENDING') {
    throw new BadRequestException('Etapa já foi executada');
  }
  
  // 3. Validar se usuário pode executar
  await this.validateExecutionPermission(stepExecution, userId);

  // 4. Verificar sub-tarefas obrigatórias
  if (stepExecution.stepVersion.subTaskTemplates.some(t => t.isRequired)) {
    const pendingRequired = await this.subTasksService.checkRequired(stepExecutionId);
    if (pendingRequired.hasPending) {
      throw new BadRequestException('Existem sub-tarefas obrigatórias pendentes');
    }
  }

  // 5. Verificar assinaturas pendentes
  if (stepExecution.stepVersion.requiresSignature) {
    const pendingSignatures = await this.signaturesService.checkPending(stepExecutionId);
    if (pendingSignatures.length > 0) {
      throw new BadRequestException('Existem assinaturas pendentes');
    }
  }

  // 6. Executar ação
  const newStatus = this.mapActionToStatus(action);
  // APPROVE → COMPLETED
  // REJECT → REJECTED
  // COMPLETE → COMPLETED

  await this.prisma.stepExecution.update({
    where: { id: stepExecutionId },
    data: {
      status: newStatus,
      action,
      comment,
      metadata: formData ? { ...stepExecution.metadata, ...formData } : undefined,
      executorId: userId,
      completedAt: new Date()
    }
  });

  // 7. Se rejeitado, finalizar processo
  if (action === 'REJECT') {
    await this.prisma.processInstance.update({
      where: { id: stepExecution.processInstanceId },
      data: { status: 'REJECTED' }
    });
    return { success: true, action: 'PROCESS_REJECTED' };
  }

  // 8. Avançar para próxima etapa
  return this.advanceToNextStep(stepExecution.processInstance);
}
```

#### 🔀 Lógica de Avanço de Etapa

**Arquivo:** `processes.service.ts → advanceToNextStep()`

```typescript
async advanceToNextStep(process: ProcessInstance) {
  const allSteps = process.processTypeVersion.steps;
  const currentOrder = process.currentStepOrder;
  
  // Encontrar próxima etapa
  let nextStep = allSteps.find(s => s.order === currentOrder + 1);
  
  while (nextStep) {
    // Avaliar condições de skip
    const shouldSkip = await this.evaluateConditions(
      nextStep.conditions,
      process.formData
    );
    
    if (shouldSkip) {
      // Criar execução como SKIPPED
      await this.prisma.stepExecution.create({
        data: {
          status: 'SKIPPED',
          processInstanceId: process.id,
          stepVersionId: nextStep.id
        }
      });
      
      // Tentar próxima
      nextStep = allSteps.find(s => s.order === nextStep.order + 1);
      continue;
    }
    
    // Criar execução PENDING
    await this.createStepExecution(process.id, nextStep, process.createdById);
    
    // Atualizar currentStepOrder
    await this.prisma.processInstance.update({
      where: { id: process.id },
      data: { currentStepOrder: nextStep.order }
    });
    
    return { success: true, nextStep: nextStep.name };
  }
  
  // Sem mais etapas → processo concluído
  await this.prisma.processInstance.update({
    where: { id: process.id },
    data: { 
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });
  
  return { success: true, action: 'PROCESS_COMPLETED' };
}
```

#### 👥 Lógica de Atribuição de Responsável

**Arquivo:** `processes.service.ts → resolveAssignment()`

```typescript
async resolveAssignment(step: StepVersion, process: ProcessInstance): Promise<{userId?: string, sectorId?: string}> {
  // 1. Se etapa atribuída ao criador
  if (step.assignedToCreator) {
    return { userId: process.createdById };
  }
  
  // 2. Buscar atribuições ordenadas por prioridade
  const assignments = await this.prisma.stepAssignment.findMany({
    where: { stepVersionId: step.id },
    orderBy: { order: 'asc' }
  });
  
  for (const assignment of assignments) {
    // Tipo USER - usuário específico
    if (assignment.type === 'USER' && assignment.userId) {
      return { userId: assignment.userId };
    }
    
    // Tipo SECTOR - setor inteiro
    if (assignment.type === 'SECTOR' && assignment.sectorId) {
      return { sectorId: assignment.sectorId };
    }
    
    // Tipo ROLE - papel dinâmico
    if (assignment.type === 'ROLE') {
      const resolved = await this.resolveRole(assignment.dynamicRole, process);
      if (resolved) return resolved;
    }
    
    // Tipo CONDITIONAL - baseado em condição
    if (assignment.type === 'CONDITIONAL') {
      const matches = this.evaluateConditions(assignment.conditions, process.formData);
      if (matches) {
        // Condição atendida, resolver atribuição interna
        if (assignment.userId) return { userId: assignment.userId };
        if (assignment.sectorId) return { sectorId: assignment.sectorId };
      }
    }
  }
  
  // Fallback: atribui ao criador
  return { userId: process.createdById };
}

async resolveRole(role: string, process: ProcessInstance) {
  switch (role) {
    case 'PROCESS_CREATOR':
      return { userId: process.createdById };
      
    case 'SECTOR_MANAGER':
      // Buscar gerente do setor do criador
      const userCompany = await this.prisma.userCompany.findFirst({
        where: { userId: process.createdById, companyId: process.companyId },
        include: { sector: true }
      });
      if (userCompany?.sector) {
        // Buscar gerente do setor
        const manager = await this.prisma.userCompany.findFirst({
          where: { 
            sectorId: userCompany.sectorId, 
            role: 'MANAGER',
            companyId: process.companyId
          }
        });
        if (manager) return { userId: manager.userId };
      }
      break;
      
    case 'PREVIOUS_EXECUTOR':
      // Buscar executor da etapa anterior
      const previousExecution = await this.prisma.stepExecution.findFirst({
        where: {
          processInstanceId: process.id,
          status: 'COMPLETED'
        },
        orderBy: { completedAt: 'desc' }
      });
      if (previousExecution?.executorId) {
        return { userId: previousExecution.executorId };
      }
      break;
      
    case 'DATA_OWNER':
      // Buscar usuário de um campo do formulário
      const responsibleField = process.formData?.responsavel;
      if (responsibleField) {
        return { userId: responsibleField };
      }
      break;
  }
  
  return null;
}
```

#### 📋 Minhas Tarefas - Query Completa

**Arquivo:** `processes.service.ts → getMyTasks()`

```typescript
async getMyTasks(userId: string, companyId: string, filters?: TaskFilters) {
  // Buscar setor do usuário
  const userCompany = await this.prisma.userCompany.findFirst({
    where: { userId, companyId },
    select: { sectorId: true }
  });
  
  return this.prisma.stepExecution.findMany({
    where: {
      status: 'PENDING',
      processInstance: {
        companyId,
        status: 'IN_PROGRESS'
      },
      OR: [
        // 1. Atribuídas diretamente ao usuário
        { executorId: userId },
        
        // 2. Atribuídas ao setor do usuário (ainda não "pegas")
        ...(userCompany?.sectorId ? [{
          sectorId: userCompany.sectorId,
          executorId: null
        }] : []),
        
        // 3. Etapas do criador (assignedToCreator = true)
        {
          stepVersion: { assignedToCreator: true },
          processInstance: { createdById: userId }
        }
      ],
      // Filtros opcionais
      ...(filters?.processTypeId && {
        processInstance: {
          processTypeVersion: {
            processTypeId: filters.processTypeId
          }
        }
      })
    },
    include: {
      processInstance: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } },
          processTypeVersion: {
            select: {
              processType: { select: { id: true, name: true } }
            }
          }
        }
      },
      stepVersion: {
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          instructions: true,
          slaHours: true,
          slaDays: true
        }
      }
    },
    orderBy: [
      { dueAt: 'asc' },        // Urgentes primeiro
      { createdAt: 'asc' }     // Mais antigos primeiro
    ]
  });
}
```

#### 📊 Dashboard Statistics

**Arquivo:** `processes.service.ts → getDashboardStats()`

```typescript
async getDashboardStats(userId: string, companyId: string) {
  const [
    totalProcesses,
    inProgress,
    completed,
    rejected,
    myPendingTasks,
    myPendingSignatures,
    processesThisMonth,
    avgCompletionTime
  ] = await Promise.all([
    // Total de processos
    this.prisma.processInstance.count({
      where: { companyId }
    }),
    
    // Em andamento
    this.prisma.processInstance.count({
      where: { companyId, status: 'IN_PROGRESS' }
    }),
    
    // Concluídos
    this.prisma.processInstance.count({
      where: { companyId, status: 'COMPLETED' }
    }),
    
    // Rejeitados
    this.prisma.processInstance.count({
      where: { companyId, status: 'REJECTED' }
    }),
    
    // Minhas tarefas pendentes
    this.getMyTasksCount(userId, companyId),
    
    // Minhas assinaturas pendentes
    this.signaturesService.getMyPendingCount(userId),
    
    // Processos este mês
    this.prisma.processInstance.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    
    // Tempo médio de conclusão (em dias)
    this.calculateAvgCompletionTime(companyId)
  ]);
  
  return {
    totalProcesses,
    inProgress,
    completed,
    rejected,
    myPendingTasks,
    myPendingSignatures,
    processesThisMonth,
    avgCompletionTime
  };
}
```

#### 🖥️ Tela de Execução de Etapa

**Arquivo:** `src/views/processes/StepExecution.vue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📋 EXECUTAR ETAPA                                                          │
│ Processo: SOL-2024-0042 - Solicitação de Compra de Equipamentos            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ ETAPA ATUAL: Aprovação do Gerente                                    │   │
│ │ Tipo: APPROVAL                                                       │   │
│ │ SLA: 24 horas (⚠️ Vence em 6h)                                       │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ 📝 INSTRUÇÕES:                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Verifique se o valor está dentro do orçamento previsto para o setor.│   │
│ │ Confirme se os itens solicitados são necessários.                   │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ 📄 DADOS DO PROCESSO:                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ Descrição: Compra de 10 notebooks para setor de TI                  │   │
│ │ Valor Total: R$ 45.000,00                                           │   │
│ │ Fornecedor: Dell Brasil                                             │   │
│ │ Justificativa: Renovação do parque de máquinas                      │   │
│ │                                                                     │   │
│ │ 📎 Anexos:                                                          │   │
│ │    • cotacao-dell.pdf (150 KB)                     [👁️ Ver] [⬇️]   │   │
│ │    • especificacoes-tecnicas.pdf (80 KB)           [👁️ Ver] [⬇️]   │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ 💬 COMENTÁRIO (obrigatório para rejeição):                                │
│ ┌─────────────────────────────────────────────────────────────────────┐   │
│ │ [__________________________________________________________]        │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────┐    │
│ │  [❌ Rejeitar]              [📎 Anexar]              [✅ Aprovar]  │    │
│ └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Modelo de Dados Completo

```prisma
model ProcessInstance {
  id                   String        @id @default(uuid())
  code                 String        @unique  // SOL-2024-0001
  title                String?       // Título opcional
  description          String?
  status               ProcessStatus @default(IN_PROGRESS)
  currentStepOrder     Int           @default(1)
  formData             Json?         // Dados do formulário
  metadata             Json?         // Dados extras
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  completedAt          DateTime?
  
  processTypeVersionId String
  processTypeVersion   ProcessTypeVersion @relation(...)
  
  createdById String
  createdBy   User   @relation(...)
  
  companyId String
  company   Company @relation(...)
  
  // Relacionamentos
  stepExecutions       StepExecution[]
  attachments          Attachment[]
  childProcessConfigs  ChildProcessConfig[]
  childProcesses       ChildProcessInstance[] @relation("ParentProcess")
  asChild              ChildProcessInstance?  @relation("ChildProcess")
  
  @@map("process_instances")
}

model StepExecution {
  id                String              @id @default(uuid())
  status            StepExecutionStatus @default(PENDING)
  action            String?             // APPROVE, REJECT, COMPLETE
  comment           String?
  dueAt             DateTime?           // Data limite (SLA)
  metadata          Json?               // Dados extras da execução
  signedAt          DateTime?
  createdAt         DateTime            @default(now())
  completedAt       DateTime?
  
  processInstanceId String
  processInstance   ProcessInstance @relation(...)
  
  stepVersionId String
  stepVersion   StepVersion @relation(...)
  
  // Responsável (um ou outro)
  executorId String?  // Usuário específico
  executor   User?    @relation(...)
  
  sectorId   String?  // Setor (qualquer membro pode executar)
  sector     Sector?  @relation(...)
  
  // Relacionamentos
  attachments       Attachment[]
  signatureRecords  SignatureRecord[]
  subTasks          SubTask[]
  
  @@map("step_executions")
}

enum ProcessStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
  REJECTED
}

enum StepExecutionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  REJECTED
  SKIPPED
}
```

---

### 3.8 TAREFAS (Minhas Tarefas)

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Service | `src/modules/processes/processes.service.ts` | Query getMyTasks() |
| Frontend View | `src/views/tasks/MyTasks.vue` | Listagem de tarefas |
| Frontend View | `src/views/tasks/MySignatures.vue` | Assinaturas pendentes |
| Frontend Store | `src/stores/processes.js` | Estado de tarefas |

#### 🖥️ Tela de Minhas Tarefas

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📋 MINHAS TAREFAS                                              [🔄 Atualizar] │
├────────────────────────────────────────────────────────────────────────────┤
│ Tipo: [Todos ▼]  Status: [Pendentes ▼]  Ordenar: [Urgência ▼]             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 URGENTE                                                             │ │
│ │ SOL-2024-0042 - Solicitação de Compra de Equipamentos                  │ │
│ │ Etapa: Aprovação do Gerente                                            │ │
│ │ Tipo: APPROVAL │ SLA: ⏰ Vence em 2h │ Criado por: João Silva          │ │
│ │                                                     [▶️ Executar]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🟡 NORMAL                                                              │ │
│ │ FER-2024-0015 - Solicitação de Férias                                  │ │
│ │ Etapa: Validação RH                                                    │ │
│ │ Tipo: REVIEW │ SLA: 3 dias │ Criado por: Maria Santos                  │ │
│ │                                                     [▶️ Executar]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🟢 BAIXA                                                               │ │
│ │ REL-2024-0128 - Relatório Mensal de Vendas                             │ │
│ │ Etapa: Assinatura do Diretor                                           │ │
│ │ Tipo: SIGNATURE │ SLA: 7 dias │ Criado por: Carlos Oliveira            │ │
│ │                                                     [▶️ Executar]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Mostrando 3 tarefas pendentes                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🎨 Cálculo de Prioridade

```typescript
// Frontend: MyTasks.vue
function calculatePriority(task) {
  const now = new Date();
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  
  if (!dueAt) return 'NORMAL';
  
  const hoursRemaining = (dueAt - now) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) return 'OVERDUE';     // Atrasado
  if (hoursRemaining < 4) return 'URGENT';      // Urgente (< 4h)
  if (hoursRemaining < 24) return 'HIGH';       // Alta (< 1 dia)
  if (hoursRemaining < 72) return 'NORMAL';     // Normal (< 3 dias)
  return 'LOW';                                  // Baixa
}
```

---

### 3.9 ASSINATURAS DIGITAIS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/signatures/signatures.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/signatures/signatures.service.ts` | Lógica de assinatura (1077 linhas) |
| Backend Service | `src/modules/signatures/modern-signature.service.ts` | Assinatura em PDF |
| Frontend View | `src/views/tasks/MySignatures.vue` | Assinaturas pendentes |
| Frontend View | `src/views/public/ValidateSignature.vue` | Validação pública |
| Frontend Component | `src/components/SignDocumentDialog.vue` | Modal de assinatura |
| Frontend Component | `src/components/SignatureStatusViewer.vue` | Status das assinaturas |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| `POST` | `/signatures/sign` | Assinar documento | ✅ JWT |
| `POST` | `/signatures/sign-subtask` | Assinar doc de sub-tarefa | ✅ JWT |
| `POST` | `/signatures/requirements` | Criar requisito | ✅ JWT |
| `POST` | `/signatures/requirements/batch` | Criar múltiplos | ✅ JWT |
| `GET` | `/signatures/requirements/step/:stepVersionId` | Requisitos da etapa | ✅ JWT |
| `GET` | `/signatures/attachments/:attachmentId` | Assinaturas do anexo | ✅ JWT |
| `GET` | `/signatures/verify/:attachmentId` | Verificar assinaturas | ✅ JWT |
| `GET` | `/signatures/download/:attachmentId` | Download PDF assinado | ✅ JWT |
| `GET` | `/signatures/status/:attachmentId` | Status das assinaturas | ✅ JWT |
| `GET` | `/signatures-public/validate/:token` | Validar por token | ❌ Público |

#### 🔒 Processo de Assinatura Digital

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE ASSINATURA DIGITAL                            │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 1. USUÁRIO CLICA EM "ASSINAR"                                        │    │
│   │    Frontend: SignDocumentDialog.vue                                  │    │
│   │    - Exibe preview do documento                                      │    │
│   │    - Solicita senha do usuário                                       │    │
│   │    - Campos: senha, motivação (opcional)                             │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 2. BACKEND RECEBE REQUISIÇÃO                                         │    │
│   │    POST /signatures/sign                                             │    │
│   │    Body: { attachmentId, password, reason? }                         │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 3. VALIDAÇÃO DE SENHA                                                │    │
│   │    signatures.service.ts → sign()                                    │    │
│   │    - Busca usuário no banco                                          │    │
│   │    - bcrypt.compare(password, user.password)                         │    │
│   │    - Se inválida: throw UnauthorizedException                        │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 4. GERAÇÃO DO HASH DO DOCUMENTO                                      │    │
│   │    - Lê conteúdo do arquivo original                                 │    │
│   │    - crypto.createHash('sha256').update(fileBuffer).digest('hex')    │    │
│   │    - Armazena em documentHash                                        │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 5. GERAÇÃO DO HASH DA ASSINATURA                                     │    │
│   │    Dados concatenados:                                               │    │
│   │    - documentHash                                                    │    │
│   │    - signerName                                                      │    │
│   │    - signerCPF                                                       │    │
│   │    - signerEmail                                                     │    │
│   │    - timestamp ISO                                                   │    │
│   │    - ipAddress                                                       │    │
│   │    - userAgent                                                       │    │
│   │                                                                       │    │
│   │    signatureHash = SHA256(concatenatedData)                          │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 6. GERAÇÃO DO TOKEN DE VALIDAÇÃO                                     │    │
│   │    signatureToken = UUID v4                                          │    │
│   │    URL pública: /validar-assinatura/{signatureToken}                 │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 7. SALVA REGISTRO DE ASSINATURA                                      │    │
│   │    signature_records: {                                              │    │
│   │      id, status: 'SIGNED',                                           │    │
│   │      signerName, signerCPF, signerEmail,                             │    │
│   │      signedAt: NOW(),                                                │    │
│   │      signatureHash, documentHash, signatureToken,                    │    │
│   │      ipAddress, userAgent,                                           │    │
│   │      requirementId, attachmentId, signerId                           │    │
│   │    }                                                                 │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 8. GERA PDF ASSINADO (se PDF)                                        │    │
│   │    modern-signature.service.ts → signPDF()                           │    │
│   │    - Adiciona página com informações da assinatura                   │    │
│   │    - Inclui QR Code com link de validação                            │    │
│   │    - Salva em uploads/signatures/                                    │    │
│   │    - Atualiza attachment.signedPath                                  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                            │
│                                  ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ 9. VERIFICA SE É A ÚLTIMA ASSINATURA                                 │    │
│   │    - Conta assinaturas pendentes do documento                        │    │
│   │    - Se SEQUENTIAL: desbloqueia próximo assinante                    │    │
│   │    - Se todas assinadas: marca documento como isSigned = true        │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔄 Tipos de Fluxo de Assinatura

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIPO: SEQUENTIAL (Uma por vez, em ordem)                                      │
│                                                                               │
│   Assinante 1    Assinante 2    Assinante 3                                  │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                                 │
│   │ 🟢 PODE  │   │ 🔒 AGUARDA│   │ 🔒 AGUARDA│                                │
│   │ ASSINAR  │──>│ Assinatura│──>│ Assinatura│                               │
│   │ (order:1)│   │ anterior  │   │ anterior  │                               │
│   └──────────┘   └──────────┘   └──────────┘                                 │
│                                                                               │
│   Após assinar 1:                                                             │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                                 │
│   │ ✅ ASSINADO│  │ 🟢 PODE  │   │ 🔒 AGUARDA│                                │
│   │           │  │ ASSINAR  │──>│ Assinatura│                                │
│   │           │  │ (order:2)│   │ anterior  │                                │
│   └──────────┘   └──────────┘   └──────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIPO: PARALLEL (Todos podem assinar simultaneamente)                          │
│                                                                               │
│   Assinante 1    Assinante 2    Assinante 3                                  │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                                 │
│   │ 🟢 PODE  │   │ 🟢 PODE  │   │ 🟢 PODE  │                                 │
│   │ ASSINAR  │   │ ASSINAR  │   │ ASSINAR  │                                 │
│   │ (order:1)│   │ (order:2)│   │ (order:3)│                                 │
│   └──────────┘   └──────────┘   └──────────┘                                 │
│                                                                               │
│   Ordem não importa - qualquer um pode assinar a qualquer momento            │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🌐 Validação Pública de Assinatura

**URL:** `/validar-assinatura/:token`

**Arquivo:** `src/views/public/ValidateSignature.vue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        🔐 VALIDAÇÃO DE ASSINATURA                          │
│                                                                            │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │                     ✅ ASSINATURA VÁLIDA                           │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   📄 DOCUMENTO                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ Nome: contrato-fornecedor-2024.pdf                                 │  │
│   │ Hash (SHA-256): a1b2c3d4e5f6...                                    │  │
│   │ Processo: CON-2024-0089                                            │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   ✍️ ASSINATURA                                                            │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ Assinante: João da Silva                                           │  │
│   │ CPF: ***.***.***-12                                                │  │
│   │ E-mail: jo***@empresa.com                                          │  │
│   │ Data/Hora: 15/01/2024 às 14:32:45                                  │  │
│   │ IP: 192.168.1.*** (parcialmente oculto)                            │  │
│   │ Hash da Assinatura: x9y8z7w6...                                    │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   ⚠️ Esta validação confirma que o documento foi assinado digitalmente    │
│      pelo SoloFlow e não foi alterado após a assinatura.                  │
│                                                                            │
│                              [⬇️ Baixar Documento Assinado]               │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 📑 Estrutura do PDF Assinado

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                         [CONTEÚDO ORIGINAL DO PDF]                         │
│                                                                            │
│                              Páginas 1 a N                                 │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│           PÁGINA DE ASSINATURAS (adicionada automaticamente)               │
│                                                                            │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │              TERMO DE AUTENTICIDADE DE ASSINATURAS                 │  │
│   │                                                                     │  │
│   │  Documento: contrato-fornecedor-2024.pdf                           │  │
│   │  Processo: CON-2024-0089                                           │  │
│   │  Hash do Documento: a1b2c3d4e5f6g7h8i9j0...                        │  │
│   │                                                                     │  │
│   │  ────────────────────────────────────────────────                  │  │
│   │                                                                     │  │
│   │  ASSINATURA 1:                                                     │  │
│   │  Nome: João da Silva                                               │  │
│   │  CPF: 123.456.789-00                                               │  │
│   │  Data: 15/01/2024 14:32:45                                         │  │
│   │  Hash: x9y8z7w6v5u4...                                             │  │
│   │                                                     ┌─────────┐    │  │
│   │  Validar em:                                        │ QR CODE │    │  │
│   │  https://soloflow.com/validar/abc123               └─────────┘    │  │
│   │                                                                     │  │
│   │  ────────────────────────────────────────────────                  │  │
│   │                                                                     │  │
│   │  ASSINATURA 2:                                                     │  │
│   │  Nome: Maria Santos                                                │  │
│   │  CPF: 987.654.321-00                                               │  │
│   │  Data: 15/01/2024 16:45:12                                         │  │
│   │  Hash: q1w2e3r4t5y6...                                             │  │
│   │                                                     ┌─────────┐    │  │
│   │  Validar em:                                        │ QR CODE │    │  │
│   │  https://soloflow.com/validar/def456               └─────────┘    │  │
│   │                                                                     │  │
│   └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🔐 Modelo de Dados Completo

```prisma
model SignatureRequirement {
  id            String   @id @default(uuid())
  order         Int      // Ordem da assinatura (para SEQUENTIAL)
  type          String   @default("SEQUENTIAL")  // SEQUENTIAL | PARALLEL
  isRequired    Boolean  @default(true)
  description   String?  // Ex: "Aprovação do gerente"
  createdAt     DateTime @default(now())
  
  stepVersionId String   // Vinculado à etapa
  stepVersion   StepVersion @relation(...)
  
  attachmentId  String?  // Documento específico (se aplicável)
  attachment    Attachment? @relation(...)
  
  // Quem deve assinar (um ou outro)
  userId        String?  // Usuário específico
  user          User?    @relation(...)
  
  sectorId      String?  // Qualquer membro do setor
  sector        Sector?  @relation(...)
  
  // Registros de assinatura
  signatureRecords SignatureRecord[]
  
  @@map("signature_requirements")
}

model SignatureRecord {
  id              String    @id @default(uuid())
  status          String    @default("PENDING")  // PENDING | SIGNED
  
  // Dados do assinante
  signerName      String    // Nome completo
  signerCPF       String?   // CPF (com máscara)
  signerEmail     String    // E-mail
  
  // Timestamp
  signedAt        DateTime? // Data/hora da assinatura
  
  // Hashes de segurança
  signatureHash   String?   // SHA-256 da assinatura
  documentHash    String?   // SHA-256 do documento
  
  // Token de validação pública
  signatureToken  String?   @unique  // UUID para URL de validação
  
  // Motivação
  signatureReason String?   // Motivo da assinatura
  
  // Auditoria
  ipAddress       String?   // IP do assinante
  userAgent       String?   // Navegador/dispositivo
  metadata        Json?     // Dados extras
  
  createdAt       DateTime  @default(now())
  
  // Relacionamentos
  requirementId   String
  requirement     SignatureRequirement @relation(...)
  
  attachmentId    String
  attachment      Attachment @relation(...)
  
  signerId        String
  signer          User @relation(...)
  
  stepExecutionId String
  stepExecution   StepExecution @relation(...)
  
  @@map("signature_records")
}
```

---

### 3.10 ANEXOS E ARQUIVOS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/attachments/attachments.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/attachments/attachments.service.ts` | Lógica de upload |
| Backend Config | `src/modules/attachments/multer.config.ts` | Configuração do Multer |
| Frontend Component | `src/components/AttachmentButton.vue` | Botão de anexar |
| Frontend Component | `src/components/AttachmentList.vue` | Lista de anexos |
| Frontend Component | `src/components/AttachmentPreview.vue` | Preview inline |
| Frontend Component | `src/components/AttachmentPreviewModal.vue` | Modal de preview |
| Frontend Component | `src/components/DocumentViewer.vue` | Visualizador de PDF |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `POST` | `/attachments/upload` | Upload único | Autenticado |
| `POST` | `/attachments/upload-multiple` | Upload múltiplo | Autenticado |
| `GET` | `/attachments/:id/download` | Download de arquivo | Autenticado |
| `GET` | `/attachments/:id/view` | Visualizar inline | Autenticado |
| `DELETE` | `/attachments/:id` | Remover anexo | `attachments.delete` |

#### 📂 Estrutura de Armazenamento

```
uploads/
├── attachments/           # Anexos de processos e etapas
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── uuid-original-filename.pdf
│   │   │   ├── uuid-original-filename.docx
│   │   │   └── ...
│   │   └── 02/
│   └── ...
│
├── signatures/            # Documentos com assinaturas
│   ├── uuid_signed.pdf    # PDF com página de assinaturas
│   └── ...
│
└── subtasks/              # Anexos de sub-tarefas
    ├── uuid-attachment.pdf
    └── ...
```

#### ⚙️ Configuração do Multer

**Arquivo:** `src/modules/attachments/multer.config.ts`

```typescript
export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const uploadPath = `./uploads/attachments/${year}/${month}`;
      
      // Cria diretório se não existir
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // UUID + nome original (sem caracteres especiais)
      const uuid = uuidv4();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${uuid}-${safeName}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Tipos permitidos
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024  // 10 MB máximo
  }
};
```

#### 🖥️ Componente de Lista de Anexos

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📎 ANEXOS DO PROCESSO                                                      │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 cotacao-fornecedor.pdf                                              │ │
│ │ Tamanho: 150 KB │ Enviado em: 15/01/2024 14:32                         │ │
│ │                                              [👁️ Preview] [⬇️ Download]│ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 especificacoes-tecnicas.docx                                        │ │
│ │ Tamanho: 80 KB │ Enviado em: 15/01/2024 14:35                          │ │
│ │                                              [👁️ Preview] [⬇️ Download]│ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🖼️ foto-produto.jpg                                                   │ │
│ │ Tamanho: 2.5 MB │ Enviado em: 15/01/2024 14:40                         │ │
│ │ ┌──────────────┐                                                       │ │
│ │ │   Thumbnail  │                             [👁️ Preview] [⬇️ Download]│ │
│ │ └──────────────┘                                                       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│                                              [+ Adicionar Anexo]           │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Modelo de Dados Completo

```prisma
model Attachment {
  id              String   @id @default(uuid())
  filename        String   // Nome do arquivo no disco (UUID-nome.ext)
  originalName    String   // Nome original do upload
  mimeType        String   // MIME type (application/pdf, image/jpeg, etc.)
  size            Int      // Tamanho em bytes
  path            String   // Caminho relativo no servidor
  
  // Campos de assinatura
  isSigned        Boolean  @default(false)  // Documento foi assinado?
  signedPath      String?  // Caminho do PDF assinado
  signatureData   String?  // JSON com dados das assinaturas
  
  createdAt       DateTime @default(now())
  
  stepExecutionId String
  stepExecution   StepExecution @relation(...)
  
  // Relacionamentos
  signatureRequirements SignatureRequirement[]
  signatureRecords      SignatureRecord[]
  
  @@map("attachments")
}
```

---

### 3.11 SUB-PROCESSOS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Service | `src/modules/processes/processes.service.ts` | Lógica de criação |
| Frontend Component | `src/components/ChildProcessesList.vue` | Lista de sub-processos |
| Frontend Component | `src/components/CreateChildProcessDialog.vue` | Modal de criação |

#### 🔄 Modos de Criação de Sub-Processos

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     MODOS DE CRIAÇÃO DE SUB-PROCESSOS                         │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ MODO: MANUAL                                                         │    │
│   │                                                                       │    │
│   │ • Usuário clica em "Criar Sub-Processo" na tela do processo pai      │    │
│   │ • Seleciona o tipo de sub-processo (dos tipos permitidos)            │    │
│   │ • Preenche formulário inicial                                        │    │
│   │ • Sub-processo é vinculado ao pai                                    │    │
│   │                                                                       │    │
│   │ Casos de Uso:                                                        │    │
│   │ - Criar cotações adicionais durante aprovação                        │    │
│   │ - Iniciar processo de documentação extra                             │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ MODO: RECURRENT (Recorrente)                                         │    │
│   │                                                                       │    │
│   │ • Sub-processo configurado para criar automaticamente                │    │
│   │ • Intervalo definido: diário, semanal, mensal                        │    │
│   │ • Executado enquanto processo pai estiver ativo                      │    │
│   │                                                                       │    │
│   │ Casos de Uso:                                                        │    │
│   │ - Relatórios mensais durante projeto                                 │    │
│   │ - Acompanhamentos semanais de status                                 │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ MODO: SCHEDULED (Agendado)                                           │    │
│   │                                                                       │    │
│   │ • Data específica para criação do sub-processo                       │    │
│   │ • Pode ser relativo: "3 dias após início", "na data X"               │    │
│   │ • Cria automaticamente quando data chegar                            │    │
│   │                                                                       │    │
│   │ Casos de Uso:                                                        │    │
│   │ - Auditoria 30 dias após aprovação                                   │    │
│   │ - Renovação de contrato antes do vencimento                          │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🔗 Relacionamento Pai-Filho

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ESTRUTURA DE SUB-PROCESSOS                             │
│                                                                               │
│   PROCESSO PAI: SOL-2024-0042 (Solicitação de Compra)                        │
│   Status: IN_PROGRESS                                                        │
│   │                                                                          │
│   ├── SUB-PROCESSO 1: COT-2024-0089 (Cotação Dell)                          │
│   │   Status: COMPLETED ✅                                                   │
│   │   Criado em: 10/01/2024                                                  │
│   │   Concluído em: 12/01/2024                                               │
│   │                                                                          │
│   ├── SUB-PROCESSO 2: COT-2024-0090 (Cotação HP)                            │
│   │   Status: COMPLETED ✅                                                   │
│   │   Criado em: 10/01/2024                                                  │
│   │   Concluído em: 13/01/2024                                               │
│   │                                                                          │
│   └── SUB-PROCESSO 3: COT-2024-0091 (Cotação Lenovo)                        │
│       Status: IN_PROGRESS 🔄                                                 │
│       Criado em: 11/01/2024                                                  │
│       Etapa Atual: Aguardando resposta do fornecedor                         │
│                                                                               │
│   Configuração:                                                              │
│   • waitForCompletion: true (Pai aguarda todos os filhos concluírem)         │
│   • autoStart: true (Sub-processos iniciam imediatamente)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Modelo de Dados Completo

```prisma
model ChildProcessConfig {
  id                   String           @id @default(uuid())
  name                 String           // "Cotação", "Auditoria", etc.
  
  processInstanceId    String           // Processo pai
  processInstance      ProcessInstance  @relation(...)
  
  childProcessTypeId   String           // Tipo do sub-processo
  childProcessType     ProcessType      @relation(...)
  
  mode                 ChildProcessMode // MANUAL, RECURRENT, SCHEDULED
  
  triggerStepVersionId String?          // Etapa que dispara (se automático)
  triggerStepVersion   StepVersion?     @relation(...)
  
  // Para RECURRENT
  recurrence           Json?            // { interval: "weekly", dayOfWeek: 1 }
  nextRunAt            DateTime?        // Próxima execução
  lastRunAt            DateTime?        // Última execução
  runCount             Int              @default(0)  // Quantas vezes executou
  
  // Configurações
  waitForCompletion    Boolean          @default(false) // Pai aguarda filho?
  autoStart            Boolean          @default(true)  // Inicia automaticamente?
  inputDataMapping     Json?            // { "campo_filho": "campo_pai" }
  isActive             Boolean          @default(true)
  
  createdAt            DateTime         @default(now())
  
  // Instâncias criadas por esta config
  childInstances       ChildProcessInstance[]
  
  @@map("child_process_configs")
}

model ChildProcessInstance {
  id                      String             @id @default(uuid())
  
  configId                String?            // Configuração que criou (null se manual)
  config                  ChildProcessConfig? @relation(...)
  
  parentProcessInstanceId String             // Processo pai
  parentProcess           ProcessInstance    @relation("ParentProcess", ...)
  
  childProcessInstanceId  String             @unique  // Processo filho
  childProcess            ProcessInstance    @relation("ChildProcess", ...)
  
  originStepExecutionId   String?            // Etapa que disparou
  originStepExecution     StepExecution?     @relation(...)
  
  runNumber               Int?               // Número da execução (para recorrentes)
  status                  ChildProcessStatus @default(ACTIVE)
  scheduledFor            DateTime?          // Data agendada (para SCHEDULED)
  createdAt               DateTime           @default(now())
  completedAt             DateTime?
  
  @@map("child_process_instances")
}

enum ChildProcessMode {
  MANUAL     // Criado manualmente pelo usuário
  RECURRENT  // Criado automaticamente em intervalos
  SCHEDULED  // Criado em data específica
}

enum ChildProcessStatus {
  PENDING    // Agendado, ainda não iniciou
  ACTIVE     // Em execução
  COMPLETED  // Concluído com sucesso
  CANCELLED  // Cancelado
  FAILED     // Falhou
}
```

---

### 3.12 SUB-TAREFAS

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/sub-tasks/sub-tasks.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/sub-tasks/sub-tasks.service.ts` | Lógica de sub-tarefas (592 linhas) |
| Frontend Component | `src/components/SubTasksList.vue` | Lista de sub-tarefas |
| Frontend Component | `src/components/CreateSubTaskDialog.vue` | Modal de criação |
| Frontend Component | `src/components/ExecuteSubStepDialog.vue` | Modal de execução |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/sub-tasks/templates` | Criar template |
| `PUT` | `/sub-tasks/templates/:id` | Atualizar template |
| `DELETE` | `/sub-tasks/templates/:id` | Remover template |
| `GET` | `/sub-tasks/templates/step/:stepVersionId` | Templates da etapa |
| `POST` | `/sub-tasks` | Criar sub-tarefa |
| `GET` | `/sub-tasks/step-execution/:stepExecutionId` | Sub-tarefas da etapa |
| `POST` | `/sub-tasks/execute` | Executar sub-tarefa |
| `PUT` | `/sub-tasks/:id` | Atualizar sub-tarefa |
| `DELETE` | `/sub-tasks/:id` | Remover sub-tarefa |
| `POST` | `/sub-tasks/create-from-templates/:stepExecutionId` | Criar de templates |
| `GET` | `/sub-tasks/check-required/:stepExecutionId` | Verificar obrigatórias |
| `POST` | `/sub-tasks/upload` | Upload de anexo |
| `GET` | `/sub-tasks/attachment/:subTaskId/download` | Download de anexo |

#### 🔄 Modos de Execução

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      MODOS DE EXECUÇÃO DE SUB-TAREFAS                         │
│                                                                               │
│   MODO: SEQUENTIAL (Uma por vez)                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                                                                      │    │
│   │ Sub-tarefa 1     Sub-tarefa 2     Sub-tarefa 3                       │    │
│   │ ┌──────────┐     ┌──────────┐     ┌──────────┐                      │    │
│   │ │ 🟢 ATIVA │────>│ 🔒 AGUARDA│────>│ 🔒 AGUARDA│                     │    │
│   │ │ (order:1)│     │ anterior │     │ anterior │                      │    │
│   │ └──────────┘     └──────────┘     └──────────┘                      │    │
│   │                                                                      │    │
│   │ Regra: Só pode executar próxima após concluir anterior               │    │
│   │ Caso de Uso: Checklist que deve ser seguido em ordem                 │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│   MODO: PARALLEL (Todas ao mesmo tempo)                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                                                                      │    │
│   │ Sub-tarefa 1     Sub-tarefa 2     Sub-tarefa 3                       │    │
│   │ ┌──────────┐     ┌──────────┐     ┌──────────┐                      │    │
│   │ │ 🟢 ATIVA │     │ 🟢 ATIVA │     │ 🟢 ATIVA │                      │    │
│   │ │ (order:1)│     │ (order:2)│     │ (order:3)│                      │    │
│   │ └──────────┘     └──────────┘     └──────────┘                      │    │
│   │                                                                      │    │
│   │ Regra: Todas podem ser executadas simultaneamente                    │    │
│   │ Caso de Uso: Tarefas independentes que podem ser feitas em paralelo │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 🖥️ Lista de Sub-Tarefas na Etapa

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📋 SUB-TAREFAS DA ETAPA                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ 1. Verificar documentação do fornecedor                    [CONCLUÍDA] │
│ │ Executado por: João Silva em 15/01/2024 10:30                          │ │
│ │ Comentário: "Documentação verificada e OK"                             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ 2. Conferir valores da proposta                            [CONCLUÍDA] │
│ │ Executado por: João Silva em 15/01/2024 10:45                          │ │
│ │ Comentário: "Valores conferidos com a cotação anterior"                │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ⏳ 3. Validar prazo de entrega                    [PENDENTE] *Obrigatória │
│ │ Instruções: Confirmar se prazo está dentro do esperado                 │ │
│ │ SLA: 4 horas                                        [▶️ Executar]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ⏳ 4. Anexar comprovante de análise                          [PENDENTE] │
│ │ Instruções: Upload do documento de análise                 (Opcional)  │ │
│ │ Permite anexo: ✓                                    [▶️ Executar]       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ⚠️ Existem sub-tarefas obrigatórias pendentes. Complete-as antes de       │
│    prosseguir com a etapa.                                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 🔗 Verificação de Sub-Tarefas Obrigatórias

**Arquivo:** `sub-tasks.service.ts → checkRequired()`

```typescript
async checkRequired(stepExecutionId: string): Promise<{ 
  hasPending: boolean, 
  pendingTasks: SubTask[] 
}> {
  // Buscar sub-tarefas obrigatórias pendentes
  const pendingRequired = await this.prisma.subTask.findMany({
    where: {
      stepExecutionId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      subTaskTemplate: {
        isRequired: true
      }
    },
    include: {
      subTaskTemplate: true
    }
  });
  
  return {
    hasPending: pendingRequired.length > 0,
    pendingTasks: pendingRequired
  };
}

// Chamado antes de executar a etapa principal:
// if ((await this.subTasksService.checkRequired(stepExecutionId)).hasPending) {
//   throw new BadRequestException('Complete as sub-tarefas obrigatórias primeiro');
// }
```

#### 📊 Modelo de Dados Completo

```prisma
model SubTaskTemplate {
  id                 String                @id @default(uuid())
  
  stepVersionId      String
  stepVersion        StepVersion           @relation(...)
  
  name               String                // "Verificar documentação"
  description        String?               // Descrição detalhada
  instructions       String?               // Instruções para execução
  order              Int                   // Ordem de execução
  
  executionMode      SubTaskExecutionMode  @default(PARALLEL)
  
  // Atribuição
  assignmentType     SubTaskAssignmentType @default(INHERIT)
  assignedToUserId   String?               // Para USER
  assignedToSectorId String?               // Para SECTOR
  
  // SLA
  slaHours           Int?
  slaDays            Int?
  
  // Configurações
  isRequired         Boolean               @default(true)   // Obrigatória?
  allowAttachment    Boolean               @default(false)  // Permite anexo?
  isActive           Boolean               @default(true)
  
  createdAt          DateTime              @default(now())
  
  // Instâncias criadas deste template
  subTasks           SubTask[]
  
  @@map("sub_task_templates")
}

model SubTask {
  id                 String        @id @default(uuid())
  
  stepExecutionId    String
  stepExecution      StepExecution @relation(...)
  
  subTaskTemplateId  String
  subTaskTemplate    SubTaskTemplate @relation(...)
  
  status             SubTaskStatus @default(PENDING)
  
  executorId         String?       // Quem executou
  executor           User?         @relation(...)
  
  comment            String?       // Comentário da execução
  dueAt              DateTime?     // Data limite (SLA)
  
  // Anexo (único por sub-tarefa)
  attachmentPath     String?
  attachmentName     String?
  attachmentSize     Int?
  attachmentMimeType String?
  
  // Assinatura (se configurada)
  requireSignature   Boolean       @default(false)
  signatureType      String?       // SEQUENTIAL | PARALLEL
  signers            String?       // JSON com assinantes
  signatures         String?       // JSON com assinaturas feitas
  
  startedAt          DateTime?     // Quando iniciou
  completedAt        DateTime?     // Quando concluiu
  createdAt          DateTime      @default(now())
  
  @@map("sub_tasks")
}

enum SubTaskExecutionMode {
  SEQUENTIAL  // Uma por vez
  PARALLEL    // Todas ao mesmo tempo
}

enum SubTaskAssignmentType {
  INHERIT  // Herda responsável da etapa pai
  USER     // Usuário específico
  SECTOR   // Setor específico
  CREATOR  // Criador do processo
}

enum SubTaskStatus {
  PENDING      // Aguardando execução
  IN_PROGRESS  // Em andamento
  COMPLETED    // Concluída
  SKIPPED      // Pulada (não obrigatória)
  CANCELLED    // Cancelada
}
```

---

### 3.13 AUDITORIA

#### 📁 Arquivos Envolvidos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Backend Controller | `src/modules/audit/audit.controller.ts` | Endpoints REST |
| Backend Service | `src/modules/audit/audit.service.ts` | Lógica de auditoria |
| Backend Module | `src/modules/audit/audit.module.ts` | Configuração do módulo |

#### 🔌 Endpoints da API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| `GET` | `/audit` | Listar logs | `audit.view` |
| `GET` | `/audit/user/:userId` | Logs de um usuário | `audit.view` |
| `GET` | `/audit/company/:companyId` | Logs de uma empresa | `audit.view` |
| `GET` | `/audit/resource/:type/:id` | Logs de um recurso | `audit.view` |
| `GET` | `/audit/action/:action` | Logs por tipo de ação | `audit.view` |

#### 📋 Tipos de Ação Registrados

| Ação | Recurso | Descrição |
|------|---------|-----------|
| `USER_LOGIN` | USER | Usuário fez login |
| `USER_LOGOUT` | USER | Usuário fez logout |
| `USER_CREATED` | USER | Novo usuário criado |
| `USER_UPDATED` | USER | Usuário atualizado |
| `USER_DELETED` | USER | Usuário removido |
| `PROCESS_CREATED` | PROCESS | Processo criado |
| `STEP_EXECUTED` | PROCESS | Etapa executada |
| `STEP_APPROVED` | PROCESS | Etapa aprovada |
| `STEP_REJECTED` | PROCESS | Etapa rejeitada |
| `PROCESS_COMPLETED` | PROCESS | Processo concluído |
| `PROCESS_CANCELLED` | PROCESS | Processo cancelado |
| `DOCUMENT_SIGNED` | SIGNATURE | Documento assinado |
| `PROFILE_CREATED` | PROFILE | Perfil criado |
| `PROFILE_UPDATED` | PROFILE | Perfil atualizado |
| `PERMISSION_GRANTED` | PROFILE | Permissão concedida |
| `PERMISSION_REVOKED` | PROFILE | Permissão revogada |
| `COMPANY_SWITCHED` | AUTH | Troca de empresa |

#### 🔄 Fluxo de Registro de Auditoria

```typescript
// Backend: audit.service.ts
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    action: string;
    resourceType: string;
    resourceId?: string;
    userId?: string;
    companyId?: string;
    details?: any;
    request?: Request;  // Para extrair IP e User-Agent
  }) {
    const { action, resourceType, resourceId, userId, companyId, details, request } = params;
    
    return this.prisma.auditLog.create({
      data: {
        action,
        resource: resourceType,
        resourceId,
        userId,
        companyId,
        details,
        ipAddress: request?.ip || request?.headers['x-forwarded-for'],
        userAgent: request?.headers['user-agent']
      }
    });
  }
}

// Uso em outros services:
// this.auditService.log({
//   action: 'PROCESS_CREATED',
//   resourceType: 'PROCESS',
//   resourceId: process.id,
//   userId: currentUser.id,
//   companyId: currentUser.companyId,
//   details: { processCode: process.code, processType: type.name }
// });
```

#### 🖥️ Tela de Auditoria (Admin)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📋 LOGS DE AUDITORIA                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│ Período: [01/01/2024] até [31/01/2024]   Usuário: [Todos ▼]               │
│ Ação: [Todas ▼]   Recurso: [Todos ▼]                     [🔍 Filtrar]     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 15/01/2024 14:32:45 │ DOCUMENT_SIGNED │ João Silva                     │ │
│ │ Recurso: Attachment (uuid-123)                                         │ │
│ │ IP: 192.168.1.100 │ Chrome/Windows                                     │ │
│ │ Detalhes: { "documentName": "contrato.pdf", "processCode": "CON-2024-01" } │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 15/01/2024 14:30:12 │ STEP_APPROVED │ Maria Santos                     │ │
│ │ Recurso: StepExecution (uuid-456)                                      │ │
│ │ IP: 192.168.1.105 │ Firefox/MacOS                                      │ │
│ │ Detalhes: { "stepName": "Aprovação Gerente", "comment": "OK" }         │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 15/01/2024 14:25:00 │ PROCESS_CREATED │ Carlos Oliveira                │ │
│ │ Recurso: ProcessInstance (uuid-789)                                    │ │
│ │ IP: 192.168.1.110 │ Edge/Windows                                       │ │
│ │ Detalhes: { "processCode": "SOL-2024-0042", "type": "Solicitação" }    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Mostrando 1-20 de 1.543 registros                  [<] 1 2 3 ... 78 [>]   │
└────────────────────────────────────────────────────────────────────────────┘
```

#### 📊 Modelo de Dados

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String   // PROCESS_CREATED, STEP_EXECUTED, etc.
  resource   String   // PROCESS, USER, PROFILE, etc.
  resourceId String?  // ID do recurso afetado
  details    Json?    // Dados extras (antes/depois, contexto)
  ipAddress  String?  // IP do cliente
  userAgent  String?  // Navegador/dispositivo
  createdAt  DateTime @default(now())
  
  userId     String?
  user       User?    @relation(...)
  
  companyId  String?
  company    Company? @relation(...)
  
  @@index([action])
  @@index([resource, resourceId])
  @@index([userId])
  @@index([companyId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

### 3.14 DASHBOARD

#### Funcionalidades

1. **Estatísticas Pessoais**
   - Tarefas pendentes
   - Processos criados
   - Processos em andamento
   - Processos concluídos

2. **Widgets**
   - Cards de estatísticas
   - Lista de tarefas pendentes
   - Processos recentes
   - Gráficos de progresso

3. **Ações Rápidas**
   - Criar novo processo
   - Ver todas as tarefas
   - Acessar processos

4. **Personalização**
   - Saudação por horário
   - Informações da empresa ativa

---

## 4. MODELOS DE DADOS

### Diagrama de Relacionamentos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Company   │────<│    User     │>────│   Sector    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ProcessType │     │  Profiles   │     │StepAssignment│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Version    │     │ Permissions │
└─────────────┘     └─────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ FormFields  │ │   Steps     │ │  Instance   │
└─────────────┘ └─────────────┘ └─────────────┘
                      │              │
                      ▼              ▼
               ┌─────────────┐ ┌─────────────┐
               │ SubTaskTmpl │ │ StepExec    │
               └─────────────┘ └─────────────┘
                                     │
                      ┌──────────────┼──────────────┐
                      ▼              ▼              ▼
               ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
               │ Attachments │ │  SubTasks   │ │ Signatures  │
               └─────────────┘ └─────────────┘ └─────────────┘
```

### Enumerações

```prisma
enum UserRole {
  ADMIN
  MANAGER
  USER
}

enum StepType {
  INPUT
  APPROVAL
  UPLOAD
  REVIEW
  SIGNATURE
}

enum ProcessStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
  REJECTED
}

enum StepExecutionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  REJECTED
  SKIPPED
}

enum FieldType {
  TEXT
  NUMBER
  DATE
  EMAIL
  CPF
  CNPJ
  PHONE
  DROPDOWN
  CHECKBOX
  TEXTAREA
  CURRENCY
  FILE
  TABLE
}

enum AssignmentType {
  USER
  SECTOR
  ROLE
  CONDITIONAL
}

enum DynamicRole {
  PROCESS_CREATOR
  SECTOR_MANAGER
  COMPANY_ADMIN
  PREVIOUS_EXECUTOR
  DATA_OWNER
}

enum ChildProcessMode {
  MANUAL
  RECURRENT
  SCHEDULED
}

enum ChildProcessStatus {
  PENDING
  ACTIVE
  COMPLETED
  CANCELLED
  FAILED
}

enum SubTaskExecutionMode {
  SEQUENTIAL
  PARALLEL
}

enum SubTaskAssignmentType {
  INHERIT
  USER
  SECTOR
  CREATOR
}

enum SubTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
  CANCELLED
}
```

---

## 5. APIs REST

### Estrutura Base

```
Base URL: http://localhost:3000
Autenticação: Bearer Token (JWT)
Content-Type: application/json
```

### Resumo de Endpoints

| Módulo | Prefixo | Autenticação |
|--------|---------|--------------|
| Auth | `/auth` | Parcial |
| Users | `/users` | Sim |
| Companies | `/companies` | Sim |
| Sectors | `/sectors` | Sim |
| Profiles | `/profiles` | Sim |
| Process Types | `/process-types` | Sim |
| Processes | `/processes` | Sim |
| Signatures | `/signatures` | Sim |
| Signatures Public | `/signatures-public` | Não |
| Attachments | `/attachments` | Sim |
| Sub-Tasks | `/sub-tasks` | Sim |
| Audit | `/audit` | Sim |

### Headers Padrão

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Códigos de Resposta

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 204 | Sem conteúdo (deletado) |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Não autorizado |
| 404 | Não encontrado |
| 500 | Erro interno |

---

## 6. FLUXOS DE TRABALHO

### 6.1 Fluxo de Login

```
1. Usuário acessa /entrar
2. Preenche email e senha
3. Sistema valida credenciais
4. Gera JWT e Refresh Token
5. Armazena tokens no localStorage
6. Redireciona para /painel
7. Carrega permissões e empresas
8. Exibe dashboard personalizado
```

### 6.2 Fluxo de Criação de Processo

```
1. Usuário acessa /processos/criar
2. Seleciona tipo de processo
3. Sistema carrega formulário configurado
4. Usuário preenche campos obrigatórios
5. Faz upload de arquivos (se necessário)
6. Define título do processo
7. Submete formulário
8. Sistema cria ProcessInstance
9. Cria primeira StepExecution
10. Atribui responsável
11. Envia notificação
12. Redireciona para detalhes
```

### 6.3 Fluxo de Execução de Etapa

```
1. Responsável visualiza tarefa
2. Acessa execução da etapa
3. Visualiza dados anteriores
4. Preenche dados da etapa (se houver)
5. Anexa arquivos (se necessário)
6. Executa sub-tarefas (se houver)
7. Assina documentos (se requerido)
8. Seleciona ação (aprovar/rejeitar)
9. Adiciona comentário
10. Confirma execução
11. Sistema atualiza StepExecution
12. Cria próxima etapa ou conclui
```

### 6.4 Fluxo de Assinatura

```
1. Sistema identifica documentos pendentes
2. Exibe na lista de assinaturas
3. Usuário seleciona documento
4. Visualiza PDF
5. Confirma dados pessoais
6. Sistema captura IP e navegador
7. Gera hash do documento
8. Cria registro de assinatura
9. Gera token de validação
10. Atualiza status
11. Notifica próximo assinante (se sequencial)
```

### 6.5 Fluxo de Sub-Processos

```
1. Processo pai em execução
2. Etapa configurada dispara sub-processo
3. Sistema cria novo ProcessInstance filho
4. Vincula ao processo pai
5. Executa workflow independente
6. Ao concluir, notifica processo pai
7. Processo pai pode prosseguir
```

---

## 7. COMPONENTES DO FRONTEND

### Componentes de Processo

- `ProcessTypeEditor.vue` - Editor de tipos de processo
- `CreateProcess.vue` - Criação de processos
- `ProcessDetail.vue` - Detalhes do processo
- `StepExecution.vue` - Execução de etapas
- `ManageProcesses.vue` - Gestão de processos
- `MyProcesses.vue` - Meus processos

### Componentes de Assinatura

- `PendingSignatures.vue` - Assinaturas pendentes
- `SignDocumentDialog.vue` - Modal de assinatura
- `SignatureStatusViewer.vue` - Status de assinaturas
- `SignatureRequirementsDialog.vue` - Configuração de requisitos

### Componentes Auxiliares

- `AttachmentButton.vue` - Botão de anexo
- `AttachmentList.vue` - Lista de anexos
- `AttachmentPreview.vue` - Preview de arquivos
- `DocumentViewer.vue` - Visualizador de documentos
- `DynamicTableInput.vue` - Tabela dinâmica
- `FileUploadField.vue` - Campo de upload
- `SubTasksList.vue` - Lista de sub-tarefas
- `ChildProcessesList.vue` - Lista de sub-processos
- `ProcessFlowVisualizer.vue` - Visualizador de fluxo
- `ProcessHistory.vue` - Histórico do processo
- `PaginationControls.vue` - Controles de paginação
- `StepDialog.vue` - Dialog de etapa
- `ConditionBuilder.vue` - Construtor de condições

---

## 8. STORES (PINIA)

### Stores Disponíveis

- `auth` - Autenticação e sessão
- `processes` - Processos e tarefas
- `processTypes` - Tipos de processo
- `users` - Usuários
- `sectors` - Setores
- `profiles` - Perfis
- `companies` - Empresas

---

## 9. CONFIGURAÇÕES

### Variáveis de Ambiente (Backend)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
```

### Variáveis de Ambiente (Frontend)

```env
VITE_API_URL=http://localhost:3000
```

---

## 10. SEGURANÇA

### Práticas Implementadas

1. **Autenticação**
   - JWT com expiração
   - Refresh tokens rotativos
   - Revogação de sessões

2. **Autorização**
   - RBAC (Role-Based Access Control)
   - Permissões por recurso e ação
   - Isolamento por empresa

3. **Dados**
   - Senhas com bcrypt
   - Validação de entrada
   - Sanitização de dados

4. **Auditoria**
   - Log de todas as ações críticas
   - Registro de IP e dispositivo

---

## 11. CONCLUSÃO

O SoloFlow é um sistema completo e robusto para gestão de processos empresariais, oferecendo:

- ✅ **Flexibilidade** - Tipos de processo totalmente configuráveis
- ✅ **Segurança** - Sistema de permissões granular
- ✅ **Rastreabilidade** - Auditoria completa
- ✅ **Assinatura Digital** - Validação pública
- ✅ **Multi-empresa** - Suporte a múltiplas organizações
- ✅ **Sub-processos e Sub-tarefas** - Workflows complexos
- ✅ **Interface Moderna** - Vue.js 3 + Vuetify

---

**Desenvolvido por:** SoloFlow Team  
**Versão do Documento:** 1.0  
**Última Atualização:** Janeiro de 2026
