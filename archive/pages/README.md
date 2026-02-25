# Soft Archive: Pages

This directory stores pages that are not part of active app flows but are kept for recovery/reference.

## Restore process

1. Locate the archived file and original path in `archive/pages/mapping.json`.
2. Move the archived file back to its original path.
3. Re-add navigation links (for example in `dev/index.html`) if needed.
4. Verify the page in `npm run dev`.

## Notes

- This is a **soft archive**, not deletion.
- Archived pages are intentionally excluded from primary user navigation.
# Archived Pages

This folder stores soft-archived pages that are no longer part of active app flows.

## Restore Process

1. Copy the archived file back to its original path from `archive/pages/path-map.json`.
2. Re-add any entry links (for example in `dev/index.html`) if needed.
3. Verify page scripts and config still match current app conventions.

## Notes

- Archived pages are kept in source form for quick restore.
- Active core pages should stay in `dev/` and `html/admin/`.
