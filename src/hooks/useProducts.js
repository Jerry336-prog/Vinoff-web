import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/products', { params });
      const items = res.data?.items || res.data || [];
      // Normalize product fields so components expecting id / image / prices work seamlessly
      const normalized = (Array.isArray(items) ? items : []).map((p) => {
        const cartonPrice = Number(p.wholesalePrice || p.price || 0);
        const unitsPerCarton = Number(p.unitsPerCarton || p.minimumQuantity || p.cartonQuantity || 12);
        const calculatedUnitPrice = Math.round(cartonPrice / (unitsPerCarton || 1));
        const unitPrice = Number(p.piecePrice || p.unitPrice || calculatedUnitPrice || cartonPrice);

        return {
          ...p,
          id: p._id || p.id,
          image: p.images?.[0]?.url || p.image || '/VinoffLogo.png',
          cartonPrice,
          unitPrice,
          unitsPerCarton: unitsPerCarton > 0 ? unitsPerCarton : 12,
          stock: p.stock ?? p.inventoryCount ?? 0,
          unitStock: p.unitStock ?? 0,
        };
      });
      setProducts(normalized);
      setPagination(res.meta || null);
      return normalized;
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (productData) => {
    setError(null);
    try {
      const res = await api.post('/api/products', productData);
      const newProduct = res.data;
      await fetchProducts();
      return newProduct;
    } catch (err) {
      setError(err.message || 'Failed to add product');
      throw err;
    }
  };

  const updateProduct = async (id, updatedFields) => {
    setError(null);
    try {
      const res = await api.patch(`/api/products/${id}`, updatedFields);
      const updated = res.data;
      await fetchProducts();
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update product');
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    setError(null);
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  };

  const getCategories = () => {
    const categories = products.map((p) => p.category).filter(Boolean);
    return ['All', ...new Set(categories)];
  };

  return {
    products,
    loading,
    error,
    pagination,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    categories: getCategories(),
  };
};

export default useProducts;
