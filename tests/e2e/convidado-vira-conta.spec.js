import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers.js';
import { newSignupEmail, SIGNUP_PASSWORD } from './fixtures.js';

// Sem .env.test.local o app usaria o Supabase de PRODUÇÃO — pula.
test.skip(!process.env.MOUNJOY_E2E_TEST_ENV, 'exige .env.test.local (projeto Supabase de teste)');

/**
 * Enquanto o login não é obrigatório, o botão "Continuar" da tela de entrada
 * guarda os dados só no aparelho (AsyncStorage → localStorage no navegador).
 * Quem depois cria uma conta na tela de entrada leva esses dados junto: a
 * ponte de migração em App.js (NativeMain) sobe os dados locais para o
 * Supabase assim que a conta nova aparece sem perfil.
 *
 * Exige o projeto Supabase de TESTE configurado em .env.test.local, com
 * confirmação de e-mail DESLIGADA (cria uma conta nova a cada execução,
 * e-mail gerado com timestamp — não precisa de seed).
 */
test('dados do "Continuar" migram para a conta criada depois', async ({ page }) => {
    const name = 'Migração E2E';
    await completeGuestOnboarding(page, { name });

    // Sai da sessão local (os dados continuam no aparelho) e volta à entrada.
    await page.getByTestId('tab-profile').click();
    await page.getByTestId('profile-logout-button').click();
    await expect(page.getByTestId('welcome-screen')).toBeVisible();

    await page.getByTestId('login-toggle-mode').click();
    const email = newSignupEmail();
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-password-input').fill(SIGNUP_PASSWORD);
    await page.getByTestId('login-submit-button').click();

    // A migração roda assim que currentUser aparece (useEffect em NativeMain);
    // o nome deve continuar visível vindo agora do Supabase, não do localStorage.
    await expect(page.getByText(`Oi, ${name}!`, { exact: false })).toBeVisible({ timeout: 15_000 });

    const localDataAfter = await page.evaluate(() => localStorage.getItem('mounjoy_guest_user'));
    expect(localDataAfter).toBeNull();

    // Reload comprova que o dado persistiu no backend, não só em memória.
    await page.reload();
    await expect(page.getByText(`Oi, ${name}!`, { exact: false })).toBeVisible({ timeout: 15_000 });
});
