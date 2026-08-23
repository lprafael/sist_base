"use client";
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Printer, 
  Download, 
  Search, 
  Users, 
  Shield, 
  Medal, 
  ChevronRight,
  Filter,
  Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface MedalleroEscuela {
  escuela: string;
  oro: number;
  plata: number;
  bronce: number;
  total: number;
  puntos: number;
  atletas: string[];
}

export default function MedalleroWKFView({
  torneoId,
  torneo
}: {
  torneoId: string;
  torneo?: any;
}) {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('todos');

  const fetchPartidos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/${torneoId}/partidos`);
      if (res.ok) {
        const data = await res.json();
        setPartidos(data);
      }
    } catch (e) {
      console.error('Error fetching partidos for medallero:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartidos();
  }, [torneoId]);

  // Calcular Medallas por Academia / Escuela
  const calcularMedallero = (): MedalleroEscuela[] => {
    const mapEscuelas: { [nombre: string]: MedalleroEscuela } = {};

    const getEscuelaObj = (nombre: string): MedalleroEscuela => {
      const norm = nombre?.trim() || 'Independiente / Sin Escuela';
      if (!mapEscuelas[norm]) {
        mapEscuelas[norm] = {
          escuela: norm,
          oro: 0,
          plata: 0,
          bronce: 0,
          total: 0,
          puntos: 0,
          atletas: []
        };
      }
      return mapEscuelas[norm];
    };

    partidos.forEach(p => {
      if (p.estado !== 'finalizado') return;

      const fase = (p.fase || '').toLowerCase();
      const stats = typeof p.estadisticas === 'string' ? JSON.parse(p.estadisticas || '{}') : (p.estadisticas || {});
      const ganadorId = p.ganador_id;

      const escuelaLocal = p.club_local_nombre || p.local_escuela || p.equipo_local || 'Dojo AKA';
      const escuelaVisitante = p.club_visitante_nombre || p.visitante_escuela || p.equipo_visitante || 'Dojo AO';
      const atletaLocal = p.jugador_local_nombre || p.local_nombre || 'Atleta AKA';
      const atletaVisitante = p.jugador_visitante_nombre || p.visitante_nombre || 'Atleta AO';

      const esGanadorLocal = ganadorId === p.equipo_local_id || ganadorId === p.jugador_local_id || stats.ganador_lado === 'local';
      const esGanadorVisitante = ganadorId === p.equipo_visitante_id || ganadorId === p.jugador_visitante_id || stats.ganador_lado === 'visitante';

      if (fase.includes('final') && !fase.includes('semi') && !fase.includes('cuarto')) {
        // Combate de Final (Define Oro y Plata)
        if (esGanadorLocal) {
          const escOro = getEscuelaObj(escuelaLocal);
          escOro.oro += 1;
          escOro.puntos += 3;
          if (!escOro.atletas.includes(atletaLocal)) escOro.atletas.push(atletaLocal);

          const escPlata = getEscuelaObj(escuelaVisitante);
          escPlata.plata += 1;
          escPlata.puntos += 2;
          if (!escPlata.atletas.includes(atletaVisitante)) escPlata.atletas.push(atletaVisitante);
        } else if (esGanadorVisitante) {
          const escOro = getEscuelaObj(escuelaVisitante);
          escOro.oro += 1;
          escOro.puntos += 3;
          if (!escOro.atletas.includes(atletaVisitante)) escOro.atletas.push(atletaVisitante);

          const escPlata = getEscuelaObj(escuelaLocal);
          escPlata.plata += 1;
          escPlata.puntos += 2;
          if (!escPlata.atletas.includes(atletaLocal)) escPlata.atletas.push(atletaLocal);
        }
      } else if (fase.includes('bronce') || fase.includes('tercer')) {
        // Combate por 3er Puesto (Bronce)
        if (esGanadorLocal) {
          const escBronce = getEscuelaObj(escuelaLocal);
          escBronce.bronce += 1;
          escBronce.puntos += 1;
          if (!escBronce.atletas.includes(atletaLocal)) escBronce.atletas.push(atletaLocal);
        } else if (esGanadorVisitante) {
          const escBronce = getEscuelaObj(escuelaVisitante);
          escBronce.bronce += 1;
          escBronce.puntos += 1;
          if (!escBronce.atletas.includes(atletaVisitante)) escBronce.atletas.push(atletaVisitante);
        }
      } else if (fase.includes('semi')) {
        // En WKF tradicional sin repechaje de bronce, los perdedores de semis obtienen Bronce compartido
        const perdedorEscuela = esGanadorLocal ? escuelaVisitante : escuelaLocal;
        const perdedorAtleta = esGanadorLocal ? atletaVisitante : atletaLocal;
        const escBronce = getEscuelaObj(perdedorEscuela);
        escBronce.bronce += 1;
        escBronce.puntos += 1;
        if (!escBronce.atletas.includes(perdedorAtleta)) escBronce.atletas.push(perdedorAtleta);
      }
    });

    return Object.values(mapEscuelas)
      .map(e => ({ ...e, total: e.oro + e.plata + e.bronce }))
      .filter(e => e.total > 0)
      .sort((a, b) => {
        if (b.oro !== a.oro) return b.oro - a.oro;
        if (b.plata !== a.plata) return b.plata - a.plata;
        if (b.bronce !== a.bronce) return b.bronce - a.bronce;
        return b.puntos - a.puntos;
      });
  };

  const medallero = calcularMedallero();

  const filteredMedallero = medallero.filter(m =>
    m.escuela.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintMedallero = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medallero Oficial WKF - ${torneo?.nombre || 'Torneo'}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 18px; margin: 0; color: #dc2626; text-transform: uppercase; }
            .header h2 { font-size: 13px; margin: 4px 0 0; color: #475569; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; }
            th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #334155; }
            .pos { font-weight: 900; }
            .school-col { text-align: left; font-weight: bold; }
            .gold { background: #fef08a; font-weight: 900; color: #854d0e; }
            .silver { background: #f1f5f9; font-weight: 900; color: #475569; }
            .bronze { background: #fed7aa; font-weight: 900; color: #9a3412; }
            .total { font-weight: 900; background: #f8fafc; font-size: 13px; }
            
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Clasificación General y Medallero Oficial WKF</h1>
            <h2>${torneo?.nombre || 'Torneo de Karate'} • Fecha: ${new Date().toLocaleDateString('es-ES')}</h2>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Pos</th>
                <th style="text-align: left;">Escuela / Dojo / Academia</th>
                <th style="width: 60px;">🥇 Oro</th>
                <th style="width: 60px;">🥈 Plata</th>
                <th style="width: 60px;">🥉 Bronce</th>
                <th style="width: 70px;">Total</th>
                <th style="width: 70px;">Puntos</th>
              </tr>
            </thead>
            <tbody>
              ${medallero.map((m, idx) => `
                <tr>
                  <td class="pos">${idx + 1}º</td>
                  <td class="school-col">${m.escuela}</td>
                  <td class="gold">${m.oro}</td>
                  <td class="silver">${m.plata}</td>
                  <td class="bronze">${m.bronce}</td>
                  <td class="total">${m.total}</td>
                  <td style="font-weight: bold;">${m.puntos} pts</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Reporte oficial generado por el Sistema de Gestión de Torneos WKF. Certificado por la Mesa Central y Comisión Arbitral.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" size={36} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      
      {/* Header y Acciones */}
      <div className="bg-slate-950 border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-widest mb-1">
            <Trophy size={16} /> Clasificación Oficial WKF
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Medal className="text-amber-400" size={28} />
            Medallero General por Academias y Dojos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cómputo ponderado de Oro (3 pts), Plata (2 pts) y Bronce (1 pt) según dictamen oficial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintMedallero}
            className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-2"
          >
            <Printer size={16} /> Imprimir Medallero Oficial (A4)
          </button>
        </div>
      </div>

      {/* PODIO TOP 3 ACADEMIAS */}
      {medallero.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 2do Lugar (Plata) */}
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 text-center flex flex-col justify-between items-center shadow-lg relative overflow-hidden order-2 md:order-1">
            <div className="w-12 h-12 rounded-full bg-slate-400/20 text-slate-300 font-black text-xl flex items-center justify-center border border-slate-400/40 mb-2">
              🥈 2º
            </div>
            <h4 className="font-black text-base text-white truncate max-w-[200px]">{medallero[1].escuela}</h4>
            <div className="flex gap-2 my-2 text-xs font-bold">
              <span className="text-amber-400">🥇 {medallero[1].oro}</span>
              <span className="text-slate-300">🥈 {medallero[1].plata}</span>
              <span className="text-orange-400">🥉 {medallero[1].bronce}</span>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 font-black px-3 py-1 rounded-full">
              {medallero[1].total} Medallas ({medallero[1].puntos} pts)
            </span>
          </div>

          {/* 1er Lugar (Oro) */}
          <div className="bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-center flex flex-col justify-between items-center shadow-2xl relative overflow-hidden order-1 md:order-2">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-300 font-black text-2xl flex items-center justify-center border-2 border-amber-400 shadow-md mb-2">
              🥇 1º
            </div>
            <h4 className="font-black text-lg text-white truncate max-w-[220px]">{medallero[0].escuela}</h4>
            <div className="flex gap-3 my-2 text-sm font-black">
              <span className="text-amber-400">🥇 {medallero[0].oro}</span>
              <span className="text-slate-300">🥈 {medallero[0].plata}</span>
              <span className="text-orange-400">🥉 {medallero[0].bronce}</span>
            </div>
            <span className="text-xs bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-full shadow">
              CAMPEÓN: {medallero[0].total} Medallas ({medallero[0].puntos} pts)
            </span>
          </div>

          {/* 3er Lugar (Bronce) */}
          <div className="bg-slate-900 border border-orange-900/50 rounded-3xl p-5 text-center flex flex-col justify-between items-center shadow-lg relative overflow-hidden order-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 font-black text-xl flex items-center justify-center border border-orange-500/40 mb-2">
              🥉 3º
            </div>
            <h4 className="font-black text-base text-white truncate max-w-[200px]">{medallero[2].escuela}</h4>
            <div className="flex gap-2 my-2 text-xs font-bold">
              <span className="text-amber-400">🥇 {medallero[2].oro}</span>
              <span className="text-slate-300">🥈 {medallero[2].plata}</span>
              <span className="text-orange-400">🥉 {medallero[2].bronce}</span>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 font-black px-3 py-1 rounded-full">
              {medallero[2].total} Medallas ({medallero[2].puntos} pts)
            </span>
          </div>

        </div>
      )}

      {/* TABLA DE MEDALLERO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar academia o dojo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-red-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {filteredMedallero.length} Dojos / Escuelas en Tabla
          </span>
        </div>

        {filteredMedallero.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Trophy size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-bold">Aún no hay medallas computadas</p>
            <p className="text-[10px] text-slate-600 mt-1">Las medallas se asignarán automáticamente al finalizar las finales y semifinales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 text-center w-16">Pos</th>
                  <th className="px-6 py-3.5">Escuela / Dojo</th>
                  <th className="px-4 py-3.5 text-center text-amber-400">🥇 Oro</th>
                  <th className="px-4 py-3.5 text-center text-slate-300">🥈 Plata</th>
                  <th className="px-4 py-3.5 text-center text-orange-400">🥉 Bronce</th>
                  <th className="px-4 py-3.5 text-center">Total</th>
                  <th className="px-6 py-3.5 text-right">Puntaje Oficial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMedallero.map((m, idx) => (
                  <tr key={m.escuela} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 text-center font-black text-slate-400">
                      {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <Shield size={16} className="text-red-500 shrink-0" />
                      <div>
                        <div>{m.escuela}</div>
                        {m.atletas.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {m.atletas.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-black text-amber-400 font-mono text-sm">{m.oro}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-300 font-mono text-sm">{m.plata}</td>
                    <td className="px-4 py-4 text-center font-black text-orange-400 font-mono text-sm">{m.bronce}</td>
                    <td className="px-4 py-4 text-center font-black text-white font-mono text-base">{m.total}</td>
                    <td className="px-6 py-4 text-right font-black text-amber-400 font-mono">{m.puntos} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
