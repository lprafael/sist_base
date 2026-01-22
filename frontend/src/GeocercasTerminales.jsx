import React, { useState, useEffect, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender
} from "@tanstack/react-table";
import { MapContainer, TileLayer, Marker, Circle, useMap, LayersControl } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import GeomMiniMap from "./GeomMiniMap";

const { BaseLayer } = LayersControl;

// Componente para manejar el centrado del mapa interactivo
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0) {
            map.panTo(center);
        }
    }, [center, map]);
    return null;
}

// Componente de Mapa Interactivo para el Modal de Terminales
function InteractiveTerminalMap({ formData, setFormData }) {
    const center = [formData.latitude || -25.3, formData.longitude || -57.6];
    const radius = formData.radio_geocerca_m || 500;

    // Calcular posición para el manejador del radio (a la derecha del centro)
    const handlePosition = useMemo(() => {
        // Offset aproximado para visualización inicial
        const latlng = L.latLng(center[0], center[1]);
        const lngOffset = (radius / (111320 * Math.cos(center[0] * Math.PI / 180)));
        return [center[0], center[1] + lngOffset];
    }, [center, radius]);

    const onMarkerDragEnd = (e) => {
        const { lat, lng } = e.target.getLatLng();
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    };

    const onHandleDragEnd = (e) => {
        const handlePos = e.target.getLatLng();
        const centerPos = L.latLng(center[0], center[1]);
        const distance = centerPos.distanceTo(handlePos);
        setFormData(prev => ({ ...prev, radio_geocerca_m: Math.round(distance) }));
    };

    const centerIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

    const handleIcon = L.divIcon({
        className: 'radius-handle-icon',
        html: '<div style="background: white; border: 2px solid #2563eb; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });

    return (
        <div style={{ height: '280px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
            <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
                <LayersControl position="bottomright">
                    <BaseLayer checked name="Calles">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </BaseLayer>
                    <BaseLayer name="Satélite">
                        <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
                    </BaseLayer>
                </LayersControl>

                <Circle
                    center={center}
                    radius={radius}
                    pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.2, weight: 2 }}
                />

                <Marker
                    position={center}
                    draggable={true}
                    icon={centerIcon}
                    eventHandlers={{ dragend: onMarkerDragEnd }}
                />

                <Marker
                    position={handlePosition}
                    draggable={true}
                    icon={handleIcon}
                    eventHandlers={{ dragend: onHandleDragEnd }}
                />

                <MapController center={center} />
            </MapContainer>
        </div>
    );
}

const API_URL = import.meta.env.VITE_REACT_APP_API_URL;

export default function GeocercasTerminales() {
    const [eots, setEots] = useState([]);
    const [selectedEot, setSelectedEot] = useState(null);
    const [puntosTerminales, setPuntosTerminales] = useState([]);
    const [rutas, setRutas] = useState([]);
    const [selectedRuta, setSelectedRuta] = useState(null);
    const [itinerarios, setItinerarios] = useState([]);
    const [selectedItinerario, setSelectedItinerario] = useState(null);
    const [geocercas, setGeocercas] = useState([]);
    const [tiposGeocerca, setTiposGeocerca] = useState([]);
    const [activeTab, setActiveTab] = useState("terminales");

    // Modal UI States
    const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
    const [editingTerminal, setEditingTerminal] = useState(null);
    const [terminalFormData, setTerminalFormData] = useState({
        numero_terminal: "",
        id_tipo_geocerca: 1,
        latitude: 0,
        longitude: 0,
        radio_geocerca_m: 500
    });

    const [isGeocercaModalOpen, setIsGeocercaModalOpen] = useState(false);
    const [editingGeocerca, setEditingGeocerca] = useState(null);
    const [geocercaFormData, setGeocercaFormData] = useState({
        id_tipo: 1,
        orden: 0,
        geom: ""
    });

    useEffect(() => {
        fetchEots();
        fetchTiposGeocerca();
    }, []);

    const fetchEots = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/eots?permisionario=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setEots(data);
        } catch (err) {
            console.error("Error al cargar EOTs:", err);
        }
    };

    const fetchTiposGeocerca = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/tipos_geocerca`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTiposGeocerca(data);
        } catch (err) {
            console.error("Error al cargar tipos de geocerca:", err);
        }
    };

    useEffect(() => {
        if (selectedEot) {
            fetchPuntosTerminales(selectedEot.id_eot_vmt_hex);
            fetchRutas(selectedEot.cod_catalogo);
            setSelectedRuta(null);
            setItinerarios([]);
            setSelectedItinerario(null);
            setGeocercas([]);
        }
    }, [selectedEot]);

    const fetchPuntosTerminales = async (id_eot_hex) => {
        if (!id_eot_hex) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/puntos_terminales/${id_eot_hex}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPuntosTerminales(data);
        } catch (err) {
            console.error("Error al cargar puntos terminales:", err);
        }
    };

    const fetchRutas = async (cod_catalogo) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/catalogo_rutas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const filtered = data.filter(r => r.id_eot_catalogo === cod_catalogo);
            setRutas(filtered);
        } catch (err) {
            console.error("Error al cargar rutas:", err);
        }
    };

    // Terminales Logic
    const openNewTerminalModal = () => {
        setEditingTerminal(null);
        setTerminalFormData({
            numero_terminal: "",
            id_tipo_geocerca: tiposGeocerca[0]?.id_tipo || 1,
            latitude: -25.3,
            longitude: -57.6,
            radio_geocerca_m: 500
        });
        setIsTerminalModalOpen(true);
    };

    const openEditTerminalModal = (terminal) => {
        setEditingTerminal(terminal);
        setTerminalFormData({
            numero_terminal: terminal.numero_terminal,
            id_tipo_geocerca: terminal.id_tipo_geocerca,
            latitude: terminal.latitude,
            longitude: terminal.longitude,
            radio_geocerca_m: terminal.radio_geocerca_m
        });
        setIsTerminalModalOpen(true);
    };

    const handleSaveTerminal = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const method = editingTerminal ? 'PUT' : 'POST';
            const url = editingTerminal
                ? `${API_URL}/puntos_terminales/${editingTerminal.id_punto}`
                : `${API_URL}/puntos_terminales`;

            const geom_punto = {
                type: "Point",
                coordinates: [parseFloat(terminalFormData.longitude), parseFloat(terminalFormData.latitude)]
            };

            const payload = {
                ...terminalFormData,
                id_eot_vmt_hex: selectedEot.id_eot_vmt_hex,
                geom_punto
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsTerminalModalOpen(false);
                fetchPuntosTerminales(selectedEot.id_eot_vmt_hex);
            } else {
                const errData = await res.json();
                alert(`Error: ${JSON.stringify(errData.detail)}`);
            }
        } catch (err) {
            console.error("Error al guardar terminal:", err);
        }
    };

    const handleDeleteTerminal = async (id) => {
        if (!confirm("¿Está seguro de eliminar esta terminal?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/puntos_terminales/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPuntosTerminales(selectedEot.id_eot_vmt_hex);
            }
        } catch (err) {
            console.error("Error al eliminar terminal:", err);
        }
    };

    // Geocercas Logic
    const fetchItinerarios = async (ruta_hex) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/historico_itinerario?ruta_hex=${ruta_hex}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setItinerarios(data);
        } catch (err) {
            console.error("Error al cargar itinerarios:", err);
        }
    };

    useEffect(() => {
        if (selectedRuta) fetchItinerarios(selectedRuta.ruta_hex);
    }, [selectedRuta]);

    const fetchGeocercas = async (id_itinerario) => {
        if (!id_itinerario) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/geocercas/itinerario/${id_itinerario}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setGeocercas(data);
        } catch (err) {
            console.error("Error al cargar geocercas:", err);
        }
    };

    useEffect(() => {
        if (selectedItinerario) fetchGeocercas(selectedItinerario.id_itinerario);
    }, [selectedItinerario]);

    const openNewGeocercaModal = () => {
        setEditingGeocerca(null);
        setGeocercaFormData({
            id_tipo: tiposGeocerca[0]?.id_tipo || 1,
            orden: geocercas.length + 1,
            geom: JSON.stringify({ type: "Point", coordinates: [-57.6, -25.3] }, null, 2)
        });
        setIsGeocercaModalOpen(true);
    };

    const openEditGeocercaModal = (gc) => {
        setEditingGeocerca(gc);
        setGeocercaFormData({
            id_tipo: gc.id_tipo,
            orden: gc.orden,
            geom: JSON.stringify(gc.geom, null, 2)
        });
        setIsGeocercaModalOpen(true);
    };

    const handleSaveGeocerca = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const method = editingGeocerca ? 'PUT' : 'POST';
            const url = editingGeocerca
                ? `${API_URL}/geocercas/${editingGeocerca.id_geocerca}`
                : `${API_URL}/geocercas`;

            const payload = {
                ...geocercaFormData,
                id_itinerario: selectedItinerario.id_itinerario,
                geom: JSON.parse(geocercaFormData.geom)
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsGeocercaModalOpen(false);
                fetchGeocercas(selectedItinerario.id_itinerario);
            } else {
                const errData = await res.json();
                alert(`Error: ${JSON.stringify(errData.detail)}`);
            }
        } catch (err) {
            console.error("Error al guardar geocerca:", err);
            alert("Error al parsear GeoJSON o guardar datos.");
        }
    };

    const handleDeleteGeocerca = async (id) => {
        if (!confirm("¿Está seguro de eliminar esta geocerca?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/geocercas/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchGeocercas(selectedItinerario.id_itinerario);
            }
        } catch (err) {
            console.error("Error al eliminar geocerca:", err);
        }
    };

    // Tables
    const terminalColumns = useMemo(() => [
        { accessorKey: "id_punto", header: "ID" },
        { accessorKey: "numero_terminal", header: "Nº Terminal" },
        {
            accessorKey: "id_tipo_geocerca",
            header: "Tipo",
            cell: ({ getValue }) => tiposGeocerca.find(t => t.id_tipo === getValue())?.nombre || getValue()
        },
        {
            accessorKey: "latitude",
            header: "Coordenadas",
            cell: ({ row }) => `${row.original.latitude.toFixed(6)}, ${row.original.longitude.toFixed(6)}`
        },
        { accessorKey: "radio_geocerca_m", header: "Radio (m)" },
        {
            accessorKey: "mapa",
            header: "Mapa",
            cell: ({ row }) => <GeomMiniMap geom={[row.original.geom_punto, row.original.geom_geocerca]} />
        },
        {
            id: "actions",
            header: "Acciones",
            cell: ({ row }) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={() => openEditTerminalModal(row.original)} title="Editar">✏️</button>
                    <button className="btn-icon delete" onClick={() => handleDeleteTerminal(row.original.id_punto)} title="Eliminar">🗑️</button>
                </div>
            )
        }
    ], [tiposGeocerca, selectedEot]);

    const terminalTable = useReactTable({
        data: puntosTerminales,
        columns: terminalColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="crud-container">
            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '20px' }}>Terminales y Geocercas</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label className="form-label">Seleccione Empresa (EOT)</label>
                        <select
                            className="form-input"
                            onChange={(e) => {
                                const eot = eots.find(item => item.cod_catalogo.toString() === e.target.value);
                                setSelectedEot(eot);
                            }}
                            value={selectedEot?.cod_catalogo || ""}
                        >
                            <option value="">-- Seleccione una empresa ({eots.length}) --</option>
                            {eots.map(e => (
                                <option key={e.eot_id} value={e.cod_catalogo}>{e.eot_nombre} ({e.eot_linea})</option>
                            ))}
                        </select>
                    </div>

                    {selectedEot && (
                        <div style={{ alignSelf: 'end' }}>
                            <div className="info-badge">
                                <strong>VMT-HEX:</strong> {selectedEot.id_eot_vmt_hex}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!selectedEot ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Seleccione una empresa para ver sus terminales y geocercas.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button className={`btn ${activeTab === "terminales" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("terminales")}>📍 Puntos Terminales</button>
                        <button className={`btn ${activeTab === "geocercas" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("geocercas")}>🛡️ Geocercas por Ruta</button>
                    </div>

                    {activeTab === "terminales" && (
                        <div className="fade-in card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0 }}>Puntos Terminales</h3>
                                <button className="btn btn-primary" onClick={openNewTerminalModal}>+ Nuevo Terminal</button>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        {terminalTable.getHeaderGroups().map(hg => (
                                            <tr key={hg.id}>{hg.headers.map(h => <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {terminalTable.getRowModel().rows.map(row => (
                                            <tr key={row.id}>{row.getVisibleCells().map(c => <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "geocercas" && (
                        <div className="fade-in">
                            <div className="card" style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label className="form-label">Ruta ({rutas.length})</label>
                                        <select className="form-input" onChange={(e) => setSelectedRuta(rutas.find(r => r.ruta_hex === e.target.value))} value={selectedRuta?.ruta_hex || ""}>
                                            <option value="">-- Seleccione una ruta ({rutas.length}) --</option>
                                            {rutas.map(r => <option key={r.ruta_hex} value={r.ruta_hex}>{r.ruta_hex} - {r.origen} / {r.destino}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">
                                            Itinerario ({itinerarios.filter(i => i.vigente).length} vigentes / {itinerarios.length} totales)
                                        </label>
                                        <select className="form-input" disabled={!selectedRuta} onChange={(e) => setSelectedItinerario(itinerarios.find(it => it.id_itinerario.toString() === e.target.value))} value={selectedItinerario?.id_itinerario || ""}>
                                            <option value="">-- Seleccione itinerario ({itinerarios.length}) --</option>
                                            {itinerarios.map(it => (
                                                <option key={it.id_itinerario} value={it.id_itinerario}>
                                                    {it.fecha_inicio_vigencia} {it.vigente ? " (Vigente)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {selectedItinerario && (
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0 }}>Geocercas del Itinerario</h3>
                                        <button className="btn btn-primary" onClick={openNewGeocercaModal}>+ Nueva Geocerca</button>
                                    </div>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Tipo</th>
                                                    <th>Orden</th>
                                                    <th>Mapa</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {geocercas.map(g => (
                                                    <tr key={g.id_geocerca}>
                                                        <td>{g.id_geocerca}</td>
                                                        <td>{tiposGeocerca.find(t => t.id_tipo === g.id_tipo)?.nombre || g.id_tipo}</td>
                                                        <td>{g.orden}</td>
                                                        <td><GeomMiniMap geom={g.geom} /></td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button className="btn-icon" onClick={() => openEditGeocercaModal(g)} title="Editar">✏️</button>
                                                                <button className="btn-icon delete" onClick={() => handleDeleteGeocerca(g.id_geocerca)} title="Eliminar">🗑️</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Terminal Modal */}
            {isTerminalModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content card" style={{ width: '550px' }}>
                        <h3>{editingTerminal ? "Editar Terminal" : "Nueva Terminal"}</h3>

                        <InteractiveTerminalMap
                            formData={terminalFormData}
                            setFormData={setTerminalFormData}
                        />

                        <form onSubmit={handleSaveTerminal}>
                            <div className="form-group">
                                <label>Nº Terminal / Nombre</label>
                                <input required className="form-input" value={terminalFormData.numero_terminal} onChange={e => setTerminalFormData({ ...terminalFormData, numero_terminal: e.target.value })} />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select className="form-input" value={terminalFormData.id_tipo_geocerca} onChange={e => setTerminalFormData({ ...terminalFormData, id_tipo_geocerca: parseInt(e.target.value) })}>
                                        {tiposGeocerca.map(t => <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Radio (metros)</label>
                                    <input type="number" className="form-input" value={terminalFormData.radio_geocerca_m} onChange={e => setTerminalFormData({ ...terminalFormData, radio_geocerca_m: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Latitud</label>
                                    <input type="number" step="any" className="form-input" value={terminalFormData.latitude} onChange={e => setTerminalFormData({ ...terminalFormData, latitude: parseFloat(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label>Longitud</label>
                                    <input type="number" step="any" className="form-input" value={terminalFormData.longitude} onChange={e => setTerminalFormData({ ...terminalFormData, longitude: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsTerminalModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Geocerca Modal */}
            {isGeocercaModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content card" style={{ width: '600px' }}>
                        <h3>{editingGeocerca ? "Editar Geocerca" : "Nueva Geocerca"}</h3>
                        <form onSubmit={handleSaveGeocerca}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select className="form-input" value={geocercaFormData.id_tipo} onChange={e => setGeocercaFormData({ ...geocercaFormData, id_tipo: parseInt(e.target.value) })}>
                                        {tiposGeocerca.map(t => <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Orden</label>
                                    <input type="number" className="form-input" value={geocercaFormData.orden} onChange={e => setGeocercaFormData({ ...geocercaFormData, orden: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Geometría (GeoJSON)</label>
                                <textarea
                                    className="form-input"
                                    rows="10"
                                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    value={geocercaFormData.geom}
                                    onChange={e => setGeocercaFormData({ ...geocercaFormData, geom: e.target.value })}
                                    placeholder='{"type": "Polygon", "coordinates": [...]}'
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsGeocercaModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { width: 450px; max-width: 90%; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #475569; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        .btn-icon { background: none; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; cursor: pointer; transition: all 0.2s; }
        .btn-icon:hover { background: #f1f5f9; transform: scale(1.1); }
        .btn-icon.delete:hover { background: #fee2e2; border-color: #ef4444; }
        .info-badge { background: #e0f2fe; color: #0369a1; padding: 10px 15px; border-radius: 8px; border-left: 4px solid #0284c7; }
        .form-input { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary { background: var(--primary-color); color: white; }
        .btn-secondary { background: #e2e8f0; color: #475569; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}
