import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './tests/e2e/loadTestEnv.mjs';

// Injeta EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY do projeto
// Supabase de TESTE no processo do Playwright; o `webServer` abaixo herda
// esse process.env ao subir `npm run web`, então o app conversa com o
// projeto de teste (não com produção) enquanto os specs rodam.
loadTestEnv();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8081',
    // O app segue o idioma do dispositivo; as specs conferem textos em
    // português, então o navegador de teste roda em pt-BR.
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run web',
    // Espera o Metro compilar o bundle web (a 1ª compilação passa de 30s);
    // mesma URL que o index.html do Expo pede, então o page.goto já pega o
    // bundle pronto do cache.
    url: 'http://localhost:8081/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable',
    // Com o projeto de teste carregado, nunca reaproveita um servidor já
    // aberto: ele pode estar apontando para o Supabase de produção.
    reuseExistingServer: !process.env.CI && !process.env.MOUNJOY_E2E_TEST_ENV,
    timeout: 300_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
