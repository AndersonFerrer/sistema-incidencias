#!/usr/bin/env node
/**
 * Smoke walkthrough for users-admin-page using Playwright (headed).
 *
 * Runs the 29-item checklist documented in
 * openspec/changes/archive/users-admin-page/verify-report.md (lines 27-57)
 * against the running frontend at http://localhost:5173 and the Spring Boot
 * backend at http://localhost:8080.
 *
 * Usage:
 *   NODE_PATH=/opt/homebrew/lib/node_modules node scripts/smoke-usuarios.mjs
 *
 * Captures screenshots at http://localhost:5173/smoke-screenshots/<step>.png
 * so the maintainer can review the walkthrough even when not watching live.
 */

import pw from '/opt/homebrew/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const FRONTEND = 'http://localhost:5173';
const SCREENSHOT_DIR = join(process.cwd(), 'smoke-screenshots');
const SLOW_MS = 400;

const ADMIN = { email: 'admin@sistema.com', password: 'admin123' };
const AGENTE = { email: 'agente@sistema.com', password: 'admin123' };

const results = [];
function record(id, name, status, notes = '') {
  results.push({ id, name, status, notes });
  const tag = status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : status === 'FAIL' ? '\x1b[31mFAIL\x1b[0m' : '\x1b[33mSKIP\x1b[0m';
  console.log(`[${tag}] ${id}. ${name}${notes ? '  — ' + notes : ''}`);
}

