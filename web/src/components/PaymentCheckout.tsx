"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function PaymentCheckout({ 
  amount, 
  referenceId,
  description 
}: { 
  amount: number, 
  referenceId: string,
  description: string 
}) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar MP con una clave pública dummy para demo
    initMercadoPago('TEST-dummy-public-key', { locale: 'es-AR' });

    // En un caso real, aquí haríamos un POST a nuestro backend para crear la preferencia
    // fetch('/api/pagos/crear_preferencia', { ... })
    // Simulamos la respuesta del backend
    setTimeout(() => {
      setPreferenceId("dummy-preference-id");
      setLoading(false);
    }, 1000);
  }, [amount, referenceId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full mx-auto shadow-2xl"
    >
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white text-center mb-1">Pago Seguro</h3>
      <p className="text-gray-400 text-center text-sm mb-6">{description}</p>
      
      <div className="bg-background rounded-2xl p-5 mb-8 border border-gray-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Total a pagar</span>
          <span className="text-2xl font-bold text-white">Gs. {amount.toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-500 text-right">Impuestos incluidos</p>
      </div>

      <div className="min-h-[50px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="w-full">
            {/* Wallet de MercadoPago */}
            {preferenceId && (
              <Wallet 
                initialization={{ preferenceId: preferenceId }} 
                customization={{ texts: { valueProp: 'security_safety' } }} 
              />
            )}
            <p className="text-xs text-center text-gray-500 mt-4">
              Al procesar el pago aceptas los términos y condiciones de REVA.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
