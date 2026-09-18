import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getDatabase() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );

    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const { name, amount } = req.body || {};

    const borrowerName = String(name || "").trim();
    const loanAmount = Number(amount);

    if (!borrowerName) {
      return res.status(400).json({
        error: "Name is required."
      });
    }

    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0."
      });
    }

    const today = new Date();

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 15);

    const dateText =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    const dueDateText =
      dueDate.getFullYear() +
      "-" +
      String(dueDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dueDate.getDate()).padStart(2, "0");

    const db = getDatabase();

    const application = await db
      .collection("loanApplications")
      .add({
        name: borrowerName,
        amount: loanAmount,
        date: dateText,
        dueDate: dueDateText,
        status: "Unpaid",
        createdAt: FieldValue.serverTimestamp()
      });

    return res.status(201).json({
      success: true,
      id: application.id,
      name: borrowerName,
      amount: loanAmount,
      date: dateText,
      due_date: dueDateText,
      status: "Unpaid"
    });

  } catch (error) {
    console.error("Loan application error:", error);

    return res.status(500).json({
      error: "Unable to save application."
    });
  }
}
