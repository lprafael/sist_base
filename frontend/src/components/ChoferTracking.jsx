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
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const watchId = useRef(null);

    useEffect(() => {
        validateToken();
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
    }, [token]);

    const validateToken = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
            const res = await fetch(`${API_BASE_URL}/api/logistica/tracking/update`, {
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

    const startTracking = async () => {
        try {
            // Intentar usar Capacitor Background Geolocation si está disponible
            let BackgroundNavigation;
            try {
                const mod = await import('@capacitor-community/background-geolocation');
                BackgroundNavigation = mod.BackgroundGeolocation;
            } catch (e) {
                console.log("Background Geolocation not available, falling back to standard");
            }

            if (BackgroundNavigation) {
                // Configuración para tracking permanente (Día D)
                const watcherId = await BackgroundNavigation.addWatcher(
                    {
                        backgroundMessage: "SIGEL está transmitiendo tu ubicación para la logística.",
                        backgroundTitle: "Seguimiento Activo",
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: 10 // metros
                    },
                    (location, error) => {
                        if (error) {
                            console.error(error);
                            return;
                        }
                        if (location) {
                            setCoords({ lat: location.latitude, lng: location.longitude });
                            sendLocation(location.latitude, location.longitude);
                            setStatus('📡 Transmitiendo (Segundo Plano)');
                        }
                    }
                );
                watchId.current = watcherId;
                setIsTracking(true);
            } else if ("geolocation" in navigator) {
                // Fallback a Web Geolocation
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
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
                setIsTracking(true);
            } else {
                setStatus('GPS no disponible en este dispositivo.');
            }
        } catch (err) {
            console.error("Error starting tracking:", err);
            setStatus('Error al iniciar GPS.');
        }
    };

    const stopTracking = async () => {
        if (!watchId.current) return;

        try {
            let BackgroundNavigation;
            try {
                const mod = await import('@capacitor-community/background-geolocation');
                BackgroundNavigation = mod.BackgroundGeolocation;
            } catch(e) {}

            if (BackgroundNavigation && typeof watchId.current === 'string') {
                await BackgroundNavigation.removeWatcher({ id: watchId.current });
            } else if (typeof watchId.current === 'number') {
                navigator.geolocation.clearWatch(watchId.current);
            }
            watchId.current = null;
            setIsTracking(false);
            setStatus('🛑 Seguimiento detenido.');
        } catch (err) {
            console.error("Error stopping tracking:", err);
        }
    };

    const sendLocation = async (lat, lng) => {
        const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
        try {
            await fetch(`${API_BASE_URL}/api/logistica/tracking/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lat, lng })
            });
        } catch (e) {
            console.error("Error sending location", e);
        }
    };

    const fetchVotantes = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
            const res = await fetch(`${API_BASE_URL}/api/logistica/tracking/votantes?token=${token}`);
            if (res.ok) {
                const data = await res.json();
                setVotantes(data);
            }
        } catch (err) {
            console.error("Error fetching tasks", err);
        }
    };

    const marcarTraslado = async (vid) => {
        const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/logistica/marcar-traslado`, {
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
        const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/logistica/marcar-destino`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, votante_id: vid })
        });
        if (res.ok) {
            alert("Llegada confirmada");
            fetchVotantes();
        }
    };

    const cancelarTraslado = async (vid) => {
        if (!window.confirm("¿Seguró que deseas cancelar este traslado? El votante volverá a estar pendiente.")) return;
        const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/logistica/cancelar-traslado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, votante_id: vid })
        });
        if (res.ok) {
            alert("Traslado cancelado");
            fetchVotantes();
        }
    };

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
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
                {installPrompt && (
                    <button className="btn-install-app" onClick={handleInstallClick}>
                        📲 Instalar App SIGEL
                    </button>
                )}
            </header>

            <main className="driver-content">
                <section className="location-card">
                    <h3>Mi Ubicación</h3>
                    {coords ? (
                        <>
                            <p>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                            <button className="btn-stop-tracking" onClick={isTracking ? stopTracking : startTracking}>
                                {isTracking ? "🛑 Detener Seguimiento" : "📡 Iniciar Seguimiento"}
                            </button>
                        </>
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
                                            <button className="btn-cancel" onClick={() => cancelarTraslado(v.id)}>
                                                Cancelar ❌
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
                .btn-cancel { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 15px; border-radius: 6px; font-weight: 600; cursor: pointer;}
                .btn-cancel:hover { background: #fecaca;}
                .btn-install-app { background: #2b6cb0; color: white; border: none; padding: 10px 20px; border-radius: 50px; font-weight: 700; cursor: pointer; margin-top: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 80%; }
                .btn-install-app:hover { background: #2c5282; }
                .btn-stop-tracking { background: #e53e3e; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 10px; width: 100%; }
                .btn-stop-tracking:hover { background: #c53030; }
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
