import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that Jarvis logo/title is visible
    await expect(page.locator('text=JARVIS')).toBeVisible();
    
    // Check system status indicator
    await expect(page.locator('text=SYSTEM STATUS')).toBeVisible();
  });

  test('should navigate to all modules', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to Logs
    await page.click('text=Logs');
    await expect(page).toHaveURL('/logs');
    
    // Navigate to Tâches
    await page.click('text=Tâches');
    await expect(page).toHaveURL('/tasks');
    
    // Navigate to Hardware
    await page.click('text=Hardware');
    await expect(page).toHaveURL('/hardware');
    
    // Navigate to Calendrier
    await page.click('text=Calendrier');
    await expect(page).toHaveURL('/calendar');
    
    // Navigate to Connaissances
    await page.click('text=Connaissances');
    await expect(page).toHaveURL('/knowledge');
    
    // Navigate back to Dialogue
    await page.click('text=Dialogue');
    await expect(page).toHaveURL('/');
  });

  test('should show sidebar navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check all navigation items are present
    const navItems = [
      'Dialogue',
      'Dashboard',
      'Logs',
      'Tâches',
      'Hardware',
      'Calendrier',
      'Connaissances',
    ];
    
    for (const item of navItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible();
    }
  });
});
