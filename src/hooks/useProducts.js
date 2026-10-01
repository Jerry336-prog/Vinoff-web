import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

export const STANDARD_CATEGORIES = [
  "Toiletries",
  "Household Cleaners",
  "Cosmetics",
  "Laundry Care",
];

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [storeCategories, setStoreCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/settings/categories")
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data || res.data;
        if (data?.categories && Array.isArray(data.categories)) {
          setStoreCategories(data.categories);
        }
      })
      .catch(() => {
        // Fallback silently to STANDARD_CATEGORIES
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
          image: p.images?.[0]?.url || p.image || '/VinoffLogo.webp',
          cartonPrice,
          unitPrice,
          unitsPerCarton: unitsPerCarton > 0 ? unitsPerCarton : 12,
          stock: p.stock ?? p.inventoryCount ?? 0,
          unitStock: p.unitStock ?? 0,
          allowCarton: p.allowCarton !== false,
          allowPieces: p.allowPieces !== false,
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

  const bulkUpdateOrderingFormat = async ({ productIds, allowCarton, allowPieces, applyToAll }) => {
    setError(null);
    try {
      const res = await api.patch('/api/products/bulk/ordering-format', {
        productIds,
        allowCarton,
        allowPieces,
        applyToAll,
      });
      await fetchProducts();
      return res.data;
    } catch (err) {
      // If endpoint is not deployed yet on remote server (404), fall back to individual product updates
      if (err.status === 404 || err.message?.toLowerCase().includes('not found')) {
        try {
          const targetIds =
            applyToAll || !productIds || (Array.isArray(productIds) && productIds.length === 0)
              ? products.map((p) => p._id || p.id).filter(Boolean)
              : productIds;

          await Promise.all(
            targetIds.map((id) =>
              api.patch(`/api/products/${id}`, { allowCarton, allowPieces })
            )
          );
          await fetchProducts();
          return { success: true };
        } catch (fallbackErr) {
          setError(fallbackErr.message || 'Failed to update ordering format');
          throw fallbackErr;
        }
      }
      setError(err.message || 'Failed to update ordering format');
      throw err;
    }
  };

  const categories = useMemo(() => {
    const allowed = new Set([
      ...STANDARD_CATEGORIES.map((c) => c.toLowerCase()),
      ...storeCategories.map((c) => c.toLowerCase()),
    ]);

    const validProductCats = products
      .map((p) => p.category)
      .filter((c) => c && allowed.has(c.toLowerCase()));

    const merged = Array.from(
      new Set([
        ...STANDARD_CATEGORIES,
        ...storeCategories,
        ...validProductCats,
      ])
    ).filter((c) => c && c !== "All" && !/beverage/i.test(c));

    return ['All', ...merged];
  }, [products, storeCategories]);

  return {
    products,
    loading,
    error,
    pagination,
    refreshProducts: fetchProducts,
    addProduct,
    updateProduct,
    bulkUpdateOrderingFormat,
    deleteProduct,
    categories,
  };
};

export default useProducts;
