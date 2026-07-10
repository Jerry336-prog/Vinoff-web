import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

async function promote(uid, role = "admin") {
  if (role !== "admin" && role !== "super_admin" && role !== "customer") {
    console.error("Error: Role must be 'admin', 'super_admin', or 'customer'");
    process.exit(1);
  }
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (email && password) {
      console.log(`Authenticating as ${email}...`);
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Authentication successful.");
    } else {
      console.warn("Warning: Running without authentication. Updates may fail under secure rules.");
      console.warn("To run with authentication, define ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.");
    }

    const ref = doc(db, "users", uid);
    await updateDoc(ref, { role });
    console.log(`Successfully updated user ${uid} role to '${role}'!`);
  } catch (error) {
    console.error("Error updating user role:", error);
  }
}

// Pass the UID and optional role from command line arguments
const uid = process.argv[2];
const role = process.argv[3] || "admin";
if (!uid) {
  console.error("Please provide a UID");
  console.error("Usage: node --env-file=.env promote_user.mjs <UID> [role]");
} else {
  promote(uid, role);
}

