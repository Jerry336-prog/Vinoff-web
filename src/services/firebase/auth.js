// Real Firebase Authentication service
// Uses Firebase Auth SDK for login/register/logout
// User profiles (name, businessName, role) are stored in Firestore /users/{uid}

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

/**
 * Sign in an existing user with email + password.
 * Returns the Firestore user profile (including role).
 */
export const loginWithEmail = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(credential.user.uid);
  return profile;
};

/**
 * Register a new user, then create their Firestore profile document.
 * New users are always assigned 'customer' role by default.
 * Role can be changed to 'admin' from Firestore Console or the Admin Customers page.
 */
export const registerWithEmail = async (
  email,
  password,
  additionalData = {},
) => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const { uid } = credential.user;

  const profile = {
    uid,
    email,
    name: additionalData.name || email.split("@")[0],
    businessName: additionalData.businessName || "Wholesale Storefront",
    phone: additionalData.phone || "",
    avatarUrl: additionalData.avatarUrl || null,
    role: "customer", // Always customer on register; promote via Firestore
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", uid), profile);

  // Debug logs — remove these after verification
  console.log("Firestore User Profile:", profile);
  console.log("Saved Avatar URL:", profile.avatarUrl);

  return profile;
};

/**
 * Sign out the currently authenticated user.
 */
export const logoutUser = () => signOut(auth);

/**
 * Fetch a user's Firestore profile document by UID.
 * Returns null if the profile doesn't exist.
 */
export const getUserProfile = async (uid) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid, ...snap.data() };
  }
  return null;
};

/**
 * Subscribe to Firebase Auth state changes.
 * The callback receives the raw Firebase user object (or null on logout).
 * Use this in AuthContext to drive reactive auth state.
 *
 * @param {function} callback - Called with (firebaseUser | null)
 * @returns {function} Unsubscribe function — call on component unmount
 */
export const subscribeToAuthChanges = (callback) => {
  return firebaseOnAuthStateChanged(auth, callback);
};
