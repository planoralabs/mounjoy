import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './tests/e2e/loadTestEnv.mjs';

// Injeta EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY do projeto
// Supabase de TESTE no processo do Playwright; o `webServer` abaixo herda
// esse process.env ao subir `npm run web`, então o app conversa com o
// projeto de teste (não com produção) enquanto os specs rodam.
loadTestEnv();

// ATENÇÃO: os specs foram escritos para o antigo webapp Vite (removido; ver
// tag git `webapp-vite-final`). Eles dependem de data-testid que ainda não
// existem nos componentes nativos — é preciso adicionar `testID` neles antes
// de rodar `npm run test:e2e` contra o Expo Web.

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
