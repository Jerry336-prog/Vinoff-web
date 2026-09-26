import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { UserPlus, Mail, Key, Phone, ShieldAlert, Building, MapPin, CheckCircle2 } from "lucide-react";
import Button from "../../components/ui/Button";

export const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    businessType: "Wholesale Buyer",
    address: "",
    city: "",
    state: "Lagos",
    country: "Nigeria",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all required fields (First Name, Last Name, Email, Password).");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        companyName: formData.companyName.trim(),
        businessType: formData.businessType,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
      };

      const user = await register(payload);
      if (user.role === "admin" || user.role === "subAdmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/shop");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto my-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-brand-green-600 text-white flex items-center justify-center mx-auto shadow-md">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-2xl tracking-tight">
            Wholesale Account Registration
          </h3>
          <p className="text-xs text-slate-400">
            Create your account to order wholesale goods, request invoices, and message sales admins.
          </p>
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                placeholder="e.g. Chinedu"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                placeholder="e.g. Okafor"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  placeholder="buyer@business.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  placeholder="+234 80 1234 5678"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Password *
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                  required
                  minLength={6}
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                  required
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Optional Business Details */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-brand-green-600" />
              Commercial / Business Information (Optional)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  Company / Store Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  placeholder="e.g. Vinoff Mega Stores Ltd"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                >
                  <option value="Wholesale Buyer">Wholesale Buyer</option>
                  <option value="Supermarket / Retail Chain">Supermarket / Retail Chain</option>
                  <option value="Commercial Facility / Hospital">Commercial Facility / Hospital</option>
                  <option value="Distributor / Reseller">Distributor / Reseller</option>
                  <option value="Other">Other Business</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Delivery Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Plot 12 Commercial Way, Industrial Estate"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Ikeja"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Lagos"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 transition outline-none"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full py-3.5 rounded-xl mt-4"
          >
            Create Wholesale Account
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center text-xs flex justify-between items-center">
          <span className="text-slate-400">Already have an account?</span>
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
