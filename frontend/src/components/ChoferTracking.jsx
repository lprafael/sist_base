import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './Logistica.css';

const ChoferTracking = () => {
    const { token } = useParams();
    const [chofer, setChofer] = useState(null);
    const [votantes, setVotantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Iniciando...');
    const [coords, setCoords] = useState(null);
    const watchId = useRef(null);

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            // Reutilizamos el endpoint de update para validar
            const res = await fetch(`/api/logistica/tracking/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lat: 0, lng: 0 })
            });
            const data = await res.json();
            if (res.ok) {
                setChofer({ nombre: data.chofer_nombre });
                startTracking();
                fetchVotantes();
            } else {
                setStatus('Enlace inválido o expirado.');
            }
        } catch (err) {
            setStatus('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const startTracking = () => {
        if ("geolocation" in navigator) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCoords({ lat: latitude, lng: longitude });
                    sendLocation(latitude, longitude);
                    setStatus('📡 Transmitiendo ubicación...');
                },
                (err) => {
                    setStatus('❌ Error GPS: Habilita la ubicación.');
                },
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
        } else {
            setStatus('GPS no disponible en este dispositivo.');
        }
    };

    const sendLocation = async (lat, lng) => {
        await fetch(`/api/logistica/tracking/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, lat, lng })
        });
    };

    const fetchVotantes = async () => {
        try {
            const res = await fetch(`/api/logistica/tracking/votantes?token=${token}`);
            if (res.ok) {
                const data = await res.json();
                setVotantes(data);
            }
        } catch (err) {
            console.error("Error fetching tasks", err);
        }
    };

    const marcarTraslado = async (vid) => {
        const res = await fetch(`/api/logistica/marcar-traslado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, votante_id: vid })
        });
        if (res.ok) {
            alert("Traslado iniciado");
            fetchVotantes();
        }
    };

    const marcarDestino = async (vid) => {
        const res = await fetch(`/api/logistica/marcar-destino`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, votante_id: vid })
        });
        if (res.ok) {
            alert("Llegada confirmada");
            fetchVotantes();
        }
    };

    useEffect(() => {
        // Intentar mantener la pantalla encendida para el tracking
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.error("Wake Lock error:", err);
            }
        };
        requestWakeLock();
        return () => {
            if (wakeLock !== null) wakeLock.release();
        }
    }, []);

    const abrirNavegacion = (v) => {
        if (!v.local_lat || !v.local_lng) {
            alert("No hay coordenadas registradas para este local de votación.");
            return;
        }
        // Preferir Google Maps por ser el estándar más común, pero Waze es muy usado en Latam
        const url = `https://www.google.com/maps/dir/?api=1&destination=${v.local_lat},${v.local_lng}`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="driver-app">
            <header className="driver-header">
                <h1>Día D - SIGEL</h1>
                <p>Bienvenido, <strong>{chofer?.nombre}</strong></p>
                <div className={`status-pill ${coords ? 'active' : 'inactive'}`}>
                    {status}
                </div>
            </header>

            <main className="driver-content">
                <section className="location-card">
                    <h3>Mi Ubicación</h3>
                    {coords ? (
                        <p>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                    ) : (
                        <p>Buscando GPS...</p>
                    )}
                </section>

                <section className="tasks-section">
                    <h3>📍 Lista de Traslado</h3>
                    <div className="voter-list">
                        {votantes.length === 0 ? (
                            <div className="empty-state">📭 No hay traslados pendientes.</div>
                        ) : (
                            votantes.map(v => (
                                <div key={v.id} className={`voter-card ${v.estado}`}>
                                    <div className="voter-info">
                                        <strong>{v.nombre}</strong>
                                        <p>🏠 {v.domicilio || 'Sin dirección registrada'}</p>
                                        <p>📍 Local: {v.local_nombre || 'No asignado'}</p>
                                    </div>
                                    {v.estado === 'pendiente' ? (
                                        <button className="btn-recoger" onClick={() => marcarTraslado(v.id)}>
                                            Recoger 🚕
                                        </button>
                                    ) : v.estado === 'en_camino' ? (
                                        <div className="btn-group-vertical">
                                            <button className="btn-nav" onClick={() => abrirNavegacion(v)}>
                                                Ir a Local 🗺️
                                            </button>
                                            <button className="btn-destino" onClick={() => marcarDestino(v.id)}>
                                                Ya Llegué 🏁
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="status-label delivered">🏁 En destino</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <div className="instruction-box">
                    💡 <strong>Para seguimiento continuo:</strong>
                    <ul>
                        <li>Mantén esta ventana abierta.</li>
                        <li>No bloquees la pantalla (el sistema intentará mantenerla encendida).</li>
                        <li>En teléfonos, puedes usar "Agregar a pantalla de inicio" para mejor rendimiento.</li>
                    </ul>
                </div>
            </main>

            <style>{`
                .driver-app { background: #f0f2f5; min-height: 100vh; font-family: sans-serif; }
                .driver-header { background: #1a365d; color: white; padding: 20px; text-align: center; }
                .status-pill { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; background: #2d3748; margin-top: 10px; }
                .status-pill.active { background: #276749; }
                .driver-content { padding: 15px; }
                .location-card { background: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;}
                .tasks-section { background: white; padding: 15px; border-radius: 12px; min-height: 200px; }
                .voter-card { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
                .voter-card.en_camino { background: #fffcea; }
                .voter-card.en_destino { background: #f0fff4; }
                .voter-info p { margin: 0; font-size: 0.8rem; color: #666; }
                .btn-group-vertical { display: flex; flexDirection: column; gap: 8px; }
                .btn-recoger { background: #3182ce; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer;}
                .btn-destino { background: #38a169; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer;}
                .btn-nav { background: #805ad5; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer;}
                .status-label { font-size: 0.8rem; color: #b7791f; font-weight: 600; }
                .status-label.delivered { color: #2f855a; }
                .empty-state { text-align: center; color: #999; padding-top: 50px; }
                .instruction-box { margin-top: 20px; padding: 15px; background: #fff3cd; color: #856404; border-radius: 8px; font-size: 0.8rem;}
                .instruction-box ul { margin: 5px 0 0 15px; padding: 0; }
            `}</style>
        </div>
    );
};

export default ChoferTracking;
