import React, { useState } from 'react';
import { X, Printer, FileText, Award, Shield, CheckCircle2 } from 'lucide-react';

export default function ActaBaloncestoModal({
  match,
  torneo,
  onClose
}: {
  match: any;
  torneo?: any;
  onClose: () => void;
}) {
  const stats = typeof match?.estadisticas === 'string'
    ? JSON.parse(match.estadisticas || '{}')
    : (match?.estadisticas || {});

  const nombreCampeonato = torneo?.nombre || match?.torneo_nombre || 'Torneo Oficial de Baloncesto';
  const categoria = match?.categoria || match?.fase || 'Categoría Primera Masculino';
  const cancha = match?.cancha || (match?.area ? `Cancha #${match.area}` : 'Estadio Principal');
  const fechaHora = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleString('es-ES') : new Date().toLocaleString('es-ES');
  const reglamento = stats.reglamento || 'FIBA';

  const nombreLocal = match?.jugador_local_nombre || match?.local_nombre || match?.equipo_local || 'Equipo Local';
  const nombreVisitante = match?.jugador_visitante_nombre || match?.visitante_nombre || match?.equipo_visitante || 'Equipo Visitante';

  const ptLocal = stats?.local?.puntos ?? match?.goles_local ?? 0;
  const ptVisitante = stats?.visitante?.puntos ?? match?.goles_visitante ?? 0;

  const tlLocal = stats?.local?.tiros_libres ?? 0;
  const doblesLocal = stats?.local?.dobles ?? 0;
  const triplesLocal = stats?.local?.triples ?? 0;
  const faltasLocal = stats?.local?.faltas_totales ?? 0;
  const tmLocal = stats?.local?.tiempos_muertos ?? 0;

  const tlVisitante = stats?.visitante?.tiros_libres ?? 0;
  const doblesVisitante = stats?.visitante?.dobles ?? 0;
  const triplesVisitante = stats?.visitante?.triples ?? 0;
  const faltasVisitante = stats?.visitante?.faltas_totales ?? 0;
  const tmVisitante = stats?.visitante?.tiempos_muertos ?? 0;

  const ganadorLado = stats?.ganador_lado || (ptLocal > ptVisitante ? 'local' : (ptVisitante > ptLocal ? 'visitante' : null));
  const ganadorNombre = ganadorLado === 'local' ? nombreLocal : (ganadorLado === 'visitante' ? nombreVisitante : 'Empate / En disputa');

  const [crewChief, setCrewChief] = useState('Árbitro Principal (Crew Chief)');
  const [umpire, setUmpire] = useState('Árbitro Auxiliar (Umpire)');
  const [anotador, setAnotador] = useState('Anotador Oficial de Mesa');
  const [cronometrador, setCronometrador] = useState('Operador de Cronómetro');
  const [observaciones, setObservaciones] = useState('');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acta Oficial de Baloncesto - ${nombreCampeonato}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
            .header { text-align: center; border-bottom: 3px solid #d97706; padding-bottom: 8px; margin-bottom: 12px; }
            .header h1 { font-size: 17px; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #b45309; }
            .header h2 { font-size: 12px; margin: 3px 0 0; color: #334155; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; margin-bottom: 12px; font-size: 10px; }
            .meta-item strong { color: #475569; display: block; font-size: 9px; text-transform: uppercase; }
            
            .score-box { display: grid; grid-template-columns: 1fr 90px 1fr; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
            .team-col { padding: 12px; }
            .home-col { background: #ecfeff; border-right: 1px solid #06b6d4; }
            .away-col { background: #fffbeb; border-left: 1px solid #f59e0b; }
            .vs-col { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #fff; font-weight: bold; font-size: 16px; }
            
            .team-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
            .home-title { color: #0891b2; }
            .away-title { color: #d97706; }
            .team-name { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
            .big-score { font-size: 38px; font-weight: 900; font-family: monospace; line-height: 1; }
            
            .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
            .detail-table th, .detail-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
            .detail-table th { background: #f1f5f9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            
            .winner-banner { background: #fef3c7; border: 2px solid #f59e0b; padding: 8px; border-radius: 6px; text-align: center; margin-bottom: 15px; }
            .winner-banner strong { font-size: 13px; text-transform: uppercase; color: #92400e; }
            
            .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 35px; }
            .sig-box { text-align: center; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 10px; }
            .sig-role { font-weight: bold; color: #334155; text-transform: uppercase; font-size: 9px; }
            
            .footer-notes { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Acta Oficial de Juego — Planilla de Baloncesto</h1>
            <h2>${nombreCampeonato} • Reglamento: ${reglamento}</h2>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>Torneo:</strong>
              ${nombreCampeonato}
            </div>
            <div class="meta-item">
              <strong>Fase / Categoría:</strong>
              ${categoria}
            </div>
            <div class="meta-item">
              <strong>Fecha y Hora:</strong>
              ${fechaHora}
            </div>
            <div class="meta-item">
              <strong>Cancha / Sede:</strong>
              ${cancha}
            </div>
          </div>

          <div class="score-box">
            <div class="team-col home-col">
              <div class="team-title home-title">Equipo Local (HOME)</div>
              <div class="team-name">${nombreLocal}</div>
              <div class="big-score" style="color: #0891b2;">${ptLocal}</div>
            </div>
            <div class="vs-col">
              <span>FINAL</span>
              <span style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${stats.periodo_actual || 'FINAL'}</span>
            </div>
            <div class="team-col away-col">
              <div class="team-title away-title">Equipo Visitante (AWAY)</div>
              <div class="team-name">${nombreVisitante}</div>
              <div class="big-score" style="color: #d97706;">${ptVisitante}</div>
            </div>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th style="text-align: left;">Equipo</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
                <th>OT</th>
                <th>T. Libres</th>
                <th>Dobles</th>
                <th>Triples</th>
                <th>Faltas</th>
                <th>Timeouts</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left; font-weight: bold; color: #0891b2;">${nombreLocal}</td>
                <td>${stats.local?.puntos_por_cuarto?.Q1 ?? '-'}</td>
                <td>${stats.local?.puntos_por_cuarto?.Q2 ?? '-'}</td>
                <td>${stats.local?.puntos_por_cuarto?.Q3 ?? '-'}</td>
                <td>${stats.local?.puntos_por_cuarto?.Q4 ?? '-'}</td>
                <td>${stats.local?.puntos_por_cuarto?.OT ?? '-'}</td>
                <td>${tlLocal}</td>
                <td>${doblesLocal}</td>
                <td>${triplesLocal}</td>
                <td>${faltasLocal}</td>
                <td>${tmLocal}</td>
                <td style="font-weight: 900; font-size: 13px; color: #0891b2;">${ptLocal}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-weight: bold; color: #d97706;">${nombreVisitante}</td>
                <td>${stats.visitante?.puntos_por_cuarto?.Q1 ?? '-'}</td>
                <td>${stats.visitante?.puntos_por_cuarto?.Q2 ?? '-'}</td>
                <td>${stats.visitante?.puntos_por_cuarto?.Q3 ?? '-'}</td>
                <td>${stats.visitante?.puntos_por_cuarto?.Q4 ?? '-'}</td>
                <td>${stats.visitante?.puntos_por_cuarto?.OT ?? '-'}</td>
                <td>${tlVisitante}</td>
                <td>${doblesVisitante}</td>
                <td>${triplesVisitante}</td>
                <td>${faltasVisitante}</td>
                <td>${tmVisitante}</td>
                <td style="font-weight: 900; font-size: 13px; color: #d97706;">${ptVisitante}</td>
              </tr>
            </tbody>
          </table>

          <div class="winner-banner">
            <strong>🏆 GANADOR DEL PARTIDO: ${ganadorNombre} (${ptLocal} - ${ptVisitante})</strong>
          </div>

          ${observaciones ? `
            <div style="margin-bottom: 15px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; font-size: 10px;">
              <strong>Observaciones de la Mesa:</strong> ${observaciones}
            </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <div>${crewChief}</div>
              <div class="sig-role">Árbitro Principal</div>
            </div>
            <div class="sig-box">
              <div>${umpire}</div>
              <div class="sig-role">Árbitro Auxiliar</div>
            </div>
            <div class="sig-box">
              <div>${anotador}</div>
              <div class="sig-role">Anotador Oficial</div>
            </div>
            <div class="sig-box">
              <div>${cronometrador}</div>
              <div class="sig-role">Cronometrador</div>
            </div>
          </div>

          <div class="footer-notes">
            Planilla Oficial certificada por el Sistema de Gestión de Torneos • Baloncesto Oficial ${reglamento}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">

        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={22} className="text-amber-400" />
            <h2 className="text-lg font-black text-amber-400 uppercase tracking-wide">
              Planilla Oficial de Juego (Acta de Baloncesto)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TARJETA MARCADOR */}
          <div className="grid grid-cols-3 bg-slate-950 rounded-2xl border border-slate-800 p-4 text-center items-center">
            <div>
              <span className="text-[10px] font-black uppercase text-cyan-400 block mb-1">LOCAL</span>
              <div className="text-xl font-black text-white">{nombreLocal}</div>
              <div className="text-5xl font-black font-mono text-cyan-400 mt-2">{ptLocal}</div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase mb-2">
                {reglamento}
              </span>
              <div className="text-xs font-bold text-slate-400 uppercase">Resultado Final</div>
              <div className="text-sm font-black text-emerald-400 mt-1">
                Ganador: {ganadorNombre}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 block mb-1">VISITANTE</span>
              <div className="text-xl font-black text-white">{nombreVisitante}</div>
              <div className="text-5xl font-black font-mono text-amber-400 mt-2">{ptVisitante}</div>
            </div>
          </div>

          {/* DESGLOSE POR CUARTOS */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-x-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Desglose Técnico Oficial
            </h3>
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                  <th className="py-2 text-left px-3">Equipo</th>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Q4</th>
                  <th>OT</th>
                  <th>T. Libres</th>
                  <th>Dobles</th>
                  <th>Triples</th>
                  <th>Faltas</th>
                  <th>Timeouts</th>
                  <th className="font-black text-amber-400">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold">
                <tr>
                  <td className="py-2.5 px-3 text-left font-black text-cyan-300">{nombreLocal}</td>
                  <td>{stats.local?.puntos_por_cuarto?.Q1 ?? '-'}</td>
                  <td>{stats.local?.puntos_por_cuarto?.Q2 ?? '-'}</td>
                  <td>{stats.local?.puntos_por_cuarto?.Q3 ?? '-'}</td>
                  <td>{stats.local?.puntos_por_cuarto?.Q4 ?? '-'}</td>
                  <td>{stats.local?.puntos_por_cuarto?.OT ?? '-'}</td>
                  <td>{tlLocal}</td>
                  <td>{doblesLocal}</td>
                  <td>{triplesLocal}</td>
                  <td>{faltasLocal}</td>
                  <td>{tmLocal}</td>
                  <td className="font-black text-cyan-400 text-sm">{ptLocal}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-left font-black text-amber-300">{nombreVisitante}</td>
                  <td>{stats.visitante?.puntos_por_cuarto?.Q1 ?? '-'}</td>
                  <td>{stats.visitante?.puntos_por_cuarto?.Q2 ?? '-'}</td>
                  <td>{stats.visitante?.puntos_por_cuarto?.Q3 ?? '-'}</td>
                  <td>{stats.visitante?.puntos_por_cuarto?.Q4 ?? '-'}</td>
                  <td>{stats.visitante?.puntos_por_cuarto?.OT ?? '-'}</td>
                  <td>{tlVisitante}</td>
                  <td>{doblesVisitante}</td>
                  <td>{triplesVisitante}</td>
                  <td>{faltasVisitante}</td>
                  <td>{tmVisitante}</td>
                  <td className="font-black text-amber-400 text-sm">{ptVisitante}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CUERPO ARBITRAL Y OFICIALES DE MESA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">
                Árbitro Principal (Crew Chief)
              </label>
              <input
                type="text"
                value={crewChief}
                onChange={e => setCrewChief(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">
                Árbitro Auxiliar (Umpire)
              </label>
              <input
                type="text"
                value={umpire}
                onChange={e => setUmpire(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">
                Anotador Oficial
              </label>
              <input
                type="text"
                value={anotador}
                onChange={e => setAnotador(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">
                Cronometrador
              </label>
              <input
                type="text"
                value={cronometrador}
                onChange={e => setCronometrador(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1 uppercase">
              Observaciones / Incidencias de la Mesa
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Descalificaciones, conducta antideportiva, reclamos técnicos..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white resize-none"
            />
          </div>

        </div>

        {/* FOOTER ACCIONES */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
          >
            <Printer size={16} /> Imprimir Planilla Oficial
          </button>
        </div>

      </div>
    </div>
  );
}
