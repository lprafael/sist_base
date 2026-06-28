import Nav from '../../components/Nav';

const groupsData = [
  {
    name: 'Grupo A',
    teams: [
      { pos: 1, name: 'México', flag: '🇲🇽', p: 3, gd: 6, pts: 9 },
      { pos: 2, name: 'Sudáfrica', flag: '🇿🇦', p: 3, gd: -1, pts: 4 },
      { pos: 3, name: 'Corea del Sur', flag: '🇰🇷', p: 3, gd: -1, pts: 3 },
      { pos: 4, name: 'Chequia', flag: '🇨🇿', p: 3, gd: -4, pts: 1 },
    ],
  },
  {
    name: 'Grupo B',
    teams: [
      { pos: 1, name: 'Suiza', flag: '🇨🇭', p: 3, gd: 4, pts: 7 },
      { pos: 2, name: 'Canadá', flag: '🇨🇦', p: 3, gd: 5, pts: 4 },
      { pos: 3, name: 'Bosnia y Herz.', flag: '🇧🇦', p: 3, gd: -1, pts: 4 },
      { pos: 4, name: 'Catar', flag: '🇶🇦', p: 3, gd: -8, pts: 1 },
    ],
  },
  {
    name: 'Grupo C',
    teams: [
      { pos: 1, name: 'Brasil', flag: '🇧🇷', p: 3, gd: 6, pts: 7 },
      { pos: 2, name: 'Marruecos', flag: '🇲🇦', p: 3, gd: 3, pts: 7 },
      { pos: 3, name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', p: 3, gd: -3, pts: 3 },
      { pos: 4, name: 'Haití', flag: '🇭🇹', p: 3, gd: -6, pts: 0 },
    ],
  },
  {
    name: 'Grupo D',
    teams: [
      { pos: 1, name: 'Estados Unidos', flag: '🇺🇸', p: 3, gd: 4, pts: 6 },
      { pos: 2, name: 'Australia', flag: '🇦🇺', p: 3, gd: 0, pts: 4 },
      { pos: 3, name: 'Paraguay', flag: '🇵🇾', p: 3, gd: -2, pts: 4 },
      { pos: 4, name: 'Turquía', flag: '🇹🇷', p: 3, gd: -2, pts: 3 },
    ],
  },
  {
    name: 'Grupo E',
    teams: [
      { pos: 1, name: 'Alemania', flag: '🇩🇪', p: 3, gd: 6, pts: 6 },
      { pos: 2, name: 'Costa de Marfil', flag: '🇨🇮', p: 3, gd: 2, pts: 6 },
      { pos: 3, name: 'Ecuador', flag: '🇪🇨', p: 3, gd: 0, pts: 4 },
      { pos: 4, name: 'Curazao', flag: '🇨🇼', p: 3, gd: -8, pts: 1 },
    ],
  },
  {
    name: 'Grupo F',
    teams: [
      { pos: 1, name: 'Países Bajos', flag: '🇳🇱', p: 3, gd: 6, pts: 7 },
      { pos: 2, name: 'Japón', flag: '🇯🇵', p: 3, gd: 4, pts: 5 },
      { pos: 3, name: 'Suecia', flag: '🇸🇪', p: 3, gd: 0, pts: 4 },
      { pos: 4, name: 'Túnez', flag: '🇹🇳', p: 3, gd: -10, pts: 0 },
    ],
  },
  {
    name: 'Grupo G',
    teams: [
      { pos: 1, name: 'Bélgica', flag: '🇧🇪', p: 3, gd: 4, pts: 5 },
      { pos: 2, name: 'Egipto', flag: '🇪🇬', p: 3, gd: 2, pts: 5 },
      { pos: 3, name: 'Irán', flag: '🇮🇷', p: 3, gd: 0, pts: 3 },
      { pos: 4, name: 'Nueva Zelanda', flag: '🇳🇿', p: 3, gd: -6, pts: 1 },
    ],
  },
  {
    name: 'Grupo H',
    teams: [
      { pos: 1, name: 'España', flag: '🇪🇸', p: 3, gd: 5, pts: 7 },
      { pos: 2, name: 'Cabo Verde', flag: '🇨🇻', p: 3, gd: 0, pts: 3 },
      { pos: 3, name: 'Uruguay', flag: '🇺🇾', p: 3, gd: -1, pts: 2 },
      { pos: 4, name: 'Arabia Saudita', flag: '🇸🇦', p: 3, gd: -4, pts: 2 },
    ],
  },
  {
    name: 'Grupo I',
    teams: [
      { pos: 1, name: 'Francia', flag: '🇫🇷', p: 3, gd: 8, pts: 9 },
      { pos: 2, name: 'Noruega', flag: '🇳🇴', p: 3, gd: 1, pts: 6 },
      { pos: 3, name: 'Senegal', flag: '🇸🇳', p: 3, gd: 2, pts: 3 },
      { pos: 4, name: 'Irak', flag: '🇮🇶', p: 3, gd: -11, pts: 0 },
    ],
  },
  {
    name: 'Grupo J',
    teams: [
      { pos: 1, name: 'Argentina', flag: '🇦🇷', p: 3, gd: 7, pts: 9 },
      { pos: 2, name: 'Austria', flag: '🇦🇹', p: 3, gd: 0, pts: 4 },
      { pos: 3, name: 'Argelia', flag: '🇩🇿', p: 3, gd: -2, pts: 4 },
      { pos: 4, name: 'Jordania', flag: '🇯🇴', p: 3, gd: -5, pts: 0 },
    ],
  },
  {
    name: 'Grupo K',
    teams: [
      { pos: 1, name: 'Colombia', flag: '🇨🇴', p: 3, gd: 3, pts: 7 },
      { pos: 2, name: 'Portugal', flag: '🇵🇹', p: 3, gd: 5, pts: 5 },
      { pos: 3, name: 'RD Congo', flag: '🇨🇩', p: 3, gd: 1, pts: 4 },
      { pos: 4, name: 'Uzbekistán', flag: '🇺🇿', p: 3, gd: -9, pts: 0 },
    ],
  },
  {
    name: 'Grupo L',
    teams: [
      { pos: 1, name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', p: 3, gd: 4, pts: 7 },
      { pos: 2, name: 'Croacia', flag: '🇭🇷', p: 3, gd: 0, pts: 6 },
      { pos: 3, name: 'Ghana', flag: '🇬🇭', p: 3, gd: 0, pts: 4 },
      { pos: 4, name: 'Panamá', flag: '🇵🇦', p: 3, gd: -4, pts: 0 },
    ],
  },
];

const knockoutStages = [
  {
    name: '16vos de Final',
    matches: [
      { match: 'Sudáfrica vs Canadá', flag1: '🇿🇦', flag2: '🇨🇦', time: 'hoy, 4:00 p.m.' },
      { match: 'Países Bajos vs Marruecos', flag1: '🇳🇱', flag2: '🇲🇦', time: 'mañana, 10:00 p.m.' },
      { match: 'Alemania vs Paraguay', flag1: '🇩🇪', flag2: '🇵🇾', time: 'mañana, 5:30 p.m.' },
      { match: 'Francia vs Suecia', flag1: '🇫🇷', flag2: '🇸🇪', time: 'mar, 30/6, 6:00 p.m.' },
      { match: 'Bélgica vs Senegal', flag1: '🇧🇪', flag2: '🇸🇳', time: 'mié, 1/7, 5:00 p.m.' },
      { match: 'Estados Unidos vs Bosnia y Herzegovina', flag1: '🇺🇸', flag2: '🇧🇦', time: 'mié, 1/7, 9:00 p.m.' },
      { match: 'España vs Austria', flag1: '🇪🇸', flag2: '🇦🇹', time: 'jue, 2/7, 4:00 p.m.' },
      { match: 'Portugal vs Croacia', flag1: '🇵🇹', flag2: '🇭🇷', time: 'jue, 2/7, 8:00 p.m.' },
      { match: 'Brasil vs Japón', flag1: '🇧🇷', flag2: '🇯🇵', time: 'mañana, 2:00 p.m.' },
      { match: 'Costa de Marfil vs Noruega', flag1: '🇨🇮', flag2: '🇳🇴', time: 'mar, 30/6, 2:00 p.m.' },
      { match: 'México vs Ecuador', flag1: '🇲🇽', flag2: '🇪🇨', time: 'mar, 30/6, 10:00 p.m.' },
      { match: 'Inglaterra vs RD Congo', flag1: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flag2: '🇨🇩', time: 'mié, 1/7, 1:00 p.m.' },
      { match: 'Suiza vs Argelia', flag1: '🇨🇭', flag2: '🇩🇿', time: 'vie, 3/7, 12:00 a.m.' },
      { match: 'Colombia vs Ghana', flag1: '🇨🇴', flag2: '🇬🇭', time: 'vie, 3/7, 10:30 p.m.' },
      { match: 'Australia vs Egipto', flag1: '🇦🇺', flag2: '🇪🇬', time: 'vie, 3/7, 3:00 p.m.' },
      { match: 'Argentina vs Cabo Verde', flag1: '🇦🇷', flag2: '🇨🇻', time: 'vie, 3/7, 7:00 p.m.' },
    ]
  },
  {
    name: 'Octavos de Final',
    matches: [
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'sáb, 4/7, 2:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'sáb, 4/7, 6:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'dom, 5/7, 5:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'dom, 5/7, 9:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'lun, 6/7, 4:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'lun, 6/7, 9:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'mar, 7/7, 1:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'mar, 7/7, 5:00 p.m.' },
    ]
  },
  {
    name: 'Cuartos de Final',
    matches: [
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'jue, 9/7, 5:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'vie, 10/7, 4:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'sáb, 11/7, 6:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: 'sáb, 11/7, 10:00 p.m.' },
    ]
  },
  {
    name: 'Semifinales',
    matches: [
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: '14/7, 4:00 p.m.' },
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: '15/7, 4:00 p.m.' },
    ]
  },
  {
    name: 'Final',
    matches: [
      { match: 'A definir vs A definir', flag1: '❓', flag2: '❓', time: '19/7, 4:00 p.m.' },
    ]
  }
];

