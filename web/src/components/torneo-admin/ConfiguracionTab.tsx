"use client";
import React, { useState } from 'react';
import { Calendar, Image as ImageIcon, MapPin, Users, Activity, Trophy, Scale, Shield, BarChart2, CheckSquare, Eye, Printer, FileText } from 'lucide-react';

export default function ConfiguracionTab({ torneo, onUpdate, onSubSectionSelect }: { torneo: any, onUpdate: (data: any) => void, onSubSectionSelect: (section: string) => void }) {
  // Local state for basic fields to allow typing before saving (or we can save on blur)
  const [formData, setFormData] = useState({
    nombre: torneo.nombre || '',
    subtitulo: torneo.subtitulo || '',
    descripcion: torneo.descripcion || '',
    tipo_ubicacion: torneo.tipo_ubicacion || 'persona',
    privacidad: torneo.privacidad || 'publico',
    estado: torneo.estado || 'preparacion'
  });

  // Keep local state in sync if parent updates it (e.g. after a save)
  React.useEffect(() => {
    setFormData({
      nombre: torneo.nombre || '',
      subtitulo: torneo.subtitulo || '',
      descripcion: torneo.descripcion || '',
      tipo_ubicacion: torneo.tipo_ubicacion || 'persona',
      privacidad: torneo.privacidad || 'publico',
      estado: torneo.estado || 'preparacion'
    });
  }, [torneo]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (e: any) => {
    onUpdate({ [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* DATOS BÁSICOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-blue-600">Datos básicos</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border-2 border-dashed border-slate-300 rounded-lg h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
            <ImageIcon size={32} className="mb-2" />
            <span className="text-sm font-bold">Imagen de portada</span>
            <span className="text-xs">1600x533</span>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Título</label>
              <input 
                type="text" name="nombre" value={formData.nombre} onChange={handleChange} onBlur={handleBlur}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Subtítulo</label>
              <input 
                type="text" name="subtitulo" value={formData.subtitulo} onChange={handleChange} onBlur={handleBlur}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
              <textarea 
                name="descripcion" value={formData.descripcion} onChange={handleChange} onBlur={handleBlur} rows={3}
                className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                placeholder="Acá va la Descripción"
              ></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de inicio</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" className="w-full outline-none text-sm text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de finalización</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded px-3 py-2">
                  <Calendar size={16} className="text-slate-400" />
                  <input type="date" className="w-full outline-none text-sm text-slate-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 text-sm text-slate-700">
          <div className="flex gap-2 items-center"><Users size={16} className="text-slate-400"/> Contacto <button className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><div className="w-4 h-4 rounded-full bg-blue-600"></div> Color <button className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><FileText size={16} className="text-slate-400"/> Reglas del campeonato <button className="text-blue-500 hover:underline">Editar</button></div>
          <div className="flex gap-2 items-center"><Trophy size={16} className="text-slate-400"/> Premios <button className="text-blue-500 hover:underline">Editar</button></div>
        </div>
      </div>

      {/* UBICACIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 text-lg">Ubicación</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="radio" name="tipo_ubicacion" value="internet" 
              checked={formData.tipo_ubicacion === 'internet'} 
              onChange={(e) => {
                handleChange(e);
                onUpdate({ tipo_ubicacion: 'internet' });
              }}
              className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <span className="text-slate-700">Campeonato jugado en internet</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="radio" name="tipo_ubicacion" value="persona" 
              checked={formData.tipo_ubicacion === 'persona'} 
              onChange={(e) => {
                handleChange(e);
                onUpdate({ tipo_ubicacion: 'persona' });
              }}
              className="w-5 h-5 text-blue-500 border-slate-300 focus:ring-blue-500" 
            />
            <span className="text-slate-700">Campeonato jugado en persona</span>
          </label>
          {formData.tipo_ubicacion === 'persona' && (
            <div className="ml-8 mt-2">
              <button className="text-blue-500 hover:underline font-medium">Establecer localización</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CAMPEONATO (LISTA) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-blue-600">Campeonato</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {[
              { id: 'categorias', icon: Activity, label: 'Categorías y Divisiones' },
              { id: 'equipos', icon: Users, label: 'Equipos (0)' },
              { id: 'jugadores', icon: Users, label: 'Jugadores (0)' },
              { id: 'checkin', icon: Scale, label: 'Check-in (Pesaje)' },
              { id: 'grupos', icon: Activity, label: 'Grupos' },
              { id: 'agrupacion', icon: Trophy, label: 'Fases / Llaves' },
              { id: 'arbitraje', icon: Shield, label: 'Arbitraje (Mesa Veedores)' },
              { id: 'sitios', icon: MapPin, label: 'Sitios' },
              { id: 'clasificacion', icon: BarChart2, label: 'Criterios de clasificación' },
            ].map(item => (
              <li key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 text-slate-700">
                  <item.icon size={18} className="text-slate-400" />
                  <span>{item.label}</span>
                </div>
                <button onClick={() => onSubSectionSelect(item.id)} className="text-blue-500 hover:underline text-sm font-medium">Editar</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          {/* DIVULGACIÓN */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Divulgación</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-800 font-medium flex items-center gap-2">
                    <Eye size={18} className="text-slate-400" />
                    Campeonato privado
                  </div>
                  <div className="text-xs text-slate-500">Accesible solo con el enlace</div>
                </div>
                {/* Switch */}
                <div 
                  onClick={() => {
                    const newPriv = formData.privacidad === 'privado' ? 'publico' : 'privado';
                    setFormData({...formData, privacidad: newPriv});
                    onUpdate({ privacidad: newPriv });
                  }}
                  className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition ${formData.privacidad === 'privado' ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-slate-800 font-medium">Estado del campeonato</div>
                <select 
                  name="estado" value={formData.estado} onChange={(e) => { handleChange(e); onUpdate({estado: e.target.value}); }}
                  className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 text-sm font-bold outline-none"
                >
                  <option value="abierto">En preparación / Abierto</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span>Patrocinios y Apoyos</span>
                <button className="text-blue-500 hover:underline text-sm font-medium">Editar</button>
              </div>
            </div>
          </div>

          {/* CONTROL DE USUARIOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Control de usuarios</h3>
            <ul className="space-y-4 text-slate-700 text-sm">
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Shield size={16} className="text-slate-400"/> Moderadores</div>
                <button className="text-blue-500 hover:underline font-medium">Editar</button>
              </li>
              <li className="flex justify-between items-center">
                <div className="flex items-center gap-2"><BarChart2 size={16} className="text-slate-400"/> Vistas</div>
                <button className="text-blue-500 hover:underline font-medium">Mostrar</button>
              </li>
            </ul>
          </div>
          
          {/* IMPRIMIR REPORTES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-blue-600 mb-4">Imprimir Reportes</h3>
            <ul className="space-y-3 text-slate-700 text-sm">
              {['Equipos', 'Jugadores', 'Carnet', 'Acta', 'Partidos', 'Clasificación'].map(rep => (
                <li key={rep} className="flex justify-between items-center">
                  <div className="flex items-center gap-2"><Printer size={16} className="text-slate-400"/> {rep}</div>
                  <button className="text-blue-500 hover:underline font-medium">Imprimir</button>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
