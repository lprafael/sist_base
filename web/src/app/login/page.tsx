/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Shield, User, ChevronRight } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Robust UUID fallback generator for insecure context (HTTP / non-localhost)
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'admin' | 'google'>('google');
  
  // Admin Form state
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  // Audit logging utility helper
  const addAuditLog = (type: 'acceso' | 'auditoria', log: any) => {
    if (typeof window === 'undefined') return;
    const key = type === 'acceso' ? 'logs_acceso' : 'logs_auditoria';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newLog = {
      id: generateUUID(),
      fecha: new Date().toLocaleString('es-PY'),
      ...log
    };
    localStorage.setItem(key, JSON.stringify([newLog, ...existing]));
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass
        })
      });

      if (res.ok) {
        const data = await res.json();
        const session = {
          access_token: data.access_token,
          role: data.user.rol,
          name: data.user.nombre_completo,
          email: data.user.email,
          usuario_id: data.user.id,
          authorized: true
        };
        localStorage.setItem('user_session', JSON.stringify(session));

        addAuditLog('acceso', {
          usuario: adminUser,
          rol: session.role,
          accion: 'Login Exitoso',
          ip: 'Web',
          dispositivo: navigator.userAgent.substring(0, 50) + '...'
        });

        if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else if (session.role === 'organizador') {
          window.location.href = '/admin-generales';
        } else {
          window.location.href = '/';
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setAdminError(err.detail || 'Usuario o contraseña incorrectos.');
        addAuditLog('acceso', {
          usuario: adminUser,
          rol: 'Desconocido',
          accion: 'Intento Fallido',
          ip: 'Web',
          dispositivo: navigator.userAgent.substring(0, 50) + '...'
        });
      }
    } catch (err) {
      console.error(err);
      setAdminError('Error de red o servidor no disponible.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const res = await fetch(`${apiBase}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      if (res.ok) {
        const data = await res.json();
        const session = {
          access_token: data.access_token,
          role: data.user.rol,
          name: data.user.nombre_completo,
          email: data.user.email,
          usuario_id: data.user.id,
          authorized: true
        };
        localStorage.setItem('user_session', JSON.stringify(session));

        addAuditLog('acceso', {
          usuario: session.email,
          rol: session.role,
          accion: 'Login con Google Exitoso',
          ip: 'Web',
          dispositivo: navigator.userAgent.substring(0, 50) + '...'
        });

        if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else if (session.role === 'organizador') {
          window.location.href = '/admin-generales';
        } else {
          window.location.href = '/';
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error en Google Login: ${err.detail || 'Desconocido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al conectar con el servidor.');
    }
  };

  const handleGoogleError = () => {
    alert('Autenticación con Google fallida.');
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
      <Nav scrolled={true} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 80px' }}>
        
        <div style={{ 
          background: '#ffffff', 
          borderRadius: 24, 
          boxShadow: '0 10px 40px rgba(15,23,42,0.06)', 
          border: '1px solid rgba(15,23,42,0.05)', 
          width: '100%', 
          maxWidth: '460px', 
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          <div style={{ width: 60, height: 60, borderRadius: 100, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Lock size={28} style={{ color: '#16a34a' }} />
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8, textAlign: 'center' }}>
            Acceso Seguro
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 30 }}>
            Ingresá a tu cuenta de MiCancha Paraguay sin comisiones
          </p>

          {/* Custom Switch Tab */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 12, width: '100%', marginBottom: 30 }}>
            <button
              onClick={() => setAuthMode('google')}
              style={{
                flex: 1,
                border: 'none',
                padding: '10px 0',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                background: authMode === 'google' ? '#ffffff' : 'transparent',
                color: authMode === 'google' ? '#16a34a' : '#64748b',
                boxShadow: authMode === 'google' ? '0 4px 10px rgba(0,0,0,0.03)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🔵 Deportistas & Clubes (Google)
            </button>
            <button
              onClick={() => setAuthMode('admin')}
              style={{
                flex: 1,
                border: 'none',
                padding: '10px 0',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                background: authMode === 'admin' ? '#ffffff' : 'transparent',
                color: authMode === 'admin' ? '#16a34a' : '#64748b',
                boxShadow: authMode === 'admin' ? '0 4px 10px rgba(0,0,0,0.03)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              👑 Administrador
            </button>
          </div>

          {/* -------------------- GOOGLE LOGIN FORM -------------------- */}
          {authMode === 'google' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_blue"
                  shape="rectangular"
                  size="large"
                />
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <p style={{ fontSize: 14, color: '#64748b' }}>
                  Al continuar, aceptas nuestros{' '}
                  <Link href="/terminos" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Términos de Servicio</Link> y{' '}
                  <Link href="/privacidad" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Política de Privacidad</Link>.
                </p>
              </div>
            </div>
          )}

          {/* -------------------- ADMIN FORM -------------------- */}
          {authMode === 'admin' && (
            <form onSubmit={handleAdminLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {adminError && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                  {adminError}
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Usuario</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    value={adminUser}
                    onChange={e => setAdminUser(e.target.value)}
                    placeholder="admin"
                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginTop: 10,
                  boxShadow: '0 4px 12px rgba(22,163,74,0.2)'
                }}
              >
                Ingresar como Admin
              </button>
            </form>
          )}

        </div>

      </div>



      <Footer />
    </div>
  );
}
