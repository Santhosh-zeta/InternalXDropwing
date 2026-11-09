#!/usr/bin/env node
/**
 * End-to-end smoke test of the real, built app in a real browser (Playwright + Chromium).
 *
 *   # 1. start the app on demo data (see README "End-to-end smoke test"):
 *   #      DEMO_PASSWORD='...' ./scripts/dev.sh --demo        (logs to your terminal; tee it to a file)
 *   # 2. run:
 *   BASE_URL=http://localhost:5000 SERVER_LOG=/path/to/server.log DEMO_PASSWORD='...' node frontend/e2e/smoke.mjs
 *
 * Environment:
 *   BASE_URL       app origin (default http://localhost:5000)
 *   SERVER_LOG     the server's log file. Sign-in codes are read from it: without SMTP the server prints
 *                  "OTP for <email>: 123456" (development only)
 *   DEMO_PASSWORD  password of the demo accounts created by backend/scripts/seed-demo.js
 *   SHOTS_DIR      where screenshots go (default ./e2e-shots)
 *   SKIP_WALK=1 / SKIP_FLOWS=1   run only one half (debugging)
 *
 * It walks every menu view as L1, L3, L5, L7 and L9 at 1440px and 390px (no console errors, no failed
 * requests, no horizontal overflow, a heading), then exercises the main flows (task, hours, approval,
 * chat isolation between ventures, documents, invite + accept, search, assistant, notifications, logout).
 * Exit code 0 only when everything passed. Needs: npm i --no-save playwright && npx playwright install chromium
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const LOG = process.env.SERVER_LOG;
const PASSWORD = process.env.DEMO_PASSWORD;
const SHOTS = path.resolve(process.env.SHOTS_DIR || './e2e-shots');
const DOMAIN = 'demo.internalx.test';
if (!PASSWORD) { console.error('Set DEMO_PASSWORD (the password printed by seed-demo.js).'); process.exit(2); }
if (!LOG) { console.error('Set SERVER_LOG to the server log file (sign-in codes are read from it).'); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

const USERS = { l1: 'l1', l3: 'dd.l3', l5: 'dd.l5', l7: 'dd.l7', l9: 'dd.client' };
const VIEWPORTS = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }];
const RUN = Date.now().toString(36);

const results = []; // { name, ok, detail }
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};
let debugPages = []; // pages screenshotted when a step fails
const step = async (name, fn) => {
  try { await fn(); record(name, true); } catch (e) {
    record(name, false, String(e.message || e).split('\n')[0].slice(0, 400));
    for (const [i, p] of debugPages.entries()) {
      await p.screenshot({ path: path.join(SHOTS, `FAIL-${name.replace(/\W+/g, '_').slice(0, 60)}-${i}.png`) }).catch(() => {});
    }
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ── problem collector ────────────────────────────────────────
/** Attach to a page; returns { take(): problems since last take }. */
const watch = (page, label) => {
  let problems = [];
  const add = (p) => problems.push(`[${label}] ${p}`);
  page.on('pageerror', (e) => add(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (t.startsWith('Failed to load resource')) return; // reported precisely by the response listener
    add(`console.error: ${t.slice(0, 200)}`);
  });
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText || '';
    if (why.includes('ERR_ABORTED')) return; // navigations / cancelled fetches
    add(`request failed: ${r.method()} ${r.url()} ${why}`);
  });
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.startsWith(BASE) || r.status() < 400) return;
    const body = await r.text().then((t) => t.slice(0, 160)).catch(() => '');
    add(`HTTP ${r.status()} ${r.request().method()} ${u.replace(BASE, '')} ${body}`);
  });
  return { take: () => { const p = problems; problems = []; return p; } };
};

// ── sign-in ──────────────────────────────────────────────────
const readLogFrom = (offset) => fs.readFileSync(LOG, 'utf8').slice(offset);
const waitForOtp = async (email, offset) => {
  for (let i = 0; i < 60; i += 1) {
    const hits = [...readLogFrom(offset).matchAll(new RegExp(`OTP for ${email.replace(/[.+]/g, '\\$&')}: (\\d{6})`, 'g'))];
    if (hits.length) return hits[hits.length - 1][1];
    await sleep(250);
  }
  throw new Error(`no sign-in code for ${email} appeared in ${LOG}`);
};

const signIn = async (page, email, password) => {
  await page.goto(`${BASE}/login/`);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  const offset = fs.statSync(LOG).size;
  await page.getByRole('button', { name: /sign in|continue|log in/i }).first().click();
  const otp = await waitForOtp(email, offset);
  await page.getByLabel('6-Digit OTP').fill(otp);
  await page.getByRole('button', { name: /verify|sign in|continue|log in/i }).last().click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await settled(page);
};

