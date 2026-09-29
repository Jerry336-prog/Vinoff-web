import React, { useState, useContext, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MessageSquare,
  FileText,
  Truck,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Video,
  Play,
  Copy,
  Check,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Navigation,
  Store,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import ProductCard from '../../components/products/ProductCard';
import { AuthContext } from '../../context/AuthContext';
import { useProducts } from '../../hooks/useProducts';

const STORE_IMAGES = [
  {
    id: 1,
    url: '/store/store-2.jpg',
    title: 'Store Main Aisle & Stocked Shelves',
    caption: 'Overview of our fully stocked walk-in showroom featuring personal care, soaps, toothpastes, and wipes.',
  },
  {
    id: 2,
    url: '/store/store-3.jpg',
    title: 'Wholesale Carton Warehouse Stacks',
    caption: 'Pallets and stacks of original wholesale cartons including LUX, Windolene, and Astonish ready for bulk pickup.',
  },
  {
    id: 3,
    url: '/store/store-5.jpg',
    title: 'Premium Reed Diffusers & Fragrance Display',
    caption: 'Specialized fragrance shelves displaying Air Wick, Barcat, Ficol, and scented oils.',
  },
  {
    id: 4,
    url: '/store/store-4.jpg',
    title: 'Air Fresheners & Stella Body Sprays',
    caption: 'High-demand Stella car sprays, room diffusers, and commercial sanitizers.',
  },
  {
    id: 5,
    url: '/store/store-1.jpg',
    title: 'Toiletries & Cosmetics Counter Shelving',
    caption: 'Clean, organised glass display cabinets showcasing boxed toiletries, body sprays, and car fresheners.',
  },
];

export const Home = () => {
  const { user } = useContext(AuthContext);
  const { products, loading } = useProducts();
  const navigate = useNavigate();

  const [openFaq, setOpenFaq] = useState(null);

  // Store Showcase Gallery Lightbox State
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Video Direction Player State
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  const STORE_ADDRESS = `KADUNA PLAZA 1, BLOCK A, SHOP 22
INT'L CENTRE FOR COMMERCE
TRADE-FAIR COMPLEX, BADAGRY EXPRESS WAY, LAGOS`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(STORE_ADDRESS);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  // Top 4 products for homepage preview
  const filteredProducts = useMemo(() => {
    return Array.isArray(products) ? products : [];
  }, [products]);

  const faqs = [
    {
      q: "Where is your physical walk-in store located?",
      a: "Our physical wholesale shop is located at Kaduna Plaza 1, Block A, Shop 22, International Centre for Commerce, Trade-Fair Complex, Badagry Expressway, Lagos. You can visit us in person during business hours to inspect stocks or make walk-in bulk purchases!",
    },
    {
      q: "What products do you supply in bulk?",
      a: "We supply a full commercial range including toilet paper rolls, toothpaste, toothbrushes, air fresheners, body sprays, bath soaps, sponges, sanitizers, and industrial detergents.",
    },
    {
      q: "How do I place a bulk wholesale order online?",
      a: "Simply browse our catalog, select full cartons or loose units, and add items to your cart. Once ready, proceed to checkout or use the support chat to request a customized commercial invoice.",
    },
    {
      q: "How does payment verification work?",
      a: "Payments are made via direct bank transfer to Vinoff Wholesales Ltd (GTB Account). After transfer, upload your payment receipt screenshot directly in your support chat for instant admin verification.",
    },
    {
      q: "Can I get an official watermarked invoice for my business?",
      a: "Yes! Every order and invoice issued on our portal includes an official PDF download complete with itemized pricing, GTB bank details, and the official VINOFF & CO.NIG.LTD watermark.",
    },
  ];

  return (
    <div className="space-y-14">
      {/* 1. Hero Section with Live Motion Background Image */}
      <section className="relative rounded-3xl overflow-hidden text-white py-16 px-6 sm:px-10 md:px-14 text-center md:text-left shadow-2xl min-h-[460px] flex items-center">
        
        {/* Live Photo Image Background Container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src="/hero-toiletries-bg.jpg"
            alt="Vinoff Wholesale Warehouse Products"
            className="w-full h-full object-cover scale-105 animate-live-photo origin-center"
          />
        </div>

        {/* Dimming Dark Green & Slate Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green-950/95 via-slate-950/90 to-brand-green-950/85 pointer-events-none z-0" />

        {/* Hero Foreground Content */}
        <div className="max-w-3xl space-y-5 relative z-10">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Bulk Household Goods for <span className="text-brand-yellow-400">Commercial Outlets</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            Vinoff Wholesales supplies high-demand commercial toiletries, toothpastes, toothbrushes, air fresheners, body sprays, bath soaps, sponges, sanitizers, and detergents by the carton or unit.
          </p>



          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap gap-3.5 justify-center md:justify-start">
            <Link to="/shop">
              <Button variant="secondary" className="rounded-2xl shadow-lg px-6 py-3 text-xs sm:text-sm font-bold" icon={ArrowRight}>
                Browse Catalog Shelf
              </Button>
            </Link>
            <a href="#physical-store" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-2xl px-6 py-3 text-xs sm:text-sm font-bold transition-all">
              <Store className="w-4 h-4 text-brand-yellow-400" />
              Visit Walk-In Shop
            </a>
          </div>
        </div>
      </section>

      {/* 2. Physical Walk-In Store Showcase & Video Location Guide */}
      <section id="physical-store" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-green-800 bg-brand-green-50 px-3 py-1 rounded-full border border-brand-green-200">
              <Store className="w-3.5 h-3.5 text-brand-green-600" />
              Physical Showroom &amp; Walk-in Outlet
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
              Visit Our Wholesale Shop In Person
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Inspect our full stock of toiletries, oral care, air fresheners, soaps, and wholesale cartons live at our Trade Fair Complex store in Lagos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyAddress}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              {copiedAddress ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copiedAddress ? 'Address Copied!' : 'Copy Address'}
            </button>
            <a
              href="https://maps.google.com/?q=Trade+Fair+Complex+Badagry+Expressway+Lagos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-brand-green-700 hover:bg-brand-green-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              Google Maps
            </a>
          </div>
        </div>

        {/* Address Card Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-green-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-brand-green-800/40">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-brand-yellow-400 text-xs font-extrabold tracking-wider uppercase">
              <MapPin className="w-4 h-4 shrink-0" />
              Walk-in Store Address:
            </div>
            <p className="text-sm sm:text-base font-black tracking-tight leading-relaxed font-mono text-white">
              KADUNA PLAZA 1, BLOCK A, SHOP 22<br />
              <span className="text-slate-300 font-semibold text-xs sm:text-sm">INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX, BADAGRY EXPRESS WAY, LAGOS</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shrink-0 text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Operating Hours</span>
            <p className="text-xs font-extrabold text-brand-yellow-400">Monday &ndash; Saturday</p>
            <p className="text-[11px] font-medium text-white">8:00 AM &ndash; 6:00 PM</p>
          </div>
        </div>

        {/* 5 Real Walk-In Store Photos Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-brand-green-600" />
              Store Showroom Photos (Click to Enlarge)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">5 Real Walk-in Shop Photos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {STORE_IMAGES.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => setActiveImageIndex(idx)}
                className="group relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-xs cursor-pointer hover:shadow-md hover:border-brand-green-500 transition-all duration-300 h-48 sm:h-52"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-brand-yellow-400 tracking-wider block">
                    Photo {idx + 1} of 5
                  </span>
                  <p className="text-xs font-bold leading-tight line-clamp-1">{img.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Location & Direction Player Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                <Video className="w-3.5 h-3.5 text-rose-600" />
                Location Video Guide
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1">
                How to Find Our Shop (Video Route Guide)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Watch step-by-step video directions from Badagry Expressway into Kaduna Plaza 1.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* HTML5 Video Player Container */}
            <div className="lg:col-span-7 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative min-h-[260px] sm:min-h-[320px] flex items-center justify-center group">
              {!videoError ? (
                <div className="relative w-full h-full">
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el) {
                        el.muted = true;
                        el.volume = 0;
                      }
                    }}
                    src="/store/VINOFF_CO_walkthrough.MP4"
                    poster="/store/store-2.jpg"
                    className="w-full h-full object-cover max-h-[420px]"
                    autoPlay
                    muted
                    loop
                    playsInline
                    onVolumeChange={(e) => {
                      e.target.muted = true;
                      e.target.volume = 0;
                    }}
                    onPlay={(e) => {
                      e.target.muted = true;
                      e.target.volume = 0;
                      setIsVideoPlaying(true);
                    }}
                    onPause={() => setIsVideoPlaying(false)}
                    onError={() => setVideoError(true)}
                  />

                  {/* Permanently Muted Badge Overlay (No Unmute Control) */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700/60 text-[10px] font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md z-10 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Muted Walkthrough Video</span>
                  </div>

                  {/* Custom Play/Pause & Fullscreen Overlay Controls (No Volume Button) */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          if (videoRef.current.paused) {
                            videoRef.current.play();
                          } else {
                            videoRef.current.pause();
                          }
                        }
                      }}
                      className="bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-md border border-slate-700 transition"
                      title={isVideoPlaying ? "Pause Video" : "Play Video"}
                    >
                      {isVideoPlaying ? <X className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          if (videoRef.current.requestFullscreen) {
                            videoRef.current.requestFullscreen();
                          } else if (videoRef.current.webkitRequestFullscreen) {
                            videoRef.current.webkitRequestFullscreen();
                          }
                        }
                      }}
                      className="bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-md border border-slate-700 transition"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Video Placeholder Card if video is pending upload */
                <div className="p-8 text-center text-white space-y-4 max-w-md my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                    <Video className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-sm text-white">
                      Location Direction Video Placeholder
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Upload your recorded video file named <code className="bg-slate-800 px-1.5 py-0.5 rounded text-brand-yellow-400 text-[11px]">direction-video.mp4</code> to the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white text-[11px]">public/store/</code> directory.
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 bg-brand-yellow-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-extrabold">
                      🎥 Ready for Direction Video MP4
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Written Step-by-Step Directions Card */}
            <div className="lg:col-span-5 space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-brand-green-700" />
                Step-by-Step Route Directions
              </h4>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-2xs">
                  <span className="w-6 h-6 rounded-lg bg-brand-green-100 text-brand-green-800 font-extrabold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <strong className="font-bold text-slate-900 block">Badagry Expressway</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Drive along Badagry Expressway towards the International Trade Fair Complex axis.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-2xs">
                  <span className="w-6 h-6 rounded-lg bg-brand-green-100 text-brand-green-800 font-extrabold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <strong className="font-bold text-slate-900 block">Enter Centre for Commerce</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Turn into the main entrance of the International Centre for Commerce (ICC gate).
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-2xs">
                  <span className="w-6 h-6 rounded-lg bg-brand-green-100 text-brand-green-800 font-extrabold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <strong className="font-bold text-slate-900 block">Kaduna Plaza 1, Block A</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Proceed to Kaduna Plaza 1 section and locate Block A.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 shadow-2xs">
                  <span className="w-6 h-6 rounded-lg bg-brand-yellow-400 text-slate-950 font-extrabold flex items-center justify-center shrink-0 text-xs">
                    4
                  </span>
                  <div>
                    <strong className="font-bold text-slate-900 block">Shop 22 &mdash; Vinoff Wholesale</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Look for Shop 22 with the VINOFF logo sign. Our team will be waiting to assist you!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Store Photos */}
      {activeImageIndex !== null && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-black uppercase text-brand-yellow-400 tracking-wider block">
                  Store Photo {activeImageIndex + 1} of {STORE_IMAGES.length}
                </span>
                <h4 className="font-extrabold text-sm">{STORE_IMAGES[activeImageIndex].title}</h4>
              </div>
              <button
                onClick={() => setActiveImageIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px]">
              <img
                src={STORE_IMAGES[activeImageIndex].url}
                alt={STORE_IMAGES[activeImageIndex].title}
                className="max-w-full max-h-[65vh] object-contain"
              />

              {/* Prev / Next Controls */}
              <button
                onClick={() =>
                  setActiveImageIndex((prev) => (prev === 0 ? STORE_IMAGES.length - 1 : prev - 1))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() =>
                  setActiveImageIndex((prev) => (prev === STORE_IMAGES.length - 1 ? 0 : prev + 1))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Footer Caption */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-300">
              {STORE_IMAGES[activeImageIndex].caption}
            </div>
          </div>
        </div>
      )}

      {/* 3. Featured Product Preview — 4 Products with Toggle & Auth Guard */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green-700 bg-brand-green-50 px-3 py-1 rounded-full border border-brand-green-200">
              Featured Products
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-2">
              A Glimpse of Our Wholesale Stock
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between Carton &amp; Piece pricing. Sign in to place an order.
            </p>
          </div>
          <Link to="/shop" className="shrink-0">
            <Button variant="outline" className="rounded-xl px-5 py-2.5 text-xs font-bold" icon={ArrowRight}>
              View Full Catalog
            </Button>
          </Link>
        </div>

        {/* 4-Product Grid using full ProductCard with toggle, auth & stock guards */}
        {loading ? (
          <div className="text-center py-10">
            <div className="w-7 h-7 border-3 border-brand-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-xs font-semibold mt-2.5">Loading featured products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id || product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
            <p className="text-slate-500 text-xs font-bold">No products available right now.</p>
          </div>
        )}

        {/* Always-visible View Full Catalog CTA */}
        <div className="text-center pt-1">
          <Link to="/shop">
            <Button variant="secondary" className="rounded-2xl px-8 py-3 text-sm font-bold shadow-sm" icon={ArrowRight}>
              Browse All {filteredProducts.length > 0 ? `${filteredProducts.length} Products` : 'Products'} in Catalog
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. 3-Step Commercial Ordering Flow */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl relative overflow-hidden">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow-400 bg-brand-yellow-400/10 px-3 py-1 rounded-full border border-brand-yellow-400/20">
            Simplified Ordering System
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            How Wholesale Fulfillment Works
          </h2>
          <p className="text-slate-400 text-xs">
            Three simple steps to order bulk inventory and receive official watermarked commercial invoices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-green-500/20 text-brand-green-400 border border-brand-green-500/30 flex items-center justify-center font-black text-base">
              01
            </div>
            <h3 className="font-extrabold text-white text-sm">Select Bulk Shelf Items</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Browse our commercial catalog shelf and choose your required quantities in full cartons or individual loose units.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-yellow-500/20 text-brand-yellow-400 border border-brand-yellow-500/30 flex items-center justify-center font-black text-base">
              02
            </div>
            <h3 className="font-extrabold text-white text-sm">Receive Itemized Commercial Invoice</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Get an instant itemized invoice containing bank details and the official <strong className="text-brand-yellow-400">VINOFF &amp; CO.NIG.LTD</strong> watermark for PDF download.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-base">
              03
            </div>
            <h3 className="font-extrabold text-white text-sm">Bank Transfer &amp; Chat Clearance</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pay via bank transfer and upload your transaction receipt directly in your live support chat for immediate admin verification and dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Comprehensive Product Scope & Capabilities */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-brand-green-950">
            Engineered for Commercial Procurement
          </h2>
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
            Toothpastes, toothbrushes, body sprays, air fresheners, soaps, sponges, tissues &amp; detergents
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-xs mb-1">Genuine Toiletries &amp; Oral Care</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Direct wholesale supply for toothpastes, toothbrushes, body sprays, air fresheners, bath soaps, and cleaning sponges.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-xs mb-1">Real-time Support Desk</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chat directly with authorized administrators to customize quantities, issue invoices, and clear payments.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-xs mb-1">Watermarked PDF Invoices</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant PDF invoice generator with official <strong className="text-slate-800">VINOFF &amp; CO.NIG.LTD</strong> watermarks for corporate records.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-brand-green-50 text-brand-green-700 flex items-center justify-center mb-3">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-xs mb-1">Express Freight Logistics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dedicated distribution logistics supply retail outlets, supermarkets, and regional warehouses efficiently.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Interactive FAQ Section */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xs">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-brand-green-700" />
            Help &amp; Documentation
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500">
            Find answers to common questions about wholesale ordering, invoicing, and clearance.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-800 outline-none transition"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-brand-green-700 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Bottom Call to Action Banner */}
      <section className="bg-gradient-to-br from-brand-green-900 to-slate-900 border border-brand-green-800 rounded-3xl p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <span className="bg-brand-yellow-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Ready to Supply Your Business?
          </span>
          <h3 className="font-extrabold text-white text-xl sm:text-2xl tracking-tight">
            Start Procurement with Vinoff Wholesales
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Create an account or sign in to browse product stocks, request official watermarked invoices, and communicate with dedicated support admins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!user ? (
            <>
              <Link to="/register">
                <Button variant="secondary" className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg">
                  Register Business Account
                </Button>
              </Link>
              <Link to="/login">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-all outline-none"
                >
                  Sign In
                </button>
              </Link>
            </>
          ) : (
            <Link to="/shop">
              <Button variant="secondary" className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg" icon={ArrowRight}>
                Go to Product Catalog
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
