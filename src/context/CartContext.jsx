import React, { createContext, useState, useEffect } from 'react';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const localData = localStorage.getItem('vinoff_cart');
    return localData ? JSON.parse(localData) : [];
  });

  useEffect(() => {
    localStorage.setItem('vinoff_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1, isCarton = true) => {
    setCartItems(prevItems => {
      const existingIdx = prevItems.findIndex(
        item => item.id === product.id && item.isCarton === isCarton
      );

      if (existingIdx > -1) {
        const updated = [...prevItems];
        updated[existingIdx].quantity += quantity;
        return updated;
      }

      return [
        ...prevItems,
        {
          id: product.id,
          name: product.name,
          image: product.image,
          category: product.category,
          cartonPrice: product.cartonPrice,
          unitPrice: product.unitPrice,
          unitsPerCarton: product.unitsPerCarton,
          quantity,
          isCarton
        }
      ];
    });
  };

  const updateQuantity = (productId, isCarton, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, isCarton);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId && item.isCarton === isCarton
          ? { ...item, quantity: Number(quantity) }
          : item
      )
    );
  };

  const toggleItemMode = (productId, currentIsCarton) => {
    setCartItems(prevItems => {
      const idx = prevItems.findIndex(item => item.id === productId && item.isCarton === currentIsCarton);
      if (idx === -1) return prevItems;
      
      const itemToToggle = prevItems[idx];
      const otherIdx = prevItems.findIndex(item => item.id === productId && item.isCarton === !currentIsCarton);
      
      let updated = [...prevItems];
      
      if (otherIdx > -1) {
        // Merge quantities if item with other mode already exists
        updated[otherIdx].quantity += itemToToggle.quantity;
        updated.splice(idx, 1);
      } else {
        // Just change the mode
        updated[idx] = { ...itemToToggle, isCarton: !currentIsCarton };
      }
      return updated;
    });
  };

  const removeFromCart = (productId, isCarton) => {
    setCartItems(prevItems =>
      prevItems.filter(item => !(item.id === productId && item.isCarton === isCarton))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Wholesale Calculations
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.isCarton ? item.cartonPrice : item.unitPrice;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const MIN_ORDER_THRESHOLD = 150.00; // Wholesale minimum order amount
  const subtotal = getSubtotal();
  const meetsMinThreshold = subtotal >= MIN_ORDER_THRESHOLD;

  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    toggleItemMode,
    removeFromCart,
    clearCart,
    subtotal,
    cartCount: getCartCount(),
    MIN_ORDER_THRESHOLD,
    meetsMinThreshold
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
