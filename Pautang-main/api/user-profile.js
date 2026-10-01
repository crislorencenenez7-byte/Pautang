import { getAdminAuth, getAdminDb, FieldValue } from "./_firebase.js";

function getBearerToken(req) {
  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed." });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token is required." });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = String(body.name || decoded.name || "").trim();
    const email = String(body.email || decoded.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    const db = getAdminDb();
    const ref = db.collection("users").doc(decoded.uid);
    const existing = await ref.get();
    const existingRole = existing.exists ? (existing.data()?.role || "client") : "client";

    const data = {
      name,
      email,
      role: existingRole,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!existing.exists) data.createdAt = FieldValue.serverTimestamp();

    await ref.set(data, { merge: true });

    return res.status(200).json({
      success: true,
      uid: decoded.uid,
      role: existingRole
    });
  } catch (error) {
    console.error("User profile error:", error);
    const authError = String(error?.code || "").startsWith("auth/");
    return res.status(authError ? 401 : 500).json({
      success: false,
      message: error?.message || "Unable to save the Firestore user profile."
    });
  }
}
