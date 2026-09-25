# PautangMo — Improved

This version keeps the original Google Sheets A-K layout and adds a redesigned responsive interface.

## Included

- Apply Loan: GCash or Hands-On release
- 20% interest calculation
- T-AMOUNT automatically calculated
- Due date automatically +15 days
- Pay Loan: GCash or Hands-On
- GCash payment proof upload
- Payment records in columns L-O
- Admin must verify payment before setting K STATUS to Paid
- Mobile-friendly modern design

## Important

The browser must NEVER contain:
- Firebase service-account JSON
- Firebase private key
- Admin passwords/secrets

`config.js` contains only the public Google Apps Script endpoint and the GCash receiving details displayed to users.

## Google Apps Script

Copy `google-apps-script/Code.gs` into your Apps Script project and deploy it as a Web App. The deployment must have permission to use the spreadsheet and Google Drive if you enable payment-proof uploads.

After changing Apps Script code, create a new deployment version. Keep using the `/exec` URL in `config.js`.

## GCash

Edit `config.js`:

- `GCASH_NAME`
- `GCASH_NUMBER`
- `GCASH_QR_URL`

Do not put a secret/admin password there.

## Firebase API

`api/apply.js` remains available for the existing Firebase/Vercel backend. Vercel should have `FIREBASE_SERVICE_ACCOUNT` configured as a single JSON environment variable.

## Payment verification

The included Google Apps Script intentionally does NOT mark a loan as Paid when a payment is submitted. A human/admin should verify the amount and proof first, then set column K to `Paid`.

For a production admin panel, use authenticated Firebase Admin/Authentication or another server-side authentication mechanism rather than a password embedded in frontend code.
