PAUTANGMO AUTH + FIRESTORE FIX

1. Deploy this version to Vercel.
2. Vercel Environment Variables:
   - FIREBASE_SERVICE_ACCOUNT = your Firebase Admin service-account JSON (server-side only)
   - RESEND_API_KEY = your Resend API key (optional, for login notifications)
   - MAIL_FROM = your verified Resend sender (optional, for login notifications)
3. Firebase Authentication must have Email/Password enabled.
4. Firebase Firestore rules must be published from firestore.rules.
5. Register now creates Firebase Auth first, then saves users/{UID} through /api/user-profile.
6. The API verifies the Firebase ID token before writing the profile, so the client cannot choose an admin role.
7. If the API is unavailable, registration attempts a short direct Firestore fallback instead of hanging forever.
8. Verification email is sent only after registration. Login does not send another verification email.
9. The old Resend verification button was removed from login. Users verify their email first, then return and use Sign In.
10. Login notification email is non-blocking and never prevents a successful login.

SECURITY
- Never put FIREBASE_SERVICE_ACCOUNT or RESEND_API_KEY in frontend files.
- Do not allow users to self-assign the admin role.
