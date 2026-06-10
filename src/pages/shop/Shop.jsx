import { useState } from 'react';
import useProducts from '../../hooks/useProducts';
import ProductGrid from '../../components/products/ProductGrid';
import { Search, Filter } from 'lucide-react';

export const Shop = () => {
  const { products, loading, categories } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter products by search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Wholesale Catalog Shelf</h2>
          <p className="text-xs text-slate-500 font-medium">Add products as carton bundles or single pieces to assemble your order.</p>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search sanitizers, detergents, liquids..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition-all outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 text-slate-400 flex-shrink-0">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Categories:</span>
        </div>
        
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 outline-none ${
              selectedCategory === category
                ? 'bg-brand-green-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Product Grid Renderer */}
      <ProductGrid products={filteredProducts} loading={loading} />

    </div>
  );
};

export default Shop;
