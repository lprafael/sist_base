"use client";
import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  X, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Award, 
  ShieldAlert, 
  Loader2, 
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function PesajeOficialWKFModal({
  torneoId,
  onClose,
  onUpdated
}: {
  torneoId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [atletas, setAtletas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAtleta, setSelectedAtleta] = useState<any | null>(null);

  // Formulario de pesaje
  const [pesoInput, setPesoInput] = useState<string>('');
  const [limiteCategoria, setLimiteCategoria] = useState<number>(75);
  const [toleranciaKg, setToleranciaKg] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const [resultadoPesaje, setResultadoPesaje] = useState<any | null>(null);

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/checkin-list`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAtletas(data);
      }
    } catch (e) {
      console.error('Error fetching atletas para pesaje:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtletas();
  }, [torneoId]);

  const selectAtleta = (a: any) => {
    setSelectedAtleta(a);
    setPesoInput(a.peso_verificado ? String(a.peso_verificado) : (a.peso_declarado ? String(a.peso_declarado) : ''));
    setResultadoPesaje(null);

    // Intentar deducir límite de peso de su categoría
    const catStr = (a.categoria || a.equipo_nombre || '').toLowerCase();
    if (catStr.includes('60')) setLimiteCategoria(60);
    else if (catStr.includes('67')) setLimiteCategoria(67);
    else if (catStr.includes('75')) setLimiteCategoria(75);
    else if (catStr.includes('84')) setLimiteCategoria(84);
    else if (catStr.includes('50')) setLimiteCategoria(50);
    else if (catStr.includes('55')) setLimiteCategoria(55);
    else if (catStr.includes('61')) setLimiteCategoria(61);
    else if (catStr.includes('68')) setLimiteCategoria(68);
  };

  const handleEjecutarPesaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtleta || !pesoInput) return;

    setSaving(true);
    setResultadoPesaje(null);

    try {
      const res = await fetch(`${API_URL}/api/marciales/torneos/${torneoId}/pesaje-oficial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          participante_id: String(selectedAtleta.id),
          peso_registrado: parseFloat(pesoInput),
          peso_maximo_categoria: limiteCategoria,
          tolerancia_kg: toleranciaKg
        })
      });

      const data = await res.json();
      setResultadoPesaje(data);

      // Recargar lista
      fetchAtletas();
      if (onUpdated) onUpdated();
    } catch (e) {
      console.error('Error ejecutando pesaje oficial:', e);
      alert('Ocurrió un error al registrar el pesaje oficial.');
    } finally {
      setSaving(false);
    }
  };

  const pesoNum = parseFloat(pesoInput || '0');
  const limiteEfectivo = limiteCategoria + toleranciaKg;
  const estaDentroDePeso = pesoNum > 0 && pesoNum <= limiteEfectivo;
  const estaExcedido = pesoNum > limiteEfectivo;

  const filteredAtletas = atletas.filter(a =>
    a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    a.equipo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    a.dni?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[170] flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <Scale size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                Pesaje Oficial WKF & Gestión de Walkover (W.O.)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Tolerancia reglamentaria de ±1 kg. Descalificación y Walkover automático al oponente.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Body (2 Columnas) */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-6 text-xs">
          
          {/* COLUMNA IZQUIERDA: LISTA DE ATLETAS */}
          <div className="space-y-3 flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar atleta por nombre o dojo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex-1 max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-amber-500" /></div>
              ) : filteredAtletas.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No se encontraron atletas inscritos.</div>
              ) : (
                filteredAtletas.map(a => {
                  const isSelected = selectedAtleta?.id === a.id;
                  const isHabilitado = a.estado === 'Habilitado';
                  const isDescalificado = a.estado === 'Descalificado_Pesaje' || (a.estado || '').toLowerCase().includes('descalificado');

                  return (
                    <button
                      key={a.id}
                      onClick={() => selectAtleta(a)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate text-xs text-white">{a.nombre}</div>
                        <div className="text-[10px] text-slate-400 truncate">{a.equipo_nombre || 'Dojo / Escuela'}</div>
                      </div>

                      <div className="text-right shrink-0">
                        {isDescalificado ? (
                          <span className="bg-red-950/60 text-red-400 border border-red-800/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                            DESCALIFICADO
                          </span>
                        ) : isHabilitado ? (
                          <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                            {a.peso_verificado ? `${a.peso_verificado} kg` : 'HABILITADO'}
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            PENDIENTE
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: BÁSCULA OFICIAL Y RESULTADO */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            
            {selectedAtleta ? (
              <form onSubmit={handleEjecutarPesaje} className="space-y-4">
                
                {/* Datos del Atleta Seleccionado */}
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Atleta en Báscula:</span>
                  <h4 className="text-base font-black text-white">{selectedAtleta.nombre}</h4>
                  <p className="text-xs text-slate-400">{selectedAtleta.equipo_nombre || 'Dojo / Escuela'}</p>
                </div>

                {/* Parámetros de Pesaje WKF */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Límite Categoría (kg):
                    </label>
                    <select
                      value={limiteCategoria}
                      onChange={e => setLimiteCategoria(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-amber-500"
                    >
                      <option value={50}>-50 kg (Femenino)</option>
                      <option value={55}>-55 kg (Femenino / Junior)</option>
                      <option value={60}>-60 kg (Masculino)</option>
                      <option value={61}>-61 kg (Femenino / Cadete)</option>
                      <option value={67}>-67 kg (Masculino)</option>
                      <option value={68}>-68 kg (Femenino / Junior)</option>
                      <option value={75}>-75 kg (Masculino)</option>
                      <option value={84}>-84 kg (Masculino)</option>
                      <option value={100}>+84 kg (Open / Pesado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Tolerancia Oficial (kg):
                    </label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-300">
                      <span>±</span>
                      <input
                        type="number"
                        step="0.1"
                        value={toleranciaKg}
                        onChange={e => setToleranciaKg(parseFloat(e.target.value) || 0)}
                        className="bg-transparent w-16 text-white font-bold outline-none"
                      />
                      <span className="text-slate-400 text-[10px]">kg</span>
                    </div>
                  </div>
                </div>

                {/* Input de Peso Registrado */}
                <div>
                  <label className="text-[10px] font-black text-amber-400 uppercase block mb-1">
                    Peso Marcado en Báscula (kg):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      required
                      placeholder="Ej: 74.8"
                      value={pesoInput}
                      onChange={e => setPesoInput(e.target.value)}
                      className="w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-3 text-2xl font-mono font-black text-center text-white outline-none focus:border-amber-400 tracking-wider"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">KG</span>
                  </div>
                </div>

                {/* Visual Gauge / Estado en Vivo */}
                {pesoNum > 0 && (
                  <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                    estaDentroDePeso 
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                      : 'bg-red-950/50 border-red-600 text-red-300'
                  }`}>
                    {estaDentroDePeso ? <CheckCircle2 size={24} className="shrink-0 text-emerald-400" /> : <ShieldAlert size={24} className="shrink-0 text-red-500" />}
                    <div>
                      <div className="font-black text-xs uppercase">
                        {estaDentroDePeso ? 'APTO PARA COMPETIR' : 'PESO EXCEDIDO — FUERA DE REGLAMENTO'}
                      </div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        Límite efectivo con tolerancia: <strong>{limiteEfectivo.toFixed(1)} kg</strong>. Diferencia: <strong>{(pesoNum - limiteCategoria).toFixed(2)} kg</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón de Acción Principal */}
                <button
                  type="submit"
                  disabled={saving || !pesoInput}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 ${
                    estaExcedido
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : estaExcedido ? (
                    <><ShieldAlert size={16} /> Descalificar y Otorgar Walkover (W.O.)</>
                  ) : (
                    <><CheckCircle2 size={16} /> Registrar y Habilitar en la Llave</>
                  )}
                </button>

              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                <Scale size={40} className="opacity-40 mb-1" />
                <p className="font-bold text-slate-300">Selecciona un atleta de la lista</p>
                <p className="text-[10px] text-slate-500">Para registrar el pesaje oficial de su categoría.</p>
              </div>
            )}

            {/* Mensaje de Resultado tras Ejecutar */}
            {resultadoPesaje && (
              <div className={`p-3.5 rounded-2xl border text-xs animate-fadeIn ${
                resultadoPesaje.aprobado
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/60 border-red-600 text-red-300'
              }`}>
                <div className="font-bold">{resultadoPesaje.mensaje}</div>
                {resultadoPesaje.walkovers_aplicados > 0 && (
                  <div className="text-[10px] mt-1 text-amber-300">
                    🏆 {resultadoPesaje.walkovers_aplicados} oponente(s) avanzaron automáticamente a la siguiente ronda.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Info size={14} className="text-amber-400" />
            Reglamento WKF Art. 2: El pesaje oficial se realiza con tolerancia oficial estricta de ±1 kg.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-slate-300 font-bold hover:bg-slate-800 transition text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
