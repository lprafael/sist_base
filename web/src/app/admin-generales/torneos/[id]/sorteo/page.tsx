"use client";
import React, { useState } from 'react';
import { ArrowLeft, GitMerge, UserMinus, UserPlus, Save, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Participante {
  id: string;
  nombre: string;
  edad: number;
  peso: number;
  cinturon: string;
  genero: string;
}

interface Categoria {
  id_temporal: string;
  nombre: string;
  genero: string;
  cinturon: string;
  participantes: Participante[];
  alertas: string[];
}

export default function SorteoProfesional({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{p: Participante, fromCatId: string} | null>(null);

  const generarLlaves = async () => {
    setLoading(true);
    try {
      // Data dummy de participantes (En la vida real vendría de get_participantes)
      const mockParticipantes = [
        { id: "1", nombre: "Juan Perez", edad: 25, peso: 75.5, cinturon: "Azul", genero: "M" },
        { id: "2", nombre: "Carlos Ruiz", edad: 26, peso: 74.0, cinturon: "Azul", genero: "M" },
        { id: "3", nombre: "Luis Silva", edad: 28, peso: 82.0, cinturon: "Azul", genero: "M" }, // Se quedará solo
        { id: "4", nombre: "Maria Gomez", edad: 22, peso: 55.0, cinturon: "Negro", genero: "F" },
      ];

      const res = await fetch('http://localhost:8001/sorteos/generar-llaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneo_id: params.id, participantes: mockParticipantes })
      });
      const data = await res.json();
      setCategorias(data.categorias);
    } catch (e) {
      console.error(e);
      alert("Error al generar llaves automáticas");
    } finally {
      setLoading(false);
    }
  };

  const guardarSorteo = async () => {
    try {
      const res = await fetch('http://localhost:8001/sorteos/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneo_id: params.id, categorias })
      });
      if (res.ok) {
        alert("Sorteo Guardado y Oficializado Exitosamente!");
        router.push(`/admin-generales/torneos/${params.id}`);
      }
    } catch(e) {
      alert("Error al guardar el sorteo oficial");
    }
  };

  const handleDragStart = (e: React.DragEvent, p: Participante, fromCatId: string) => {
    setDraggedItem({ p, fromCatId });
  };

  const handleDrop = (e: React.DragEvent, toCatId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.fromCatId === toCatId) return; // Mismo grupo

    // Mover participante
    setCategorias(prev => {
      const newState = [...prev];
      const sourceCat = newState.find(c => c.id_temporal === draggedItem.fromCatId);
      const targetCat = newState.find(c => c.id_temporal === toCatId);
      
      if (sourceCat && targetCat) {
        sourceCat.participantes = sourceCat.participantes.filter(x => x.id !== draggedItem.p.id);
        targetCat.participantes.push(draggedItem.p);
        
        // Re-evaluar alertas
        sourceCat.alertas = sourceCat.participantes.length === 1 ? ["Categoría con 1 solo competidor. Sugerencia: Unificar"] : [];
        targetCat.alertas = targetCat.participantes.length === 1 ? ["Categoría con 1 solo competidor. Sugerencia: Unificar"] : [];
      }
      return newState;
    });
    setDraggedItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-lg transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-black text-blue-900">Sorteo Profesional ASAM</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={generarLlaves} disabled={loading} className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition shadow-sm flex items-center gap-2">
              <GitMerge size={20} />
              {loading ? 'Procesando Algoritmo...' : 'Agrupar Automáticamente'}
            </button>
            {categorias.length > 0 && (
              <button onClick={guardarSorteo} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md flex items-center gap-2">
                <Save size={20} /> Oficializar Llaves
              </button>
            )}
          </div>
        </div>

        {categorias.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm">
            <GitMerge size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-600">Aún no se han generado las llaves</h2>
            <p className="text-gray-500 mt-2">Haz clic en "Agrupar Automáticamente" para que el algoritmo divida a los competidores según su edad, peso, cinturón y género.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categorias.map(cat => (
              <div 
                key={cat.id_temporal} 
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, cat.id_temporal)}
              >
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{cat.nombre}</h3>
                    <p className="text-sm text-gray-500">Participantes: {cat.participantes.length}</p>
                  </div>
                </div>

                {cat.alertas.length > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2 text-orange-700 text-sm font-semibold">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>{cat.alertas[0]}</p>
                  </div>
                )}

                <div className="space-y-3 min-h-[100px]">
                  {cat.participantes.length === 0 ? (
                    <div className="text-center text-gray-400 py-4 italic border-2 border-dashed border-gray-200 rounded-xl">
                      Arrastra competidores aquí
                    </div>
                  ) : (
                    cat.participantes.map(p => (
                      <div 
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p, cat.id_temporal)}
                        className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center cursor-grab active:cursor-grabbing hover:bg-blue-100 transition"
                      >
                        <div>
                          <p className="font-bold text-blue-900">{p.nombre}</p>
                          <p className="text-xs text-blue-700">{p.edad} años • {p.peso} kg • {p.cinturon}</p>
                        </div>
                        <UserMinus size={18} className="text-blue-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
