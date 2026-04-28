import { test, expect } from '@playwright/test';

test.describe('Trip Join Code Toggle Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Enable browser log forwarding
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('DEBUG:')) {
        console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Login and create a trip
    await page.goto('/');
    await page.locator('#test-login').click();
    await expect(page).toHaveURL('/');
    
    await page.getByRole('button', { name: /new trip/i }).click();
    const tripName = `Persistence Test ${Date.now()}`;
    await page.getByPlaceholder(/trip name/i).fill(tripName);
    await page.getByRole('button', { name: /create trip/i }).click();
    
    await expect(page).toHaveURL(/\/trip\//, { timeout: 15000 });
  });

  test('should successfully disable the join code and persist after reload', async ({ page }) => {
    await page.getByRole('tab', { name: /members/i }).click();
    const toggleLabel = page.locator('label[for="join-toggle"]');
    const checkbox = page.locator('#join-toggle');

    // 1. Ensure it starts enabled (checked)
    await expect(checkbox).toBeChecked({ timeout: 10000 });

    // 2. Disable it
    console.log('TEST: Disabling join code...');
    await toggleLabel.click();
    
    // 3. Verify visual UI update immediately
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByText(/join by code is currently disabled/i)).toBeVisible();

    // 4. PERSISTENCE CHECK: Reload the page
    console.log('TEST: Reloading to check persistence...');
    await page.reload();
    await page.getByRole('tab', { name: /members/i }).click();
    await expect(page.locator('#join-toggle')).not.toBeChecked({ timeout: 10000 });
    await expect(page.getByText(/join by code is currently disabled/i)).toBeVisible();
    console.log('TEST: Disable persisted successfully');
  });

  test('should successfully enable the join code and persist after reload', async ({ page }) => {
    await page.getByRole('tab', { name: /members/i }).click();
    const toggleLabel = page.locator('label[for="join-toggle"]');
    const checkbox = page.locator('#join-toggle');

    // 1. Disable first
    console.log('TEST: Preparing test by disabling join code...');
    await toggleLabel.click();
    await expect(checkbox).not.toBeChecked();

    // 2. Enable it back
    console.log('TEST: Enabling join code...');
    await toggleLabel.click();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('h3', { hasText: /invite code/i })).toBeVisible();

    // 3. PERSISTENCE CHECK: Reload the page
    console.log('TEST: Reloading to check persistence...');
    await page.reload();
    await page.getByRole('tab', { name: /members/i }).click();
    await expect(page.locator('#join-toggle')).toBeChecked({ timeout: 10000 });
    await expect(page.locator('h3', { hasText: /invite code/i })).toBeVisible();
    console.log('TEST: Enable persisted successfully');
  });
});
