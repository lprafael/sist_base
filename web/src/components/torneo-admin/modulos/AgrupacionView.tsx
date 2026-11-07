"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Trash2, Loader2, GitMerge, Shield, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Users, Scale, Zap, Dna } from 'lucide-react';
import PesajeOficialWKFModal from './PesajeOficialWKFModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function AgrupacionView({ torneoId }: { torneoId: string }) {
  const [llaves, setLlaves] = useState<any[]>([]);
  const [divisiones, setDivisiones] = useState<any[]>([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // WKF grouping state
  const [wkfStatus, setWkfStatus] = useState<{
    loading: boolean;
    done: boolean;
    error?: string;
    resumen?: { categoria: string; atletas: number }[];
    sin_categoria?: { id: string; nombre: string; razon: string }[];
  }>({ loading: false, done: false });
  const [showWkfDetail, setShowWkfDetail] = useState(false);

  // Sorteo WKF state
  const [sorteoLoading, setSorteoLoading] = useState(false);
  const [sorteoSuccess, setSorteoSuccess] = useState<string | null>(null);
  const [sorteoAvisos, setSorteoAvisos] = useState<string[]>([]);
  const [numTatamis, setNumTatamis] = useState<number>(3);
  const [selectedArea, setSelectedArea] = useState<number>(1);

  // Pesaje Modal state
  const [showPesajeModal, setShowPesajeModal] = useState(false);

  // Modal create llave
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedRonda, setSelectedRonda] = useState('Final');
  const [jugador1, setJugador1] = useState('');
  const [jugador2, setJugador2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLlaves();
    fetchDivisiones();
    fetchJugadores();
  }, [torneoId]);

  const getToken = () => {
    const session = JSON.parse(localStorage.getItem('user_session') || '{}');
    return session.access_token || session.token || '';
  };

  const handleGenerarSorteoWKF = async () => {
    if (!confirm(`¿Generar el sorteo oficial WKF en ${numTatamis} tatami(s)?\n\nSe arma una llave de eliminación directa por división (AKA arriba / AO abajo), con byes y separando a compañeros de dojo en la primera ronda.\nLas divisiones que ya tienen llave no se modifican.`)) return;
    setSorteoLoading(true);
    setSorteoSuccess(null);
    setSorteoAvisos([]);
    try {
      const res = await fetch(`${API_URL}/api/karate/torneos/${torneoId}/sorteo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ tatamis: numTatamis, aleatorio: true, reemplazar: false })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(res.status === 401 ? 'Tu sesión expiró. Iniciá sesión de nuevo.' : (data.detail || 'Error al generar sorteo'));
      setSorteoSuccess(data.mensaje + ' ' + (data.llaves || []).map((l: any) => `${l.division}: tatami ${l.tatami}`).join(' · '));
      setSorteoAvisos(data.avisos || []);
      fetchLlaves();
    } catch (e: any) {
      alert(e.message || 'Error al generar sorteo');
    } finally {
      setSorteoLoading(false);
    }
  };

  const handleAgruparWKF = async () => {
    if (!confirm('¿Agrupar a los atletas en las categorías del torneo?\n\nSe asigna cada atleta a su división según género, edad a la fecha del torneo, modalidad (Kata/Kumite) y peso del check-in (tolerancia ±1 kg).\nLos atletas que ya tienen división no se modifican.')) return;
    setWkfStatus({ loading: true, done: false });
    try {
      const res = await fetch(`${API_URL}/api/karate/torneos/${torneoId}/agrupar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ respetar_asignaciones: true, tolerancia_kg: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(res.status === 401 ? 'Tu sesión expiró. Iniciá sesión de nuevo.' : (data.detail || 'Error al agrupar'));
      setWkfStatus({
        loading: false,
        done: true,
        resumen: data.resumen || [],
        sin_categoria: data.sin_categoria || []
      });
      fetchLlaves();
      fetchDivisiones();
    } catch (e: any) {
      setWkfStatus({ loading: false, done: false, error: e.message });
    }
  };

  const fetchLlaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/llaves`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setLlaves(await res.json());
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fetchDivisiones = async () => {
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/divisiones`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setDivisiones(await res.json());
    } catch(e) { console.error(e); }
  };

  const fetchJugadores = async () => {
    try {
      const res = await fetch(`${API_URL}/api/karate/torneos/${torneoId}/atletas`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if(res.ok) setJugadoresDisponibles((await res.json()).atletas || []);
    } catch(e) { console.error(e); }
  };

  const handleCreateLlave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDivision || !jugador1 || !jugador2 || jugador1 === jugador2) {
      alert("Por favor, seleccione dos atletas diferentes.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/futbol/torneos/${torneoId}/llaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ 
          division_id: selectedDivision, 
          ronda: selectedRonda,
          jugador_local_id: jugador1,
          jugador_visitante_id: jugador2,
          area: selectedArea
        })
      });
      if(!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'No se pudo programar el combate');
      } else {
        setIsCreating(false);
        setJugador1('');
        setJugador2('');
        fetchLlaves();
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const handleDeleteLlave = async (id: string) => {
    if(!confirm("¿Eliminar esta llave/combate?")) return;
    try {
      await fetch(`${API_URL}/futbol/llaves/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchLlaves();
    } catch(e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>;

  // Group llaves by division
  const llavesPorDivision = llaves.reduce((acc: any, curr: any) => {
    if(!acc[curr.division_nombre]) acc[curr.division_nombre] = [];
    acc[curr.division_nombre].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* ===== PANEL AGRUPACIÓN WKF ===== */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 rounded-xl p-2.5 shadow-md">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Agrupación Automática WKF</h3>
              <p className="text-slate-400 text-xs mt-0.5">Clasifica a todos los atletas habilitados según el reglamento oficial de la Federación Mundial de Karate.</p>
            </div>
          </div>
          <button
            id="btn-agrupar-wkf"
            onClick={handleAgruparWKF}
            disabled={wkfStatus.loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md whitespace-nowrap"
          >
            {wkfStatus.loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {wkfStatus.loading ? 'Agrupando...' : 'Agrupar por WKF'}
          </button>
        </div>

        {/* Error */}
        {wkfStatus.error && (
          <div className="mt-4 flex items-start gap-2 bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{wkfStatus.error}</span>
          </div>
        )}

        {/* Resultado exitoso */}
        {wkfStatus.done && wkfStatus.resumen && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 size={16} />
              {wkfStatus.resumen.reduce((n, c) => n + c.atletas, 0)} atletas agrupados en {wkfStatus.resumen.length} divisiones
            </div>

            {/* Resumen de categorías */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {wkfStatus.resumen.map((cat, i) => {
                const isKumite = cat.categoria.startsWith('Kumite');
                const isParaKarate = cat.categoria.startsWith('Para');
                const color = isParaKarate ? 'border-purple-600 bg-purple-900/30' : isKumite ? 'border-red-600 bg-red-900/20' : 'border-blue-600 bg-blue-900/20';
                const badge = isParaKarate ? 'bg-purple-700 text-purple-100' : isKumite ? 'bg-red-700 text-red-100' : 'bg-blue-700 text-blue-100';
                return (
                  <div key={i} className={`border ${color} rounded-xl p-3 flex items-center justify-between gap-2`}>
                    <span className="text-white text-xs font-medium leading-tight">{cat.categoria}</span>
                    <span className={`${badge} text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0`}>
                      <Users size={10} /> {cat.atletas}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sin categoría */}
            {wkfStatus.sin_categoria && wkfStatus.sin_categoria.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-3">
                <button
                  onClick={() => setShowWkfDetail(!showWkfDetail)}
                  className="flex items-center gap-2 text-yellow-400 text-sm font-semibold w-full"
                >
                  <AlertTriangle size={14} />
                  {wkfStatus.sin_categoria.length} atleta(s) sin categoría asignada
                  {showWkfDetail ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showWkfDetail && (
                  <ul className="mt-2 space-y-1">
                    {wkfStatus.sin_categoria.map(a => (
                      <li key={a.id} className="text-yellow-200 text-xs pl-4">
                        • <strong>{a.nombre}</strong> — {a.razon}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== CABECERA LLAVES Y ACCIONES OFICIALES WKF ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <GitMerge size={20} className="text-blue-500"/>
          Fases, Llaves y Emparejamientos WKF
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Pesaje Oficial */}
          <button 
            onClick={() => setShowPesajeModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Scale size={15} /> Pesaje Oficial (±1kg / Walkover)
          </button>

          {/* Cantidad de tatamis para repartir las divisiones */}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            Tatamis
            <select value={numTatamis} onChange={e => setNumTatamis(Number(e.target.value))} className="bg-transparent outline-none font-black text-slate-800">
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          {/* Botón Sorteo WKF */}
          <button
            onClick={handleGenerarSorteoWKF}
            disabled={sorteoLoading}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-3.5 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            {sorteoLoading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className="text-yellow-300" />}
            Sorteo de Llaves WKF (Colores AKA/AO)
          </button>

          {/* Programar Combate Manual */}
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Programar Manual
          </button>
        </div>
      </div>

      {sorteoSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{sorteoSuccess}</span>
        </div>
      )}
      {sorteoAvisos.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-amber-800 text-xs space-y-0.5">
          {sorteoAvisos.map((a, i) => <div key={i}>⚠️ {a}</div>)}
        </div>
      )}


      {Object.keys(llavesPorDivision).length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
          <Trophy size={48} className="mb-4 opacity-50" />
          <p>No hay llaves o combates programados aún.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(llavesPorDivision).map(division => (
            <div key={division} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                <h4 className="font-bold text-slate-700">{division}</h4>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {llavesPorDivision[division].map((llave: any) => (
                  <div key={llave.id} className="border border-slate-200 rounded-lg p-4 relative hover:border-blue-300 transition shadow-sm">
                    <button 
                      onClick={() => handleDeleteLlave(llave.id)} 
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm border border-slate-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 pr-6">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{llave.ronda}</span>
                      {llave.area && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">Tatami {llave.area}</span>}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        llave.estado === 'finalizado' ? 'bg-emerald-50 text-emerald-700'
                        : (!llave.jugador_local_id || !llave.jugador_visitante_id) ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-50 text-amber-700'}`}>
                        {llave.estado === 'finalizado' ? (llave.es_wo ? 'Walkover' : 'Finalizado') : (!llave.jugador_local_id || !llave.jugador_visitante_id) ? 'Esperando rivales' : 'Programado'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-red-50/60 p-2 rounded border border-red-100">
                        <span className={`font-medium text-sm truncate ${llave.jugador_local_nombre ? 'text-slate-700' : 'text-slate-400 italic'}`}>{llave.jugador_local_nombre || 'Por definir'}</span>
                        <span className="flex items-center gap-1">
                          {llave.estado === 'finalizado' && <span className="text-xs font-black text-slate-600">{llave.goles_local ?? 0}</span>}
                          {llave.ganador_jugador_id && llave.ganador_jugador_id === llave.jugador_local_id && <Trophy size={14} className="text-yellow-500" />}
                        </span>
                      </div>
                      <div className="text-center text-xs text-slate-400 font-bold">VS</div>
                      <div className="flex justify-between items-center bg-blue-50/60 p-2 rounded border border-blue-100">
                        <span className={`font-medium text-sm truncate ${llave.jugador_visitante_nombre ? 'text-slate-700' : 'text-slate-400 italic'}`}>{llave.jugador_visitante_nombre || 'Por definir'}</span>
                        <span className="flex items-center gap-1">
                          {llave.estado === 'finalizado' && <span className="text-xs font-black text-slate-600">{llave.goles_visitante ?? 0}</span>}
                          {llave.ganador_jugador_id && llave.ganador_jugador_id === llave.jugador_visitante_id && <Trophy size={14} className="text-yellow-500" />}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Llave */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Programar Nuevo Combate (Llave)</h3>
            </div>
            <form onSubmit={handleCreateLlave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">División / Categoría</label>
                <select required value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="">Seleccione una división</option>
                  {divisiones.map(d => (
                    <option key={d.id} value={d.id}>{d.categoria_nombre} - {d.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ronda / Fase</label>
                <select required value={selectedRonda} onChange={e => setSelectedRonda(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  <option value="Final">Final</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Cuartos de Final">Cuartos de Final</option>
                  <option value="Octavos de Final">Octavos de Final</option>
                  <option value="Clasificatoria">Clasificatoria</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tatami</label>
                <select value={selectedArea} onChange={e => setSelectedArea(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm">
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Tatami {n}</option>)}
                </select>
              </div>

              {(() => {
                // Solo atletas de la división elegida (si ya se agrupó); si no, todos con aviso
                const deDivision = jugadoresDisponibles.filter(j => j.division_id === selectedDivision && (j.estado || '').toLowerCase() !== 'descalificado');
                const lista = deDivision.length > 0 ? deDivision : jugadoresDisponibles;
                return (
                  <>
                    {selectedDivision && deDivision.length === 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Ningún atleta está asignado a esta división todavía: se muestran todos. Usá «Agrupar por WKF» para filtrar por categoría.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Atleta Rojo (AKA)</label>
                        <select required value={jugador1} onChange={e => setJugador1(e.target.value)} className="w-full px-3 py-2 border border-red-300 rounded focus:ring-red-500 focus:border-red-500 text-sm bg-red-50">
                          <option value="">Seleccionar...</option>
                          {lista.map(j => (
                            <option key={j.id} value={j.id}>{j.nombre}{j.equipo_nombre ? ` (${j.equipo_nombre})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Atleta Azul (AO)</label>
                        <select required value={jugador2} onChange={e => setJugador2(e.target.value)} className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500 text-sm bg-blue-50">
                          <option value="">Seleccionar...</option>
                          {lista.filter(j => j.id !== jugador1).map(j => (
                            <option key={j.id} value={j.id}>{j.nombre}{j.equipo_nombre ? ` (${j.equipo_nombre})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2 pt-6">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                  {saving ? 'Guardando...' : 'Programar Combate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pesaje Oficial WKF */}
      {showPesajeModal && (
        <PesajeOficialWKFModal
          torneoId={torneoId}
          onClose={() => setShowPesajeModal(false)}
          onUpdated={() => {
            fetchJugadores();
            fetchLlaves();
          }}
        />
      )}
    </div>
  );
}
