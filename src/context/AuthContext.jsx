import React, { createContext, useState, useEffect } from "react";
import {
  subscribeToAuthChanges,
  getUserProfile,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from "../services/firebase/auth";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;
    setLoading(true);
    unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(
            profile || { uid: firebaseUser.uid, email: firebaseUser.email },
          );
        } catch (err) {
          setError(err.message || "Failed to load user profile");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithEmail(email, password);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, additionalData) => {
    setLoading(true);
    setError(null);
    try {
      const newUser = await registerWithEmail(email, password, additionalData);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (err) {
      setError(err.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
