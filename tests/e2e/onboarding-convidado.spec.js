import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers.js';

test('Continuar sem login faz o onboarding e chega à tela Hoje', async ({ page }) => {
    await completeGuestOnboarding(page, { name: 'Visitante Teste' });

    await expect(page.getByText('Oi, Visitante Teste!', { exact: false })).toBeVisible();

    const guestData = await page.evaluate(() => localStorage.getItem('mounjoy_guest_user'));
    expect(guestData).not.toBeNull();
    const parsed = JSON.parse(guestData);
    expect(parsed.name).toBe('Visitante Teste');
    expect(parsed.medicationId).toBe('ozempic');
    expect(parsed.currentDose).toBe('0.5 mg');

    // Os dados do convidado sobrevivem a um reload (ficam no aparelho).
    await page.reload();
    await expect(page.getByText('Oi, Visitante Teste!', { exact: false })).toBeVisible();
});
