import { test, expect } from '@playwright/test';

test.describe('routing & branding', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('unauthenticated user is redirected from settings', async ({ page }) => {
    await page.goto('/settings');
    // PrivateRoute shows "Loading..." until persist hydrates + initAuth finishes without tokens
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('registration flow (needs running API)', () => {
  test('sign up with email then open settings profile', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Your name').fill('E2E User');
    await page.locator('input[type="password"]').nth(0).fill('secret12');
    await page.locator('input[type="password"]').nth(1).fill('secret12');
    await page.getByRole('button', { name: /create account/i }).click();

    // Must be app root only — `/login` and `/register` also contain "/"
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 30_000 });

    // zustand/persist writes async; full page load must see tokens in localStorage
    await page.waitForFunction(
      () => {
        try {
          const raw = localStorage.getItem('auth-storage');
          return Boolean(raw && raw.includes('accessToken'));
        } catch {
          return false;
        }
      },
      { timeout: 15_000 }
    );

    await page.goto('/settings');
    // PrivateRoute waits for hydration + GET /users/me — wait for profile form
    const displayName = page.getByTestId('settings-display-name');
    await expect(displayName).toBeVisible({ timeout: 20_000 });
    await expect(displayName).toHaveValue('E2E User');

    await displayName.fill('E2E User Updated');
    await page.getByTestId('save-profile').click();
    await expect(page.getByTestId('save-success')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('chat composer (needs running API + Bubble_Bot seed)', () => {
  test('DM with Bubble_Bot: type message and send with Enter', async ({ page }) => {
    const email = `e2e-msg-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Your name').fill('E2E Chat');
    await page.locator('input[type="password"]').nth(0).fill('secret12');
    await page.locator('input[type="password"]').nth(1).fill('secret12');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 30_000 });
    await page.waitForFunction(
      () => {
        try {
          const raw = localStorage.getItem('auth-storage');
          return Boolean(raw && raw.includes('accessToken'));
        } catch {
          return false;
        }
      },
      { timeout: 15_000 }
    );

    await page.getByRole('button', { name: 'New Message' }).click();
    await page.getByPlaceholder('Search users...').fill('Bubble');
    const bubbleRow = page.getByRole('button', { name: /Bubble_Bot/ });
    await expect(bubbleRow).toBeVisible({ timeout: 20_000 });
    await bubbleRow.click();

    await expect(page).toHaveURL(/\/chat\//, { timeout: 20_000 });

    const composer = page.getByPlaceholder('Message');
    await expect(composer).toBeVisible({ timeout: 20_000 });
    await composer.fill('e2e tab enter send');
    await composer.press('Enter');

    // Text appears in the thread and in the sidebar preview (two nodes) — assert the bubble copy.
    await expect(
      page.locator('p.whitespace-pre-wrap').filter({ hasText: 'e2e tab enter send' })
    ).toBeVisible({ timeout: 20_000 });
  });
});
