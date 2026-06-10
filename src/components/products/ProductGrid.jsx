import React from 'react';
import ProductCard from './ProductCard';
import { Layers } from 'lucide-react';

export const ProductGrid = ({ products = [], loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 animate-pulse shadow-sm">
            <div className="bg-slate-200 rounded-2xl aspect-[4/3] w-full" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-10 bg-slate-200 rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">No Products Found</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
          We couldn't find any products in this category matching your search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
