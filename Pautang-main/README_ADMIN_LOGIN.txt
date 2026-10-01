PAUTANGMO UPDATED

NEW:
- Mobile-first navigation
- Separate Apply Loan page
- Separate Pay Loan page
- Admin Login page
- Admin dashboard is protected by Firebase Authentication
- Existing 20% interest / 15-day due-date flow should remain
- GCash / Hands-On UI included

ADMIN LOGIN SETUP:
1. In Firebase Console -> Authentication -> Sign-in method, enable Email/Password.
2. Create the admin user email/password in Firebase Authentication.
3. Make sure firebase-config.js contains the SAME Firebase Web App config used by your project.
4. Deploy the files to Vercel.
5. Open /admin-login.html.
6. Sign in with the Firebase admin account.
7. The login redirects to /admin.html.
8. The admin dashboard still needs Firestore rules that restrict admin operations to your admin account/role.

IMPORTANT:
- Do NOT put Firebase service-account JSON/private keys in this frontend ZIP.
- Do NOT put a real GCash password/PIN here.
- GCash name/number/QR should be configured through a protected admin/backend setting.
