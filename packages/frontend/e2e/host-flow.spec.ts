import { test, expect } from '@playwright/test';

test.describe('Host Flow', () => {
  test('should create room with name and display it', async ({ page }) => {
    await page.goto('/host');

    // Enter room name
    await page.getByPlaceholder('Enter Room Name').fill('E2E Test Room');
    
    // Create room
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();

    // Wait for room creation
    await page.waitForSelector('text=E2E Test Room');

    // Verify room code is displayed
    const roomCodeElement = page.locator('p.text-7xl');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.textContent();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Verify room name is displayed
    await expect(page.getByText('E2E Test Room')).toBeVisible();
  });

  test('should start game', async ({ page }) => {
    await page.goto('/host');

    // Create room
    await page.getByPlaceholder('Enter Room Name').fill('Start Game Test');
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();

    // Wait for room creation
    await page.waitForSelector('button:has-text("START GAME")');

    // Start game
    await page.getByRole('button', { name: 'START GAME' }).click();

    // Verify game started - should show DRAW NUMBER button
    await expect(page.getByRole('button', { name: 'DRAW NUMBER' })).toBeVisible();
  });

  test('should draw number with animation', async ({ page }) => {
    await page.goto('/host');

    // Create and start game
    await page.getByPlaceholder('Enter Room Name').fill('Draw Number Test');
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();
    await page.waitForSelector('button:has-text("START GAME")');
    await page.getByRole('button', { name: 'START GAME' }).click();

    // Draw number
    const drawButton = page.getByRole('button', { name: 'DRAW NUMBER' });
    await expect(drawButton).toBeVisible();
    await drawButton.click();

    // Verify button shows SPINNING state
    await expect(page.getByRole('button', { name: 'SPINNING...' })).toBeVisible();

    // Wait for number to be drawn (2 second delay + processing)
    await page.waitForTimeout(2500);

    // Verify a number is displayed (1-75)
    const numberElement = page.locator('text=/^[1-9][0-9]?$|^75$/').first();
    await expect(numberElement).toBeVisible();

    // Verify drawn number appears in history
    await expect(page.locator('.glass:has-text("Drawn Numbers") >> div')).toHaveCount({ timeout: 5000 });
  });

  test('should display player stats', async ({ page }) => {
    await page.goto('/host');

    // Create and start game
    await page.getByPlaceholder('Enter Room Name').fill('Stats Test');
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();
    await page.waitForSelector('button:has-text("START GAME")');
    await page.getByRole('button', { name: 'START GAME' }).click();

    // Verify stats are displayed
    await expect(page.getByText('Players')).toBeVisible();
    await expect(page.getByText('Reach')).toBeVisible();
    await expect(page.getByText('Bingo!')).toBeVisible();

    // Initial counts should be 0
    const reachCount = page.locator('text=Reach').locator('..').locator('p.text-4xl');
    const bingoCount = page.locator('text=Bingo!').locator('..').locator('p.text-4xl');
    
    await expect(reachCount).toHaveText('0');
    await expect(bingoCount).toHaveText('0');
  });
});
