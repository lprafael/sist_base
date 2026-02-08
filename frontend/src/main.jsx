import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Validar que el Client ID esté configurado (solo en desarrollo)
if (!clientId && import.meta.env.DEV) {
  console.warn('⚠️ VITE_GOOGLE_CLIENT_ID no está configurado. El login con Google no funcionará.');
}

// Suprimir errores de Google Sign-In en consola si hay problemas de configuración
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    // Filtrar errores conocidos de Google Sign-In que son de configuración
    const message = args[0]?.toString() || '';
    if (
      message.includes('GSI_LOGGER') ||
      message.includes('origin is not allowed') ||
      message.includes('FedCM')
    ) {
      // No mostrar estos errores en consola para evitar spam
      return;
    }
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={clientId || ''}>
    <App />
  </GoogleOAuthProvider>
);
