/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield, User, Lock, Settings, FileText, CheckCircle,
  Trash2, LogOut, RefreshCw, Layers, Plus, Power, MapPin,
  Mail, Phone, Clock, AlertTriangle
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Robust UUID fallback generator for insecure context (HTTP / non-localhost)
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Standard seeds
const MOCK_COMPLEJOS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Complejo Deportivo Mburicao',
    email: 'mburicao@micancha.com.py',
    telefono: '0981-123-456',
    direccion: 'Av. Mcal. López c/ Perú',
    ciudad: 'Asunción',
    activo: true,
    usuario_asignado: 'mburicao.manager@gmail.com',
    lat: -25.2867,
    lng: -57.647,
    horario_apertura: '07:00',
    horario_cierre: '23:00',
    apertura_extraordinaria: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'La Quinta Sports',
    email: 'laquinta@micancha.com.py',
    telefono: '0971-888-999',
    direccion: 'Mcal. Estigarribia e/ Pratt Gill',
    ciudad: 'Luque',
    activo: true,
    usuario_asignado: 'admin_laquinta@gmail.com',
    lat: -25.268,
    lng: -57.485,
    horario_apertura: '08:00',
    horario_cierre: '00:00',
    apertura_extraordinaria: false,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nombre: 'Padel Cristal Asunción',
    email: 'cristalpadel@micancha.com.py',
    telefono: '0983-555-111',
    direccion: 'España y Brasilia',
    ciudad: 'Asunción',
    activo: false,
    usuario_asignado: 'nuevo.club@gmail.com',
    lat: -25.295,
    lng: -57.620,
    horario_apertura: '06:00',
    horario_cierre: '23:00',
    apertura_extraordinaria: true,
  }
];

const MOCK_CANCHAS = [
  { id: 'c1', complejo_id: '11111111-1111-1111-1111-111111111111', nombre: 'Cancha 1 (Fútbol 5)', deporte: 'Fútbol 5', superficie: 'Sintético', precio_hora: 120000, precio_hora_nocturna: 150000 },
  { id: 'c2', complejo_id: '11111111-1111-1111-1111-111111111111', nombre: 'Cancha Cristal A', deporte: 'Pádel', superficie: 'Vidrio/Cristal', precio_hora: 100000, precio_hora_nocturna: 130000 },
  { id: 'c3', complejo_id: '22222222-2222-2222-2222-222222222222', nombre: 'Cancha Principal (Fútbol 7)', deporte: 'Fútbol 7', superficie: 'Césped Natural', precio_hora: 180000, precio_hora_nocturna: 220000 },
  { id: 'c4', complejo_id: '22222222-2222-2222-2222-222222222222', nombre: 'Cancha Tenis Arcilla', deporte: 'Tenis', superficie: 'Arcilla', precio_hora: 90000, precio_hora_nocturna: 120000 },
];

const DEPORTES_CATALOGO = ['Fútbol 5', 'Fútbol 7', 'Pádel', 'Tenis', 'Básquet', 'Vóley'];

