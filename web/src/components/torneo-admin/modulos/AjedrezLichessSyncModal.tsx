import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface AjedrezLichessSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  onSuccess: () => void;
}

export default function AjedrezLichessSyncModal({ isOpen, onClose, torneoId, onSuccess }: AjedrezLichessSyncModalProps) {
  const [lichessUrl, setLichessUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [autoSync, setAutoSync] = useState(false);

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (!lichessUrl.trim()) {
      setError("Por favor ingresa la URL del torneo de Lichess.");
      return;
    }
    setError(null);
    setLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/preview-torneo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lichess_url: lichessUrl.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al obtener vista previa.");
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!previewData?.lichess_id) return;
    
    // Preguntar confirmación extra debido a la eliminación de rondas
    const confirmed = window.confirm(
      "⚠️ ADVERTENCIA: Esta acción eliminará todas las RONDAS y PARTIDAS actuales de este torneo en MiCancha, reemplazándolas por las de Lichess.\n\n¿Estás seguro de que quieres continuar?"
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/lichess/sync-torneo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lichess_id: previewData.lichess_id,
          crear_usuarios_faltantes: true,
          auto_sync: autoSync
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al sincronizar el torneo.");
      }
      const data = await res.json();
      alert(`✅ Torneo sincronizado exitosamente.\nSe registraron ${data.partidas_creadas} partidas.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Decoración */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <UploadCloud size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Importar Torneo de Lichess</h2>
              <p className="text-sm text-slate-400">Sincroniza un torneo Suizo completo (jugadores, rondas y partidas).</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Input Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              URL del Torneo Suizo en Lichess
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={lichessUrl}
                  onChange={(e) => setLichessUrl(e.target.value)}
                  placeholder="https://lichess.org/swiss/Tz01xXhB"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handlePreview}
                disabled={loading || !lichessUrl.trim()}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && !previewData ? <RefreshCw size={18} className="animate-spin" /> : "Analizar"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Pega el enlace completo del torneo. Actualmente compatible con torneos de formato Suizo.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Preview Section */}
          {previewData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{previewData.nombre}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      ID Lichess: <span className="text-slate-300 font-mono">{previewData.lichess_id}</span> • 
                      Estado: <span className="capitalize">{previewData.status}</span>
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider rounded-lg border border-indigo-500/20">
                    {previewData.rondas_totales} Rondas
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div className="text-sm text-slate-400 mb-1">Jugadores Emparejados</div>
                    <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle size={20} />
                      {previewData.jugadores_empatados}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div className="text-sm text-slate-400 mb-1">Jugadores a Crear</div>
                    <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                      <AlertCircle size={20} />
                      {previewData.jugadores_faltantes?.length || 0}
                    </div>
                  </div>
                </div>

                {previewData.jugadores_faltantes && previewData.jugadores_faltantes.length > 0 && (
                  <div className="text-sm text-slate-400 bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="font-medium text-slate-300">Se crearán los siguientes jugadores (porque no existen en MiCancha):</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewData.jugadores_faltantes.map((usr: string) => (
                        <span key={usr} className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-mono">
                          {usr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {previewData && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <input 
                type="checkbox" 
                id="autoSync"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <div>
                <label htmlFor="autoSync" className="text-sm font-medium text-blue-400 cursor-pointer">
                  Mantener sincronizado automáticamente en segundo plano
                </label>
                <p className="text-xs text-slate-400 mt-1">
                  MiCancha consultará a Lichess cada 2 minutos y actualizará las rondas y posiciones sin que tengas que intervenir, hasta que el torneo finalice.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
          >
            Cancelar
          </button>
          {previewData && (
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : "Iniciar Importación Completa"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
