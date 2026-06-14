// Firebase SDK – fully initialized with Auth, Firestore, and Analytics
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Helper to read environment variables safely in different runtimes
const getEnv = (key) => {
  if (typeof process !== "undefined" && process?.env && process.env[key])
    return process.env[key];
  if (
    typeof import.meta !== "undefined" &&
    import.meta?.env &&
    import.meta.env[key]
  )
    return import.meta.env[key];
  if (typeof window !== "undefined" && window.__env && window.__env[key])
    return window.__env[key];
  return undefined;
};

const firebaseConfig = {
  apiKey:
    getEnv("VITE_FIREBASE_API_KEY") ||
    getEnv("REACT_APP_FIREBASE_API_KEY"),
  authDomain:
    getEnv("VITE_FIREBASE_AUTH_DOMAIN") ||
    getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId:
    getEnv("VITE_FIREBASE_PROJECT_ID") ||
    getEnv("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket:
    getEnv("VITE_FIREBASE_STORAGE_BUCKET") ||
    getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId:
    getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") ||
    getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId:
    getEnv("VITE_FIREBASE_APP_ID") ||
    getEnv("REACT_APP_FIREBASE_APP_ID"),
  measurementId:
    getEnv("VITE_FIREBASE_MEASUREMENT_ID") ||
    getEnv("REACT_APP_FIREBASE_MEASUREMENT_ID"),
};

let app;
let auth;
let db;

try {
  // Validate minimal config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Missing Firebase configuration (apiKey or projectId). Check your .env variables.",
    );
  }

  // Initialize Firebase app
  app = initializeApp(firebaseConfig);

  // Auth instance – used for login, register, logout, onAuthStateChanged
  auth = getAuth(app);

  // Firestore instance – used for all database reads/writes
  db = getFirestore(app);

  // Analytics (optional – only in browser context)
  try {
    getAnalytics(app);
  } catch (e) {
    // Analytics unavailable in some environments (e.g. SSR)
    // Not fatal
  }
} catch (err) {
  console.error("Failed to initialize Firebase:", err.message || err);
  // Fallback exports still provided (may be null) to avoid hard crash in runtime
  app = app || null;
  auth = auth || null;
  db = db || null;
}

export { app, auth, db };
export default firebaseConfig;
