PAUTANGMO AUTH FIX

1. Deploy this version to Vercel.
2. In Firebase Console > Authentication > Settings > Authorized domains, make sure your Vercel domain is listed.
3. In Firebase Console > Authentication > Sign-in method, make sure Email/Password is enabled.
4. In Firestore Database > Rules, publish the firestore.rules file in this project.
5. Verification emails are Firebase Authentication emails, not Resend emails.
6. Resend is only used for the optional successful-login notification.
7. If registration succeeds but verification email does not arrive, use Login > Resend verification email and check Spam/Promotions.
8. The UI now has timeouts, so Firebase/network failures no longer leave the page stuck on an infinite loading state.
