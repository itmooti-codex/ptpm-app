# New Inquiry Page — UX & Data Collection Improvements

> Expert app-dev and UI/UX review of the new-inquiry data collection and submission flow. Use this as a prioritised backlog for incremental improvements.

---

## What’s Already Good

- **Contact-first flow** — Contact search and selection before property/inquiry fits how staff work.
- **Individual vs Entity** — Clear tab for contact type.
- **Related data (Properties, Jobs, Inquiries)** — Context without leaving the page.
- **Address autocomplete** — Google Places for address reduces errors.
- **Resident feedback** — Structured checkboxes and date; image upload with drag-and-drop.
- **Header actions** — Cancel, Reset, Save, Submit are visible and labelled.
- **Success modal** — Clear confirmation before redirect (and now redirects to dashboard when `DASHBOARD_URL` is set).

---

## 1. Post-Submit Navigation (Done)

- **Before:** `history.back()` — could land on a different page if user didn’t come from dashboard.
- **After:** When `config.DASHBOARD_URL` is set (e.g. `./dashboard.html` in dev, or Ontraport merge field in prod), success “OK” sends the user to the dashboard. Otherwise falls back to `history.back()`.
- **Ontraport:** Set `DASHBOARD_URL` in header/merge fields to the admin dashboard URL so post-submit always returns to dashboard.

---

## 2. Progressive Disclosure / Steps (High Impact)

**Issue:** One long form with three columns can feel heavy and increase drop-off.

**Recommendation:**

- **Wizard or steps:** e.g. “1. Contact → 2. Property → 3. Inquiry details”.
- Show one step at a time (or collapsible sections with “Next” per block).
- Persist step and draft in `sessionStorage` so refresh or back doesn’t lose data.
- **Quick win:** Keep current layout but add a small “step” indicator at the top (e.g. “Step 1 of 3”) and optional “Next section” that scrolls to the next column or section.

---

## 3. Validation & Feedback (High Impact)

**Issue:** Validation is mostly at submit time; users don’t see what’s wrong until they hit Submit.

**Recommendations:**

- **Inline validation:** On blur (or after first submit attempt), show a short error under required/invalid fields (e.g. “First Name is required”, “Enter a valid email”).
- **Submit-time summary:** If validation fails, scroll to the first invalid field and show a short banner: “Please fix the 2 fields below.”
- **Required indicators:** You already use `*` for some fields; use consistently for all required fields and consider “Required” in the label or placeholder.
- **Optional:** Disable or visually soften “Submit” until minimum required fields (e.g. contact + service) are valid, or show a tooltip: “Complete contact and service to submit.”

---

## 4. Save vs Submit Clarity (Medium Impact)

**Issue:** “Save” and “Submit Inquiry” can be confused (draft vs final).

**Recommendations:**

- **Labels:** “Save draft” and “Submit inquiry” (or “Submit to pipeline”).
- **Short help text under buttons:** e.g. “Save draft to finish later” and “Submit to create inquiry and notify team.”
- **Submit state:** After “Submit”, consider a second CTA in the success modal: “View inquiry” (link to new inquiry detail) and “Back to dashboard” (primary). Optional: “Create another” to reset form and stay on new-inquiry.

---

## 5. Success State & Next Actions (Medium Impact)

**Current:** Success modal with one “OK” → navigate to dashboard.

**Recommendations:**

- **Two actions in modal:**  
  - Primary: “Back to dashboard” (or use `DASHBOARD_URL`).  
  - Secondary: “View inquiry” (link to inquiry detail using the new ID from the submit response).
- **Optional:** “Create another inquiry” that clears the form (or resets to step 1) and keeps user on the page.
- **Toast + redirect:** Alternatively, show a short toast “Inquiry submitted” and auto-redirect to dashboard after 1.5s, with a “View inquiry” link in the toast.

---

## 6. Layout & Scannability (Medium Impact)

**Issue:** Dense three-column layout is hard on small screens and for quick scanning.

**Recommendations:**

- **Responsive:** Stack columns on narrow viewports (e.g. Contact → Property → Inquiry details top to bottom).
- **Section headings:** Clear card titles and, if possible, a single H1 (e.g. “New inquiry”) and H2s per section.
- **Spacing:** Slightly more padding between sections and between label and input to improve scannability.
- **Sticky header:** Keep Cancel / Reset / Save / Submit sticky so they’re always visible on scroll.

---

## 7. Loading & Error States (Medium Impact)

**Recommendations:**

- **Submit:** Already uses a loader; keep “Submitting inquiry…” and disable the Submit button during request.
- **Save draft:** If “Save” is implemented, show “Saving…” and disable until done.
- **Error modal:** Keep “Failed to submit inquiry. Please try again.” Add optional “Retry” that re-sends the same payload, and log or show a short technical message in dev (e.g. “Invalid date_job_required_by”).
- **Network errors:** Detect offline or 5xx and show a specific message: “Connection problem. Check your network and try again.”

---

## 8. Defaults & Smart Defaults (Low–Medium Impact)

**Recommendations:**

- **Inquiry source:** Default “Phone Call” or “Web Form” based on how the user opened the page (e.g. from phone link vs dashboard).
- **Service:** Remember last-used service per user/session and pre-select when possible.
- **Date Job Required By:** Optional default (e.g. “in 7 days”) with a clear way to clear or change.
- **Timezone:** Already in config; ensure all “today” or “default date” uses it.

---

## 9. Accessibility & Keyboard (Low–Medium Impact)

**Recommendations:**

- **Focus management:** After success modal closes and redirect happens, ensure focus isn’t lost (browser will move to new page).
- **Modal:** Trap focus inside modal; close on Escape; ensure “OK” / “Back to dashboard” are clearly focused when modal opens.
- **Required fields:** Use `aria-required` and `aria-invalid` where you show validation errors.
- **Labels:** Ensure every input has a visible label (you already do) and that `id`/`for` or `aria-labelledby` are correct so screen readers associate them.

---

## 10. Data Quality & Integrity (Ongoing)

**Already in place:**

- `date_job_required_by` only sent when valid (no empty string for numeric field).
- Resident feedback and property data merged in a clear order.

**Recommendations:**

- **Numeric/date fields:** Extend the same pattern: omit or coerce empty strings for any field the API expects as number/date (e.g. bedrooms, building_age, stories).
- **Trim:** Continue trimming text inputs before submit.
- **Optional:** Client-side duplicate check (e.g. same contact + same service + same day) and a soft warning: “Similar inquiry already exists. Continue anyway?”

---

## Implementation Priority (Suggested)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Post-submit to dashboard | Done | High |
| 2 | Inline validation (required + email) | Medium | High |
| 3 | Success modal: “View inquiry” + “Back to dashboard” | Low | Medium |
| 4 | Sticky header + responsive stacking | Low–Medium | Medium |
| 5 | Save draft vs Submit labels + short help | Low | Medium |
| 6 | Submit-time error summary + scroll to first error | Low | Medium |
| 7 | Optional wizard/stepper | High | High (long-term) |
| 8 | Smart defaults (last service, inquiry source) | Low | Low–Medium |

---

## Config Reference (Post-Submit)

- **`config.DASHBOARD_URL`** — Set in dev (e.g. `./dashboard.html`) or via Ontraport merge field. When set, success “OK” navigates here instead of `history.back()`.
- **`config.NEW_INQUIRY_URL`** — Used by dashboard “Create” etc.; independent of post-submit redirect.
