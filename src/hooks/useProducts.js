import { useState, useEffect, useCallback } from 'react';
import { dbGetProducts, dbAddProduct, dbUpdateProduct, dbDeleteProduct } from '../services/firebase/db';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbGetProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
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
      const newProduct = await dbAddProduct(productData);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      setError(err.message || 'Failed to add product');
      throw err;
    }
  };

  const updateProduct = async (id, updatedFields) => {
    setError(null);
    try {
      const updated = await dbUpdateProduct(id, updatedFields);
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update product');
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    setError(null);
    try {
      await dbDeleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  };

  const getCategories = () => {
    const categories = products.map(p => p.category);
    return ['All', ...new Set(categories)];
  };

  return {
    products,
    loading,
    error,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    categories: getCategories()
  };
};

export default useProducts;
