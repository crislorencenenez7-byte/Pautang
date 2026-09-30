import { getAdminDb, FieldValue } from "./_firebase.js";

function getBearerToken(req) {
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Please sign in first." });

    const { getAdminAuth } = await import("./_firebase.js");
    const user = await getAdminAuth().verifyIdToken(token);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const borrowerName = String(body.name || user.name || "").trim();
    const loanAmount = Number(body.amount);

    if (!borrowerName) return res.status(400).json({ error: "Name is required." });
    if (!Number.isFinite(loanAmount) || loanAmount < 1 || loanAmount > 5000) {
      return res.status(400).json({ error: "Loan amount must be between ₱1 and ₱5,000." });
    }

    const db = getAdminDb();
    const active = await db.collection("loanApplications")
      .where("uid", "==", user.uid)
      .where("status", "==", "Unpaid")
      .limit(1)
      .get();

    if (!active.empty) {
      return res.status(409).json({ error: "You already have an unpaid loan. Please pay it first." });
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
      releaseMethod: String(body.releaseMethod || "").trim(),
      releaseGcashName: String(body.releaseGcashName || "").trim(),
      releaseGcashNumber: String(body.releaseGcashNumber || "").trim(),
      releaseHandsOnAddress: String(body.releaseHandsOnAddress || "").trim(),
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(201).json({
      success: true,
      id: application.id,
      reference: application.id,
      name: borrowerName,
      amount: loanAmount,
      totalAmount,
      date: dateText,
      due_date: dueDateText,
      status: "Unpaid"
    });
  } catch (error) {
    console.error("Loan application error:", error);
    return res.status(500).json({ error: error?.message || "Unable to save application." });
  }
}
