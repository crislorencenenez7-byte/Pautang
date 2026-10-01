import { getAdminAuth, getAdminDb, FieldValue } from "./_firebase.js";

function getBearerToken(req) {
  const h = req.headers?.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function clean(v) { return String(v ?? "").trim(); }

function htmlEscape(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from || !to) return { sent: false, skipped: true };

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error("Resend email failed:", r.status, text);
    return { sent: false, error: text || `HTTP ${r.status}` };
  }
  return { sent: true };
}

function loanEmailHtml(a, recipientLabel) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#10221a">
  <h2 style="color:#08713c">PautangMo Loan Application</h2>
  <p>Hello ${htmlEscape(recipientLabel)},</p>
  <p>A loan application has been successfully recorded.</p>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
    <tr><td><b>Reference Number</b></td><td>${htmlEscape(a.reference)}</td></tr>
    <tr><td><b>Name</b></td><td>${htmlEscape(a.name)}</td></tr>
    <tr><td><b>Email</b></td><td>${htmlEscape(a.email)}</td></tr>
    <tr><td><b>Loan Amount</b></td><td>₱${Number(a.amount).toLocaleString("en-PH",{minimumFractionDigits:2})}</td></tr>
    <tr><td><b>Interest</b></td><td>20%</td></tr>
    <tr><td><b>Total Amount</b></td><td>₱${Number(a.totalAmount).toLocaleString("en-PH",{minimumFractionDigits:2})}</td></tr>
    <tr><td><b>Date</b></td><td>${htmlEscape(a.date)}</td></tr>
    <tr><td><b>Due Date</b></td><td>${htmlEscape(a.dueDate)}</td></tr>
    <tr><td><b>Status</b></td><td>${htmlEscape(a.status)}</td></tr>
    <tr><td><b>Release Method</b></td><td>${htmlEscape(a.releaseMethod || "—")}</td></tr>
    <tr><td><b>GCash Name</b></td><td>${htmlEscape(a.releaseGcashName || "—")}</td></tr>
    <tr><td><b>GCash Number</b></td><td>${htmlEscape(a.releaseGcashNumber || "—")}</td></tr>
    <tr><td><b>Hands-On Address</b></td><td>${htmlEscape(a.releaseHandsOnAddress || "—")}</td></tr>
  </table>
  <p><b>Keep your Reference Number:</b> ${htmlEscape(a.reference)}</p>
  </body></html>`;
}

async function sendLoanEmails(application) {
  const adminEmail = clean(process.env.ADMIN_EMAIL);
  const results = {};

  if (application.email) {
    results.borrower = await sendEmail({
      to: application.email,
      subject: `PautangMo Loan Confirmation • ${application.reference}`,
      html: loanEmailHtml(application, application.name)
    });
  } else {
    results.borrower = { sent: false, skipped: true };
  }

  if (adminEmail) {
    results.admin = await sendEmail({
      to: adminEmail,
      subject: `New PautangMo Loan • ${application.reference}`,
      html: loanEmailHtml(application, "Admin")
    });
  } else {
    results.admin = { sent: false, skipped: true };
  }

  return results;
}

async function recordLoanInSheet(application) {
  const endpoint = process.env.GOOGLE_SHEET_URL;
  if (!endpoint) throw new Error("GOOGLE_SHEET_URL is not configured in Vercel.");

  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "recordLoan", ...application })
  });
  const text = await r.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (!r.ok || !data.success) throw new Error(data.error || "Google Sheets recording failed.");
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Please sign in first." });

    const user = await getAdminAuth().verifyIdToken(token);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = clean(body.name || user.name);
    const amount = Number(body.amount);
    const releaseMethod = clean(body.releaseMethod);
    const releaseGcashName = clean(body.releaseGcashName);
    const releaseGcashNumber = clean(body.releaseGcashNumber);
    const releaseHandsOnAddress = clean(body.releaseHandsOnAddress);

    if (!name) return res.status(400).json({ error: "Name is required." });
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000) return res.status(400).json({ error: "Loan amount must be between ₱1 and ₱5,000." });
    if (!["GCash", "Hands-On"].includes(releaseMethod)) return res.status(400).json({ error: "Choose GCash or Hands-On for the release method." });
    if (releaseMethod === "GCash" && (!releaseGcashName || !releaseGcashNumber)) return res.status(400).json({ error: "GCash name and number are required." });
    if (releaseMethod === "Hands-On" && !releaseHandsOnAddress) return res.status(400).json({ error: "Hands-On address is required." });

    const db = getAdminDb();
    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const active = await db.collection("loanApplications").where("uid","==",user.uid).where("status","==","Unpaid").limit(1).get();
    if (!active.empty || userData.loanActive === true) return res.status(409).json({ error: "Your borrowing access is currently locked because you have an unpaid loan. Please use Pay Loan first." });

    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + 15);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const date = iso(today);
    const dueDate = iso(due);
    const totalAmount = Math.round(amount * 1.2 * 100) / 100;

    // Create the reference before writing so the same value is used everywhere.
    const loanRef = db.collection("loanApplications").doc();
    const reference = loanRef.id;
    const application = {
      uid: user.uid,
      email: user.email || "",
      name,
      amount,
      interestRate: 20,
      totalAmount,
      date,
      dueDate,
      status: "Unpaid",
      reference,
      releaseMethod,
      releaseGcashName: releaseMethod === "GCash" ? releaseGcashName : "",
      releaseGcashNumber: releaseMethod === "GCash" ? releaseGcashNumber : "",
      releaseHandsOnAddress: releaseMethod === "Hands-On" ? releaseHandsOnAddress : "",
      createdAt: FieldValue.serverTimestamp()
    };

    await loanRef.set(application);

    try {
      await recordLoanInSheet({ ...application, createdAt: new Date().toISOString() });
    } catch (sheetError) {
      await loanRef.set({ sheetSyncStatus: "Failed", sheetSyncError: sheetError.message, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return res.status(502).json({ error: `Loan saved, but Google Sheets recording failed: ${sheetError.message}` });
    }

    await loanRef.set({ sheetSyncStatus: "Recorded", sheetRecordedAt: FieldValue.serverTimestamp() }, { merge: true });

    await userRef.set({
      name,
      email: user.email || "",
      role: userData.role || "client",
      loanActive: true,
      borrowingEnabled: false,
      activeLoanId: reference,
      activeLoanReference: reference,
      activeLoanDueDate: dueDate,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    const result = { reference, name, email: user.email || "", amount, totalAmount, interestRate: 20, date, dueDate, status: "Unpaid", releaseMethod, releaseGcashName: application.releaseGcashName, releaseGcashNumber: application.releaseGcashNumber, releaseHandsOnAddress: application.releaseHandsOnAddress };
    const emails = await sendLoanEmails(result).catch(e => { console.error("Loan email exception:", e); return { borrower:{sent:false,error:e.message}, admin:{sent:false,error:e.message} }; });

    return res.status(201).json({ success: true, id: reference, ...result, sheetRecorded: true, borrowerEmailSent: !!emails.borrower?.sent, adminEmailSent: !!emails.admin?.sent });
  } catch (error) {
    console.error("Loan application error:", error);
    return res.status(500).json({ error: error?.message || "Unable to save application." });
  }
}
