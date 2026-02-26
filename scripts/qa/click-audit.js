#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'reports', 'click-audit');
const MAX_CLICKABLES_PER_PAGE = Number(process.env.QA_MAX_CLICKS_PER_PAGE || 80);
const NAV_TIMEOUT_MS = Number(process.env.QA_NAV_TIMEOUT_MS || 20000);
const CLICK_TIMEOUT_MS = Number(process.env.QA_CLICK_TIMEOUT_MS || 5000);
const WARNING_SIGNAL_REGEX = /(not implemented|coming soon|failed|missing|error)/i;
const KNOWN_NOISE_MESSAGE_PATTERNS = [
  /Missing required options: slug and\/or apiKey/i,
  /VitalSync not connected — cannot switch to model/i,
  /\[CompanyDetail\] Load failed Error: API key missing/i,
  /Failed to load resource: the server responded with a status of 404 \(Not Found\)/i,
  /cdn\.tailwindcss\.com should not be used/i,
  /loadableReady\(\) requires state/i,
  /Google Maps JavaScript API has been loaded directly without loading=async/i,
  /google\.maps\.places\.Autocomplete is not available to new customers/i,
];
const OPTIONAL_DEV_ASSET_PATTERNS = [
  /\/dev\/mock-data\.local\.js(\?.*)?$/i,
  /\/archive\/pages\/dev\/mock-data(\.local)?\.js(\?.*)?$/i,
  /\/archive\/pages\/src\/js\/config\.js(\?.*)?$/i,
  /\/archive\/pages\/src\/js\/vitalsync\.js(\?.*)?$/i,
];

function isNoiseMessage(message) {
  return KNOWN_NOISE_MESSAGE_PATTERNS.some((regex) => regex.test(String(message || '')));
}

function isOptionalDevAssetUrl(url) {
  const value = String(url || '');
  return OPTIONAL_DEV_ASSET_PATTERNS.some((regex) => regex.test(value));
}

function shouldIgnoreRequestFailure(failure) {
  if (!failure) return true;
  if (isOptionalDevAssetUrl(failure.url)) return true;
  if (/net::ERR_ABORTED/i.test(String(failure.errorText || ''))) return true;
  return false;
}

function shouldIgnoreHttpError(httpErr) {
  if (!httpErr) return true;
  if (httpErr.status === 404 && isOptionalDevAssetUrl(httpErr.url)) return true;
  return false;
}

function normalizeBaseUrl(input) {
  const url = new URL(input || 'http://127.0.0.1:8000/dev/');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  if (!url.pathname.includes('/dev/')) url.pathname = '/dev/';
  return url.toString();
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function escapeTable(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createFinding(severity, category, location, detail, repro, evidence) {
  return {
    severity,
    category,
    location,
    detail,
    repro: repro || '',
    evidence: evidence || '',
  };
}

function dedupeFindings(findings) {
  const seen = new Set();
  const deduped = [];
  for (const finding of findings) {
    const key = [
      finding.severity,
      finding.category,
      finding.location,
      finding.detail,
      finding.repro,
    ].join('::');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(finding);
  }
  const severityRank = { high: 0, medium: 1, low: 2 };
  deduped.sort((a, b) => {
    const rankA = severityRank[a.severity] ?? 99;
    const rankB = severityRank[b.severity] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.location).localeCompare(String(b.location));
  });
  return deduped;
}

function summarizeFindings(findings) {
  return findings.reduce(
    (acc, finding) => {
      const level = finding.severity || 'low';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

function walkDirRecursive(startDir) {
  const output = [];
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else {
        output.push(absolutePath);
      }
    }
  }
  return output;
}

function scanSourceMarkers() {
  const srcDir = path.join(PROJECT_ROOT, 'src', 'js');
  if (!fs.existsSync(srcDir)) return [];

  const markers = [];
  const files = walkDirRecursive(srcDir).filter((filePath) => filePath.endsWith('.js'));
  const markerRegex = /(not implemented|coming soon|\bTODO\b|\bFIXME\b)/i;

  for (const filePath of files) {
    const relPath = path.relative(PROJECT_ROOT, filePath);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!markerRegex.test(lines[i])) continue;
      markers.push(
        createFinding(
          /not implemented|coming soon/i.test(lines[i]) ? 'medium' : 'low',
          'source_marker',
          relPath + ':' + (i + 1),
          lines[i].trim(),
          'Inspect this code path and implement the missing behavior.',
          lines[i].trim()
        )
      );
    }
  }
  return markers;
}

