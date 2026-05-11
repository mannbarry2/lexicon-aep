import { initializeApp as initializeAdminApp, cert, getApps } from "firebase-admin/app";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  try {
    // For Firebase Admin, we'll use the client-side config but with databaseURL added
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      appId: process.env.VITE_FIREBASE_APP_ID,
      // This is just to make the initialization work
      databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`,
    };

    // Initialize with client-side credentials
    initializeAdminApp(firebaseConfig);
    
    console.log("Firebase Admin SDK initialized successfully with client credentials");
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

// Export the Firebase Admin services
export const auth = getAuth();
export const storage = getStorage();

// Export default objects for use in other files
export default { auth, storage };