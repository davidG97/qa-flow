import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para ejecución en modo CLI
 * Esta configuración se usa cuando se ejecutan tests exportados desde QA Flow
 */
export default defineConfig({
  // Directorio de tests generados
  testDir: './tests-generated',
  
  // Directorio de resultados
  outputDir: './test-results',
  
  // Timeout por test (se puede sobreescribir por proyecto)
  timeout: 30000,
  
  // Modo de ejecución
  fullyParallel: true,
  
  // Fallar el build si hay test.only en CI
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers paralelos
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter - JSON para parsing programático + HTML para visualización
  reporter: [
    ['json', { outputFile: './test-results/results.json' }],
    ['html', { outputFolder: './test-results/html-report', open: 'never' }],
    ['list'],
  ],
  
  // Configuración compartida para todos los proyectos
  use: {
    // Trace solo en primer reintento
    trace: 'on-first-retry',
    
    // Screenshots en fallo
    screenshot: 'only-on-failure',
    
    // Video en fallo
    video: 'on-first-retry',
    
    // Base URL (se puede configurar por proyecto)
    // baseURL: 'http://localhost:3000',
  },

  // Proyectos/Navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
