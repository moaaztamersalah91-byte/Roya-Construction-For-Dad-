# Roya Construction Website + Dashboard

A multi-page company website and the existing Roya Construction Management dashboard, connected to the existing Firebase project `roya-dashboard-6311c`.

## Pages
- `index.html` — public home page
- `projects.html` — public project gallery, reads only `publicProjects` documents marked `published: true`
- `about.html` — company profile
- `contact.html` — authenticated contact form
- `login.html` — Google and email/password sign-in, plus account creation and password reset
- `account.html` — user's private message history and admin replies
- `dashboard.html` — existing operations dashboard with a new navy/gold visual theme and admin authentication gate
- `admin-messages.html` — private admin inbox and reply tool

## Preserve existing business data
The original `app.js` was preserved without modification. The former dashboard HTML was retained as `dashboard.html`; the new `index.html` is the public homepage. Existing business collection names and per-document storage behavior remain in `firebase.js`.

## Setup required before public deployment
Read `README-FIREBASE.md` carefully. The new `firestore.rules` is a proposed restrictive policy and is **not automatically deployed** by copying this folder. First provision the trusted admin UID in the `admins` collection using Firebase Console, then publish the rules and test the admin dashboard. Do not publish restrictive rules before confirming you have Firebase Console access and can create the admin document, or the current dashboard will be denied access until it is provisioned.

## Run locally
Serve the directory from a local HTTP server or static host; do not open the files via `file://`. Firebase Authentication popup sign-in requires an authorized domain. The Firebase project must have Google and Email/Password sign-in enabled and the domain added under Authentication → Settings → Authorized domains.

## Visual design
Premium construction style: navy, muted gold, architectural photography, responsive layouts, dark mode toggle, and English/Arabic language switch on the public site.
