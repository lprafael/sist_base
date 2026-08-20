"use client";
import React, { useState, useRef } from 'react';
import {
  X, UploadCloud, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2, Sparkles, UserCheck, ArrowRight, RefreshCw
} from 'lucide-react';

interface ImportarChessResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  onImportadoExitoso: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

const getToken = () => {
  try {
    const s = JSON.parse(localStorage.getItem('user_session') || '{}');
    return s.access_token || s.token || '';
  } catch {
    return '';
  }
};

const authHdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export default function ImportarChessResultsModal({
  isOpen,
  onClose,
  torneoId,
  onImportadoExitoso,
}: ImportarChessResultsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [anioCorte, setAnioCorte] = useState<number>(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg(null);
    await uploadAndPreview(selected, anioCorte);
  };

  const uploadAndPreview = async (selectedFile: File, anio: number) => {
    setParsing(true);
    setErrorMsg(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (anio) formData.append('anio_referencia', String(anio));

    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/importar-chess-results/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al procesar el archivo');
      setPreviewData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al leer el archivo Excel/CSV');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmarImportacion = async () => {
    if (!previewData?.jugadores?.length) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/ajedrez/torneos/${torneoId}/importar-chess-results`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify({
          jugadores: previewData.jugadores,
          anio_referencia: anioCorte,
          auto_clasificar_sub: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar los participantes');

      onImportadoExitoso();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al importar los jugadores');
    } finally {
      setSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      await uploadAndPreview(dropped, anioCorte);
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    'Sub-7': 'bg-purple-100 text-purple-800 border-purple-300',
    'Sub-9': 'bg-blue-100 text-blue-800 border-blue-300',
    'Sub-11': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Sub-13': 'bg-amber-100 text-amber-800 border-amber-300',
    'Sub-15': 'bg-orange-100 text-orange-800 border-orange-300',
    'Sub-18': 'bg-rose-100 text-rose-800 border-rose-300',
    'Abierta': 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Importar desde Chess-Results / Excel
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Carga listas de jugadores, ELO FIDE y reclasifica automáticamente por franjas de edad (Sub-7 a Sub-13 / Abierta).
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

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Zona de Drop / Carga */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              file
                ? 'border-amber-400 bg-amber-50/30'
                : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">
                {file ? file.name : 'Haz clic o arrastra tu archivo Excel de Chess-Results aquí'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Formatos compatibles: .xlsx, .xls, .csv (Exportación oficial de Swiss-Manager o Chess-Results)
              </p>
            </div>
          </div>

          {/* Opciones de Reclasificación */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span className="font-bold text-slate-700">Año de corte para categorías FIDE:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={anioCorte}
                onChange={e => {
                  const val = parseInt(e.target.value) || new Date().getFullYear();
                  setAnioCorte(val);
                  if (file) uploadAndPreview(file, val);
                }}
                className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800 text-center outline-none focus:border-amber-400 bg-white"
                min={2000}
                max={2050}
              />
              <span className="text-slate-400 font-medium">
                (Sub-7: ≤7 años | Sub-9: ≤9 años | Sub-11: ≤11 años | Sub-13: ≤13 años)
              </span>
            </div>
          </div>

          {/* Loader de parseo */}
          {parsing && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <span className="text-sm font-bold">Procesando y reclasificando jugadores...</span>
            </div>
          )}

          {/* Vista previa de jugadores detectados */}
          {previewData && !parsing && (
            <div className="space-y-4">
              {/* Badges de resumen por categoría */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-600 mr-1">
                  Detectados ({previewData.total_detectados}):
                </span>
                {Object.entries(previewData.categorias_resumen || {}).map(([cat, count]: any) => (
                  <span
                    key={cat}
                    className={`px-3 py-1 rounded-xl text-xs font-black border shadow-sm ${
                      CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {cat}: {count}
                  </span>
                ))}
              </div>

              {/* Tabla de Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-inner bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-black sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Jugador</th>
                      <th className="px-4 py-2.5 text-center">FIDE ID</th>
                      <th className="px-4 py-2.5 text-center">ELO</th>
                      <th className="px-4 py-2.5">Club / Fed.</th>
                      <th className="px-4 py-2.5 text-center">Categoría Asignada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.jugadores.map((j: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/40 transition">
                        <td className="px-4 py-2 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">
                          {j.apellido ? `${j.apellido}, ${j.nombre}` : j.nombre}
                        </td>
                        <td className="px-4 py-2 text-center font-mono text-slate-500">
                          {j.codigo_fide || '—'}
                        </td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-700">
                          {j.rating_fide || '0'}
                        </td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-[120px]">
                          {j.institucion_nombre || '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                              CATEGORY_COLORS[j.categoria_base] || 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {j.categoria_base || 'Abierta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmarImportacion}
            disabled={!previewData?.jugadores?.length || saving || parsing}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Confirmar e Importar {previewData?.total_detectados ? `(${previewData.total_detectados})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
