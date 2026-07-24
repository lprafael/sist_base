"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SessionGuardian() {
  const pathname = usePathname();

  useEffect(() => {
    // Definimos el tiempo de expiración (ej: 1 hora de inactividad)
    const EXPIRATION_TIME_MS = 60 * 60 * 1000; 
    
    const checkSession = () => {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        try {
          const sessionData = JSON.parse(sessionStr);
          const now = Date.now();

          if (sessionData.last_active) {
            // Si pasó más tiempo del permitido desde la última actividad, cerrar sesión
            if (now - sessionData.last_active > EXPIRATION_TIME_MS) {
              localStorage.removeItem('user_session');
              
              // Redirigir dependiendo del rol
              const rol = sessionData.role;
              if (rol === 'admin' || rol === 'super') {
                window.location.href = '/torneos/login';
              } else if (rol === 'academia') {
                window.location.href = '/academias/login';
              } else {
                window.location.href = '/torneos/login';
              }
              return;
            }
          }

          // Actualizar last_active
          sessionData.last_active = now;
          localStorage.setItem('user_session', JSON.stringify(sessionData));
          
        } catch (e) {
          // Si el JSON es inválido, limpiamos por seguridad
          localStorage.removeItem('user_session');
        }
      }
    };

    // Validamos al cargar la ruta
    checkSession();

    // Actualizamos el last_active cada minuto si sigue activo en la pestaña
    const interval = setInterval(checkSession, 60 * 1000);

    // Escuchamos eventos de interacción para mantener la sesión viva
    const handleActivity = () => {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        try {
          const sessionData = JSON.parse(sessionStr);
          sessionData.last_active = Date.now();
          localStorage.setItem('user_session', JSON.stringify(sessionData));
        } catch (e) {}
      }
    };

    // Throttle the handleActivity to not write to localStorage constantly
    let timeoutId: any;
    const throttledActivity = () => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          handleActivity();
          timeoutId = null;
        }, 10000); // 10s max update rate
      }
    };

    window.addEventListener('mousemove', throttledActivity);
    window.addEventListener('keydown', throttledActivity);
    window.addEventListener('click', throttledActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', throttledActivity);
      window.removeEventListener('keydown', throttledActivity);
      window.removeEventListener('click', throttledActivity);
    };
  }, [pathname]);

  return null;
}
