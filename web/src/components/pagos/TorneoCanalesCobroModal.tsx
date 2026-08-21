"use client";
import React, { useState, useEffect } from 'react';
import {
  X, Plus, Building2, QrCode, Trash2, Edit2, Check,
  Loader2, Smartphone, ShieldCheck, AlertCircle, UploadCloud
} from 'lucide-react';
import { CanalCobro } from './PaymentCardInfo';

interface TorneoCanalesCobroModalProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId?: string;
  academiaId?: string;
  organizadorId?: string;
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

export default function TorneoCanalesCobroModal({
  isOpen,
  onClose,
  torneoId,
  academiaId,
  organizadorId,
}: TorneoCanalesCobroModalProps) {
  const [canales, setCanales] = useState<CanalCobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCanal, setEditingCanal] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const loadCanales = async () => {
    setLoading(true);
    try {
      const q = torneoId ? `torneo_id=${torneoId}` : academiaId ? `academia_id=${academiaId}` : '';
      const res = await fetch(`${API_URL}/api/pagos-core/canales?${q}`);
      if (res.ok) {
        setCanales(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCanales();
    }
  }, [isOpen, torneoId, academiaId]);

  if (!isOpen) return null;

  const handleOpenNew = () => {
    setEditingCanal({
      tipo: 'banco',
      nombre_banco: 'Banco Itaú',
      titular: '',
      ruc_ci: '',
      numero_cuenta: '',
      tipo_cuenta: 'Cuenta Corriente',
      alias_sipap: '',
      telefono_billetera: '',
      instrucciones: 'Favor remitir el comprobante para confirmar la inscripción.',
      es_principal: true,
      activo: true,
      torneo_id: torneoId || null,
      academia_id: academiaId || null,
    });
    setQrFile(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/pagos-core/canales`, {
        method: 'POST',
        headers: authHdrs(),
        body: JSON.stringify(editingCanal),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar canal de cobro');

      // Subir QR si se seleccionó
      if (qrFile && data.id) {
        const fd = new FormData();
        fd.append('file', qrFile);
        await fetch(`${API_URL}/api/pagos-core/canales/${data.id}/upload-qr`, {
          method: 'POST',
          body: fd,
        });
      }

      setFormOpen(false);
      setEditingCanal(null);
      loadCanales();
    } catch (err: any) {
      setError(err.message || 'Error al registrar canal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Cuentas Bancarias & SIPAP</h3>
              <p className="text-xs text-slate-400">
                Canales donde los participantes transferirán los pagos e inscripciones.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {formOpen ? (
            /* Formulario de Canal */
            <form onSubmit={handleSave} className="space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-black text-amber-400 text-sm">
                  {editingCanal.id ? 'Editar Cuenta de Cobro' : 'Nueva Cuenta Bancaria / Billetera'}
                </h4>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Banco / Entidad *</label>
                  <input
                    type="text"
                    required
                    value={editingCanal.nombre_banco || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, nombre_banco: e.target.value })}
                    placeholder="Ej: Banco Itaú, Continental, Ueno"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tipo de Cuenta</label>
                  <select
                    value={editingCanal.tipo_cuenta || 'Caja de Ahorro'}
                    onChange={(e) => setEditingCanal({ ...editingCanal, tipo_cuenta: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  >
                    <option value="Caja de Ahorro">Caja de Ahorro</option>
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Billetera Electrónica">Billetera Electrónica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Titular de la Cuenta *</label>
                  <input
                    type="text"
                    required
                    value={editingCanal.titular || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, titular: e.target.value })}
                    placeholder="Nombre completo o Razón Social"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">RUC o Cédula *</label>
                  <input
                    type="text"
                    required
                    value={editingCanal.ruc_ci || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, ruc_ci: e.target.value })}
                    placeholder="Ej: 80012345-6 o 4123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Número de Cuenta</label>
                  <input
                    type="text"
                    value={editingCanal.numero_cuenta || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, numero_cuenta: e.target.value })}
                    placeholder="Ej: 720019284"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Alias SIPAP (Transferencia Inmediata)</label>
                  <input
                    type="text"
                    value={editingCanal.alias_sipap || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, alias_sipap: e.target.value })}
                    placeholder="Ej: torneos@ajedrezpy o 0981123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Código QR de Pago (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-400 file:font-bold hover:file:bg-slate-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Instrucciones Adicionales</label>
                  <input
                    type="text"
                    value={editingCanal.instrucciones || ''}
                    onChange={(e) => setEditingCanal({ ...editingCanal, instrucciones: e.target.value })}
                    placeholder="Ej: Colocar en concepto el Nombre del Jugador o Equipo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{saving ? 'Guardando...' : 'Guardar Cuenta'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Lista de Canales */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">
                  {canales.length} cuenta(s) configurada(s)
                </span>
                <button
                  onClick={handleOpenNew}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={15} /> <span>Agregar Cuenta</span>
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-amber-400" size={32} />
                </div>
              ) : canales.length === 0 ? (
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center bg-slate-950/40">
                  <Building2 size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-slate-300 text-xs">No hay cuentas bancarias registradas aún</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Agrega tu cuenta bancaria o alias SIPAP para que los atletas puedan abonar sus inscripciones.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {canales.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h5 className="font-black text-white text-xs flex items-center gap-2">
                            <span>{c.nombre_banco}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({c.tipo_cuenta})</span>
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            Titular: <strong className="text-white">{c.titular}</strong> (CI/RUC: {c.ruc_ci})
                          </p>
                          {c.alias_sipap && (
                            <p className="text-[11px] text-amber-400 font-mono font-bold mt-0.5">
                              Alias SIPAP: {c.alias_sipap}
                            </p>
                          )}
                          {c.numero_cuenta && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Nro. Cuenta: {c.numero_cuenta}
                            </p>
                          )}
                        </div>
                      </div>

                      {c.qr_imagen_url && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          <QrCode size={13} /> <span>QR Activo</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
