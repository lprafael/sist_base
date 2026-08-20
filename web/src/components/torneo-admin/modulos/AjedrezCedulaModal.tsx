"use client";
import React, { useState, useRef } from 'react';
import {
  X, ShieldCheck, ShieldAlert, UploadCloud,
  CheckCircle2, AlertCircle, Loader2, Eye, FileText, Check, Ban
} from 'lucide-react';

interface AjedrezCedulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  participante: {
    id: string;
    nombre: string;
    apellido?: string;
    documento?: string;
    foto_documento_url?: string;
    documento_validado?: boolean;
    documento_validado_anio?: number;
  } | null;
  onActualizado: () => void;
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

export default function AjedrezCedulaModal({
  isOpen,
  onClose,
  participante,
  onActualizado,
}: AjedrezCedulaModalProps) {
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [docNumero, setDocNumero] = useState('');
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (participante) {
      setDocNumero(participante.documento || '');
      setMsg(null);
    }
  }, [participante, isOpen]);

  if (!isOpen || !participante) return null;

  const currentYear = new Date().getFullYear();
  const esValidoAnio =
    participante.documento_validado_anio === currentYear ||
    participante.documento_validado === true;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    if (docNumero) formData.append('documento', docNumero);

    try {
      const res = await fetch(`${API_URL}/api/ajedrez/participantes/${participante.id}/documento/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al subir la cédula');

      setMsg({ text: 'Cédula subida y validada para la temporada anual actual.', type: 'ok' });
      onActualizado();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al subir archivo', type: 'err' });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleValidar = async (nuevoEstado: boolean) => {
    setToggling(true);
    setMsg(null);
    try {
      const res = await fetch(
        `${API_URL}/api/ajedrez/participantes/${participante.id}/validar-documento?validado=${nuevoEstado}`,
        {
          method: 'POST',
          headers: authHdrs(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al cambiar estado');

      setMsg({
        text: nuevoEstado
          ? 'Cédula aprobada y validada para el ciclo actual.'
          : 'Validación de cédula revocada.',
        type: 'ok',
      });
      onActualizado();
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al actualizar', type: 'err' });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Cédula de Identidad & Registro Único
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {participante.nombre} {participante.apellido || ''}
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
          {msg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                msg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{msg.text}</span>
            </div>
          )}

          {/* Banner de Estado Anual */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              esValidoAnio
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            {esValidoAnio ? (
              <ShieldCheck size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-black text-sm block">
                {esValidoAnio
                  ? `✅ Documento Validado (Temporada ${participante.documento_validado_anio || currentYear})`
                  : '⚠️ Documento Pendiente de Validación'}
              </span>
              <p className="text-xs opacity-90 mt-0.5">
                {esValidoAnio
                  ? 'Este participante ya cuenta con su cédula validada para el año en curso. No se le volverá a solicitar en ningún otro torneo del circuito.'
                  : 'Sube la foto del documento o pulsa "Aprobar Validación" para verificarlo durante todo el año.'}
              </p>
            </div>
          </div>

          {/* Campo de Número de Documento */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Número de Cédula / DNI:
            </label>
            <input
              type="text"
              value={docNumero}
              onChange={e => setDocNumero(e.target.value)}
              placeholder="Ej: 4567890"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-800 focus:border-amber-400 outline-none"
            />
          </div>

          {/* Visualizador o Zona de Carga de Foto */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">
              Foto de la Cédula / Documento:
            </label>
            {participante.foto_documento_url ? (
              <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 group">
                <img
                  src={
                    participante.foto_documento_url.startsWith('http')
                      ? participante.foto_documento_url
                      : `${API_URL}${participante.foto_documento_url}`
                  }
                  alt="Cédula"
                  className="w-full h-48 object-contain"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <a
                    href={
                      participante.foto_documento_url.startsWith('http')
                        ? participante.foto_documento_url
                        : `${API_URL}${participante.foto_documento_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white/90 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-white shadow"
                  >
                    <Eye size={14} /> Ver Ampliada
                  </a>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <UploadCloud size={14} /> Cambiar Foto
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-amber-50/20 transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Haz clic para adjuntar la foto de la cédula
                </p>
                <p className="text-[11px] text-slate-400">
                  Sin límite estricto de peso (JPG, PNG, PDF)
                </p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="py-2 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-amber-500" />
              <span>Subiendo y procesando documento...</span>
            </div>
          )}
        </div>

        {/* Footer con Acciones de Árbitro / Organizador */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {esValidoAnio ? (
              <button
                onClick={() => handleToggleValidar(false)}
                disabled={toggling}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {toggling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Revocar Validación
              </button>
            ) : (
              <button
                onClick={() => handleToggleValidar(true)}
                disabled={toggling}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {toggling ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Aprobar Cédula (Ciclo {currentYear})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
