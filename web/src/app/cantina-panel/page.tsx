/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Store, ChefHat, Users, Package, Landmark, QrCode, 
  TrendingUp, Plus, Search, Check, AlertTriangle, 
  DollarSign, ShoppingCart, Trash2, Printer, RefreshCw, 
  Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck, 
  ExternalLink, LogOut, ChevronRight, FileText, Calendar,
  CreditCard, Sparkles, Filter, Eye, EyeOff, Key, UserCheck, Shield
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, LineChart, Line, AreaChart, Area 
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function CantinaPanelPage() {
  const [tabActiva, setTabActiva] = useState<'pos' | 'despacho' | 'turnos' | 'inventario' | 'cuentas' | 'qr' | 'analytics' | 'equipo'>('pos');
  const [session, setSession] = useState<any>(null);
  const [cantinaInfo, setCantinaInfo] = useState<any>(null);

  // Multi-cantinas del Administrador
  const [misCantinas, setMisCantinas] = useState<any[]>([]);
  const [selectedCantinaId, setSelectedCantinaId] = useState<string>('');

  // Colaboradores & Equipo
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [modalNuevoColaborador, setModalNuevoColaborador] = useState(false);
  const [colaboradorForm, setColaboradorForm] = useState({
    nombre: '',
    email: '',
    pin: '',
    rol: 'cajero'
  });
  const [guardandoColaborador, setGuardandoColaborador] = useState(false);
  const [mostrarPins, setMostrarPins] = useState<{ [key: string]: boolean }>({});

  // Estados compartidos
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [turnosLista, setTurnosLista] = useState<any[]>([]);

  // POS State
  const [categoriaPos, setCategoriaPos] = useState('Todos');
  const [busquedaPos, setBusquedaPos] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cuentaCobroId, setCuentaCobroId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('Consumidor Final');
  const [notaPedido, setNotaPedido] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [ultimoPedidoExitoso, setUltimoPedidoExitoso] = useState<any>(null);

  // Despacho State
  const [pedidosDespacho, setPedidosDespacho] = useState<any[]>([]);
  const [despachandoId, setDespachandoId] = useState<string | null>(null);

  // Turnos & Chequeos State
  const [modalIniciarTurno, setModalIniciarTurno] = useState(false);
  const [modalFinalizarTurno, setModalFinalizarTurno] = useState(false);
  const [fondoInicialInput, setFondoInicialInput] = useState('200000');
  const [itemsChequeo, setItemsChequeo] = useState<any[]>([]);
  const [obsTurno, setObsTurno] = useState('');
  const [chequeosHistorial, setChequeosHistorial] = useState<any[]>([]);
  const [verChequeoTurnoId, setVerChequeoTurnoId] = useState<string | null>(null);

  // Inventario & Compras State
  const [modalNuevoProd, setModalNuevoProd] = useState(false);
  const [modalCompraGasto, setModalCompraGasto] = useState(false);
  const [prodForm, setProdForm] = useState({
    nombre: '', categoria: 'Bebidas', precio_costo: 0, precio_venta: 0,
    stock_actual: 0, stock_minimo: 5, descripcion: '', imagen_url: ''
  });
  const [compraForm, setCompraForm] = useState({
    tipo: 'compra_mercaderia', concepto_proveedor: '', monto_total: 0,
    cuenta_id: '', producto_id: '', cantidad: 1, costo_unitario: 0, comprobante_nro: ''
  });

  // Cuentas State
  const [modalNuevaCuenta, setModalNuevaCuenta] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({
    nombre: '', tipo: 'banco', numero_cuenta: '', saldo_actual: 0
  });
  const [movimientosCuenta, setMovimientosCuenta] = useState<any[]>([]);
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string | null>(null);

  // Analytics State
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null);
  const [rendimientoTurnos, setRendimientoTurnos] = useState<any>(null);

  // Cargar sesión inicial
  useEffect(() => {
    const raw = localStorage.getItem('user_session');
    if (raw) {
      try {
        const s = JSON.parse(raw);
        setSession(s);
        if (s.cantina_id) {
          setSelectedCantinaId(s.cantina_id);
        }

        // Si es rol despachante o cajero, forzar su vista operativa permitida
        if (s.rol_cantina === 'despachante') {
          setTabActiva('despacho');
        } else if (s.rol_cantina === 'cajero') {
          setTabActiva('pos');
        }

        // Si es administrador, buscar todas las cantinas que administra a lo largo del tiempo
        const emailParam = s.email || s.admin_email;
        if (s.rol_cantina === 'admin' && emailParam) {
          fetch(`${API_URL}/cantina/mis-cantinas?email=${encodeURIComponent(emailParam)}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              if (Array.isArray(data) && data.length > 0) {
                setMisCantinas(data);
                if (!s.cantina_id) {
                  setSelectedCantinaId(data[0].id);
                }
              }
            })
            .catch(() => {});
        }
      } catch {}
    } else {
      // Demo fallback
      const demo = {
        role: 'cantina',
        rol_cantina: 'admin',
        name: 'Coordinador General',
        cantina_slug: 'cantina-central'
      };
      setSession(demo);
    }
  }, []);

  // Cargar lista de colaboradores
  const cargarColaboradores = useCallback(async (cid?: string) => {
    try {
      const targetId = cid || selectedCantinaId || session?.cantina_id || '';
      const query = targetId ? `?cantina_id=${targetId}` : '';
      const res = await fetch(`${API_URL}/cantina/usuarios${query}`);
      if (res.ok) {
        setColaboradores(await res.json());
      }
    } catch (e) {
      console.error("Error cargando colaboradores:", e);
    }
  }, [selectedCantinaId, session?.cantina_id]);

  // Carga integral de datos
  const cargarDatos = useCallback(async () => {
    try {
      const cid = selectedCantinaId || session?.cantina_id || '';
      const query = cid ? `?cantina_id=${cid}` : '';

      // 1. Info cantina
      const cRes = await fetch(`${API_URL}/cantina/info${query}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setCantinaInfo(cData);
      }

      // 2. Cuentas
      const cuRes = await fetch(`${API_URL}/cantina/cuentas${query}`);
      if (cuRes.ok) {
        const cuData = await cuRes.json();
        setCuentas(cuData);
        if (cuData.length > 0 && !cuentaCobroId) {
          const principal = cuData.find((c: any) => c.es_principal) || cuData[0];
          setCuentaCobroId(principal.id);
        }
      }

      // 3. Productos
      const pRes = await fetch(`${API_URL}/cantina/productos?solo_activos=false${cid ? `&cantina_id=${cid}` : ''}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProductos(pData);
        const cats = Array.from(new Set(pData.map((p: any) => p.categoria || 'Otros')));
        setCategorias(cats as string[]);
      }

      // 4. Turno activo
      const tRes = await fetch(`${API_URL}/cantina/turnos/activo${query}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTurnoActivo(tData.activo ? tData.turno : null);
      }

      // 5. Historial turnos
      const thRes = await fetch(`${API_URL}/cantina/turnos${query}`);
      if (thRes.ok) {
        const thData = await thRes.json();
        setTurnosLista(thData);
      }

      // 6. Reportes
      const rRes = await fetch(`${API_URL}/cantina/reportes/resumen-financiero${query}`);
      if (rRes.ok) setResumenFinanciero(await rRes.json());

      const rtRes = await fetch(`${API_URL}/cantina/reportes/rendimiento-turnos${query}`);
      if (rtRes.ok) setRendimientoTurnos(await rtRes.json());

      // 7. Colaboradores
      await cargarColaboradores(cid);

    } catch (e) {
      console.error("Error cargando cantina:", e);
    }
  }, [selectedCantinaId, session?.cantina_id, cuentaCobroId, cargarColaboradores]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Cargar pedidos de despacho con polling continuo si está en la pestaña Despacho o POS
  const cargarDespacho = useCallback(async () => {
    try {
      const cid = selectedCantinaId || session?.cantina_id || '';
      const query = cid ? `?cantina_id=${cid}` : '';
      const res = await fetch(`${API_URL}/cantina/despacho/pedidos${query}`);
      if (res.ok) {
        const data = await res.json();
        setPedidosDespacho(data);
      }
    } catch {}
  }, [selectedCantinaId, session?.cantina_id]);

  useEffect(() => {
    cargarDespacho();
    const interval = setInterval(() => {
      cargarDespacho();
    }, 4000);
    return () => clearInterval(interval);
  }, [cargarDespacho]);

  // Cambiar de cantina activa (para organizadores/administradores con múltiples cantinas)
  const handleCambiarCantina = (newId: string) => {
    setSelectedCantinaId(newId);
    const found = misCantinas.find(c => c.id === newId);
    if (found && session) {
      const updated = {
        ...session,
        cantina_id: newId,
        cantina_slug: found.slug,
        cantina_nombre: found.nombre,
        evento_nombre: found.evento_nombre
      };
      setSession(updated);
      localStorage.setItem('user_session', JSON.stringify(updated));
    }
  };

  // Crear colaborador (cajera, despachante, encargado) con PIN
  const submitNuevoColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaboradorForm.nombre.trim() || !colaboradorForm.pin.trim()) {
      alert("Por favor ingresa el nombre y el PIN numérico.");
      return;
    }
    const cleanPin = colaboradorForm.pin.trim();
    if (!cleanPin.isdigit?.() && (!/^\d+$/.test(cleanPin) || cleanPin.length < 4 || cleanPin.length > 6)) {
      alert("El PIN debe tener entre 4 y 6 dígitos numéricos (ej: 1234).");
      return;
    }

    setGuardandoColaborador(true);
    try {
      const cid = selectedCantinaId || cantinaInfo?.id || session?.cantina_id || '';
      const query = cid ? `?cantina_id=${cid}` : '';
      const res = await fetch(`${API_URL}/cantina/usuarios${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantina_id: cid,
          nombre: colaboradorForm.nombre.trim(),
          email: colaboradorForm.email.trim() || undefined,
          pin: cleanPin,
          rol: colaboradorForm.rol
        })
      });

      if (res.ok) {
        setModalNuevoColaborador(false);
        setColaboradorForm({ nombre: '', email: '', pin: '', rol: 'cajero' });
        await cargarColaboradores(cid);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al registrar colaborador: ${err.detail || 'Error desconocido'}`);
      }
    } catch {
      alert("Error de conexión al dar de alta el colaborador.");
    } finally {
      setGuardandoColaborador(false);
    }
  };

  // Eliminar / dar de baja colaborador
  const handleEliminarColaborador = async (usuarioId: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de dar de baja a "${nombre}"? Su PIN ya no podrá ingresar al mostrador.`)) return;
    try {
      const res = await fetch(`${API_URL}/cantina/usuarios/${usuarioId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await cargarColaboradores();
      } else {
        alert("Error al dar de baja al colaborador.");
      }
    } catch {
      alert("Error de conexión.");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('cantina_session');
    window.location.href = '/cantina/login';
  };

  // ================================================================
  // FUNCIONES POS CAJERA
  // ================================================================
  const agregarAlCarrito = (prod: any) => {
    setCarrito(prev => {
      const idx = prev.findIndex(item => item.producto_id === prod.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].cantidad += 1;
        return updated;
      } else {
        return [...prev, {
          producto_id: prod.id,
          nombre: prod.nombre,
          precio_unitario: prod.precio_venta,
          cantidad: 1,
          categoria: prod.categoria
        }];
      }
    });
  };

  const modificarCantidad = (prodId: string, delta: number) => {
    setCarrito(prev => {
      return prev.map(item => {
        if (item.producto_id === prodId) {
          const nuevaCant = item.cantidad + delta;
          return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) return;
    setCobrando(true);
    try {
      const cid = selectedCantinaId || session?.cantina_id || '';
      const query = cid ? `?cantina_id=${cid}` : '';
      const res = await fetch(`${API_URL}/cantina/pedidos${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turnoActivo?.id || null,
          cliente_nombre: clienteNombre || 'Consumidor Final',
          cuenta_id: cuentaCobroId,
          items: carrito,
          observaciones: notaPedido || undefined,
          creado_por: session?.name || 'Cajera'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUltimoPedidoExitoso(data);
        setCarrito([]);
        setNotaPedido('');
        setClienteNombre('Consumidor Final');
        // Recargar datos y despacho
        cargarDatos();
        cargarDespacho();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al registrar la venta: ${err.detail || 'Error desconocido'}`);
      }
    } catch {
      alert("Error de conexión al procesar venta.");
    } finally {
      setCobrando(false);
    }
  };

  // ================================================================
  // FUNCIONES DESPACHANTE (KDS)
  // ================================================================
  const handleEntregarPedido = async (pedidoId: string) => {
    setDespachandoId(pedidoId);
    try {
      const res = await fetch(`${API_URL}/cantina/despacho/pedidos/${pedidoId}/entregar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          despachado_por: session?.name || 'Despachante'
        })
      });

      if (res.ok) {
        // Remover de la lista local de inmediato para feedback instantáneo
        setPedidosDespacho(prev => prev.filter(p => p.id !== pedidoId));
        cargarDatos(); // Sincronizar stock y finanzas
      } else {
        alert("Error al marcar pedido como entregado.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setDespachandoId(null);
    }
  };

  // ================================================================
  // FUNCIONES DE TURNOS Y CHEQUEO DE INVENTARIO
  // ================================================================
  const abrirModalIniciarTurno = () => {
    // Preparar lista de chequeo con el stock actual del sistema
    const items = productos.map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      stock_sistema: p.stock_actual,
      conteo_fisico: p.stock_actual, // Por defecto igual
      diferencia: 0,
      observaciones: ''
    }));
    setItemsChequeo(items);
    setFondoInicialInput('200000');
    setObsTurno('');
    setModalIniciarTurno(true);
  };

  const abrirModalFinalizarTurno = () => {
    const items = productos.map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      stock_sistema: p.stock_actual,
      conteo_fisico: p.stock_actual,
      diferencia: 0,
      observaciones: ''
    }));
    setItemsChequeo(items);
    setObsTurno('');
    setModalFinalizarTurno(true);
  };

  const actualizarConteoItem = (idx: number, conteoVal: number) => {
    setItemsChequeo(prev => {
      const updated = [...prev];
      const sist = updated[idx].stock_sistema;
      updated[idx].conteo_fisico = conteoVal;
      updated[idx].diferencia = conteoVal - sist;
      return updated;
    });
  };

  const submitIniciarTurno = async () => {
    try {
      // 1. Crear turno programado si no hay
      let tid = turnoActivo?.id;
      if (!tid) {
        const createRes = await fetch(`${API_URL}/cantina/turnos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encargado_nombre: session?.name || 'Encargado de Turno',
            fecha: new Date().toISOString().split('T')[0],
            fondo_inicial_caja: parseFloat(fondoInicialInput) || 0,
            observaciones: obsTurno
          })
        });
        const cData = await createRes.json();
        tid = cData.id;
      }

      // 2. Iniciar turno con chequeo inicial
      const res = await fetch(`${API_URL}/cantina/turnos/${tid}/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fondo_inicial_caja: parseFloat(fondoInicialInput) || 0,
          realizado_por: session?.name || 'Encargado',
          items_chequeo: itemsChequeo,
          observaciones: obsTurno
        })
      });

      if (res.ok) {
        setModalIniciarTurno(false);
        cargarDatos();
        alert("¡Turno iniciado con éxito! Chequeo inicial de stock guardado.");
      }
    } catch {
      alert("Error al iniciar turno.");
    }
  };

  const submitFinalizarTurno = async () => {
    if (!turnoActivo) return;
    try {
      const res = await fetch(`${API_URL}/cantina/turnos/${turnoActivo.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realizado_por: session?.name || 'Encargado',
          items_chequeo: itemsChequeo,
          observaciones: obsTurno
        })
      });

      if (res.ok) {
        const data = await res.json();
        setModalFinalizarTurno(false);
        cargarDatos();
        alert(`Turno finalizado exitosamente.\nTotal ventas: ${data.total_ventas.toLocaleString('es-PY')} Gs.\nBalance neto: ${data.balance_neto.toLocaleString('es-PY')} Gs.`);
      }
    } catch {
      alert("Error al cerrar turno.");
    }
  };

  const verChequeos = async (turnoId: string) => {
    setVerChequeoTurnoId(turnoId);
    try {
      const res = await fetch(`${API_URL}/cantina/turnos/${turnoId}/chequeos`);
      if (res.ok) setChequeosHistorial(await res.json());
    } catch {}
  };

  // ================================================================
  // FUNCIONES DE PRODUCTOS Y COMPRAS DE INSUMOS
  // ================================================================
  const submitNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/cantina/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodForm)
      });
      if (res.ok) {
        setModalNuevoProd(false);
        setProdForm({
          nombre: '', categoria: 'Bebidas', precio_costo: 0, precio_venta: 0,
          stock_actual: 0, stock_minimo: 5, descripcion: '', imagen_url: ''
        });
        cargarDatos();
      }
    } catch {
      alert("Error al guardar producto.");
    }
  };

  const submitCompraGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        turno_id: turnoActivo?.id || null,
        tipo: compraForm.tipo,
        cuenta_id: compraForm.cuenta_id || cuentas[0]?.id,
        monto_total: parseFloat(compraForm.monto_total as any) || 0,
        concepto_proveedor: compraForm.concepto_proveedor,
        comprobante_nro: compraForm.comprobante_nro,
        registrado_por: session?.name || 'Encargado'
      };

      if (compraForm.tipo === 'compra_mercaderia' && compraForm.producto_id) {
        payload.items_comprados = [{
          producto_id: compraForm.producto_id,
          cantidad: parseFloat(compraForm.cantidad as any) || 1,
          costo_unitario: parseFloat(compraForm.costo_unitario as any) || 0
        }];
      }

      const res = await fetch(`${API_URL}/cantina/compras-gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalCompraGasto(false);
        setCompraForm({
          tipo: 'compra_mercaderia', concepto_proveedor: '', monto_total: 0,
          cuenta_id: '', producto_id: '', cantidad: 1, costo_unitario: 0, comprobante_nro: ''
        });
        cargarDatos();
        alert("¡Compra/Gasto registrado con éxito! El stock y saldo de cuenta fueron actualizados.");
      }
    } catch {
      alert("Error al registrar compra o gasto.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* HEADER PRINCIPAL DE CANTINA */}
      <header className="bg-slate-900/90 border-b border-slate-800/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 text-decoration-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white leading-none block">
                  Mi<span className="text-orange-500">Cancha</span>
                </span>
                <span className="text-[10px] font-bold text-orange-400 tracking-wider uppercase block">
                  Cantina & Buffet
                </span>
              </div>
            </Link>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* Cantina activa o Switcher Multi-Cantina */}
            {session?.rol_cantina === 'admin' && misCantinas.length > 1 ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner">
                <Store className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <select
                  value={selectedCantinaId || cantinaInfo?.id || ''}
                  onChange={e => handleCambiarCantina(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  {misCantinas.map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.nombre} {c.evento_nombre ? `(${c.evento_nombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  {cantinaInfo?.nombre || 'Cantina Central'}
                </span>
                {cantinaInfo?.evento_nombre && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold">
                    {cantinaInfo.evento_nombre}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  PYG (Gs.)
                </span>
              </div>
            )}

            {/* Pill de Estado de Concesión */}
            {cantinaInfo?.vigencia && (
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                cantinaInfo.vigencia.vigente
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cantinaInfo.vigencia.vigente ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span>{cantinaInfo.vigencia.vigente ? 'Concesión Vigente' : 'Concesión Inactiva'}</span>
              </div>
            )}
          </div>

          {/* Estado del Turno y Operador */}
          <div className="flex items-center gap-3">
            {turnoActivo ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold hidden md:inline">Turno Abierto:</span>
                <span className="font-medium truncate max-w-[140px]">{turnoActivo.encargado_nombre}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Sin Turno Abierto</span>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200 leading-tight">{session?.name || 'Operador'}</p>
                <p className="text-[10px] text-orange-400 font-semibold uppercase">{session?.rol_cantina || session?.role || 'Cajera'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1.5 border-t border-slate-800/50">
          {session?.rol_cantina !== 'despachante' && (
            <button
              onClick={() => setTabActiva('pos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                tabActiva === 'pos'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Punto de Venta (POS)</span>
            </button>
          )}

          <button
            onClick={() => setTabActiva('despacho')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all relative ${
              tabActiva === 'despacho'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Pantalla Despacho (KDS)</span>
            {pedidosDespacho.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                {pedidosDespacho.length}
              </span>
            )}
          </button>

          {session?.rol_cantina !== 'despachante' && (
            <button
              onClick={() => setTabActiva('turnos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                tabActiva === 'turnos'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Turnos & Arqueos</span>
            </button>
          )}

          {session?.rol_cantina === 'admin' && (
            <>
              <button
                onClick={() => setTabActiva('inventario')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  tabActiva === 'inventario'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Inventario & Compras</span>
              </button>

              <button
                onClick={() => setTabActiva('cuentas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  tabActiva === 'cuentas'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Cuentas & Tesorería</span>
              </button>

              <button
                onClick={() => setTabActiva('qr')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  tabActiva === 'qr'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Código QR & Menú</span>
              </button>

              <button
                onClick={() => setTabActiva('analytics')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  tabActiva === 'analytics'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Rendimiento por Turno</span>
              </button>

              <button
                onClick={() => setTabActiva('equipo')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  tabActiva === 'equipo'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Equipo & Colaboradores</span>
                {colaboradores.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black flex items-center justify-center border border-blue-400/40">
                    {colaboradores.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Alerta de Vigencia Temporal (si está inactiva o expirada) */}
      {cantinaInfo?.vigencia && !cantinaInfo.vigencia.vigente && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span><b>Aviso de Concesión:</b> {cantinaInfo.vigencia.motivo || 'Cantina no habilitada actualmente.'} Las ventas en mostrador están bloqueadas.</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL POR PESTAÑA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ================================================================ */}
        {/* PESTAÑA 1: PUNTO DE VENTA (POS CAJERA) */}
        {/* ================================================================ */}
        {tabActiva === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LADO IZQUIERDO: CATÁLOGO TÁCTIL RÁPIDO */}
            <div className="lg:col-span-8 space-y-4">
              {/* Barra de Búsqueda y Filtros de Categoría */}
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={busquedaPos}
                    onChange={e => setBusquedaPos(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
                  <button
                    onClick={() => setCategoriaPos('Todos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      categoriaPos === 'Todos' ? 'bg-orange-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  {categorias.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategoriaPos(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        categoriaPos === c ? 'bg-orange-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Productos táctiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {productos
                  .filter(p => p.activo)
                  .filter(p => categoriaPos === 'Todos' || p.categoria === categoriaPos)
                  .filter(p => !busquedaPos || p.nombre.toLowerCase().includes(busquedaPos.toLowerCase()))
                  .map(prod => (
                    <button
                      key={prod.id}
                      onClick={() => agregarAlCarrito(prod)}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-orange-500 hover:bg-slate-850 text-left transition-all active:scale-95 flex flex-col justify-between min-h-[120px] relative group"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase tracking-wider block w-fit mb-1">
                          {prod.categoria}
                        </span>
                        <h4 className="font-bold text-sm text-slate-100 line-clamp-2 leading-tight">
                          {prod.nombre}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-end justify-between w-full">
                        <div>
                          <p className="text-xs text-slate-500">Stock: {prod.stock_actual}</p>
                          <p className="text-sm font-black text-orange-400">
                            {prod.precio_venta.toLocaleString('es-PY')} Gs.
                          </p>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-orange-500/15 group-hover:bg-orange-500 group-hover:text-white text-orange-400 flex items-center justify-center transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* LADO DERECHO: TICKET Y COBRANZA */}
            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 shadow-xl flex flex-col h-full sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-base text-white">Comanda Actual</h3>
                </div>
                {carrito.length > 0 && (
                  <button 
                    onClick={() => setCarrito([])}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpiar
                  </button>
                )}
              </div>

              {/* Items del Carrito */}
              <div className="flex-1 overflow-y-auto max-h-72 py-3 space-y-2">
                {carrito.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">Tocá los productos para agregar al pedido</p>
                  </div>
                ) : (
                  carrito.map(item => (
                    <div key={item.producto_id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-slate-200">{item.nombre}</p>
                        <p className="text-slate-400 text-[11px]">{item.precio_unitario.toLocaleString('es-PY')} Gs. c/u</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => modificarCantidad(item.producto_id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center hover:bg-slate-700"
                        >
                          -
                        </button>
                        <span className="font-bold text-sm w-4 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => modificarCantidad(item.producto_id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center hover:bg-slate-700"
                        >
                          +
                        </button>
                        <span className="font-bold text-orange-400 ml-2 min-w-[55px] text-right">
                          {(item.cantidad * item.precio_unitario).toLocaleString('es-PY')} Gs.
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Parámetros de cobro */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Cuenta / Medio de Pago
                  </label>
                  <select
                    value={cuentaCobroId}
                    onChange={e => setCuentaCobroId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    {cuentas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} (Saldo: {c.saldo_actual.toLocaleString('es-PY')} Gs.)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Cliente</label>
                    <input
                      type="text"
                      placeholder="Ej: Mamá de Mateo"
                      value={clienteNombre}
                      onChange={e => setClienteNombre(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Nota Cocina</label>
                    <input
                      type="text"
                      placeholder="Ej: sin cebolla"
                      value={notaPedido}
                      onChange={e => setNotaPedido(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">TOTAL A COBRAR:</span>
                  <span className="text-xl font-black text-orange-400">
                    {totalCarrito.toLocaleString('es-PY')} Gs.
                  </span>
                </div>

                {cantinaInfo?.vigencia && !cantinaInfo.vigencia.vigente && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Concesión temporal no vigente. Cobros suspendidos para este evento.</span>
                  </div>
                )}

                <button
                  onClick={handleConfirmarVenta}
                  disabled={carrito.length === 0 || cobrando || (cantinaInfo?.vigencia && !cantinaInfo.vigencia.vigente)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {cobrando ? (
                    <span>Registrando venta...</span>
                  ) : cantinaInfo?.vigencia && !cantinaInfo.vigencia.vigente ? (
                    <span>VENTAS DESHABILITADAS (INACTIVA)</span>
                  ) : (
                    <>
                      <span>CONFIRMAR Y COBRAR</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Modal de Pedido Exitoso */}
              {ultimoPedidoExitoso && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-orange-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 block mb-1">
                      ¡Venta Confirmada!
                    </span>
                    <h2 className="text-3xl font-black text-white">
                      COMANDA #{ultimoPedidoExitoso.numero_pedido}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Total: {ultimoPedidoExitoso.monto_total.toLocaleString('es-PY')} Gs. | Enviado al despachante
                    </p>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 mb-5 text-left">
                      <p>✅ <b>Estado Pago:</b> Pagado</p>
                      <p>⏳ <b>Estado Despacho:</b> En cola de entrega</p>
                      <p className="text-slate-400 mt-1 text-[10px]">
                        *El stock se descontará automáticamente cuando el despachante presione "Entregar".
                      </p>
                    </div>

                    <button
                      onClick={() => setUltimoPedidoExitoso(null)}
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-600/30"
                    >
                      Tomar Siguiente Pedido
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 2: PANTALLA DE DESPACHO (KDS EN VIVO) */}
        {/* ================================================================ */}
        {tabActiva === 'despacho' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Pantalla de Despacho & Cocina</h2>
                  <p className="text-xs text-slate-400">
                    Actualización en vivo cada 4 segundos. Al presionar "Entregar Pedido", se descuenta el stock automáticamente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>En vivo ({pedidosDespacho.length} pendientes)</span>
                </div>
                <button
                  onClick={cargarDespacho}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  Refrescar ahora
                </button>
              </div>
            </div>

            {/* Grid de Comandas para el Despachante */}
            {pedidosDespacho.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/40 border border-slate-800/60 rounded-3xl">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-white">¡No hay pedidos pendientes de entrega!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Todos los pedidos cobrados ya fueron despachados. Las nuevas ventas aparecerán aquí en segundos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {pedidosDespacho.map(pedido => (
                  <div
                    key={pedido.id}
                    className="p-5 rounded-3xl bg-slate-900/95 border-2 border-amber-500/40 shadow-xl shadow-amber-500/5 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {pedido.cliente_nombre || 'Cliente'}
                        </span>
                        <h3 className="text-2xl font-black text-white mt-1">
                          COMANDA #{pedido.numero_pedido}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-400 block">
                          {new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-amber-400 font-semibold">Listo para armar</span>
                      </div>
                    </div>

                    {/* Detalle de productos */}
                    <div className="my-3 space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                      {pedido.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-black text-xs flex items-center justify-center">
                              {it.cantidad}x
                            </span>
                            {it.nombre}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase">{it.categoria}</span>
                        </div>
                      ))}

                      {pedido.observaciones && (
                        <div className="pt-2 mt-2 border-t border-slate-800/80 text-xs text-amber-300 italic">
                          📝 Nota: {pedido.observaciones}
                        </div>
                      )}
                    </div>

                    {/* Botón táctil grande de Entrega */}
                    <button
                      onClick={() => handleEntregarPedido(pedido.id)}
                      disabled={despachandoId === pedido.id}
                      className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {despachandoId === pedido.id ? (
                        <span>Entregando y descontando stock...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>ENTREGAR PEDIDO</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 3: TURNOS & CHEQUEO DE INVENTARIO */}
        {/* ================================================================ */}
        {tabActiva === 'turnos' && (
          <div className="space-y-6">
            {/* Banner de Turno Activo y Acciones */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Gestión de Turnos y Encargados
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">
                  {turnoActivo ? `Turno en Curso: ${turnoActivo.encargado_nombre}` : 'Sin Turno Activo Actualmente'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Al iniciar el turno se realiza el chequeo inicial de inventario y fondo de caja. Al finalizar, el chequeo de cierre y arqueo financiero.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {turnoActivo ? (
                  <button
                    onClick={abrirModalFinalizarTurno}
                    className="w-full md:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Finalizar Turno & Chequeo Cierre</span>
                  </button>
                ) : (
                  <button
                    onClick={abrirModalIniciarTurno}
                    className="w-full md:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Iniciar Turno & Chequeo Inicial</span>
                  </button>
                )}
              </div>
            </div>

            {/* Listado de Turnos Históricos */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Historial de Turnos y Responsables</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Encargado</th>
                      <th className="py-3 px-4">Horario</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Ventas Turno</th>
                      <th className="py-3 px-4 text-right">Gastos</th>
                      <th className="py-3 px-4 text-center">Arqueos Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {turnosLista.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{t.fecha}</td>
                        <td className="py-3 px-4 font-medium">{t.encargado_nombre}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {t.hora_inicio_prog || '08:00'} - {t.hora_fin_prog || '13:00'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            t.estado === 'en_curso'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : t.estado === 'finalizado'
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-orange-400">
                          {t.total_ventas.toLocaleString('es-PY')} Gs.
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400">
                          {t.total_gastos.toLocaleString('es-PY')} Gs.
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => verChequeos(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                          >
                            Ver Chequeo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de Chequeo de Inventario (Inicio o Fin) */}
            {(modalIniciarTurno || modalFinalizarTurno) && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl my-8">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {modalIniciarTurno ? 'Chequeo Inicial de Inventario (Apertura)' : 'Chequeo Final de Inventario (Cierre)'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {modalIniciarTurno 
                          ? 'Verificá el stock físico de cada producto para iniciar el turno con precisión.'
                          : 'Contá el stock remanente para registrar mermas y cuadrar la caja.'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setModalIniciarTurno(false); setModalFinalizarTurno(false); }}
                      className="text-slate-500 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {modalIniciarTurno && (
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Fondo Inicial de Caja Efectivo (Gs.)
                      </label>
                      <input
                        type="number"
                        value={fondoInicialInput}
                        onChange={e => setFondoInicialInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-orange-500"
                        placeholder="Ej: 200000"
                      />
                    </div>
                  )}

                  <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-2xl mb-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 sticky top-0 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Producto</th>
                          <th className="py-2.5 px-3 text-center">Stock Sistema</th>
                          <th className="py-2.5 px-3 text-center">Conteo Físico</th>
                          <th className="py-2.5 px-3 text-center">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {itemsChequeo.map((it, idx) => (
                          <tr key={it.producto_id}>
                            <td className="py-2 px-3 font-semibold text-white">{it.nombre}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{it.stock_sistema}</td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={it.conteo_fisico}
                                onChange={e => actualizarConteoItem(idx, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`font-bold ${it.diferencia === 0 ? 'text-slate-500' : it.diferencia < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {it.diferencia > 0 ? `+${it.diferencia}` : it.diferencia}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Observaciones</label>
                    <textarea
                      rows={2}
                      value={obsTurno}
                      onChange={e => setObsTurno(e.target.value)}
                      placeholder="Novedades, mermas de mercadería o comentarios del turno..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-orange-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => { setModalIniciarTurno(false); setModalFinalizarTurno(false); }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={modalIniciarTurno ? submitIniciarTurno : submitFinalizarTurno}
                      className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg ${
                        modalIniciarTurno ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                      }`}
                    >
                      {modalIniciarTurno ? 'Confirmar e Iniciar Turno' : 'Confirmar Cierre de Turno'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para ver chequeos históricos de un turno */}
            {verChequeoTurnoId && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <h3 className="text-base font-bold text-white">Chequeos Registrados de este Turno</h3>
                    <button onClick={() => setVerChequeoTurnoId(null)} className="text-slate-500 hover:text-white">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {chequeosHistorial.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No hay registros de arqueo para este turno.</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {chequeosHistorial.map(chk => (
                        <div key={chk.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-orange-400 uppercase">
                              Arqueo de {chk.tipo === 'inicio' ? 'Apertura' : 'Cierre'}
                            </span>
                            <span className="text-slate-500 text-[11px]">{chk.fecha_hora}</span>
                          </div>
                          <p className="text-slate-300 mb-2"><b>Realizado por:</b> {chk.realizado_por}</p>
                          {chk.observaciones && <p className="text-slate-400 italic mb-2">"{chk.observaciones}"</p>}
                          
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                            <p className="font-bold text-[10px] text-slate-400 uppercase mb-1">Detalle de Conteo:</p>
                            {chk.items_detalle?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between py-0.5 text-[11px]">
                                <span>{it.nombre}</span>
                                <span className="font-mono">Físico: {it.conteo_fisico} | Sist: {it.stock_sistema}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 4: INVENTARIO & COMPRAS DE INSUMOS */}
        {/* ================================================================ */}
        {tabActiva === 'inventario' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-lg font-black text-white">Inventario & Catálogo de Cantina</h2>
                <p className="text-xs text-slate-400">
                  Controlá el stock disponible, costos y registrá compras de mercadería que aumentan el stock automáticamente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalCompraGasto(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Registrar Compra / Gasto</span>
                </button>
                <button
                  onClick={() => setModalNuevoProd(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Producto</span>
                </button>
              </div>
            </div>

            {/* Tabla de Productos */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-right">Precio Costo</th>
                      <th className="py-3 px-4 text-right">Precio Venta</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Estado Stock</th>
                      <th className="py-3 px-4 text-center">Menú QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {productos.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{p.nombre}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                            {p.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-mono">
                          {p.precio_costo.toLocaleString('es-PY')} Gs.
                        </td>
                        <td className="py-3 px-4 text-right font-black text-orange-400 font-mono">
                          {p.precio_venta.toLocaleString('es-PY')} Gs.
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-base text-white">
                          {p.stock_actual}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.stock_bajo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> Bajo Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Óptimo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.disponible_menu_qr ? (
                            <span className="text-emerald-400 text-xs">Visible</span>
                          ) : (
                            <span className="text-slate-500 text-xs">Oculto</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Nuevo Producto */}
            {modalNuevoProd && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form onSubmit={submitNuevoProducto} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-base font-bold text-white">Nuevo Producto para la Cantina</h3>
                    <button type="button" onClick={() => setModalNuevoProd(false)} className="text-slate-500 hover:text-white">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Empanada de Pollo"
                      value={prodForm.nombre}
                      onChange={e => setProdForm({ ...prodForm, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                      <select
                        value={prodForm.categoria}
                        onChange={e => setProdForm({ ...prodForm, categoria: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="Bebidas">Bebidas</option>
                        <option value="Comidas">Comidas</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Golosinas">Golosinas</option>
                        <option value="Helados">Helados</option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Stock Inicial</label>
                      <input
                        type="number"
                        value={prodForm.stock_actual}
                        onChange={e => setProdForm({ ...prodForm, stock_actual: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Precio Costo (Gs.)</label>
                      <input
                        type="number"
                        value={prodForm.precio_costo}
                        onChange={e => setProdForm({ ...prodForm, precio_costo: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Precio Venta (Gs.)</label>
                      <input
                        type="number"
                        required
                        value={prodForm.precio_venta}
                        onChange={e => setProdForm({ ...prodForm, precio_venta: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalNuevoProd(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      Guardar Producto
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Compras y Gastos */}
            {modalCompraGasto && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <form onSubmit={submitCompraGasto} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-bold text-white">Registrar Compra o Gasto</h3>
                      <p className="text-xs text-slate-400">Mininegocio de padres & reposiciones</p>
                    </div>
                    <button type="button" onClick={() => setModalCompraGasto(false)} className="text-slate-500 hover:text-white">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Operación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCompraForm({ ...compraForm, tipo: 'compra_mercaderia' })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          compraForm.tipo === 'compra_mercaderia'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        📦 Compra Mercadería (Suma Stock)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompraForm({ ...compraForm, tipo: 'gasto_operativo' })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          compraForm.tipo === 'gasto_operativo'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        🧾 Gasto Insumos (Hielo, Servilletas)
                      </button>
                    </div>
                  </div>

                  {compraForm.tipo === 'compra_mercaderia' && (
                    <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Producto a reponer</label>
                        <select
                          value={compraForm.producto_id}
                          onChange={e => setCompraForm({ ...compraForm, producto_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="">Seleccionar producto...</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} (Stock actual: {p.stock_actual})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Cantidad comprada</label>
                          <input
                            type="number"
                            value={compraForm.cantidad}
                            onChange={e => {
                              const cant = parseFloat(e.target.value) || 0;
                              const costo = compraForm.costo_unitario;
                              setCompraForm({ ...compraForm, cantidad: cant, monto_total: cant * costo });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">Costo Unitario (Gs.)</label>
                          <input
                            type="number"
                            value={compraForm.costo_unitario}
                            onChange={e => {
                              const costo = parseFloat(e.target.value) || 0;
                              const cant = compraForm.cantidad;
                              setCompraForm({ ...compraForm, costo_unitario: costo, monto_total: cant * costo });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Proveedor / Concepto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Distribuidora San Roque / Compra de 5 bolsas de hielo"
                      value={compraForm.concepto_proveedor}
                      onChange={e => setCompraForm({ ...compraForm, concepto_proveedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Cuenta Pagadora</label>
                      <select
                        value={compraForm.cuenta_id}
                        onChange={e => setCompraForm({ ...compraForm, cuenta_id: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {cuentas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Monto Total (Gs.)</label>
                      <input
                        type="number"
                        required
                        value={compraForm.monto_total}
                        onChange={e => setCompraForm({ ...compraForm, monto_total: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-orange-400 font-black"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalCompraGasto(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      Registrar Egreso y Actualizar Stock
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 5: CUENTAS & TESORERÍA */}
        {/* ================================================================ */}
        {tabActiva === 'cuentas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-lg font-black text-white">Multi-Cuentas & Tesorería</h2>
                <p className="text-xs text-slate-400">
                  Administrá Caja Efectivo, Banco 1, Banco 2 y Billeteras digitales con saldos y trazabilidad de movimientos.
                </p>
              </div>
            </div>

            {/* Tarjetas de Cuentas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.map(c => (
                <div
                  key={c.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Landmark className="w-5 h-5" />
                    </div>
                    {c.es_principal && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Principal
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white">{c.nombre}</h3>
                    <p className="text-xs text-slate-400">
                      {c.tipo.toUpperCase()} {c.numero_cuenta ? `• ${c.numero_cuenta}` : ''}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Saldo Disponible:</span>
                    <span className="text-xl font-black text-white">
                      {c.saldo_actual.toLocaleString('es-PY')} Gs.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 6: CÓDIGO QR & MENÚ DIGITAL PÚBLICO */}
        {/* ================================================================ */}
        {tabActiva === 'qr' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
                <QrCode className="w-4 h-4" /> Código QR Oficial de la Cantina
              </span>
              <h2 className="text-2xl font-black text-white">
                Carta Digital para Mostrador
              </h2>
              <p className="text-xs text-slate-400 mt-1 mb-6 max-w-md mx-auto">
                Los clientes y padres pueden escanear este código con la cámara de su celular para consultar la lista de productos y precios en tiempo real.
              </p>

              {/* Imagen del Código QR */}
              <div className="p-6 bg-white rounded-3xl w-64 h-64 mx-auto shadow-2xl flex items-center justify-center mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    typeof window !== 'undefined' ? `${window.location.origin}/cantina/menu/${cantinaInfo?.slug || 'cantina-central'}` : 'https://micancha.com.py'
                  )}`}
                  alt="QR Menu Cantina"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto mb-6">
                <p className="font-bold text-white mb-0.5">Enlace web público:</p>
                <p className="text-indigo-400 font-mono text-[11px] truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/cantina/menu/${cantinaInfo?.slug || 'cantina-central'}` : '/cantina/menu/cantina-central'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`/cantina/menu/${cantinaInfo?.slug || 'cantina-central'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Carta Digital</span>
                </a>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Cartel QR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 7: RENDIMIENTO & ANALYTICS */}
        {/* ================================================================ */}
        {tabActiva === 'analytics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Ventas Cobradas
                </span>
                <span className="text-2xl font-black text-emerald-400 block">
                  {resumenFinanciero?.total_ingresos?.toLocaleString('es-PY') || 0} Gs.
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {resumenFinanciero?.cant_pedidos || 0} pedidos atendidos
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Compras & Gastos
                </span>
                <span className="text-2xl font-black text-rose-400 block">
                  {resumenFinanciero?.total_gastos?.toLocaleString('es-PY') || 0} Gs.
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {resumenFinanciero?.cant_gastos || 0} compras de insumos
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Ganancia Neta
                </span>
                <span className={`text-2xl font-black block ${
                  (resumenFinanciero?.ganancia_neta || 0) >= 0 ? 'text-orange-400' : 'text-rose-400'
                }`}>
                  {resumenFinanciero?.ganancia_neta?.toLocaleString('es-PY') || 0} Gs.
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Resultado operativo neto
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Ticket Promedio
                </span>
                <span className="text-2xl font-black text-sky-400 block">
                  {resumenFinanciero?.ticket_promedio?.toLocaleString('es-PY') || 0} Gs.
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Por comanda de cantina
                </span>
              </div>
            </div>

            {/* GRÁFICO RECHARTS: RENDIMIENTO POR TURNOS (INGRESOS / CANTIDAD DE HORAS) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Rendimiento por Turno: Ingresos / Cantidad de Horas Trabajadas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mide la productividad y recaudación media por hora de cada turno de la cantina.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                  <span className="text-xs text-slate-400">Ingreso por Hora (Gs./h)</span>
                </div>
              </div>

              <div className="h-72 w-full">
                {rendimientoTurnos?.turnos && rendimientoTurnos.turnos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rendimientoTurnos.turnos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="etiqueta" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        formatter={(val: any) => [`${val?.toLocaleString('es-PY')} Gs./hora`, 'Rendimiento']}
                      />
                      <Bar dataKey="ingreso_por_hora" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No hay suficientes turnos con registros para graficar.
                  </div>
                )}
              </div>
            </div>

            {/* TOP PRODUCTOS MÁS VENDIDOS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Top 5 Productos Más Vendidos</h3>
              <div className="space-y-3">
                {rendimientoTurnos?.top_productos?.map((tp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-xl bg-orange-500/20 text-orange-400 font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-white">{tp.nombre}</p>
                        <p className="text-slate-500 text-[11px]">{tp.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-orange-400">{tp.unidades} unidades</p>
                      <p className="text-slate-400 text-[11px]">{tp.total_gs?.toLocaleString('es-PY')} Gs.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PESTAÑA 8: EQUIPO & COLABORADORES (SOLO ADMIN DE CANTINA) */}
        {/* ================================================================ */}
        {tabActiva === 'equipo' && session?.rol_cantina === 'admin' && (
          <div className="space-y-6">
            {/* Header de la sección */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg font-black text-white">Equipo & Personal de Mostrador</h2>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Cada cajero y despachante ingresa al mostrador con su PIN de 4 dígitos asignado por vos. No requieren cuentas complejas, ideal para rotación ágil durante el evento.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Cantina actual:</span>
                  <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    {cantinaInfo?.nombre} {cantinaInfo?.evento_nombre ? `• ${cantinaInfo.evento_nombre}` : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setModalNuevoColaborador(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Colaborador</span>
              </button>
            </div>

            {/* Tarjetas KPI de resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Equipo</span>
                <p className="text-2xl font-black text-white mt-1">{colaboradores.length}</p>
                <span className="text-[10px] text-slate-500 mt-1">Colaboradores activos</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">💳 Cajeros</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {colaboradores.filter(c => c.rol === 'cajero' || c.rol === 'cajera').length}
                </p>
                <span className="text-[10px] text-slate-500 mt-1">Acceso a POS y cobro</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">📦 Despachantes</span>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {colaboradores.filter(c => c.rol === 'despachante').length}
                </p>
                <span className="text-[10px] text-slate-500 mt-1">Pantalla KDS de cocina</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">👔 Encargados</span>
                <p className="text-2xl font-black text-purple-400 mt-1">
                  {colaboradores.filter(c => c.rol === 'encargado' || c.rol === 'admin').length}
                </p>
                <span className="text-[10px] text-slate-500 mt-1">Arqueo y turnos</span>
              </div>
            </div>

            {/* Listado de Colaboradores */}
            {colaboradores.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Aún no hay colaboradores dados de alta</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Crea los perfiles de tus cajeros y despachantes asignándoles un PIN de 4 dígitos para que puedan operar en las tabletas de mostrador.
                </p>
                <button
                  onClick={() => setModalNuevoColaborador(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dar de Alta Primer Colaborador</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {colaboradores.map((colab: any) => {
                  const rolLabel = colab.rol === 'cajero' || colab.rol === 'cajera' ? '💳 Cajero / POS'
                    : colab.rol === 'despachante' ? '📦 Despachante / KDS'
                    : colab.rol === 'encargado' ? '👔 Encargado de Turno'
                    : '👑 Administrador';

                  const rolBadgeClass = colab.rol === 'cajero' || colab.rol === 'cajera'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : colab.rol === 'despachante'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30';

                  const pinVisible = mostrarPins[colab.id];

                  return (
                    <div
                      key={colab.id}
                      className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group relative"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-bold text-sm">
                              {colab.nombre?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white leading-tight">{colab.nombre}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">{colab.email || 'Sin email registrado'}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleEliminarColaborador(colab.id, colab.nombre)}
                            title="Dar de baja colaborador"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mb-4">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${rolBadgeClass}`}>
                            {rolLabel}
                          </span>
                        </div>
                      </div>

                      {/* PIN Box */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block">PIN de Mostrador</span>
                          <span className="font-mono text-sm font-black text-orange-400 tracking-wider">
                            {pinVisible ? colab.pin : '••••'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setMostrarPins(prev => ({ ...prev, [colab.id]: !prev[colab.id] }))}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {pinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{pinVisible ? 'Ocultar' : 'Ver PIN'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal: Nuevo Colaborador */}
            {modalNuevoColaborador && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">Nuevo Colaborador</h3>
                        <p className="text-xs text-slate-400">Asigna nombre y PIN para tabletas de mostrador</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setModalNuevoColaborador(false)}
                      className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={submitNuevoColaborador} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: María Gómez, Lucas Silva..."
                        value={colaboradorForm.nombre}
                        onChange={e => setColaboradorForm({ ...colaboradorForm, nombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Rol Operativo *</label>
                      <select
                        value={colaboradorForm.rol}
                        onChange={e => setColaboradorForm({ ...colaboradorForm, rol: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="cajero">💳 Cajero / POS (Toma pedidos y cobra en mostrador)</option>
                        <option value="despachante">📦 Despachante / Cocina (Visualiza KDS y entrega)</option>
                        <option value="encargado">👔 Encargado de Turno (Apertura/Cierre de turnos y arqueos)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        PIN de Mostrador (4 a 6 dígitos numéricos) *
                      </label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Ej: 1234"
                          value={colaboradorForm.pin}
                          onChange={e => setColaboradorForm({ ...colaboradorForm, pin: e.target.value.replace(/\D/g, '') })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-orange-400 font-mono font-bold tracking-widest focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Este código será ingresado en la pantalla de inicio de sesión de la tableta de la cantina.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Email de Contacto (opcional)</label>
                      <input
                        type="email"
                        placeholder="colaborador@email.com"
                        value={colaboradorForm.email}
                        onChange={e => setColaboradorForm({ ...colaboradorForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModalNuevoColaborador(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardandoColaborador}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {guardandoColaborador ? 'Guardando...' : 'Dar de Alta Colaborador'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
