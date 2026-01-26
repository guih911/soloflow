import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Executar sequencialmente para simular usuário real
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on', // Capturar screenshot em cada teste
    video: 'retain-on-failure',

    // Viewport padrão (desktop)
    viewport: { width: 1920, height: 1080 },

    // Tempo de espera
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Diretório para screenshots
  outputDir: 'e2e-results',

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Testar responsividade em tablet
    {
      name: 'Tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        ...devices['Desktop Chrome']
      },
    },
    // Testar responsividade em mobile
    {
      name: 'Mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],

  // Iniciar servidor de desenvolvimento automaticamente
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