const topScorers = [
  { name: 'Lionel Messi', team: 'ARG FW', flag: '🇦🇷', goals: 6, assists: 0, minutes: 223 },
  { name: 'Kylian Mbappe', team: 'FRA FW', flag: '🇫🇷', goals: 4, assists: 2, minutes: 290 },
  { name: 'Ousmane Dembele', team: 'FRA FW', flag: '🇫🇷', goals: 4, assists: 1, minutes: 225 },
  { name: 'Vinicius Junior', team: 'BRA FW', flag: '🇧🇷', goals: 4, assists: 1, minutes: 293 },
  { name: 'Erling Haaland', team: 'NOR FW', flag: '🇳🇴', goals: 4, assists: 0, minutes: 207 },
  { name: 'Deniz Undav', team: 'GER FW', flag: '🇩🇪', goals: 3, assists: 2, minutes: 106 },
  { name: 'Johan Manzambi', team: 'SUI MF', flag: '🇨🇭', goals: 3, assists: 1, minutes: 146 },
  { name: 'Ismaila Sarr', team: 'SEN FW', flag: '🇸🇳', goals: 3, assists: 1, minutes: 274 },
  { name: 'Brian Brobbey', team: 'NED FW', flag: '🇳🇱', goals: 3, assists: 0, minutes: 168 },
  { name: 'Matheus Cunha', team: 'BRA FW', flag: '🇧🇷', goals: 3, assists: 0, minutes: 191 },
];

