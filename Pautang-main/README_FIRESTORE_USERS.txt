# Firestore Users Fix

This version creates users/{UID} on registration and also repairs an existing Firebase Authentication account that has no users/{UID} document when that account successfully logs in. Existing profiles are not overwritten, so an existing admin role is preserved.

IMPORTANT: Copy firestore.rules into Firebase Console > Firestore Database > Rules and click Publish. Rules in this repository do not automatically deploy to Firebase.

After deploying the website, test with an existing verified account. If the account is in Authentication but not Firestore, log in once; the site will create the missing users/{UID} document as role client.

If the browser reports permission-denied, the published Firestore Rules do not match this file or the rules were not published.
