import React, { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { unwrapApiRecord } from "../utils/apiResponse";
import { getAvatarUrl } from "../utils/avatar";

export const AuthContext = createContext(null);

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  const firstName = rawUser.firstName || "";
  const lastName = rawUser.lastName || "";
  const companyName = rawUser.profile?.companyName || rawUser.companyName || "";
  const avatarUrl = getAvatarUrl(rawUser);

  return {
    ...rawUser,
    id: rawUser._id || rawUser.id,
    uid: rawUser._id || rawUser.id, // For backward compatibility
    name: rawUser.name || `${firstName} ${lastName}`.trim() || rawUser.email,
    businessName: companyName,
    avatarUrl,
    photoURL: avatarUrl,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("vinoff_user");
      return stored ? normalizeUser(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify and hydrate current user from backend
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("vinoff_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get("/api/auth/me");
      const normalized = normalizeUser(unwrapApiRecord(res));
      setUser(normalized);
      localStorage.setItem("vinoff_user", JSON.stringify(normalized));
      return normalized;
    } catch (err) {
      console.warn("Session check failed:", err.message);
      // If token invalid, clear state
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem("vinoff_token");
        localStorage.removeItem("vinoff_user");
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const payload = unwrapApiRecord(res) || {};
      const { user: rawUser, token } = payload;
      if (token) {
        localStorage.setItem("vinoff_token", token);
      }
      const normalized = normalizeUser(rawUser);
      setUser(normalized);
      localStorage.setItem("vinoff_user", JSON.stringify(normalized));
      return normalized;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/register", userData);
      const payload = unwrapApiRecord(res) || {};
      const { user: rawUser, token } = payload;
      if (token) {
        localStorage.setItem("vinoff_token", token);
      }
      const normalized = normalizeUser(rawUser);
      setUser(normalized);
      localStorage.setItem("vinoff_user", JSON.stringify(normalized));
      return normalized;
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
      await api.post("/api/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem("vinoff_token");
      localStorage.removeItem("vinoff_user");
      setUser(null);
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.patch("/api/users/me", profileData);
      const updatedUser = normalizeUser(unwrapApiRecord(res));
      setUser(updatedUser);
      localStorage.setItem("vinoff_user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      setError(err.message || "Profile update failed");
      throw err;
    }
  };

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "subAdmin" ||
    user?.role === "superadmin" ||
    user?.role === "super_admin";
  const isSuperAdmin =
    user?.role === "superadmin" ||
    user?.role === "super_admin" ||
    user?.role === "admin";

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    isAdmin,
    isSuperAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
