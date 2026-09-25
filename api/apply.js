import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getDatabase() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed."});
  try {
    const {name, amount, releaseMethod, releaseGcashName, releaseGcashNumber} = req.body || {};
    const borrowerName = String(name || "").trim();
    const loanAmount = Number(amount);
    if (!borrowerName) return res.status(400).json({error:"Name is required."});
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) return res.status(400).json({error:"Amount must be greater than 0."});
    if (releaseMethod === "GCash" && (!String(releaseGcashName||"").trim() || !String(releaseGcashNumber||"").trim()))
      return res.status(400).json({error:"GCash name and number are required for GCash release."});

    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate()+15);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const tAmount = Math.round(loanAmount * 1.20 * 100) / 100;

    const db = getDatabase();
    const doc = await db.collection("loanApplications").add({
      name: borrowerName, amount: loanAmount, tAmount,
      date: fmt(today), dueDate: fmt(due), status:"Unpaid",
      releaseMethod: releaseMethod || "GCash",
      releaseGcashName: String(releaseGcashName||"").trim(),
      releaseGcashNumber: String(releaseGcashNumber||"").trim(),
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(201).json({success:true,id:doc.id,name:borrowerName,amount:loanAmount,t_amount:tAmount,date:fmt(today),due_date:fmt(due),status:"Unpaid"});
  } catch (error) {
    console.error(error);
    return res.status(500).json({error:"Unable to save application."});
  }
}
