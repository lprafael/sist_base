import React, { useState } from 'react';
import { X, Calendar, User, Paperclip, PlusCircle, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function EditMatchInfoModal({ 
  match, onClose, onSuccess 
}: { 
  match: any, onClose: () => void, onSuccess: () => void 
}) {
  const [titulo, setTitulo] = useState(match.titulo || '');
  const [fechaHora, setFechaHora] = useState(match.fecha_hora || '');
  const [sitio, setSitio] = useState(match.cancha || match.sitio || '');
  const [informacion, setInformacion] = useState(match.observaciones || '');

  // Section Toggles
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Subfields
  const [arbitros, setArbitros] = useState(match.arbitros || '');
  const [anexos, setAnexos] = useState(match.anexos || '');
  const [puntosExtra, setPuntosExtra] = useState(match.puntos_extra || '');
  const [encuestas, setEncuestas] = useState(match.encuestas || '');

  const [saving, setSaving] = useState(false);

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/partidos/${match.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          fecha_hora: fechaHora || null,
          cancha: sitio || null,
          observaciones: informacion || null,
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Error al guardar cambios');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? null : sec);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-[#f0edf5] border border-purple-200 text-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-purple-100">
          <h3 className="font-extrabold text-lg text-slate-800">Editar informacion</h3>
          <button onClick={onClose} className="p-1 hover:bg-purple-100 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Título */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 bg-[#f0edf5] px-1 absolute -top-2 left-3">
              Título
            </label>
            <input 
              type="text" 
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Partido de vuelta / Fase de Grupos"
              className="w-full bg-[#f0edf5] border border-purple-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Fecha y hora */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 bg-[#f0edf5] px-1 absolute -top-2 left-3 flex items-center gap-1">
              <Calendar size={12}/> Fecha y hora
            </label>
            <input 
              type="datetime-local" 
              value={fechaHora ? fechaHora.substring(0, 16) : ''}
              onChange={e => setFechaHora(e.target.value)}
              className="w-full bg-[#f0edf5] border border-purple-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Sitio */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 bg-[#f0edf5] px-1 absolute -top-2 left-3">
              Sitio
            </label>
            <input 
              type="text" 
              value={sitio}
              onChange={e => setSitio(e.target.value)}
              placeholder="Cancha 1 / Estadio Principal"
              className="w-full bg-[#f0edf5] border border-purple-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Información */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 bg-[#f0edf5] px-1 absolute -top-2 left-3">
              Información
            </label>
            <textarea 
              rows={3}
              value={informacion}
              onChange={e => setInformacion(e.target.value)}
              placeholder="Detalles o notas del partido..."
              className="w-full bg-[#f0edf5] border border-purple-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Expandable Sections */}
          <div className="border-t border-purple-200 pt-2 space-y-1">
            
            {/* Árbitros del partido */}
            <div className="border-b border-purple-100 py-2">
              <button 
                onClick={() => toggleSection('arbitros')}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1 hover:text-purple-600 transition"
              >
                <span className="flex items-center gap-2">
                  <User size={16} className="text-purple-600"/> Árbitros del partido
                </span>
                {openSection === 'arbitros' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              {openSection === 'arbitros' && (
                <div className="pt-2">
                  <input 
                    type="text" 
                    value={arbitros} 
                    onChange={e => setArbitros(e.target.value)}
                    placeholder="Nombre del árbitro principal / jueces"
                    className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs font-semibold outline-none"
                  />
                </div>
              )}
            </div>

            {/* Anexos */}
            <div className="border-b border-purple-100 py-2">
              <button 
                onClick={() => toggleSection('anexos')}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1 hover:text-purple-600 transition"
              >
                <span className="flex items-center gap-2">
                  <Paperclip size={16} className="text-purple-600"/> Anexos
                </span>
                {openSection === 'anexos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              {openSection === 'anexos' && (
                <div className="pt-2">
                  <input 
                    type="text" 
                    value={anexos} 
                    onChange={e => setAnexos(e.target.value)}
                    placeholder="Documentos o archivos adjuntos"
                    className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs font-semibold outline-none"
                  />
                </div>
              )}
            </div>

            {/* Puntos extra */}
            <div className="border-b border-purple-100 py-2">
              <button 
                onClick={() => toggleSection('puntos')}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1 hover:text-purple-600 transition"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle size={16} className="text-purple-600"/> Puntos extra
                </span>
                {openSection === 'puntos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              {openSection === 'puntos' && (
                <div className="pt-2">
                  <input 
                    type="text" 
                    value={puntosExtra} 
                    onChange={e => setPuntosExtra(e.target.value)}
                    placeholder="Puntos adicionales o sanciones"
                    className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs font-semibold outline-none"
                  />
                </div>
              )}
            </div>

            {/* Encuestas */}
            <div className="border-b border-purple-100 py-2">
              <button 
                onClick={() => toggleSection('encuestas')}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1 hover:text-purple-600 transition"
              >
                <span className="flex items-center gap-2">
                  <ListChecks size={16} className="text-purple-600"/> Encuestas
                </span>
                {openSection === 'encuestas' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              {openSection === 'encuestas' && (
                <div className="pt-2">
                  <input 
                    type="text" 
                    value={encuestas} 
                    onChange={e => setEncuestas(e.target.value)}
                    placeholder="Link o detalle de encuesta MVP"
                    className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs font-semibold outline-none"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-2 border-t border-purple-100 bg-[#f0edf5]">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-purple-100 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>
    </div>
  );
}
