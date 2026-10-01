# Email behavior

## Register
A new user is always created with `role: "client"` and receives a Firebase verification email.

## Login
A verified user can log in normally. The login page does NOT send another Firebase verification email.

An unverified user is blocked and gets a **Resend verification email** button.

A successful verified login calls `/api/login-notify`. That endpoint sends a login notification through Resend.

## Vercel environment variables
Add these in Vercel Project Settings > Environment Variables:

- `RESEND_API_KEY` = your Resend API key
- `MAIL_FROM` = a verified sender address, for example `PautangMo <noreply@yourdomain.com>`

Do NOT put the Resend API key in `login.html`, `register.html`, or any browser JavaScript.

Without these Vercel variables, login still works, but the login notification email cannot be sent.
