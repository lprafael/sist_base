/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, Search, Sparkles, Coffee, 
  CheckCircle2, XCircle, ArrowLeft, Share2, 
  QrCode, ShoppingBag
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CantinaMenuPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaSel, setCategoriaSel] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/cantina/publico/menu/${slug}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Cargando carta de la cantina...</p>
      </div>
    );
  }

  if (!data || !data.cantina) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4">
          🥪
        </div>
        <h1 className="text-xl font-bold mb-2">Cantina no encontrada</h1>
        <p className="text-slate-400 text-sm mb-6 max-w-sm">
          No pudimos encontrar la carta para este código. Por favor verificá con el encargado del buffet.
        </p>
        <Link href="/" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-semibold">
          Ir a MiCancha
        </Link>
      </div>
    );
  }

  const { cantina, categorias, productos } = data;

  const productosFiltrados = productos.filter((p: any) => {
    const matchCat = categoriaSel === 'Todos' || p.categoria === categoriaSel;
    const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return matchCat && matchBusq;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Header Banner */}
      <header className="relative bg-gradient-to-b from-orange-950/40 via-slate-900 to-slate-950 border-b border-slate-800/80 pt-6 pb-6 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>MiCancha</span>
          </Link>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiado ? '¡Copiado!' : 'Compartir'}</span>
          </button>
        </div>

        <div className="max-w-xl mx-auto flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-xl shadow-orange-500/20 shrink-0 flex items-center justify-center">
            {cantina.logo_url ? (
              <img src={cantina.logo_url} alt={cantina.nombre} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <UtensilsCrossed className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold mb-1">
              <Sparkles className="w-3 h-3" />
              Carta Digital Oficial
            </div>
            <h1 className="text-xl font-black text-white leading-tight">
              {cantina.nombre}
            </h1>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {cantina.descripcion || 'Buffet & Snacks Deportivos'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 mt-4">
        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar empanadas, bebidas, snacks..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Categorías pill selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-5">
          <button
            onClick={() => setCategoriaSel('Todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              categoriaSel === 'Todos'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setCategoriaSel(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoriaSel === cat
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de productos */}
        <div className="space-y-3">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-semibold">No hay productos en esta categoría</p>
              <p className="text-slate-500 text-xs mt-1">Probá con otro término de búsqueda</p>
            </div>
          ) : (
            productosFiltrados.map((prod: any) => (
              <div 
                key={prod.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  prod.disponible
                    ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                    : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase tracking-wider">
                      {prod.categoria}
                    </span>
                    {prod.disponible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> En stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                        <XCircle className="w-3 h-3" /> Agotado
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-white leading-snug">
                    {prod.nombre}
                  </h3>
                  {prod.descripcion && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {prod.descripcion}
                    </p>
                  )}

                  <div className="mt-2 text-base font-black text-orange-400 tracking-tight">
                    {prod.precio_venta.toLocaleString('es-PY')} {cantina.moneda}
                  </div>
                </div>

                {prod.imagen_url && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50">
                    <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
          <p className="text-xs text-orange-300 font-semibold mb-1">
            📍 Pedidos por mostrador
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Acercate a la caja de la cantina para abonar tu pedido en efectivo, transferencia o QR. Te entregarán tu comanda para retirar en el despacho.
          </p>
        </div>
      </main>
    </div>
  );
}
