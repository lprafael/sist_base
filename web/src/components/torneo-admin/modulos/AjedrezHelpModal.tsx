"use client";
import React, { useState } from 'react';
import {
  X, HelpCircle, BookOpen, ShieldAlert,
  FileSpreadsheet, Sparkles, Trophy, Users, CheckCircle2, ChevronRight,
  Gamepad2, Zap, Clock
} from 'lucide-react';

interface AjedrezHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AjedrezHelpModal({ isOpen, onClose }: AjedrezHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'lichess' | 'nativo' | 'antitrampa' | 'chessresults' | 'cedula' | 'suizo'>('lichess');

  if (!isOpen) return null;

  const TABS = [
    { id: 'lichess',      l: 'Lichess & 1-Clic',     icon: Sparkles },
    { id: 'nativo',       l: 'Tablero Nativo (Jugar)', icon: Gamepad2 },
    { id: 'antitrampa',   l: 'Control Antitrampa',   icon: ShieldAlert },
    { id: 'chessresults', l: 'Importar Excel/Sub-X', icon: FileSpreadsheet },
    { id: 'cedula',       l: 'Cédula & Validación',  icon: Users },
    { id: 'suizo',        l: 'Sistema Suizo & FIDE', icon: Trophy },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Guía Rápida & Centro de Ayuda de Ajedrez
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Instrucciones paso a paso para organizadores, árbitros, instructores y padres.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs de Navegación */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/40">
          {TABS.map(t => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-t-2xl font-black text-xs transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  isSel
                    ? 'border-amber-500 text-slate-900 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={14} className={isSel ? 'text-amber-600' : 'text-slate-400'} />
                <span>{t.l}</span>
              </button>
            );
          })}
        </div>

        {/* Contenido del Tab */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-sm space-y-4">
          {activeTab === 'lichess' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h4 className="font-black text-amber-900 text-sm mb-1">
                  ♟️ Conexión y Creación de Partidas en Lichess con 1 Clic
                </h4>
                <p className="text-xs text-amber-800">
                  Genera partidas con ritmos oficiales (Bullet, Blitz, Rápido, Clásico) de forma automatizada mediante la API de Lichess o enlaza partidas existentes para seguimiento y sincronización.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0 text-xs">1</span>
                  <div>
                    <strong className="block text-slate-800 text-sm">Crear Partida Automática con 1 Clic:</strong>
                    Haz clic en el botón <strong className="text-amber-700">"⚡ Crear Lichess"</strong> en cualquier tablero. Selecciona el ritmo deseado (ej. Blitz 3+2 o 5+3) y el sistema generará los enlaces directos para Blancas y Negras, asignando el tablero al instante.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black flex items-center justify-center flex-shrink-0 text-xs">2</span>
                  <div>
                    <strong className="block text-slate-800 text-sm">Ver el tablero interactivo embebido:</strong>
                    Haz clic en el botón <strong>"♟️ Tablero Lichess"</strong> para abrir el visor oficial, donde árbitros, público y padres pueden seguir el reloj y las jugadas en vivo.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black flex items-center justify-center flex-shrink-0 text-xs">3</span>
                  <div>
                    <strong className="block text-slate-800 text-sm">Auto-completar el resultado con 1 clic:</strong>
                    Al concluir la partida en Lichess, presiona <strong>"⚡ Auto-completar desde Lichess"</strong> o abre el modal y pulsa <strong>"Sincronizar"</strong>. El sistema registrará 1-0, 0-1 o ½-½ y recalculará la tabla de posiciones inmediatamente.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nativo' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <h4 className="font-black text-emerald-900 text-sm mb-1">
                  🎮 Tablero Nativo con Transmisión en Vivo en Tiempo Real
                </h4>
                <p className="text-xs text-emerald-800">
                  Juega directamente en la plataforma o sigue las partidas en vivo movimiento a movimiento desde cualquier dispositivo. Ideal para torneos presenciales, tablets de mesa y espectadores.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <strong className="text-slate-800 block text-sm flex items-center gap-1.5">
                    <span>📡</span> Transmisión en Vivo Jugada a Jugada
                  </strong>
                  <p className="text-slate-600">
                    Cualquier espectador o padre de familia puede pulsar <strong>"🔴 En Vivo"</strong> para abrir el visor en tiempo real y ver cómo se mueven las piezas y corren los relojes en directo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <strong className="text-slate-800 block text-sm flex items-center gap-1.5">
                    <span>🎬</span> Repetición Jugada a Jugada (Replay)
                  </strong>
                  <p className="text-slate-600">
                    En cualquier partida finalizada, pulsa <strong>"👁️ Ver Jugadas / Repetición"</strong> para avanzar, retroceder con las flechas (← / →), reproducir en modo automático o hacer clic en cualquier jugada del PGN para ver la posición exacta en ese instante.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <strong className="text-slate-800 block text-sm flex items-center gap-1.5">
                    <span>⚖️</span> Reglas Oficiales FIDE Completas
                  </strong>
                  <p className="text-slate-600">
                    Validación estricta de movimientos legales, enroques, peón al paso, jaque, jaque mate, tablas por rey ahogado, repetición triple y coronación de peones.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <strong className="text-slate-800 block text-sm flex items-center gap-1.5">
                    <span>📋</span> Registro PGN & Copia Rápida
                  </strong>
                  <p className="text-slate-600">
                    Guarda la notación PGN oficial con todos los movimientos y permite copiarla al portapapeles con 1 clic para analizarla en cualquier motor o visor.
                  </p>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'antitrampa' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <h4 className="font-black text-red-900 text-sm mb-1">
                  🛡️ Sistema Integral de Control Fair Play y Detección de Asistencia
                </h4>
                <p className="text-xs text-red-800">
                  El sistema combina análisis estadístico de tiempos, telemetría de foco de ventana, análisis de centipeones (ACPL) y screening forense FIDE.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <strong className="text-amber-900 block font-black">🖥️ Detección de Foco (Tab Blur)</strong>
                  <p className="text-amber-800">
                    Registra en tiempo real si un jugador cambia de pestaña o minimiza el navegador durante su turno. Si acumula ≥3 salidas, se activa una alerta para el árbitro.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                  <strong className="text-indigo-900 block font-black">⏱️ Varianza de Tiempos (Time Uniformity)</strong>
                  <p className="text-indigo-800">
                    Evalúa la desviación estándar (σ) de decisión por jugada. Los tramposos que copian de motor presentan ritmos planos artificiales (ej. 5s ±0.4s en cada jugada).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-black">📡 Retardo de Retransmisión (Delay)</strong>
                  <p className="text-slate-700">
                    Permite transmitir con +15s, +30s o +60s de retraso para evitar que espectadores o cómplices en la sala puedan soplar análisis de motor en tiempo real.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <strong className="text-emerald-900 block font-black">📥 Exportación PGN para Screening FIDE</strong>
                  <p className="text-emerald-800">
                    Botón de descarga masiva de todos los PGNs de la ronda para procesarlos en herramientas oficiales como <em>PGN-Spy</em> o el algoritmo de Ken Regan (FIDE).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chessresults' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h4 className="font-black text-blue-900 text-sm mb-1">
                  📊 Importación de Excel & Reclasificación FIDE a Sub-X
                </h4>
                <p className="text-xs text-blue-800">
                  Importa bases de datos de Chess-Results o torneos escolares por ciclos y reclasifícalos automáticamente a sus franjas de edad reales.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <p>
                  <strong>1. Arrastra tu archivo Excel:</strong> Compatible con hojas exportadas de Swiss-Manager o Chess-Results (.xlsx, .xls, .csv).
                </p>
                <p>
                  <strong>2. Reclasificación oficial FIDE:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Sub-7:</strong> Jugadores con 7 años o menos.</li>
                  <li><strong>Sub-9:</strong> Jugadores de 8 y 9 años.</li>
                  <li><strong>Sub-11:</strong> Jugadores de 10 y 11 años.</li>
                  <li><strong>Sub-13:</strong> Jugadores de 12 y 13 años.</li>
                  <li><strong>Abierta:</strong> Mayores de 14 años.</li>
                </ul>
                <p>
                  <strong>3. Podio y Top 10:</strong> En la pestaña <em>Posiciones</em>, puedes filtrar por cualquier categoría para ver los 10 mejores y la asignación de medallas 🥇 🥈 🥉.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cedula' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <h4 className="font-black text-purple-900 text-sm mb-1">
                  🪪 Registro Único Anual de Cédula de Identidad
                </h4>
                <p className="text-xs text-purple-800">
                  Evita que los padres o jugadores deban adjuntar su cédula en cada torneo del circuito.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  • <strong>Persistencia anual:</strong> Cuando un participante sube su documento una vez en el año, queda guardado en su perfil maestro.
                </p>
                <p>
                  • <strong>Validación por el organizador:</strong> El árbitro puede revisar la foto de la cédula y dar "Aprobar Cédula".
                </p>
                <p>
                  • <strong>Inscripción ágil:</strong> En los siguientes torneos del año, el sistema detecta que la cédula ya está validada y no vuelve a pedir la foto.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'suizo' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="font-black text-slate-900 text-sm mb-1">
                  🏆 Desempates Oficiales FIDE (Buchholz & Sonneborn-Berger)
                </h4>
                <p className="text-xs text-slate-600">
                  Cálculo automatizado bajo las Leyes del Ajedrez de la FIDE.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  • <strong className="text-slate-800">PTS (Puntos):</strong> 1.0 victoria, 0.5 empate, 0.0 derrota.
                </p>
                <p>
                  • <strong className="text-slate-800">BC1 (Buchholz Cut 1):</strong> Suma de puntos de todos los rivales enfrentados, descartando la puntuación del rival más débil.
                </p>
                <p>
                  • <strong className="text-slate-800">BT (Buchholz Total):</strong> Suma total de puntos de todos los oponentes.
                </p>
                <p>
                  • <strong className="text-slate-800">SB (Sonneborn-Berger):</strong> Suma de los puntos de los rivales a quienes se venció, más la mitad de los puntos de los rivales con quienes se empató.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Sistema Oficial de Torneos de Ajedrez — MiCancha & Poliverso
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
