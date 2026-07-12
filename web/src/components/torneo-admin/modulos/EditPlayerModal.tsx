import React, { useState } from 'react';
import { X, Loader2, User } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function EditPlayerModal({ 
  jugador, 
  equipoId, 
  torneoId, 
  onClose, 
  onSaved 
}: any) {
  const [nombre, setNombre] = useState(jugador.nombre || '');
  const [dni, setDni] = useState(jugador.dni || '');
  const [email, setEmail] = useState(jugador.email || '');
  const [telefono, setTelefono] = useState(jugador.telefono || '');
  const [numero_camiseta, setNumeroCamiseta] = useState(jugador.numero_camiseta || '');
  const [posicion, setPosicion] = useState(jugador.posicion || '');
  const [fecha_nacimiento, setFechaNacimiento] = useState(jugador.fecha_nacimiento || '');
  const [estatura, setEstatura] = useState(jugador.estatura || '');
  const [peso, setPeso] = useState(jugador.peso || '');
  const [estado, setEstado] = useState(jugador.estado || 'en_revision');
  
  const [saving, setSaving] = useState(false);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nombre,
        dni,
        email,
        telefono,
        numero_camiseta: numero_camiseta ? parseInt(numero_camiseta) : null,
        posicion,
        fecha_nacimiento: fecha_nacimiento || null,
        estado,
        // The backend might not have estatura and peso in JugadorUpdate schema currently,
        // but we'll send it if supported.
      };

      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/equipos/${equipoId}/jugadores/${jugador.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onSaved();
      } else {
        alert("Error al actualizar el jugador");
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center p-4 z-[60] animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={18} className="text-blue-500" />
            Editar Jugador
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-player-form" onSubmit={handleSave} className="space-y-4">
            
            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Nombre completo</label>
              <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">DNI / Documento</label>
                <input type="text" value={dni} onChange={e => setDni(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Fecha de Nacimiento</label>
                <input type="date" value={fecha_nacimiento} onChange={e => setFechaNacimiento(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">N° Camiseta</label>
                <input type="number" value={numero_camiseta} onChange={e => setNumeroCamiseta(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Posición</label>
                <input type="text" value={posicion} onChange={e => setPosicion(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Teléfono</label>
                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Estatura (cm)</label>
                <input type="number" value={estatura} onChange={e => setEstatura(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Peso (kg)</label>
                <input type="number" value={peso} onChange={e => setPeso(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="relative">
              <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium text-slate-500">Estado de Inscripción</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white">
                <option value="en_revision">En Revisión (Pendiente)</option>
                <option value="habilitado">Habilitado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium">Cancelar</button>
          <button type="submit" form="edit-player-form" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Jugador'}
          </button>
        </div>
      </div>
    </div>
  );
}
