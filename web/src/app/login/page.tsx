/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Shield, User, ChevronRight, Eye, EyeOff } from 'lucide-react';
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
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const userParam = params.get('user');
      if (userParam) {
        setAdminUser(userParam);
        setAuthMode('admin');
      }
    }
  }, []);

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
        const sessionData = {
          ...session,
          tipo_torneo: data.user.tipo_torneo || null,
          academia_id: data.academia_id || null,
          rol_academia: data.rol_academia || null
        };
        localStorage.setItem('user_session', JSON.stringify(sessionData));

        addAuditLog('acceso', {
          usuario: adminUser,
          rol: session.role,
          accion: 'Login Exitoso',
          ip: 'Web',
          dispositivo: navigator.userAgent.substring(0, 50) + '...'
        });

        if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else if (session.role === 'academia' || sessionData.academia_id) {
          window.location.href = '/academia-panel';
        } else if (session.role === 'organizador' || session.role === 'veedor' || session.role === 'delegado') {
          window.location.href = '/admin-futbol/campeonatos';
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
        body: JSON.stringify({ credential: credentialResponse.credential })
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
        const sessionData = {
          ...session,
          tipo_torneo: data.user.tipo_torneo || null,
          academia_id: data.academia_id || null,
          rol_academia: data.rol_academia || null
        };
        localStorage.setItem('user_session', JSON.stringify(sessionData));

        addAuditLog('acceso', {
          usuario: session.email,
          rol: session.role,
          accion: 'Login con Google Exitoso',
          ip: 'Web',
          dispositivo: navigator.userAgent.substring(0, 50) + '...'
        });

        if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else if (session.role === 'academia' || sessionData.academia_id) {
          window.location.href = '/academia-panel';
        } else if (session.role === 'organizador' || session.role === 'veedor' || session.role === 'delegado') {
          window.location.href = '/admin-futbol/campeonatos';
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #022c22 0%, #020617 100%)', color: '#ffffff', fontFamily: "'Outfit', sans-serif", position: 'relative', overflow: 'hidden' }}>
        
        {/* Dynamic Sporty Background Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 10 }}>
          <Nav scrolled={true} />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 80px', position: 'relative', zIndex: 1 }}>
          
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.98)', 
            borderRadius: 32, 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)', 
            width: '100%', 
            maxWidth: '460px', 
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top green accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
            
            <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(22,163,74,0.4)', transform: 'rotate(-5deg)' }}>
              <Lock size={32} style={{ color: '#ffffff', transform: 'rotate(5deg)' }} />
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', marginBottom: 8, textAlign: 'center', color: '#0f172a', textTransform: 'uppercase', fontStyle: 'italic' }}>
              Entrá a la Cancha
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, textAlign: 'center', marginBottom: 32, fontWeight: 500 }}>
              Tu acceso a <span style={{ color: '#16a34a', fontWeight: 800 }}>MiCancha</span> Paraguay
            </p>

            {/* Custom Switch Tab */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: 6, borderRadius: 16, width: '100%', marginBottom: 32 }}>
              <button
                onClick={() => setAuthMode('google')}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '12px 0',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  background: authMode === 'google' ? '#ffffff' : 'transparent',
                  color: authMode === 'google' ? '#16a34a' : '#64748b',
                  boxShadow: authMode === 'google' ? '0 4px 15px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                ⚽ Jugadores
              </button>
              <button
                onClick={() => setAuthMode('admin')}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '12px 0',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  background: authMode === 'admin' ? '#ffffff' : 'transparent',
                  color: authMode === 'admin' ? '#0f172a' : '#64748b',
                  boxShadow: authMode === 'admin' ? '0 4px 15px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                👑 Admin
              </button>
            </div>

            {/* -------------------- GOOGLE LOGIN FORM -------------------- */}
            {authMode === 'google' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(1.05)' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    use_fedcm={false}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                    Al continuar, aceptas nuestros{' '}
                    <Link href="/terminos" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Términos de Juego</Link> y{' '}
                    <Link href="/privacidad" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Política de Privacidad</Link>.
                  </p>
                </div>
              </div>
            )}

            {/* -------------------- ADMIN FORM -------------------- */}
            {authMode === 'admin' && (
              <form onSubmit={handleAdminLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
                {adminError && (
                  <div style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #f87171', padding: 14, borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} />
                    {adminError}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={adminUser}
                      onChange={e => setAdminUser(e.target.value)}
                      placeholder="admin"
                      style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 14, border: '2px solid #e2e8f0', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0f172a', transition: 'border-color 0.2s', background: '#f8fafc' }}
                      onFocus={e => e.target.style.borderColor = '#16a34a'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type={showAdminPass ? "text" : "password"}
                      value={adminPass}
                      onChange={e => setAdminPass(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '14px 44px 14px 42px', borderRadius: 14, border: '2px solid #e2e8f0', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0f172a', transition: 'border-color 0.2s', background: '#f8fafc' }}
                      onFocus={e => e.target.style.borderColor = '#16a34a'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      required
                    />
                    <div 
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }}
                    >
                      {showAdminPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #16a34a, #15803d)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 14,
                    padding: '16px',
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: 'pointer',
                    marginTop: 8,
                    boxShadow: '0 8px 20px -6px rgba(22,163,74,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'transform 0.1s, box-shadow 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onMouseDown={e => e.currentTarget.style.transform = 'translateY(1px)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                >
                  Iniciar Sesión
                </button>
              </form>
            )}
          </div>
        </div>
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Footer />
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>
    </GoogleOAuthProvider>
  );
}
