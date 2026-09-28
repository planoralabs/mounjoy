import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers.js';
import { newSignupEmail, SIGNUP_PASSWORD } from './fixtures.js';

// Sem .env.test.local o app usaria o Supabase de PRODUÇÃO — pula.
test.skip(!process.env.MOUNJOY_E2E_TEST_ENV, 'exige .env.test.local (projeto Supabase de teste)');

/**
 * Caminho real de cadastro no app: o wizard de onboarding roda como
 * convidado primeiro (dado só no aparelho, AsyncStorage → localStorage no
 * navegador); a conta é criada depois, pelo cartão "Criar conta e salvar" no
 * Dashboard. A ponte de migração em App.js (NativeMain) sobe os dados do
 * convidado para o Supabase assim que a conta nova aparece sem perfil.
 *
 * Exige o projeto Supabase de TESTE configurado em .env.test.local, com
 * confirmação de e-mail DESLIGADA (cria uma conta nova a cada execução,
 * e-mail gerado com timestamp — não precisa de seed).
 */
test('convidado completa onboarding e migra os dados ao criar conta', async ({ page }) => {
    const name = 'Migração E2E';
    await completeGuestOnboarding(page, { name });

    await expect(page.getByTestId('guest-create-account-button')).toBeVisible();
    await page.getByTestId('guest-create-account-button').click();

    // O cartão abre a tela de login já em modo cadastro.

    const email = newSignupEmail();
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-password-input').fill(SIGNUP_PASSWORD);
    await page.getByTestId('login-submit-button').click();

    // A migração roda assim que currentUser aparece (useEffect em NativeMain);
    // o nome deve continuar visível vindo agora do Supabase, não do localStorage.
    await expect(page.getByText(`Oi, ${name}!`, { exact: false })).toBeVisible({ timeout: 15_000 });

    const guestDataAfter = await page.evaluate(() => localStorage.getItem('mounjoy_guest_user'));
    expect(guestDataAfter).toBeNull();

    // Reload comprova que o dado persistiu no backend, não só em memória.
    await page.reload();
    await expect(page.getByText(`Oi, ${name}!`, { exact: false })).toBeVisible({ timeout: 15_000 });
});
