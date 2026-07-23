import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Download, Palette, ShieldAlert } from 'lucide-react';

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

  const handleDownload = () => {
    alert('¡Imagen descargada exitosamente para compartir en redes sociales!');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#eeebf5] border border-indigo-200 text-slate-800 w-full max-w-xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* TOP NAVBAR (Matching Image 4) */}
        <div className="bg-[#191942] text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition flex items-center gap-1">
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-wide">Art du jeu</span>
          <button onClick={handleDownload} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-200" title="Guardar/Descargar Imagen">
            <ImageIcon size={20} />
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

          {/* LIVE GRAPHIC BANNER PREVIEW (Matching Image 3 & 4) */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between p-6 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-950">
            
            {/* Decorative background grid pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            
            {/* Header info */}
            <div className="relative z-10 text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                {titulo}
              </span>
              <h4 className="text-xs font-extrabold text-slate-300">{subtitulo}</h4>
            </div>

            {/* Score graphic display (Matching Image 3) */}
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

            {/* Footer details */}
            <div className="relative z-10 flex justify-between items-end text-white text-[11px] font-bold">
              <div>
                <div>📍 {direccion}</div>
                <div className="text-slate-300">📅 {diaSemana} {fecha} — {hora}</div>
              </div>
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl">
                ⚽
              </div>
            </div>
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
            onClick={handleDownload}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            <Download size={16}/> Descargar Imagen para Compartir
          </button>
        </div>

      </div>
    </div>
  );
}
