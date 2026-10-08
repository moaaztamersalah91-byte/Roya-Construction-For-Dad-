# Roya Firebase

Roya uses Firebase Firestore without user login in this build. It uses Firestore Lite because this app uses direct CRUD reads/writes and does not require realtime snapshot listeners. Business data is separated by domain instead of being stored in one shared business-state document.

Collections used by the app:
- `projects`
- `expenses`
- `materials`
- `workers`
- `payments`
- `ledger`
- `extracts`
- `team`
- `teamArchive`
- `quotes`
- `workItems`
- `suppliers`
- `inventory`
- `dues`
- `deleted`
- `activities`
- `alerts`

For compatibility with the current frontend state model, each domain uses one Firestore document per item. Save operations reuse the known document IDs instead of re-reading every collection on each save.

The app also supports a one-time migration from the previous `royaData/main` document into the separated collections.

Publish `firestore.rules` in Firebase Console before using the hosted site.

## Deletion behavior
- Projects moved to Trash can be permanently deleted from the Trash.
- Inventory items can be deleted directly.
- Individual activity records can be deleted.
- The complete activity log can also be cleared after confirmation.


## Firestore structure — one document per item
This version stores each business item as its own Firestore document. Schema version 6 also normalizes legacy client-payment rows and persists team inactive status. For example, `projects/{projectId}` is one project, `extracts/{extractId}` is one extract, `inventory/{inventoryId}` is one inventory item, etc. The old `collection/main` array format is automatically migrated on first load.
