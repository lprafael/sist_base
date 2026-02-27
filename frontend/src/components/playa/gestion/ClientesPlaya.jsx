import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ClientesPlaya.css';

// Corregir iconos de Leaflet en React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENTES AUXILIARES DE MAPA (MOVIBLES FUERA PARA ESTABILIDAD) ---
const updateLocationInfoBase = async (lat, lng, setUbi) => {
    try {
        // Reverse Geocoding with Nominatim
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const addr = res.data.address;
        const street = addr.road || addr.pedestrian || addr.suburb || '';
        const neighborhood = addr.neighbourhood || addr.suburb || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || '';

        const fullDir = [street, neighborhood, city].filter(Boolean).join(', ');

        setUbi(prev => ({
            ...prev,
            latitud: lat,
            longitud: lng,
            direccion_texto: fullDir
        }));
    } catch (error) {
        setUbi(prev => ({ ...prev, latitud: lat, longitud: lng }));
    }
};

const LocationMarker = ({ ubi, setUbi }) => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    updateLocationInfoBase(newPos.lat, newPos.lng, setUbi);
                }
            },
        }),
        [setUbi],
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[Number(ubi.latitud), Number(ubi.longitud)]}
            ref={markerRef}>
            <Popup minWidth={90}>
                <span>Arrastra para cambiar ubicación</span>
            </Popup>
        </Marker>
    );
};

const MapEvents = ({ setUbi }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            updateLocationInfoBase(lat, lng, setUbi);
        },
    });
    return null;
};

