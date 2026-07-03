import React from 'react';

interface Match {
  id: string;
  ronda: string; // e.g. "Ronda 1", "Ronda 2"
  estado: string;
  ganador_id: string | null;
  p1_id: string | null;
  p1_nombre: string | null;
  p1_apellido: string | null;
  p2_id: string | null;
  p2_nombre: string | null;
  p2_apellido: string | null;
}

interface BracketViewerProps {
  matches: Match[];
}

export default function BracketViewer({ matches }: BracketViewerProps) {
  if (!matches || matches.length === 0) {
    return <div className="text-center text-slate-500 py-12 border border-dashed border-slate-800 rounded-2xl">No hay encuentros generados.</div>;
  }

  // Agrupar por rondas
  const rondasMap: Record<string, Match[]> = {};
  matches.forEach(m => {
    if (!rondasMap[m.ronda]) rondasMap[m.ronda] = [];
    rondasMap[m.ronda].push(m);
  });

  const rondas = Object.keys(rondasMap).sort(); // Ronda 1, Ronda 2, etc.

  return (
    <div className="flex overflow-x-auto gap-12 py-8 px-4 w-full h-full bg-slate-950/50 rounded-3xl border border-slate-800/50 relative">
      {rondas.map((rondaNombre, index) => (
        <div key={rondaNombre} className="flex flex-col justify-around min-w-[280px] space-y-8 relative">
          
          <h3 className="text-center font-black text-slate-500 uppercase tracking-widest text-sm mb-4 absolute -top-4 w-full">
            {rondaNombre}
          </h3>

          {rondasMap[rondaNombre].map((match, mIdx) => (
            <div key={match.id} className="relative flex items-center">
              
              {/* Match Card */}
              <div className="w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative z-10 transition-transform hover:scale-[1.02]">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                
                {/* P1 */}
                <div className={`p-3 border-b border-slate-800 flex justify-between items-center ${match.ganador_id === match.p1_id ? 'bg-red-900/20' : ''}`}>
                  <span className={`font-bold text-sm ${match.ganador_id === match.p1_id ? 'text-white' : 'text-slate-300'}`}>
                    {match.p1_nombre ? `${match.p1_nombre} ${match.p1_apellido}` : <span className="text-slate-600 italic">Por definir</span>}
                  </span>
                  {match.ganador_id === match.p1_id && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-bold">WIN</span>}
                </div>
                
                {/* P2 */}
                <div className={`p-3 flex justify-between items-center ${match.ganador_id === match.p2_id ? 'bg-red-900/20' : ''}`}>
                  <span className={`font-bold text-sm ${match.ganador_id === match.p2_id ? 'text-white' : 'text-slate-300'}`}>
                    {match.p2_nombre ? `${match.p2_nombre} ${match.p2_apellido}` : <span className="text-slate-600 italic">Pasa Directo (Bye)</span>}
                  </span>
                  {match.ganador_id === match.p2_id && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-bold">WIN</span>}
                </div>
              </div>

              {/* Connecting Lines for next round */}
              {index < rondas.length - 1 && (
                <div className="absolute -right-6 top-1/2 w-6 h-[2px] bg-slate-700"></div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
