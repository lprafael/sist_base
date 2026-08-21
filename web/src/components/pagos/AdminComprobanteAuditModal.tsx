"use client";
import React, { useState } from 'react';
import {
  X, CheckCircle, XCircle, ZoomIn, ZoomOut, RotateCw,
  ExternalLink, Loader2, ShieldCheck, AlertTriangle, FileText, User, Calendar
} from 'lucide-react';

export interface ComprobanteData {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  beneficiario_nombre?: string;
  pagador_nombre?: string;
  pagador_telefono?: string;
  monto_declarado: number;
  monto_confirmado?: number;
  metodo_pago?: string;
  banco_origen?: string;
  numero_referencia?: string;
  comprobante_url: string;
  estado: string; // 'en_revision' | 'aprobado' | 'rechazado'
  motivo_rechazo?: string;
  notas_admin?: string;
  fecha_pago?: string;
  creado_en?: string;
}

interface AdminComprobanteAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprobante: ComprobanteData | null;
  montoEsperado?: number;
  onComprobanteUpdated?: () => void;
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

export default function AdminComprobanteAuditModal({
  isOpen,
  onClose,
  comprobante,
  montoEsperado,
  onComprobanteUpdated,
}: AdminComprobanteAuditModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('Transferencia no acreditada en extracto');
  const [montoAprobar, setMontoAprobar] = useState<number>(
    comprobante?.monto_declarado || montoEsperado || 0
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !comprobante) return null;

  const isPdf = comprobante.comprobante_url?.toLowerCase().endsWith('.pdf');
  const fileUrl = comprobante.comprobante_url?.startsWith('http')
    ? comprobante.comprobante_url
    : `${API_URL}${comprobante.comprobante_url}`;

  const handleValidar = async (aprobado: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/pagos-core/comprobantes/${comprobante.id}/validar`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify({
          aprobado,
          monto_confirmado: aprobado ? montoAprobar : 0,
          motivo_rechazo: aprobado ? null : motivoRechazo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al validar comprobante');

      if (onComprobanteUpdated) onComprobanteUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la auditoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm sm:text-base">
                  Auditoría de Comprobante Bancario
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    comprobante.estado === 'aprobado'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : comprobante.estado === 'rechazado'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {comprobante.estado === 'aprobado'
                    ? '✓ Aprobado'
                    : comprobante.estado === 'rechazado'
                    ? '✕ Rechazado'
                    : '⏳ En Revisión'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Beneficiario: <strong className="text-slate-200">{comprobante.beneficiario_nombre || comprobante.pagador_nombre}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Lado Izquierdo (Visor de Imagen) | Lado Derecho (Datos & Acciones) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 bg-slate-950/40">
          {/* VISOR DE DOCUMENTO */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[320px] bg-slate-950 border border-slate-800 rounded-2xl p-2 relative overflow-hidden">
            {/* Controles de Zoom */}
            {!isPdf && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-lg backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Alejar"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Acercar"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Girar 90°"
                >
                  <RotateCw size={15} />
                </button>
              </div>
            )}

            {isPdf ? (
              <div className="text-center p-8 space-y-3">
                <FileText size={48} className="mx-auto text-red-400" />
                <p className="text-xs text-slate-300 font-bold">Documento PDF Adjunto</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <ExternalLink size={14} /> Abrir PDF en Nueva Pestaña
                </a>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[500px]">
                <img
                  src={fileUrl}
                  alt="Comprobante de Pago"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease',
                  }}
                  className="max-w-full max-h-[460px] object-contain rounded-lg shadow-xl select-none"
                />
              </div>
            )}

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800"
            >
              <ExternalLink size={12} /> Ver archivo original
            </a>
          </div>

          {/* PANEL DE DATOS & APROBACIÓN */}
          <div className="w-full md:w-80 flex flex-col justify-between space-y-4">
            <div className="space-y-3 text-xs">
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Tarjeta de Datos */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Detalles Declarados
                </span>

                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-400">Monto Declarado:</span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    Gs. {Number(comprobante.monto_declarado || 0).toLocaleString('es-PY')}
                  </strong>
                </div>

                {montoEsperado !== undefined && montoEsperado > 0 && (
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Costo Esperado:</span>
                    <strong className="text-amber-300 font-mono text-xs">
                      Gs. {montoEsperado.toLocaleString('es-PY')}
                    </strong>
                  </div>
                )}

                {comprobante.numero_referencia && (
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Nro. Boleta / Ref:</span>
                    <strong className="text-slate-200 font-mono">{comprobante.numero_referencia}</strong>
                  </div>
                )}

                {comprobante.banco_origen && (
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Banco Origen:</span>
                    <strong className="text-slate-200">{comprobante.banco_origen}</strong>
                  </div>
                )}

                {comprobante.pagador_nombre && (
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Pagador:</span>
                    <strong className="text-slate-200">{comprobante.pagador_nombre}</strong>
                  </div>
                )}

                {comprobante.pagador_telefono && (
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Teléfono:</span>
                    <strong className="text-slate-200 font-mono">{comprobante.pagador_telefono}</strong>
                  </div>
                )}

                {comprobante.motivo_rechazo && (
                  <div className="pt-1 text-red-300 bg-red-500/10 p-2 rounded-xl border border-red-500/20 text-[11px]">
                    <strong>Motivo de rechazo:</strong> {comprobante.motivo_rechazo}
                  </div>
                )}
              </div>

              {/* Input Monto a Confirmar */}
              <div>
                <label className="block text-slate-400 font-bold mb-1 text-[11px]">
                  Monto a Confirmar en Caja (Gs.):
                </label>
                <input
                  type="number"
                  value={montoAprobar}
                  onChange={(e) => setMontoAprobar(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm outline-none focus:border-amber-400"
                />
              </div>

              {/* Cuadro de Rechazo si se activa */}
              {showRejectBox && (
                <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-2xl space-y-2 animate-in fade-in">
                  <label className="block text-red-300 font-bold text-[11px]">
                    Selecciona o escribe el motivo de rechazo:
                  </label>
                  <select
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    className="w-full bg-slate-900 border border-red-700/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="Transferencia no acreditada en extracto">Transferencia no acreditada en extracto</option>
                    <option value="Monto transferido insuficiente">Monto transferido insuficiente</option>
                    <option value="Comprobante ilegible o cortado">Comprobante ilegible o cortado</option>
                    <option value="Comprobante duplicado ya utilizado">Comprobante duplicado ya utilizado</option>
                    <option value="Fecha de comprobante no corresponde al evento">Fecha no corresponde al evento</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleValidar(false)}
                    disabled={loading}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    <span>Confirmar Rechazo</span>
                  </button>
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleValidar(true)}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                <span>✅ Aprobar Pago e Inscribir</span>
              </button>

              {!showRejectBox ? (
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <XCircle size={15} />
                  <span>Rechazar Comprobante</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-[11px] font-bold"
                >
                  Cancelar Rechazo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
