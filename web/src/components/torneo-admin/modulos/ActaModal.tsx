import React, { useState } from 'react';
import { ArrowLeft, FileText, Download, Printer, Plus, Minus, ChevronDown } from 'lucide-react';

export default function ActaModal({ match, torneo, onClose }: { match: any, torneo?: any, onClose: () => void }) {
  // Informaciones Generales
  const [nombreCampeonato, setNombreCampeonato] = useState(torneo?.nombre || 'Copa de Campeones 2026');
  const [nombreCategoria, setNombreCategoria] = useState(match.categoria || 'Primera División');
  const [fase, setFase] = useState(match.fase || '1º Fase');
  const [jornada, setJornada] = useState(`1º Fecha`);
  const [numJuego, setNumJuego] = useState(match.id?.substring(0, 4) || '101');
  const [sitio, setSitio] = useState(match.cancha || 'Cancha Central');
  const [fecha, setFecha] = useState(match.fecha_hora ? match.fecha_hora.split('T')[0] : '');
  const [hora, setHora] = useState(match.fecha_hora ? match.fecha_hora.split('T')[1]?.substring(0, 5) : '18:00');

  // Datos del acta
  const [formatoActa, setFormatoActa] = useState('Acta 1 (Vertical)');
  const [cronologia, setCronologia] = useState(true);
  const [escudoTorneo, setEscudoTorneo] = useState(false);
  const [cantJugadores, setCantJugadores] = useState(20);

  const [columna1, setColumna1] = useState('Nº de camiseta/Registro');
  const [columna2, setColumna2] = useState('Firma');
  const [columna3, setColumna3] = useState('Teléfono');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Acta de Partido - ${nombreCampeonato}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 22px; }
            h2 { text-align: center; color: #475569; font-size: 14px; margin-top: 0; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            .meta-table td, .meta-table th { border: 1px solid #cbd5e1; padding: 6px 10px; }
            .roster-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            .roster-table td, .roster-table th { border: 1px solid #94a3b8; padding: 6px; text-align: center; }
            .team-header { background: #f1f5f9; font-weight: bold; text-align: left; }
          </style>
        </head>
        <body>
          <h1>ACTA OFICIAL DE PARTIDO</h1>
          <h2>${nombreCampeonato} — ${nombreCategoria}</h2>
          
          <table class="meta-table">
            <tr>
              <td><strong>Fase:</strong> ${fase}</td>
              <td><strong>Jornada:</strong> ${jornada}</td>
              <td><strong>Nº Juego:</strong> ${numJuego}</td>
            </tr>
            <tr>
              <td><strong>Lugar:</strong> ${sitio}</td>
              <td><strong>Fecha:</strong> ${fecha}</td>
              <td><strong>Hora:</strong> ${hora}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: center; font-size: 16px; font-weight: bold; padding: 10px;">
                ${match.jugador_local_nombre || match.local_nombre || 'Equipo 1'} (${match.goles_local ?? 0}) 
                VS 
                ${match.jugador_visitante_nombre || match.visitante_nombre || 'Equipo 2'} (${match.goles_visitante ?? 0})
              </td>
            </tr>
          </table>

          <h3>PLANILLA DE JUGADORES Y FIRMAS</h3>
          <table class="roster-table">
            <thead>
              <tr style="background: #e2e8f0;">
                <th>#</th>
                <th>Jugador</th>
                <th>${columna1}</th>
                <th>${columna2}</th>
                <th>${columna3}</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: cantJugadores }).map((_, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td style="text-align: left;">____________________</td>
                  <td>______</td>
                  <td>____________________</td>
                  <td>____________________</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eeebf5] border border-indigo-200 text-slate-800 w-full max-w-lg h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* TOP NAVBAR (Matching Images 5 & 6) */}
        <div className="bg-[#191942] text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition flex items-center gap-1">
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-wide">Acta</span>
          <button onClick={handlePrint} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Imprimir / Exportar PDF">
            <FileText size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {/* Informaciones Generales */}
          <div>
            <h4 className="font-black text-sm text-slate-800 mb-3">Informaciones Generales</h4>
            
            <div className="space-y-3">
              {/* Nombre del campeonato */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Nombre del campeonato
                </label>
                <input 
                  type="text" 
                  value={nombreCampeonato}
                  onChange={e => setNombreCampeonato(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Nombre de la categoría */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Nombre de la categoría
                </label>
                <input 
                  type="text" 
                  value={nombreCategoria}
                  onChange={e => setNombreCategoria(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Fase */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Fase
                </label>
                <input 
                  type="text" 
                  value={fase}
                  onChange={e => setFase(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Fecha */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Fecha
                </label>
                <input 
                  type="text" 
                  value={jornada}
                  onChange={e => setJornada(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Número de juego */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Número de juego
                </label>
                <input 
                  type="text" 
                  value={numJuego}
                  onChange={e => setNumJuego(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Sitio */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Sitio
                </label>
                <input 
                  type="text" 
                  value={sitio}
                  onChange={e => setSitio(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Fecha Real */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Fecha
                </label>
                <input 
                  type="date" 
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              {/* Hora */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                  Hora
                </label>
                <input 
                  type="time" 
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seleccionar jugadores */}
          <div>
            <h4 className="font-black text-sm text-slate-800 mb-2">Seleccionar jugadores</h4>
            <div className="space-y-2">
              <button className="w-full bg-[#eeebf5] border border-slate-300 py-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition shadow-sm">
                {match.jugador_local_nombre || match.local_nombre || 'Equipo 1'}
              </button>
              <button className="w-full bg-[#eeebf5] border border-slate-300 py-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition shadow-sm">
                {match.jugador_visitante_nombre || match.visitante_nombre || 'Equipo 2'}
              </button>
            </div>
          </div>

          {/* Datos del acta (Matching Image 6) */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-black text-sm text-slate-800">Datos del acta</h4>
              <select 
                value={formatoActa} 
                onChange={e => setFormatoActa(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Acta 1 (Vertical)">Acta 1 (Vertical)</option>
                <option value="Acta 2 (Horizontal)">Acta 2 (Horizontal)</option>
              </select>
            </div>

            <div className="space-y-3 divide-y divide-slate-200">
              
              {/* Cronología */}
              <label className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700 cursor-pointer">
                <span>Cronología</span>
                <input 
                  type="checkbox" 
                  checked={cronologia} 
                  onChange={e => setCronologia(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4" 
                />
              </label>

              {/* Agregar escudo de campeonato */}
              <label className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700 cursor-pointer">
                <span>Agregar escudo de campeonato</span>
                <input 
                  type="checkbox" 
                  checked={escudoTorneo} 
                  onChange={e => setEscudoTorneo(e.target.checked)}
                  className="rounded text-blue-600 w-4 h-4" 
                />
              </label>

              {/* Cantidad de jugadores */}
              <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700">
                <span>Cantidad de jugadores</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCantJugadores(c => Math.max(5, c - 1))}
                    className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-black text-slate-700"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="bg-[#eeebf5] border border-slate-300 px-4 py-1.5 rounded-lg text-xs font-mono font-black">
                    {cantJugadores}
                  </span>
                  <button 
                    onClick={() => setCantJugadores(c => c + 1)}
                    className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-black text-slate-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Column 1 */}
              <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700">
                <span>Column 1</span>
                <select 
                  value={columna1}
                  onChange={e => setColumna1(e.target.value)}
                  className="bg-transparent border-b border-slate-300 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Nº de camiseta/Registro">Nº de camiseta/Registro</option>
                  <option value="DNI / Cédula">DNI / Cédula</option>
                </select>
              </div>

              {/* Column 2 */}
              <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700">
                <span>Column 2</span>
                <select 
                  value={columna2}
                  onChange={e => setColumna2(e.target.value)}
                  className="bg-transparent border-b border-slate-300 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Firma">Firma</option>
                  <option value="Observación">Observación</option>
                </select>
              </div>

              {/* Column 3 */}
              <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700">
                <span>Column 3</span>
                <select 
                  value={columna3}
                  onChange={e => setColumna3(e.target.value)}
                  className="bg-transparent border-b border-slate-300 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Teléfono">Teléfono</option>
                  <option value="Email">Email</option>
                </select>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-2 border-t border-slate-300 bg-[#eeebf5]">
          <button 
            onClick={handlePrint}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <Printer size={16}/> Imprimir / Generar Acta PDF
          </button>
        </div>

      </div>
    </div>
  );
}