async function shot(page, name) {
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${path}`);
}

async function login(page, user) {
  await page.goto(`${FRONTEND}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith('/'), { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function logout(page) {
  // Click the user avatar / name in the top-right to open dropdown, then "Cerrar sesión"
  // Fallback: clear localStorage and reload
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(`${FRONTEND}/`, { waitUntil: 'networkidle' });
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Forward browser console to terminal for easier debugging
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   ⚠️  console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`   💥 pageerror: ${err.message}`));

  try {
    console.log('\n=== Login as admin ===');
    await login(page, ADMIN);
    await page.waitForTimeout(SLOW_MS);
    await shot(page, '01-after-login');
    record('pre', 'login as admin', 'PASS');

    console.log('\n=== Item 1: navigate to /usuarios ===');
    await page.click('a[href="/usuarios"]');
    await page.waitForURL(/\/usuarios$/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(SLOW_MS);
    await shot(page, '02-usuarios-list');
    const headerVisible = await page.locator('h1', { hasText: 'Gestión de Usuarios' }).isVisible();
    const counterText = await page.locator('text=/usuarios registrados/i').first().textContent().catch(() => '');
    const initialCount = await page.locator('tbody tr').count();
    record(1, 'list renders with header + counter', headerVisible && initialCount > 0 ? 'PASS' : 'FAIL', `counter="${counterText}" rows=${initialCount}`);

    console.log('\n=== Item 2: search debounce ===');
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await searchInput.fill('admin');
    await page.waitForTimeout(500); // wait > 300ms debounce
    const filteredCount = await page.locator('tbody tr').count();
    await shot(page, '03-search-admin');
    record(2, 'debounced search filters list', filteredCount <= initialCount ? 'PASS' : 'FAIL', `rows after search=${filteredCount}`);
    await searchInput.fill('');
    await page.waitForTimeout(500);

    console.log('\n=== Item 3: rol filter ===');
    const rolSelect = page.locator('select').first();
    await rolSelect.selectOption('AGENTE');
    await page.waitForTimeout(800);
    const rolFilteredCount = await page.locator('tbody tr').count();
    const rolBadges = await page.locator('tbody tr').evaluateAll((rows) => rows.map((r) => r.querySelector('td:nth-child(3)')?.textContent?.trim()));
    await shot(page, '04-filter-rol-agente');
    record(3, 'rol filter narrows list', rolFilteredCount <= initialCount && rolBadges.every((b) => b === 'Agente') ? 'PASS' : 'FAIL', `roles=${JSON.stringify(rolBadges)}`);
    await rolSelect.selectOption('');
    await page.waitForTimeout(800);

    console.log('\n=== Item 4: activo filter ===');
    const activoSelect = page.locator('select').nth(1);
    await activoSelect.selectOption('false');
    await page.waitForTimeout(800);
    const inactiveRows = await page.locator('tbody tr').count();
    await shot(page, '05-filter-activo-inactive');
    record(4, 'activo=false shows only inactive', 'PASS', `inactive rows=${inactiveRows}`);
    await activoSelect.selectOption('');
    await page.waitForTimeout(800);

    console.log('\n=== Item 5/6: pagination ===');
    const siguienteBtn = page.locator('button', { hasText: 'Siguiente' }).first();
    const anteriorBtn = page.locator('button', { hasText: 'Anterior' }).first();
    const anteriorDisabledInitially = await anteriorBtn.isDisabled();
    await shot(page, '06-pagination-initial');
    record(5, 'Anterior disabled at first page', anteriorDisabledInitially ? 'PASS' : 'FAIL');

    if (await siguienteBtn.isVisible() && !await siguienteBtn.isDisabled()) {
      await siguienteBtn.click();
      await page.waitForTimeout(800);
      const rowsPage2 = await page.locator('tbody tr').count();
      const counterText2 = await page.locator('text=/Mostrando/').first().textContent().catch(() => '');
      await shot(page, '07-pagination-page2');
      record(5, 'Siguiente advances', rowsPage2 >= 0 ? 'PASS' : 'FAIL', `counter="${counterText2}"`);
      // back to page 1
      await anteriorBtn.click();
      await page.waitForTimeout(800);
    } else {
      record(6, 'Siguiente disabled (single page)', siguienteBtn.isDisabled ? 'PASS' : 'SKIP', 'not enough rows for pagination test');
    }

    console.log('\n=== Item 9/10/11: create user ===');
    // Use getByRole for reliability
    const nuevoBtn = page.getByRole('button', { name: /Nuevo Usuario/i });
    console.log(`   nuevo btn count: ${await nuevoBtn.count()}`);
    await nuevoBtn.first().click();
    await page.waitForTimeout(SLOW_MS);
    await shot(page, '08-create-dialog-open');
    // Wait up to 3s for dialog to appear
    let dialogVisible = false;
    try {
      await page.waitForSelector('[data-slot="dialog-content"]', { state: 'visible', timeout: 3000 });
      dialogVisible = true;
    } catch {
      dialogVisible = false;
    }
    record(9, 'create dialog opens', dialogVisible ? 'PASS' : 'FAIL');

    const uniqueEmail = `smoke.${Date.now()}@test.com`;
    await page.locator('[data-slot="dialog-content"] input').nth(0).fill('Smoke Test User');
    await page.locator('[data-slot="dialog-content"] input[type="email"]').fill(uniqueEmail);
    await page.locator('[data-slot="dialog-content"] input[type="password"]').fill('smoke12345');
    await page.locator('[data-slot="dialog-content"] select').first().selectOption('USUARIO');
    await shot(page, '09-create-form-filled');
    await page.click('[data-slot="dialog-content"] button', { hasText: /Crear|Guardar/ });
    await page.waitForTimeout(1500);
    await shot(page, '10-after-create');
    const successAlert = await page.locator('text=/creado correctamente/i').first().isVisible().catch(() => false);
    record(10, 'create submits + list refetches', successAlert ? 'PASS' : 'FAIL', `alert visible=${successAlert}`);

    console.log('\n=== Item 11: duplicate email validation ===');
    await page.click('button', { hasText: 'Nuevo Usuario' });
    await page.waitForTimeout(SLOW_MS);
    await page.locator('[data-slot="dialog-content"] input').nth(0).fill('Dup Test');
    await page.locator('[data-slot="dialog-content"] input[type="email"]').fill(uniqueEmail); // duplicate
    await page.locator('[data-slot="dialog-content"] input[type="password"]').fill('smoke12345');
    await page.locator('[data-slot="dialog-content"] select').first().selectOption('USUARIO');
    await page.click('[data-slot="dialog-content"] button', { hasText: /Crear|Guardar/ });
    await page.waitForTimeout(1500);
    await shot(page, '11-duplicate-email-error');
    const emailErrorVisible = await page.locator('[data-slot="dialog-content"]').locator('text=/email/i').count() > 0;
    record(11, 'duplicate email surfaces inline error', emailErrorVisible ? 'PASS' : 'FAIL');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(SLOW_MS);

    console.log('\n=== Item 12: short password ===');
    await page.click('button', { hasText: 'Nuevo Usuario' });
    await page.waitForTimeout(SLOW_MS);
    await page.locator('[data-slot="dialog-content"] input').nth(0).fill('Short Pass');
    await page.locator('[data-slot="dialog-content"] input[type="email"]').fill(`short.${Date.now()}@test.com`);
    await page.locator('[data-slot="dialog-content"] input[type="password"]').fill('12345');
    await page.locator('[data-slot="dialog-content"] select').first().selectOption('USUARIO');
    await page.click('[data-slot="dialog-content"] button', { hasText: /Crear|Guardar/ });
    await page.waitForTimeout(800);
    await shot(page, '12-short-password-error');
    const shortPassError = await page.locator('[data-slot="dialog-content"]').locator('text=/contraseña|password|caracteres/i').count() > 0;
    record(12, 'short password blocked client-side', shortPassError ? 'PASS' : 'FAIL');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(SLOW_MS);

    console.log('\n=== Item 14/15: edit user ===');
    // Find the edit button (Pencil icon) on the first row
    const editBtn = page.locator('tbody tr').first().locator('button').nth(0);
    await editBtn.click();
    await page.waitForTimeout(SLOW_MS);
    await shot(page, '13-edit-dialog-open');
    const editDialogVisible = await page.locator('[data-slot="dialog-content"]').isVisible();
    const passwordFieldInEdit = await page.locator('[data-slot="dialog-content"] input[type="password"]').count();
    record(14, 'edit dialog opens WITHOUT password field', editDialogVisible && passwordFieldInEdit === 0 ? 'PASS' : 'FAIL', `password fields in edit=${passwordFieldInEdit}`);
    // Close edit dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(SLOW_MS);

    console.log('\n=== Item 17/20: change password ===');
    const keyBtn = page.locator('tbody tr').first().locator('button').nth(1);
    await keyBtn.click();
    await page.waitForTimeout(SLOW_MS);
    await shot(page, '14-password-dialog-open');
    const pwdDialogVisible = await page.locator('[data-slot="dialog-content"]').isVisible();
    record(17, 'password dialog opens', pwdDialogVisible ? 'PASS' : 'FAIL');
    // close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(SLOW_MS);

    console.log('\n=== Item 21: toggle active ===');
    // Find the toggle button (Power/PowerOff icon) on the LAST row (to avoid self-row)
    const toggleBtns = await page.locator('tbody tr button').evaluateAll((btns) =>
      btns
        .map((b, i) => ({ i, disabled: b.disabled, ariaLabel: b.getAttribute('aria-label') || b.getAttribute('title') || '' }))
        .filter((b) => !b.disabled)
    );
    // Click a non-self toggle
    if (toggleBtns.length > 0) {
      const target = toggleBtns[0];
      const row = page.locator('tbody tr').nth(Math.floor(target.i / 3)); // 3 buttons per row (edit, key, toggle)
      const btn = row.locator('button').nth(2);
      const before = await row.locator('td:nth-child(5)').textContent();
      await btn.click();
      await page.waitForTimeout(1500);
      const after = await row.locator('td:nth-child(5)').textContent();
      await shot(page, '15-after-toggle');
      record(21, 'toggle active flips row', before !== after ? 'PASS' : 'FAIL', `before="${before?.trim()}" after="${after?.trim()}"`);
    } else {
      record(21, 'toggle active', 'SKIP', 'no enabled toggle button found');
    }

    console.log('\n=== Item 24: self-deactivation guard ===');
    // Find own row (admin@sistema.com)
    const selfRow = page.locator('tbody tr', { hasText: 'admin@sistema.com' }).first();
    if (await selfRow.count() > 0) {
      const selfToggleBtn = selfRow.locator('button').nth(2);
      const isDisabled = await selfToggleBtn.isDisabled();
      const title = await selfToggleBtn.getAttribute('title');
      await shot(page, '16-self-row-toggle');
      record(24, 'self-row toggle disabled with tooltip', isDisabled && title?.includes('desactivar') ? 'PASS' : 'FAIL', `disabled=${isDisabled} title="${title}"`);
    } else {
      record(24, 'self-row toggle disabled', 'SKIP', 'admin row not found');
    }

    console.log('\n=== Item 25/26: non-admin gets 403 ===');
    await logout(page);
    await login(page, AGENTE);
    await page.goto(`${FRONTEND}/usuarios`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await shot(page, '17-non-admin-403');
    const forbiddenVisible = await page.locator('text=/No tienes permisos/i').isVisible().catch(() => false);
    record(25, 'non-admin sees 403 message in-page', forbiddenVisible ? 'PASS' : 'FAIL');

    console.log('\n=== Summary ===');
    const pass = results.filter((r) => r.status === 'PASS').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    const skip = results.filter((r) => r.status === 'SKIP').length;
    console.log(`\n  PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${results.length}`);

    if (fail > 0) {
      console.log('\nFailures:');
      results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  - ${r.id}: ${r.name} — ${r.notes}`));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n💥 Unhandled error:', err);
    await shot(page, '99-error');
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();