import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export function getFirebaseAdmin() {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured in Vercel.");

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the complete service-account JSON into Vercel.");
  }

  if (!serviceAccount.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing project_id.");
  }

  // PautangMo currently uses this Firebase project.
  if (serviceAccount.project_id !== "pautangmo-f6fe0") {
    throw new Error(`Wrong Firebase project in FIREBASE_SERVICE_ACCOUNT: ${serviceAccount.project_id}. Expected pautangmo-f6fe0.`);
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdmin());
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdmin());
}

export { FieldValue };
