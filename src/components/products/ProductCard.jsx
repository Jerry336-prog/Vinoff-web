import React, { useState, useContext } from 'react';
import { CartContext } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { ShoppingCart, RefreshCw, Layers, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export const ProductCard = ({ product }) => {
  const { addToCart } = useContext(CartContext);
  const [isCarton, setIsCarton] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const price = isCarton ? product.cartonPrice : product.unitPrice;
  const saving = (product.unitPrice * product.unitsPerCarton) - product.cartonPrice;
  const savingPercent = Math.round((saving / (product.unitPrice * product.unitsPerCarton)) * 100);

  const handleAddToCart = () => {
    addToCart(product, quantity, isCarton);
    // Visual indicator reset
    setQuantity(1);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-brand-green-300 group">
      
      {/* Product Image Panel */}
      <div className="relative bg-slate-100 overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Category Label */}
        <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-brand-green-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-slate-200/50">
          {product.category}
        </span>
        
        {/* Carton Savings Banner */}
        {saving > 0 && (
          <span className="absolute top-4 right-4 bg-brand-yellow-400 text-brand-yellow-950 text-[9px] sm:text-[10px] font-extrabold px-2 py-1 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            <span className="hidden sm:inline">Save</span> {savingPercent}%
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug hover:text-brand-green-700 transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing Toggle Controls */}
        <div className="mt-3 sm:mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-1 grid grid-cols-2 text-center text-[10px] sm:text-xs font-semibold text-slate-600">
          <button
            onClick={() => setIsCarton(true)}
            className={`py-2 rounded-xl transition-all ${
              isCarton 
                ? 'bg-brand-green-600 text-white shadow-sm' 
                : 'hover:text-slate-800'
            }`}
          >
            Carton Price
          </button>
          <button
            onClick={() => setIsCarton(false)}
            className={`py-2 rounded-xl transition-all ${
              !isCarton 
                ? 'bg-brand-green-600 text-white shadow-sm' 
                : 'hover:text-slate-800'
            }`}
          >
            Unit Price
          </button>
        </div>

        {/* Pricing Stats */}
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <div>
            <p className="text-lg sm:text-2xl font-black text-brand-green-950 tracking-tight">
              {formatCurrency(price)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">
              {isCarton 
                ? `Per Carton (${product.unitsPerCarton} units)` 
                : `Per Individual Unit`}
            </p>
          </div>
          {isCarton && saving > 0 && (
            <div className="text-right">
              <p className="text-xs text-brand-green-600 font-bold">
                Save {formatCurrency(saving)}
              </p>
              <p className="text-[9px] text-slate-400">vs buying units</p>
            </div>
          )}
        </div>

        {/* Add To Cart Form */}
        <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 sm:gap-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-between border border-slate-200 rounded-xl bg-slate-50 shrink-0">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-slate-500 hover:text-brand-green-600 text-sm font-bold"
            >
              -
            </button>
            <span className="w-6 sm:w-8 text-center text-xs font-bold text-slate-800">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-slate-500 hover:text-brand-green-600 text-sm font-bold"
            >
              +
            </button>
          </div>

          <Button
            variant={isCarton ? "primary" : "secondary"}
            onClick={handleAddToCart}
            className="flex-1 rounded-xl"
            size="sm"
            icon={ShoppingCart}
          >
            Add {isCarton ? 'Carton' : 'Unit'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ProductCard;
