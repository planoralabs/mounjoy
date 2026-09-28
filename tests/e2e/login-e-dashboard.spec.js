import { test, expect } from '@playwright/test';
import { SEEDED_USER } from './fixtures.js';

// Sem .env.test.local o app usaria o Supabase de PRODUÇÃO — pula.
test.skip(!process.env.MOUNJOY_E2E_TEST_ENV, 'exige .env.test.local (projeto Supabase de teste)');

// Exige que `npm run test:e2e:seed` já tenha rodado contra o projeto
// Supabase de TESTE (ver tests/e2e/seed.mjs) — este teste não cria a conta.
test('login com conta já existente mostra os dados salvos no dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('landing-login-button').click();

    await page.getByTestId('login-email-input').fill(SEEDED_USER.email);
    await page.getByTestId('login-password-input').fill(SEEDED_USER.password);
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('main-app-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Oi, ${SEEDED_USER.name}!`, { exact: false })).toBeVisible();
    await expect(page.getByText(`${SEEDED_USER.currentWeight}`, { exact: false }).first()).toBeVisible();
});
