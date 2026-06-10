import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  UserPlus,
  Mail,
  Key,
  Phone,
  ShieldAlert,
  FileText,
} from "lucide-react";
import Button from "../../components/ui/Button";
import useCloudinaryUpload from "../../hooks/useCloudinaryUpload";
import { auth } from "../../services/firebase/config";
import { updateProfile } from "firebase/auth";
import { registerWithEmail } from "../../services/firebase/auth";
import { showModal } from "../../services/ui/modal";

export const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const {
    upload: uploadImage,
    loading: uploadLoading,
    error: uploadError,
  } = useCloudinaryUpload();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage(file, "profiles");
      setAvatarPreview(res.url);
      setAvatarUrl(res.url);
      // set form field if using form state
      if (typeof setFieldValue === "function") {
        setFieldValue("avatarUrl", res.url);
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
      await showModal({
        title: "Upload Failed",
        message: "Failed to upload avatar: " + (err.message || err),
        tone: "danger",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !businessName || !email || !password) {
      setError("Please fill out all mandatory fields.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Register and write users/{uid} profile with avatarUrl
      const profile = await registerWithEmail(email, password, {
        name,
        businessName,
        phone,
        avatarUrl,
      });

      // Debug: log Cloudinary URL and saved profile — remove later
      console.log("Cloudinary Upload URL:", avatarUrl);
      console.log("Firestore User Profile:", profile);
      console.log("Saved Avatar URL:", profile.avatarUrl);

      // ensure Firebase auth profile has photoURL set so other components can use user.photoURL
      try {
        const uid = profile?.uid;
        const user = auth?.currentUser;
        if (avatarUrl && user) {
          await updateProfile(user, { displayName: name, photoURL: avatarUrl });
        }
      } catch (updErr) {
        console.warn(
          "Failed to update auth profile with avatar:",
          updErr.message || updErr,
        );
      }

      navigate("/shop");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-green-600 text-white flex items-center justify-center mx-auto shadow-md">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight font-sans">
            Business Registration
          </h3>
          <p className="text-xs text-slate-400">
            Open a wholesale buyer outlet account in seconds.
          </p>
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Representative Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Amara Kalu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Registered Business/Store Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Amara Mini-Mart Ltd"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Contact Phone
            </label>
            <input
              type="tel"
              placeholder="+234 80 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Company Email Address *
            </label>
            <input
              type="email"
              placeholder="buyer@store.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Account Password *
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              Profile Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
            />
            {avatarPreview && (
              <img
                src={avatarPreview}
                alt="avatar preview"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-3.5 rounded-xl mt-2"
          >
            Create Wholesale Account
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-5 text-center text-xs flex justify-between">
          <span className="text-slate-400">Already registered?</span>
          <Link
            to="/login"
            className="font-bold text-brand-green-700 hover:underline"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
