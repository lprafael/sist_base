'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function RegistroJugadorPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    fecha_nacimiento: '',
    numero_camiseta: '',
    posicion: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.dni) {
      setStatus('error');
      setMessage('Nombre y DNI son obligatorios.');
      return;
    }

    setStatus('loading');
    try {
      const data = new FormData();
      data.append('nombre', formData.nombre);
      data.append('dni', formData.dni);
      if (formData.fecha_nacimiento) data.append('fecha_nacimiento', formData.fecha_nacimiento);
      if (formData.numero_camiseta) data.append('numero_camiseta', formData.numero_camiseta);
      if (formData.posicion) data.append('posicion', formData.posicion);
      if (file) data.append('file', file);

      const res = await fetch(`${API_URL}/cancha/torneos/jugadores/self-register/${token}`, {
        method: 'POST',
        body: data
      });

      const resData = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage(resData.message || 'Registro exitoso.');
      } else {
        setStatus('error');
        setMessage(resData.detail || 'Ocurrió un error en el registro.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('No se pudo conectar con el servidor.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] p-8 rounded-3xl border border-green-500/30 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">¡Registro Completado!</h2>
          <p className="text-slate-400 font-medium">Tus datos han sido enviados y están en revisión por el delegado o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111] p-8 rounded-3xl border border-slate-800 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <User className="text-blue-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Registro de Jugador</h1>
          <p className="text-sm text-slate-400 mt-2">Ingresa tus datos y foto para validación facial biométrica en la mesa de control.</p>
        </div>

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nombre Completo *</label>
            <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                   className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">DNI *</label>
            <input type="text" required value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})}
                   className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Camiseta</label>
              <input type="number" value={formData.numero_camiseta} onChange={e => setFormData({...formData, numero_camiseta: e.target.value})}
                     className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Posición</label>
              <select value={formData.posicion} onChange={e => setFormData({...formData, posicion: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors">
                <option value="">Seleccione</option>
                <option value="Arquero">Arquero</option>
                <option value="Defensor">Defensor</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fecha Nacimiento</label>
            <input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                   className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Foto de Rostro (Opcional)</label>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 bg-[#1a1a1a] border border-slate-800 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                {preview ? (
                  <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <input type="file" id="foto_jugador" accept="image/*" onChange={handleFileChange} className="hidden" />
                <label htmlFor="foto_jugador" className="inline-block bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors">
                  <Upload size={16} className="inline mr-2" /> Seleccionar Imagen
                </label>
                <p className="text-[10px] text-slate-500 mt-2">Procura mirar de frente a la cámara con buena iluminación para el sistema biométrico.</p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={status === 'loading'}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {status === 'loading' ? 'Enviando...' : 'Confirmar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
