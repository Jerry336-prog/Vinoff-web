import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Error: Missing Firebase configuration environment variables.");
  console.error("Please run the script using Node's env-file feature (Node.js v20.6+), for example:");
  console.error("  node --env-file=.env promote_user.mjs <UID>");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function promote(uid) {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { role: "admin" });
    console.log(`Successfully promoted user ${uid} to admin!`);
  } catch (error) {
    console.error("Error promoting user:", error);
  }
}

// Pass the UID from command line arguments
const uid = process.argv[2];
if (!uid) {
  console.error("Please provide a UID");
} else {
  promote(uid);
}
