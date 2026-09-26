import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  X, User, Building, Mail, Phone, MapPin, CheckCircle2, 
  AlertCircle, Loader2, Save, ShoppingBag, FileText, LogOut, Camera
} from 'lucide-react';
import Button from '../ui/Button';
import { toast } from '../../context/ToastContext';

export const ProfileDrawer = ({ isOpen, onClose }) => {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    businessType: '',
    address: '',
    city: '',
    state: 'Lagos',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate form when user data loads or drawer opens
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || (user.name ? user.name.split(' ')[0] : '') || '',
        lastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || '',
        phone: user.phone || '',
        companyName: user.profile?.companyName || user.companyName || user.businessName || '',
        businessType: user.profile?.businessType || user.businessType || 'Wholesale Buyer',
        address: user.profile?.address || user.address || user.profile?.deliveryAddress?.street || '',
        city: user.profile?.city || user.city || user.profile?.deliveryAddress?.city || '',
        state: user.profile?.state || user.state || user.profile?.deliveryAddress?.state || 'Lagos',
      });
    }
  }, [user, isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSuccessMsg('');
      setErrorMsg('');
      // Revoke preview URL to avoid memory leaks
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && !user) return null;

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
      setTimeout(() => { setSuccessMsg(''); }, 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || user?.name || 'Wholesale Buyer';
  const initials = (formData.firstName?.charAt(0) || user?.name?.charAt(0) || 'W') + 
                   (formData.lastName?.charAt(0) || user?.name?.split(' ')?.[1]?.charAt(0) || 'B');

  return (
    <div className={`fixed inset-0 z-50 transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}>
      
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer sheet (Quarter to third of screen width) */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[440px] md:w-[32vw] min-w-[340px] max-w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-green-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Account Profile</h2>
              <p className="text-[11px] text-slate-500 font-medium">Wholesale buyer credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            title="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* User Header Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4.5 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-green-500/15 rounded-full blur-xl" />
            <div className="flex items-center gap-3.5 relative z-10">
              {/* Avatar with camera overlay */}
              <div className="relative shrink-0 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                {avatarPreview || user?.avatarUrl ? (
                  <img
                    src={avatarPreview || user.avatarUrl}
                    alt="Avatar"
                    className="w-12 h-12 rounded-2xl object-cover shadow-md ring-2 ring-brand-yellow-400/60"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-yellow-500 to-brand-yellow-400 text-slate-950 font-black text-base flex items-center justify-center shadow-md">
                    {initials.toUpperCase()}
                  </div>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-2xl bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate leading-snug">{displayName}</h3>
                <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Wholesale Outlet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Name</label>
                <input 
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Name</label>
                <input 
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <div className="relative">
                <input 
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 text-xs font-medium cursor-not-allowed outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                  Verified
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
              <div className="relative">
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* Business / Company Details */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Business Outlet</h4>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company / Store Name</label>
                <div className="relative">
                  <input 
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Supermarket Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                  />
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Business Type</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                >
                  <option value="Supermarket Chain">Supermarket Chain</option>
                  <option value="Retail Store">Retail Store</option>
                  <option value="Wholesale Distributor">Wholesale Distributor</option>
                  <option value="Pharmacy/Chemist">Pharmacy/Chemist</option>
                  <option value="Mini-Mart / Grocery">Mini-Mart / Grocery</option>
                  <option value="Wholesale Buyer">Wholesale Buyer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Street Address</label>
                <div className="relative">
                  <input 
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. 12 Marina Road"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">City</label>
                  <input 
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Ikeja"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</label>
                  <input 
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Lagos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mt-2 shadow-sm"
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
          </form>

          {/* Quick links & Sign out */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link 
              to="/orders" 
              onClick={onClose}
              className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-brand-green-600" />
                <span>My Orders</span>
              </div>
              <span className="text-[10px] text-slate-400">&rarr;</span>
            </Link>

            <Link 
              to="/invoices" 
              onClick={onClose}
              className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-brand-green-600" />
                <span>Invoices & Statements</span>
              </div>
              <span className="text-[10px] text-slate-400">&rarr;</span>
            </Link>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-2.5 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition mt-2"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;
