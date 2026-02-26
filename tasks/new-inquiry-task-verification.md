# Task Due Date + Completion Verification - Inquiry Detail

**Test URL:** http://localhost:8002/dev/inquiry-detail.html?deal=360  
**Date:** 2026-02-26  
**Status:** PENDING MANUAL VERIFICATION

## Test Steps & Results

### Step 1: Page Load
- [ ] Navigate to http://localhost:8002/dev/inquiry-detail.html?deal=360
- [ ] If 360 fails, try without query param: http://localhost:8002/dev/inquiry-detail.html
- **Expected:** Page loads without errors, inquiry detail displays
- **Result:** ___________
- **Notes:** ___________

### Step 2: Open Tasks Panel
- [ ] Locate the lower tabs section (Memos, Tasks, Notes, etc.)
- [ ] Click on "Tasks" tab
- **Expected:** Tasks panel opens, shows existing tasks or "No tasks" message with "+ Add Task" button
- **Result:** ___________
- **Notes:** ___________

### Step 3: Add Task - Open Modal
- [ ] Click "+ Add Task" button
- **Expected:** Modal opens with title "Add Task"
- **Expected Fields:**
  - Subject (text input, required)
  - Details (textarea, optional)
  - Due Date (date picker)
- **Result:** ___________
- **Notes:** ___________

### Step 4: Create Task with Due Date
- [ ] Enter Subject: "Test Task - Due Date Verification"
- [ ] Enter Details: "Testing due date display and completion toggle"
- [ ] Click on Due Date field
- **Expected:** Date picker opens
- [ ] Select a date (e.g., tomorrow or 3 days from now)
- **Expected:** Date is selected and shown in the field
- [ ] Click "Create Task" button
- **Expected:** Modal closes, toast shows "Task created"
- **Result:** ___________
- **Notes:** ___________

### Step 5: Verify Task in List
- [ ] Check Tasks panel for the newly created task
- **Expected Display:**
  - Task appears in the list
  - Subject is shown: "Test Task - Due Date Verification"
  - Details are shown: "Testing due date display and completion toggle"
  - Due date is displayed in format like "Due: 27 Feb 2026" or similar
  - Status badge shows "Open"
  - Checkbox on left is empty (not checked)
  - Task has blue border/background (open task styling)
- **Result:** ___________
- **Notes:** ___________

### Step 6: Toggle Complete
- [ ] Click the checkbox on the left of the task
- **Expected Immediate UI Changes:**
  - Checkbox fills with checkmark (✓)
  - Checkbox background changes to emerald/green
  - Task subject gets strikethrough
  - Task text color changes to gray
  - Status badge updates to "Completed"
  - Border/background changes from blue to white/gray
  - "Done: [today's date]" appears in task metadata
- **Expected Toast:** "Task completed"
- **Result:** ___________
- **Notes:** ___________

### Step 7: Verify Completion State
- [ ] Check task count at top of panel
- **Expected:** Shows "0 open, 1 completed" (or adjusted for existing tasks)
- [ ] Verify completed task styling persists
- **Result:** ___________
- **Notes:** ___________

### Step 8: Toggle Reopen
- [ ] Click the checkbox again (on the completed task)
- **Expected Immediate UI Changes:**
  - Checkbox empties (no checkmark)
  - Checkbox background returns to white/gray
  - Task subject strikethrough is removed
  - Task text color returns to dark gray/black
  - Status badge updates back to "Open"
  - Border/background returns to blue (open styling)
  - "Done: [date]" is removed from metadata
  - "Due: [original date]" is still shown
- **Expected Toast:** "Task reopened"
- **Result:** ___________
- **Notes:** ___________

### Step 9: Verify Reopened State
- [ ] Check task count at top of panel
- **Expected:** Shows "1 open, 0 completed" (or adjusted for existing tasks)
- [ ] Verify task is back in open state with original due date intact
- **Result:** ___________
- **Notes:** ___________

## Console Errors
Check browser console (F12) during test:
- [ ] No errors during page load
- [ ] No errors when opening Tasks panel
- [ ] No errors when opening Add Task modal
- [ ] No errors when creating task
- [ ] No errors when toggling complete
- [ ] No errors when toggling reopen

**Errors Found:** ___________

## Network Errors
Check Network tab (F12) during test:
- [ ] GraphQL query for tasks succeeds (200 status)
- [ ] Mutation for createTask succeeds (200 status)
- [ ] Mutation for updateTask (complete) succeeds (200 status)
- [ ] Mutation for updateTask (reopen) succeeds (200 status)

**Network Issues:** ___________

## Known Implementation Details

### Code References
- **Task panel renderer:** `src/js/shared/panels.js` lines 81-126
- **Toggle handler:** `src/js/inquiry-detail.js` lines 551-571
- **Add task handler:** `src/js/inquiry-detail.js` lines 575-592
- **Mutations:** `src/js/shared/queries.js` lines 642-645

### Expected Behavior
1. **Due date storage:** Stored as Unix epoch timestamp in `date_due` field
2. **Completion date:** Stored as Unix epoch timestamp in `date_complete` field
3. **Status field:** Toggles between "Open" and "Completed"
4. **Date display:** Formatted by `fmtDate()` utility (should show like "27 Feb 2026")

### Potential Issues to Watch For
- Date picker not opening
- Date not being saved (stays empty after selection)
- Due date not displaying in task list
- Completion date not showing after marking complete
- Status not updating after toggle
- UI not reflecting changes immediately
- Toast messages not appearing
- Multiple clicks required for toggle to work

## Final Result

**Overall Status:** [ ] PASS / [ ] FAIL

**Summary:** ___________

**Issues Found:** ___________

**Recommendations:** ___________
