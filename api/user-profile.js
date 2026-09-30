import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getDatabase() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");
    }

    initializeApp({
      credential: cert(JSON.parse(raw))
    });
  }

  return getFirestore();
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required."
      });
    }

    if (!getApps().length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");
      initializeApp({ credential: cert(JSON.parse(raw)) });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const db = getDatabase();
    const ref = db.collection("users").doc(decoded.uid);
    const snapshot = await ref.get();
    const body = req.body || {};
    const name = String(body.name || decoded.name || "").trim();
    const email = String(body.email || decoded.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required."
      });
    }

    if (snapshot.exists) {
      await ref.set(
        {
          name,
          email,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } else {
      await ref.set({
        name,
        email,
        role: "client",
        createdAt: FieldValue.serverTimestamp()
      });
    }

    return res.status(200).json({
      success: true,
      uid: decoded.uid,
      role: snapshot.exists ? snapshot.data().role || "client" : "client"
    });
  } catch (error) {
    console.error("User profile error:", error);

    const status =
      error?.code === "auth/id-token-expired" ||
      error?.code === "auth/argument-error"
        ? 401
        : 500;

    return res.status(status).json({
      success: false,
      message:
        error?.message || "Unable to save the Firestore user profile."
    });
  }
}
