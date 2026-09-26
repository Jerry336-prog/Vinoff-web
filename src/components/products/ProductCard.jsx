import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { ShoppingCart, Package, Box, AlertTriangle, Lock } from 'lucide-react';
import Button from '../ui/Button';

export const ProductCard = ({ product }) => {
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const { showModal } = useToast();
  const navigate = useNavigate();

  const [isCarton, setIsCarton] = useState(true); // true = Carton mode, false = Loose Piece / Unit mode
  const [quantity, setQuantity] = useState(1);

  const price = isCarton ? product.cartonPrice : product.unitPrice;
  const currentStock = isCarton ? (product.stock ?? product.cartonStock ?? 0) : (product.unitStock ?? product.stock ?? 0);
  const isOutOfStock = currentStock <= 0;

  const handleAddToCart = () => {
    // 1. Auth Guard for Unauthenticated Users
    if (!user) {
      showModal({
        title: "Account Required to Order",
        message: "Please sign in or register a wholesale account to place an order and add products to your cart.",
        confirmText: "Sign In",
        cancelText: "Register Account",
        type: "info",
        onConfirm: () => navigate("/login"),
        onCancel: () => navigate("/register"),
      });
      return;
    }

    // 2. Out of Stock Guard
    if (isOutOfStock) {
      showModal({
        title: "Item Out of Stock",
        message: "Not able to order this because it's out of stock currently.",
        confirmText: "Understood",
        type: "warning",
      });
      return;
    }

    // 3. Insufficient Quantity Guard
    if (quantity > currentStock) {
      showModal({
        title: "Insufficient Stock",
        message: `Only ${currentStock} ${isCarton ? 'carton(s)' : 'piece(s)'} available in stock currently. Please reduce your quantity.`,
        confirmText: "OK",
        type: "warning",
      });
      return;
    }

    // 4. Add item to cart
    addToCart(product, quantity, isCarton);
    setQuantity(1);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full group">
      {/* Product Image & Category Badge */}
      <div className="relative bg-slate-50 aspect-[4/3] w-full overflow-hidden flex items-center justify-center p-4">
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-slate-200 shadow-xs">
          {product.category || 'Wholesale'}
        </span>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-2">
            <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-brand-green-700 transition-colors line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing Mode Toggle: Carton vs Loose Unit / Piece */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Select Buying Format:</span>
            <span className="text-brand-green-700 font-extrabold">
              {isCarton ? `1 Ctn = ${product.unitsPerCarton || 12} units` : 'Individual Piece'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsCarton(true)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all ${
                isCarton
                  ? 'bg-brand-green-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Cartons</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCarton(false)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black transition-all ${
                !isCarton
                  ? 'bg-brand-green-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Pieces</span>
            </button>
          </div>
        </div>

        {/* Dynamic Price Display */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {formatCurrency(price)}
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {isCarton ? 'Wholesale Carton Price' : 'Single Piece Unit Price'}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
              !isOutOfStock ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {!isOutOfStock ? `${currentStock} ${isCarton ? 'ctns' : 'pcs'} in stock` : 'Out of Stock'}
            </span>
          </div>
        </div>

        {/* Quantity Controls & Add to Cart */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between border border-slate-200 rounded-xl bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isOutOfStock}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 text-sm font-black disabled:opacity-40"
            >
              -
            </button>
            <span className="w-7 text-center text-xs font-mono font-bold text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={isOutOfStock}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 text-sm font-black disabled:opacity-40"
            >
              +
            </button>
          </div>

          <Button
            variant={isOutOfStock ? 'danger' : 'primary'}
            onClick={handleAddToCart}
            className="flex-1 rounded-xl shadow-xs font-bold"
            size="sm"
            icon={!user ? Lock : ShoppingCart}
          >
            {isOutOfStock
              ? 'Out of Stock'
              : !user
              ? 'Sign In to Order'
              : `Add ${isCarton ? `${quantity} Ctn(s)` : `${quantity} Pcs`}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
