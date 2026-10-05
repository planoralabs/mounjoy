import { test, expect } from '@playwright/test';
import { completeGuestOnboarding } from './helpers.js';

test('registrar uma nova aplicação soma ao histórico de doses', async ({ page }) => {
    await completeGuestOnboarding(page);

    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('mounjoy_guest_user')));
    const doseCountBefore = before.doseHistory.length;

    await page.getByTestId('injection-open-button').click();
    await expect(page.getByText('Registrar aplicação')).toBeVisible();

    await page.getByTestId('body-map-confirm-button').click();

    await expect(async () => {
        const after = await page.evaluate(() => JSON.parse(localStorage.getItem('mounjoy_guest_user')));
        expect(after.doseHistory.length).toBe(doseCountBefore + 1);
    }).toPass({ timeout: 10_000 });
});
