import { expect } from '@playwright/test';

/**
 * Completa o wizard de onboarding do app Expo (rodando no navegador via
 * `npm run web`) como convidado (sem login), do zero até o Dashboard.
 * Reaproveitado por toda spec que só precisa de um usuário pronto — evita
 * repetir os 7 passos em cada teste.
 *
 * Peso, altura e meta são sliders: o teste mantém os valores padrão
 * (80 kg, 1,70 m, meta 70 kg).
 */
export async function completeGuestOnboarding(page, { name = 'Visitante Teste' } = {}) {
    await page.goto('/');
    await page.getByTestId('landing-start-button').click();
    await expect(page.getByTestId('onboarding-screen')).toBeVisible();

    const next = page.getByTestId('onboarding-next-button');

    await next.click(); // 0 (boas-vindas) -> 1

    await page.getByTestId('onboarding-name-input').fill(name);
    await next.click(); // 1 (nome) -> 2

    await page.getByTestId('onboarding-unit-metric').click();
    await next.click(); // 2 (unidades) -> 3

    await next.click(); // 3 (peso/altura, padrões) -> 4
    await next.click(); // 4 (meta, padrão) -> 5

    await page.getByTestId('onboarding-substance-Semaglutida').click();
    await page.getByTestId('onboarding-medication-ozempic').click();
    await next.click(); // 5 (medicamento) -> 6

    await page.getByTestId('onboarding-dose-0.5 mg').click();
    await page.getByTestId('onboarding-day-Segunda').click();
    await next.click(); // 6 (dose e dia) -> finaliza

    await expect(page.getByTestId('main-app-screen')).toBeVisible();
}

/** Lê os dados do convidado salvos no aparelho (localStorage no navegador). */
export async function readGuestData(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem('mounjoy_guest_user')));
}
