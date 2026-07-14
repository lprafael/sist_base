"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });

      if (res.ok) {
        setSuccess('¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.');
        setToken('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.detail || 'Error al restablecer la contraseña. El token podría ser inválido o estar expirado.');
      }
    } catch (err) {
      setError('Error de conexión al intentar comunicarse con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Restablecer Contraseña</h1>
          <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            Ingresa tu nueva contraseña para acceder a tu cuenta.
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ background: '#dcfce7', color: '#16a34a', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                {success}
              </div>
            )}

            {!tokenParam && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Token de Seguridad</label>
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Pega aquí tu token recibido por email"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Nueva Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 40px 10px 36px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                  required
                />
                <div 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Confirmar Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 40px 10px 36px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                background: loading ? '#94a3b8' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8
              }}
            >
              {loading ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/login" style={{ color: '#3b82f6', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Volver al inicio de sesión
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
