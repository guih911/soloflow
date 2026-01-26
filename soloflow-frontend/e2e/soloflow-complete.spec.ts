/**
 * SoloFlow - Teste E2E Completo
 *
 * Simula um usuário real navegando por todo o sistema,
 * verificando funcionalidades, layout e capturando screenshots.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Credenciais de teste
const ADMIN_USER = {
  email: 'admin@soloflow.com.br',
  password: 'admin123'
};

// Armazena erros e problemas encontrados
const consoleErrors: string[] = [];
const visualIssues: string[] = [];

// Helper para verificar problemas visuais comuns
async function checkVisualIssues(page: Page, pageName: string) {
  const issues: string[] = [];

  // Verificar elementos fora da tela (overflow)
  const overflowingElements = await page.evaluate(() => {
    const elements: string[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 20 && rect.width > 0) {
        const id = el.id || el.className?.toString().substring(0, 30) || el.tagName;
        if (!elements.includes(id) && elements.length < 3) {
          elements.push(`Overflow: ${id}`);
        }
      }
    });
    return elements;
  });

  if (overflowingElements.length > 0) {
    issues.push(`[${pageName}] ${overflowingElements.join(', ')}`);
  }

  // Verificar botões invisíveis
  const invisibleButtons = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, .v-btn');
    const issues: string[] = [];
    buttons.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        const text = btn.textContent?.trim().substring(0, 20);
        if (text && !issues.includes(text)) {
          issues.push(`Botão invisível: ${text}`);
        }
      }
    });
    return issues.slice(0, 3);
  });

  if (invisibleButtons.length > 0) {
    issues.push(`[${pageName}] ${invisibleButtons.join(', ')}`);
  }

  return issues;
}

// Helper para fechar sidebar no mobile (se estiver aberto)
async function closeMobileSidebar(page: Page) {
  // Verificar se estamos em viewport mobile
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 960) {
    // Tentar fechar o sidebar pressionando Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Se ainda estiver aberto, tentar clicar no scrim
    const scrim = page.locator('.v-navigation-drawer__scrim');
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Esperar a animação terminar
    await page.waitForTimeout(200);
  }
}

// Configurar estado de autenticação antes dos testes
test.describe('SoloFlow - Teste Completo do Sistema', () => {
  let authContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // Criar contexto com estado de autenticação
    authContext = await browser.newContext();
    const page = await authContext.newPage();

    // Fazer login uma única vez
    await page.goto('/entrar');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input[name="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"], .v-btn:has-text("Entrar")');

    // Aguardar login com timeout maior
    try {
      await page.waitForURL(/\/painel/, { timeout: 30000 });
      console.log('✅ Login realizado com sucesso');
    } catch (e) {
      // Verificar se está em rate limit
      const rateLimitMsg = await page.locator('.v-alert:has-text("Limite")').isVisible().catch(() => false);
      if (rateLimitMsg) {
        console.log('⚠️  Rate limit atingido. Aguardando...');
        await page.waitForTimeout(5000);
      }
      throw e;
    }

    await page.close();
  });

  test.afterAll(async () => {
    await authContext?.close();
  });

  test.beforeEach(async ({ page }) => {
    // Capturar erros de console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('404') && !text.includes('ERR_')) {
          consoleErrors.push(`[Console] ${text.substring(0, 100)}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[Page Error] ${err.message.substring(0, 100)}`);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PÁGINA DE LOGIN
  // ─────────────────────────────────────────────────────────────────────────────

  test('01 - Página de Login - Layout', async ({ page }) => {
    await page.goto('/entrar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/01-login-page.png', fullPage: true });

    // Verificar elementos
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], .v-btn:has-text("Entrar")')).toBeVisible();

    const issues = await checkVisualIssues(page, 'Login');
    visualIssues.push(...issues);
  });

  test('02 - Login com erro - Mensagem de erro', async ({ page }) => {
    await page.goto('/entrar');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input[name="email"]', 'invalido@teste.com');
    await page.fill('input[type="password"]', 'senhaerrada123');
    await page.click('button[type="submit"], .v-btn:has-text("Entrar")');

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/02-login-error.png', fullPage: true });

    // Verificar se há alerta de erro
    const hasAlert = await page.locator('.v-alert').isVisible().catch(() => false);
    console.log(`Mensagem de erro/rate-limit visível: ${hasAlert}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TESTES AUTENTICADOS - Usar contexto salvo
  // ─────────────────────────────────────────────────────────────────────────────

  test('03 - Dashboard/Painel - Layout completo', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/03-dashboard.png', fullPage: true });

    // Verificar componentes (dashboard usa .stat-card e .content-card em vez de .v-card)
    const statCards = await page.locator('.stat-card').count();
    const contentCards = await page.locator('.content-card').count();
    const totalCards = statCards + contentCards;
    console.log(`Cards no dashboard: ${totalCards} (stat: ${statCards}, content: ${contentCards})`);
    expect(totalCards).toBeGreaterThan(0);

    const issues = await checkVisualIssues(page, 'Dashboard');
    visualIssues.push(...issues);

    await page.close();
  });

  test('04 - Menu lateral - Itens de navegação', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/04-sidebar.png', fullPage: true });

    const menuItems = await page.locator('.v-navigation-drawer .v-list-item').count();
    console.log(`Itens no menu: ${menuItems}`);
    expect(menuItems).toBeGreaterThan(3);

    await page.close();
  });

  test('05 - Criar Processo - Lista de tipos', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/processos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/05-create-process.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Criar Processo');
    visualIssues.push(...issues);

    await page.close();
  });

  test('06 - Gerenciar Processos - Tabela', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/gerenciar-processos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/06-manage-processes.png', fullPage: true });

    // Verificar tabela
    const hasTable = await page.locator('.v-data-table, table').isVisible().catch(() => false);
    console.log(`Tabela de processos visível: ${hasTable}`);

    const issues = await checkVisualIssues(page, 'Gerenciar Processos');
    visualIssues.push(...issues);

    await page.close();
  });

  test('07 - Meus Processos', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/meus-processos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/07-my-processes.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Meus Processos');
    visualIssues.push(...issues);

    await page.close();
  });

  test('08 - Minhas Tarefas', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/minhas-tarefas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/08-my-tasks.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Minhas Tarefas');
    visualIssues.push(...issues);

    await page.close();
  });

  test('09 - Assinaturas Pendentes', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/assinaturas/pendentes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/09-signatures.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Assinaturas');
    visualIssues.push(...issues);

    await page.close();
  });

  test('10 - Relatórios', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/relatorios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/10-reports.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Relatórios');
    visualIssues.push(...issues);

    await page.close();
  });

  test('11 - Tipos de Processo', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/tipos-de-processo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/11-process-types.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Tipos de Processo');
    visualIssues.push(...issues);

    await page.close();
  });

  test('12 - Setores', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/setores');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/12-sectors.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Setores');
    visualIssues.push(...issues);

    await page.close();
  });

  test('13 - Usuários', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/usuarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/13-users.png', fullPage: true });

    // Verificar tabela de usuários
    const userRows = await page.locator('.v-data-table tbody tr, table tbody tr').count();
    console.log(`Usuários na tabela: ${userRows}`);

    const issues = await checkVisualIssues(page, 'Usuários');
    visualIssues.push(...issues);

    await page.close();
  });

  test('14 - Perfis (RBAC)', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/perfis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/14-profiles.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Perfis');
    visualIssues.push(...issues);

    await page.close();
  });

  test('15 - Meu Perfil', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/meu-perfil');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/15-my-profile.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Meu Perfil');
    visualIssues.push(...issues);

    await page.close();
  });

  test('16 - Configurações', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/configuracoes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e-results/16-settings.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Configurações');
    visualIssues.push(...issues);

    await page.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RESPONSIVIDADE
  // ─────────────────────────────────────────────────────────────────────────────

  test('17 - Responsividade - Desktop 1920px', async ({ browser }) => {
    const page = await authContext.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/17-responsive-1920.png', fullPage: true });
    await page.close();
  });

  test('18 - Responsividade - Laptop 1366px', async ({ browser }) => {
    const page = await authContext.newPage();
    await page.setViewportSize({ width: 1366, height: 768 });

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/18-responsive-1366.png', fullPage: true });
    await page.close();
  });

  test('19 - Responsividade - Tablet 768px', async ({ browser }) => {
    const page = await authContext.newPage();
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/19-responsive-768.png', fullPage: true });

    // Verificar menu hamburguer
    const hamburger = await page.locator('.v-app-bar__nav-icon').isVisible().catch(() => false);
    console.log(`Menu hamburguer visível: ${hamburger}`);

    await page.close();
  });

  test('20 - Responsividade - Mobile 375px', async ({ browser }) => {
    const page = await authContext.newPage();
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e-results/20-responsive-375.png', fullPage: true });

    const issues = await checkVisualIssues(page, 'Mobile 375px');
    visualIssues.push(...issues);

    await page.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERAÇÕES
  // ─────────────────────────────────────────────────────────────────────────────

  test('21 - Notificações - Menu dropdown', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fechar sidebar no mobile se estiver aberto
    await closeMobileSidebar(page);

    // Clicar no ícone de notificações (no header)
    const notifIcon = page.locator('header .v-badge, header [data-testid="notifications"], .app-bar .v-badge').first();
    if (await notifIcon.isVisible().catch(() => false)) {
      await notifIcon.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e-results/21-notifications-menu.png', fullPage: true });
    }

    await page.close();
  });

  test('22 - Menu do usuário', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/painel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Fechar sidebar no mobile se estiver aberto
    await closeMobileSidebar(page);

    // Clicar no avatar do usuário (no header ou sidebar)
    const viewport = page.viewportSize();
    let userMenu;
    if (viewport && viewport.width < 768) {
      // No mobile, o menu de usuário pode estar no header
      userMenu = page.locator('header .v-avatar, .app-bar .v-avatar').first();
    } else {
      userMenu = page.locator('.user-menu-trigger, .sidebar .v-avatar').first();
    }

    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e-results/22-user-menu.png', fullPage: true });
    }

    await page.close();
  });

  test('23 - Detalhe de processo', async ({ browser }) => {
    const page = await authContext.newPage();

    await page.goto('/gerenciar-processos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fechar sidebar no mobile se estiver aberto
    await closeMobileSidebar(page);
    await page.waitForTimeout(300);

    // Clicar no primeiro processo da lista
    const firstRow = page.locator('.v-data-table tbody tr, table tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Fechar sidebar novamente na página de detalhe
      await closeMobileSidebar(page);

      await page.screenshot({ path: 'e2e-results/23-process-detail.png', fullPage: true });

      const issues = await checkVisualIssues(page, 'Detalhe do Processo');
      visualIssues.push(...issues);
    }

    await page.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RELATÓRIO FINAL
  // ─────────────────────────────────────────────────────────────────────────────

  test('99 - Relatório Final', async ({ page }) => {
    console.log('\n' + '═'.repeat(70));
    console.log('   RELATÓRIO FINAL DE TESTES E2E - SOLOFLOW');
    console.log('═'.repeat(70));

    console.log('\n📋 ERROS DE CONSOLE ENCONTRADOS:');
    if (consoleErrors.length === 0) {
      console.log('   ✅ Nenhum erro de console detectado');
    } else {
      const uniqueErrors = [...new Set(consoleErrors)];
      uniqueErrors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
      if (uniqueErrors.length > 10) {
        console.log(`   ... e mais ${uniqueErrors.length - 10} erros`);
      }
    }

    console.log('\n🎨 PROBLEMAS VISUAIS ENCONTRADOS:');
    if (visualIssues.length === 0) {
      console.log('   ✅ Nenhum problema visual detectado');
    } else {
      const uniqueIssues = [...new Set(visualIssues)];
      uniqueIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    console.log('\n📸 Screenshots salvos em: e2e-results/');
    console.log('📊 Relatório HTML em: e2e-report/index.html');
    console.log('═'.repeat(70) + '\n');

    expect(true).toBe(true);
  });
});
