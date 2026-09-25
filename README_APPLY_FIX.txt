Apply Loan fix:
- apply.html now loads config.js before script.js.
- GCash data goes to M (GCASH NAME) and N (GCASH NUMBER).
- Hands-On uses the borrower NAME already in column A plus a required ADDRESS sent to column O.
- For Hands-On, M and N remain blank.
- script.js validates the selected method and posts to the configured Google Apps Script Web App URL.

IMPORTANT: The Google Apps Script code must also be updated to accept these fields and append A:O.
