/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Shield, User, Lock, Settings, FileText, CheckCircle,
  Trash2, LogOut, RefreshCw, Layers, Plus, Power, MapPin,
  Mail, Phone, Clock, AlertTriangle, Search, MessageSquare, X, Send
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

function PaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange
}: {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (num: number) => void;
}) {
  if (totalItems === 0) return null;
  
  const generatePages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
        </span>
        <select 
          value={itemsPerPage} 
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
        >
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
        </select>
      </div>
      
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: 600, fontSize: 13 }}
        >
          Ant
        </button>
        
        {generatePages().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '6px 8px', color: '#64748b' }}>...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              style={{ padding: '6px 12px', borderRadius: 6, border: p === currentPage ? '1px solid #16a34a' : '1px solid #cbd5e1', background: p === currentPage ? '#16a34a' : '#fff', color: p === currentPage ? '#fff' : '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              {p}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', fontWeight: 600, fontSize: 13 }}
        >
          Sig
        </button>
      </div>
    </div>
  );
}

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
  const [academias, setAcademias] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Chat States
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [activeChatOrg, setActiveChatOrg] = useState<any>(null); // { id, nombre }
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatNewMessage, setChatNewMessage] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChatOrg) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeChatOrg]);

  useEffect(() => {
    const fetchGlobalUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/admin/unread`);
        if (res.ok) {
          const data = await res.json();
          setGlobalUnreadCount(data.unread_count);
        }
      } catch (e) {}
    };
    fetchGlobalUnread();
    const interval = setInterval(fetchGlobalUnread, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch specific chat when activeChatOrg changes
  useEffect(() => {
    let interval: any;
    if (activeChatOrg) {
      const loadMessages = async () => {
        try {
          const res = await fetch(`${API_URL}/api/chat/organizador/${activeChatOrg.id}`);
          if (res.ok) {
            const data = await res.json();
            setChatMessages(data);
            
            // Si hay no leídos del organizador, marcarlos como leídos
            const unread = data.filter((m: any) => m.sender === 'organizador' && !m.leido).length;
            if (unread > 0) {
              await fetch(`${API_URL}/api/chat/organizador/${activeChatOrg.id}/leer?reader=admin`, { method: 'PUT' });
              setGlobalUnreadCount(prev => Math.max(0, prev - unread));
            }
          }
        } catch (e) {}
      };
      loadMessages();
      interval = setInterval(loadMessages, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeChatOrg]);

  const handleAdminSendChatMessage = async (e: any) => {
    e.preventDefault();
    if (!chatNewMessage.trim() || !activeChatOrg) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/organizador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizador_id: activeChatOrg.id,
          sender: 'admin',
          mensaje: chatNewMessage.trim()
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatMessages(prev => [...prev, newMsg]);
        setChatNewMessage("");
      }
    } catch (e) {}
  };

  // Catalog Data states
  const [dbDeportes, setDbDeportes] = useState<any[]>([]);
  const [dbTiposDeporte, setDbTiposDeporte] = useState<any[]>([]);
  const [dbFormatosTorneo, setDbFormatosTorneo] = useState<any[]>([]);
  const [dbRoles, setDbRoles] = useState<any[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'deportes' | 'tipos' | 'formatos' | 'roles' | 'deporte_formatos'>('deportes');
  const [editCatalogItem, setEditCatalogItem] = useState<any | null>(null);
  const [selectedDeporteForFormatos, setSelectedDeporteForFormatos] = useState<number | null>(null);
  const [deporteFormatos, setDeporteFormatos] = useState<any[]>([]);

  const fetchCatalogs = async () => {
    try {
      const resDeportes = await fetch(`${API_URL}/api/deportes`);
      if (resDeportes.ok) setDbDeportes(await resDeportes.json());
    } catch (e) {}
    try {
      const resTipos = await fetch(`${API_URL}/api/deportes/tipos`);
      if (resTipos.ok) setDbTiposDeporte(await resTipos.json());
    } catch (e) {}
    try {
      const resFormatos = await fetch(`${API_URL}/api/torneos/formatos`);
      if (resFormatos.ok) setDbFormatosTorneo(await resFormatos.json());
    } catch (e) {}
    try {
      const resRoles = await fetch(`${API_URL}/api/roles`);
      if (resRoles.ok) setDbRoles(await resRoles.json());
    } catch (e) {}
  };

  const fetchDeporteFormatos = async (deporteId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/deportes/${deporteId}/formatos`);
      if (res.ok) setDeporteFormatos(await res.json());
    } catch (e) {}
  };

  const handleToggleDeporteFormato = async (deporteId: number, formatoId: number, isLinked: boolean) => {
    let token = '';
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        const s = JSON.parse(sessionStr);
        token = s.access_token || s.token || '';
      }
    } catch (e) {}

    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (isLinked) {
        await fetch(`${API_URL}/api/deportes/${deporteId}/formatos/${formatoId}`, { method: 'DELETE', headers });
      } else {
        await fetch(`${API_URL}/api/deportes/${deporteId}/formatos/${formatoId}`, { method: 'POST', headers });
      }
      fetchDeporteFormatos(deporteId);
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedDeporteForFormatos !== null) {
      fetchDeporteFormatos(selectedDeporteForFormatos);
    }
  }, [selectedDeporteForFormatos]);

  // Sorting & Filtering for Catalogs
  const [catalogSortField, setCatalogSortField] = useState<string>('nombre');
  const [catalogSortAsc, setCatalogSortAsc] = useState<boolean>(true);
  const [catalogFilters, setCatalogFilters] = useState({
    deportes_nombre: '',
    deportes_tipo: '',
    tipos_nombre: '',
    tipos_descripcion: '',
    formatos_nombre: '',
    formatos_descripcion: '',
    roles_nombre: '',
    roles_descripcion: ''
  });

  const handleToggleCatalogSort = (field: string) => {
    if (catalogSortField === field) {
      setCatalogSortAsc(!catalogSortAsc);
    } else {
      setCatalogSortField(field);
      setCatalogSortAsc(true);
    }
  };

  const filteredSortedDeportes = useMemo(() => {
    let result = [...dbDeportes];
    if (catalogFilters.deportes_nombre) {
      result = result.filter(d => d.nombre.toLowerCase().includes(catalogFilters.deportes_nombre.toLowerCase()));
    }
    if (catalogFilters.deportes_tipo) {
      result = result.filter(d => {
        const tipoName = d.tipo_deporte?.nombre || `ID: ${d.tipo_id}`;
        return tipoName.toLowerCase().includes(catalogFilters.deportes_tipo.toLowerCase());
      });
    }
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (catalogSortField === 'nombre') {
        valA = a.nombre;
        valB = b.nombre;
      } else if (catalogSortField === 'tipo') {
        valA = a.tipo_deporte?.nombre || `ID: ${a.tipo_id}`;
        valB = b.tipo_deporte?.nombre || `ID: ${b.tipo_id}`;
      }
      return catalogSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [dbDeportes, catalogFilters.deportes_nombre, catalogFilters.deportes_tipo, catalogSortField, catalogSortAsc]);

  const filteredSortedTiposDeporte = useMemo(() => {
    let result = [...dbTiposDeporte];
    if (catalogFilters.tipos_nombre) {
      result = result.filter(t => t.nombre.toLowerCase().includes(catalogFilters.tipos_nombre.toLowerCase()));
    }
    if (catalogFilters.tipos_descripcion) {
      result = result.filter(t => (t.descripcion || '').toLowerCase().includes(catalogFilters.tipos_descripcion.toLowerCase()));
    }
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (catalogSortField === 'nombre') {
        valA = a.nombre;
        valB = b.nombre;
      } else if (catalogSortField === 'descripcion') {
        valA = a.descripcion || '';
        valB = b.descripcion || '';
      }
      return catalogSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [dbTiposDeporte, catalogFilters.tipos_nombre, catalogFilters.tipos_descripcion, catalogSortField, catalogSortAsc]);

  const filteredSortedFormatosTorneo = useMemo(() => {
    let result = [...dbFormatosTorneo];
    if (catalogFilters.formatos_nombre) {
      result = result.filter(f => f.nombre.toLowerCase().includes(catalogFilters.formatos_nombre.toLowerCase()));
    }
    if (catalogFilters.formatos_descripcion) {
      result = result.filter(f => (f.descripcion || '').toLowerCase().includes(catalogFilters.formatos_descripcion.toLowerCase()));
    }
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (catalogSortField === 'nombre') {
        valA = a.nombre;
        valB = b.nombre;
      } else if (catalogSortField === 'descripcion') {
        valA = a.descripcion || '';
        valB = b.descripcion || '';
      }
      return catalogSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [dbFormatosTorneo, catalogFilters.formatos_nombre, catalogFilters.formatos_descripcion, catalogSortField, catalogSortAsc]);

  const filteredSortedRoles = useMemo(() => {
    let result = [...dbRoles];
    if (catalogFilters.roles_nombre) {
      result = result.filter(r => r.nombre.toLowerCase().includes(catalogFilters.roles_nombre.toLowerCase()));
    }
    if (catalogFilters.roles_descripcion) {
      result = result.filter(r => (r.descripcion || '').toLowerCase().includes(catalogFilters.roles_descripcion.toLowerCase()));
    }
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (catalogSortField === 'nombre') {
        valA = a.nombre;
        valB = b.nombre;
      } else if (catalogSortField === 'descripcion') {
        valA = a.descripcion || '';
        valB = b.descripcion || '';
      }
      return catalogSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [dbRoles, catalogFilters.roles_nombre, catalogFilters.roles_descripcion, catalogSortField, catalogSortAsc]);

  // Tabs states
  const [activeSuperTab, setActiveSuperTab] = useState<'complejos' | 'organizadores' | 'academias' | 'sports' | 'requests' | 'audit'>('complejos');

  // Pagination & Filter for Complejos
  const [complejosFilter, setComplejosFilter] = useState('');
  const [colComplejo, setColComplejo] = useState('');
  const [colUsuario, setColUsuario] = useState('');
  const [colContacto, setColContacto] = useState('');
  const [colEstado, setColEstado] = useState('');
  
  const [complejoSortField, setComplejoSortField] = useState<string>('');
  const [complejoSortAsc, setComplejoSortAsc] = useState<boolean>(true);
  
  const [complejosPage, setComplejosPage] = useState(1);
  const [complejosPerPage, setComplejosPerPage] = useState(10);

  // Pagination & Filter for Organizadores
  const [colOrgOrganizacion, setColOrgOrganizacion] = useState('');
  const [colOrgUsuario, setColOrgUsuario] = useState('');
  const [colOrgPlan, setColOrgPlan] = useState('');
  const [colOrgEstado, setColOrgEstado] = useState('');
  
  const [orgSortField, setOrgSortField] = useState<string>('');
  const [orgSortAsc, setOrgSortAsc] = useState<boolean>(true);

  const handleToggleOrgSort = (field: string) => {
    if (orgSortField === field) {
      setOrgSortAsc(!orgSortAsc);
    } else {
      setOrgSortField(field);
      setOrgSortAsc(true);
    }
  };

  const handleToggleComplejoSort = (field: string) => {
    if (complejoSortField === field) {
      setComplejoSortAsc(!complejoSortAsc);
    } else {
      setComplejoSortField(field);
      setComplejoSortAsc(true);
    }
  };

  const filteredComplejos = useMemo(() => {
    let result = complejos;
    
    if (complejosFilter) {
      result = result.filter(c => 
        c.nombre.toLowerCase().includes(complejosFilter.toLowerCase()) ||
        c.direccion?.toLowerCase().includes(complejosFilter.toLowerCase()) ||
        c.ciudad?.toLowerCase().includes(complejosFilter.toLowerCase()) ||
        c.usuario_asignado?.toLowerCase().includes(complejosFilter.toLowerCase())
      );
    }

    if (colComplejo) {
      result = result.filter(c => 
        c.nombre.toLowerCase().includes(colComplejo.toLowerCase()) || 
        (c.direccion || '').toLowerCase().includes(colComplejo.toLowerCase()) ||
        (c.ciudad || '').toLowerCase().includes(colComplejo.toLowerCase())
      );
    }
    
    if (colUsuario) {
      result = result.filter(c => 
        (c.usuario_asignado || '').toLowerCase().includes(colUsuario.toLowerCase())
      );
    }
    
    if (colContacto) {
      result = result.filter(c => 
        (c.email || '').toLowerCase().includes(colContacto.toLowerCase()) ||
        (c.telefono || '').toLowerCase().includes(colContacto.toLowerCase())
      );
    }
    
    if (colEstado) {
      const isActivoSearch = colEstado.toLowerCase().includes('act');
      const isSuspenSearch = colEstado.toLowerCase().includes('sus');
      if (isActivoSearch || isSuspenSearch) {
         result = result.filter(c => 
           (isActivoSearch && c.activo) || (isSuspenSearch && !c.activo)
         );
      }
    }
    
    if (complejoSortField) {
       result = [...result].sort((a, b) => {
         let valA = '';
         let valB = '';
         if (complejoSortField === 'complejo') {
           valA = a.nombre; valB = b.nombre;
         } else if (complejoSortField === 'usuario') {
           valA = a.usuario_asignado || ''; valB = b.usuario_asignado || '';
         } else if (complejoSortField === 'contacto') {
           valA = a.email || ''; valB = b.email || '';
         } else if (complejoSortField === 'estado') {
           valA = a.activo ? '1' : '0'; valB = b.activo ? '1' : '0';
         }
         return complejoSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
       });
    }

    return result;
  }, [complejos, complejosFilter, colComplejo, colUsuario, colContacto, colEstado, complejoSortField, complejoSortAsc]);

  const totalComplejosPages = Math.max(1, Math.ceil(filteredComplejos.length / complejosPerPage));
  const currentComplejos = useMemo(() => {
    const start = (complejosPage - 1) * complejosPerPage;
    return filteredComplejos.slice(start, start + complejosPerPage);
  }, [filteredComplejos, complejosPage, complejosPerPage]);

  useEffect(() => {
    setComplejosPage(1);
  }, [complejosFilter, colComplejo, colUsuario, colContacto, colEstado, complejoSortField, complejoSortAsc, complejosPerPage]);

  const filteredOrganizadores = useMemo(() => {
    let result = organizadores;
    
    if (colOrgOrganizacion) {
      result = result.filter(o => o.nombre?.toLowerCase().includes(colOrgOrganizacion.toLowerCase()));
    }
    if (colOrgUsuario) {
      result = result.filter(o => 
        (o.usuario_nombre || '').toLowerCase().includes(colOrgUsuario.toLowerCase()) ||
        (o.usuario_email || '').toLowerCase().includes(colOrgUsuario.toLowerCase())
      );
    }
    if (colOrgPlan) {
      result = result.filter(o => (o.plan || '').toLowerCase().includes(colOrgPlan.toLowerCase()));
    }
    if (colOrgEstado) {
      const isHabilitadoSearch = colOrgEstado.toLowerCase().includes('hab') || colOrgEstado.toLowerCase().includes('act');
      const isSuspenSearch = colOrgEstado.toLowerCase().includes('sus');
      if (isHabilitadoSearch || isSuspenSearch) {
         result = result.filter(o => 
           (isHabilitadoSearch && o.habilitado) || (isSuspenSearch && !o.habilitado)
         );
      }
    }
    
    if (orgSortField) {
       result = [...result].sort((a, b) => {
         let valA = '';
         let valB = '';
         if (orgSortField === 'organizacion') {
           valA = a.nombre || ''; valB = b.nombre || '';
         } else if (orgSortField === 'usuario') {
           valA = a.usuario_nombre || ''; valB = b.usuario_nombre || '';
         } else if (orgSortField === 'plan') {
           valA = a.plan || ''; valB = b.plan || '';
         } else if (orgSortField === 'torneos') {
           return orgSortAsc ? (a.max_torneos || 0) - (b.max_torneos || 0) : (b.max_torneos || 0) - (a.max_torneos || 0);
         } else if (orgSortField === 'estado') {
           valA = a.habilitado ? '1' : '0'; valB = b.habilitado ? '1' : '0';
         }
         return orgSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
       });
    }

    return result;
  }, [organizadores, colOrgOrganizacion, colOrgUsuario, colOrgPlan, colOrgEstado, orgSortField, orgSortAsc]);

  const [orgsPage, setOrgsPage] = useState(1);
  const [orgsPerPage, setOrgsPerPage] = useState(10);

  const totalOrgsPages = Math.max(1, Math.ceil(filteredOrganizadores.length / orgsPerPage));
  const currentOrganizadores = useMemo(() => {
    const start = (orgsPage - 1) * orgsPerPage;
    return filteredOrganizadores.slice(start, start + orgsPerPage);
  }, [filteredOrganizadores, orgsPage, orgsPerPage]);

  useEffect(() => {
    setOrgsPage(1);
  }, [colOrgOrganizacion, colOrgUsuario, colOrgPlan, colOrgEstado, orgSortField, orgSortAsc, orgsPerPage]);

  // Pagination & Filter for Academias
  const [colAcaNombre, setColAcaNombre] = useState('');
  const [colAcaPlan, setColAcaPlan] = useState('');
  const [colAcaEstado, setColAcaEstado] = useState('');
  
  const [acaSortField, setAcaSortField] = useState<string>('');
  const [acaSortAsc, setAcaSortAsc] = useState<boolean>(true);
  
  const [acaPage, setAcaPage] = useState(1);
  const [acaPerPage, setAcaPerPage] = useState(10);

  const handleToggleAcaSort = (field: string) => {
    if (acaSortField === field) {
      setAcaSortAsc(!acaSortAsc);
    } else {
      setAcaSortField(field);
      setAcaSortAsc(true);
    }
  };

  const filteredAcademias = useMemo(() => {
    let result = academias;
    if (colAcaNombre) {
      result = result.filter(a => a.nombre?.toLowerCase().includes(colAcaNombre.toLowerCase()));
    }
    if (colAcaPlan) {
      result = result.filter(a => (a.plan || '').toLowerCase().includes(colAcaPlan.toLowerCase()));
    }
    if (colAcaEstado) {
      const isActivoSearch = colAcaEstado.toLowerCase().includes('act') || colAcaEstado.toLowerCase().includes('hab');
      const isSuspenSearch = colAcaEstado.toLowerCase().includes('sus');
      if (isActivoSearch || isSuspenSearch) {
         result = result.filter(a => 
           (isActivoSearch && a.habilitado) || (isSuspenSearch && !a.habilitado)
         );
      }
    }
    
    if (acaSortField) {
       result = [...result].sort((a, b) => {
         let valA = '';
         let valB = '';
         if (acaSortField === 'nombre') {
           valA = a.nombre || ''; valB = b.nombre || '';
         } else if (acaSortField === 'plan') {
           valA = a.plan || ''; valB = b.plan || '';
         } else if (acaSortField === 'estado') {
           valA = a.habilitado ? '1' : '0'; valB = b.habilitado ? '1' : '0';
         }
         return acaSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
       });
    }

    return result;
  }, [academias, colAcaNombre, colAcaPlan, colAcaEstado, acaSortField, acaSortAsc]);

  const totalAcaPages = Math.max(1, Math.ceil(filteredAcademias.length / acaPerPage));
  const currentAcademias = useMemo(() => {
    const start = (acaPage - 1) * acaPerPage;
    return filteredAcademias.slice(start, start + acaPerPage);
  }, [filteredAcademias, acaPage, acaPerPage]);

  useEffect(() => {
    setAcaPage(1);
  }, [colAcaNombre, colAcaPlan, colAcaEstado, acaSortField, acaSortAsc, acaPerPage]);

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
    const adminBackup = localStorage.getItem('admin_session_backup');
    let activeSession = localStorage.getItem('user_session');
    
    // Si regresamos a /admin y teníamos una sesión de administrador respaldada, la restauramos
    if (adminBackup) {
      activeSession = adminBackup;
      localStorage.setItem('user_session', adminBackup);
      localStorage.removeItem('admin_session_backup');
    }

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
        if (token) {
          const resUsr = await fetch(`${API_URL}/auth/users`, fetchOpts);
          if (resUsr.ok) {
            const dataUsr = await resUsr.json();
            setUsuarios(dataUsr);
          }
        }
      } catch (_e) { }

      await fetchCatalogs();
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
        let updatedOrgs = organizadores;
        if (resOrg.ok) {
          updatedOrgs = await resOrg.json();
          setOrganizadores(updatedOrgs);
        }

        // Obtener el ID del organizador recién creado/editado.
        const orgMatch = updatedOrgs.find((o: any) => o.usuario_id === Number(editOrganizador.usuario_id));
        if (orgMatch && editOrganizador.deportesHabilitados) {
           const orgId = orgMatch.id;
           const resDeportes = await fetch(`${API_URL}/api/organizadores/${orgId}/deportes`);
           let deportesActuales = [];
           if (resDeportes.ok) {
              const jsonDeportes = await resDeportes.json();
              deportesActuales = jsonDeportes.map((d: any) => d.id);
           }
           
           const nuevosDeportes = editOrganizador.deportesHabilitados;
           const toAdd = nuevosDeportes.filter((id: number) => !deportesActuales.includes(id));
           const toRemove = deportesActuales.filter((id: number) => !nuevosDeportes.includes(id));

           for (const depId of toAdd) {
             await fetch(`${API_URL}/api/organizadores/${orgId}/deportes/${depId}`, { method: 'POST', ...fetchOpts });
           }
           for (const depId of toRemove) {
             await fetch(`${API_URL}/api/organizadores/${orgId}/deportes/${depId}`, { method: 'DELETE', ...fetchOpts });
           }
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

  const handleDeleteOrganizador = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al organizador "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_URL}/cancha/torneos/organizadores/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setOrganizadores(prev => prev.filter(o => o.id !== id));
        logEvent('auditoria', {
          accion: 'Eliminar Organizador',
          detalles: `Se eliminó permanentemente el organizador "${nombre}"`
        });
        addToast(`🗑️ Organizador eliminado con éxito.`);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail || 'No se pudo eliminar el organizador'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
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

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatalogItem) return;

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

    let url = '';
    let method = editCatalogItem.id ? 'PUT' : 'POST';
    let bodyData: any = {};

    if (editCatalogItem.type === 'deportes') {
      url = `${API_URL}/api/deportes` + (editCatalogItem.id ? `/${editCatalogItem.id}` : '');
      bodyData = { nombre: editCatalogItem.nombre, tipo_id: Number(editCatalogItem.tipo_id) };
    } else if (editCatalogItem.type === 'tipos') {
      url = `${API_URL}/api/deportes/tipos` + (editCatalogItem.id ? `/${editCatalogItem.id}` : '');
      bodyData = { nombre: editCatalogItem.nombre, descripcion: editCatalogItem.descripcion || '' };
    } else if (editCatalogItem.type === 'formatos') {
      url = `${API_URL}/api/torneos/formatos` + (editCatalogItem.id ? `/${editCatalogItem.id}` : '');
      bodyData = { nombre: editCatalogItem.nombre, descripcion: editCatalogItem.descripcion || '' };
    } else if (editCatalogItem.type === 'roles') {
      url = `${API_URL}/api/roles` + (editCatalogItem.id ? `/${editCatalogItem.id}` : '');
      bodyData = { nombre: editCatalogItem.nombre, descripcion: editCatalogItem.descripcion || '' };
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        addToast(`🎉 Registro guardado con éxito.`);
        await fetchCatalogs();
        setEditCatalogItem(null);
      } else {
        const error = await res.json();
        alert(`Error al guardar: ${error.detail || 'Error desconocido'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
  };

  const handleDeleteCatalogItem = async (type: 'deportes' | 'tipos' | 'formatos' | 'roles', id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

    let token = '';
    try {
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        const s = JSON.parse(sessionStr);
        token = s.access_token || s.token || '';
      }
    } catch (e) {}

    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = '';
    if (type === 'deportes') {
      url = `${API_URL}/api/deportes/${id}`;
    } else if (type === 'tipos') {
      url = `${API_URL}/api/deportes/tipos/${id}`;
    } else if (type === 'formatos') {
      url = `${API_URL}/api/torneos/formatos/${id}`;
    } else if (type === 'roles') {
      url = `${API_URL}/api/roles/${id}`;
    }

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (res.ok || res.status === 204) {
        addToast(`🗑️ "${name}" eliminado.`);
        await fetchCatalogs();
      } else {
        const error = await res.json();
        alert(`Error al eliminar: ${error.detail || 'Error desconocido'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
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
        rol: (session.role === 'super' || session.role === 'admin') ? 'Administrador' : 'Local Deportivo',
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
                {(session.role === 'super' || session.role === 'admin') ? 'Super Administrador Global' : 'Local Deportivo Autorizado'}
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.8px', marginTop: 6 }}>
              {(session.role === 'super' || session.role === 'admin') ? 'Consola de Control Central' : `Gestión de Complejo: ${selectedComplejo?.nombre}`}
            </h1>
            <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Sesión activa: {session.name} ({session.email})</p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {globalUnreadCount > 0 && (
              <button
                onClick={() => {
                  const orgsTabBtn = document.getElementById('btn-organizadores-indep');
                  if (orgsTabBtn) orgsTabBtn.scrollIntoView({ behavior: 'smooth' });
                  else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: '#fee2e2',
                  color: '#dc2626',
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  animation: 'pulse 2s infinite'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={18} />
                  <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', fontSize: 10, borderRadius: '100%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {globalUnreadCount}
                  </span>
                </div>
                <span>Mensajes Nuevos</span>
              </button>
            )}

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
        </div>

        {/* -------------------- SUPER ADMIN CONSOLE FLOW -------------------- */}
        {(session.role === 'super' || session.role === 'admin') && (
          <div>
            {/* Super Admin internal Sub-tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 30, borderBottom: '1px solid #e2e8f0', paddingBottom: 16, flexWrap: 'wrap' }}>
              {[
                { id: 'complejos', label: '🏟️ Complejos', count: complejos.length },
                { id: 'organizadores', label: '🏆 Organizadores', count: organizadores.length },
                { id: 'academias', label: '🎓 Academias', count: academias.length },
                { id: 'requests', label: '📥 Solicitudes', count: pendingRequests.filter(r => r.estado === 'pendiente').length },
                { id: 'sports', label: '🏆 Deportes y Catálogos', count: dbDeportes.length },
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

            {/* TAB: COMPLEJOS */}
            {activeSuperTab === 'complejos' && (
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900 }}>Lista de Complejos Habilitados</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                      <input
                        type="text"
                        placeholder="Buscar complejo..."
                        value={complejosFilter}
                        onChange={e => setComplejosFilter(e.target.value)}
                        style={{ padding: '8px 16px', border: 'none', outline: 'none', minWidth: 220 }}
                      />
                      <button 
                        style={{ background: '#f1f5f9', border: 'none', borderLeft: '1px solid #cbd5e1', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                      >
                        <Search size={16} /> Buscar
                      </button>
                    </div>
                    <button
                      onClick={() => setEditComplejo({ isNew: true, nombre: '', email: '', telefono: '', direccion: '', ciudad: 'Asunción', usuario_asignado: '', lat: -25.2867, lng: -57.647, horario_apertura: '07:00', horario_cierre: '23:00' })}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={16} />
                      Agregar Complejo
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleComplejoSort('complejo')}>
                              <span>Complejo / Ubicación</span>
                              <span>{complejoSortField === 'complejo' ? (complejoSortAsc ? '▲' : '▼') : '↕'}</span>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar complejo..." 
                              value={colComplejo} 
                              onChange={e => setColComplejo(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, textTransform: 'none', fontWeight: 'normal', color: '#0f172a' }}
                            />
                          </div>
                        </th>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleComplejoSort('usuario')}>
                              <span>Usuario Asignado (Email)</span>
                              <span>{complejoSortField === 'usuario' ? (complejoSortAsc ? '▲' : '▼') : '↕'}</span>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar email..." 
                              value={colUsuario} 
                              onChange={e => setColUsuario(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, textTransform: 'none', fontWeight: 'normal', color: '#0f172a' }}
                            />
                          </div>
                        </th>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleComplejoSort('contacto')}>
                              <span>Contacto</span>
                              <span>{complejoSortField === 'contacto' ? (complejoSortAsc ? '▲' : '▼') : '↕'}</span>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar contacto..." 
                              value={colContacto} 
                              onChange={e => setColContacto(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, textTransform: 'none', fontWeight: 'normal', color: '#0f172a' }}
                            />
                          </div>
                        </th>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleComplejoSort('estado')}>
                              <span>Estado</span>
                              <span>{complejoSortField === 'estado' ? (complejoSortAsc ? '▲' : '▼') : '↕'}</span>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Activo/Suspendido..." 
                              value={colEstado} 
                              onChange={e => setColEstado(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, textTransform: 'none', fontWeight: 'normal', color: '#0f172a' }}
                            />
                          </div>
                        </th>
                        <th style={{ padding: 14, textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ marginTop: 2 }}>Acciones Administrativas</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentComplejos.map(c => (
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

                {/* Controles de Paginación */}
                <PaginationControls
                  currentPage={complejosPage}
                  totalPages={totalComplejosPages}
                  itemsPerPage={complejosPerPage}
                  totalItems={filteredComplejos.length}
                  onPageChange={setComplejosPage}
                  onItemsPerPageChange={setComplejosPerPage}
                />
              </div>
            )}

            {/* TAB: ORGANIZADORES */}
            {activeSuperTab === 'organizadores' && (
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <h3 id="btn-organizadores-indep" style={{ fontSize: 20, fontWeight: 900 }}>Organizadores Independientes</h3>
                      <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Usuarios habilitados para crear torneos sin un complejo físico.</p>
                    </div>
                    <button
                      onClick={() => setEditOrganizador({ isNew: true, usuario_id: usuarios[0]?.id || 0, nombre: '', plan: 'basico', max_torneos: 3, deportesHabilitados: [] })}
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
                          <th style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Organización / Evento
                              <button onClick={() => handleToggleOrgSort('organizacion')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <RefreshCw size={12} style={{ transform: orgSortField === 'organizacion' && !orgSortAsc ? 'rotate(180deg)' : 'none', color: orgSortField === 'organizacion' ? '#0f172a' : '#cbd5e1' }} />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar..." 
                              value={colOrgOrganizacion}
                              onChange={e => setColOrgOrganizacion(e.target.value)}
                              style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                            />
                          </th>
                          <th style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Usuario / Email
                              <button onClick={() => handleToggleOrgSort('usuario')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <RefreshCw size={12} style={{ transform: orgSortField === 'usuario' && !orgSortAsc ? 'rotate(180deg)' : 'none', color: orgSortField === 'usuario' ? '#0f172a' : '#cbd5e1' }} />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar..." 
                              value={colOrgUsuario}
                              onChange={e => setColOrgUsuario(e.target.value)}
                              style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                            />
                          </th>
                          <th style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Plan
                              <button onClick={() => handleToggleOrgSort('plan')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <RefreshCw size={12} style={{ transform: orgSortField === 'plan' && !orgSortAsc ? 'rotate(180deg)' : 'none', color: orgSortField === 'plan' ? '#0f172a' : '#cbd5e1' }} />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Filtrar..." 
                              value={colOrgPlan}
                              onChange={e => setColOrgPlan(e.target.value)}
                              style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                            />
                          </th>
                          <th style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Límite Torneos
                              <button onClick={() => handleToggleOrgSort('torneos')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <RefreshCw size={12} style={{ transform: orgSortField === 'torneos' && !orgSortAsc ? 'rotate(180deg)' : 'none', color: orgSortField === 'torneos' ? '#0f172a' : '#cbd5e1' }} />
                              </button>
                            </div>
                          </th>
                          <th style={{ padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Estado
                              <button onClick={() => handleToggleOrgSort('estado')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                <RefreshCw size={12} style={{ transform: orgSortField === 'estado' && !orgSortAsc ? 'rotate(180deg)' : 'none', color: orgSortField === 'estado' ? '#0f172a' : '#cbd5e1' }} />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Act/Sus..." 
                              value={colOrgEstado}
                              onChange={e => setColOrgEstado(e.target.value)}
                              style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                            />
                          </th>
                          <th style={{ padding: 14, textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentOrganizadores.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                              No hay organizadores que coincidan con los filtros.
                            </td>
                          </tr>
                        ) : (
                          currentOrganizadores.map(o => (
                            <tr 
                              key={o.id} 
                              style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14, cursor: 'pointer' }}
                              title="Haz clic en la fila para ingresar como este organizador"
                              onClick={async () => {
                                let sessionData = JSON.parse(localStorage.getItem('user_session') || '{}');
                                const adminBackup = localStorage.getItem('admin_session_backup');
                                if (adminBackup) {
                                  sessionData = JSON.parse(adminBackup);
                                  localStorage.setItem('user_session', adminBackup);
                                  localStorage.removeItem('admin_session_backup');
                                }
                                const currentToken = sessionData.access_token || sessionData.token || '';
                                try {
                                  const res = await fetch(`${API_URL}/auth/impersonate/${o.usuario_id}`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${currentToken}` }
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    const backupSession = { ...sessionData };
                                    localStorage.setItem('admin_session_backup', JSON.stringify(backupSession));
                                    
                                    const newSessionData = {
                                      access_token: data.access_token,
                                      token: data.access_token,
                                      role: data.user.rol,
                                      name: data.user.nombre_completo,
                                      email: data.user.email,
                                      usuario_id: data.user.id,
                                      tipo_torneo: data.user.tipo_torneo || null,
                                      authorized: true
                                    };
                                    localStorage.setItem('user_session', JSON.stringify(newSessionData));
                                    
                                    if (newSessionData.role === 'organizador' && newSessionData.tipo_torneo === 'futbol') {
                                      window.location.href = '/admin-futbol/campeonatos';
                                    } else {
                                      window.location.href = '/admin-generales';
                                    }
                                  } else {
                                    const err = await res.json();
                                    alert(`Error: ${err.detail || 'No se pudo ingresar'}`);
                                  }
                                } catch (e) {
                                  alert('Error de red al intentar ingresar como este usuario');
                                }
                              }}
                              className="hover:bg-slate-50 transition-colors"
                            >
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
                                Máx. {o.max_torneos} torneos
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveChatOrg({ id: o.usuario_id, nombre: o.nombre });
                                    }}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <MessageSquare size={14} />
                                    Chat
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleOrganizador(o.usuario_id, o.habilitado, o.nombre);
                                    }}
                                    style={{ background: o.habilitado ? '#ea580c' : '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {o.habilitado ? 'Suspender' : 'Activar'}
                                  </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const res = await fetch(`${API_URL}/api/organizadores/${o.id}/deportes`);
                                          if (res.ok) {
                                            const deps = await res.json();
                                            setEditOrganizador({ ...o, deportesHabilitados: deps.map((d: any) => d.id) });
                                          } else {
                                            setEditOrganizador({ ...o, deportesHabilitados: [] });
                                          }
                                        } catch {
                                          setEditOrganizador({ ...o, deportesHabilitados: [] });
                                        }
                                      }}
                                      style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOrganizador(o.id, o.nombre);
                                      }}
                                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <PaginationControls
                    currentPage={orgsPage}
                    totalPages={totalOrgsPages}
                    itemsPerPage={orgsPerPage}
                    totalItems={filteredOrganizadores.length}
                    onPageChange={setOrgsPage}
                    onItemsPerPageChange={setOrgsPerPage}
                  />
                </div>
              </div>
            )}

            {/* TAB: ACADEMIAS */}
            {activeSuperTab === 'academias' && (
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900 }}>Academias y Escuelas Deportivas</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Gestión centralizada de academias que utilizan el módulo SAD-M.</p>
                  </div>
                  <button
                    onClick={() => {}}
                    style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={16} />
                    Alta Academia
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Nombre Academia
                            <button onClick={() => handleToggleAcaSort('nombre')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <RefreshCw size={12} style={{ transform: acaSortField === 'nombre' && !acaSortAsc ? 'rotate(180deg)' : 'none', color: acaSortField === 'nombre' ? '#0f172a' : '#cbd5e1' }} />
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Filtrar..." 
                            value={colAcaNombre}
                            onChange={e => setColAcaNombre(e.target.value)}
                            style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                          />
                        </th>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Plan
                            <button onClick={() => handleToggleAcaSort('plan')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <RefreshCw size={12} style={{ transform: acaSortField === 'plan' && !acaSortAsc ? 'rotate(180deg)' : 'none', color: acaSortField === 'plan' ? '#0f172a' : '#cbd5e1' }} />
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Filtrar..." 
                            value={colAcaPlan}
                            onChange={e => setColAcaPlan(e.target.value)}
                            style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                          />
                        </th>
                        <th style={{ padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Estado
                            <button onClick={() => handleToggleAcaSort('estado')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <RefreshCw size={12} style={{ transform: acaSortField === 'estado' && !acaSortAsc ? 'rotate(180deg)' : 'none', color: acaSortField === 'estado' ? '#0f172a' : '#cbd5e1' }} />
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Act/Sus..." 
                            value={colAcaEstado}
                            onChange={e => setColAcaEstado(e.target.value)}
                            style={{ width: '100%', marginTop: 6, padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                          />
                        </th>
                        <th style={{ padding: 14, textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ marginTop: 2 }}>Acciones</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAcademias.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b' }}>
                            No hay academias registradas o que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        currentAcademias.map(a => (
                          <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                            <td style={{ padding: 16, fontWeight: 800 }}>{a.nombre}</td>
                            <td style={{ padding: 16 }}>{a.plan}</td>
                            <td style={{ padding: 16 }}>{a.habilitado ? 'Activo' : 'Suspendido'}</td>
                            <td style={{ padding: 16, textAlign: 'right' }}>
                              <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ver</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={acaPage}
                  totalPages={totalAcaPages}
                  itemsPerPage={acaPerPage}
                  totalItems={filteredAcademias.length}
                  onPageChange={setAcaPage}
                  onItemsPerPageChange={setAcaPerPage}
                />
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
              <div style={{ background: '#fff', padding: 32, borderRadius: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>🏆 Catálogos y Deportes</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Administración de deportes, categorías y formatos de torneos en la base de datos.</p>

                {/* Sub-tabs for catalogs */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                  {[
                    { id: 'deportes', label: '🏆 Deportes' },
                    { id: 'tipos', label: '📁 Tipos de Deporte' },
                    { id: 'formatos', label: '⚙️ Formatos de Torneo' },
                    { id: 'roles', label: '👥 Roles del Sistema' },
                    { id: 'deporte_formatos', label: '🔗 Deporte ↔ Formato' }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveCatalogTab(sub.id as any)}
                      style={{
                        border: 'none',
                        background: activeCatalogTab === sub.id ? '#1e293b' : 'transparent',
                        color: activeCatalogTab === sub.id ? '#ffffff' : '#64748b',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Sub-tab: DEPORTES */}
                {activeCatalogTab === 'deportes' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 800, fontSize: 16 }}>Lista de Deportes (cancha.deportes)</h4>
                      <button
                        onClick={() => setEditCatalogItem({ type: 'deportes', isNew: true, nombre: '', tipo_id: dbTiposDeporte[0]?.id || 1 })}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        + Agregar Deporte
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('nombre')}>
                            Nombre {catalogSortField === 'nombre' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('tipo')}>
                            Tipo de Deporte {catalogSortField === 'tipo' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Acciones</th>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar nombre..."
                              value={catalogFilters.deportes_nombre}
                              onChange={e => setCatalogFilters({ ...catalogFilters, deportes_nombre: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar tipo..."
                              value={catalogFilters.deportes_tipo}
                              onChange={e => setCatalogFilters({ ...catalogFilters, deportes_tipo: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}></td>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSortedDeportes.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No hay deportes guardados o no coinciden con la búsqueda.</td>
                          </tr>
                        ) : (
                          filteredSortedDeportes.map(d => (
                            <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10, fontWeight: 700 }}>{d.nombre}</td>
                              <td style={{ padding: 10 }}>{d.tipo_deporte?.nombre || `ID: ${d.tipo_id}`}</td>
                              <td style={{ padding: 10, textAlign: 'right' }}>
                                <button
                                  onClick={() => setEditCatalogItem({ type: 'deportes', id: d.id, nombre: d.nombre, tipo_id: d.tipo_id })}
                                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, marginRight: 6, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCatalogItem('deportes', d.id, d.nombre)}
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab: TIPOS DE DEPORTE */}
                {activeCatalogTab === 'tipos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 800, fontSize: 16 }}>Tipos de Deporte (cancha.tipos_deporte)</h4>
                      <button
                        onClick={() => setEditCatalogItem({ type: 'tipos', isNew: true, nombre: '', descripcion: '' })}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        + Agregar Tipo
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('nombre')}>
                            Nombre {catalogSortField === 'nombre' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('descripcion')}>
                            Descripción {catalogSortField === 'descripcion' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Acciones</th>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar nombre..."
                              value={catalogFilters.tipos_nombre}
                              onChange={e => setCatalogFilters({ ...catalogFilters, tipos_nombre: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar descripción..."
                              value={catalogFilters.tipos_descripcion}
                              onChange={e => setCatalogFilters({ ...catalogFilters, tipos_descripcion: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}></td>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSortedTiposDeporte.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No hay tipos de deporte guardados o no coinciden con la búsqueda.</td>
                          </tr>
                        ) : (
                          filteredSortedTiposDeporte.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10, fontWeight: 700 }}>{t.nombre}</td>
                              <td style={{ padding: 10, color: '#64748b' }}>{t.descripcion || 'Sin descripción'}</td>
                              <td style={{ padding: 10, textAlign: 'right' }}>
                                <button
                                  onClick={() => setEditCatalogItem({ type: 'tipos', id: t.id, nombre: t.nombre, descripcion: t.descripcion })}
                                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, marginRight: 6, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCatalogItem('tipos', t.id, t.nombre)}
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab: FORMATOS DE TORNEO */}
                {activeCatalogTab === 'formatos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 800, fontSize: 16 }}>Formatos de Torneo (cancha.formatos_torneo)</h4>
                      <button
                        onClick={() => setEditCatalogItem({ type: 'formatos', isNew: true, nombre: '', descripcion: '' })}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        + Agregar Formato
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('nombre')}>
                            Nombre {catalogSortField === 'nombre' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('descripcion')}>
                            Descripción {catalogSortField === 'descripcion' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Acciones</th>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar nombre..."
                              value={catalogFilters.formatos_nombre}
                              onChange={e => setCatalogFilters({ ...catalogFilters, formatos_nombre: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar descripción..."
                              value={catalogFilters.formatos_descripcion}
                              onChange={e => setCatalogFilters({ ...catalogFilters, formatos_descripcion: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}></td>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSortedFormatosTorneo.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No hay formatos de torneo guardados o no coinciden con la búsqueda.</td>
                          </tr>
                        ) : (
                          filteredSortedFormatosTorneo.map(f => (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10, fontWeight: 700 }}>{f.nombre}</td>
                              <td style={{ padding: 10, color: '#64748b' }}>{f.descripcion || 'Sin descripción'}</td>
                              <td style={{ padding: 10, textAlign: 'right' }}>
                                <button
                                  onClick={() => setEditCatalogItem({ type: 'formatos', id: f.id, nombre: f.nombre, descripcion: f.descripcion })}
                                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, marginRight: 6, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCatalogItem('formatos', f.id, f.nombre)}
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab: ROLES */}
                {activeCatalogTab === 'roles' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 800, fontSize: 16 }}>Roles del Sistema (sistema.roles)</h4>
                      <button
                        onClick={() => setEditCatalogItem({ type: 'roles', isNew: true, nombre: '', descripcion: '' })}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                      >
                        + Agregar Rol
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('nombre')}>
                            Nombre {catalogSortField === 'nombre' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleToggleCatalogSort('descripcion')}>
                            Descripción {catalogSortField === 'descripcion' ? (catalogSortAsc ? '▲' : '▼') : ''}
                          </th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Acciones</th>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar nombre..."
                              value={catalogFilters.roles_nombre}
                              onChange={e => setCatalogFilters({ ...catalogFilters, roles_nombre: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input
                              type="text"
                              placeholder="Filtrar descripción..."
                              value={catalogFilters.roles_descripcion}
                              onChange={e => setCatalogFilters({ ...catalogFilters, roles_descripcion: e.target.value })}
                              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none', fontSize: 11 }}
                            />
                          </td>
                          <td style={{ padding: 6 }}></td>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSortedRoles.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>No hay roles guardados o no coinciden con la búsqueda.</td>
                          </tr>
                        ) : (
                          filteredSortedRoles.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10, fontWeight: 700 }}>{r.nombre}</td>
                              <td style={{ padding: 10, color: '#64748b' }}>{r.descripcion || 'Sin descripción'}</td>
                              <td style={{ padding: 10, textAlign: 'right' }}>
                                <button
                                  onClick={() => setEditCatalogItem({ type: 'roles', id: r.id, nombre: r.nombre, descripcion: r.descripcion })}
                                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, marginRight: 6, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteCatalogItem('roles', r.id, r.nombre)}
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab: DEPORTE <-> FORMATOS */}
                {activeCatalogTab === 'deporte_formatos' && (
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Asociar Formatos a Deportes</h4>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: 14 }}>1. Selecciona un Deporte</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                          {dbDeportes.map(d => (
                            <button
                              key={d.id}
                              onClick={() => setSelectedDeporteForFormatos(d.id)}
                              style={{
                                background: selectedDeporteForFormatos === d.id ? '#3b82f6' : '#fff',
                                color: selectedDeporteForFormatos === d.id ? '#fff' : '#1e293b',
                                border: '1px solid #cbd5e1',
                                padding: '10px 14px',
                                borderRadius: 8,
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 13,
                                transition: 'all 0.2s'
                              }}
                            >
                              {d.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div style={{ flex: 1, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: 14 }}>2. Formatos Permitidos</h5>
                        {selectedDeporteForFormatos ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {dbFormatosTorneo.map(f => {
                              const isLinked = deporteFormatos.some(df => df.id === f.id);
                              return (
                                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isLinked ? '#dcfce7' : '#fff', padding: '12px', borderRadius: 8, border: `1px solid ${isLinked ? '#86efac' : '#cbd5e1'}`, cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isLinked} 
                                    onChange={() => handleToggleDeporteFormato(selectedDeporteForFormatos, f.id, isLinked)}
                                    style={{ width: 18, height: 18, accentColor: '#16a34a' }}
                                  />
                                  <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{f.nombre}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ color: '#64748b', fontSize: 13 }}>← Selecciona un deporte a la izquierda para configurar sus formatos.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                    {(dbDeportes.length > 0 ? dbDeportes.map(d => d.nombre) : deportes).map(d => <option key={d} value={d}>{d}</option>)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 24, fontWeight: 900 }}>
                {editOrganizador.isNew ? '🏆 Habilitar Organizador Independiente' : '✏️ Editar Datos Organizador'}
              </h3>
              {!editOrganizador.isNew && editOrganizador.usuario_email && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`¿Estás seguro de que deseas reenviar la contraseña a ${editOrganizador.usuario_email}?`)) return;
                    try {
                      const res = await fetch(`${API_URL}/auth/reset-password-request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: editOrganizador.usuario_email })
                      });
                      if (res.ok) {
                        alert('Correo de restablecimiento de contraseña enviado con éxito.');
                      } else {
                        alert('Error al intentar reenviar la contraseña.');
                      }
                    } catch (e) {
                      alert('Error de conexión al intentar reenviar la contraseña.');
                    }
                  }}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}
                  title="Reenviar Contraseña"
                >
                  <RefreshCw size={14} />
                  Reenviar Contraseña
                </button>
              )}
            </div>

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
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#64748b' }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Deportes Permitidos</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
                {dbDeportes.map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input 
                      type="checkbox" 
                      checked={(editOrganizador.deportesHabilitados || []).includes(d.id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setEditOrganizador((prev: any) => ({
                          ...prev,
                          deportesHabilitados: isChecked 
                            ? [...(prev.deportesHabilitados || []), d.id]
                            : (prev.deportesHabilitados || []).filter((id: number) => id !== d.id)
                        }));
                      }}
                    />
                    {d.nombre}
                  </label>
                ))}
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

      {/* -------------------- POPUP FORM FOR DB CATALOGS (ADD / EDIT) -------------------- */}
      {editCatalogItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSaveCatalogItem} style={{ background: '#fff', padding: 40, borderRadius: 24, width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
              {editCatalogItem.id ? '✏️ Editar Registro' : '➕ Agregar Registro'} - {
                editCatalogItem.type === 'deportes' ? 'Deporte' : 
                editCatalogItem.type === 'tipos' ? 'Tipo de Deporte' : 
                editCatalogItem.type === 'formatos' ? 'Formato de Torneo' : 'Rol de Cancha'
              }
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Nombre</label>
              <input
                type="text"
                value={editCatalogItem.nombre}
                onChange={e => setEditCatalogItem({ ...editCatalogItem, nombre: e.target.value })}
                placeholder="Ej: Pádel, Liga, etc."
                style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                required
              />
            </div>

            {editCatalogItem.type === 'deportes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Tipo de Deporte</label>
                <select
                  value={editCatalogItem.tipo_id || ''}
                  onChange={e => setEditCatalogItem({ ...editCatalogItem, tipo_id: Number(e.target.value) })}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {dbTiposDeporte.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(editCatalogItem.type === 'tipos' || editCatalogItem.type === 'formatos' || editCatalogItem.type === 'roles') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Descripción</label>
                <textarea
                  value={editCatalogItem.descripcion || ''}
                  onChange={e => setEditCatalogItem({ ...editCatalogItem, descripcion: e.target.value })}
                  placeholder="Descripción del catálogo..."
                  style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setEditCatalogItem(null)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chat Modal for Admin */}
      {activeChatOrg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '80vh', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#3b82f6', width: 40, height: 40, borderRadius: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Soporte: {activeChatOrg.nombre}</h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Resolución de dudas y requerimientos</p>
                </div>
              </div>
              <button onClick={() => setActiveChatOrg(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 40 }}>
                  No hay mensajes con este organizador.
                </div>
              ) : (
                chatMessages.map(m => {
                  const isAdmin = m.sender === 'admin';
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%',
                        background: isAdmin ? '#16a34a' : '#fff',
                        color: isAdmin ? '#fff' : '#0f172a',
                        padding: '12px 16px',
                        borderRadius: 16,
                        borderBottomRightRadius: isAdmin ? 4 : 16,
                        borderBottomLeftRadius: !isAdmin ? 4 : 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: isAdmin ? 'none' : '1px solid #e2e8f0',
                        fontSize: 14,
                        lineHeight: 1.5
                      }}>
                        {m.mensaje}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                        {new Date(m.creado_en).toLocaleString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                        {isAdmin && (
                          <span style={{ color: m.leido ? '#3b82f6' : '#cbd5e1' }}>
                            <CheckCircle size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            <form onSubmit={handleAdminSendChatMessage} style={{ padding: 20, background: '#fff', borderTop: '1px solid #f1f5f9', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, display: 'flex', gap: 12 }}>
              <input 
                type="text" 
                value={chatNewMessage}
                onChange={e => setChatNewMessage(e.target.value)}
                placeholder="Escribe un mensaje al organizador..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              />
              <button 
                type="submit" 
                disabled={!chatNewMessage.trim()}
                style={{ background: chatNewMessage.trim() ? '#16a34a' : '#cbd5e1', color: '#fff', border: 'none', padding: '0 20px', borderRadius: 12, fontWeight: 700, cursor: chatNewMessage.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
              >
                Enviar
                <MessageSquare size={16} />
              </button>
            </form>
          </div>
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