const ClientesPlaya = ({ preselectedCalificacion, setPreselectedCalificacion }) => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCalificacion, setSelectedCalificacion] = useState('');
    const [calificaciones, setCalificaciones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('datos'); // 'datos', 'garantes', 'referencias', 'ubicaciones'

    // Sub-modales
    const [showGanteModal, setShowGanteModal] = useState(false);
    const [showRefModal, setShowRefModal] = useState(false);
    const [showUbiModal, setShowUbiModal] = useState(false);
    const [refConfig, setRefConfig] = useState({ tipo_entidad: 'CLIENTE', entidad_id: null, entity_name: '' });

    const [newCliente, setNewCliente] = useState({
        tipo_documento: 'CI',
        numero_documento: '',
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        telefono: '',
        celular: '',
        email: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        codigo_postal: '',
        estado_civil: '',
        profesion: '',
        lugar_trabajo: '',
        telefono_trabajo: '',
        antiguedad_laboral: '',
        direccion_laboral: '',
        ingreso_mensual: '',
        observaciones: '',
        activo: true,
        garantes: [],
        referencias: [],
        ubicaciones: []
    });

    const [editingCliente, setEditingCliente] = useState(null);
    const [currentGarante, setCurrentGarante] = useState(null);
    const [currentRef, setCurrentRef] = useState(null);
    const [currentUbi, setCurrentUbi] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            try {
                const token = sessionStorage.getItem('token');
                await axios.post(`${API_URL}/playa/reportes/recalcular-mora`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error('Error recalibrating arrears on load:', error);
            }
            await Promise.all([fetchClientes(), fetchCalificaciones()]);
            setLoading(false);
        };

        initializeData();
    }, []);

    useEffect(() => {
        if (showUbiModal) {
            // Pequeño delay para asegurar que el DOM del modal está listo y evitar "Map container already initialized"
            const timer = setTimeout(() => setMapReady(true), 200);
            return () => {
                clearTimeout(timer);
                setMapReady(false);
            };
        }
    }, [showUbiModal]);

    useEffect(() => {
        if (preselectedCalificacion) {
            setSelectedCalificacion(preselectedCalificacion);
            if (setPreselectedCalificacion) {
                setPreselectedCalificacion(null);
            }
        }
    }, [preselectedCalificacion]);

    const fetchCalificaciones = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/config-calificaciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCalificaciones(response.data);
        } catch (error) {
            console.error('Error fetching calificaciones:', error);
        }
    };

    const fetchClientes = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/clientes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClientes(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching clientes:', error);
            setLoading(false);
        }
    };

    const fetchFullClienteData = async (id) => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/clientes/${id}/full`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewCliente({
                ...response.data,
                fecha_nacimiento: response.data.fecha_nacimiento || '',
                ingreso_mensual: response.data.ingreso_mensual || ''
            });
        } catch (error) {
            console.error('Error fetching full client data:', error);
        }
    };

    const handleSaveCliente = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const dataToSave = { ...newCliente };
            delete dataToSave.garantes;
            delete dataToSave.referencias;
            delete dataToSave.ubicaciones;

            if (editingCliente) {
                await axios.put(`${API_URL}/playa/clientes/${editingCliente.id_cliente}`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                const response = await axios.post(`${API_URL}/playa/clientes`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEditingCliente(response.data); // Switch to edit mode to allow adding garantes/refs
                fetchFullClienteData(response.data.id_cliente);
            }
            fetchClientes();
            if (!editingCliente) setActiveTab('garantes'); // Proactive flip to next section
        } catch (error) {
            alert('Error saving client: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditCliente = async (cliente) => {
        setEditingCliente(cliente);
        setNewCliente({ ...cliente, garantes: [], referencias: [], ubicaciones: [] }); // Placeholder while loading full
        setShowModal(true);
        setActiveTab('datos');
        await fetchFullClienteData(cliente.id_cliente);
    };

    const handleDeleteCliente = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/clientes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClientes();
        } catch (error) {
            alert('Error deleting client: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCliente(null);
        setNewCliente({
            tipo_documento: 'CI',
            numero_documento: '',
            nombre: '',
            apellido: '',
            fecha_nacimiento: '',
            telefono: '',
            celular: '',
            email: '',
            direccion: '',
            ciudad: '',
            departamento: '',
            codigo_postal: '',
            estado_civil: '',
            profesion: '',
            lugar_trabajo: '',
            telefono_trabajo: '',
            antiguedad_laboral: '',
            direccion_laboral: '',
            ingreso_mensual: '',
            observaciones: '',
            activo: true,
            garantes: [],
            referencias: [],
            ubicaciones: []
        });
        setActiveTab('datos');
    };

    // --- LÓGICA DE GARANTES ---
    const handleAddGarante = () => {
        setCurrentGarante({
            id_cliente: editingCliente.id_cliente,
            tipo_documento: 'CI',
            numero_documento: '',
            nombre: '',
            apellido: '',
            fecha_nacimiento: '',
            telefono: '',
            celular: '',
            email: '',
            direccion: '',
            ciudad: '',
            estado_civil: '',
            relacion_cliente: '',
            lugar_trabajo: '',
            telefono_trabajo: '',
            antiguedad_laboral: '',
            direccion_laboral: '',
            ingreso_mensual: '',
            observaciones: '',
            activo: true
        });
        setShowGanteModal(true);
    };

    const handleSaveGante = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (currentGarante.id_garante) {
                await axios.put(`${API_URL}/playa/garantes/${currentGarante.id_garante}`, currentGarante, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/garantes`, currentGarante, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowGanteModal(false);
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error saving guarantor');
        }
    };

    const handleDeleteGante = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este garante? Sus referencias también se borrarán.')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/garantes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error deleting guarantor: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --- LÓGICA DE REFERENCIAS ---
    const handleAddRef = (tipo_entidad, entidad_id, entity_name) => {
        setRefConfig({ tipo_entidad, entidad_id, entity_name });
        setCurrentRef({
            id_cliente: entidad_id,
            tipo_entidad: tipo_entidad,
            tipo_referencia: 'PERSONAL',
            nombre: '',
            telefono: '',
            parentesco_cargo: ''
        });
        setShowRefModal(true);
    };

    const handleSaveRef = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (currentRef.id_referencia) {
                await axios.put(`${API_URL}/playa/referencias/${currentRef.id_referencia}`, currentRef, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/referencias`, currentRef, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowRefModal(false);
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error saving reference');
        }
    };

    const handleDeleteRef = async (id) => {
        if (!window.confirm('¿Eliminar referencia?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/referencias/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error deleting reference');
        }
    };

    // --- LÓGICA DE UBICACIONES ---
    const handleAddUbi = () => {
        setCurrentUbi({
            id_cliente: editingCliente.id_cliente,
            nombre_lugar: '',
            tipo_ubicacion: 'CASA',
            latitud: -25.2867, // Asuncion default
            longitud: -57.6470,
            direccion_texto: '',
            referencia: ''
        });
        setShowUbiModal(true);
    };

    const handleSaveUbi = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (currentUbi.id_ubicacion) {
                await axios.put(`${API_URL}/playa/ubicaciones-cliente/${currentUbi.id_ubicacion}`, currentUbi, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/playa/ubicaciones-cliente`, currentUbi, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowUbiModal(false);
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error saving location');
        }
    };

    const handleDeleteUbi = async (id) => {
        if (!window.confirm('¿Eliminar ubicación?')) return;
        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/ubicaciones-cliente/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFullClienteData(editingCliente.id_cliente);
        } catch (error) {
            alert('Error deleting location');
        }
    };

    const handlePrintReport = async (cliente) => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');

            // Obtener datos completos del cliente
            const response = await axios.get(`${API_URL}/playa/clientes/${cliente.id_cliente}/full`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const clienteCompleto = response.data;

            // Generar HTML y abrir en nueva ventana
            generateClienteHTML(clienteCompleto);
            setLoading(false);
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error al generar el reporte: ' + (error.response?.data?.detail || error.message));
            setLoading(false);
        }
    };

    const generateClienteHTML = (cliente) => {
        const refsPersonales = cliente.referencias?.filter(r => r.tipo_entidad === 'CLIENTE' && r.tipo_referencia === 'PERSONAL') || [];
        const refsLaborales = cliente.referencias?.filter(r => r.tipo_entidad === 'CLIENTE' && r.tipo_referencia === 'LABORAL') || [];
        const garantes = cliente.garantes || [];

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Cliente - ${cliente.nombre || ''} ${cliente.apellido || ''}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 30px;
        }
        .header-logo {
            max-width: 250px;
            width: auto;
            height: auto;
            object-fit: contain;
            flex-shrink: 0;
        }
        .header-content h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .header-content p {
            font-size: 14px;
            opacity: 0.9;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            background: #f1f5f9;
            padding: 12px 15px;
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            border-left: 4px solid #2563eb;
            margin-bottom: 15px;
        }
        .data-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 10px 15px;
            margin-bottom: 15px;
        }
        .data-label {
            font-weight: bold;
            color: #555;
        }
        .data-value {
            color: #333;
        }
        .referencias-list, .garantes-list {
            margin-left: 20px;
        }
        .referencia-item, .garante-item {
            background: #f9fafb;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 3px solid #3b82f6;
            border-radius: 4px;
        }
        .referencia-item h4, .garante-item h4 {
            color: #2563eb;
            margin-bottom: 10px;
        }
        .garante-section {
            margin-top: 30px;
            page-break-before: auto;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        @media print {
            body {
                padding: 10px;
            }
            .header {
                margin-bottom: 20px;
            }
            .section {
                page-break-inside: avoid;
            }
            .garante-section {
                page-break-before: auto;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="/imágenes/Logo_actualizado2.png" alt="Peralta Automotores" class="header-logo" />
        <div class="header-content">
            <h1>REPORTE DE CLIENTE</h1>
            <p>Generado el ${new Date().toLocaleDateString('es-PY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DATOS DEL CLIENTE</div>
        <div class="data-grid">
            ${cliente.nombre || cliente.apellido ? `<div class="data-label">Nombre Completo:</div><div class="data-value">${cliente.nombre || ''} ${cliente.apellido || ''}</div>` : ''}
            ${cliente.tipo_documento || cliente.numero_documento ? `<div class="data-label">Documento:</div><div class="data-value">${cliente.tipo_documento || ''} ${cliente.numero_documento || ''}</div>` : ''}
            ${cliente.fecha_nacimiento ? `<div class="data-label">Fecha de Nacimiento:</div><div class="data-value">${new Date(cliente.fecha_nacimiento).toLocaleDateString('es-PY')}</div>` : ''}
            ${cliente.telefono ? `<div class="data-label">Teléfono:</div><div class="data-value">${cliente.telefono}</div>` : ''}
            ${cliente.celular ? `<div class="data-label">Celular:</div><div class="data-value">${cliente.celular}</div>` : ''}
            ${cliente.email ? `<div class="data-label">Email:</div><div class="data-value">${cliente.email}</div>` : ''}
            ${cliente.direccion ? `<div class="data-label">Dirección:</div><div class="data-value">${cliente.direccion}</div>` : ''}
            ${cliente.ciudad ? `<div class="data-label">Ciudad:</div><div class="data-value">${cliente.ciudad}</div>` : ''}
            ${cliente.departamento ? `<div class="data-label">Departamento:</div><div class="data-value">${cliente.departamento}</div>` : ''}
            ${cliente.estado_civil ? `<div class="data-label">Estado Civil:</div><div class="data-value">${cliente.estado_civil}</div>` : ''}
            ${cliente.profesion ? `<div class="data-label">Profesión:</div><div class="data-value">${cliente.profesion}</div>` : ''}
            ${cliente.lugar_trabajo ? `<div class="data-label">Lugar de Trabajo:</div><div class="data-value">${cliente.lugar_trabajo}</div>` : ''}
            ${cliente.telefono_trabajo ? `<div class="data-label">Teléfono Trabajo:</div><div class="data-value">${cliente.telefono_trabajo}</div>` : ''}
            ${cliente.antiguedad_laboral ? `<div class="data-label">Antigüedad Laboral:</div><div class="data-value">${cliente.antiguedad_laboral}</div>` : ''}
            ${cliente.direccion_laboral ? `<div class="data-label">Dirección Laboral:</div><div class="data-value">${cliente.direccion_laboral}</div>` : ''}
            ${cliente.ingreso_mensual ? `<div class="data-label">Ingreso Mensual:</div><div class="data-value">Gs. ${parseFloat(cliente.ingreso_mensual).toLocaleString('es-PY')}</div>` : ''}
            ${cliente.calificacion_actual ? `<div class="data-label">Calificación:</div><div class="data-value">${cliente.calificacion_actual}</div>` : ''}
            ${cliente.observaciones ? `<div class="data-label">Observaciones:</div><div class="data-value">${cliente.observaciones}</div>` : ''}
        </div>
    </div>

    ${refsPersonales.length > 0 ? `
    <div class="section">
        <div class="section-title">REFERENCIAS PERSONALES DEL CLIENTE</div>
        <div class="referencias-list">
            ${refsPersonales.map((ref, index) => `
                <div class="referencia-item">
                    <h4>Referencia ${index + 1}</h4>
                    <div class="data-grid">
                        ${ref.nombre ? `<div class="data-label">Nombre:</div><div class="data-value">${ref.nombre}</div>` : ''}
                        ${ref.telefono ? `<div class="data-label">Teléfono:</div><div class="data-value">${ref.telefono}</div>` : ''}
                        ${ref.parentesco_cargo ? `<div class="data-label">Parentesco/Cargo:</div><div class="data-value">${ref.parentesco_cargo}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${refsLaborales.length > 0 ? `
    <div class="section">
        <div class="section-title">REFERENCIAS LABORALES DEL CLIENTE</div>
        <div class="referencias-list">
            ${refsLaborales.map((ref, index) => `
                <div class="referencia-item">
                    <h4>Referencia ${index + 1}</h4>
                    <div class="data-grid">
                        ${ref.nombre ? `<div class="data-label">Nombre:</div><div class="data-value">${ref.nombre}</div>` : ''}
                        ${ref.telefono ? `<div class="data-label">Teléfono:</div><div class="data-value">${ref.telefono}</div>` : ''}
                        ${ref.parentesco_cargo ? `<div class="data-label">Cargo:</div><div class="data-value">${ref.parentesco_cargo}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${garantes.length > 0 ? garantes.map((garante, garanteIndex) => {
            const refsGarante = cliente.referencias?.filter(r => r.tipo_entidad === 'GARANTE' && r.id_cliente === garante.id_garante) || [];
            return `
    <div class="section garante-section">
        <div class="section-title">GARANTE ${garanteIndex + 1}</div>
        <div class="data-grid">
            ${garante.nombre || garante.apellido ? `<div class="data-label">Nombre Completo:</div><div class="data-value">${garante.nombre || ''} ${garante.apellido || ''}</div>` : ''}
            ${garante.tipo_documento || garante.numero_documento ? `<div class="data-label">Documento:</div><div class="data-value">${garante.tipo_documento || ''} ${garante.numero_documento || ''}</div>` : ''}
            ${garante.relacion_cliente ? `<div class="data-label">Relación con Cliente:</div><div class="data-value">${garante.relacion_cliente}</div>` : ''}
            ${garante.telefono ? `<div class="data-label">Teléfono:</div><div class="data-value">${garante.telefono}</div>` : ''}
            ${garante.celular ? `<div class="data-label">Celular:</div><div class="data-value">${garante.celular}</div>` : ''}
            ${garante.email ? `<div class="data-label">Email:</div><div class="data-value">${garante.email}</div>` : ''}
            ${garante.direccion ? `<div class="data-label">Dirección:</div><div class="data-value">${garante.direccion}</div>` : ''}
            ${garante.ciudad ? `<div class="data-label">Ciudad:</div><div class="data-value">${garante.ciudad}</div>` : ''}
            ${garante.lugar_trabajo ? `<div class="data-label">Lugar de Trabajo:</div><div class="data-value">${garante.lugar_trabajo}</div>` : ''}
            ${garante.telefono_trabajo ? `<div class="data-label">Teléfono Trabajo:</div><div class="data-value">${garante.telefono_trabajo}</div>` : ''}
            ${garante.ingreso_mensual ? `<div class="data-label">Ingreso Mensual:</div><div class="data-value">Gs. ${parseFloat(garante.ingreso_mensual).toLocaleString('es-PY')}</div>` : ''}
        </div>
        ${refsGarante.length > 0 ? `
        <div style="margin-top: 20px;">
            <h4 style="color: #2563eb; margin-bottom: 10px;">Referencias del Garante</h4>
            ${refsGarante.map((ref, refIndex) => `
                <div class="referencia-item">
                    <h4>Referencia ${refIndex + 1} (${ref.tipo_referencia})</h4>
                    <div class="data-grid">
                        ${ref.nombre ? `<div class="data-label">Nombre:</div><div class="data-value">${ref.nombre}</div>` : ''}
                        ${ref.telefono ? `<div class="data-label">Teléfono:</div><div class="data-value">${ref.telefono}</div>` : ''}
                        ${ref.parentesco_cargo ? `<div class="data-label">Parentesco/Cargo:</div><div class="data-value">${ref.parentesco_cargo}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
    `;
        }).join('') : ''}

    <div class="footer">
        <p>Fin del reporte - Peralta Automotores</p>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
        `;

        // Abrir en nueva ventana
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };


    const getRowColorByCalificacion = (calificacion) => {
        switch (calificacion) {
            case 'MALO': return 'row-red';
            case 'REGULAR': return 'row-orange';
            case 'BUENO': return 'row-yellow';
            case 'EXCELENTE': return 'row-green';
            default: return '';
        }
    };

    const filteredClientes = clientes.filter(c => {
        const matchesSearch = (c.nombre + ' ' + c.apellido + ' ' + c.numero_documento).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCalificacion = selectedCalificacion === '' || c.calificacion_actual === selectedCalificacion;
        return matchesSearch && matchesCalificacion;
    });

    return (
        <div className="clientes-container">
            <div className="header-actions">
                <h2>Gestión de Clientes</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o documento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="category-filter">
                    <select value={selectedCalificacion} onChange={(e) => setSelectedCalificacion(e.target.value)}>
                        <option value="">Todas las Calificaciones</option>
                        {calificaciones.map(cal => (
                            <option key={cal.id_config} value={cal.calificacion}>{cal.calificacion}</option>
                        ))}
                    </select>
                </div>
                <button className="btn-primary" onClick={() => { setShowModal(true); setActiveTab('datos'); }}>
                    + Nuevo Cliente
                </button>
            </div>

            {loading ? (
                <div className="loader">Cargando clientes...</div>
            ) : (
                <div className="table-responsive">
                    <table className="clientes-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Documento</th>
                                <th>Telef./Cel.</th>
                                <th>Ciudad</th>
                                <th>Calificación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClientes.map(c => (
                                <tr key={c.id_cliente} className={getRowColorByCalificacion(c.calificacion_actual)}>
                                    <td>
                                        <div className="client-info">
                                            <span className="client-name">{c.nombre} {c.apellido}</span>
                                            <span className="client-email">{c.email}</span>
                                        </div>
                                    </td>
                                    <td>{c.tipo_documento || ''}: {c.numero_documento || ''}</td>
                                    <td>{[c.telefono, c.celular].filter(Boolean).join(' / ')}</td>
                                    <td>{c.ciudad || ''}</td>
                                    <td>
                                        <span className={`calif-badge ${(c.calificacion_actual || 'NUEVO').toLowerCase()}`}>
                                            {c.calificacion_actual || 'NUEVO'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-print-report" onClick={() => handlePrintReport(c)} title="Imprimir Reporte">🖨️</button>
                                            <button className="btn-edit" onClick={() => handleEditCliente(c)} title="Editar">✏️</button>
                                            <button className="btn-delete" onClick={() => handleDeleteCliente(c.id_cliente)} title="Eliminar">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>{editingCliente ? 'Perfil del Cliente' : 'Registrar Nuevo Cliente'}</h3>
                            <button className="btn-close-modal" onClick={handleCloseModal}>×</button>
                        </div>

                        {editingCliente && (
                            <div className="modal-tabs">
                                <button type="button" className={`tab-btn ${activeTab === 'datos' ? 'active' : ''}`} onClick={() => setActiveTab('datos')}>1. Datos Básico</button>
                                <button type="button" className={`tab-btn ${activeTab === 'garantes' ? 'active' : ''}`} onClick={() => setActiveTab('garantes')}>2. Garantes</button>
                                <button type="button" className={`tab-btn ${activeTab === 'referencias' ? 'active' : ''}`} onClick={() => setActiveTab('referencias')}>3. Referencias</button>
                                <button type="button" className={`tab-btn ${activeTab === 'ubicaciones' ? 'active' : ''}`} onClick={() => setActiveTab('ubicaciones')}>4. Ubicaciones</button>
                            </div>
                        )}

                        <form onSubmit={handleSaveCliente} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div className="modal-body">
                                <div className="tab-content">
                                    {activeTab === 'datos' && (
                                        <div className="client-form-content">
                                            <h4 style={{ marginBottom: '15px', color: '#2563eb' }}>Datos de Identificación</h4>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Tipo Doc.</label>
                                                    <select value={newCliente.tipo_documento} onChange={(e) => setNewCliente({ ...newCliente, tipo_documento: e.target.value })}>
                                                        <option value="CI">CI</option>
                                                        <option value="RUC">RUC</option>
                                                        <option value="PASAPORTE">Pasaporte</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Número Documento *</label>
                                                    <input type="text" required value={newCliente.numero_documento || ''} onChange={(e) => setNewCliente({ ...newCliente, numero_documento: e.target.value })} />
                                                </div>
                                            </div>

                                            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Datos Personales</h4>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Nombre *</label>
                                                    <input type="text" required value={newCliente.nombre || ''} onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Apellido *</label>
                                                    <input type="text" required value={newCliente.apellido || ''} onChange={(e) => setNewCliente({ ...newCliente, apellido: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Fecha de Nacimiento</label>
                                                    <input type="date" value={newCliente.fecha_nacimiento || ''} onChange={(e) => setNewCliente({ ...newCliente, fecha_nacimiento: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Estado Civil</label>
                                                    <select value={newCliente.estado_civil || ''} onChange={(e) => setNewCliente({ ...newCliente, estado_civil: e.target.value })}>
                                                        <option value="">Seleccionar...</option>
                                                        <option value="SOLTERO">Soltero</option>
                                                        <option value="CASADO">Casado</option>
                                                        <option value="DIVORCIADO">Divorciado</option>
                                                        <option value="VIUDO">Viudo</option>
                                                        <option value="UNION_LIBRE">Unión Libre</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Profesión</label>
                                                    <input type="text" value={newCliente.profesion || ''} onChange={(e) => setNewCliente({ ...newCliente, profesion: e.target.value })} />
                                                </div>
                                            </div>

                                            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Contacto</h4>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Teléfono</label>
                                                    <input type="text" value={newCliente.telefono || ''} onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Celular</label>
                                                    <input type="text" value={newCliente.celular || ''} onChange={(e) => setNewCliente({ ...newCliente, celular: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Email</label>
                                                <input type="email" value={newCliente.email || ''} onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })} />
                                            </div>

                                            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Dirección</h4>
                                            <div className="form-group">
                                                <label>Dirección</label>
                                                <textarea rows="2" value={newCliente.direccion || ''} onChange={(e) => setNewCliente({ ...newCliente, direccion: e.target.value })} />
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Ciudad</label>
                                                    <input type="text" value={newCliente.ciudad || ''} onChange={(e) => setNewCliente({ ...newCliente, ciudad: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Departamento</label>
                                                    <input type="text" value={newCliente.departamento || ''} onChange={(e) => setNewCliente({ ...newCliente, departamento: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Código Postal</label>
                                                <input type="text" value={newCliente.codigo_postal || ''} onChange={(e) => setNewCliente({ ...newCliente, codigo_postal: e.target.value })} />
                                            </div>

                                            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Datos Laborales</h4>
                                            <div className="form-group">
                                                <label>Lugar de Trabajo</label>
                                                <input type="text" value={newCliente.lugar_trabajo || ''} onChange={(e) => setNewCliente({ ...newCliente, lugar_trabajo: e.target.value })} />
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Teléfono Trabajo</label>
                                                    <input type="text" value={newCliente.telefono_trabajo || ''} onChange={(e) => setNewCliente({ ...newCliente, telefono_trabajo: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Antigüedad Laboral</label>
                                                    <input type="text" placeholder="Ej: 2 años, 6 meses" value={newCliente.antiguedad_laboral || ''} onChange={(e) => setNewCliente({ ...newCliente, antiguedad_laboral: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Dirección Laboral</label>
                                                <textarea rows="2" value={newCliente.direccion_laboral || ''} onChange={(e) => setNewCliente({ ...newCliente, direccion_laboral: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>Ingreso Mensual</label>
                                                <input type="number" step="0.01" placeholder="0.00" value={newCliente.ingreso_mensual || ''} onChange={(e) => setNewCliente({ ...newCliente, ingreso_mensual: e.target.value })} />
                                            </div>

                                            <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Observaciones</h4>
                                            <div className="form-group">
                                                <label>Observaciones</label>
                                                <textarea rows="3" value={newCliente.observaciones || ''} onChange={(e) => setNewCliente({ ...newCliente, observaciones: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'garantes' && (
                                        <div className="garantes-section">
                                            <div className="list-header">
                                                <h4>Garantes Registrados</h4>
                                                <button type="button" className="btn-mini btn-add" onClick={handleAddGarante}>+ Agregar Garante</button>
                                            </div>
                                            <div className="mini-list">
                                                {newCliente.garantes.length === 0 ? (
                                                    <div className="empty-state">No hay garantes registrados.</div>
                                                ) : (
                                                    newCliente.garantes.map(g => (
                                                        <div key={g.id_garante} className="mini-card">
                                                            <div className="card-info">
                                                                <h4>{g.nombre} {g.apellido}</h4>
                                                                <p>Doc: {g.numero_documento} | Relación: {g.relacion_cliente}</p>
                                                            </div>
                                                            <div className="card-actions">
                                                                <button type="button" className="btn-mini" onClick={() => handleAddRef('GARANTE', g.id_garante, g.nombre)}>📌 Referencias</button>
                                                                <button type="button" className="btn-mini" onClick={() => { setCurrentGarante(g); setShowGanteModal(true); }}>✏️</button>
                                                                <button type="button" className="btn-mini" onClick={() => handleDeleteGante(g.id_garante)}>🗑️</button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'referencias' && (
                                        <div className="referencias-section">
                                            <div className="list-header">
                                                <h4>Referencias del Cliente</h4>
                                                <button type="button" className="btn-mini btn-add" onClick={() => handleAddRef('CLIENTE', editingCliente.id_cliente, editingCliente.nombre)}>+ Nueva Referencia</button>
                                            </div>
                                            <div className="mini-list">
                                                {newCliente.referencias.filter(r => r.tipo_entidad === 'CLIENTE').length === 0 ? (
                                                    <div className="empty-state">Sin referencias.</div>
                                                ) : (
                                                    newCliente.referencias.filter(r => r.tipo_entidad === 'CLIENTE').map(r => (
                                                        <div key={r.id_referencia} className="mini-card">
                                                            <div className="card-info">
                                                                <h4>{r.nombre} ({r.tipo_referencia})</h4>
                                                                <p>Telf: {r.telefono} | {r.parentesco_cargo}</p>
                                                            </div>
                                                            <div className="card-actions">
                                                                <button type="button" className="btn-mini" onClick={() => { setCurrentRef(r); setShowRefModal(true); }}>✏️</button>
                                                                <button type="button" className="btn-mini" onClick={() => handleDeleteRef(r.id_referencia)}>🗑️</button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'ubicaciones' && (
                                        <div className="ubicaciones-section">
                                            <div className="list-header">
                                                <h4>Ubicaciones del Cliente</h4>
                                                <button type="button" className="btn-mini btn-add" onClick={handleAddUbi}>+ Nueva Ubicación</button>
                                            </div>
                                            <div className="mini-list">
                                                {newCliente.ubicaciones.length === 0 ? (
                                                    <div className="empty-state">Sin ubicaciones registradas.</div>
                                                ) : (
                                                    newCliente.ubicaciones.map(u => (
                                                        <div key={u.id_ubicacion} className="mini-card">
                                                            <div className="card-info">
                                                                <h4>{u.nombre_lugar} ({u.tipo_ubicacion})</h4>
                                                                <p>{u.direccion_texto}</p>
                                                                {u.referencia && <p className="text-muted"><small>Ref: {u.referencia}</small></p>}
                                                            </div>
                                                            <div className="card-actions">
                                                                <button type="button" className="btn-mini" onClick={() => { setCurrentUbi(u); setShowUbiModal(true); }}>✏️</button>
                                                                <button type="button" className="btn-mini" onClick={() => handleDeleteUbi(u.id_ubicacion)}>🗑️</button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                    {(activeTab === 'datos' || !editingCliente) && (
                                        <button type="submit" className="btn-save">
                                            {editingCliente ? 'Actualizar Información' : 'Siguiente: Garantes'}
                                        </button>
                                    )}
                                    {editingCliente && activeTab !== 'datos' && (
                                        <button type="button" className="btn-save" onClick={handleCloseModal}>Finalizar Perfil</button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SUB-MODAL GARANTE */}
            {
                showGanteModal && (
                    <div className="sub-modal-overlay">
                        <div className="sub-modal-content large">
                            <h4>{currentGarante.id_garante ? 'Editar Garante' : 'Nuevo Garante'}</h4>
                            <form onSubmit={handleSaveGante}>
                                <h4 style={{ marginBottom: '15px', color: '#2563eb' }}>Datos de Identificación</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Tipo Doc.</label>
                                        <select value={currentGarante.tipo_documento || 'CI'} onChange={e => setCurrentGarante({ ...currentGarante, tipo_documento: e.target.value })}>
                                            <option value="CI">CI</option>
                                            <option value="RUC">RUC</option>
                                            <option value="PASAPORTE">Pasaporte</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Número Documento *</label>
                                        <input type="text" required value={currentGarante.numero_documento || ''} onChange={e => setCurrentGarante({ ...currentGarante, numero_documento: e.target.value })} />
                                    </div>
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Datos Personales</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nombre *</label>
                                        <input type="text" required value={currentGarante.nombre || ''} onChange={e => setCurrentGarante({ ...currentGarante, nombre: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Apellido *</label>
                                        <input type="text" required value={currentGarante.apellido || ''} onChange={e => setCurrentGarante({ ...currentGarante, apellido: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fecha de Nacimiento</label>
                                        <input type="date" value={currentGarante.fecha_nacimiento || ''} onChange={e => setCurrentGarante({ ...currentGarante, fecha_nacimiento: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado Civil</label>
                                        <select value={currentGarante.estado_civil || ''} onChange={e => setCurrentGarante({ ...currentGarante, estado_civil: e.target.value })}>
                                            <option value="">Seleccionar...</option>
                                            <option value="SOLTERO">Soltero</option>
                                            <option value="CASADO">Casado</option>
                                            <option value="DIVORCIADO">Divorciado</option>
                                            <option value="VIUDO">Viudo</option>
                                            <option value="UNION_LIBRE">Unión Libre</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Relación con Cliente</label>
                                    <input type="text" placeholder="Ej: Hermano, Colega, Amigo" value={currentGarante.relacion_cliente || ''} onChange={e => setCurrentGarante({ ...currentGarante, relacion_cliente: e.target.value })} />
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Contacto</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Teléfono</label>
                                        <input type="text" value={currentGarante.telefono || ''} onChange={e => setCurrentGarante({ ...currentGarante, telefono: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Celular</label>
                                        <input type="text" value={currentGarante.celular || ''} onChange={e => setCurrentGarante({ ...currentGarante, celular: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={currentGarante.email || ''} onChange={e => setCurrentGarante({ ...currentGarante, email: e.target.value })} />
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Dirección</h4>
                                <div className="form-group">
                                    <label>Dirección</label>
                                    <textarea rows="2" value={currentGarante.direccion || ''} onChange={e => setCurrentGarante({ ...currentGarante, direccion: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Ciudad</label>
                                    <input type="text" value={currentGarante.ciudad || ''} onChange={e => setCurrentGarante({ ...currentGarante, ciudad: e.target.value })} />
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Datos Laborales</h4>
                                <div className="form-group">
                                    <label>Lugar de Trabajo</label>
                                    <input type="text" value={currentGarante.lugar_trabajo || ''} onChange={e => setCurrentGarante({ ...currentGarante, lugar_trabajo: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Teléfono Trabajo</label>
                                        <input type="text" value={currentGarante.telefono_trabajo || ''} onChange={e => setCurrentGarante({ ...currentGarante, telefono_trabajo: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Antigüedad Laboral</label>
                                        <input type="text" placeholder="Ej: 2 años, 6 meses" value={currentGarante.antiguedad_laboral || ''} onChange={e => setCurrentGarante({ ...currentGarante, antiguedad_laboral: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Dirección Laboral</label>
                                    <textarea rows="2" value={currentGarante.direccion_laboral || ''} onChange={e => setCurrentGarante({ ...currentGarante, direccion_laboral: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Ingreso Mensual</label>
                                    <input type="number" step="0.01" placeholder="0.00" value={currentGarante.ingreso_mensual || ''} onChange={e => setCurrentGarante({ ...currentGarante, ingreso_mensual: e.target.value })} />
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#2563eb' }}>Observaciones</h4>
                                <div className="form-group">
                                    <label>Observaciones</label>
                                    <textarea rows="3" value={currentGarante.observaciones || ''} onChange={e => setCurrentGarante({ ...currentGarante, observaciones: e.target.value })} />
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowGanteModal(false)}>Cerrar</button>
                                    <button type="submit" className="btn-save">Guardar Garante</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* SUB-MODAL REFERENCIA */}
            {
                showRefModal && (
                    <div className="sub-modal-overlay">
                        <div className="sub-modal-content">
                            <h4>Ref. para: <span style={{ color: '#3b82f6' }}>{refConfig.entity_name}</span></h4>
                            <form onSubmit={handleSaveRef}>
                                <div className="form-group">
                                    <label>Tipo de Referencia</label>
                                    <select value={currentRef.tipo_referencia} onChange={e => setCurrentRef({ ...currentRef, tipo_referencia: e.target.value })}>
                                        <option value="PERSONAL">Personal</option>
                                        <option value="LABORAL">Laboral</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Nombre Completo</label>
                                    <input type="text" required value={currentRef.nombre} onChange={e => setCurrentRef({ ...currentRef, nombre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" required value={currentRef.telefono} onChange={e => setCurrentRef({ ...currentRef, telefono: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Parentesco / Cargo</label>
                                    <input type="text" value={currentRef.parentesco_cargo} onChange={e => setCurrentRef({ ...currentRef, parentesco_cargo: e.target.value })} />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowRefModal(false)}>Cerrar</button>
                                    <button type="submit" className="btn-save">Guardar Referencia</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* SUB-MODAL UBICACIÓN */}
            {
                showUbiModal && (
                    <div className="sub-modal-overlay">
                        <div className="sub-modal-content large-map-modal">
                            <h4>{currentUbi.id_ubicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}</h4>
                            <div className="ubi-modal-layout">
                                <div className="ubi-form">
                                    <form onSubmit={handleSaveUbi}>
                                        <div className="form-group">
                                            <label>Nombre del Lugar</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Mi Casa, Local de Trabajo"
                                                value={currentUbi?.nombre_lugar || ''}
                                                onChange={e => setCurrentUbi({ ...currentUbi, nombre_lugar: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo</label>
                                            <select value={currentUbi?.tipo_ubicacion || 'CASA'} onChange={e => setCurrentUbi({ ...currentUbi, tipo_ubicacion: e.target.value })}>
                                                <option value="CASA">Casa</option>
                                                <option value="TRABAJO">Trabajo</option>
                                                <option value="REFERENCIA">Referencia</option>
                                                <option value="OTRO">Otro</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Dirección Recuperada</label>
                                            <textarea
                                                rows="2"
                                                value={currentUbi?.direccion_texto || ''}
                                                onChange={e => setCurrentUbi({ ...currentUbi, direccion_texto: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Punto de Referencia / Detalles</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Portón verde, frente a la plaza"
                                                value={currentUbi?.referencia || ''}
                                                onChange={e => setCurrentUbi({ ...currentUbi, referencia: e.target.value })}
                                            />
                                        </div>
                                        <div className="coords-info">
                                            <span>Lat: {Number(currentUbi?.latitud || 0).toFixed(6)}</span>
                                            <span>Long: {Number(currentUbi?.longitud || 0).toFixed(6)}</span>
                                        </div>
                                        <div className="modal-actions">
                                            <button type="button" className="btn-cancel" onClick={() => setShowUbiModal(false)}>Cerrar</button>
                                            <button type="submit" className="btn-save">Guardar Ubicación</button>
                                        </div>
                                    </form>
                                </div>
                                <div className="ubi-map-container">
                                    <label>Mueve el marcador o haz clic en el mapa</label>
                                    <div className="map-wrapper">
                                        {mapReady && (
                                            <MapContainer
                                                key={showUbiModal ? 'map-active-' + Date.now() : 'map-inactive'}
                                                center={[Number(currentUbi.latitud), Number(currentUbi.longitud)]}
                                                zoom={15}
                                                style={{ height: '350px', width: '100%' }}
                                            >
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                />
                                                <LocationMarker ubi={currentUbi} setUbi={setCurrentUbi} />
                                                <MapEvents setUbi={setCurrentUbi} />
                                            </MapContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default ClientesPlaya;
