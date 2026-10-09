# Message deletion feature

This project includes message deletion controls in the website inboxes:

- Admin inbox (`admin-messages.html`): the administrator can delete an unanswered contact message after confirmation.
- User account (`account.html`): the signed-in user can delete their own original message (or the saved replied conversation) after confirmation.
- User account: the user can delete only the reply; the original message is recreated in `contactMessages` so it returns to the admin inbox.
- When the admin replies, the original document is removed from `contactMessages` and the reply/conversation is saved in `contactReplies` for the user account.

No Firebase configuration, Firestore rules, or existing database records were changed as part of preparing this ZIP. Deletion actions affect records only when a user clicks a delete control and confirms in the running site.
