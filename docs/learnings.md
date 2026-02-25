# Project learnings

Project-specific lessons from debugging and building this app. Add new entries as you discover them.

---

## Links not navigating when VitalSync SDK is on the page (Feb 2025)

**Symptom:** Clicking table links (e.g. Customer ID or View icon on customers list) did nothing, even with correct `href` and delegated click handlers that set `window.location.href`.

**Cause:** A third-party script (VitalSync `latest.js`, loaded async from the CDN) attaches document-level click listeners and calls `preventDefault()`. That cancels the browser’s default “follow link” action, so normal link clicks never navigate.

**What didn’t work:**
- Delegated handler that set `window.location.href` (another handler was still preventing default or running in an order that blocked navigation).
- Relying on plain `<a href="...">` with no `onclick` (default action was suppressed).

**What worked:** Keep the real `href` on the link and add an **inline `onclick`** on the same element:

```html
<a href="./customer-detail.html?contact=22" onclick="window.location.href=this.href;return false;">View</a>
```

**Why:** `preventDefault()` only cancels the *default* action. It doesn’t stop other handlers from running. The link’s own `onclick` still runs and performs navigation in code, so the page navigates regardless of what other scripts do to the event.

**Takeaways:**
1. When “clicking the link does nothing,” check whether another script is calling `preventDefault()` on click.
2. Doing navigation explicitly in the link’s `onclick` (e.g. `window.location.href = this.href`) is a reliable fallback when the default action is being blocked.
3. In environments with third-party scripts (e.g. Ontraport + VitalSync), this pattern is a practical way to keep list → detail links working.
4. Bump script cache-bust (e.g. `?v=4`) when changing behavior so the browser doesn’t serve an old cached file.

**Where applied:** `src/js/pages/customers-list.js` — Customer ID and View (eye) links in the table.
