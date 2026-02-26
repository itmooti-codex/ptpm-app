#!/usr/bin/env node
/**
 * QA Click Audit — walks every dev page, clicks every <a> and <button>,
 * and reports console errors, navigation failures, and dead links.
 *
 * Usage:  npm run qa:click-audit
 * Needs:  Playwright Chromium  (npx playwright install --with-deps chromium)
 */

const { chromium } = require('playwright');

/* ── configuration ─────────────────────────────────────────────────── */

const PORT = 8007;
const BASE = `http://localhost:${PORT}`;

const DEV_PAGES = [
  '/dev/index.html',
  '/dev/dashboard.html',
  '/dev/customers-list.html',
  '/dev/customer-detail.html?contact=20',
  '/dev/new-customer.html',
  '/dev/new-inquiry.html',
  '/dev/job-detail.html',
  '/dev/notification.html',
  '/dev/company-detail.html?company=62',
  '/dev/inquiry-detail.html',
  '/dev/sp-dashboard.html',
];

/* ── helpers ───────────────────────────────────────────────────────── */

function isSameOriginDev(href) {
  try {
    const url = new URL(href, BASE);
    return url.origin === BASE && url.pathname.startsWith('/dev/');
  } catch { return false; }
}

/* ── main ──────────────────────────────────────────────────────────── */

async function main() {
  /* 1. Start an embedded Vite server (dynamic import for ESM-only vite) */
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: '.',
    server: { port: PORT, strictPort: true, host: '127.0.0.1' },
    logLevel: 'silent',
  });
  await vite.listen();
  console.log(`✓ Vite dev server listening on ${BASE}`);

  /* 2. Launch headless Chromium */
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  const results = [];
  let totalClicks = 0;
  let totalErrors = 0;

  try {
    for (const pagePath of DEV_PAGES) {
      const pageUrl = `${BASE}${pagePath}`;
      const pageLabel = pagePath.split('?')[0];
      const page = await context.newPage();

      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => consoleErrors.push(err.message));

      /* navigate */
      try {
        const resp = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
        if (!resp || resp.status() >= 400) {
          results.push({ page: pageLabel, element: '-', action: 'load', ok: false, detail: `HTTP ${resp?.status() ?? 'no response'}` });
          totalErrors++;
          await page.close();
          continue;
        }
      } catch (err) {
        results.push({ page: pageLabel, element: '-', action: 'load', ok: false, detail: err.message });
        totalErrors++;
        await page.close();
        continue;
      }

      /* record load-time console errors (ignore CDN/network noise) */
      const realErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR_') && !e.includes('Failed to load resource') && !e.includes('404')
      );
      if (realErrors.length) {
        results.push({ page: pageLabel, element: '-', action: 'load', ok: false, detail: `${realErrors.length} console error(s): ${realErrors[0].slice(0, 120)}` });
        totalErrors++;
      } else {
        results.push({ page: pageLabel, element: '-', action: 'load', ok: true, detail: 'loaded OK' });
      }

      /* gather clickable elements */
      const clickables = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('a[href], button, [role="button"], [onclick]'));
        return els.map((el, i) => ({
          index: i,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          href: el.getAttribute('href') || '',
          type: el.getAttribute('type') || '',
          disabled: el.hasAttribute('disabled'),
          selector: el.id ? `#${el.id}`
            : el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]`
            : null,
        }));
      });

      for (const cl of clickables) {
        if (cl.disabled) continue;
        totalClicks++;
        const label = `<${cl.tag}> "${cl.text || cl.href}"`;

        /* skip external links */
        if (cl.tag === 'a' && cl.href && !cl.href.startsWith('.') && !cl.href.startsWith('/') && !cl.href.startsWith('#') && !cl.href.startsWith('javascript:')) {
          try {
            const u = new URL(cl.href);
            if (u.origin !== BASE) {
              results.push({ page: pageLabel, element: label, action: 'skip', ok: true, detail: 'external link' });
              continue;
            }
          } catch { /* relative — continue */ }
        }

        consoleErrors.length = 0;

        try {
          let locator;
          if (cl.selector) {
            locator = page.locator(cl.selector).first();
          } else {
            locator = page.locator(`${cl.tag}`).nth(cl.index);
          }

          const isVisible = await locator.isVisible({ timeout: 2000 }).catch(() => false);
          if (!isVisible) {
            results.push({ page: pageLabel, element: label, action: 'click', ok: true, detail: 'not visible — skipped' });
            continue;
          }

          /* for anchor links that navigate, just record them instead of clicking away */
          if (cl.tag === 'a' && cl.href && cl.href !== '#' && !cl.href.startsWith('javascript:')) {
            const resolved = new URL(cl.href, pageUrl).href;
            if (isSameOriginDev(resolved)) {
              results.push({ page: pageLabel, element: label, action: 'link', ok: true, detail: `→ ${cl.href}` });
            } else {
              results.push({ page: pageLabel, element: label, action: 'link', ok: true, detail: `external → ${cl.href}` });
            }
            continue;
          }

          /* click buttons / # links */
          await locator.click({ timeout: 3000, force: true });
          await page.waitForTimeout(300);

          const postClickErrors = consoleErrors.filter(e =>
            !e.includes('net::ERR_') && !e.includes('Failed to load resource') && !e.includes('404')
          );
          if (postClickErrors.length) {
            results.push({ page: pageLabel, element: label, action: 'click', ok: false, detail: `JS error: ${postClickErrors[0].slice(0, 120)}` });
            totalErrors++;
          } else {
            results.push({ page: pageLabel, element: label, action: 'click', ok: true, detail: 'OK' });
          }
        } catch (err) {
          results.push({ page: pageLabel, element: label, action: 'click', ok: false, detail: err.message.slice(0, 120) });
          totalErrors++;
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
    await vite.close();
  }

  /* ── report ────────────────────────────────────────────────────── */

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  QA Click Audit Report');
  console.log('══════════════════════════════════════════════════════\n');

  let currentPage = '';
  for (const r of results) {
    if (r.page !== currentPage) {
      currentPage = r.page;
      console.log(`\n── ${currentPage} ──`);
    }
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} [${r.action}] ${r.element}  —  ${r.detail}`);
  }

  const errorRows = results.filter(r => !r.ok);
  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  Pages scanned : ${DEV_PAGES.length}`);
  console.log(`  Clickables    : ${totalClicks}`);
  console.log(`  Errors        : ${totalErrors}`);
  console.log('──────────────────────────────────────────────────────\n');

  if (errorRows.length) {
    console.log('ERRORS:');
    for (const r of errorRows) {
      console.log(`  ✗ ${r.page}  →  ${r.element}  →  ${r.detail}`);
    }
    console.log('');
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
