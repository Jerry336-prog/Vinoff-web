import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import { InvoiceProvider } from './modules/invoice/context/InvoiceContext';
import { router } from './app/router';
import InstallPrompt from './components/ui/InstallPrompt';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ChatProvider>
          <InvoiceProvider>
            <InstallPrompt />
            <RouterProvider router={router} />
          </InvoiceProvider>
        </ChatProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
