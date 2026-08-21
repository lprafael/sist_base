"use client";
import React, { useState } from 'react';
import { Copy, Check, QrCode, Building2, Smartphone, ShieldCheck, Info, X } from 'lucide-react';

export interface CanalCobro {
  id?: string;
  tipo?: string;
  nombre_banco?: string;
  titular: string;
  ruc_ci: string;
  numero_cuenta?: string;
  tipo_cuenta?: string;
  alias_sipap?: string;
  telefono_billetera?: string;
  qr_imagen_url?: string;
  instrucciones?: string;
  monto?: number;
}

interface PaymentCardInfoProps {
  canal: CanalCobro;
  monto?: number;
  concepto?: string;
  onSubirComprobante?: () => void;
}

export default function PaymentCardInfo({
  canal,
  monto,
  concepto,
  onSubirComprobante
}: PaymentCardInfoProps) {
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCuenta, setCopiedCuenta] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const copyText = (text: string, type: 'alias' | 'cuenta') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'alias') {
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    } else {
      setCopiedCuenta(true);
      setTimeout(() => setCopiedCuenta(false), 2000);
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
  const qrSrc = canal.qr_imagen_url
    ? canal.qr_imagen_url.startsWith('http')
      ? canal.qr_imagen_url
      : `${API_URL}${canal.qr_imagen_url}`
    : null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm text-white">
              {canal.nombre_banco || 'Transferencia Bancaria / SIPAP'}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {canal.tipo_cuenta || 'Cuenta Bancaria Oficial'}
            </p>
          </div>
        </div>

        {monto !== undefined && monto > 0 && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Monto</span>
            <span className="text-base font-black text-amber-400 font-mono">
              Gs. {monto.toLocaleString('es-PY')}
            </span>
          </div>
        )}
      </div>

      {/* Datos Bancarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs relative z-10">
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Titular</span>
          <p className="font-black text-slate-100">{canal.titular}</p>
          <p className="text-[11px] text-slate-400 font-mono">RUC/CI: {canal.ruc_ci}</p>
        </div>

        {canal.numero_cuenta && (
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Nro de Cuenta</span>
              <p className="font-black text-slate-100 font-mono text-xs">{canal.numero_cuenta}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(canal.numero_cuenta!, 'cuenta')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-bold"
              title="Copiar Nro de Cuenta"
            >
              {copiedCuenta ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedCuenta ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Alias SIPAP & Billeteras */}
      <div className="flex flex-wrap gap-2 items-center justify-between pt-1 relative z-10">
        {canal.alias_sipap ? (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-2xl flex-1 min-w-[200px]">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="flex-1">
              <span className="text-[9px] text-amber-300/80 font-bold uppercase tracking-wider block">Alias SIPAP</span>
              <span className="font-black text-amber-200 font-mono text-xs">{canal.alias_sipap}</span>
            </div>
            <button
              type="button"
              onClick={() => copyText(canal.alias_sipap!, 'alias')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition shadow-sm flex items-center gap-1"
            >
              {copiedAlias ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedAlias ? 'Copiado!' : 'Copiar Alias'}</span>
            </button>
          </div>
        ) : null}

        {qrSrc && (
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <QrCode size={16} className="text-amber-400" />
            <span>Ver QR de Pago</span>
          </button>
        )}
      </div>

      {/* Teléfono Billetera si existe */}
      {canal.telefono_billetera && (
        <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
          <Smartphone size={15} className="text-emerald-400 flex-shrink-0" />
          <span>Billetera Tigo Money / Giros: <strong className="font-mono text-white">{canal.telefono_billetera}</strong></span>
        </div>
      )}

      {/* Instrucción o concepto */}
      {canal.instrucciones && (
        <p className="text-[11px] text-slate-400 italic bg-slate-950/30 p-2 rounded-xl border border-slate-800/50">
          💡 {canal.instrucciones}
        </p>
      )}

      {onSubirComprobante && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onSubirComprobante}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} />
            <span>Adjuntar Comprobante de Transferencia</span>
          </button>
        </div>
      )}

      {/* Modal QR Popover */}
      {showQrModal && qrSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-white text-sm flex items-center gap-2">
                <QrCode size={18} className="text-amber-400" />
                <span>Escanear QR de Pago</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner mx-auto inline-block border-4 border-amber-400/30">
              <img src={qrSrc} alt="Código QR de Pago" className="w-56 h-56 object-contain" />
            </div>

            <p className="text-xs text-slate-300">
              Escanea este código desde la app de tu banco o billetera para transferir.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
