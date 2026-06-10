import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "REACT_APP_FIREBASE_API_KEY",
  authDomain: "REACT_APP_FIREBASE_AUTH_DOMAIN",
  projectId: "REACT_APP_FIREBASE_PROJECT_ID",
  storageBucket: "REACT_APP_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REACT_APP_FIREBASE_APP_ID",
  measurementId: "REACT_APP_FIREBASE_MEASUREMENT_ID"
};

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
