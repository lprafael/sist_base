"use client";
import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, ShieldAlert, CreditCard } from 'lucide-react';

interface PaymentStatusBadgeProps {
  estadoPago?: string; // 'aprobado' | 'comprobante_subido' | 'en_revision' | 'rechazado' | 'pendiente'
  pagoConfirmado?: boolean;
  montoAbonado?: number;
  onClick?: () => void;
  showAmount?: boolean;
}

export default function PaymentStatusBadge({
  estadoPago,
  pagoConfirmado,
  montoAbonado,
  onClick,
  showAmount = false,
}: PaymentStatusBadgeProps) {
  const isAprobado = pagoConfirmado || estadoPago === 'aprobado' || estadoPago === 'pagada';
  const isEnRevision = estadoPago === 'comprobante_subido' || estadoPago === 'en_revision';
  const isRechazado = estadoPago === 'rechazado';

  let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = 'Pendiente';
  let Icon = Clock;

  if (isAprobado) {
    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    label = 'Pagado';
    Icon = CheckCircle2;
  } else if (isEnRevision) {
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse';
    label = 'En Revisión 📸';
    Icon = Clock;
  } else if (isRechazado) {
    badgeClass = 'bg-red-50 text-red-700 border-red-300';
    label = 'Rechazado';
    Icon = XCircle;
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border transition shadow-xs ${badgeClass} ${
        onClick ? 'cursor-pointer hover:opacity-85' : ''
      }`}
      title={
        isEnRevision
          ? 'Comprobante de pago adjunto. Haz clic para auditar.'
          : isAprobado
          ? 'Pago verificado y aprobado.'
          : 'Sin comprobante verificado.'
      }
    >
      <Icon size={12} className={isAprobado ? 'text-emerald-600' : isEnRevision ? 'text-amber-600' : isRechazado ? 'text-red-600' : 'text-slate-400'} />
      <span>{label}</span>
      {showAmount && montoAbonado !== undefined && montoAbonado > 0 && (
        <span className="font-mono text-[11px] opacity-80">
          (Gs. {montoAbonado.toLocaleString('es-PY')})
        </span>
      )}
    </span>
  );
}
