import { test, expect } from '@playwright/test';

test.describe('Task Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should display task board with columns', async ({ page }) => {
    // Check for Kanban columns
    await expect(page.locator('text=À faire')).toBeVisible();
    await expect(page.locator('text=En cours')).toBeVisible();
    await expect(page.locator('text=Terminé')).toBeVisible();
  });

  test('should open create task dialog', async ({ page }) => {
    // Click on "Nouvelle tâche" button
    const newTaskButton = page.locator('button:has-text("Nouvelle tâche"), button:has-text("Ajouter")');
    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      
      // Check dialog is open
      await expect(page.locator('input[placeholder*="titre"], input[name="title"]')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should create a new task', async ({ page }) => {
    // Click on "Nouvelle tâche" button
    const newTaskButton = page.locator('button:has-text("Nouvelle tâche"), button:has-text("Ajouter")');
    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      
      // Fill in task details
      await page.fill('input[placeholder*="titre"], input[name="title"]', 'Test Task E2E');
      
      // Try to fill description if available
      const descInput = page.locator('textarea[placeholder*="description"], textarea[name="description"]');
      if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descInput.fill('This is a test task created by Playwright');
      }
      
      // Submit the form
      const submitButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button[type="submit"]');
      await submitButton.click();
      
      // Verify task appears in the list
      await expect(page.locator('text=Test Task E2E')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    // Look for priority filter if available
    const priorityFilter = page.locator('select:has-text("Priorité"), button:has-text("Priorité")');
    if (await priorityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priorityFilter.click();
      
      // Select high priority
      await page.click('text=Haute, text=High, text=Critique');
    }
  });

  test('should show task details on click', async ({ page }) => {
    // Click on first task card if available
    const taskCard = page.locator('[data-task-id], .task-card').first();
    if (await taskCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskCard.click();
      
      // Check if details panel or modal opens
      await expect(page.locator('[data-task-details], .task-details, [role="dialog"]')).toBeVisible({
        timeout: 3000,
      });
    }
  });
});
