import { test, expect } from '@playwright/test';

test.describe('Player Flow', () => {
  let roomId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a room for players to join
    const page = await browser.newPage();
    await page.goto('/host');
    await page.getByPlaceholder('Enter Room Name').fill('Player Test Room');
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();
    
    const roomCodeElement = page.locator('p.text-7xl');
    await roomCodeElement.waitFor();
    roomId = (await roomCodeElement.textContent()) || '';
    await page.close();
  });

  test('should join room successfully', async ({ page }) => {
    await page.goto(`/play/${roomId}`);

    // Enter player name
    await page.getByPlaceholder('Enter your name').fill('Test Player');
    
    // Join room
    await page.getByRole('button', { name: 'JOIN PARTY' }).click();

    // Verify joined - should see bingo card
    await expect(page.locator('.glass:has-text("FREE")')).toBeVisible();
    
    // Verify room name displayed
    await expect(page.getByText('Player Test Room')).toBeVisible();
  });

  test('should display player name and status', async ({ page }) => {
    await page.goto(`/play/${roomId}`);

    await page.getByPlaceholder('Enter your name').fill('Status Test Player');
    await page.getByRole('button', { name: 'JOIN PARTY' }).click();

    // Wait for card to load
    await page.waitForSelector('text=FREE');

    // Verify player name is displayed
    await expect(page.getByText('Status Test Player')).toBeVisible();
    
    // Verify status is shown
    await expect(page.getByText('WAITING')).toBeVisible();
  });

  test('should save player data to localStorage', async ({ page }) => {
    await page.goto(`/play/${roomId}`);

    await page.getByPlaceholder('Enter your name').fill('LocalStorage Test');
    await page.getByRole('button', { name: 'JOIN PARTY' }).click();

    // Wait for join to complete
    await page.waitForSelector('text=FREE');

    // Check localStorage
    const playerName = await page.evaluate(() => localStorage.getItem('bingo_name'));
    const playerId = await page.evaluate(() => localStorage.getItem('bingo_player_id'));
    const savedRoomId = await page.evaluate(() => localStorage.getItem('bingo_room_id'));

    expect(playerName).toBe('LocalStorage Test');
    expect(playerId).toBeTruthy();
    expect(savedRoomId).toBe(roomId);
  });
});
