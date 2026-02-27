# New Inquiry Related Tabs Test Results

**Test Date:** 2026-02-26  
**Test URL:** http://localhost:8002/dev/new-inquiry.html  
**Tester:** Manual verification required

## Test Scenarios

### 1. Properties Tab Shows Properties When Jobs/Inquiries Exist with Property Linkage

**Objective:** Verify that when an Individual contact is selected who has related jobs/inquiries with `property_id` set, the Properties tab displays at least one property (via the fallback mechanism).

**Implementation Logic (lines 860-909 in new-inquiry.js):**
- First attempts to fetch properties via `calcAffiliations` (Contact → Affiliation → Property)
- If no direct properties found, extracts `property_id` from jobs/inquiries
- Fetches those properties via `fetchPropertiesByIds()`
- Merges and deduplicates results

**Test Steps:**
1. Navigate to http://localhost:8002/dev/new-inquiry.html
2. Ensure API key is set in `dev/mock-data.local.js` (window.__MOCK_API_KEY__)
3. In Contact Details section, search for "Test User" or another contact known to have:
   - Related jobs with `property_id` set, OR
   - Related inquiries with `property_id` set
4. Select the contact from search results
5. Wait for "Related Data" card to finish loading
6. Observe the Properties tab button label

**Expected Results:**
- ✅ Properties tab shows count > 0 (e.g., "Properties (1)" or higher)
- ✅ Properties panel displays at least one property card when tab is active
- ✅ Property card shows: property name/ID, address, and optional "View on Map" link

**Actual Results:**
- [ ] PASS / [ ] FAIL
- Properties count: ___
- Screenshot/notes: ___

---

### 2. Jobs Tab Records Are Clickable and Navigate to Detail Page

**Objective:** Verify that job records in the Jobs tab can be clicked (either via card click or "Open" link) and navigate to the job detail page.

**Implementation Logic (lines 1606-1619 in new-inquiry.js):**
- Job cards have `data-related-open-url` attribute with detail URL
- Card has `cursor-pointer hover:bg-blue-50` classes
- "Open" link has `data-related-open-link` attribute
- Click handler at lines 1511-1517 navigates via `window.location.href`

**Test Steps:**
1. Continue from Test 1 with a contact that has related jobs
2. Click the "Jobs" tab
3. Verify at least one job card is displayed
4. **Test A:** Click anywhere on the job card (not the "Open" link)
5. Verify navigation occurs
6. Use browser back button
7. **Test B:** Click the "Open" link specifically
8. Verify navigation occurs

**Expected Results:**
- ✅ Job card displays: unique_id (e.g., "#12345"), created date, provider name, status badge
- ✅ Card has hover effect (background changes to blue-50)
- ✅ Clicking card body navigates to job detail page
- ✅ Clicking "Open" link navigates to job detail page
- ✅ Detail URL includes `returnTo` query parameter
- ✅ Browser back returns to new-inquiry page with state preserved

**Actual Results:**
- [ ] PASS / [ ] FAIL
- Card click navigation: [ ] PASS / [ ] FAIL
- "Open" link navigation: [ ] PASS / [ ] FAIL
- Browser back: [ ] PASS / [ ] FAIL
- Screenshot/notes: ___

---

### 3. Inquiries Tab Records Are Clickable and Navigate to Detail Page

**Objective:** Verify that inquiry records in the Inquiries tab can be clicked (either via card click or "Open" link) and navigate to the inquiry detail page.

**Implementation Logic (lines 1621-1634 in new-inquiry.js):**
- Inquiry cards have `data-related-open-url` attribute with detail URL
- Card has `cursor-pointer hover:bg-blue-50` classes
- "Open" link has `data-related-open-link` attribute
- Same click handler as jobs (lines 1511-1517)

**Test Steps:**
1. Continue from Test 1 with a contact that has related inquiries
2. Click the "Inquiries" tab
3. Verify at least one inquiry card is displayed
4. **Test A:** Click anywhere on the inquiry card (not the "Open" link)
5. Verify navigation occurs
6. Use browser back button
7. **Test B:** Click the "Open" link specifically
8. Verify navigation occurs

**Expected Results:**
- ✅ Inquiry card displays: unique_id (e.g., "#67890"), service name, created date, status badge
- ✅ Card has hover effect (background changes to blue-50)
- ✅ Clicking card body navigates to inquiry detail page
- ✅ Clicking "Open" link navigates to inquiry detail page
- ✅ Detail URL includes `returnTo` query parameter
- ✅ Browser back returns to new-inquiry page with state preserved

**Actual Results:**
- [ ] PASS / [ ] FAIL
- Card click navigation: [ ] PASS / [ ] FAIL
- "Open" link navigation: [ ] PASS / [ ] FAIL
- Browser back: [ ] PASS / [ ] FAIL
- Screenshot/notes: ___

---

### 4. Browser Back Navigation Preserves Page State

**Objective:** After navigating to a job/inquiry detail page and using browser back, verify the new-inquiry page returns with the selected contact and related data still loaded.

**Implementation Logic:**
- `appendReturnTo()` function (lines 1594-1598) adds `returnTo` query parameter
- `buildDetailUrl()` function (lines 1600-1604) constructs URLs with returnTo

**Test Steps:**
1. From new-inquiry page, select a contact with related jobs/inquiries
2. Navigate to a job detail page (via Jobs tab)
3. Click browser back button
4. Verify contact is still selected and related tabs show data
5. Navigate to an inquiry detail page (via Inquiries tab)
6. Click browser back button
7. Verify contact is still selected and related tabs show data

**Expected Results:**
- ✅ After back navigation, contact search input still shows selected contact name
- ✅ Related Data card still shows loaded properties/jobs/inquiries
- ✅ Previously active tab (Jobs or Inquiries) is still active
- ✅ No JavaScript errors in console
- ✅ No re-fetch/loading spinner (state preserved in browser history)

**Actual Results:**
- [ ] PASS / [ ] FAIL
- Contact preserved: [ ] YES / [ ] NO
- Related data preserved: [ ] YES / [ ] NO
- Active tab preserved: [ ] YES / [ ] NO
- Console errors: [ ] NONE / [ ] ERRORS (list below)
- Screenshot/notes: ___

---

## Blocking Issues / Observations

### Console Errors
```
(Paste any console errors here)
```

### Network Errors
```
(Paste any failed GraphQL queries or API errors here)
```

### Visual Issues
- [ ] Cards not rendering
- [ ] Hover states not working
- [ ] Tab counts incorrect
- [ ] Navigation broken
- [ ] Other: ___

### Data Issues
- [ ] Properties not showing despite jobs/inquiries having property_id
- [ ] Job/inquiry cards missing expected fields
- [ ] Detail URLs malformed
- [ ] returnTo parameter not appended
- [ ] Other: ___

---

## Test Contact Data Reference

**Recommended Test Contact:**
- Name: "Test User" (or substitute with known contact)
- Expected related records:
  - Jobs: ___ (count)
  - Inquiries: ___ (count)
  - Properties (via jobs/inquiries): ___ (count)

**API Key Status:**
- [ ] Real API key configured in `dev/mock-data.local.js`
- [ ] Using mock data fallback

---

## Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Properties tab shows properties | ⬜ | |
| 2. Jobs clickable & navigate | ⬜ | |
| 3. Inquiries clickable & navigate | ⬜ | |
| 4. Browser back preserves state | ⬜ | |

**Overall Result:** ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL

**Tester Signature:** _______________  
**Date Completed:** _______________
