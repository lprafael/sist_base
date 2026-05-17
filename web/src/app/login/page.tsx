/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Shield, User, ChevronRight } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'admin' | 'google'>('google');
  
  // Admin Form state
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  // Google Simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isTenantOwnerRequest, setIsTenantOwnerRequest] = useState(false);
  const [googleStep, setGoogleStep] = useState(1); // 1: Select account, 2: Tenant owner confirmation

  // Audit logging utility helper
  const addAuditLog = (type: 'acceso' | 'auditoria', log: any) => {
    if (typeof window === 'undefined') return;
    const key = type === 'acceso' ? 'logs_acceso' : 'logs_auditoria';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newLog = {
      id: crypto.randomUUID(),
      fecha: new Date().toLocaleString('es-PY'),
      ...log
    };
    localStorage.setItem(key, JSON.stringify([newLog, ...existing]));
  };

  // Google simulated accounts
  const googleAccounts = [
    { email: 'carlos.mendoza@gmail.com', name: 'Carlos Mendoza', role: 'deportista' },
    { email: 'mburicao.manager@gmail.com', name: 'Gerente Mburicao', role: 'tenant', assignedComplejoId: '11111111-1111-1111-1111-111111111111', authorized: true },
    { email: 'nuevo.club@gmail.com', name: 'Propietario Nuevo Club', role: 'tenant', authorized: false } // Pending approval demo
  ];

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.toLowerCase() === 'admin' && adminPass === 'Admin123!') {
      // Create session
      const session = {
        role: 'super',
        name: 'Administrador Global',
        email: 'admin@micancha.com.py',
        authorized: true
      };
      localStorage.setItem('user_session', JSON.stringify(session));

      // Access Log
      addAuditLog('acceso', {
        usuario: 'admin',
        rol: 'Administrador',
        accion: 'Login Exitoso',
        ip: '192.168.10.15',
        dispositivo: navigator.userAgent.substring(0, 50) + '...'
      });

      window.location.href = '/admin';
    } else {
      setAdminError('Usuario o contraseña incorrectos. (Pruebe admin / Admin123!)');
      addAuditLog('acceso', {
        usuario: adminUser || 'Desconocido',
        rol: 'Administrador',
        accion: 'Intento Fallido (Password erróneo)',
        ip: '192.168.10.15',
        dispositivo: navigator.userAgent.substring(0, 50) + '...'
      });
    }
  };

  const handleGoogleAccountSelect = (account: any) => {
    // If selecting a standard account
    const session = {
      role: account.role,
      name: account.name,
      email: account.email,
      assignedComplejoId: account.assignedComplejoId,
      authorized: account.authorized
    };

    localStorage.setItem('user_session', JSON.stringify(session));

    // Access Log
    addAuditLog('acceso', {
      usuario: account.email,
      rol: account.role === 'tenant' ? 'Local Deportivo' : 'Deportista',
      accion: `Login con Google (${account.authorized === false ? 'Pendiente Autorización' : 'Exitoso'})`,
      ip: '192.168.43.200',
      dispositivo: navigator.userAgent.substring(0, 50) + '...'
    });

    if (account.role === 'tenant') {
      if (account.authorized) {
        window.location.href = '/admin';
      } else {
        alert('Tu cuenta de propietario aún no está autorizada. Se ha enviado una solicitud al Administrador Global.');
        window.location.href = '/';
      }
    } else {
      window.location.href = '/buscar';
    }
  };

  const handleCreateGoogleTenantRequest = (name: string, email: string) => {
    // Register custom request in pending tenants list
    const pendingList = JSON.parse(localStorage.getItem('pending_tenants') || '[]');
    const newRequest = {
      id: crypto.randomUUID(),
      nombre: name,
      email: email,
      fecha: new Date().toLocaleDateString('es-PY'),
      estado: 'pendiente'
    };
    localStorage.setItem('pending_tenants', JSON.stringify([...pendingList, newRequest]));

    // Log audit request
    addAuditLog('auditoria', {
      usuario: email,
      rol: 'Local Deportivo',
      accion: 'Solicitud de Registro',
      detalles: `El usuario solicita autorización de rol "Local Deportivo" para el correo ${email}`
    });

    // Establish session
    const session = {
      role: 'tenant',
      name: name,
      email: email,
      authorized: false
    };
    localStorage.setItem('user_session', JSON.stringify(session));

    alert('¡Solicitud enviada al Administrador! Podrás acceder a tu panel de control una vez seas aprobado.');
    window.location.href = '/';
  };

  return (
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
              <button
                onClick={() => {
                  setGoogleStep(1);
                  setShowGoogleModal(true);
                }}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  color: '#0f172a',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.border = '2px solid #cbd5e1'}
                onMouseOut={e => e.currentTarget.style.border = '2px solid #e2e8f0'}
              >
                {/* Standard Google G Logo */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.84 2.69-6.57z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.15.28-1.67V5.03H.95A9 9 0 0 0 .95 12.97l2.99-2.3z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.05A9 9 0 0 0 .95 5.03l2.99 2.3c.71-2.14 2.71-3.73 5.06-3.73z"/>
                </svg>
                Continuar con Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <input 
                  type="checkbox" 
                  id="tenantRequest" 
                  checked={isTenantOwnerRequest}
                  onChange={e => setIsTenantOwnerRequest(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="tenantRequest" style={{ fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                  Soy propietario de un Complejo Deportivo
                </label>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: -4 }}>
                💡 Habilitá esta opción si querés solicitar autorización al administrador para dar de alta tu club y configurar canchas.
              </p>
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

      {/* -------------------- MOCK GOOGLE AUTHENTICATION SYSTEM MODAL -------------------- */}
      {showGoogleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '420px', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden', animation: 'modalIn 0.2s ease-out' }}>
            
            {/* Header Google Accounts modal */}
            <div style={{ background: '#f8fafc', padding: '24px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Google logo */}
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.285 1.514-1.14 2.8-2.42 3.655v3.04H19.5c1.93-1.777 3.04-4.39 3.04-7.552z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.32-2.57c-.92.617-2.1.987-3.61.987-2.776 0-5.13-1.875-5.97-4.4H2.08v3.088c2 3.974 6.1 6.8 10.92 6.8z"/>
                <path fill="#FBBC05" d="M6.03 15.118a7.2 7.2 0 0 1 0-4.236V7.79H2.08a12 12 0 0 0 0 8.42l3.95-3.092z"/>
                <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.18 0 3.08 2.83 1.08 6.8l3.95 3.09c.84-2.52 3.194-4.12 5.97-4.12z"/>
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Acceder con Google</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Elige una cuenta para continuar a MiCancha</p>
            </div>

            {/* Simulated accounts lists */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              
              {!isTenantOwnerRequest ? (
                // Display general mock accounts
                googleAccounts.filter(acc => acc.role === 'deportista' || acc.authorized).map(acc => (
                  <div 
                    key={acc.email}
                    onClick={() => handleGoogleAccountSelect(acc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 100, background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {acc.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{acc.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{acc.email}</div>
                    </div>
                    <span style={{ fontSize: 11, background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                      {acc.role === 'tenant' ? 'Local' : 'Deportista'}
                    </span>
                  </div>
                ))
              ) : (
                // If requested to join as Complex Owner
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: '#dcfce7', color: '#16a34a', padding: 14, borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    🏷️ Modo Propietario Activo: Se generará una solicitud de aprobación para el Administrador Global.
                  </div>
                  
                  {googleAccounts.filter(acc => acc.role === 'tenant').map(acc => (
                    <div 
                      key={acc.email}
                      onClick={() => {
                        if (acc.authorized) {
                          handleGoogleAccountSelect(acc);
                        } else {
                          handleCreateGoogleTenantRequest(acc.name, acc.email);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 100, background: '#ea580c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {acc.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{acc.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{acc.email}</div>
                      </div>
                      <span style={{ fontSize: 10, background: acc.authorized ? '#dcfce7' : '#fee2e2', color: acc.authorized ? '#16a34a' : '#dc2626', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {acc.authorized ? 'Autorizado' : 'Solicitar Acceso'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowGoogleModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '10px 0',
                  marginTop: 10,
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
            
          </div>

        </div>
      )}

      <Footer />
    </div>
  );
}
