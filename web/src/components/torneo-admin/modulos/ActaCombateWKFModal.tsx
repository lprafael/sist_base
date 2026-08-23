import React, { useState } from 'react';
import { X, Printer, FileText, Award, Shield, User, CheckCircle2 } from 'lucide-react';

export default function ActaCombateWKFModal({
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

  const isKata = stats.modalidad_kata !== undefined;
  const nombreCampeonato = torneo?.nombre || match?.torneo_nombre || 'Torneo Oficial WKF Karate';
  const categoria = match?.categoria || match?.fase || 'Categoría Kumite WKF';
  const tatami = match?.area ? `Tatami #${match.area}` : (match?.cancha || 'Tatami #1');
  const fechaHora = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleString('es-ES') : new Date().toLocaleString('es-ES');

  const nombreAka = match?.jugador_local_nombre || match?.local_nombre || 'AKA (Rojo)';
  const academiaAka = match?.club_local_nombre || match?.local_escuela || match?.equipo_local || 'Escuela / Dojo AKA';
  const ptAka = stats?.local?.puntos ?? match?.goles_local ?? (stats?.votos_aka ?? 0);
  const yukoAka = stats?.local?.yuko ?? 0;
  const wazaAriAka = stats?.local?.waza_ari ?? 0;
  const ipponAka = stats?.local?.ippon ?? 0;
  const senshuAka = Boolean(stats?.local?.senshu);
  const jogaiAka = stats?.local?.jogai ?? 0;
  const penAka = stats?.local?.penalizaciones ?? 0;
  const vrAka = stats?.local?.video_review ?? 'ACTIVE';

  const nombreAo = match?.jugador_visitante_nombre || match?.visitante_nombre || 'AO (Azul)';
  const academiaAo = match?.club_visitante_nombre || match?.visitante_escuela || match?.equipo_visitante || 'Escuela / Dojo AO';
  const ptAo = stats?.visitante?.puntos ?? match?.goles_visitante ?? (stats?.votos_ao ?? 0);
  const yukoAo = stats?.visitante?.yuko ?? 0;
  const wazaAriAo = stats?.visitante?.waza_ari ?? 0;
  const ipponAo = stats?.visitante?.ippon ?? 0;
  const senshuAo = Boolean(stats?.visitante?.senshu);
  const jogaiAo = stats?.visitante?.jogai ?? 0;
  const penAo = stats?.visitante?.penalizaciones ?? 0;
  const vrAo = stats?.visitante?.video_review ?? 'ACTIVE';

  const ganadorLado = stats?.ganador_lado || (ptAka > ptAo ? 'local' : ptAo > ptAka ? 'visitante' : null);
  const ganadorNombre = ganadorLado === 'local' ? nombreAka : ganadorLado === 'visitante' ? nombreAo : 'Empate / En disputa';
  const metodoVictoria = stats?.metodo_victoria || (isKata ? `Decisión por banderas (${stats?.diferencia || '3-2'})` : 'Puntuación reglamentaria');

  const [kansaNombre, setKansaNombre] = useState('Kansa / Árbitro Central');
  const [digitadorNombre, setDigitadorNombre] = useState('Digitador de Mesa');
  const [observaciones, setObservaciones] = useState('');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acta Oficial de Combate WKF - ${nombreCampeonato}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #b91c1c; }
            .header h2 { font-size: 13px; margin: 4px 0 0; color: #334155; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
            .meta-item strong { color: #475569; display: block; font-size: 10px; text-transform: uppercase; }
            
            .score-box { display: grid; grid-template-columns: 1fr 80px 1fr; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
            .fighter-col { padding: 12px; }
            .aka-col { background: #fee2e2; border-right: 1px solid #f87171; }
            .ao-col { background: #dbeafe; border-left: 1px solid #60a5fa; }
            .vs-col { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: #fff; font-weight: bold; font-size: 18px; }
            
            .fighter-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .aka-title { color: #dc2626; }
            .ao-title { color: #2563eb; }
            .fighter-name { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
            .fighter-dojo { font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 10px; }
            .big-score { font-size: 36px; font-weight: 900; font-family: monospace; line-height: 1; }
            
            .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            .detail-table th, .detail-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
            .detail-table th { background: #f1f5f9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px; }
            
            .winner-banner { background: #fef08a; border: 1px solid #eab308; padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 20px; }
            .winner-banner strong { font-size: 14px; text-transform: uppercase; color: #854d0e; }
            
            .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 40px; }
            .sig-box { text-align: center; border-top: 1px solid #0f172a; padding-top: 5px; font-size: 10px; }
            .sig-role { font-weight: bold; color: #334155; text-transform: uppercase; }
            
            .footer-notes { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Acta Oficial de Combate — World Karate Federation (WKF)</h1>
            <h2>${nombreCampeonato}</h2>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Categoría:</strong> ${categoria}</div>
            <div class="meta-item"><strong>Área de Combate:</strong> ${tatami}</div>
            <div class="meta-item"><strong>Fecha y Hora:</strong> ${fechaHora}</div>
            <div class="meta-item"><strong>Modalidad:</strong> ${isKata ? 'Kata (Formas WKF)' : 'Kumite (Combate WKF)'}</div>
            <div class="meta-item"><strong>Identificador:</strong> #${match?.id ? String(match.id).substring(0, 8) : 'WKF-001'}</div>
            <div class="meta-item"><strong>Estado:</strong> ${match?.estado === 'finalizado' ? 'OFICIALMENTE VALIDADO' : 'EN PROCESO'}</div>
          </div>
          
          <div class="score-box">
            <div class="fighter-col aka-col">
              <div class="fighter-title aka-title">AKA (ROJO) ${senshuAka ? '★ SENSHU' : ''}</div>
              <div class="fighter-name">${nombreAka}</div>
              <div class="fighter-dojo">${academiaAka}</div>
              <div class="big-score" style="color: #dc2626;">${ptAka}</div>
            </div>
            
            <div class="vs-col">
              <span>VS</span>
            </div>
            
            <div class="fighter-col ao-col" style="text-align: right;">
              <div class="fighter-title ao-title">${senshuAo ? 'SENSHU ★ ' : ''}AO (AZUL)</div>
              <div class="fighter-name">${nombreAo}</div>
              <div class="fighter-dojo">${academiaAo}</div>
              <div class="big-score" style="color: #2563eb;">${ptAo}</div>
            </div>
          </div>

          <h3>DESGLOSE TÉCNICO Y SANCIONES WKF</h3>
          <table class="detail-table">
            <thead>
              <tr>
                <th style="text-align: left;">Criterio / Registro</th>
                <th style="color: #dc2626;">AKA (Rojo)</th>
                <th style="color: #2563eb;">AO (Azul)</th>
                <th>Reglamentación WKF</th>
              </tr>
            </thead>
            <tbody>
              ${!isKata ? `
                <tr>
                  <td style="text-align: left; font-weight: bold;">Yuko (+1 pt)</td>
                  <td style="font-weight: bold;">${yukoAka}</td>
                  <td style="font-weight: bold;">${yukoAo}</td>
                  <td>Puño directo (Tsuki) a zona puntuable</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Waza-Ari (+2 pts)</td>
                  <td style="font-weight: bold;">${wazaAriAka}</td>
                  <td style="font-weight: bold;">${wazaAriAo}</td>
                  <td>Patada Chudan (Torso)</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Ippon (+3 pts)</td>
                  <td style="font-weight: bold;">${ipponAka}</td>
                  <td style="font-weight: bold;">${ipponAo}</td>
                  <td>Patada Jodan (Cabeza) / Técnica sobre rival caído</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Senshu (Primer punto)</td>
                  <td>${senshuAka ? 'SÍ (VENTAJA)' : 'NO'}</td>
                  <td>${senshuAo ? 'SÍ (VENTAJA)' : 'NO'}</td>
                  <td>Desempate automático en caso de igualdad</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Salidas (Jogai)</td>
                  <td>${jogaiAka}</td>
                  <td>${jogaiAo}</td>
                  <td>Salida no forzada del área de combate</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Penalizaciones (Chui/Fouls)</td>
                  <td>${penAka}</td>
                  <td>${penAo}</td>
                  <td>Contacto excesivo / Comportamiento antideportivo</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-weight: bold;">Video Review (Coach Card)</td>
                  <td>${vrAka === 'ACTIVE' ? 'DISPONIBLE' : 'UTILIZADA'}</td>
                  <td>${vrAo === 'ACTIVE' ? 'DISPONIBLE' : 'UTILIZADA'}</td>
                  <td>Tarjeta de reclamo técnico de Coach</td>
                </tr>
              ` : `
                <tr>
                  <td style="text-align: left; font-weight: bold;">Votos de Banderas de Jueces</td>
                  <td style="font-weight: bold; font-size: 14px; color: #dc2626;">${ptAka} Banderas</td>
                  <td style="font-weight: bold; font-size: 14px; color: #2563eb;">${ptAo} Banderas</td>
                  <td>Decisión Mayoritaria Absoluta (${stats?.diferencia || '3-2'})</td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="winner-banner">
            <div>DICTAMEN OFICIAL Y GANADOR DEL COMBATE:</div>
            <strong>🏆 GANADOR: ${ganadorNombre} (${ganadorLado === 'local' ? 'AKA / ROJO' : 'AO / AZUL'})</strong>
            <div style="font-size: 11px; margin-top: 3px; color: #713f12;"><strong>Motivo:</strong> ${metodoVictoria}</div>
          </div>

          ${observaciones ? `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; margin-bottom: 20px; font-size: 11px;">
              <strong>Observaciones / Incidencias de Mesa:</strong> ${observaciones}
            </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <br><br>
              <div class="sig-role">Firma Atleta / Coach AKA</div>
              <div>${nombreAka}</div>
            </div>
            <div class="sig-box">
              <br><br>
              <div class="sig-role">Firma Atleta / Coach AO</div>
              <div>${nombreAo}</div>
            </div>
            <div class="sig-box">
              <br><br>
              <div class="sig-role">Kansa / Árbitro Central</div>
              <div>${kansaNombre}</div>
            </div>
            <div class="sig-box">
              <br><br>
              <div class="sig-role">Digitador de Mesa</div>
              <div>${digitadorNombre}</div>
            </div>
          </div>

          <div class="footer-notes">
            Documento de Auditoría Oficial y Soporte Físico de Resultados WKF. Copia original de mesa de tatami para validación de Mesa Central y reclamos de coaches.
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
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[180] flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-600 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
              WKF
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
                <FileText size={18} className="text-red-500" />
                Acta Oficial de Combate WKF
              </h3>
              <p className="text-xs text-slate-400 font-medium">{tatami} • {categoria}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Card Resumen de Atletas y Marcador */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-950 border border-slate-800 rounded-2xl p-4 gap-3">
            {/* AKA */}
            <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">AKA (Rojo)</span>
              <div className="text-sm font-bold text-slate-100 truncate">{nombreAka}</div>
              <div className="text-[10px] text-slate-400 italic truncate mb-2">{academiaAka}</div>
              <div className="text-3xl font-black font-mono text-red-500">{ptAka} pts</div>
              {senshuAka && <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block">★ SENSHU</span>}
            </div>

            <div className="text-slate-600 font-black text-lg">VS</div>

            {/* AO */}
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-right">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">AO (Azul)</span>
              <div className="text-sm font-bold text-slate-100 truncate">{nombreAo}</div>
              <div className="text-[10px] text-slate-400 italic truncate mb-2">{academiaAo}</div>
              <div className="text-3xl font-black font-mono text-blue-500">{ptAo} pts</div>
              {senshuAo && <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block">★ SENSHU</span>}
            </div>
          </div>

          {/* Resultado Dictaminado */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Dictamen / Ganador Oficial:</span>
              <div className="text-sm font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                <Award size={16} /> Gana {ganadorNombre} ({ganadorLado === 'local' ? 'AKA' : 'AO'})
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{metodoVictoria}</div>
            </div>
            <div className="bg-amber-400/20 text-amber-300 font-black text-[10px] px-2.5 py-1 rounded-lg border border-amber-400/30">
              AUDITADO
            </div>
          </div>

          {/* Campos de Auditoría / Mesa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nombre Kansa / Árbitro Central:</label>
              <input
                type="text"
                value={kansaNombre}
                onChange={e => setKansaNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nombre Digitador de Mesa:</label>
              <input
                type="text"
                value={digitadorNombre}
                onChange={e => setDigitadorNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observaciones / Reclamos de Coaches (VR):</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: Coach AKA solicitó Video Review en 1:15 por patada Jodan. Decisión confirmada..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition text-xs"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center gap-2"
          >
            <Printer size={16} /> Imprimir Acta Física (A4 / Comprobante)
          </button>
        </div>

      </div>
    </div>
  );
}
