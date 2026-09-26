import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  User, Building, Phone, MapPin, CheckCircle2,
  AlertCircle, Loader2, Save, Camera, ShieldCheck, Mail, Key,
} from 'lucide-react';
import Button from '../../components/ui/Button';

const AdminProfile = () => {
  const { user, updateProfile } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || (user.name ? user.name.split(' ')[0] : '') || '',
        lastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || '',
        phone: user.phone || '',
        companyName: user.profile?.companyName || user.companyName || user.businessName || '',
        businessType: user.profile?.businessType || user.businessType || '',
        address: user.profile?.address || user.address || '',
        city: user.profile?.city || user.city || '',
        state: user.profile?.state || user.state || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      let payload;
      if (avatarFile) {
        payload = new FormData();
        Object.entries(formData).forEach(([k, v]) => payload.append(k, v));
        payload.append('avatar', avatarFile);
      } else {
        payload = formData;
      }
      await updateProfile(payload);
      setSuccessMsg('Profile updated successfully!');
      setAvatarFile(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || user?.name || 'Administrator';
  const avatarSrc = avatarPreview || user?.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-brand-green-700" />
            Admin Profile
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage your administrator credentials, personal details, and account settings.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-brand-green-50 text-brand-green-800 border border-brand-green-200 text-[11px] font-bold px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Account
        </span>
      </div>

      {/* Hero Avatar Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-green-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-32 h-32 bg-brand-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-5">
          {/* Avatar with camera overlay */}
          <div
            className="relative shrink-0 group cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
            title="Change profile photo"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-yellow-400/50 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-yellow-500 to-brand-yellow-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-brand-yellow-400/40">
                {(formData.firstName?.charAt(0) || 'A').toUpperCase()}
                {(formData.lastName?.charAt(0) || 'D').toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight truncate">{displayName}</h2>
            <p className="text-sm text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              {user?.email}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Administrator
              </span>
              <span className="inline-flex items-center gap-1.5 bg-brand-yellow-500/20 text-brand-yellow-300 border border-brand-yellow-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
                <Key className="w-3 h-3" />
                Full Access
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1 cursor-pointer hover:text-slate-300 transition"
               onClick={() => avatarInputRef.current?.click()}>
              <Camera className="w-3 h-3" /> Click avatar to change photo
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold p-4 rounded-2xl flex items-center gap-2.5 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-4 rounded-2xl flex items-center gap-2.5 animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-green-600" />
            Personal Information
          </h3>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="e.g. John"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="e.g. Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3.5 py-2.5 text-sm font-medium cursor-not-allowed outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                VERIFIED
              </span>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="08012345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Business/Address Details */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-green-600" />
            Business &amp; Address Details
          </h3>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company / Organization Name</label>
            <div className="relative">
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Vinoff International Ltd"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
              <Building className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Business Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role / Business Type</label>
            <input
              type="text"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              placeholder="e.g. Wholesale Distributor, Admin Staff"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Street Address</label>
            <div className="relative">
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. 12 Marina Road, Lagos Island"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* City + State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Ikeja"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Lagos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md min-w-[200px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile Updates
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminProfile;
