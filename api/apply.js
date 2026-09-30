import { getAdminAuth, getAdminDb, FieldValue } from "./_firebase.js";

function getBearerToken(req) {
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function sendAdminLoanEmail(application) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const to = process.env.ADMIN_EMAIL || from;
  if (!apiKey || !from || !to) return { sent: false, skipped: true };

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#10221a">
      <h2 style="color:#08713c">New PautangMo Loan Application</h2>
      <p>A new loan was submitted and saved in <b>loanApplications</b>.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><td><b>Reference</b></td><td>${application.reference}</td></tr>
        <tr><td><b>Name</b></td><td>${application.name}</td></tr>
        <tr><td><b>Email</b></td><td>${application.email}</td></tr>
        <tr><td><b>Amount</b></td><td>₱${Number(application.amount).toLocaleString("en-PH", {minimumFractionDigits:2})}</td></tr>
        <tr><td><b>Interest</b></td><td>20%</td></tr>
        <tr><td><b>Total Amount</b></td><td>₱${Number(application.totalAmount).toLocaleString("en-PH", {minimumFractionDigits:2})}</td></tr>
        <tr><td><b>Date</b></td><td>${application.date}</td></tr>
        <tr><td><b>Due Date</b></td><td>${application.dueDate}</td></tr>
        <tr><td><b>Status</b></td><td>${application.status}</td></tr>
        <tr><td><b>Release Method</b></td><td>${application.releaseMethod || "—"}</td></tr>
        <tr><td><b>GCash Name</b></td><td>${application.releaseGcashName || "—"}</td></tr>
        <tr><td><b>GCash Number</b></td><td>${application.releaseGcashNumber || "—"}</td></tr>
        <tr><td><b>Hands-On Address</b></td><td>${application.releaseHandsOnAddress || "—"}</td></tr>
      </table>
      <p style="margin-top:20px">Open the PautangMo Admin Dashboard to review the application.</p>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `New Loan Application • ${application.reference}`, html })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("Admin loan email failed:", response.status, text);
    return { sent: false };
  }
  return { sent: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Please sign in first." });

    const user = await getAdminAuth().verifyIdToken(token);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const borrowerName = String(body.name || user.name || "").trim();
    const loanAmount = Number(body.amount);
    const releaseMethod = String(body.releaseMethod || "").trim();

    if (!borrowerName) return res.status(400).json({ error: "Name is required." });
    if (!Number.isFinite(loanAmount) || loanAmount < 1 || loanAmount > 5000) {
      return res.status(400).json({ error: "Loan amount must be between ₱1 and ₱5,000." });
    }
    if (!["GCash", "Hands-On"].includes(releaseMethod)) {
      return res.status(400).json({ error: "Choose GCash or Hands-On for the release method." });
    }
    if (releaseMethod === "GCash" && (!String(body.releaseGcashName || "").trim() || !String(body.releaseGcashNumber || "").trim())) {
      return res.status(400).json({ error: "GCash name and number are required." });
    }
    if (releaseMethod === "Hands-On" && !String(body.releaseHandsOnAddress || "").trim()) {
      return res.status(400).json({ error: "Hands-On address is required." });
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const active = await db.collection("loanApplications")
      .where("uid", "==", user.uid)
      .where("status", "==", "Unpaid")
      .limit(1)
      .get();

    if (!active.empty || userData.loanActive === true) {
      return res.status(409).json({ error: "Your borrowing access is currently locked because you have an unpaid loan. Please use Pay Loan first." });
    }

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 15);
    const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const dateText = isoDate(today);
    const dueDateText = isoDate(dueDate);
    const totalAmount = Math.round(loanAmount * 1.2 * 100) / 100;

    const application = await db.collection("loanApplications").add({
      uid: user.uid,
      email: user.email || "",
      name: borrowerName,
      amount: loanAmount,
      interestRate: 20,
      totalAmount,
      date: dateText,
      dueDate: dueDateText,
      status: "Unpaid",
      releaseMethod,
      releaseGcashName: releaseMethod === "GCash" ? String(body.releaseGcashName || "").trim() : "",
      releaseGcashNumber: releaseMethod === "GCash" ? String(body.releaseGcashNumber || "").trim() : "",
      releaseHandsOnAddress: releaseMethod === "Hands-On" ? String(body.releaseHandsOnAddress || "").trim() : "",
      createdAt: FieldValue.serverTimestamp()
    });

    await userRef.set({
      name: borrowerName,
      email: user.email || "",
      role: userData.role || "client",
      loanActive: true,
      borrowingEnabled: false,
      activeLoanId: application.id,
      activeLoanReference: application.id,
      activeLoanDueDate: dueDateText,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    const result = {
      reference: application.id,
      name: borrowerName,
      email: user.email || "",
      amount: loanAmount,
      totalAmount,
      interestRate: 20,
      date: dateText,
      dueDate: dueDateText,
      status: "Unpaid",
      releaseMethod,
      releaseGcashName: releaseMethod === "GCash" ? String(body.releaseGcashName || "").trim() : "",
      releaseGcashNumber: releaseMethod === "GCash" ? String(body.releaseGcashNumber || "").trim() : "",
      releaseHandsOnAddress: releaseMethod === "Hands-On" ? String(body.releaseHandsOnAddress || "").trim() : ""
    };

    const emailResult = await sendAdminLoanEmail(result).catch(error => {
      console.error("Admin loan email exception:", error);
      return { sent: false };
    });

    return res.status(201).json({
      success: true,
      id: application.id,
      ...result,
      adminEmailSent: !!emailResult.sent
    });
  } catch (error) {
    console.error("Loan application error:", error);
    return res.status(500).json({ error: error?.message || "Unable to save application." });
  }
}
