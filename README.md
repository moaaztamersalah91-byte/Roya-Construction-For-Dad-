# BuildCore — Construction Management Frontend V2

Frontend foundation for a real construction-management system.

## New in V2
- Company name on every project.
- Optional company manager name; it can be left empty.
- Flexible project statuses controlled by the owner/partners: In progress, Completed, Starting soon, Finishing soon.
- Project deletion is separated from financial history: deleting a project card does NOT delete its financial ledger, costs, or estimated profit.
- Detailed expense records: item, category, project, amount, supplier/beneficiary, payment method, date, reference and details.
- Project details modal with status/progress editing.
- Confirmation before deleting a project.
- Financial ledger remains visible after a project is deleted.
- Responsive desktop/mobile layout.
- Arabic RTL / English LTR foundation.
- Dark mode.

## Important
This is still a frontend prototype with mock state. It is intentionally structured for the next production phase:
1. Firebase Authentication
2. Firestore collections
3. Firebase Storage if project documents/images are needed
4. Role-based permissions for owner, partners and employees
5. Firestore Security Rules
6. Immutable/archived financial records so deleted projects never erase accounting history

## Run
Open `index.html` in a browser.


## V9 Extract Editor
- Document-first extract workflow with a Word-like editor.
- Saved extracts reopen with their written content and formatting.
- Formatting controls reflect the current selection.
- Owner/user selects the extract status.
