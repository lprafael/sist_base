"use client";
import React, { useState, useRef } from 'react';
import {
  X, UploadCloud, FileText, CheckCircle2, AlertCircle,
  Loader2, Smartphone, ShieldCheck, ArrowRight, Share2
} from 'lucide-react';

interface UploadComprobanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidadTipo: 'torneo_participante' | 'torneo_equipo' | 'academia_cuota' | 'academia_matricula';
  entidadId: string;
  montoSugerido?: number;
  beneficiarioNombre?: string;
  concepto?: string;
  torneoId?: string;
  academiaId?: string;
  telefonoOrganizador?: string;
  onSuccess?: (data: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function UploadComprobanteModal({
  isOpen,
  onClose,
  entidadTipo,
  entidadId,
  montoSugerido = 0,
  beneficiarioNombre = '',
  concepto = '',
  torneoId,
  academiaId,
  telefonoOrganizador,
  onSuccess,
}: UploadComprobanteModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [monto, setMonto] = useState<number>(montoSugerido);
  const [numeroRef, setNumeroRef] = useState('');
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [pagadorNombre, setPagadorNombre] = useState(beneficiarioNombre);
  const [pagadorTelefono, setPagadorTelefono] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Debes adjuntar el archivo o foto del comprobante.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entidad_tipo', entidadTipo);
      fd.append('entidad_id', entidadId);
      fd.append('monto_declarado', monto.toString());
      if (numeroRef) fd.append('numero_referencia', numeroRef);
      if (bancoOrigen) fd.append('banco_origen', bancoOrigen);
      if (pagadorNombre) fd.append('pagador_nombre', pagadorNombre);
      if (pagadorTelefono) fd.append('pagador_telefono', pagadorTelefono);
      if (torneoId) fd.append('torneo_id', torneoId);
      if (academiaId) fd.append('academia_id', academiaId);

      const res = await fetch(`${API_URL}/api/pagos-core/comprobante/upload`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al subir comprobante');

      setSuccessData(data);
      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el comprobante');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (telefonoOrganizador || '595981000000').replace(/\D/g, '');
    const msg = encodeURIComponent(
      `*Comprobante de Pago Enviado*\n` +
      `👤 *Pagador/Atleta:* ${pagadorNombre || beneficiarioNombre}\n` +
      `📌 *Concepto:* ${concepto || 'Inscripción'}\n` +
      `💰 *Monto:* Gs. ${monto.toLocaleString('es-PY')}\n` +
      (numeroRef ? `🔢 *Nro. Transacción:* ${numeroRef}\n` : '') +
      `\nAdjunto el comprobante de transferencia para su confirmación. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Adjuntar Comprobante de Pago</h3>
              <p className="text-xs text-slate-400">
                {concepto || 'Carga tu boleta de depósito o transferencia SIPAP'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {successData ? (
            /* Pantalla de Éxito */
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">¡Comprobante Recibido con Éxito!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                  Tu comprobante ha sido enviado a la administración para su validación.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Beneficiario:</span>
                  <strong className="text-white">{pagadorNombre}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Monto Declarado:</span>
                  <strong className="text-emerald-400 font-mono">Gs. {monto.toLocaleString('es-PY')}</strong>
                </div>
                {numeroRef && (
                  <div className="flex justify-between text-slate-400">
                    <span>Nro. Referencia:</span>
                    <strong className="text-slate-200 font-mono">{numeroRef}</strong>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Estado:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                    ⏳ En Revisión
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Smartphone size={16} />
                  <span>Notificar al Organizador por WhatsApp</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Zona Drag & Drop */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      alt="Preview comprobante"
                      className="max-h-40 rounded-xl object-contain border border-slate-700 shadow-md"
                    />
                    <div className="text-[11px] text-emerald-400 font-bold mt-2">
                      ✓ Imagen seleccionada ({file?.name})
                    </div>
                  </div>
                ) : file ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <FileText size={28} />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mb-1">
                      <UploadCloud size={24} />
                    </div>
                    <p className="font-bold text-xs text-slate-200">
                      Arrastra tu comprobante o <span className="text-amber-400 underline">haz clic aquí</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Formatos soportados: JPG, PNG o PDF (hasta 10MB)
                    </p>
                  </>
                )}
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Monto Abonado (Gs.) *</label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nro. de Referencia / Boleta</label>
                  <input
                    type="text"
                    value={numeroRef}
                    onChange={(e) => setNumeroRef(e.target.value)}
                    placeholder="Ej: 94827163"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Banco de Origen (Opcional)</label>
                  <input
                    type="text"
                    value={bancoOrigen}
                    onChange={(e) => setBancoOrigen(e.target.value)}
                    placeholder="Ej: Itaú, Continental, Ueno"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={pagadorTelefono}
                    onChange={(e) => setPagadorTelefono(e.target.value)}
                    placeholder="Ej: 0981 123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-xs">Nombre del Titular / Pagador</label>
                <input
                  type="text"
                  value={pagadorNombre}
                  onChange={(e) => setPagadorNombre(e.target.value)}
                  placeholder="Nombre y Apellido de quien transfiere"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {/* Botón Submit */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !file}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{submitting ? 'Subiendo...' : 'Enviar Comprobante'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
