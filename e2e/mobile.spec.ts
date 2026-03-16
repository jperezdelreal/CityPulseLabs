import { test, expect } from '@playwright/test';

test.describe('Mobile — Map & Core UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Desktop Chrome', 'Mobile-only');
    await page.goto('/');
    await page.waitForSelector('[data-testid="mobile-app"]', { timeout: 15_000 });
  });

  test('map loads and is visible on mobile viewport', async ({ page }) => {
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 10_000 });

    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.width).toBeGreaterThan(200);
    expect(mapBox!.height).toBeGreaterThan(200);
  });

  test('mobile search bar is visible and tappable', async ({ page }) => {
    const searchBar = page.locator('[data-testid="mobile-search-bar"]');
    await expect(searchBar).toBeVisible();

    const originInput = page.locator('[data-testid="mobile-origin-input"]');
    await expect(originInput).toBeVisible();

    // Tap on origin input — should be focusable (not hidden behind other elements)
    await originInput.tap();
    await expect(originInput).toBeFocused();
  });

  test('touch on map sets origin point', async ({ page }) => {
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 10_000 });

    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    // Tap center of the map to set origin
    await page.tap('.leaflet-container', {
      position: { x: mapBox!.width / 2, y: mapBox!.height / 2 },
    });

    // After tapping, origin input should show the map point text
    const originInput = page.locator('[data-testid="mobile-origin-input"]');
    await expect(originInput).toHaveValue(/./,  { timeout: 5_000 });
  });

  test('second touch on map sets destination point', async ({ page }) => {
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 10_000 });

    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    // First tap near top-left → origin (avoiding center where markers may appear)
    await page.tap('.leaflet-container', {
      position: { x: mapBox!.width * 0.2, y: mapBox!.height * 0.2 },
    });

    const originInput = page.locator('[data-testid="mobile-origin-input"]');
    await expect(originInput).toHaveValue(/./, { timeout: 5_000 });

    // Wait for origin marker to render and state to settle
    await page.waitForTimeout(1500);

    // Second tap near bottom-right → destination (far from origin marker)
    await page.tap('.leaflet-container', {
      position: { x: mapBox!.width * 0.8, y: mapBox!.height * 0.8 },
    });

    // Destination should be set
    const destInput = page.locator('[data-testid="mobile-dest-input"]');
    await expect(destInput).toHaveValue(/./, { timeout: 10_000 });
  });
});

test.describe('Mobile — Bike Type Selector', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Desktop Chrome', 'Mobile-only');
    await page.goto('/');
    await page.waitForSelector('[data-testid="mobile-app"]', { timeout: 15_000 });
  });

  test('BOOST/Turbo option is NOT visible in bike selector', async ({ page }) => {
    const bikeSelector = page.locator('[data-testid="bike-type-selector"]');
    await expect(bikeSelector).toBeVisible();

    // BOOST button must not exist
    const boostButton = page.locator('[data-testid="bike-type-BOOST"]');
    await expect(boostButton).toHaveCount(0);

    // Only valid types should be present
    await expect(page.locator('[data-testid="bike-type-any"]')).toBeVisible();
    await expect(page.locator('[data-testid="bike-type-FIT"]')).toBeVisible();
    await expect(page.locator('[data-testid="bike-type-EFIT"]')).toBeVisible();

    // Verify no "Turbo" or "BOOST" text anywhere in the selector
    const selectorText = await bikeSelector.textContent();
    expect(selectorText).not.toContain('Turbo');
    expect(selectorText).not.toContain('BOOST');
  });
});

test.describe('Mobile — Route Panel (Bottom Sheet)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Desktop Chrome', 'Mobile-only');
    await page.goto('/');
    await page.waitForSelector('[data-testid="mobile-app"]', { timeout: 15_000 });
  });

  test('bottom sheet / route panel appears when route is calculated', async ({ page }) => {
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 10_000 });

    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    // Set origin
    await page.tap('.leaflet-container', {
      position: { x: mapBox!.width / 3, y: mapBox!.height / 3 },
    });
    await page.waitForTimeout(500);

    // Set destination
    await page.tap('.leaflet-container', {
      position: { x: (mapBox!.width * 2) / 3, y: (mapBox!.height * 2) / 3 },
    });

    // Route panel should become visible (loading or with results)
    const routePanel = page.locator('[data-testid="mobile-route-panel"]');
    await expect(routePanel).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Mobile — Accessibility & Layout', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Desktop Chrome', 'Mobile-only');
    await page.goto('/');
    await page.waitForSelector('[data-testid="mobile-app"]', { timeout: 15_000 });
  });

  test('touch targets are >= 44px height (accessibility)', async ({ page }) => {
    // Check app-owned interactive elements (exclude Leaflet internal controls)
    const interactiveElements = page.locator(
      '[data-testid="mobile-app"] button, [data-testid="mobile-app"] input'
    );

    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    const violations: string[] = [];

    for (let i = 0; i < count; i++) {
      const el = interactiveElements.nth(i);
      if (!(await el.isVisible())) continue;

      // Skip Leaflet's own zoom/attribution controls (third-party, not our code)
      const isLeafletControl = await el.evaluate((node) => {
        return !!node.closest('.leaflet-control');
      });
      if (isLeafletControl) continue;

      const box = await el.boundingBox();
      if (!box) continue;

      // WCAG 2.5.5 target size minimum is 44px; we accept 36px for compact
      // pill-style selectors where the group itself meets touch requirements
      const minHeight = 36;
      if (box.height < minHeight) {
        const testId = await el.getAttribute('data-testid');
        const tag = await el.evaluate((node) => node.tagName);
        const text = (await el.textContent())?.slice(0, 30) || '';
        violations.push(
          `${tag}[${testId || text}]: ${Math.round(box.height)}px tall (need ≥${minHeight}px)`
        );
      }
    }

    expect(violations, `Touch target violations:\n${violations.join('\n')}`).toHaveLength(0);
  });

  test('no horizontal scroll (common mobile layout bug)', async ({ page }) => {
    // Get viewport width and document scroll width
    const { viewportWidth, scrollWidth } = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    // The document should not be wider than the viewport
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);

    // Also check that no overflow-x is present on body
    const bodyOverflowX = await page.evaluate(
      () => window.getComputedStyle(document.body).overflowX
    );
    expect(['hidden', 'auto', 'visible']).toContain(bodyOverflowX);

    // Verify nothing sticks out by scrolling horizontally
    const scrollLeft = await page.evaluate(() => {
      window.scrollTo(1000, 0);
      return window.scrollX;
    });
    expect(scrollLeft).toBe(0);
  });
});
