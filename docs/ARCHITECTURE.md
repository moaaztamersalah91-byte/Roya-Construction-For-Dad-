# BuildCore — Frontend Architecture

## Folders
- `index.html` — application shell and UI views.
- `styles.css` — global design system, responsive layout, component styles.
- `app.js` — frontend state, interactions, demo data and UI behavior.
- `docs/` — product and implementation notes.
- `firebase/` — reserved for the Firebase integration phase; no Firebase credentials are stored here.

## Data boundaries
The frontend currently uses demo/local state. Before Firebase:
1. Keep projects separate from immutable financial history.
2. Store project deletion as an auditable event, not as destructive deletion of financial records.
3. Give users roles (`owner`, `partner`, `employee`) and enforce them in Firestore Security Rules.
4. Store uploaded invoices/project images in Firebase Storage and metadata in Firestore.
5. Treat PDF exports as generated documents, not as the source of truth.

## Navigation
The sidebar is intentionally scrollable so adding more modules never hides navigation items.

## Extracts
The extract editor is document-oriented: long-form writing, formatting, counters and draft persistence in the prototype. Production PDF generation and cloud persistence belong to the Firebase/backend phase.
