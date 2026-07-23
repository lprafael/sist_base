import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Download, Palette, ExternalLink } from 'lucide-react';

export default function ArtDuJeuModal({ match, onClose }: { match: any, onClose: () => void }) {
  const [opcion, setOpcion] = useState<number>(3);

  const [equipo1, setEquipo1] = useState(match.jugador_local_nombre || match.local_nombre || 'Equipo 1');
  const [equipo2, setEquipo2] = useState(match.jugador_visitante_nombre || match.visitante_nombre || 'Equipo 2');
  const [goles1, setGoles1] = useState(match.goles_local ?? 3);
  const [goles2, setGoles2] = useState(match.goles_visitante ?? 1);

  const [titulo, setTitulo] = useState(match.titulo || 'Copa de Campeones 2026');
  const [subtitulo, setSubtitulo] = useState('Fase de Grupos — Fecha 1');
  const [direccion, setDirección] = useState(match.cancha || 'Cancha Central - Complejo Deportivo');
  const [diaSemana, setDiaSemana] = useState('Sábado');
  const [fecha, setFecha] = useState('25 de Julio');
  const [hora, setHora] = useState('18:00 Hs');

  const [color1, setColor1] = useState('#1e40af');
  const [color2, setColor2] = useState('#0f172a');
  const [patrocinios, setPatrocinios] = useState(true);

  // Opens the rendered graphic in a new browser tab matching user request & screenshot
  const handleOpenInNewTab = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Arte del Juego — ${equipo1} vs ${equipo2}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: #060913; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
            }
            .banner {
              width: 750px;
              height: 750px;
              position: relative;
              background: radial-gradient(ellipse at center, #1e3a8a 0%, #0f172a 70%, #020617 100%);
              overflow: hidden;
              box-shadow: 0 30px 60px -12px rgba(0,0,0,0.7);
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 45px;
              color: white;
              border-radius: 20px;
            }
            .stadium-circle {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 460px;
              height: 460px;
              border: 3px solid rgba(255,255,255,0.08);
              border-radius: 50%;
              pointer-events: none;
            }
            .stadium-line {
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              height: 2px;
              background: rgba(255,255,255,0.07);
              pointer-events: none;
            }
            .match-header {
              text-align: center;
              z-index: 10;
            }
            .title-pill {
              display: inline-block;
              background: rgba(251, 191, 36, 0.15);
              color: #fbbf24;
              border: 1px solid rgba(251, 191, 36, 0.3);
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              font-size: 14px;
              padding: 6px 20px;
              border-radius: 20px;
            }
            .subtitle {
              font-size: 16px;
              color: #94a3b8;
              font-weight: 700;
              margin-top: 8px;
            }
            .score-container {
              display: flex;
              align-items: center;
              justify-content: space-around;
              z-index: 10;
              margin: auto 0;
            }
            .team-box {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 14px;
            }
            .shield {
              width: 140px;
              height: 175px;
              background: linear-gradient(180deg, #ea580c 0%, #c2410c 100%);
              border-radius: 24px;
              border: 4px solid rgba(255,255,255,0.95);
              box-shadow: 0 20px 30px -5px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .shield-ball {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 3px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
            }
            .team-name {
              font-size: 24px;
              font-weight: 900;
              color: white;
              letter-spacing: 0.05em;
            }
            .score-num {
              font-size: 120px;
              font-weight: 900;
              color: white;
              line-height: 1;
              text-shadow: 0 10px 25px rgba(0,0,0,0.6);
            }
            .vs-text {
              font-size: 36px;
              font-style: italic;
              font-weight: 900;
              color: white;
              margin: 0 10px;
            }
            .yellow-bar {
              width: 80px;
              height: 8px;
              background: #e2dc08;
              border-radius: 4px;
              margin: 0 auto;
              z-index: 10;
            }
            .grass-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 50px;
              background: linear-gradient(0deg, #16a34a 0%, #15803d 70%, transparent 100%);
              z-index: 5;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              z-index: 10;
              font-size: 14px;
              font-weight: 700;
            }
            .soccer-ball-img {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #ffffff, #94a3b8);
              box-shadow: 0 10px 20px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 55px;
            }
          </style>
        </head>
        <body>
          <div class="banner">
            <div class="stadium-circle"></div>
            <div class="stadium-line"></div>
            
            <div class="match-header">
              <div class="title-pill">${titulo}</div>
              <div class="subtitle">${subtitulo}</div>
            </div>

            <div class="score-container">
              <div class="team-box">
                <div class="shield">
                  <div class="shield-ball">⚽</div>
                </div>
                <div class="team-name">${equipo1}</div>
              </div>

              <div class="score-num">${goles1}</div>
              <div class="vs-text">vs</div>
              <div class="score-num">${goles2}</div>

              <div class="team-box">
                <div class="shield">
                  <div class="shield-ball">⚽</div>
                </div>
                <div class="team-name">${equipo2}</div>
              </div>
            </div>

            <div class="yellow-bar"></div>

            <div class="footer-info">
              <div>
                <div>📍 ${direccion}</div>
                <div style="color: #cbd5e1; margin-top: 4px;">📅 ${diaSemana} ${fecha} — ${hora}</div>
              </div>
              <div class="soccer-ball-img">⚽</div>
            </div>

            <div class="grass-footer"></div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eeebf5] border border-indigo-200 text-slate-800 w-full max-w-xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* TOP NAVBAR (Matching Image 4) */}
        <div className="bg-[#191942] text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition flex items-center gap-1">
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-wide">Arte del juego</span>
          <button onClick={handleOpenInNewTab} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Abrir imagen en nueva pestaña">
            <ExternalLink size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* OPTIONS PRESETS (Opción 1, Opción 2, Opción 3) */}
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setOpcion(num)}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold border transition ${
                  opcion === num
                    ? 'bg-[#e2dc08] text-slate-900 border-[#c4bd00] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Opción {num}
              </button>
            ))}
          </div>

          {/* LIVE GRAPHIC BANNER PREVIEW (Matching User Screenshot) */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between p-6 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950">

            {/* Stadium circle pattern */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 pointer-events-none" />

            {/* Header info */}
            <div className="relative z-10 text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                {titulo}
              </span>
              <h4 className="text-xs font-extrabold text-slate-300">{subtitulo}</h4>
            </div>

            {/* Score graphic display (Matching Screenshot) */}
            <div className="relative z-10 flex items-center justify-around my-auto">
              {/* Team 1 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-24 bg-gradient-to-b from-orange-500 to-red-600 rounded-2xl border-2 border-white/80 shadow-2xl flex items-center justify-center p-2">
                  {match.local_logo ? (
                    <img src={match.local_logo} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-black text-white text-lg">⚽</div>
                  )}
                </div>
                <span className="font-extrabold text-sm text-white tracking-wide">{equipo1}</span>
              </div>

              {/* Score text 3 vs 1 */}
              <div className="flex items-center gap-3">
                <span className="text-6xl font-black text-white tracking-tight drop-shadow-md">{goles1}</span>
                <span className="text-xl font-bold text-slate-300 italic">vs</span>
                <span className="text-6xl font-black text-white tracking-tight drop-shadow-md">{goles2}</span>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-24 bg-gradient-to-b from-orange-500 to-red-600 rounded-2xl border-2 border-white/80 shadow-2xl flex items-center justify-center p-2">
                  {match.visitante_logo ? (
                    <img src={match.visitante_logo} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-black text-white text-lg">⚽</div>
                  )}
                </div>
                <span className="font-extrabold text-sm text-white tracking-wide">{equipo2}</span>
              </div>
            </div>

            {/* Yellow Accent Bar */}
            <div className="relative z-10 w-12 h-1.5 bg-[#e2dc08] rounded-full mx-auto my-2" />

            {/* Footer details + Soccer ball */}
            <div className="relative z-10 flex justify-between items-end text-white text-[11px] font-bold">
              <div>
                <div>📍 {direccion}</div>
                <div className="text-slate-300">📅 {diaSemana} {fecha} — {hora}</div>
              </div>
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl shadow-xl">
                ⚽
              </div>
            </div>

            {/* Grass bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-emerald-600 to-emerald-700 pointer-events-none" />
          </div>

          {/* FORM INPUTS (Matching Image 4) */}
          <div className="space-y-3 pt-2">

            {/* Nombre del equipo 1 */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Nombre del equipo 1
              </label>
              <input
                type="text"
                value={equipo1}
                onChange={e => setEquipo1(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Nombre del equipo 2 */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Nombre del equipo 2
              </label>
              <input
                type="text"
                value={equipo2}
                onChange={e => setEquipo2(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Título */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Subtítulo */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Subtítulo
              </label>
              <input
                type="text"
                value={subtitulo}
                onChange={e => setSubtitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Dirección */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDirección(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Día de la semana */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Día de la semana
              </label>
              <input
                type="text"
                value={diaSemana}
                onChange={e => setDiaSemana(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Fecha */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Fecha
              </label>
              <input
                type="text"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Hora */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">
                Hora
              </label>
              <input
                type="text"
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Color 1 / Color 2 */}
            <div className="flex gap-4 py-2">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600">Color 1</span>
                <input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
              </div>
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600">Color 2</span>
                <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
              </div>
            </div>

            {/* Patrocinios y Apoyos */}
            <div className="border-t border-slate-300 pt-3">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                <span>Patrocinios y Apoyos</span>
                <input
                  type="checkbox"
                  checked={patrocinios}
                  onChange={e => setPatrocinios(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-2 border-t border-slate-300 bg-[#eeebf5]">
          <button
            onClick={handleOpenInNewTab}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} /> Abrir imagen en nueva pestaña para Compartir
          </button>
        </div>

      </div>
    </div>
  );
}
