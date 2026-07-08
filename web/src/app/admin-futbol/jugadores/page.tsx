"use client";
import React, { useState } from 'react';
import { Camera, Save, UserPlus, Upload, ShieldCheck, X } from 'lucide-react';

export default function RegistroJugadoresPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    fecha_nacimiento: "",
    numero_camiseta: "",
    posicion: "",
    foto_url: ""
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        // En un caso real, aquí subiríamos la foto a un servidor o S3 y guardaríamos la URL
        setFormData({...formData, foto_url: "uploaded_image.jpg"});
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <UserPlus size={32} className="text-[#1b264f]" />
        <h1 className="text-3xl font-black text-[#1b264f]">Registro de Jugadores (Biometría)</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-gray-700">Añadir nuevo jugador</h2>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
            <ShieldCheck size={14}/> Biometría Activa
          </span>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* FOTO BIOMETRICA */}
          <div className="col-span-1 flex flex-col items-center">
            <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center relative overflow-hidden mb-4">
              {photoPreview ? (
                <img src={photoPreview} className="w-full h-full object-cover" alt="Biometria" />
              ) : (
                <>
                  <Camera size={40} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 font-bold text-center px-4">Foto para<br/>reconocimiento facial</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                capture="user"
                onChange={handlePhotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2">
              <Upload size={16}/> {photoPreview ? 'Cambiar Foto' : 'Subir o Tomar Foto'}
            </button>
          </div>

          {/* DATOS DEL JUGADOR */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Documento (DNI/CI)</label>
                <input 
                  type="text" 
                  value={formData.dni}
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Nac.</label>
                <input 
                  type="date" 
                  value={formData.fecha_nacimiento}
                  onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dorsal / N° Camiseta</label>
                <input 
                  type="number" 
                  value={formData.numero_camiseta}
                  onChange={e => setFormData({...formData, numero_camiseta: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Posición</label>
                <select 
                  value={formData.posicion}
                  onChange={e => setFormData({...formData, posicion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccione...</option>
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Mediocampista">Mediocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
          <button className="text-gray-600 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition">
            <Save size={18}/> Guardar Jugador
          </button>
        </div>

      </div>
    </div>
  );
}
