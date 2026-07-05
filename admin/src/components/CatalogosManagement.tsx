'use client';

import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, X, Save, AlertTriangle, Layers, Activity } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Types
interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
}

interface TipoEvento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  aplica_a: string;
  afecta_marcador: boolean;
  afecta_disciplina: boolean;
  activo: boolean;
}

interface Modalidad {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface TipoDeporte {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface RolCancha {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface FormatoTorneo {
  id: number;
  nombre: string;
  descripcion?: string;
}

type TabType = 'deportes' | 'tipos_deporte' | 'formatos_torneo' | 'tipos_evento' | 'modalidades' | 'roles';

export default function CatalogosManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('deportes');
  
  // States
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [tiposDeporte, setTiposDeporte] = useState<TipoDeporte[]>([]);
  const [formatosTorneo, setFormatosTorneo] = useState<FormatoTorneo[]>([]);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [roles, setRoles] = useState<RolCancha[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Generic form data for whichever entity is selected
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const endpoints: Record<TabType, string> = {
        'deportes': `${API_URL}/api/deportes`,
        'tipos_deporte': `${API_URL}/api/deportes/tipos`,
        'formatos_torneo': `${API_URL}/api/torneos/formatos`,
        'tipos_evento': `${API_URL}/api/futbol/tipos-evento`,
        'modalidades': `${API_URL}/api/futbol/modalidades`,
        'roles': `${API_URL}/api/cancha/roles`
      };

      const res = await fetch(endpoints[activeTab]);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'deportes') {
            setDeportes(data);
            const tiposRes = await fetch(`${API_URL}/api/deportes/tipos`);
            if (tiposRes.ok) setTiposDeporte(await tiposRes.json());
        }
        if (activeTab === 'tipos_deporte') setTiposDeporte(data);
        if (activeTab === 'formatos_torneo') setFormatosTorneo(data);
        if (activeTab === 'tipos_evento') setTiposEvento(data);
        if (activeTab === 'modalidades') setModalidades(data);
        if (activeTab === 'roles') setRoles(data);
      } else {
        setErrorMsg('Error al cargar los datos.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleOpenModal = (entity?: any) => {
    setEditingId(entity?.id || null);
    
    if (activeTab === 'deportes') {
      setFormData(entity ? { nombre: entity.nombre, tipo_id: entity.tipo_id || entity.tipo_deporte?.id } : { nombre: '', tipo_id: tiposDeporte[0]?.id || '' });
    } else if (activeTab === 'tipos_deporte') {
      setFormData(entity ? { nombre: entity.nombre, descripcion: entity.descripcion || '' } : { nombre: '', descripcion: '' });
    } else if (activeTab === 'formatos_torneo') {
      setFormData(entity ? { nombre: entity.nombre, descripcion: entity.descripcion || '' } : { nombre: '', descripcion: '' });
    } else if (activeTab === 'roles') {
      setFormData(entity ? { nombre: entity.nombre, descripcion: entity.descripcion || '' } : { nombre: '', descripcion: '' });
    } else if (activeTab === 'tipos_evento') {
      setFormData(entity ? {
        codigo: entity.codigo, nombre: entity.nombre, descripcion: entity.descripcion || '',
        aplica_a: entity.aplica_a, afecta_marcador: entity.afecta_marcador,
        afecta_disciplina: entity.afecta_disciplina, activo: entity.activo
      } : {
        codigo: '', nombre: '', descripcion: '', aplica_a: 'jugador',
        afecta_marcador: false, afecta_disciplina: false, activo: true
      });
    } else if (activeTab === 'modalidades') {
      setFormData(entity ? {
        codigo: entity.codigo, nombre: entity.nombre, descripcion: entity.descripcion || ''
      } : {
        codigo: '', nombre: '', descripcion: ''
      });
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      
      let baseEndpoint = '';
      if (activeTab === 'deportes') baseEndpoint = '/api/deportes';
      if (activeTab === 'tipos_deporte') baseEndpoint = '/api/deportes/tipos';
      if (activeTab === 'formatos_torneo') baseEndpoint = '/api/torneos/formatos';
      if (activeTab === 'tipos_evento') baseEndpoint = '/api/futbol/tipos-evento';
      if (activeTab === 'modalidades') baseEndpoint = '/api/futbol/modalidades';
      if (activeTab === 'roles') baseEndpoint = '/api/cancha/roles';

      const url = editingId ? `${API_URL}${baseEndpoint}/${editingId}` : `${API_URL}${baseEndpoint}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.detail || 'Error al guardar el registro. Requiere permisos.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      const token = localStorage.getItem('token');
      
      let baseEndpoint = '';
      if (activeTab === 'deportes') baseEndpoint = '/api/deportes';
      if (activeTab === 'tipos_deporte') baseEndpoint = '/api/deportes/tipos';
      if (activeTab === 'formatos_torneo') baseEndpoint = '/api/torneos/formatos';
      if (activeTab === 'tipos_evento') baseEndpoint = '/api/futbol/tipos-evento';
      if (activeTab === 'modalidades') baseEndpoint = '/api/futbol/modalidades';

      const res = await fetch(`${API_URL}${baseEndpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        loadData();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.detail || 'Error al eliminar. Puede estar en uso.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión.');
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header & Tabs */}
      <div className="mb-8 border-b border-slate-800">
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
          <Layers className="text-blue-500 w-10 h-10" /> Gestión de Catálogos
        </h1>
        
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('deportes')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'deportes' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Deportes Principales
          </button>
          <button 
            onClick={() => setActiveTab('tipos_deporte')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'tipos_deporte' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Tipos de Deporte
          </button>
          <button 
            onClick={() => setActiveTab('formatos_torneo')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'formatos_torneo' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Formatos de Torneo
          </button>
          <button 
            onClick={() => setActiveTab('tipos_evento')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'tipos_evento' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Tipos de Evento (Fútbol)
          </button>
          <button 
            onClick={() => setActiveTab('modalidades')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'modalidades' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Modalidades (Fútbol)
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            className={`pb-4 px-2 font-bold transition-all border-b-2 ${activeTab === 'roles' ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            Roles de Cancha
          </button>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-6 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02]">
          <Plus size={18} className="stroke-[3]" /> Nuevo Registro
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando catálogo...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          
          {/* RENDER DEPORTES */}
          {activeTab === 'deportes' && deportes.map(d => (
            <div key={d.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
              <div>
                <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  {(d as any).tipo_deporte?.nombre || (d as any).tipo || 'Sin Tipo'}
                </span>
                <h3 className="text-xl font-bold text-white mt-3">{d.nombre}</h3>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(d)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(d.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {/* RENDER TIPOS DE DEPORTE */}
          {activeTab === 'tipos_deporte' && tiposDeporte.map(td => (
            <div key={td.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
              <div>
                <h3 className="text-xl font-bold text-white mt-1">{td.nombre}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-3">{td.descripcion || 'Sin descripción'}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(td)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(td.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {/* RENDER FORMATOS DE TORNEO */}
          {activeTab === 'formatos_torneo' && formatosTorneo.map(ft => (
            <div key={ft.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
              <div>
                <h3 className="text-xl font-bold text-white mt-1">{ft.nombre}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-3">{ft.descripcion || 'Sin descripción'}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(ft)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(ft.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {/* RENDER TIPOS EVENTO */}
          {activeTab === 'tipos_evento' && tiposEvento.map(te => (
            <div key={te.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-16 h-16 transform translate-x-8 -translate-y-8 rounded-full blur-2xl opacity-20 ${te.activo ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <div>
                <span className="text-xs font-mono text-slate-500">{te.codigo}</span>
                <h3 className="text-xl font-bold text-white mt-1">{te.nombre}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{te.descripcion}</p>
                <div className="flex gap-2 mt-3">
                  {te.afecta_marcador && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Marcador</span>}
                  {te.afecta_disciplina && <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Disciplina</span>}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(te)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(te.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {/* RENDER MODALIDADES */}
          {activeTab === 'modalidades' && modalidades.map(m => (
            <div key={m.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
              <div>
                <span className="text-xs font-mono text-slate-500">{m.codigo}</span>
                <h3 className="text-xl font-bold text-white mt-1">{m.nombre}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-3">{m.descripcion}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(m)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(m.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {/* RENDER ROLES */}
          {activeTab === 'roles' && roles.map(r => (
            <div key={r.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
              <div>
                <h3 className="text-xl font-bold text-white mt-1">{r.nombre}</h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-3">{r.descripcion || 'Sin descripción'}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(r)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(r.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-2 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800/80 w-full max-w-md rounded-[2rem] p-6 relative shadow-2xl overflow-hidden">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-white mb-6">
              {editingId ? 'Editar Registro' : 'Nuevo Registro'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Campos para Deportes */}
              {activeTab === 'deportes' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre de la disciplina</label>
                    <input type="text" required placeholder="Ej. Béisbol"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                      value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo / Categoría</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                      value={formData.tipo_id || ''} onChange={e => setFormData({...formData, tipo_id: parseInt(e.target.value)})}>
                      <option value="" disabled>Seleccione un tipo</option>
                      {tiposDeporte.map(td => (
                        <option key={td.id} value={td.id}>{td.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Campos para Tipos de Deporte, Formatos Torneo y Roles */}
              {(activeTab === 'tipos_deporte' || activeTab === 'formatos_torneo' || activeTab === 'roles') && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre</label>
                    <input type="text" required placeholder="Ej. Nuevo Registro"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                      value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                    <textarea placeholder="Descripción opcional..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm min-h-[80px]"
                      value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                  </div>
                </>
              )}

              {/* Campos para Tipos de Evento y Modalidades (Comparten Codigo, Nombre, Descripcion) */}
              {(activeTab === 'tipos_evento' || activeTab === 'modalidades') && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Código Único</label>
                      <input type="text" required placeholder="Ej. GOL_PENAL" disabled={!!editingId}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
                        value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nombre Visible</label>
                      <input type="text" required placeholder="Ej. Gol de Penal"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                        value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descripción</label>
                    <textarea placeholder="Descripción del evento..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm min-h-[80px]"
                      value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                  </div>
                </>
              )}

              {/* Campos específicos de Tipos de Evento */}
              {activeTab === 'tipos_evento' && (
                <div className="pt-4 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Configuración de Impacto</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-sm font-medium text-slate-300">Aplica a</span>
                      <select className="bg-slate-800 text-sm text-white px-3 py-1 rounded outline-none border border-slate-700"
                        value={formData.aplica_a} onChange={e => setFormData({...formData, aplica_a: e.target.value})}>
                        <option value="jugador">Jugador</option>
                        <option value="equipo">Equipo</option>
                        <option value="partido">Partido</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-sm font-medium text-slate-300">Suma al marcador</span>
                      <input type="checkbox" checked={formData.afecta_marcador} 
                        onChange={e => setFormData({...formData, afecta_marcador: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/50" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-sm font-medium text-slate-300">Cuenta como disciplina (Tarjetas)</span>
                      <input type="checkbox" checked={formData.afecta_disciplina} 
                        onChange={e => setFormData({...formData, afecta_disciplina: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/50" />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-sm font-medium text-slate-300">Evento Activo</span>
                      <input type="checkbox" checked={formData.activo} 
                        onChange={e => setFormData({...formData, activo: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50" />
                    </label>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                <Save size={18} /> {editingId ? 'Actualizar Cambios' : 'Guardar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