/** Wait until the page has stopped loading (network quiet, no skeleton/busy region). */
const settled = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 }).catch(() => {});
  await sleep(150);
};

const newSession = async (browser, key, viewport = VIEWPORTS[0]) => {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const w = watch(page, key);
  const email = key.includes('@') ? key : `${USERS[key] || key}@${DOMAIN}`;
  await signIn(page, email, PASSWORD);
  return { context, page, w, email };
};

// ── layout checks ────────────────────────────────────────────
const noOverflow = async (page) => {
  const o = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    if (sw <= cw + 1) return { sw, cw, culprits: [] };
    // Elements that stick out of the viewport and are not inside their own horizontal scroller.
    const scrolls = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true; } return false; };
    const culprits = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > cw + 1 && !scrolls(el) && getComputedStyle(el).position !== 'fixed')
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
    return { sw, cw, culprits };
  });
  assert(o.sw <= o.cw + 1, `horizontal overflow: scrollWidth ${o.sw} > ${o.cw} (${o.culprits.join('; ')})`);
};

const openNav = async (page, mobile) => {
  if (mobile) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    return page.locator('#mobile-nav-drawer nav[aria-label="Main navigation"]');
  }
  return page.locator('aside nav[aria-label="Main navigation"]');
};

const menuLabels = async (page, mobile) => {
  const nav = await openNav(page, mobile);
  const labels = await nav.locator('button').allInnerTexts();
  if (mobile) await page.getByRole('button', { name: 'Close navigation menu' }).click();
  return labels.map((l) => l.trim());
};

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });

/** Open each menu entry from the sidebar (drawer on phones) and check it. */
const walkViews = async (browser, key) => {
  for (const vp of VIEWPORTS) {
    const mobile = vp.width < 1024;
    const s = await newSession(browser, key, vp);
    const { page, w } = s;
    s.w.take();
    const labels = await menuLabels(page, mobile);
    assert(labels.length > 0, 'empty menu');
    for (const label of labels) {
      await step(`walk ${key} @${vp.name}: ${label}`, async () => {
        const nav = await openNav(page, mobile);
        await nav.getByRole('button', { name: label, exact: true }).click();
        await settled(page);
        const h1 = (await page.locator('main h1').first().innerText()).trim();
        assert(h1 === label, `heading "${h1}" != menu label "${label}"`);
        await noOverflow(page);
        const body = await page.locator('main').innerText();
        assert(!/something went wrong|application error|unexpected error/i.test(body), 'error boundary shown');
        await shot(page, `${key}-${vp.name}-${label.replace(/\W+/g, '_')}`);
        const problems = w.take();
        assert(problems.length === 0, problems.join(' | '));
      });
    }
    await s.context.close();
  }
};

// ── flows ────────────────────────────────────────────────────
const go = async (page, label, mobile = false) => {
  const nav = await openNav(page, mobile);
  await nav.getByRole('button', { name: label, exact: true }).click();
  await settled(page);
};
const expectClean = (w, ignore = []) => {
  const p = w.take().filter((x) => !ignore.some((i) => x.includes(i)));
  assert(p.length === 0, p.join(' | '));
};