function getDevHtmlFiles() {
  const devDir = path.join(PROJECT_ROOT, 'dev');
  if (!fs.existsSync(devDir)) return [];
  return fs
    .readdirSync(devDir)
    .filter((fileName) => fileName.endsWith('.html'))
    .sort();
}

async function startViteServer() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: PROJECT_ROOT,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      open: false,
    },
  });
  await server.listen();
  const address = server.httpServer && server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 8000;
  return {
    server,
    baseUrl: 'http://127.0.0.1:' + port + '/dev/',
  };
}

function getPageKey(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname + url.search;
  } catch (_err) {
    return urlString;
  }
}

async function extractIndexLinkOverrides(page, baseUrl) {
  const overrides = new Map();
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((anchor) => anchor.getAttribute('href'))
    );
    for (const href of hrefs) {
      if (!href) continue;
      let abs;
      try {
        abs = new URL(href, baseUrl);
      } catch (_err) {
        continue;
      }
      if (!abs.pathname.startsWith('/dev/')) continue;
      if (!abs.search) continue;
      overrides.set(abs.pathname, abs.search);
    }
  } catch (_err) {
    // Best effort: continue with file-based URLs if index cannot be parsed.
  }

  if (!overrides.has('/dev/customer-detail.html')) {
    overrides.set('/dev/customer-detail.html', '?contact=20');
  }
  if (!overrides.has('/dev/company-detail.html')) {
    overrides.set('/dev/company-detail.html', '?company=62');
  }
  return overrides;
}

function buildTargetUrls(baseUrl, devFiles, queryOverrides) {
  const targets = new Set([baseUrl]);
  for (const fileName of devFiles) {
    const url = new URL(fileName, baseUrl);
    if (queryOverrides.has(url.pathname)) {
      url.search = queryOverrides.get(url.pathname);
    }
    targets.add(url.toString());
  }
  return Array.from(targets).sort((a, b) => {
    if (a === baseUrl) return -1;
    if (b === baseUrl) return 1;
    return getPageKey(a).localeCompare(getPageKey(b));
  });
}

async function collectInteractiveElements(page) {
  return page.evaluate(() => {
    function safeAttrForSelector(value) {
      return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    }

    function isVisible(element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.pointerEvents !== 'none'
      );
    }

    function cssPath(element) {
      if (element.id) return '#' + CSS.escape(element.id);
      const attrCandidates = ['data-testid', 'data-test', 'name', 'aria-label', 'title'];
      for (const attr of attrCandidates) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const selector = element.tagName.toLowerCase() + '[' + attr + '="' + safeAttrForSelector(value) + '"]';
        try {
          if (document.querySelectorAll(selector).length === 1) return selector;
        } catch (_err) {}
      }
      if (element.tagName.toLowerCase() === 'a' && element.getAttribute('href')) {
        const anchorSelector = 'a[href="' + safeAttrForSelector(element.getAttribute('href')) + '"]';
        try {
          if (document.querySelectorAll(anchorSelector).length === 1) return anchorSelector;
        } catch (_err) {}
      }

      const parts = [];
      let current = element;
      while (current && current.nodeType === 1 && current !== document.documentElement) {
        let part = current.tagName.toLowerCase();
        const classes = Array.from(current.classList || []).slice(0, 2);
        if (classes.length) {
          part += '.' + classes.map((className) => CSS.escape(className)).join('.');
        }
        if (current.parentElement) {
          const sameTagSiblings = Array.from(current.parentElement.children).filter(
            (sibling) => sibling.tagName === current.tagName
          );
          if (sameTagSiblings.length > 1) {
            part += ':nth-of-type(' + (sameTagSiblings.indexOf(current) + 1) + ')';
          }
        }
        parts.unshift(part);
        const selector = parts.join(' > ');
        try {
          if (document.querySelectorAll(selector).length === 1) return selector;
        } catch (_err) {}
        current = current.parentElement;
      }
      return parts.join(' > ');
    }

    function cleanLabel(element) {
      const raw =
        element.innerText ||
        element.textContent ||
        element.value ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        '';
      return raw.trim().replace(/\s+/g, ' ').slice(0, 140);
    }

    const candidates = Array.from(
      document.querySelectorAll(
        'a[href], button, input[type="button"], input[type="submit"], [role="button"][tabindex], [role="button"][onclick], [role="button"][data-action]'
      )
    )
      .filter((element) => {
        if (element.disabled) return false;
        if (!isVisible(element)) return false;
        const tag = element.tagName.toLowerCase();
        const type = (element.getAttribute('type') || '').toLowerCase();
        const isNativeInteractive =
          tag === 'a' || tag === 'button' || (tag === 'input' && (type === 'button' || type === 'submit'));
        if (isNativeInteractive) return true;
        const cursor = window.getComputedStyle(element).cursor;
        return cursor === 'pointer';
      })
      .map((element) => ({
        selector: cssPath(element),
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || '',
        role: element.getAttribute('role') || '',
        href: element.getAttribute('href') || '',
        target: element.getAttribute('target') || '',
        label: cleanLabel(element),
      }));

    const dedupe = new Set();
    const clickables = [];
    for (const item of candidates) {
      if (!item.selector) continue;
      if (dedupe.has(item.selector)) continue;
      dedupe.add(item.selector);
      clickables.push(item);
    }

    const anchorHrefs = clickables
      .filter((item) => item.tag === 'a' && item.href)
      .map((item) => item.href);

    return { clickables, anchorHrefs };
  });
}

