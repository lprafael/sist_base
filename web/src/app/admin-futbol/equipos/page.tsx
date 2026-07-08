"use client";
import React, { useState } from 'react';
import { X, Users, UserCog, Camera } from 'lucide-react';

export default function RegistroEquipoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    entrenador: "",
    logo_url: ""
  });

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10">
      
      {/* SIMULANDO EL MODAL O PANTALLA COMPLETA DE REGISTRO */}
      <div className="bg-white w-full max-w-2xl min-h-[600px] shadow-2xl relative flex flex-col">
        
        {/* HEADER */}
        <div className="p-4 border-b border-gray-200">
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={24} className="text-gray-700" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6 flex-1 flex flex-col">
          
          <div className="flex gap-6 mb-8">
            {/* ÁREA DE LOGO */}
            <div className="w-[120px] h-[140px] bg-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-400 transition relative group">
              {formData.logo_url ? (
                 <img src={formData.logo_url} className="w-full h-full object-cover rounded-lg" alt="Logo" />
              ) : (
                <>
                  <span className="text-3xl text-gray-500 mb-1">+</span>
                  <span className="text-xs text-gray-600 font-bold">200x240</span>
                </>
              )}
               <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center rounded-lg">
                  <input 
                    type="text" 
                    placeholder="URL Logo" 
                    value={formData.logo_url}
                    onChange={e => setFormData({...formData, logo_url: e.target.value})}
                    className="w-10/12 text-black px-1 py-1 text-xs rounded"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
            </div>

            {/* CAMPOS DE TEXTO (Estilo Material Design outline) */}
            <div className="flex-1 space-y-6 pt-2">
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " 
                />
                <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Nombre del equipo</label>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  value={formData.entrenador}
                  onChange={e => setFormData({...formData, entrenador: e.target.value})}
                  className="block px-3 py-3 w-full text-sm text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " 
                />
                <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Entrenador</label>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 mb-2" />

          {/* LISTAS / BOTONES (Jugadores, Equipo técnico) */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-4 py-4 px-2 hover:bg-gray-50 transition border-b border-gray-100">
              <Users size={24} className="text-green-600" />
              <span className="text-gray-700 text-lg">Jugadores</span>
            </button>
            <button className="w-full flex items-center gap-4 py-4 px-2 hover:bg-gray-50 transition border-b border-gray-100">
              <UserCog size={24} className="text-green-600" />
              <span className="text-gray-700 text-lg">Equipo técnico</span>
            </button>
          </div>

        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-white">
          <button className="text-red-500 font-bold text-lg hover:text-red-600 transition">
            Quitar
          </button>
          <button className="text-blue-500 font-bold text-lg hover:text-blue-600 transition">
            Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
