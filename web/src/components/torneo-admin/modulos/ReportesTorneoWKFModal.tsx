"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Search, 
  FileText, 
  Shield, 
  User, 
  Calendar, 
  Trophy, 
  CheckCircle2, 
  Clock,
  Building,
  Filter,
  Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function ReportesTorneoWKFModal({
  torneoId,
  torneo,
  onClose
}: {
  torneoId: string;
  torneo?: any;
  onClose: () => void;
}) {
  const [atletas, setAtletas] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscuela, setSelectedEscuela] = useState<string>('all');
  const [search, setSearch] = useState('');

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('user_session') || '{}');
      return session.access_token || session.token || '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resAtletas, resPartidos] = await Promise.all([
          fetch(`${API_URL}/futbol/torneos/${torneoId}/checkin-list`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
          fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`)
        ]);

        if (resAtletas.ok) setAtletas(await resAtletas.json());
        if (resPartidos.ok) setPartidos(await resPartidos.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [torneoId]);

  // Lista única de escuelas
  const escuelas = Array.from(
    new Set(atletas.map(a => a.equipo_nombre?.trim() || 'Independiente / Sin Escuela').filter(Boolean))
  ).sort();

  // Filtrar atletas de la escuela seleccionada
  const atletasFiltrados = atletas.filter(a => {
    const esc = a.equipo_nombre?.trim() || 'Independiente / Sin Escuela';
    const matchEsc = selectedEscuela === 'all' || esc === selectedEscuela;
    const matchTxt = a.nombre?.toLowerCase().includes(search.toLowerCase()) || a.dni?.includes(search);
    return matchEsc && matchTxt;
  });

  // Obtener combates programados para estos atletas
  const getCombatesAtleta = (atletaId: string) => {
    return partidos.filter(p => 
      String(p.equipo_local_id) === String(atletaId) || 
      String(p.equipo_visitante_id) === String(atletaId) ||
      String(p.jugador_local_id) === String(atletaId) || 
      String(p.jugador_visitante_id) === String(atletaId)
    );
  };

  const handlePrintReporte = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tituloEscuela = selectedEscuela === 'all' ? 'Todas las Escuelas / Dojos' : selectedEscuela;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Oficial por Escuela - ${tituloEscuela}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; margin-bottom: 15px; }
            .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; color: #b91c1c; }
            .header h2 { font-size: 12px; margin: 3px 0 0; color: #334155; }
            
            .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; margin-bottom: 15px; font-size: 10px; display: flex; justify-content: space-between; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 9px; }
            
            .atleta-box { margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #fff; page-break-inside: avoid; }
            .atleta-header { font-weight: bold; font-size: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; }
            
            .match-chip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 6px; margin-top: 4px; font-size: 9px; }
            
            .footer { font-size: 8px; text-align: center; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Nómina Oficial y Cronograma de Combates por Escuela</h1>
            <h2>${torneo?.nombre || 'Torneo Oficial WKF'}</h2>
          </div>

          <div class="meta-box">
            <div><strong>Escuela / Dojo:</strong> ${tituloEscuela}</div>
            <div><strong>Total Atletas:</strong> ${atletasFiltrados.length} competidores</div>
            <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleString('es-ES')}</div>
          </div>

          <h3>LISTADO DE COMPETIDORES REGISTRADOS</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre del Competidor</th>
                <th>DNI / Doc</th>
                <th>Categoría / Modalidad</th>
                <th>Peso Verificado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${atletasFiltrados.map((a, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${a.nombre}</strong></td>
                  <td>${a.dni || '-'}</td>
                  <td>${a.categoria || 'Kumite / Kata'}</td>
                  <td>${a.peso_verificado ? `${a.peso_verificado} kg` : (a.peso_declarado ? `${a.peso_declarado} kg (Decl.)` : '-')}</td>
                  <td>${a.estado || 'Habilitado'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3>CRONOGRAMA DE COMBATES Y ÁREAS ASIGNADAS (TATAMIS)</h3>
          ${atletasFiltrados.map(a => {
            const matches = getCombatesAtleta(a.id);
            if (matches.length === 0) return '';
            return `
              <div class="atleta-box">
                <div class="atleta-header">
                  <span>🥋 ${a.nombre} (${a.equipo_nombre || 'Dojo'})</span>
                  <span style="font-size: 10px; color: #64748b;">${matches.length} Combate(s)</span>
                </div>
                ${matches.map((m, mIdx) => `
                  <div class="match-chip">
                    <strong>Combate #${m.jornada || mIdx + 1} (${m.fase || 'Eliminatoria'}):</strong> 
                    Área: <strong>${m.area ? `Tatami #${m.area}` : 'Tatami Asignado'}</strong> | 
                    ${m.local_nombre} <em>(AKA/Rojo)</em> vs ${m.visitante_nombre} <em>(AO/Azul)</em> | 
                    Estado: <strong>${m.estado ? m.estado.toUpperCase() : 'PROGRAMADO'}</strong>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}

          <div class="footer">
            Documento de control oficial entregado a Instructores y Coaches. Válido para control de pesaje y calentamiento en áreas de tatami.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[170] flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-600 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <Building size={22} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                Reportes Oficiales por Escuela / Dojo (Instructores & Coaches)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Imprime la lista segmentada de competidores y llaves específicas para cada Sensei.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Filtros de Escuela y Búsqueda */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <label className="font-bold text-slate-400 shrink-0">Seleccionar Escuela / Dojo:</label>
            <select
              value={selectedEscuela}
              onChange={e => setSelectedEscuela(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-red-500 flex-1 max-w-xs"
            >
              <option value="all">Todas las Escuelas ({atletas.length} atletas)</option>
              {escuelas.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Buscar por atleta o DNI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Listado de Atletas y sus Combates */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" size={32} /></div>
          ) : atletasFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <User size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold">No se encontraron atletas para los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atletasFiltrados.map((atleta, idx) => {
                const combates = getCombatesAtleta(atleta.id);
                return (
                  <div key={atleta.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white">{atleta.nombre}</h4>
                          <span className="text-[10px] text-slate-400">{atleta.equipo_nombre || 'Independiente'} • DNI: {atleta.dni || '-'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          Peso: {atleta.peso_verificado ? `${atleta.peso_verificado} kg` : (atleta.peso_declarado ? `${atleta.peso_declarado} kg` : '-')}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          atleta.estado === 'Habilitado' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {atleta.estado || 'Habilitado'}
                        </span>
                      </div>
                    </div>

                    {/* Combates del atleta */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Combates Asignados en Tatamis ({combates.length}):
                      </span>
                      {combates.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic">No tiene combates programados aún en las llaves.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {combates.map((c, cIdx) => (
                            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] flex items-center justify-between gap-2">
                              <div>
                                <span className="text-red-400 font-bold block text-[10px]">
                                  {c.area ? `Tatami #${c.area}` : 'Tatami'} • {c.fase || `Combate #${cIdx + 1}`}
                                </span>
                                <div className="text-slate-200 font-bold truncate max-w-xs">
                                  {c.local_nombre} vs {c.visitante_nombre}
                                </div>
                              </div>
                              <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase">
                                {c.estado || 'Prog.'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-400 font-bold">
            Total Mostrado: {atletasFiltrados.length} Competidor(es)
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition text-xs"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrintReporte}
              disabled={atletasFiltrados.length === 0}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
            >
              <Printer size={16} /> Imprimir Reporte para Sensei / Coach (A4)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