async function validateInternalLinks(requestContext, pageUrl, anchorHrefs, baseOrigin) {
  const checked = new Set();
  const broken = [];
  for (const href of anchorHrefs) {
    if (!href || href.startsWith('#')) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;

    let targetUrl;
    try {
      targetUrl = new URL(href, pageUrl).toString();
    } catch (_err) {
      continue;
    }
    if (checked.has(targetUrl)) continue;
    checked.add(targetUrl);

    let targetParsed;
    try {
      targetParsed = new URL(targetUrl);
    } catch (_err) {
      continue;
    }
    if (targetParsed.origin !== baseOrigin) continue;

    try {
      const response = await requestContext.get(targetUrl, {
        timeout: NAV_TIMEOUT_MS,
        failOnStatusCode: false,
      });
      if (response.status() >= 400) {
        broken.push({
          url: targetUrl,
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    } catch (err) {
      broken.push({
        url: targetUrl,
        status: 0,
        statusText: err.message,
      });
    }
  }
  return broken;
}

async function auditSinglePage(context, pageUrl, options) {
  const page = await context.newPage();
  const pageResult = {
    pageUrl,
    pageTitle: '',
    statusCode: null,
    clickablesDiscovered: 0,
    clicksAttempted: 0,
    clicksSkipped: 0,
    clickFailures: [],
    pageErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    requestFailures: [],
    httpErrors: [],
    brokenLinks: [],
    findings: [],
  };

  page.on('pageerror', (err) => {
    pageResult.pageErrors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageResult.consoleErrors.push(msg.text());
    if (msg.type() === 'warning' || msg.type() === 'warn') pageResult.consoleWarnings.push(msg.text());
  });
  page.on('requestfailed', (request) => {
    pageResult.requestFailures.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      errorText: request.failure() ? request.failure().errorText : 'unknown',
    });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const request = response.request();
    pageResult.httpErrors.push({
      method: request.method(),
      resourceType: request.resourceType(),
      status: response.status(),
      statusText: response.statusText(),
      url: response.url(),
    });
  });

  let interactive = { clickables: [], anchorHrefs: [] };
  try {
    const initialResponse = await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    });
    pageResult.statusCode = initialResponse ? initialResponse.status() : null;
    pageResult.pageTitle = await page.title();
    await page.waitForTimeout(300);
    interactive = await collectInteractiveElements(page);
  } catch (err) {
    pageResult.findings.push(
      createFinding(
        'high',
        'page_load_failure',
        pageUrl,
        'Page failed to load: ' + err.message,
        'Open ' + pageUrl + ' and inspect load errors.',
        err.message
      )
    );
    await page.close();
    return pageResult;
  }

  pageResult.clickablesDiscovered = interactive.clickables.length;

  if (pageResult.statusCode && pageResult.statusCode >= 400) {
    pageResult.findings.push(
      createFinding(
        'high',
        'page_http_error',
        pageUrl,
        'Page returned HTTP ' + pageResult.statusCode,
        'Open ' + pageUrl + ' and confirm the page response status.',
        'HTTP ' + pageResult.statusCode
      )
    );
  }

  const initialPageErrors = Array.from(new Set(pageResult.pageErrors)).filter((message) => !isNoiseMessage(message));
  for (const message of initialPageErrors) {
    pageResult.findings.push(
      createFinding(
        'high',
        'page_load_exception',
        pageUrl,
        'Page threw runtime exception on load: ' + message,
        'Open ' + pageUrl + ' and observe console/runtime errors on initial load.',
        message
      )
    );
  }

  const initialConsoleErrors = Array.from(new Set(pageResult.consoleErrors)).filter((message) => !isNoiseMessage(message));
  for (const message of initialConsoleErrors) {
    pageResult.findings.push(
      createFinding(
        'medium',
        'page_load_console_error',
        pageUrl,
        'Console error on initial load: ' + message,
        'Open ' + pageUrl + ' and inspect browser console on initial load.',
        message
      )
    );
  }

  const initialConsoleWarnings = Array.from(new Set(pageResult.consoleWarnings))
    .filter((message) => !isNoiseMessage(message))
    .filter((message) => WARNING_SIGNAL_REGEX.test(message));
  for (const message of initialConsoleWarnings) {
    pageResult.findings.push(
      createFinding(
        'medium',
        'page_load_warning',
        pageUrl,
        'Warning on initial load: ' + message,
        'Open ' + pageUrl + ' and inspect browser warnings on initial load.',
        message
      )
    );
  }

  pageResult.brokenLinks = await validateInternalLinks(
    context.request,
    pageUrl,
    interactive.anchorHrefs,
    options.baseOrigin
  );
  for (const broken of pageResult.brokenLinks) {
    pageResult.findings.push(
      createFinding(
        'high',
        'broken_link',
        pageUrl,
        'Link target failed: ' + broken.url + ' (' + broken.status + ')',
        'From ' + pageUrl + ', click the link to ' + broken.url + '.',
        broken.statusText
      )
    );
  }

  const clickTargets = interactive.clickables.slice(0, options.maxClicksPerPage);
  const desiredUrl = new URL(pageUrl);
  for (const target of clickTargets) {
    pageResult.clicksAttempted += 1;

    const beforeCounts = {
      pageErrors: pageResult.pageErrors.length,
      consoleErrors: pageResult.consoleErrors.length,
      consoleWarnings: pageResult.consoleWarnings.length,
      requestFailures: pageResult.requestFailures.length,
      httpErrors: pageResult.httpErrors.length,
    };

    try {
      const currentUrl = new URL(page.url());
      if (currentUrl.pathname !== desiredUrl.pathname || currentUrl.search !== desiredUrl.search) {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
        await page.waitForTimeout(350);
      }
    } catch (_err) {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForTimeout(350);
    }

    let popupPage = null;
    const popupPromise = context.waitForEvent('page', { timeout: 1500 }).catch(() => null);
    const beforeUrl = page.url();
    let clickError = null;

    try {
      const locator = page.locator(target.selector).first();
      if ((await locator.count()) === 0) {
        pageResult.clicksSkipped += 1;
        continue;
      }
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      try {
        await locator.click({ timeout: Math.min(CLICK_TIMEOUT_MS, 2000), trial: true });
      } catch (_err) {
        pageResult.clicksSkipped += 1;
        continue;
      }
      await locator.click({ timeout: CLICK_TIMEOUT_MS });
    } catch (err) {
      clickError = err;
    }

    popupPage = await popupPromise;
    if (popupPage) {
      try {
        await popupPage.waitForLoadState('domcontentloaded', { timeout: 4000 });
      } catch (_err) {}
      await popupPage.close().catch(() => {});
    }

    await page.waitForTimeout(300);
    const afterUrl = page.url();
    let navigatedAway = false;
    try {
      const afterParsed = new URL(afterUrl);
      navigatedAway = afterParsed.pathname !== desiredUrl.pathname || afterParsed.search !== desiredUrl.search;
    } catch (_err) {
      navigatedAway = false;
    }

    const newPageErrors = pageResult.pageErrors.slice(beforeCounts.pageErrors);
    const newConsoleErrors = pageResult.consoleErrors.slice(beforeCounts.consoleErrors);
    const newConsoleWarnings = pageResult.consoleWarnings.slice(beforeCounts.consoleWarnings);
    const newRequestFailures = pageResult.requestFailures.slice(beforeCounts.requestFailures);
    const newHttpErrors = pageResult.httpErrors.slice(beforeCounts.httpErrors);

    if (clickError) {
      const label = target.label || target.selector;
      pageResult.clickFailures.push({
        label,
        selector: target.selector,
        error: clickError.message,
      });
      pageResult.findings.push(
        createFinding(
          'high',
          'click_failure',
          pageUrl,
          'Click failed for "' + label + '" (' + target.selector + '): ' + clickError.message,
          'Open ' + pageUrl + ', click "' + label + '".',
          clickError.message
        )
      );
    }

    if (navigatedAway && !clickError) {
      for (const failure of newRequestFailures) {
        if (shouldIgnoreRequestFailure(failure)) continue;
        if (failure.resourceType !== 'document') continue;
        pageResult.findings.push(
          createFinding(
            'high',
            'request_failed',
            pageUrl,
            'Navigation request failed (' + failure.resourceType + '): ' + failure.url,
            'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
            failure.errorText
          )
        );
      }

      for (const httpErr of newHttpErrors) {
        if (shouldIgnoreHttpError(httpErr)) continue;
        if (httpErr.resourceType !== 'document') continue;
        pageResult.findings.push(
          createFinding(
            'high',
            'http_error',
            pageUrl,
            'Navigation HTTP ' + httpErr.status + ': ' + httpErr.url,
            'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
            httpErr.statusText
          )
        );
      }

      continue;
    }

    for (const message of newPageErrors) {
      if (isNoiseMessage(message)) continue;
      pageResult.findings.push(
        createFinding(
          'high',
          'js_exception',
          pageUrl,
          'Runtime exception after clicking "' + (target.label || target.selector) + '": ' + message,
          'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
          message
        )
      );
    }

    for (const message of newConsoleErrors) {
      if (isNoiseMessage(message)) continue;
      pageResult.findings.push(
        createFinding(
          'medium',
          'console_error',
          pageUrl,
          'Console error after clicking "' + (target.label || target.selector) + '": ' + message,
          'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
          message
        )
      );
    }

    for (const message of newConsoleWarnings) {
      if (isNoiseMessage(message)) continue;
      if (!WARNING_SIGNAL_REGEX.test(message)) continue;
      pageResult.findings.push(
        createFinding(
          'medium',
          'warning_signal',
          pageUrl,
          'Warning after clicking "' + (target.label || target.selector) + '": ' + message,
          'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
          message
        )
      );
    }

    for (const failure of newRequestFailures) {
      if (shouldIgnoreRequestFailure(failure)) continue;
      const severity = /script|document|xhr|fetch/.test(failure.resourceType) ? 'high' : 'medium';
      pageResult.findings.push(
        createFinding(
          severity,
          'request_failed',
          pageUrl,
          'Request failed (' + failure.resourceType + '): ' + failure.url,
          'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
          failure.errorText
        )
      );
    }

    for (const httpErr of newHttpErrors) {
      if (shouldIgnoreHttpError(httpErr)) continue;
      const severity = /document|xhr|fetch/.test(httpErr.resourceType) ? 'high' : 'medium';
      pageResult.findings.push(
        createFinding(
          severity,
          'http_error',
          pageUrl,
          'HTTP ' + httpErr.status + ' (' + httpErr.resourceType + '): ' + httpErr.url,
          'Open ' + pageUrl + ', click "' + (target.label || target.selector) + '".',
          httpErr.statusText
        )
      );
    }

    if (!clickError && beforeUrl !== afterUrl && afterUrl.includes('/dev/')) {
      // Navigation is expected for many links; keep as trace only in JSON.
    }
  }

  await page.close();
  return pageResult;
}

