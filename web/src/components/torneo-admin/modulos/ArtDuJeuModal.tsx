import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Palette } from 'lucide-react';

export default function ArtDuJeuModal({ match, onClose }: { match: any, onClose: () => void }) {
  const [opcion, setOpcion] = useState<number>(1);

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

  // ─── HTML Templates for Each Option ────────────────────────────────────────

  const getHtmlContent = () => {
    if (opcion === 1) return getTemplate1();
    if (opcion === 2) return getTemplate2();
    return getTemplate3();
  };

  // OPCIÓN 1 — Dark Blue Stadium (Clásico)
  const getTemplate1 = () => `<!DOCTYPE html><html><head>
  <title>${equipo1} vs ${equipo2}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #060913; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
    .banner { width: 750px; height: 750px; position: relative; background: radial-gradient(ellipse at center, #1e3a8a 0%, #0f172a 70%, #020617 100%); overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 45px; color: white; border-radius: 20px; }
    .circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 460px; height: 460px; border: 3px solid rgba(255,255,255,0.08); border-radius: 50%; }
    .line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.07); }
    .header { text-align: center; z-index: 10; }
    .pill { display: inline-block; background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; font-size: 14px; padding: 6px 20px; border-radius: 20px; }
    .sub { font-size: 16px; color: #94a3b8; font-weight: 700; margin-top: 8px; }
    .scores { display: flex; align-items: center; justify-content: space-around; z-index: 10; margin: auto 0; }
    .team { display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .shield { width: 140px; height: 175px; background: linear-gradient(180deg, #ea580c 0%, #c2410c 100%); border-radius: 24px; border: 4px solid rgba(255,255,255,0.95); box-shadow: 0 20px 30px -5px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 55px; }
    .name { font-size: 24px; font-weight: 900; color: white; letter-spacing: 0.05em; }
    .num { font-size: 120px; font-weight: 900; color: white; line-height: 1; text-shadow: 0 10px 25px rgba(0,0,0,0.6); }
    .vs { font-size: 36px; font-style: italic; font-weight: 900; color: #94a3b8; }
    .bar { width: 80px; height: 8px; background: #e2dc08; border-radius: 4px; margin: 0 auto; z-index: 10; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; font-size: 14px; font-weight: 700; }
    .ball { width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 55px; }
    .grass { position: absolute; bottom: 0; left: 0; right: 0; height: 50px; background: linear-gradient(0deg, #16a34a 0%, transparent 100%); }
  </style></head><body>
  <div class="banner"><div class="circle"></div><div class="line"></div>
    <div class="header"><div class="pill">${titulo}</div><div class="sub">${subtitulo}</div></div>
    <div class="scores">
      <div class="team"><div class="shield">⚽</div><div class="name">${equipo1}</div></div>
      <div class="num">${goles1}</div><div class="vs">vs</div><div class="num">${goles2}</div>
      <div class="team"><div class="shield">⚽</div><div class="name">${equipo2}</div></div>
    </div>
    <div class="bar"></div>
    <div class="footer"><div><div>📍 ${direccion}</div><div style="color:#94a3b8;margin-top:4px">📅 ${diaSemana} ${fecha} — ${hora}</div></div><div class="ball">⚽</div></div>
    <div class="grass"></div>
  </div></body></html>`;

  // OPCIÓN 2 — Verde Césped Tropical (Vibrante)
  const getTemplate2 = () => `<!DOCTYPE html><html><head>
  <title>${equipo1} vs ${equipo2}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #052e0f; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
    .banner { width: 750px; height: 750px; position: relative; background: linear-gradient(160deg, #064e3b 0%, #022c22 50%, #011a14 100%); overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 40px 50px; color: white; border-radius: 20px; }
    .stripes { position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 60px, transparent 60px, transparent 120px); }
    .glow { position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 500px; height: 400px; background: radial-gradient(ellipse, rgba(52,211,153,0.2) 0%, transparent 70%); border-radius: 50%; }
    .header { z-index: 10; display: flex; flex-direction: column; align-items: center; }
    .pill { display: inline-block; background: #065f46; color: #6ee7b7; border: 1px solid #059669; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 13px; padding: 5px 18px; border-radius: 20px; }
    .sub { font-size: 15px; color: #a7f3d0; font-weight: 700; margin-top: 8px; }
    .scores { display: flex; align-items: center; justify-content: space-between; z-index: 10; padding: 0 10px; }
    .team { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 200px; }
    .crest { width: 150px; height: 150px; background: linear-gradient(135deg, #047857, #065f46); border-radius: 50%; border: 4px solid #34d399; box-shadow: 0 0 40px rgba(52,211,153,0.3); display: flex; align-items: center; justify-content: center; font-size: 70px; }
    .name { font-size: 22px; font-weight: 900; color: #ecfdf5; text-align: center; }
    .vs-block { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .num { font-size: 100px; font-weight: 900; color: white; line-height: 1; text-shadow: 0 0 40px rgba(52,211,153,0.5); }
    .dash { width: 50px; height: 4px; background: #34d399; border-radius: 2px; }
    .vs { font-size: 20px; font-weight: 900; color: #6ee7b7; letter-spacing: 0.1em; }
    .footer { display: flex; justify-content: space-between; align-items: center; z-index: 10; border-top: 1px solid rgba(52,211,153,0.2); padding-top: 16px; font-size: 13px; }
    .foot-text { color: #a7f3d0; font-weight: 700; }
    .badge { background: #065f46; border: 2px solid #34d399; border-radius: 12px; padding: 8px 16px; font-size: 16px; font-weight: 900; color: #6ee7b7; }
  </style></head><body>
  <div class="banner"><div class="stripes"></div><div class="glow"></div>
    <div class="header"><div class="pill">${titulo}</div><div class="sub">${subtitulo}</div></div>
    <div class="scores">
      <div class="team"><div class="crest">⚽</div><div class="name">${equipo1}</div></div>
      <div class="vs-block"><div class="num">${goles1}</div><div class="dash"></div><div class="vs">VS</div><div class="dash"></div><div class="num">${goles2}</div></div>
      <div class="team"><div class="crest">⚽</div><div class="name">${equipo2}</div></div>
    </div>
    <div class="footer">
      <div class="foot-text">📍 ${direccion}<br>📅 ${diaSemana} ${fecha} — ${hora}</div>
      <div class="badge">⚽ RESULTADO FINAL</div>
    </div>
  </div></body></html>`;

  // OPCIÓN 3 — Rojo Fuego / Dorado Premium (Copa style)
  const getTemplate3 = () => `<!DOCTYPE html><html><head>
  <title>${equipo1} vs ${equipo2}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a0000; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
    .banner { width: 750px; height: 750px; position: relative; background: linear-gradient(170deg, #7f1d1d 0%, #450a0a 45%, #1c0606 100%); overflow: hidden; display: flex; flex-direction: column; padding: 0; color: white; border-radius: 20px; }
    .top-bar { background: linear-gradient(90deg, #b91c1c, #dc2626, #b91c1c); padding: 14px 40px; display: flex; justify-content: space-between; align-items: center; }
    .top-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #fef2f2; }
    .top-pill { background: #fbbf24; color: #1c0606; font-weight: 900; font-size: 12px; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.1em; }
    .content { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 30px 50px; gap: 24px; }
    .teams-row { display: flex; align-items: center; justify-content: space-between; }
    .team { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 200px; }
    .crest { width: 130px; height: 130px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #991b1b); border: 5px solid #fbbf24; box-shadow: 0 0 0 3px rgba(251,191,36,0.2), 0 20px 40px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 60px; }
    .name { font-size: 22px; font-weight: 900; color: white; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    .score-center { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .score-wrap { display: flex; align-items: center; gap: 16px; }
    .num { font-size: 110px; font-weight: 900; color: #fbbf24; line-height: 1; text-shadow: 0 0 30px rgba(251,191,36,0.4); }
    .sep { font-size: 50px; color: rgba(255,255,255,0.4); font-weight: 900; }
    .final-tag { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.4); font-weight: 900; font-size: 12px; padding: 5px 18px; border-radius: 20px; letter-spacing: 0.15em; text-transform: uppercase; }
    .gold-line { height: 3px; background: linear-gradient(90deg, transparent, #fbbf24, transparent); margin: 0 40px; }
    .bottom-bar { background: rgba(0,0,0,0.4); padding: 20px 50px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(251,191,36,0.2); }
    .foot-text { font-size: 13px; font-weight: 700; color: #fca5a5; line-height: 1.8; }
    .trophy { font-size: 40px; filter: drop-shadow(0 0 10px rgba(251,191,36,0.5)); }
  </style></head><body>
  <div class="banner">
    <div class="top-bar"><div class="top-title">${subtitulo}</div><div class="top-pill">${titulo}</div></div>
    <div class="content">
      <div class="teams-row">
        <div class="team"><div class="crest">⚽</div><div class="name">${equipo1}</div></div>
        <div class="score-center">
          <div class="score-wrap"><div class="num">${goles1}</div><div class="sep">:</div><div class="num">${goles2}</div></div>
          <div class="final-tag">⚽ Resultado Final</div>
        </div>
        <div class="team"><div class="crest">⚽</div><div class="name">${equipo2}</div></div>
      </div>
    </div>
    <div class="gold-line"></div>
    <div class="bottom-bar">
      <div class="foot-text">📍 ${direccion}<br>📅 ${diaSemana} ${fecha} — ${hora}</div>
      <div class="trophy">🏆</div>
    </div>
  </div></body></html>`;

  const handleOpenInNewTab = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(getHtmlContent());
    win.document.close();
  };

  // ─── Preview Panels for each option ─────────────────────────────────────────

  const PreviewOption1 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between p-5 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 pointer-events-none" />
      <div className="relative z-10 text-center">
        <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">{titulo}</span>
        <div className="text-[10px] font-bold text-slate-400 mt-1">{subtitulo}</div>
      </div>
      <div className="relative z-10 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-20 bg-gradient-to-b from-orange-500 to-red-700 rounded-xl border-2 border-white/80 flex items-center justify-center text-2xl shadow-lg">⚽</div>
          <span className="text-[10px] font-extrabold text-white">{equipo1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-5xl font-black text-white">{goles1}</span>
          <span className="text-base font-bold text-slate-400 italic">vs</span>
          <span className="text-5xl font-black text-white">{goles2}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-20 bg-gradient-to-b from-orange-500 to-red-700 rounded-xl border-2 border-white/80 flex items-center justify-center text-2xl shadow-lg">⚽</div>
          <span className="text-[10px] font-extrabold text-white">{equipo2}</span>
        </div>
      </div>
      <div className="relative z-10 w-10 h-1 bg-yellow-400 rounded-full mx-auto" />
      <div className="relative z-10 flex justify-between items-end text-white text-[9px] font-bold">
        <div><div>📍 {direccion}</div><div className="text-slate-400">📅 {diaSemana} {fecha}</div></div>
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg">⚽</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-emerald-600 to-transparent" />
    </div>
  );

  const PreviewOption2 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-emerald-400/30 flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-900 via-green-950 to-slate-950">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_30px,transparent_30px,transparent_60px)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 text-center">
        <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-900 px-3 py-1 rounded-full border border-emerald-600">{titulo}</span>
        <div className="text-[10px] font-bold text-emerald-300 mt-1">{subtitulo}</div>
      </div>
      <div className="relative z-10 flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-2 w-28">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-700 to-green-900 border-4 border-emerald-400 shadow-lg shadow-emerald-900 flex items-center justify-center text-3xl">⚽</div>
          <span className="text-[10px] font-extrabold text-green-100 text-center">{equipo1}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">{goles1}</span>
          <div className="w-8 h-0.5 bg-emerald-400 rounded" />
          <span className="text-xs font-black text-emerald-400">VS</span>
          <div className="w-8 h-0.5 bg-emerald-400 rounded" />
          <span className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">{goles2}</span>
        </div>
        <div className="flex flex-col items-center gap-2 w-28">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-700 to-green-900 border-4 border-emerald-400 shadow-lg shadow-emerald-900 flex items-center justify-center text-3xl">⚽</div>
          <span className="text-[10px] font-extrabold text-green-100 text-center">{equipo2}</span>
        </div>
      </div>
      <div className="relative z-10 border-t border-emerald-700/50 pt-2 flex justify-between items-center">
        <div className="text-emerald-300 text-[9px] font-bold"><div>📍 {direccion}</div><div>📅 {diaSemana} {fecha} — {hora}</div></div>
        <div className="bg-emerald-900 border border-emerald-500 rounded-lg px-2 py-1 text-emerald-400 text-[9px] font-black">⚽ RESULTADO</div>
      </div>
    </div>
  );

  const PreviewOption3 = () => (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-red-800/50 flex flex-col bg-gradient-to-br from-red-900 via-red-950 to-slate-950">
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 px-4 py-2 flex justify-between items-center flex-shrink-0">
        <span className="text-[9px] font-black tracking-widest text-red-100 uppercase">{subtitulo}</span>
        <span className="bg-amber-400 text-red-900 font-black text-[9px] px-3 py-0.5 rounded-full">{titulo}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center px-5 py-3 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 w-28">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl">⚽</div>
            <span className="text-[10px] font-extrabold text-white text-center">{equipo1}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-5xl font-black text-amber-400">{goles1}</span>
              <span className="text-2xl text-white/40 font-black">:</span>
              <span className="text-5xl font-black text-amber-400">{goles2}</span>
            </div>
            <div className="text-[8px] font-black text-amber-400/80 border border-amber-400/40 px-2 py-0.5 rounded-full">⚽ RESULTADO FINAL</div>
          </div>
          <div className="flex flex-col items-center gap-2 w-28">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl">⚽</div>
            <span className="text-[10px] font-extrabold text-white text-center">{equipo2}</span>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-6" />
      <div className="bg-black/40 border-t border-amber-400/20 px-5 py-2 flex justify-between items-center flex-shrink-0">
        <div className="text-red-300 text-[9px] font-bold"><div>📍 {direccion}</div><div>📅 {diaSemana} {fecha} — {hora}</div></div>
        <span className="text-3xl">🏆</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eeebf5] border border-indigo-200 text-slate-800 w-full max-w-xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* TOP NAVBAR */}
        <div className="bg-[#191942] text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-wide">Arte del juego</span>
          <button onClick={handleOpenInNewTab} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Abrir imagen en nueva pestaña">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* OPTIONS PRESETS */}
          <div className="flex gap-2">
            {[
              { num: 1, label: 'Opción 1', desc: 'Azul Clásico' },
              { num: 2, label: 'Opción 2', desc: 'Verde Vibrante' },
              { num: 3, label: 'Opción 3', desc: 'Rojo Copa' },
            ].map(({ num, label, desc }) => (
              <button
                key={num}
                onClick={() => setOpcion(num)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold border transition flex flex-col items-center gap-0.5 ${
                  opcion === num
                    ? 'bg-[#191942] text-white border-indigo-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[9px] font-medium ${opcion === num ? 'text-indigo-300' : 'text-slate-400'}`}>{desc}</span>
              </button>
            ))}
          </div>

          {/* LIVE PREVIEW — switches based on opcion */}
          {opcion === 1 && <PreviewOption1 />}
          {opcion === 2 && <PreviewOption2 />}
          {opcion === 3 && <PreviewOption3 />}

          {/* FORM INPUTS */}
          <div className="space-y-3 pt-2">

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Nombre del equipo 1</label>
              <input type="text" value={equipo1} onChange={e => setEquipo1(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Nombre del equipo 2</label>
              <input type="text" value={equipo2} onChange={e => setEquipo2(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Goles L</label>
                <input type="number" min={0} value={goles1} onChange={e => setGoles1(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative flex-1">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Goles V</label>
                <input type="number" min={0} value={goles2} onChange={e => setGoles2(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Título del campeonato</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Subtítulo (Fase / Jornada)</label>
              <input type="text" value={subtitulo} onChange={e => setSubtitulo(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Dirección / Cancha</label>
              <input type="text" value={direccion} onChange={e => setDirección(e.target.value)}
                className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Día</label>
                <input type="text" value={diaSemana} onChange={e => setDiaSemana(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Fecha</label>
                <input type="text" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 bg-[#eeebf5] px-1 absolute -top-2 left-3">Hora</label>
                <input type="text" value={hora} onChange={e => setHora(e.target.value)}
                  className="w-full bg-[#eeebf5] border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition" />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-300 bg-[#eeebf5]">
          <button
            onClick={handleOpenInNewTab}
            className="w-full bg-[#191942] hover:bg-indigo-800 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            Abrir imagen en nueva pestaña para Compartir
          </button>
        </div>

      </div>
    </div>
  );
}