export default function AdminConsole() {
  // Session states
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Data states
  const [complejos, setComplejos] = useState<any[]>(MOCK_COMPLEJOS);
  const [canchas, setCanchas] = useState<any[]>(MOCK_CANCHAS);
  const [deportes, setDeportes] = useState<string[]>(DEPORTES_CATALOGO);
  const [organizadores, setOrganizadores] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Tabs states
  const [activeSuperTab, setActiveSuperTab] = useState<'tenants' | 'sports' | 'requests' | 'audit'>('tenants');

  // Request approvals state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Audit Logs states
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Active Tenant state for Local Deportivo
  const [selectedComplejoId, setSelectedComplejoId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const selectedComplejo = useMemo(() => {
    return complejos.find(c => c.id === selectedComplejoId) || complejos[0];
  }, [complejos, selectedComplejoId]);

  // Forms states
  const [editComplejo, setEditComplejo] = useState<any | null>(null);
  const [editOrganizador, setEditOrganizador] = useState<any | null>(null);
  const [newSport, setNewSport] = useState('');
  const [newCancha, setNewCancha] = useState<any>({ nombre: '', deporte: 'Fútbol 5', superficie: 'Sintético', precio_hora: 120000, precio_hora_nocturna: 150000 });
  const [toasts, setToasts] = useState<string[]>([]);

  const addToast = (msg: string) => {
    setToasts(prev => [...prev, msg]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t !== msg));
    }, 4500);
  };

  // Helper to add audit logs dynamically
  const logEvent = (type: 'acceso' | 'auditoria', details: any) => {
    if (typeof window === 'undefined') return;
    const key = type === 'acceso' ? 'logs_acceso' : 'logs_auditoria';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newLog = {
      id: generateUUID(),
      fecha: new Date().toLocaleString('es-PY'),
      usuario: session?.email || 'admin@micancha.com.py',
      rol: session?.role === 'super' ? 'Administrador' : 'Local Deportivo',
      ...details
    };
    const updated = [newLog, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));

    // reload states
    if (type === 'acceso') setAccessLogs(updated);
    else setAuditLogs(updated);
  };

  // Load Session and LocalStorage states
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Session
    const activeSession = localStorage.getItem('user_session');
    if (activeSession) {
      const parsed = JSON.parse(activeSession);
      setSession(parsed);

      // If user is a complex manager, focus on their assigned complex
      if (parsed.role === 'tenant' && parsed.assignedComplejoId) {
        setSelectedComplejoId(parsed.assignedComplejoId);
      }
    }
    setLoadingSession(false);

    // Load Audit Logs
    setAccessLogs(JSON.parse(localStorage.getItem('logs_acceso') || '[]'));
    setAuditLogs(JSON.parse(localStorage.getItem('logs_auditoria') || '[]'));

    // Load Pending Requests
    setPendingRequests(JSON.parse(localStorage.getItem('pending_tenants') || '[]'));
  }, []);

  // Sync complexes, organizadores and users with actual DB if active
  useEffect(() => {
    const fetchData = async () => {
      let token = '';
      try {
        const sessionStr = localStorage.getItem('user_session');
        if (sessionStr) {
          const s = JSON.parse(sessionStr);
          token = s.access_token || s.token || '';
        }
      } catch (e) {}

      const fetchOpts = token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined;

      try {
        const res = await fetch(`${API_URL}/cancha/complejos`, fetchOpts);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const merged = data.map((c: any, index: number) => ({
              ...c,
              activo: c.activo ?? true,
              usuario_asignado: c.usuario_asignado ?? `mburicao.manager@gmail.com`,
              lat: c.lat ?? -25.2867 - (index * 0.01),
              lng: c.lng ?? -57.647 + (index * 0.01),
              apertura_extraordinaria: c.apertura_extraordinaria ?? true,
            }));
            setComplejos(merged);
          }
        }
      } catch (_e) { }

      try {
        const resOrg = await fetch(`${API_URL}/cancha/torneos/organizadores`, fetchOpts);
        if (resOrg.ok) {
          const dataOrg = await resOrg.json();
          setOrganizadores(dataOrg);
        }
      } catch (_e) { }

      try {
        const resUsr = await fetch(`${API_URL}/auth/users`, fetchOpts);
        if (resUsr.ok) {
          const dataUsr = await resUsr.json();
          setUsuarios(dataUsr);
        }
      } catch (_e) { }
    };
    fetchData();
  }, []);

  // Secure Administrative Logs Cleanup
  const handleClearLogs = (type: 'acceso' | 'auditoria') => {
    if (confirm(`⚠️ ¿Estás seguro de vaciar el historial de logs de ${type}? Esta acción es irreversible.`)) {
      localStorage.removeItem(type === 'acceso' ? 'logs_acceso' : 'logs_auditoria');
      if (type === 'acceso') setAccessLogs([]);
      else setAuditLogs([]);

      logEvent('auditoria', {
        accion: 'Limpieza de Logs',
        detalles: `El administrador vació completamente el historial de logs de ${type}`
      });
      addToast(`🧼 Historial de logs de ${type} limpiado.`);
    }
  };

  // Google Tenant Registration Request Approval
  const handleApproveTenantRequest = (requestId: string, userEmail: string, userName: string) => {
    // 1. Mark request as approved
    const list = JSON.parse(localStorage.getItem('pending_tenants') || '[]');
    const updatedList = list.map((req: any) => {
      if (req.id === requestId) return { ...req, estado: 'aprobada' };
      return req;
    });
    localStorage.setItem('pending_tenants', JSON.stringify(updatedList));
    setPendingRequests(updatedList);

    // 2. Select complex to assign
    const targetComplejo = complejos[0]; // Auto-assign to primary for demo or let it match

    // Update complexes to reflect the new assigned owner email
    setComplejos(prev => prev.map(c => {
      if (c.id === targetComplejo.id) {
        return { ...c, usuario_asignado: userEmail };
      }
      return c;
    }));

    // 3. Log Audit
    logEvent('auditoria', {
      accion: 'Aprobar Tenant',
      detalles: `Se aprobó el acceso del propietario "${userName}" (${userEmail}) asignándole el complejo "${targetComplejo.nombre}"`
    });

    addToast(`✅ Propietario "${userName}" aprobado y asignado a "${targetComplejo.nombre}".`);
  };

  // Super Admin Actions
  const handleToggleLock = (id: string) => {
    setComplejos(prev => prev.map(c => {
      if (c.id === id) {
        const nextState = !c.activo;
        logEvent('auditoria', {
          accion: nextState ? 'Activar Tenant' : 'Bloquear Tenant',
          detalles: `Se modificó el estado del complejo "${c.nombre}" a ${nextState ? 'ACTIVO' : 'SUSPENDIDO'}`
        });
        addToast(`${nextState ? '🔓 Complejo Activado' : '🔒 Complejo Bloqueado/Suspendido'} con éxito.`);
        return { ...c, activo: nextState };
      }
      return c;
    }));
  };

  const handlePasswordReset = (complejoName: string, adminUser: string) => {
    const randomPass = Math.random().toString(36).substring(2, 10).toUpperCase() + '@2026';
    logEvent('auditoria', {
      accion: 'Restablecer Contraseña',
      detalles: `Se generó una contraseña temporal de acceso para el usuario "${adminUser}" del complejo "${complejoName}"`
    });
    addToast(`🔑 Contraseña temporal para "${adminUser}" (${complejoName}): ${randomPass}`);
  };

  const handleSaveOrganizador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrganizador) return;

    let token = '';
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        const s = JSON.parse(sessionStr);
        token = s.access_token || s.token || '';
      }
    } catch (e) {}
    
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_URL}/cancha/torneos/organizadores`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          usuario_id: Number(editOrganizador.usuario_id),
          nombre: editOrganizador.nombre,
          plan: editOrganizador.plan || 'basico',
          max_torneos: Number(editOrganizador.max_torneos || 3)
        })
      });

      if (res.ok) {
        const fetchOpts = token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined;
        const resOrg = await fetch(`${API_URL}/cancha/torneos/organizadores`, fetchOpts);
        if (resOrg.ok) {
          setOrganizadores(await resOrg.json());
        }
        addToast(editOrganizador.isNew ? '🎉 Organizador independiente habilitado.' : '✏️ Organizador actualizado.');
        setEditOrganizador(null);
      } else {
        const error = await res.json();
        alert(`Error al guardar organizador: ${error.detail || 'Error desconocido'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
  };

  const handleToggleOrganizador = async (usuario_id: number, currentHabilitado: boolean, nombre: string) => {
    setOrganizadores(prev => prev.map(o => {
      if (o.usuario_id === usuario_id) {
        return { ...o, habilitado: !currentHabilitado };
      }
      return o;
    }));
    logEvent('auditoria', {
      accion: currentHabilitado ? 'Suspender Organizador' : 'Habilitar Organizador',
      detalles: `Se modificó el estado del organizador "${nombre}" a ${!currentHabilitado ? 'ACTIVO' : 'SUSPENDIDO'}`
    });
    addToast(`${!currentHabilitado ? '🔓 Organizador Habilitado' : '🔒 Organizador Suspendido'} con éxito.`);
  };

  const handleSaveComplejo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editComplejo.nombre || !editComplejo.direccion) return;

    if (editComplejo.isNew) {
      const newId = generateUUID();
      const created = {
        ...editComplejo,
        id: newId,
        activo: true,
        isNew: undefined,
      };
      setComplejos(prev => [...prev, created]);
      logEvent('auditoria', {
        accion: 'Crear Complejo',
        detalles: `Se creó el nuevo complejo deportivo "${editComplejo.nombre}" en ${editComplejo.ciudad}`
      });
      addToast(`🏟️ Nuevo Complejo "${editComplejo.nombre}" creado.`);
    } else {
      setComplejos(prev => prev.map(c => c.id === editComplejo.id ? editComplejo : c));
      logEvent('auditoria', {
        accion: 'Editar Complejo',
        detalles: `Se actualizaron los datos generales del complejo "${editComplejo.nombre}"`
      });
      addToast(`💾 Cambios en "${editComplejo.nombre}" guardados.`);
    }
    setEditComplejo(null);
  };

  const handleDeleteComplejo = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el complejo "${name}"?`)) {
      setComplejos(prev => prev.filter(c => c.id !== id));
      logEvent('auditoria', {
        accion: 'Eliminar Complejo',
        detalles: `Se eliminó definitivamente el complejo deportivo "${name}" de la plataforma`
      });
      addToast(`🗑️ Complejo "${name}" eliminado.`);
    }
  };

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSport.trim()) return;
    if (deportes.includes(newSport.trim())) {
      addToast(`⚠️ El deporte "${newSport}" ya existe.`);
      return;
    }
    setDeportes(prev => [...prev, newSport.trim()]);
    logEvent('auditoria', {
      accion: 'Agregar Deporte',
      detalles: `Se agregó el deporte "${newSport.trim()}" al catálogo global de disciplinas`
    });
    addToast(`🏀 Deporte "${newSport.trim()}" agregado.`);
    setNewSport('');
  };

  const handleRemoveSport = (sport: string) => {
    setDeportes(prev => prev.filter(s => s !== sport));
    logEvent('auditoria', {
      accion: 'Eliminar Deporte',
      detalles: `Se retiró el deporte "${sport}" del catálogo global`
    });
    addToast(`🗑️ Deporte "${sport}" eliminado.`);
  };

  // Tenant Owner Actions
  const handleAddCancha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCancha.nombre) return;
    const added = {
      ...newCancha,
      id: generateUUID(),
      complejo_id: selectedComplejoId,
    };
    setCanchas(prev => [...prev, added]);
    logEvent('auditoria', {
      accion: 'Agregar Cancha',
      detalles: `Se añadió la cancha "${newCancha.nombre}" (${newCancha.deporte}) al complejo "${selectedComplejo.nombre}"`
    });
    addToast(`⚽ Cancha "${newCancha.nombre}" agregada.`);
    setNewCancha({ nombre: '', deporte: 'Fútbol 5', superficie: 'Sintético', precio_hora: 120000, precio_hora_nocturna: 150000 });
  };

  const handleRemoveCancha = (id: string, name: string) => {
    setCanchas(prev => prev.filter(c => c.id !== id));
    logEvent('auditoria', {
      accion: 'Quitar Cancha',
      detalles: `Se eliminó la cancha "${name}" del complejo "${selectedComplejo.nombre}"`
    });
    addToast(`🗑️ Cancha "${name}" quitada.`);
  };

  const handleUpdateTenantSettings = (field: string, val: any) => {
    setComplejos(prev => prev.map(c => {
      if (c.id === selectedComplejoId) {
        return { ...c, [field]: val };
      }
      return c;
    }));
    logEvent('auditoria', {
      accion: 'Modificar Parámetros',
      detalles: `Se actualizó el campo "${field}" a "${val}" en el complejo "${selectedComplejo.nombre}"`
    });
  };

  const handleLogout = () => {
    if (session) {
      logEvent('acceso', {
        usuario: session.email,
        rol: session.role === 'super' ? 'Administrador' : 'Local Deportivo',
        accion: 'Cierre de Sesión',
        ip: '192.168.1.1',
        dispositivo: 'Navegador Web'
      });
    }
    localStorage.removeItem('user_session');
    window.location.href = '/login';
  };

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
        <p style={{ fontWeight: 700, color: '#64748b' }}>Cargando sesión segura...</p>
      </div>
    );
  }

  // Block and redirect unauthorized users
  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
        <Nav scrolled={true} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 60px' }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 100, background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Acceso Restringido</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              Esta consola de administración requiere credenciales de seguridad válidas. Por favor ingresá a tu cuenta.
            </p>
            <Link href="/login" style={{ display: 'block', width: '100%', background: '#16a34a', color: 'white', padding: '14px 0', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
              Iniciar Sesión
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (session.role === 'tenant' && session.authorized === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
        <Nav scrolled={true} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 60px' }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '460px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 100, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Solicitud Pendiente</h3>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
              Tu cuenta de propietario **{session.email}** está registrada pero se encuentra **pendiente de autorización** por el Administrador Global.
            </p>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              Una vez aprobado, podrás dar de alta tus canchas, horarios ordinarios y precios especiales.
            </p>
            <button onClick={handleLogout} style={{ border: 'none', width: '100%', background: '#0f172a', color: 'white', padding: '14px 0', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
              Salir y volver
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
      <Nav scrolled={true} />

      <div style={{ flex: 1, padding: '120px 4% 60px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

        {/* HEADER PANEL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={20} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 12, background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 100, fontWeight: 800, textTransform: 'uppercase' }}>
                {session.role === 'super' ? 'Super Administrador Global' : 'Local Deportivo Autorizado'}
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.8px', marginTop: 6 }}>
              {session.role === 'super' ? 'Consola de Control Central' : `Gestión de Complejo: ${selectedComplejo?.nombre}`}
            </h1>
            <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Sesión activa: {session.name} ({session.email})</p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: '#fee2e2',
              color: '#dc2626',
              padding: '10px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#fecaca'}
            onMouseOut={e => e.currentTarget.style.background = '#fee2e2'}
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>

        {/* -------------------- SUPER ADMIN CONSOLE FLOW -------------------- */}
        {session.role === 'super' && (
          <div>
            {/* Super Admin internal Sub-tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 30, borderBottom: '1px solid #e2e8f0', paddingBottom: 16, flexWrap: 'wrap' }}>
              {[
                { id: 'tenants', label: '🏟️ Complejos (Tenants)', count: complejos.length },
                { id: 'requests', label: '📥 Solicitudes Registro', count: pendingRequests.filter(r => r.estado === 'pendiente').length },
                { id: 'sports', label: '🏆 Deportes', count: deportes.length },
                { id: 'audit', label: '📜 Auditoría y Logs', count: accessLogs.length + auditLogs.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSuperTab(tab.id as any)}
                  style={{
                    border: 'none',
                    background: activeSuperTab === tab.id ? '#16a34a' : 'transparent',
                    color: activeSuperTab === tab.id ? '#ffffff' : '#64748b',
                    padding: '10px 20px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ fontSize: 11, background: activeSuperTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0', color: activeSuperTab === tab.id ? '#fff' : '#475569', padding: '2px 6px', borderRadius: 100 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB: TENANTS */}
            {activeSuperTab === 'tenants' && (
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900 }}>Lista de Complejos Habilitados</h3>
                  <button
                    onClick={() => setEditComplejo({ isNew: true, nombre: '', email: '', telefono: '', direccion: '', ciudad: 'Asunción', usuario_asignado: '', lat: -25.2867, lng: -57.647, horario_apertura: '07:00', horario_cierre: '23:00' })}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={16} />
                    Agregar Complejo
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                        <th style={{ padding: 14 }}>Complejo / Ubicación</th>
                        <th style={{ padding: 14 }}>Usuario Asignado (Email)</th>
                        <th style={{ padding: 14 }}>Contacto</th>
                        <th style={{ padding: 14 }}>Estado</th>
                        <th style={{ padding: 14, textAlign: 'right' }}>Acciones Administrativas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complejos.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                          <td style={{ padding: 16 }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.nombre}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {c.direccion} · {c.ciudad}</div>
                          </td>
                          <td style={{ padding: 16 }}>
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                              {c.usuario_asignado || 'Ninguno (Google login requerido)'}
                            </span>
                          </td>
                          <td style={{ padding: 16 }}>
                            <div>{c.email}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>📞 {c.telefono}</div>
                          </td>
                          <td style={{ padding: 16 }}>
                            <span style={{
                              background: c.activo ? '#dcfce7' : '#fee2e2',
                              color: c.activo ? '#16a34a' : '#dc2626',
                              padding: '4px 10px',
                              borderRadius: 100,
                              fontWeight: 700,
                              fontSize: 12
                            }}>
                              {c.activo ? '● Activo' : '● Suspendido'}
                            </span>
                          </td>
                          <td style={{ padding: 16, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleToggleLock(c.id)}
                                style={{ background: c.activo ? '#ea580c' : '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                {c.activo ? 'Bloquear' : 'Habilitar'}
                              </button>
                              <button
                                onClick={() => handlePasswordReset(c.nombre, c.usuario_asignado)}
                                style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reset Pass
                              </button>
                              <button
                                onClick={() => setEditComplejo(c)}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteComplejo(c.id, c.nombre)}
                                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 40, borderTop: '1px solid #f1f5f9', paddingTop: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 900 }}>Organizadores Independientes</h3>
                      <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Usuarios habilitados para crear torneos sin un complejo físico.</p>
                    </div>
                    <button
                      onClick={() => setEditOrganizador({ isNew: true, usuario_id: usuarios[0]?.id || 0, nombre: '', plan: 'basico', max_torneos: 3 })}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={16} />
                      Habilitar Organizador
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                          <th style={{ padding: 14 }}>Organización / Evento</th>
                          <th style={{ padding: 14 }}>Usuario / Email</th>
                          <th style={{ padding: 14 }}>Plan contratado</th>
                          <th style={{ padding: 14 }}>Torneos permitidos</th>
                          <th style={{ padding: 14 }}>Estado</th>
                          <th style={{ padding: 14, textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizadores.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                              No hay organizadores independientes habilitados todavía.
                            </td>
                          </tr>
                        ) : (
                          organizadores.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                              <td style={{ padding: 16 }}>
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{o.nombre}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Creado el {o.creado_en ? new Date(o.creado_en).toLocaleDateString('es-PY') : 'Recientemente'}</div>
                              </td>
                              <td style={{ padding: 16 }}>
                                <div style={{ fontWeight: 600 }}>{o.usuario_nombre || 'Usuario'}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{o.usuario_email || 'email@gmail.com'}</div>
                              </td>
                              <td style={{ padding: 16 }}>
                                <span style={{ textTransform: 'capitalize', fontWeight: 700, color: '#3b82f6' }}>
                                  {o.plan}
                                </span>
                              </td>
                              <td style={{ padding: 16, fontWeight: 700 }}>
                                {o.max_torneos} torneos
                              </td>
                              <td style={{ padding: 16 }}>
                                <span style={{
                                  background: o.habilitado ? '#dcfce7' : '#fee2e2',
                                  color: o.habilitado ? '#16a34a' : '#dc2626',
                                  padding: '4px 10px',
                                  borderRadius: 100,
                                  fontWeight: 700,
                                  fontSize: 12
                                }}>
                                  {o.habilitado ? '● Habilitado' : '● Suspendido'}
                                </span>
                              </td>
                              <td style={{ padding: 16, textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleToggleOrganizador(o.usuario_id, o.habilitado, o.nombre)}
                                    style={{ background: o.habilitado ? '#ea580c' : '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {o.habilitado ? 'Suspender' : 'Activar'}
                                  </button>
                                  <button
                                    onClick={() => setEditOrganizador(o)}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Editar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REQUESTS (PENDING GOOGLE LOGINS) */}
            {activeSuperTab === 'requests' && (
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>📥 Solicitudes de Registro Pendientes</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                  Propietarios de complejos deportivos que se loguearon con Google y requieren asignación de tenant por el Super Admin.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '20px 24px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{req.nombre}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{req.email} · Solicitado el {req.fecha}</div>
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 11, background: req.estado === 'pendiente' ? '#fef3c7' : '#dcfce7', color: req.estado === 'pendiente' ? '#d97706' : '#16a34a', padding: '3px 8px', borderRadius: 6, fontWeight: 700, textTransform: 'uppercase' }}>
                            {req.estado === 'pendiente' ? 'Esperando Aprobación' : 'Aprobada'}
                          </span>
                        </div>
                      </div>

                      {req.estado === 'pendiente' && (
                        <button
                          onClick={() => handleApproveTenantRequest(req.id, req.email, req.nombre)}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: 10,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <CheckCircle size={16} />
                          Aprobar y Asignar Club Demo
                        </button>
                      )}
                    </div>
                  ))}
                  {pendingRequests.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      No hay solicitudes de registro de propietarios pendientes en este momento.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SPORTS */}
            {activeSuperTab === 'sports' && (
              <div style={{ maxWidth: '600px', background: '#fff', padding: 32, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>🏆 Catálogo de Deportes</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Disciplinas habilitadas para las reservas y grillas horarias de los complejos.</p>

                <form onSubmit={handleAddSport} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <input
                    type="text"
                    placeholder="Nuevo deporte (Ej: Pádel Singulares)..."
                    value={newSport}
                    onChange={e => setNewSport(e.target.value)}
                    style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                    + Agregar
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deportes.map(sport => (
                    <div key={sport} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{sport}</span>
                      <button onClick={() => handleRemoveSport(sport)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: AUDIT LOGS */}
            {activeSuperTab === 'audit' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>

                {/* Access Auditing Logs */}
                <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900 }}>🚪 Logs de Acceso y Logueo</h3>
                    <button onClick={() => handleClearLogs('acceso')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={13} /> Limpiar Logs
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '550px', overflowY: 'auto', paddingRight: 6 }}>
                    {accessLogs.map(log => (
                      <div key={log.id} style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                          <span>{log.usuario}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{log.fecha}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>{log.accion}</span>
                          <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{log.rol}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontFamily: 'monospace' }}>
                          IP: {log.ip} · {log.dispositivo}
                        </div>
                      </div>
                    ))}
                    {accessLogs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        No hay registros de accesos aún.
                      </div>
                    )}
                  </div>
                </div>

                {/* Modifications Auditing Logs */}
                <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900 }}>✏️ Logs de Cambios y Modificaciones</h3>
                    <button onClick={() => handleClearLogs('auditoria')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={13} /> Limpiar Logs
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '550px', overflowY: 'auto', paddingRight: 6 }}>
                    {auditLogs.map(log => (
                      <div key={log.id} style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                          <span>{log.usuario}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{log.fecha}</span>
                        </div>
                        <div style={{ margin: '6px 0', fontWeight: 800, color: '#ea580c', fontSize: 12 }}>
                          {log.accion}
                        </div>
                        <p style={{ color: '#475569', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                          {log.detalles}
                        </p>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        No hay logs de auditoría registrados aún.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* -------------------- LOCAL DEPORTIVO (TENANT) CONSOLE FLOW -------------------- */}
        {session.role === 'tenant' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 40 }}>

            {/* Sidebar complex properties */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900 }}>⚙️ Parámetros del Club</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Horario Apertura</label>
                  <input
                    type="time"
                    value={selectedComplejo?.horario_apertura || '07:00'}
                    onChange={e => handleUpdateTenantSettings('horario_apertura', e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Horario Cierre</label>
                  <input
                    type="time"
                    value={selectedComplejo?.horario_cierre || '23:00'}
                    onChange={e => handleUpdateTenantSettings('horario_cierre', e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                  <input
                    type="checkbox"
                    id="extraordinary"
                    checked={selectedComplejo?.apertura_extraordinaria || false}
                    onChange={e => handleUpdateTenantSettings('apertura_extraordinaria', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="extraordinary" style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Permitir Apertura Extraordinaria
                  </label>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: -10 }}>Habilita agendamientos automáticos fuera de los horarios estándares.</p>
              </div>
            </div>

            {/* Canchas Management */}
            <div style={{ background: '#fff', padding: 32, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 24 }}>🏟️ Gestión de Canchas - {selectedComplejo?.nombre}</h3>

              {/* Form to add Cancha */}
              <form onSubmit={handleAddCancha} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr auto', gap: 12, alignItems: 'end', background: '#f8fafc', padding: 20, borderRadius: 16, marginBottom: 30 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Nombre de Cancha</label>
                  <input
                    type="text"
                    placeholder="Ej: Cancha 2 Sintético"
                    value={newCancha.nombre}
                    onChange={e => setNewCancha({ ...newCancha, nombre: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Deporte</label>
                  <select
                    value={newCancha.deporte}
                    onChange={e => setNewCancha({ ...newCancha, deporte: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  >
                    {deportes.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Superficie</label>
                  <input
                    type="text"
                    placeholder="Sintético, Arcilla..."
                    value={newCancha.superficie}
                    onChange={e => setNewCancha({ ...newCancha, superficie: e.target.value })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Precio Diurno (Gs/h)</label>
                  <input
                    type="number"
                    value={newCancha.precio_hora}
                    onChange={e => setNewCancha({ ...newCancha, precio_hora: Number(e.target.value) })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Precio Nocturno (Gs/h)</label>
                  <input
                    type="number"
                    value={newCancha.precio_hora_nocturna}
                    onChange={e => setNewCancha({ ...newCancha, precio_hora_nocturna: Number(e.target.value) })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', height: 41 }}>
                  +
                </button>
              </form>

              {/* List of Courts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {canchas.filter(c => c.complejo_id === selectedComplejoId).map(cancha => (
                  <div key={cancha.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, position: 'relative' }}>
                    <button
                      onClick={() => handleRemoveCancha(cancha.id, cancha.nombre)}
                      style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>🏟️</span>
                      <h4 style={{ fontSize: 16, fontWeight: 800 }}>{cancha.nombre}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{cancha.deporte}</span>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{cancha.superficie}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#64748b' }}>Tarifa Diurna:</span>
                        <strong style={{ color: '#16a34a' }}>{cancha.precio_hora.toLocaleString()} Gs.</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>Tarifa Nocturna:</span>
                        <strong style={{ color: '#ea580c' }}>{cancha.precio_hora_nocturna.toLocaleString()} Gs.</strong>
                      </div>
                    </div>
                  </div>
                ))}
                {canchas.filter(c => c.complejo_id === selectedComplejoId).length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    Tu complejo deportivo aún no tiene canchas asignadas.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* -------------------- POPUP FORM FOR SUPER ADMIN (ADD / EDIT ORGANIZADOR) -------------------- */}
      {editOrganizador && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSaveOrganizador} style={{ background: '#fff', padding: 40, borderRadius: 24, width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {editOrganizador.isNew ? '🏆 Habilitar Organizador Independiente' : '✏️ Editar Datos Organizador'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Nombre de Organización / Evento</label>
              <input
                type="text"
                value={editOrganizador.nombre}
                onChange={e => setEditOrganizador({ ...editOrganizador, nombre: e.target.value })}
                placeholder="Ej: Liga Amateur del Paraguay"
                style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            {editOrganizador.isNew ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Seleccionar Usuario (Email)</label>
                <select
                  value={editOrganizador.usuario_id || ''}
                  onChange={e => setEditOrganizador({ ...editOrganizador, usuario_id: Number(e.target.value) })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Usuario Asignado</label>
                <input
                  type="text"
                  value={editOrganizador.usuario_email || ''}
                  disabled
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#64748b' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Plan</label>
                <select
                  value={editOrganizador.plan || 'basico'}
                  onChange={e => setEditOrganizador({ ...editOrganizador, plan: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                >
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="ilimitado">Ilimitado</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Torneos Máximos</label>
                <input
                  type="number"
                  value={editOrganizador.max_torneos || 3}
                  onChange={e => setEditOrganizador({ ...editOrganizador, max_torneos: Number(e.target.value) })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  min="1"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setEditOrganizador(null)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {editComplejo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSaveComplejo} style={{ background: '#fff', padding: 40, borderRadius: 24, width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {editComplejo.isNew ? '🏟️ Registrar Nuevo Complejo' : '✏️ Editar Datos Complejo'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Nombre del Club</label>
                <input
                  type="text"
                  value={editComplejo.nombre}
                  onChange={e => setEditComplejo({ ...editComplejo, nombre: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Dueño (Usuario Gmail)</label>
                <input
                  type="email"
                  value={editComplejo.usuario_asignado}
                  onChange={e => setEditComplejo({ ...editComplejo, usuario_asignado: e.target.value })}
                  placeholder="ejemplo@gmail.com"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Correo Informativo</label>
                <input
                  type="email"
                  value={editComplejo.email}
                  onChange={e => setEditComplejo({ ...editComplejo, email: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Teléfono</label>
                <input
                  type="text"
                  value={editComplejo.telefono}
                  onChange={e => setEditComplejo({ ...editComplejo, telefono: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Dirección</label>
              <input
                type="text"
                value={editComplejo.direccion}
                onChange={e => setEditComplejo({ ...editComplejo, direccion: e.target.value })}
                style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Ciudad</label>
                <input
                  type="text"
                  value={editComplejo.ciudad}
                  onChange={e => setEditComplejo({ ...editComplejo, ciudad: e.target.value })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Latitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editComplejo.lat}
                    onChange={e => setEditComplejo({ ...editComplejo, lat: Number(e.target.value) })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>Longitud</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editComplejo.lng}
                    onChange={e => setEditComplejo({ ...editComplejo, lng: Number(e.target.value) })}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setEditComplejo(null)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Notifications Stack */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((toast, i) => (
          <div key={i} style={{ background: '#0f172a', color: '#fff', padding: '14px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', animation: 'modalIn 0.2s ease' }}>
            {toast}
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