function buildMarkdownReport(auditResult) {
  const lines = [];
  const summary = auditResult.summary;
  const highFindings = auditResult.findings.filter((finding) => finding.severity === 'high');
  const mediumFindings = auditResult.findings.filter((finding) => finding.severity === 'medium');
  const lowFindings = auditResult.findings.filter((finding) => finding.severity === 'low');

  lines.push('# UI Click Audit Report');
  lines.push('');
  lines.push('- Generated: ' + auditResult.generatedAt);
  lines.push('- Base URL: `' + auditResult.baseUrl + '`');
  lines.push('- Max clicks per page: ' + auditResult.maxClicksPerPage);
  lines.push('- Pages audited: ' + auditResult.pages.length);
  lines.push('- Clickables discovered: ' + summary.clickablesDiscovered);
  lines.push('- Clicks attempted: ' + summary.clicksAttempted);
  lines.push('- Clicks skipped (non-actionable): ' + summary.clicksSkipped);
  lines.push('- Click failures: ' + summary.clickFailures);
  lines.push('- Findings: high `' + summary.findings.high + '`, medium `' + summary.findings.medium + '`, low `' + summary.findings.low + '`');
  lines.push('');

  lines.push('## High-Severity Findings');
  lines.push('');
  if (!highFindings.length) {
    lines.push('_No high-severity issues were detected in this run._');
  } else {
    lines.push('| # | Location | Category | Issue | Reproduction |');
    lines.push('|---|---|---|---|---|');
    highFindings.forEach((finding, index) => {
      lines.push(
        '| ' +
          (index + 1) +
          ' | ' +
          escapeTable(finding.location) +
          ' | ' +
          escapeTable(finding.category) +
          ' | ' +
          escapeTable(finding.detail) +
          ' | ' +
          escapeTable(finding.repro) +
          ' |'
      );
    });
  }
  lines.push('');

  lines.push('## Medium-Severity Findings');
  lines.push('');
  if (!mediumFindings.length) {
    lines.push('_No medium-severity issues were detected in this run._');
  } else {
    lines.push('| # | Location | Category | Issue | Reproduction |');
    lines.push('|---|---|---|---|---|');
    mediumFindings.forEach((finding, index) => {
      lines.push(
        '| ' +
          (index + 1) +
          ' | ' +
          escapeTable(finding.location) +
          ' | ' +
          escapeTable(finding.category) +
          ' | ' +
          escapeTable(finding.detail) +
          ' | ' +
          escapeTable(finding.repro) +
          ' |'
      );
    });
  }
  lines.push('');

  lines.push('## Low-Severity Findings');
  lines.push('');
  if (!lowFindings.length) {
    lines.push('_No low-severity issues were detected in this run._');
  } else {
    lines.push('| # | Location | Category | Issue |');
    lines.push('|---|---|---|---|');
    lowFindings.forEach((finding, index) => {
      lines.push(
        '| ' +
          (index + 1) +
          ' | ' +
          escapeTable(finding.location) +
          ' | ' +
          escapeTable(finding.category) +
          ' | ' +
          escapeTable(finding.detail) +
          ' |'
      );
    });
  }
  lines.push('');

  lines.push('## Page Coverage Summary');
  lines.push('');
  lines.push('| Page | Status | Clickables | Clicks Attempted | Clicks Skipped | Click Failures | Console Errors | JS Exceptions | Broken Links |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  auditResult.pages.forEach((page) => {
    lines.push(
      '| `' +
        escapeTable(getPageKey(page.pageUrl)) +
        '` | ' +
        (page.statusCode == null ? '-' : page.statusCode) +
        ' | ' +
        page.clickablesDiscovered +
        ' | ' +
        page.clicksAttempted +
        ' | ' +
        page.clicksSkipped +
        ' | ' +
        page.clickFailures.length +
        ' | ' +
        page.consoleErrors.length +
        ' | ' +
        page.pageErrors.length +
        ' | ' +
        page.brokenLinks.length +
        ' |'
    );
  });
  lines.push('');

  lines.push('## Source Markers (Potentially Incomplete Paths)');
  lines.push('');
  const sourceMarkers = auditResult.findings.filter((finding) => finding.category === 'source_marker');
  if (!sourceMarkers.length) {
    lines.push('_No "not implemented / coming soon / TODO / FIXME" markers found._');
  } else {
    lines.push('| # | File:Line | Marker |');
    lines.push('|---|---|---|');
    sourceMarkers.forEach((finding, index) => {
      lines.push(
        '| ' +
          (index + 1) +
          ' | ' +
          escapeTable(finding.location) +
          ' | ' +
          escapeTable(finding.detail) +
          ' |'
      );
    });
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  ensureDir(REPORT_DIR);

  let viteServer = null;
  let baseUrl = process.env.QA_BASE_URL ? normalizeBaseUrl(process.env.QA_BASE_URL) : '';

  if (!baseUrl) {
    const started = await startViteServer();
    viteServer = started.server;
    baseUrl = normalizeBaseUrl(started.baseUrl);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const seedPage = await context.newPage();
  const queryOverrides = await extractIndexLinkOverrides(seedPage, baseUrl);
  await seedPage.close();

  const devFiles = getDevHtmlFiles();
  const targetUrls = buildTargetUrls(baseUrl, devFiles, queryOverrides);
  const baseOrigin = new URL(baseUrl).origin;

  const pageResults = [];
  for (const targetUrl of targetUrls) {
    // eslint-disable-next-line no-console
    console.log('Auditing:', targetUrl);
    const pageResult = await auditSinglePage(context, targetUrl, {
      baseOrigin,
      maxClicksPerPage: MAX_CLICKABLES_PER_PAGE,
    });
    pageResults.push(pageResult);
  }

  const pageFindings = pageResults.flatMap((page) => page.findings);
  const sourceMarkers = scanSourceMarkers();
  const findings = dedupeFindings(pageFindings.concat(sourceMarkers));

  const summary = {
    clickablesDiscovered: pageResults.reduce((sum, page) => sum + page.clickablesDiscovered, 0),
    clicksAttempted: pageResults.reduce((sum, page) => sum + page.clicksAttempted, 0),
    clicksSkipped: pageResults.reduce((sum, page) => sum + page.clicksSkipped, 0),
    clickFailures: pageResults.reduce((sum, page) => sum + page.clickFailures.length, 0),
    findings: summarizeFindings(findings),
  };

  const auditResult = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    maxClicksPerPage: MAX_CLICKABLES_PER_PAGE,
    pages: pageResults,
    findings,
    summary,
  };

  const tag = nowTag();
  const jsonPath = path.join(REPORT_DIR, 'click-audit-' + tag + '.json');
  const markdownPath = path.join(REPORT_DIR, 'click-audit-' + tag + '.md');
  const latestJsonPath = path.join(REPORT_DIR, 'latest.json');
  const latestMarkdownPath = path.join(REPORT_DIR, 'latest.md');

  fs.writeFileSync(jsonPath, JSON.stringify(auditResult, null, 2), 'utf8');
  fs.writeFileSync(markdownPath, buildMarkdownReport(auditResult), 'utf8');
  fs.writeFileSync(latestJsonPath, JSON.stringify(auditResult, null, 2), 'utf8');
  fs.writeFileSync(latestMarkdownPath, buildMarkdownReport(auditResult), 'utf8');

  await context.close();
  await browser.close();
  if (viteServer) await viteServer.close();

  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('QA click audit complete.');
  // eslint-disable-next-line no-console
  console.log('Pages audited:', pageResults.length);
  // eslint-disable-next-line no-console
  console.log('Clicks attempted:', summary.clicksAttempted);
  // eslint-disable-next-line no-console
  console.log('Findings:', summary.findings);
  // eslint-disable-next-line no-console
  console.log('Report:', markdownPath);
  // eslint-disable-next-line no-console
  console.log('JSON:', jsonPath);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('QA click audit failed:', err);
  process.exit(1);
});
