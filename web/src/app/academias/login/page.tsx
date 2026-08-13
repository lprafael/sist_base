/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, User, Shield, Eye, EyeOff, GraduationCap, Users, Star } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

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

export default function AcademiasLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const u = params.get('user');
      if (u) setUsername(u);
    }
  }, []);

  const addAuditLog = (log: any) => {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem('logs_acceso') || '[]');
    localStorage.setItem('logs_acceso', JSON.stringify([{ id: generateUUID(), fecha: new Date().toLocaleString('es-PY'), ...log }, ...existing]));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        const session = {
          access_token: data.access_token,
          role: data.user.rol,
          name: data.user.nombre_completo,
          email: data.user.email,
          usuario_id: data.user.id,
          authorized: true,
          academia_id: data.academia_id || null,
          rol_academia: data.rol_academia || null,
        };
        localStorage.setItem('user_session', JSON.stringify(session));
        addAuditLog({ usuario: username, rol: session.role, accion: 'Login Academia Exitoso', ip: 'Web' });

        // Cualquier rol que tenga academia_id va al panel de academia
        if (session.academia_id || session.role === 'academia') {
          window.location.href = '/academia-panel';
        } else if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else {
          setError('Esta cuenta no tiene acceso al panel de academias.');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Usuario o contraseña incorrectos.');
        addAuditLog({ usuario: username, rol: 'Desconocido', accion: 'Intento Fallido (Academia)', ip: 'Web' });
      }
    } catch {
      setError('Error de red o servidor no disponible.');
    } finally {
      setLoading(false);
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
          authorized: true,
          academia_id: data.academia_id || null,
          rol_academia: data.rol_academia || null,
        };
        localStorage.setItem('user_session', JSON.stringify(session));
        addAuditLog({ usuario: session.email, rol: session.role, accion: 'Login Academia con Google Exitoso', ip: 'Web' });

        if (session.academia_id || session.role === 'academia') {
          window.location.href = '/academia-panel';
        } else if (session.role === 'admin' || session.role === 'super') {
          window.location.href = '/admin';
        } else {
          alert('Esta cuenta no tiene acceso al panel de academias.');
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0c0a1e 0%, #150a2e 50%, #0c1a2e 100%)',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-20%', left: '30%', width: '50%', height: '60%', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: '40%', height: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '-5%', width: '30%', height: '35%', background: 'radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(168,85,247,0.15) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc, #a855f7, #7c3aed)' }} />

      {/* Left panel — branding */}
      <div style={{ display: 'none', flex: 1, padding: '60px', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }} className="left-panel">
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            ← Volver al inicio
          </Link>
        </div>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: '0 20px 40px rgba(124,58,237,0.5)' }}>
          <GraduationCap size={36} color="#fff" />
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-2px' }}>
          Portal de<br /><span style={{ color: '#c084fc' }}>Academias</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
          Gestión completa de tu escuela deportiva: alumnos, cuotas, asistencias, categorías y más.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: <Users size={18} />, text: 'Alumnos, tutores y fichas médicas' },
            { icon: <Star size={18} />, text: 'Motor de descuentos por hermanos' },
            { icon: <GraduationCap size={18} />, text: 'Control de asistencias y cuotas' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0 }}>
                {item.icon}
              </div>
              {item.text}
            </div>
          ))}
        </div>
        {/* Roles badge */}
        <div style={{ marginTop: 48, padding: '16px 20px', background: 'rgba(124,58,237,0.15)', borderRadius: 14, border: '1px solid rgba(192,132,252,0.2)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Roles con acceso</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Dueño', 'Administrador', 'Tesorero', 'Profesor'].map(r => (
              <span key={r} style={{ padding: '4px 12px', background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#c084fc' }}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 520, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 1
      }}>
        <div style={{
          width: '100%',
          background: 'rgba(12,10,30,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: 28,
          padding: '48px 40px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 15px 30px rgba(124,58,237,0.5)' }}>
              <GraduationCap size={30} color="#fff" />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', textAlign: 'center', marginBottom: 8 }}>
              Acceso Academias
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>
              Dueño · Administrador · Tesorero · Profesor
            </p>
            <div style={{ width: 48, height: 3, background: 'linear-gradient(90deg, #7c3aed, #c084fc)', borderRadius: 2, marginTop: 16 }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Usuario</label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="academia_ejemplo" required
                  style={{
                    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12,
                    border: '1.5px solid rgba(168,85,247,0.2)', outline: 'none',
                    fontSize: 15, fontWeight: 500, color: '#fff',
                    background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = 'rgba(124,58,237,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{
                    width: '100%', padding: '13px 44px 13px 42px', borderRadius: 12,
                    border: '1.5px solid rgba(168,85,247,0.2)', outline: 'none',
                    fontSize: 15, fontWeight: 500, color: '#fff',
                    background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.background = 'rgba(124,58,237,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                />
                <div onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px',
                background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(90deg, #7c3aed, #6d28d9)',
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, letterSpacing: '0.5px', textTransform: 'uppercase',
                boxShadow: '0 8px 20px rgba(124,58,237,0.45)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Ingresando...</>
              ) : (
                <><GraduationCap size={18} /> Ingresar al Portal</>
              )}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>o ingresar con</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
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
          </form>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              ¿Administrás un complejo?{' '}
              <Link href="/complejo/login" style={{ color: '#c084fc', fontWeight: 700, textDecoration: 'none' }}>Portal Complejos →</Link>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              ¿Organizás torneos?{' '}
              <Link href="/torneos/login" style={{ color: '#c084fc', fontWeight: 700, textDecoration: 'none' }}>Portal Torneos →</Link>
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 900px) { .left-panel { display: flex !important; } }
      `}} />
    </div>
    </GoogleOAuthProvider>
  );
}
