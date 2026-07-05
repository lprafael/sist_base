'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Save, X, Key, UserCheck, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nombre_completo: '',
    rol: 'admin',
    tipo_torneo: 'futbol'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setErrorMsg('Error al cargar usuarios. Asegúrate de tener permisos de administrador.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      
      const payload: any = {
        username: formData.username,
        email: formData.email,
        nombre_completo: formData.nombre_completo,
        rol: formData.rol
      };

      if (formData.rol === 'organizador') {
        payload.tipo_torneo = formData.tipo_torneo;
      }

      const res = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        loadUsers();
        setFormData({
          username: '',
          email: '',
          nombre_completo: '',
          rol: 'admin',
          tipo_torneo: 'futbol'
        });
        alert('Usuario creado exitosamente. Se ha enviado un correo con las credenciales (si el servicio está configurado).');
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.detail || 'Error al crear usuario.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión.');
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <Shield size={14} /> Acceso Restringido
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="text-blue-500 w-10 h-10" /> Gestión de Usuarios
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Crea y administra los usuarios organizadores y administradores del sistema.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 px-8 rounded-2xl flex items-center gap-2 transition-all hover:scale-[1.02]">
          <UserPlus size={20} className="stroke-[3]" /> Nuevo Usuario
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando usuarios...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(u => (
            <div key={u.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-[2rem] p-6 hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${u.rol === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                    {u.rol}
                  </span>
                  <span className={`w-3 h-3 rounded-full ${u.activo ? 'bg-green-500' : 'bg-red-500'}`} title={u.activo ? 'Activo' : 'Inactivo'}></span>
                </div>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight">{u.nombre_completo}</h3>
                <p className="text-slate-400 text-sm font-semibold mb-4">@{u.username}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Mail size={14} className="text-slate-500" /> {u.email}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Key size={14} className="text-slate-500" /> ID: {u.id}
                  </div>
                  {u.ultimo_acceso && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <UserCheck size={14} className="text-slate-500" /> Último acceso: {new Date(u.ultimo_acceso).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-start justify-center p-4 pt-20 overflow-y-auto">
          <button onClick={() => setIsModalOpen(false)} className="fixed top-4 right-4 text-slate-400 hover:text-white bg-slate-900/80 p-3 rounded-full backdrop-blur border border-slate-800 z-[80] shadow-xl transition-colors">
            <X size={24} />
          </button>
          
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-md rounded-[2.5rem] p-8 relative shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <UserPlus size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Nuevo Usuario</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre Completo</label>
                <input type="text" required placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 font-semibold text-sm"
                  value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Username</label>
                  <input type="text" required placeholder="juanperez"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 font-semibold text-sm"
                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\\s/g, '')})} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                  <input type="email" required placeholder="juan@ejemplo.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 font-semibold text-sm"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rol del Usuario</label>
                <select className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 font-semibold text-sm"
                  value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                  <option value="admin">Administrador General</option>
                  <option value="organizador">Organizador de Torneos</option>
                </select>
              </div>

              {formData.rol === 'organizador' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Tipo de Torneo Asignado</label>
                  <select className="w-full bg-slate-900 border border-green-500/30 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500 font-semibold text-sm"
                    value={formData.tipo_torneo} onChange={e => setFormData({...formData, tipo_torneo: e.target.value})}>
                    <option value="futbol">Fútbol / Deportes Tradicionales</option>
                    <option value="general">Deportes de Combate / General</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-2">Determina el tipo de módulo de torneos al que tendrá acceso el organizador.</p>
                </div>
              )}
              
              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-[2rem] flex items-center justify-center gap-2 shadow-lg transition-all uppercase disabled:opacity-50">
                  <Save size={20} className="stroke-[3]" /> Crear Usuario
                </button>
                <p className="text-center text-xs text-slate-500 mt-4">La contraseña se generará automáticamente y será enviada al email del usuario.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