export default function MundialPage() {
  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 pb-20 font-sans">
      <Nav scrolled={true} />
      
      <div className="relative w-full h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden border-b-4 border-emerald-500">
        <div className="absolute inset-0 z-0">
          <img src="/Mundial/lo-mundial-2026-2.jpg" alt="Mundial 2026 Banner" className="w-full h-full object-cover opacity-40 blur-[2px] scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-5 flex flex-col items-center">
          <div className="bg-emerald-500/20 text-emerald-400 font-bold px-4 py-1 rounded-full mb-4 border border-emerald-500/30 backdrop-blur-md">Fase Final</div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter drop-shadow-lg">
            MUNDIAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">2026</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-medium drop-shadow-md">Sigue todos los resultados, tablas de posiciones y el fixture de la fase eliminatoria.</p>
        </div>
      </div>

      <div className="pt-12 px-5 max-w-7xl mx-auto">
        {/* Banner Secundario Opcional */}
        <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/20 border border-slate-700/50">
          <img src="/Mundial/1781128425457_1200x675.webp" alt="Countdown" className="w-full h-32 md:h-48 object-cover opacity-80 hover:opacity-100 transition-opacity" />
        </div>

        {/* Grupos Collapsible */}
        <div className="mb-16">
          <details className="group bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <summary className="flex items-center justify-between cursor-pointer p-6 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📊</span>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Fase de Grupos</h2>
              </div>
              <div className="text-emerald-400 font-bold group-open:rotate-180 transition-transform text-xl">▼</div>
            </summary>
            
            <div className="p-6 bg-slate-800/50 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groupsData.map((group, i) => (
              <div key={i} className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden hover:border-emerald-500/50 transition-colors">
                <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 px-4 py-3 border-b border-slate-700">
                  <h3 className="font-bold text-white tracking-wide">{group.name}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/80">
                      <tr>
                        <th className="px-3 py-2">Equipo</th>
                        <th className="px-2 py-2 text-center" title="Partidos Jugados">PJ</th>
                        <th className="px-2 py-2 text-center" title="Diferencia de Gol">DG</th>
                        <th className="px-3 py-2 text-center font-bold text-emerald-400">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((team, j) => (
                        <tr key={j} className={`border-b last:border-0 border-slate-800 transition-colors ${j < 2 ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-slate-800/80'}`}>
                          <td className="px-3 py-3 font-medium flex items-center gap-2 text-slate-200">
                            <span className={`text-xs font-bold w-4 text-center ${j < 2 ? 'text-emerald-400' : 'text-slate-500'}`}>{team.pos}</span>
                            <span className="text-lg drop-shadow-sm">{team.flag}</span>
                            <span className="truncate max-w-[100px]" title={team.name}>{team.name}</span>
                          </td>
                          <td className="px-2 py-3 text-center text-slate-400">{team.p}</td>
                          <td className="px-2 py-3 text-center text-slate-400">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                          <td className="px-3 py-3 text-center font-bold text-white">{team.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
            </div>
          </details>
        </div>

        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">⚔️</span>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Fixture - Fase Eliminatoria</h2>
          </div>
          
          <div className="flex flex-col gap-8">
            {knockoutStages.map((stage, stageIdx) => (
              <details key={stageIdx} open={stage.name === '16vos de Final'} className="group bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative mb-4 last:mb-0">
                <summary className="flex items-center justify-between cursor-pointer bg-slate-900/60 p-4 border-b border-slate-700 relative z-20 hover:bg-slate-800/80 transition-colors">
                  <h3 className="text-xl font-black text-emerald-400 tracking-wide uppercase text-center flex-1">{stage.name}</h3>
                  <div className="text-emerald-400 font-bold group-open:rotate-180 transition-transform text-xl">▼</div>
                </summary>
                
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none mt-16">
                  <img src="/Mundial/250612-aca12_Des_F1-Cuenta_regre.jpg" alt="Background" className="w-full h-full object-cover" />
                </div>
                
                <div className="relative z-10 p-2">
                  {stage.name === 'Final' && (
                    <div className="flex justify-center mb-6 mt-4">
                      <img src="/Mundial/51Lba4gaGAL._AC_SL1500_.jpg" alt="Copa del Mundo" className="h-64 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className={`grid grid-cols-1 ${stage.matches.length > 4 ? 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x' : 'divide-y'} divide-slate-700`}>
                    
                    {stage.matches.length > 4 ? (
                      <>
                        <div className="flex flex-col">
                          {stage.matches.slice(0, Math.ceil(stage.matches.length / 2)).map((fixture, index) => (
                            <div key={index} className="p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/40 flex flex-col gap-2 transition-colors">
                              <div className="inline-block bg-slate-900/80 rounded px-2 py-1 self-start">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">{fixture.time}</span>
                              </div>
                              <div className="flex items-center justify-between bg-slate-900/40 rounded-lg p-2 border border-slate-700/50">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xl">{fixture.flag1}</span>
                                  <span className={`font-bold ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[0]}</span>
                                </div>
                                <span className="text-slate-500 font-black text-xs px-2">VS</span>
                                <div className="flex items-center gap-2 flex-1 justify-end text-right">
                                  <span className={`font-bold ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[1]}</span>
                                  <span className="text-xl">{fixture.flag2}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col">
                          {stage.matches.slice(Math.ceil(stage.matches.length / 2)).map((fixture, index) => (
                            <div key={index} className="p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/40 flex flex-col gap-2 transition-colors">
                              <div className="inline-block bg-slate-900/80 rounded px-2 py-1 self-start">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">{fixture.time}</span>
                              </div>
                              <div className="flex items-center justify-between bg-slate-900/40 rounded-lg p-2 border border-slate-700/50">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xl">{fixture.flag1}</span>
                                  <span className={`font-bold ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[0]}</span>
                                </div>
                                <span className="text-slate-500 font-black text-xs px-2">VS</span>
                                <div className="flex items-center gap-2 flex-1 justify-end text-right">
                                  <span className={`font-bold ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[1]}</span>
                                  <span className="text-xl">{fixture.flag2}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col">
                        {stage.matches.map((fixture, index) => (
                          <div key={index} className="p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/40 flex flex-col gap-2 transition-colors">
                            <div className="inline-block bg-slate-900/80 rounded px-2 py-1 self-start">
                              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">{fixture.time}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-900/40 rounded-lg p-3 border border-slate-700/50 max-w-2xl mx-auto w-full">
                              <div className="flex items-center gap-3 flex-1 justify-end">
                                <span className={`font-bold text-lg ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[0]}</span>
                                <span className="text-2xl">{fixture.flag1}</span>
                              </div>
                              <span className="text-slate-500 font-black text-sm px-6">VS</span>
                              <div className="flex items-center gap-3 flex-1 justify-start">
                                <span className="text-2xl">{fixture.flag2}</span>
                                <span className={`font-bold text-lg ${fixture.match.includes('A definir') ? 'text-slate-400 italic' : 'text-slate-200'}`}>{fixture.match.split(' vs ')[1]}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

          {/* Tabla de Goleadores */}
          <div className="mt-16">
            <details className="group bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer p-6 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚽</span>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Estadísticas de Jugadores</h2>
                </div>
                <div className="text-emerald-400 font-bold group-open:rotate-180 transition-transform text-xl">▼</div>
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700">
                    <tr>
                      <th className="px-5 py-4 font-bold tracking-wider w-16 text-center">Puesto</th>
                      <th className="px-5 py-4 font-bold tracking-wider">Futbolista</th>
                      <th className="px-5 py-4 text-center font-bold tracking-wider text-emerald-400">Goles ↓</th>
                      <th className="px-5 py-4 text-center font-bold tracking-wider">Asistencias ↕</th>
                      <th className="px-5 py-4 text-center font-bold tracking-wider">Minutos jugados ↕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScorers.map((player, i) => (
                      <tr key={i} className="border-b last:border-0 border-slate-700/50 hover:bg-slate-700/40 transition-colors">
                        <td className="px-5 py-4 text-center font-black text-lg text-slate-300">
                          {i + 1}
                        </td>
                        <td className="px-5 py-4 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-inner ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950 ring-2 ring-yellow-400/50' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 ring-2 ring-slate-400/50' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 ring-2 ring-amber-500/50' : 'bg-slate-700 text-slate-300'}`}>
                            {player.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">{player.name}</p>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <span>{player.flag}</span> {player.team}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                            {player.goals}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-lg text-slate-300">
                          {player.assists}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-lg text-slate-300">
                          {player.minutes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-900/50 text-center border-t border-slate-700">
                <p className="text-sm text-emerald-500/80 font-semibold italic flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tabla en actualización
                </p>
              </div>
            </details>
          </div>

      </div>
    </div>
  );
}
