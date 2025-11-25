import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  let roomId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a room for admin to monitor
    const page = await browser.newPage();
    await page.goto('/host');
    await page.getByPlaceholder('Enter Room Name').fill('Admin Test Room');
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();
    
    const roomCodeElement = page.locator('p.text-7xl');
    await roomCodeElement.waitFor();
    roomId = (await roomCodeElement.textContent()) || '';
    await page.close();
  });

  test('should access admin panel', async ({ page }) => {
    await page.goto(`/admin/${roomId}`);

    // Verify admin panel loaded
    await expect(page.getByText('Admin Panel')).toBeVisible();
    await expect(page.getByText('Admin Test Room')).toBeVisible();
  });

  test('should display stats correctly', async ({ page }) => {
    await page.goto(`/admin/${roomId}`);

    // Verify stats boxes are present
    await expect(page.getByText('Total Players')).toBeVisible();
    await expect(page.getByText('Reach')).toBeVisible();
    await expect(page.getByText('Bingo!')).toBeVisible();

    // All counts should show numbers
    const statsNumbers = page.locator('p.text-4xl');
    expect(await statsNumbers.count()).toBeGreaterThanOrEqual(3);
  });

  test('should toggle between list and grid views', async ({ page }) => {
    await page.goto(`/admin/${roomId}`);

    // Click Grid View button
    await page.getByRole('button', { name: 'Grid View' }).click();

    // Verify grid view button is active (has gradient background)
    const gridButton = page.getByRole('button', { name: 'Grid View' });
    await expect(gridButton).toHaveClass(/from-bingo-gold/);

    // Click List View button
    await page.getByRole('button', { name: 'List View' }).click();

    // Verify list view button is active
    const listButton = page.getByRole('button', { name: 'List View' });
    await expect(listButton).toHaveClass(/from-bingo-gold/);
  });

  test('should display player list in list view', async ({ page }) => {
    // First, join as a player
    const playerPage = await page.context().newPage();
    await playerPage.goto(`/play/${roomId}`);
    await playerPage.getByPlaceholder('Enter your name').fill('Admin View Player');
    await playerPage.getByRole('button', { name: 'JOIN PARTY' }).click();
    await playerPage.waitForSelector('text=FREE');

    // Now check admin panel
    await page.goto(`/admin/${roomId}`);

    // Ensure List View is selected
    await page.getByRole('button', { name: 'List View' }).click();

    // Wait for player list to update
    await page.waitForTimeout(1000);

    // Verify player appears in list
    await expect(page.getByText('Admin View Player')).toBeVisible();
    await expect(page.getByText('Playing')).toBeVisible();

    await playerPage.close();
  });

  test('should display player cards in grid view', async ({ page }) => {
    // Join as a player first
    const playerPage = await page.context().newPage();
    await playerPage.goto(`/play/${roomId}`);
    await playerPage.getByPlaceholder('Enter your name').fill('Grid View Player');
    await playerPage.getByRole('button', { name: 'JOIN PARTY' }).click();
    await playerPage.waitForSelector('text=FREE');

    // Check admin panel grid view
    await page.goto(`/admin/${roomId}`);
    await page.getByRole('button', { name: 'Grid View' }).click();

    // Wait for grid to load
    await page.waitForTimeout(1000);

    // Verify player card is displayed
    await expect(page.getByText('Grid View Player')).toBeVisible();
    
    // Verify bingo card grid exists
    const card = page.locator('.grid-cols-5').first();
    await expect(card).toBeVisible();

    await playerPage.close();
  });
});
