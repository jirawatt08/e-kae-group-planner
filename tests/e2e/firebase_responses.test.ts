import { test, expect } from '@playwright/test';

test.describe('Firebase Response Capture', () => {
  test('should capture raw success and error responses from Firestore', async ({ page }) => {
    // Enable ultra-detailed browser log forwarding
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type().toUpperCase()}]: ${msg.text()}`);
    });

    // 1. Success Case
    console.log('--- STARTING SUCCESS CASE (OWNER) ---');
    await page.goto('/');
    await page.locator('#test-login').click();
    await expect(page).toHaveURL('/');
    
    await page.getByRole('button', { name: /new trip/i }).click();
    const tripName = `Response Test ${Date.now()}`;
    await page.getByPlaceholder(/trip name/i).fill(tripName);
    await page.getByRole('button', { name: /create trip/i }).click();
    
    await expect(page).toHaveURL(/\/trip\//, { timeout: 15000 });
    const tripUrl = page.url();
    const tripId = tripUrl.split('/').pop()?.split('?')[0] || '';
    
    await page.getByRole('tab', { name: /members/i }).click();
    console.log(`TEST: Attempting update on Trip ${tripId} as OWNER...`);
    
    // Call service directly and log results from INSIDE the browser
    await page.evaluate(async (tid) => {
      // @ts-ignore
      const { tripService } = await import('/src/services/tripService.ts');
      console.log('DEBUG: Browser starting owner toggle...');
      try {
        await tripService.toggleJoinCode(tid, false);
        console.log('DEBUG: FIREBASE_SUCCESS: Update successful');
      } catch (e: any) {
        console.log(`DEBUG: FIREBASE_RAW_ERROR: ${JSON.stringify({
          code: e.code,
          message: e.message,
          name: e.name
        })}`);
      }
    }, tripId);

    // 2. Unauthorized Case
    console.log('\n--- STARTING FAILURE CASE (UNAUTHORIZED) ---');
    await page.goto('/');
    await page.locator('button:has(.lucide-log-out)').click();
    await page.locator('#test-login').click(); // New anonymous user
    
    await page.goto(tripUrl);
    console.log(`TEST: Attempting update on Trip ${tripId} as UNAUTHORIZED user...`);
    
    await page.evaluate(async (tid) => {
      // @ts-ignore
      const { tripService } = await import('/src/services/tripService.ts');
      console.log('DEBUG: Browser starting unauthorized toggle...');
      try {
        await tripService.toggleJoinCode(tid, true);
        console.log('DEBUG: FIREBASE_SUCCESS (UNEXPECTED): Update successful');
      } catch (e: any) {
        console.log(`DEBUG: FIREBASE_RAW_ERROR: ${JSON.stringify({
          code: e.code,
          message: e.message,
          name: e.name
        })}`);
      }
    }, tripId);

    await page.waitForTimeout(2000);
    console.log('--- COMPLETED RESPONSE CAPTURE ---');
  });
});
