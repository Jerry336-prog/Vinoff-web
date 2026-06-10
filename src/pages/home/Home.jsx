import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, ClipboardCheck, Truck, ArrowRight, Star } from 'lucide-react';
import Button from '../../components/ui/Button';

export const Home = () => {
  const benefits = [
    {
      icon: ShieldCheck,
      title: "Verified Bulk Quality",
      description: "Direct relationship with manufacturers ensures 100% genuine household cleaning toiletries and items."
    },
    {
      icon: MessageSquare,
      title: "Real-time Support Chat",
      description: "Negotiate prices, request custom invoices, and submit screenshots of bank slips for fast checkout."
    },
    {
      icon: ClipboardCheck,
      title: "Instant Digital Invoices",
      description: "Receive itemized billing sheets automatically for company accounts and logistical bookkeeping."
    },
    {
      icon: Truck,
      title: "Express Commercial Freight",
      description: "Bulk distribution channels offer subsidized delivery routes for retail locations and warehouses."
    }
  ];

  return (
    <div className="space-y-16">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-green-950 via-slate-900 to-slate-950 text-white py-20 px-8 md:px-12 text-center md:text-left">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-yellow-400 via-emerald-400 to-slate-900" />
        
        <div className="max-w-3xl space-y-6 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-green-500/20 text-brand-green-400 border border-brand-green-500/35 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
            <Star className="w-3.5 h-3.5 fill-current text-brand-yellow-400" />
            Leading Toiletries Wholesaler
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Bulk Household Goods for <span className="text-brand-yellow-400">Smart Retailers</span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
            Vinoff Wholesales supplies cleaning toiletries, detergents, sanitizers, and floor cleaners by the carton. Negotiate direct invoice pricing and clear payments instantly via bank transfer chats.
          </p>
          <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
            <Link to="/shop">
              <Button variant="secondary" className="rounded-xl shadow-lg p-3" icon={ArrowRight}>
                Browse Catalog Shelf
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" className="rounded-xl border-white/20 p-3 text-slate-300 hover:text-white hover:bg-white/10">
                Register Business Outlet
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Value Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-green-950">
            Engineered for Wholesale Commerce
          </h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Premium amenities built around commercial buyer needs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1.5">{benefit.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Carton Savings Banner */}
      <section className="bg-brand-yellow-50 border border-brand-yellow-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="bg-brand-yellow-200 text-brand-yellow-900 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Carton Pack Discounts
          </span>
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
            Save up to 25% automatically when purchasing cartons!
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            Product cards calculate carton vs unit prices instantly. Add full cases to meet your wholesale limits and secure discounted shipment logistics.
          </p>
        </div>
        <Link to="/shop">
          <Button variant="primary" className="p-3 rounded-xl flex-shrink-0">
            Open Wholesale Catalog
          </Button>
        </Link>
      </section>
      
    </div>
  );
};

export default Home;
