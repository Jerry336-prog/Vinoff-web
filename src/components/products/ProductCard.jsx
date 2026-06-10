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
      <div className="relative pt-[70%] bg-slate-100 overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name} 
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Category Label */}
        <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-brand-green-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-slate-200/50">
          {product.category}
        </span>
        
        {/* Carton Savings Banner */}
        {saving > 0 && (
          <span className="absolute top-4 right-4 bg-brand-yellow-400 text-brand-yellow-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-current" />
            Save {savingPercent}% By Carton
          </span>
        )}
      </div>

      {/* Product Information */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-base leading-snug hover:text-brand-green-700 transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing Toggle Controls */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-1 grid grid-cols-2 text-center text-xs font-semibold text-slate-600">
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
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-black text-brand-green-950">
              {formatCurrency(price)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
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
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
          {/* Quantity selector */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-3 py-2 text-slate-500 hover:text-brand-green-600 text-sm font-bold"
            >
              -
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-800">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="px-3 py-2 text-slate-500 hover:text-brand-green-600 text-sm font-bold"
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
