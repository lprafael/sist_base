"use client";

import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, Camera, Hash, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TokenInvitacionPage({ params }: { params: { id: string, token: string } }) {
  const [equipo, setEquipo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [camiseta, setCamiseta] = useState('');
  const [posicion, setPosicion] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

  useEffect(() => {
    fetch(`${API_URL}/cancha/torneos/equipos/token-jugadores/${params.token}`)
      .then(res => {
        if (!res.ok) throw new Error("Enlace de invitación inválido o expirado.");
        return res.json();
      })
      .then(data => {
        setEquipo(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !dni) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('dni', dni);
      if (fechaNac) formData.append('fecha_nacimiento', fechaNac);
      if (camiseta) formData.append('numero_camiseta', camiseta);
      if (posicion) formData.append('posicion', posicion);
      if (fotoFile) formData.append('file', fotoFile);

      const res = await fetch(`${API_URL}/cancha/torneos/jugadores/self-register/${params.token}`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errData = await res.json();
        alert("Error: " + (errData.detail || "No se pudo registrar"));
      }
    } catch (err) {
      alert("Error de conexión");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Error de Invitación</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Volver al inicio</Link>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-green-100 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Inscripción Exitosa!</h2>
        <p className="text-slate-600 mb-6">Tu solicitud para unirte a <strong>{equipo?.equipo_nombre}</strong> ha sido enviada. El organizador o delegado deberá aprobar tu perfil.</p>
        <Link href={`/torneos/${params.id}`} className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition">Ver Torneo</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1e293b] rounded-2xl flex flex-col items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">Únete a tu equipo</h1>
          <p className="text-slate-600 text-lg">Estás siendo invitado a jugar en <strong className="text-blue-600">{equipo?.equipo_nombre}</strong></p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="p-6 bg-blue-600 text-white text-center">
            <h2 className="text-xl font-bold">Formulario de Inscripción</h2>
            <p className="text-blue-100 text-sm mt-1">Completa tus datos para registrarte en el torneo.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white" placeholder="Ej: Juan Pérez" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">DNI / Documento *</label>
                <input required type="text" value={dni} onChange={e => setDni(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white" placeholder="Ej: 1234567" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Calendar size={14}/> Nacimiento</label>
                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Hash size={14}/> Camiseta</label>
                <input type="number" value={camiseta} onChange={e => setCamiseta(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white" placeholder="Ej: 10" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Posición en el campo</label>
              <select value={posicion} onChange={e => setPosicion(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white appearance-none">
                <option value="">Selecciona tu posición</option>
                <option value="Arquero">Arquero / Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Camera size={14}/> Foto de Perfil (Opcional)</label>
              <input type="file" accept="image/*" onChange={e => setFotoFile(e.target.files?.[0] || null)} className="w-full border-2 border-slate-200 p-2.5 rounded-xl focus:border-blue-500 outline-none transition text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 hover:shadow-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Inscripción'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
