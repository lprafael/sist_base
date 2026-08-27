/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList, Calendar, BarChart2, LogOut, Menu, X, Lock, Shield
} from 'lucide-react';

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setMsg({ text: 'Minimo 8 caracteres', type: 'error' }); return; }
    if (newPassword !== confirmPassword) { setMsg({ text: 'Las contraseñas no coinciden', type: 'error' }); return; }
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('user_session') || '{}').access_token || '';
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      if (res.ok) { setMsg({ text: 'Contraseña cambiada exitosamente', type: 'success' }); setTimeout(onClose, 1500); }
      else { const err = await res.json(); setMsg({ text: err.detail || 'Error', type: 'error' }); }
    } catch { setMsg({ text: 'Error de red', type: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-slate-800">Cambiar Contraseña</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>
        {msg.text && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Contraseña Actual', currentPassword, setCurrentPassword], ['Nueva Contraseña', newPassword, setNewPassword], ['Confirmar Nueva Contraseña', confirmPassword, setConfirmPassword]].map(([label, val, setter]: any) => (
            <div key={label as string}>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
              <input type="password" required value={val} onChange={e => setter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700" />
            </div>
          ))}
          <div className="pt-3 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VeedorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('Cargando...');
  const [userRole, setUserRole] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
    const role = sessionData.role || '';
    if (!sessionData.access_token) { router.replace('/torneos/login'); return; }
    if (['organizador', 'admin', 'administrador', 'super'].includes(role)) { router.replace('/admin-futbol/campeonatos'); return; }
    if (!['veedor', 'arbitro', 'delegado'].includes(role)) { router.replace('/torneos/login'); return; }
    setUserRole(role);
    setUserName(sessionData.name || 'Usuario');
  }, [router]);

  const navItems = [
    { name: 'Fixture del día', href: '/veedor/dashboard', icon: <Calendar size={20} /> },
    { name: 'Cargar resultados', href: '/veedor/resultados', icon: <ClipboardList size={20} /> },
    { name: 'Posiciones', href: '/veedor/posiciones', icon: <BarChart2 size={20} /> },
    { name: 'Cambiar contraseña', isModal: true, onClick: () => setShowPasswordModal(true), icon: <Lock size={20} /> },
  ];

  const roleLabel: Record<string, string> = { veedor: 'Veedor', arbitro: 'Árbitro', delegado: 'Delegado' };
  const roleColor: Record<string, string> = { veedor: 'bg-amber-100 text-amber-700 border-amber-200', arbitro: 'bg-sky-100 text-sky-700 border-sky-200', delegado: 'bg-violet-100 text-violet-700 border-violet-200' };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)' }}>
        <div className="p-5 border-b border-emerald-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield size={18} color="white" />
              </div>
              <span className="font-bold text-white text-lg">Portal</span>
            </div>
            <button className="md:hidden text-emerald-300 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleColor[userRole] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {roleLabel[userRole] || userRole}
          </div>
          <p className="text-sm text-emerald-100 mt-2 font-semibold truncate">{userName}</p>
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {navItems.map(item => {
            if (item.isModal && item.onClick) {
              return (
                <button key={item.name} onClick={() => { setSidebarOpen(false); item.onClick!(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-200 hover:bg-white/10 hover:text-white transition text-left text-sm font-medium">
                  {item.icon}{item.name}
                </button>
              );
            }
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href || '#'} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${isActive ? 'bg-white/15 text-white shadow-sm border border-white/10' : 'text-emerald-200 hover:bg-white/10 hover:text-white'}`}>
                {item.icon}{item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-3 right-3">
          <div className="bg-emerald-950/50 border border-emerald-700/30 rounded-xl p-3 text-center">
            <p className="text-[11px] text-emerald-300 font-medium">🔒 Acceso restringido</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Solo puntajes y confrontamientos</p>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 p-2 rounded-lg hover:bg-gray-100"><Menu size={24} /></button>
            <div>
              <h1 className="font-bold text-gray-900 text-base">Panel de {roleLabel[userRole] || 'Control'}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Carga de resultados · Fixture · Posiciones</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-800">{userName}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColor[userRole] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{roleLabel[userRole] || userRole}</span>
            </div>
            <button onClick={() => { localStorage.removeItem('user_session'); window.location.href = '/torneos/login'; }}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition text-sm font-semibold">
              <LogOut size={17} /><span className="hidden sm:block">Salir</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
