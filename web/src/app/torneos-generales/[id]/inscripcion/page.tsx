'use client';

import { useState } from 'react';
import { ShieldCheck, User, Calendar, Activity, Scale, Trophy } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function InscripcionPage({ params }: { params: { id: string } }) {
  const torneoId = params.id;
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    fecha_nacimiento: '',
    genero: 'M',
    email: '',
    telefono: '',
    modalidad: 'Karate', // This should ideally be selected based on the tournament's allowed modalities
    nivel_experiencia: 'Principiante',
    peso_declarado: '',
    estatura_declarada: ''
  });
  
  const [status, setStatus] = useState<{loading: boolean, success?: boolean, error?: string, id?: string}>({loading: false});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true });
    
    try {
      const payload = {
        ...formData,
        peso_declarado: parseFloat(formData.peso_declarado),
        estatura_declarada: parseFloat(formData.estatura_declarada)
      };

      const res = await fetch(`${API_URL}/api/marciales/torneos/${torneoId}/inscripcion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error en la inscripción");
      
      setStatus({ loading: false, success: true, id: data.id });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Nav scrolled={true} />
      
      <div className="flex-1 pt-24 pb-12">
        <div className="container max-w-3xl mx-auto px-4">
          
          {status.success ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center shadow-xl">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={48} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 mb-4">¡Inscripción Exitosa!</h1>
              <p className="text-slate-500 text-lg mb-8">
                Tu solicitud ha sido procesada correctamente. Recuerda presentarte el día del evento con tu documento de identidad para el pesaje oficial y pago de aranceles.
              </p>
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 inline-block text-left">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Tu ID de Competidor es:</p>
                <p className="text-3xl font-black text-red-600">{status.id}</p>
                <p className="text-xs text-slate-500 mt-2">Guarda este número, lo necesitarás en el Check-in.</p>
              </div>
              <div>
                <button onClick={() => window.location.href = '/torneos-generales'} className="bg-slate-900 hover:bg-black text-white font-bold px-8 py-4 rounded-xl transition-colors">
                  Volver a Torneos
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-900" />
              
              <h1 className="text-3xl font-black text-slate-900 mb-2">Formulario de Inscripción</h1>
              <p className="text-slate-500 font-medium mb-10">Completa tus datos reales para agruparte correctamente en las llaves del torneo.</p>

              {status.error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl font-bold mb-8">
                  {status.error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Datos Personales */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <User className="text-red-500" /> Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Nombres</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Apellidos</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Documento (CI / DNI)</label>
                      <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Fecha de Nacimiento</label>
                      <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Género</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Activity className="text-red-500" /> Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Correo Electrónico</label>
                      <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Teléfono / WhatsApp</label>
                      <input required type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Datos Competitivos */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <Trophy className="text-red-500" /> Datos Competitivos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Modalidad / Disciplina</label>
                      <input required type="text" placeholder="Ej. Karate, Taekwondo, BJJ..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.modalidad} onChange={e => setFormData({...formData, modalidad: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Nivel / Rango / Cinturón</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.nivel_experiencia} onChange={e => setFormData({...formData, nivel_experiencia: e.target.value})}>
                        <option value="Principiante">Principiante (Blanco/Amarillo)</option>
                        <option value="Intermedio">Intermedio (Verde/Azul)</option>
                        <option value="Avanzado">Avanzado (Rojo/Marrón)</option>
                        <option value="Cinturon Negro">Cinturón Negro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Peso Declarado (kg)</label>
                      <input required type="number" step="0.1" placeholder="Ej. 75.5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.peso_declarado} onChange={e => setFormData({...formData, peso_declarado: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Estatura Declarada (m)</label>
                      <input required type="number" step="0.01" placeholder="Ej. 1.75" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={formData.estatura_declarada} onChange={e => setFormData({...formData, estatura_declarada: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" disabled={status.loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-xl shadow-xl shadow-red-600/20 transition-all disabled:opacity-50">
                    {status.loading ? 'Enviando Inscripción...' : 'Confirmar Inscripción'}
                  </button>
                  <p className="text-center text-sm text-slate-400 mt-4 font-medium">
                    Al inscribirte, aceptas el reglamento oficial del torneo y te comprometes a presentarte al pesaje.
                  </p>
                </div>

              </form>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
