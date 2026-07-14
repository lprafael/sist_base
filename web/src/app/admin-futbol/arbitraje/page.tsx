"use client";
import React, { useState } from 'react';
import { ArrowLeft, Plus, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArbitrajePage() {
  const router = useRouter();
  const [arbitros, setArbitros] = useState([
    { id: '1', nombre: 'ArbitroXX', funcion: 'Arbitro' }
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentArbitro, setCurrentArbitro] = useState({ nombre: '', funcion: '' });

  const handleOpenNew = () => {
    setEditingId(null);
    setCurrentArbitro({ nombre: '', funcion: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (arbitro: any) => {
    setEditingId(arbitro.id);
    setCurrentArbitro({ nombre: arbitro.nombre, funcion: arbitro.funcion || '' });
    setShowModal(true);
  };

  const handleGuardar = () => {
    if (currentArbitro.nombre.trim()) {
      if (editingId) {
        setArbitros(arbitros.map(a => 
          a.id === editingId ? { ...a, nombre: currentArbitro.nombre, funcion: currentArbitro.funcion } : a
        ));
      } else {
        setArbitros([...arbitros, { 
          id: Date.now().toString(), 
          nombre: currentArbitro.nombre, 
          funcion: currentArbitro.funcion 
        }]);
      }
      setShowModal(false);
    }
  };

  const handleQuitar = () => {
    if (editingId) {
      setArbitros(arbitros.filter(a => a.id !== editingId));
      setShowModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 flex flex-col relative">
      
      {/* HEADER */}
      <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-full transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-medium tracking-wide">Arbitraje</h1>
        </div>
        <button 
          onClick={handleOpenNew}
          className="hover:bg-white/10 p-2 rounded-full transition"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* LISTA DE ARBITROS */}
      <div className="flex-1">
        {arbitros.map(arbitro => (
          <div 
            key={arbitro.id} 
            onClick={() => handleOpenEdit(arbitro)}
            className="py-4 px-4 border-b border-gray-300 text-lg hover:bg-gray-200 transition cursor-pointer flex items-center"
          >
            <span className="text-gray-700">{arbitro.nombre}</span>
            {arbitro.funcion ? <span className="text-sm text-gray-500 ml-2">({arbitro.funcion})</span> : null}
          </div>
        ))}
      </div>

      {/* MODAL ARBITRO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false);
        }}>
          <div className="bg-[#f3f0f7] rounded-[1.5rem] w-full max-w-sm p-6 shadow-2xl relative">
            <h2 className="text-2xl font-normal text-gray-800 mb-6">{editingId ? 'Editar árbitro' : 'Nuevo árbitro'}</h2>
            
            <div className="flex gap-4 mb-4">
              {/* Avatar placeholder */}
              <div className="w-20 h-24 bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User size={48} className="text-white" />
              </div>
              
              {/* Inputs */}
              <div className="flex-1 flex flex-col gap-4 justify-center">
                <div className="relative">
                  <input 
                    type="text" 
                    value={currentArbitro.nombre}
                    onChange={e => setCurrentArbitro({...currentArbitro, nombre: e.target.value})}
                    className="w-full bg-transparent border border-gray-400 rounded-md px-3 py-2 pt-3 outline-none focus:border-blue-500 peer"
                  />
                  <label className="absolute -top-2.5 left-2 bg-[#f3f0f7] px-1 text-sm text-gray-600">
                    Nombre
                  </label>
                </div>

                <div className="relative mt-2">
                  <input 
                    type="text" 
                    value={currentArbitro.funcion}
                    onChange={e => setCurrentArbitro({...currentArbitro, funcion: e.target.value})}
                    className="w-full bg-transparent border border-gray-400 rounded-md px-3 py-2 pt-3 outline-none focus:border-blue-500 peer"
                  />
                  <label className="absolute -top-2.5 left-2 bg-[#f3f0f7] px-1 text-sm text-gray-600">
                    Función
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-2 px-2">
              {editingId ? (
                <button 
                  onClick={handleQuitar}
                  className="text-red-500 font-bold px-4 py-2 hover:bg-red-100 rounded-lg transition text-lg"
                >
                  Quitar
                </button>
              ) : (
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 font-medium px-4 py-2 hover:bg-gray-200 rounded-lg transition text-lg"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleGuardar}
                className="text-blue-500 font-bold px-4 py-2 hover:bg-blue-100 rounded-lg transition text-lg"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
