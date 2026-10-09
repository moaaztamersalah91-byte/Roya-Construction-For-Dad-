# Roya Construction — Firebase setup and security

This project uses the existing Firebase project `roya-dashboard-6311c`. The dashboard's existing business collections and schema are preserved; the public website uses separate `publicProjects` documents so internal project records, finance, workers, suppliers, and other operations are never published by accident.

## Sign-in methods
Enable Google and Email/Password in Firebase Console → Authentication → Sign-in method. Add your real deployment domains under Authentication → Settings → Authorized domains. Never put passwords, service-account keys, or Admin SDK credentials in this frontend.

## Important: provision the first admin safely
The dashboard does **not** grant admin rights merely because someone signs in. After publishing the updated `firestore.rules` and before using the dashboard:

1. Open `login.html` on your hosted site and sign in with the Google or email account you want to use as the owner/admin.
2. In Firebase Console → Authentication → Users, copy that user's **UID**.
3. Open Firestore Database → Data → Start collection (if needed) / add document. Create collection `admins`, with document ID exactly equal to the UID. The document may contain a harmless field such as `createdAt` (string) and `note` (string). Do not add an admin role to a user-editable profile document.
4. Open `dashboard.html` and sign in with the same account. If already open, reload it.

Only a trusted Firebase Console operator can create `admins/{uid}`: the rules explicitly deny client-side writes to the `admins` collection. If you have no other admin access in Firebase Console, do not publish rules until you have confirmed you can manage Firestore rules and documents in the console.

## Firestore rules
`firestore.rules` is a security policy file. It is not applied just by putting it in the ZIP. Review it and publish it in Firebase Console → Firestore Database → Rules (or deploy it with the Firebase CLI from a configured project). The policy:

- restricts the existing internal business collections to provisioned admins;
- allows public reads only for `publicProjects` documents whose `published` field is `true`;
- lets a signed-in user create a contact message tied to their UID and read only their own message threads;
- lets admins read all contact messages and write only the reply/status fields;
- denies all other collection access.

**Do not publish the new rules before the first admin UID is provisioned and tested.** Once these rules are active, the dashboard's old collections will be inaccessible until an admin document exists. The app data is not deleted by changing rules; access is denied until the admin is correctly provisioned.

## Public project cards
To publish a public project, create a document in `publicProjects` with fields such as:

- `title` (string)
- `summary` (string)
- `category` (string)
- `location` (string, optional)
- `imageUrl` (HTTPS URL, optional)
- `published` (boolean, must be `true` for public visibility)

Do not copy private costs, payment information, customer personal data, workers' data, or supplier records into public project documents. Public cards are intentionally separate from internal `projects` records.

## Contact and replies
Contact form submission requires sign-in so the message can be associated with the sender's UID. The account page queries only the signed-in user's messages. The admin inbox is `admin-messages.html` and requires an `admins/{uid}` document. Replies are written to `adminReply`, `status`, and `repliedAt` only.

## Hosting and testing
Host the folder on an HTTPS static host (for example Firebase Hosting). ES modules and Firebase Authentication popup flows should be tested on the actual hosted domain, not only by opening HTML files with `file://`. Before launch, test an admin account and a separate regular user account, verify that the user cannot access the dashboard or another user's messages, and confirm that internal collections deny access when signed out.

The frontend cannot verify your live Firebase Console settings or publish the rules for you. This ZIP includes the rules and the setup steps; live deployment and initial admin provisioning are deliberate manual steps.

## Contact messages updates
- The contact form requires the signed-in user's name, email, and message text.
- The Contact page includes direct WhatsApp and phone links for `01011950992`, plus the company location `Egypt, Cairo, Giza`.
- After an admin replies, that thread is removed from the unanswered admin inbox while the user can still read it in My Account.
- Users can delete their own message thread (which also deletes the reply) or delete only the admin reply; deleting only the reply reopens the message in the admin inbox. Admins can delete unanswered messages.
- The updated `firestore.rules` now allows these owner/admin actions. Publish the rules before testing these actions against Firebase. The `firebase.json` file references `firestore.rules` for deployment.

