/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, User, Eye, EyeOff, UtensilsCrossed, 
  ChefHat, Store, ArrowRight, ShieldCheck, 
  Users, Sparkles, CheckCircle2, Clock
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CantinaLoginPage() {
  const [rolSeleccionado, setRolSeleccionado] = useState<'admin' | 'cajera' | 'despachante' | 'encargado'>('cajera');
  const [nombreOperador, setNombreOperador] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cantinas, setCantinas] = useState<any[]>([]);
  const [cantinaSlug, setCantinaSlug] = useState('cantina-central');

  useEffect(() => {
    // Cargar cantinas disponibles
    fetch(`${API_URL}/cantina/lista`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCantinas(data);
          setCantinaSlug(data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/cantina/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantina_slug: cantinaSlug,
          rol: rolSeleccionado,
          nombre: nombreOperador.trim() || undefined,
          pin: pin.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.authorized) {
        const session = {
          access_token: data.token,
          role: 'cantina',
          rol_cantina: data.user.rol,
          cantina_id: data.cantina_id,
          cantina_nombre: data.cantina_nombre,
          cantina_slug: data.cantina_slug,
          name: data.user.nombre,
          email: data.user.email,
          authorized: true
        };
        localStorage.setItem('user_session', JSON.stringify(session));
        localStorage.setItem('cantina_session', JSON.stringify(session));
        window.location.href = '/cantina-panel';
      } else {
        setError(data.detail || 'No se pudo iniciar sesión. Verifique los datos.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const ROLES_INFO = [
    {
      id: 'cajera',
      titulo: 'Cajera / POS',
      icono: Store,
      desc: 'Toma rápida de pedidos, cobros multi-cuenta y emisión de comandas.',
      badge: 'Punto de Venta Rápido',
      color: '#f97316'
    },
    {
      id: 'despachante',
      titulo: 'Despachante / Cocina',
      icono: ChefHat,
      desc: 'Pantalla KDS en tiempo real para entrega de pedidos y descuento de stock.',
      badge: 'Monitor KDS',
      color: '#eab308'
    },
    {
      id: 'encargado',
      titulo: 'Encargado de Turno',
      icono: Users,
      desc: 'Padres o voluntarios: arqueos de inventario inicial/final y compras.',
      badge: 'Turnos & Stock',
      color: '#10b981'
    },
    {
      id: 'admin',
      titulo: 'Administrador Buffet',
      icono: ShieldCheck,
      desc: 'Control financiero, catálogo de productos, precios y balances.',
      badge: 'Acceso Total',
      color: '#6366f1'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-3 text-decoration-none mb-6 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white block">
              Mi<span className="text-orange-500">Cancha</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400/80 -mt-1 block">
              Módulo Cantinas & Buffet
            </span>
          </div>
        </Link>

        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
          Portal de Cantina
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Seleccioná tu rol operativo para ingresar al sistema
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl">
          
          {/* Selector de Cantina (si hay más de una) */}
          {cantinas.length > 1 && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Cantina / Buffet Deportivo
              </label>
              <select
                value={cantinaSlug}
                onChange={e => setCantinaSlug(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
              >
                {cantinas.map(c => (
                  <option key={c.slug} value={c.slug}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Rol */}
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            1. Puesto / Rol para este ingreso
          </label>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES_INFO.map(r => {
              const Icon = r.icono;
              const isSelected = rolSeleccionado === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRolSeleccionado(r.id as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative ${
                    isSelected 
                      ? 'bg-orange-500/10 border-orange-500 shadow-md shadow-orange-500/10 scale-[1.02]' 
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: isSelected ? r.color : 'rgba(255,255,255,0.06)', color: isSelected ? '#fff' : '#94a3b8' }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{r.titulo}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Identificación del Colaborador
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre de quien opera (Ej: Mamá de Lucas / Carmen López)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre o alias..."
                  value={nombreOperador}
                  onChange={e => setNombreOperador(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  PIN rápido de acceso (4 dígitos)
                </label>
                <span className="text-[11px] text-slate-500">Opcional para cambio rápido</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Ej: 1234"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 tracking-widest font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Ingresando al sistema...</span>
              ) : (
                <>
                  <span>Ingresar al Panel de Cantina</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Tips informativos para padres y personal */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p>
              Diseñado para operar desde tablets o celulares en el buffet del club. El despachante verá los pedidos al instante y descontará stock al entregarlos.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          ¿Querés ver el menú público de la cantina?{' '}
          <Link href={`/cantina/menu/${cantinaSlug}`} className="text-orange-400 hover:underline font-semibold">
            Abrir Menú Digital QR
          </Link>
        </div>
      </div>
    </div>
  );
}
