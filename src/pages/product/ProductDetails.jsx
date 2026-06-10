import { useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import useProducts from "../../hooks/useProducts";
import { CartContext } from "../../context/CartContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { ArrowLeft, ShoppingCart, Sparkles } from "lucide-react";
import Button from "../../components/ui/Button";
import { showModal } from "../../services/ui/modal";

export const ProductDetails = () => {
  const { id } = useParams();
  const { products, loading } = useProducts();
  const { addToCart } = useContext(CartContext);

  const [isCarton, setIsCarton] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const product = products.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 w-24 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-200 rounded-3xl aspect-square" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 w-3/4 rounded" />
            <div className="h-4 bg-slate-200 w-1/2 rounded" />
            <div className="h-20 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
        <p className="text-slate-500 font-semibold mb-3">Product not found</p>
        <Link to="/shop">
          <Button variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const activePrice = isCarton ? product.cartonPrice : product.unitPrice;
  const saving =
    product.unitPrice * product.unitsPerCarton - product.cartonPrice;
  const savingPercent = Math.round(
    (saving / (product.unitPrice * product.unitsPerCarton)) * 100,
  );

  const handleAddToCart = async () => {
    addToCart(product, quantity, isCarton);
    await showModal({
      title: "Added to Cart",
      message: `Added ${quantity} ${isCarton ? "carton(s)" : "unit(s)"} of ${product.name} to cart.`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-green-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wholesales Shelf
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Visual Display */}
        <div className="bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative aspect-square">
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {saving > 0 && (
            <span className="absolute top-6 right-6 bg-brand-yellow-400 text-brand-yellow-950 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Save {savingPercent}% on Cartons
            </span>
          )}
        </div>

        {/* Product Details Actions */}
        <div className="flex flex-col justify-between py-2 space-y-6">
          <div className="space-y-4">
            <span className="text-[10px] font-extrabold bg-brand-green-50 text-brand-green-800 border border-brand-green-200 px-3 py-1 rounded-full uppercase tracking-widest">
              {product.category}
            </span>

            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {product.name}
            </h2>

            <p className="text-sm text-slate-500 leading-relaxed">
              {product.description}
            </p>

            <div className="grid grid-cols-2 gap-4 border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                  Carton Price
                </span>
                <span className="text-lg font-black text-slate-900">
                  {formatCurrency(product.cartonPrice)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Pack of {product.unitsPerCarton} units
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                  Unit Price
                </span>
                <span className="text-lg font-black text-slate-900">
                  {formatCurrency(product.unitPrice)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Individual item buy
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-200">
            {/* Purchasing Mode Toggle */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Wholesale Purchase Unit:
              </span>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-1.5 grid grid-cols-2 text-center text-xs font-bold text-slate-600">
                <button
                  onClick={() => setIsCarton(true)}
                  className={`py-2.5 rounded-lg transition ${
                    isCarton
                      ? "bg-brand-green-600 text-white shadow-sm"
                      : "hover:text-slate-800"
                  }`}
                >
                  Carton Bundle ({product.unitsPerCarton} Pcs)
                </button>
                <button
                  onClick={() => setIsCarton(false)}
                  className={`py-2.5 rounded-lg transition ${
                    !isCarton
                      ? "bg-brand-green-600 text-white shadow-sm"
                      : "hover:text-slate-800"
                  }`}
                >
                  Single Pieces (Units)
                </button>
              </div>
            </div>

            {/* Calculations & Carton quantity selector */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                  Billing total:
                </span>
                <span className="text-xl font-black text-brand-green-950">
                  {formatCurrency(activePrice * quantity)}
                </span>
              </div>

              <div className="flex items-center border border-slate-200 rounded-xl bg-white">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-slate-500 hover:text-brand-green-600 text-sm font-black"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-extrabold text-slate-800">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-slate-500 hover:text-brand-green-600 text-sm font-black"
                >
                  +
                </button>
              </div>
            </div>

            <Button
              variant={isCarton ? "primary" : "secondary"}
              onClick={handleAddToCart}
              className="w-full py-3.5 rounded-2xl"
              icon={ShoppingCart}
            >
              Add {quantity} {isCarton ? "Carton(s)" : "Unit(s)"} to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
