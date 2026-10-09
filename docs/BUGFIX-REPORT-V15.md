# Roya Construction Management — Bug Fix & QA Report (V15)

## Fixed

1. **Client payment CRUD schema**
   - Fixed loss of the payment reference number during create/edit.
   - Added separate reference and notes fields to the payments table.
   - Added backward-compatible normalization for older 5-field payment rows.

2. **Team member deactivate/reactivate**
   - Removed the previous index-based LocalStorage state.
   - Inactive status is now part of the persisted team record.
   - UI now reflects inactive state and changes the action to "تفعيل".
   - Editing/restoring a team member preserves inactive status.

3. **Extract editor / spell-check**
   - Reconnected the spell-check status to editor input.
   - Added visible spell-check status and suggestions.
   - Avoided rewriting `contenteditable.innerHTML` on every keystroke, which could destroy rich-text formatting.
   - Prevented repeated global `selectionchange` listeners.

4. **Extract project selection**
   - Preserved the original project name in the `<option value>` so bilingual translation cannot corrupt the stored project value.

5. **Bilingual user-data preservation**
   - Prevented the translation layer from rewriting user-entered project names inside dynamic UI content and select values.

6. **Rich-text sanitization**
   - Sanitized saved/displayed extract HTML with an allow-list.
   - Removed executable/script/event-handler content while preserving normal document formatting.

7. **Project status safety**
   - Added a missing-record guard to prevent a runtime exception when saving a deleted/nonexistent project.

8. **Firestore migration**
   - Fixed partial-migration behavior where existing per-collection documents could cause data remaining in `royaData/main` to be skipped.
   - Legacy root data is now merged only into missing/empty domains, then migrated.
   - Firestore schema version bumped to 6.
   - Document IDs are sanitized before being used as Firestore document IDs.

## QA performed

- JavaScript syntax check: PASS (`app.js`, `firebase.js`)
- Navigation regression: PASS — all 17 navigation items switched to the correct page.
- Modal regression: PASS — all 13 modal entry points opened/closed correctly.
- Project create/edit flow: PASS.
- Client payment create/edit flow: PASS, including reference + notes.
- Team add/edit/deactivate flow: PASS.
- Extract create flow: PASS.
- Spell-check UI update: PASS.
- Bilingual toggle smoke test: PASS.
- Extract HTML sanitization test: PASS — executable HTML was removed from the saved/displayed document.
- Duplicate static HTML IDs: none found.
- Static event-handler selectors: no missing static target IDs found.

## Firebase security note

The current project does not implement Firebase Authentication. Therefore `firestore.rules` was not changed to require `request.auth != null`, because doing so without adding/enabling an authentication flow would immediately break the existing Firestore synchronization.

For production deployment, Firebase Authentication and role-based Firestore rules should be enabled before exposing the database publicly.
