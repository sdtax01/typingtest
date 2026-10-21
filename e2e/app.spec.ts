import { expect, test, type Page } from '@playwright/test';

const SAMPLE = 'माझे नाव मराठी टायपिंग चाचणी आहे. महाराष्ट्र ही संतांची आणि वीरांची भूमी आहे.';
const INTRO = 'माझे नाव राज आहे. मी पुण्यात राहतो. मला मराठी टायपिंग शिकायला आवडते. रोज सराव केला की वेग वाढतो आणि चुका कमी होतात.';

async function startPractice(page: Page, minutes = '1 मि') {
  await page.goto('/configure?mode=practice');
  await page.getByRole('button', { name: minutes, exact: true }).click();
  await page.getByRole('button', { name: /टेस्ट सुरू करा/ }).click();
  await expect(page).toHaveURL(/\/test$/);
}

test.describe('configuration and typing', () => {
  test('configure → passage renders → Unicode is preserved → results shown and persisted', async ({ page }) => {
    await startPractice(page);
    await expect(page.getByTestId('reference')).toHaveText(INTRO);
    const ta = page.getByTestId('typing-area');
    await ta.fill(INTRO);
    await expect(ta).toHaveValue(INTRO); // exact Unicode round trip, no rewriting
    await page.getByTestId('finish').click();
    await expect(page).toHaveURL(/\/results\//);
    await expect(page.getByText('उत्तीर्ण · Passed')).toBeVisible();
    await expect(page.getByText('100.00%')).toBeVisible();
    const url = page.url();
    await page.reload(); // persistence
    await expect(page).toHaveURL(url);
    await expect(page.getByText('उत्तीर्ण · Passed')).toBeVisible();
  });

  test('errors are classified: one wrong matra is one substitution', async ({ page }) => {
    await startPractice(page);
    await page.getByTestId('typing-area').fill(INTRO.replace('पुण्यात', 'पुण्यत'));
    await page.getByTestId('finish').click();
    await expect(page).toHaveURL(/\/results\//);
    await expect(page.locator('.diff-sub, .diff-missing, .diff-extra').first()).toBeVisible();
    await expect(page.getByText(/एकूण चुका \(Error count\):/)).toBeVisible();
  });

  test('timer expiry ends the test and records reason "expired"', async ({ page }) => {
    await page.clock.install();
    await startPractice(page);
    await page.getByTestId('typing-area').fill('माझे नाव');
    await page.clock.fastForward(61_000);
    await expect(page).toHaveURL(/\/results\//, { timeout: 10_000 });
    await expect(page.getByText(/वेळ संपली/).first()).toBeVisible();
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('mtt.attempts.v1')!)[0]);
    expect(rec.finishReason).toBe('expired');
    expect(rec.elapsedMs).toBe(60000);
  });

  test('exam mode: paste is blocked and nothing is inserted', async ({ page }) => {
    await page.goto('/configure?mode=exam');
    await page.getByRole('button', { name: /टेस्ट सुरू करा/ }).click();
    const ta = page.getByTestId('typing-area');
    await ta.focus();
    await page.evaluate(() => {
      const el = document.querySelector<HTMLTextAreaElement>('[data-testid=typing-area]')!;
      const dt = new DataTransfer();
      dt.setData('text/plain', 'चिकटवलेला मजकूर');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(ta).toHaveValue('');
  });

  test('anonymous practice needs no account and appears in history', async ({ page }) => {
    await startPractice(page);
    await page.getByTestId('typing-area').fill(INTRO);
    await page.getByTestId('finish').click();
    await page.goto('/history');
    await expect(page.getByRole('table')).toContainText('ओळख आणि सराव');
    await expect(page.getByRole('link', { name: /Login|लॉगिन/ })).toHaveCount(0); // no auth UI in local mode
  });

  test('completion mode finishes automatically when the passage is fully typed', async ({ page }) => {
    await page.goto('/configure?mode=practice');
    await page.getByLabel(/उतारा पूर्ण होईपर्यंत/).check();
    await page.getByRole('button', { name: /टेस्ट सुरू करा/ }).click();
    await page.getByTestId('typing-area').fill(INTRO);
    await expect(page).toHaveURL(/\/results\//);
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('mtt.attempts.v1')!)[0]);
    expect(rec.finishReason).toBe('completed');
  });
});

test.describe('ISM V6 diagnostic page', () => {
  test('shows received text, code points and 100% match for the sample sentence', async ({ page }) => {
    await page.goto('/ism-setup');
    await expect(page.getByTestId('sample')).toHaveText(SAMPLE);
    await expect(page.getByTestId('diag-match')).toHaveText('—');
    await page.getByTestId('diag-input').fill(SAMPLE);
    await expect(page.getByTestId('diag-preview')).toHaveText(SAMPLE);
    await expect(page.getByTestId('diag-match')).toHaveText('100%');
    await expect(page.getByTestId('diag-codepoints').locator('li').first()).toContainText('U+');
  });

  test('warns on Latin-only input and on replacement characters', async ({ page }) => {
    await page.goto('/ism-setup');
    await page.getByTestId('diag-input').fill('maze nav');
    await expect(page.getByText(/एकही देवनागरी अक्षर नाही/)).toBeVisible();
    await page.getByTestId('diag-input').fill('म�');
    await expect(page.getByText(/U\+FFFD/).first()).toBeVisible();
  });

  test('"mark as working" is only possible after a clean match, and updates the home indicator', async ({ page }) => {
    await page.goto('/ism-setup');
    const mark = page.getByRole('button', { name: /या ब्राउझरमध्ये चालते म्हणून नोंदवा/ });
    await expect(mark).toBeDisabled();
    await page.getByTestId('diag-input').fill(SAMPLE);
    await expect(mark).toBeEnabled();
    await mark.click();
    await page.goto('/');
    await expect(page.getByTestId('compat-indicator')).toContainText('ISM इनपुट तपासणी यशस्वी');
  });

  test('page never claims it can detect ISM or Scroll Lock', async ({ page }) => {
    await page.goto('/ism-setup');
    await expect(page.getByText(/ओळखू शकत नाही/)).toBeVisible();
  });
});

test.describe('authorization (local mode)', () => {
  test('/admin redirects non-admin visitors home', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
  });
});

for (const [name, width, height] of [['mobile', 375, 740], ['tablet', 768, 1000], ['desktop', 1280, 800]] as const) {
  test(`responsive: no horizontal overflow (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const path of ['/', '/configure', '/ism-setup', '/history']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} @${width}`).toBeLessThanOrEqual(0);
    }
    await startPractice(page);
    await page.getByTestId('typing-area').fill(INTRO.slice(0, 30));
    await page.getByTestId('finish').click();
    await expect(page).toHaveURL(/\/results\//);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `results @${width}`).toBeLessThanOrEqual(0);
  });
}
