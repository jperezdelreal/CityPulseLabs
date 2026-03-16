import { test, expect } from '@playwright/test';

test.describe('Desktop — Core Layout', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'Desktop-only');
    await page.goto('/');
    await page.waitForSelector('[data-testid="desktop-app"]', { timeout: 15_000 });
  });

  test('side panel is visible (not bottom sheet)', async ({ page }) => {
    // Desktop uses UnifiedPanel as a side panel, not a bottom sheet
    const desktopApp = page.locator('[data-testid="desktop-app"]');
    await expect(desktopApp).toBeVisible();

    // The desktop layout should use a flex-row for side panel
    const layout = desktopApp.locator('.flex-row');
    await expect(layout).toBeVisible();

    // Mobile route panel (bottom sheet) should NOT exist in desktop
    const mobileRoutePanel = page.locator('[data-testid="mobile-route-panel"]');
    await expect(mobileRoutePanel).toHaveCount(0);

    // Mobile search bar should NOT exist in desktop
    const mobileSearchBar = page.locator('[data-testid="mobile-search-bar"]');
    await expect(mobileSearchBar).toHaveCount(0);
  });

  test('banner text does not disappear on button click', async ({ page }) => {
    // Verify header is visible with BiciCoruña branding
    const header = page.locator('[data-testid="desktop-app"] header');
    await expect(header).toBeVisible();

    const brandText = header.locator('text=BiciCoruña');
    await expect(brandText).toBeVisible();

    // Click a bike type button in the header
    const bikeSelector = page.locator('[data-testid="bike-type-selector"]');
    await expect(bikeSelector).toBeVisible();

    const fitButton = page.locator('[data-testid="bike-type-FIT"]');
    await fitButton.click();

    // After clicking, the banner text must still be visible
    await expect(brandText).toBeVisible();

    // Click another bike type
    const efitButton = page.locator('[data-testid="bike-type-EFIT"]');
    await efitButton.click();

    // Brand text must still remain
    await expect(brandText).toBeVisible();
  });
});