const flows = async (browser) => {
  const l5 = await newSession(browser, 'l5');
  const l7 = await newSession(browser, 'l7');
  const fx7 = await newSession(browser, 'fx.l7'); // another venture
  const l1 = await newSession(browser, 'l1');
  debugPages = [l5.page, l7.page, fx7.page, l1.page];
  const taskTitle = `E2E task ${RUN}`;
  const note = `E2E timesheet ${RUN}`;
  const chatText = `E2E hello dropwing ${RUN}`;

  await step('L5 creates a task', async () => {
    await go(l5.page, 'Tasks');
    await l5.page.getByRole('button', { name: 'New task' }).first().click();
    await l5.page.getByLabel('Title').fill(taskTitle);
    await l5.page.getByRole('checkbox', { name: 'Dropwing L7', exact: true }).check();
    await l5.page.getByRole('button', { name: 'Create task' }).click();
    await l5.page.getByText(taskTitle).first().waitFor({ timeout: 8000 });
    expectClean(l5.w);
  });

  await step('L7 logs hours', async () => {
    await go(l7.page, 'Timesheets');
    await l7.page.getByLabel('Hours').fill('2.5');
    await l7.page.getByLabel('Notes').fill(note);
    await l7.page.getByRole('button', { name: 'Submit', exact: true }).click();
    await l7.page.getByText(note).first().waitFor({ timeout: 8000 });
    expectClean(l7.w);
  });

  await step('L5 approves the timesheet', async () => {
    await go(l5.page, 'Approvals');
    const row = l5.page.getByRole('row').filter({ hasText: note });
    await row.getByRole('button', { name: /^Approve/ }).click();
    await row.waitFor({ state: 'detached', timeout: 8000 }); // leaves the pending queue
    await settled(l5.page);
    expectClean(l5.w);
  });

  await step('chat: venture message reaches its venture, not another', async () => {
    // Open each person's own venture channel (the default channel is the company-wide Global HQ).
    for (const [s, venture] of [[l7, 'Dropwing Design Studio'], [fx7, 'Fenixa Solutions'], [l5, 'Dropwing Design Studio']]) {
      await go(s.page, 'Team Chat');
      await s.page.getByRole('navigation', { name: 'Conversations' }).getByRole('button', { name: new RegExp(`^${venture}`) }).click();
    }
    const box = l7.page.getByPlaceholder(/^Message #/);
    await box.waitFor({ timeout: 8000 });
    await box.fill(chatText);
    await l7.page.getByRole('button', { name: /^Send message to/ }).click();
    await l7.page.getByText(chatText).first().waitFor({ timeout: 8000 });
    await l5.page.getByText(chatText).first().waitFor({ timeout: 8000 }); // positive control: same venture, live
    await sleep(2500);
    assert((await fx7.page.getByText(chatText).count()) === 0, 'other venture user received the message live');
    // and not through the API either: the other venture's channel is refused outright, theirs does not contain it
    const ddVenture = (await (await l5.context.request.get(`${BASE}/api/chat/channels`)).json()).data.ventures[0].id;
    const denied = await fx7.context.request.get(`${BASE}/api/chat/messages?ventureId=${ddVenture}`);
    assert(denied.status() === 403, `other venture's channel answered ${denied.status()}, expected 403`);
    const fxChannels = (await (await fx7.context.request.get(`${BASE}/api/chat/channels`)).json()).data.ventures;
    assert(fxChannels.every((v) => v.id !== ddVenture), 'other venture lists this venture as a channel');
    for (const ch of [...fxChannels.map((v) => v.id), 'global']) {
      const r = await fx7.context.request.get(`${BASE}/api/chat/messages?ventureId=${ch}`);
      assert(!(await r.text()).includes(chatText), 'other venture can read the message via the API');
    }
    await fx7.page.reload();
    await settled(fx7.page);
    assert((await fx7.page.getByText(chatText).count()) === 0, 'other venture sees the message after reload');
    expectClean(l7.w); expectClean(fx7.w); expectClean(l5.w);
  });

  await step('documents: upload then download', async () => {
    await go(l5.page, 'Documents');
    const name = `e2e-${RUN}.txt`;
    await l5.page.locator('#documents-file-input').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(`hello ${RUN}`) });
    await l5.page.getByText(name).first().waitFor({ timeout: 10000 });
    const [popup] = await Promise.all([
      l5.page.waitForEvent('popup'),
      l5.page.getByRole('button', { name: `Download ${name}` }).click(),
    ]);
    await popup.waitForURL(/\/uploads\//, { timeout: 8000 });
    const href = popup.url();
    await popup.close();
    const r = await l5.context.request.get(href);
    assert(r.status() === 200, `download status ${r.status()}`);
    assert((await r.text()).includes(`hello ${RUN}`), 'downloaded content differs');
    expectClean(l5.w);
  });

  await step('documents: L1 uploads company-wide', async () => {
    await go(l1.page, 'Documents');
    const name = `e2e-wide-${RUN}.txt`;
    const select = l1.page.getByLabel('Upload to', { exact: true });
    assert((await select.inputValue()) === 'company', 'default target is not company-wide');
    await l1.page.locator('#documents-file-input').setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from('wide') });
    await l1.page.getByText(name).first().waitFor({ timeout: 10000 });
    await select.selectOption({ label: 'Fenixa Solutions' });
    const name2 = `e2e-fx-${RUN}.txt`;
    await l1.page.locator('#documents-file-input').setInputFiles({ name: name2, mimeType: 'text/plain', buffer: Buffer.from('fx') });
    await l1.page.getByText(name2).first().waitFor({ timeout: 10000 });
    expectClean(l1.w);
  });

  await step('L1 invites a user; the invitee accepts via the link and signs in', async () => {
    await go(l1.page, 'User Management');
    await l1.page.getByRole('button', { name: 'Add member' }).first().click();
    const email = `e2e.${RUN}@${DOMAIN}`;
    const dlg = l1.page.getByRole('dialog');
    await dlg.getByLabel(/^Full name/).fill(`E2E Invitee ${RUN}`);
    await dlg.getByLabel(/^Email/).fill(email);
    const level = dlg.getByLabel('Access level');
    await level.selectOption({ index: 5 }); // some venture-scoped level
    const venture = dlg.getByLabel('Venture');
    if (await venture.isEnabled()) await venture.selectOption({ index: 1 });
    await l1.page.getByRole('button', { name: 'Send invite' }).click();
    const link = await l1.page.getByRole('textbox', { name: 'Invite link' }).inputValue();
    assert(/\/reset-password\/?\?token=/.test(link), `unexpected invite link ${link.slice(0, 40)}`);
    await l1.page.getByRole('button', { name: 'Done' }).click();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page, 'invitee');
    await page.goto(link);
    const pw = `Inv-${RUN}-Zz9!x`;
    await page.getByLabel(/^New password|^Password/i).first().fill(pw);
    const confirm = page.getByLabel(/confirm/i).first();
    if (await confirm.count()) await confirm.fill(pw);
    await page.getByRole('button', { name: /set|reset|save|activate|continue/i }).last().click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await signIn(page, email, pw);
    await shot(page, 'invitee-dashboard');
    expectClean(w);
    await ctx.close();
  });

  await step('Ctrl+K search opens, finds the task, closes', async () => {
    await go(l5.page, 'Today');
    await l5.page.keyboard.press('Control+k');
    const box = l5.page.getByRole('combobox', { name: /search/i });
    await box.waitFor({ timeout: 5000 });
    await box.fill('E2E task');
    await l5.page.getByRole('option').first().waitFor({ timeout: 8000 });
    await shot(l5.page, 'search-palette');
    await l5.page.keyboard.press('Escape');
    await box.waitFor({ state: 'detached', timeout: 5000 });
    expectClean(l5.w);
  });

  await step('Ask InternalX shows the not-configured state (L1 sees how to enable it)', async () => {
    await l1.page.getByRole('button', { name: 'Ask InternalX' }).first().click();
    await l1.page.getByText(/ANTHROPIC_API_KEY/).first().waitFor({ timeout: 8000 });
    await shot(l1.page, 'assistant-not-configured');
    await l1.page.getByRole('button', { name: 'Close assistant' }).click();
    await go(l5.page, 'Ask InternalX');
    await l5.page.getByText(/not set up yet/i).waitFor({ timeout: 8000 }); // staff: the state, without the admin hint
    assert((await l5.page.getByText(/ANTHROPIC_API_KEY/).count()) === 0, 'staff see the admin-only setup hint');
    expectClean(l1.w); expectClean(l5.w);
  });

  await step('Settings > System: L1 sees the self-check, L5 does not', async () => {
    await go(l1.page, 'Settings');
    await l1.page.getByRole('tab', { name: 'System' }).click();
    await l1.page.getByText('Session signing key').waitFor({ timeout: 8000 });
    await settled(l1.page);
    const text = await l1.page.locator('main').innerText();
    assert(/Email \(SMTP\)/.test(text) && /Fix:/.test(text), 'self-check content missing');
    await shot(l1.page, 'settings-system');
    await go(l5.page, 'Settings');
    assert((await l5.page.getByRole('tab', { name: 'System' }).count()) === 0, 'L5 sees the System tab');
    expectClean(l1.w); expectClean(l5.w);
  });

  await step('notification bell opens', async () => {
    await l5.page.getByRole('button', { name: /^Notifications/ }).click();
    await l5.page.getByRole('dialog', { name: 'Notifications' }).waitFor({ timeout: 5000 });
    await shot(l5.page, 'notifications');
    await l5.page.keyboard.press('Escape');
    expectClean(l5.w);
  });

  await step('logout returns to sign-in and the session is dead', async () => {
    await l5.page.getByRole('button', { name: 'Sign out' }).first().click();
    await l5.page.waitForURL(/\/login/, { timeout: 8000 });
    const me = await l5.context.request.get(`${BASE}/api/auth/me`);
    assert(me.status() === 401, `/auth/me after logout is ${me.status()}`);
    l5.w.take();
  });

  for (const s of [l5, l7, fx7, l1]) await s.context.close();
};

// ── main ─────────────────────────────────────────────────────
const main = async () => {
  const browser = await chromium.launch();
  try {
    // SKIP_WALK=1 / SKIP_FLOWS=1: iterate on one half while debugging.
    if (!process.env.SKIP_WALK) for (const key of Object.keys(USERS)) await walkViews(browser, key);
    if (!process.env.SKIP_FLOWS) await flows(browser);
  } catch (e) {
    record('harness', false, String(e.stack || e).split('\n').slice(0, 3).join(' '));
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${SHOTS}`);
  if (failed.length) { console.log('\nFailures:'); failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`)); }
  process.exit(failed.length ? 1 : 0);
};
main();
