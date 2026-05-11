import { initializeApp as initializeAdminApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (!serviceAccountRaw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. " +
        "Download a service account key from Firebase Console " +
        "(Project Settings -> Service accounts -> Generate new private key) " +
        "and paste the JSON into .env as a single line."
    );
  }
  if (!projectId) {
    throw new Error("VITE_FIREBASE_PROJECT_ID is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountRaw);

  initializeAdminApp({
    credential: cert(serviceAccount),
    storageBucket: `${projectId}.appspot.com`,
  });

  console.log(`Firebase Admin SDK initialized for project: ${projectId}`);
}

export const auth = getAuth();
export const storage = getStorage();

export default { auth, storage };
