import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { AnnouncementProvider } from './context/AnnouncementContext';
import { ToastProvider } from './context/ToastContext';
import { router } from './app/router';
import InstallPrompt from './components/ui/InstallPrompt';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BusinessProvider>
          <CartProvider>
            <ChatProvider>
              <NotificationProvider>
                <AnnouncementProvider>
                  <InstallPrompt />
                  <RouterProvider router={router} />
                </AnnouncementProvider>
              </NotificationProvider>
            </ChatProvider>
          </CartProvider>
        </BusinessProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
