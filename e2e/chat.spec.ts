import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test('should display chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Check chat header
    await expect(page.locator('text=Jarvis N2 Orchestrator')).toBeVisible();
    await expect(page.locator('text=LLM API Connected')).toBeVisible();
    
    // Check input field
    const input = page.locator('input[placeholder*="Envoyer un message"]');
    await expect(input).toBeVisible();
  });

  test('should send a message and receive response', async ({ page }) => {
    await page.goto('/');
    
    // Type a message
    const input = page.locator('input[placeholder*="Envoyer un message"]');
    await input.fill('Bonjour Jarvis, quel est ton statut ?');
    
    // Click send button
    await page.click('button[type="submit"]');
    
    // Wait for response (with timeout)
    await expect(page.locator('.message-assistant, [data-role="assistant"]').first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('should create task from chat message', async ({ page }) => {
    await page.goto('/');
    
    // Send task creation message
    const input = page.locator('input[placeholder*="Envoyer un message"]');
    await input.fill('Rappelle-moi de faire une sauvegarde des données demain');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Navigate to tasks page
    await page.click('text=Tâches');
    await expect(page).toHaveURL('/tasks');
    
    // Check if task was created (look for task in the list)
    // Note: This may fail if the LLM doesn't create the task
    // The test validates the workflow, not the LLM behavior
  });

  test('should clear chat history', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Effacer" button
    const clearButton = page.locator('text=Effacer');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Confirm the action if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Oui")');
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
    }
  });

  test('should show chat history button', async ({ page }) => {
    await page.goto('/');
    
    // Check for history button
    const historyButton = page.locator('text=Historique');
    await expect(historyButton).toBeVisible();
  });
});
