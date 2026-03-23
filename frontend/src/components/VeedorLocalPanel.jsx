import React, { useState, useEffect } from 'react';

const VeedorLocalPanel = ({ user }) => {
    const [votantes, setVotantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVotantes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/logistica/veedor/mis-votantes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar votantes');
            const data = await response.json();
            setVotantes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVotantes();
        // Polling cada 60 segundos para refrescar estados de choferes
        const interval = setInterval(fetchVotantes, 60000);
        return () => clearInterval(interval);
    }, []);

    const marcarVoto = async (votanteId) => {
        if (!window.confirm("¿Confirmar que esta persona ya votó?")) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/logistica/marcar-voto`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ votante_id: votanteId })
            });

            if (response.ok) {
                fetchVotantes();
            } else {
                alert("Error al registrar el voto");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusBadge = (estado) => {
        switch (estado) {
            case 'en_camino': return <span className="badge badge-warning">🚕 En camino</span>;
            case 'en_destino': return <span className="badge badge-success">📍 En Local</span>;
            case 'voto': return <span className="badge badge-primary">✅ Votó</span>;
            default: return <span className="badge badge-secondary">⚪ Pendiente</span>;
        }
    };

    if (loading && votantes.length === 0) return <div className="p-4">Cargando datos de mesa...</div>;

    return (
        <div className="veedor-panel p-4">
            <div className="header-panel mb-4">
                <h2>📋 Control de Mesa</h2>
                <p>Monitoreo de llegada y registro de voto en tiempo real.</p>
                <div className="mesa-info">
                    {votantes.length > 0 ? (
                        <>
                            <strong>📍 Local:</strong> {user.veedor_local_nombre || 'Asignado'}<br/>
                            <strong>🏢 Mesas:</strong> {Array.isArray(user.veedor_mesas) ? user.veedor_mesas.join(', ') : '-'}
                        </>
                    ) : (
                        <span>Sin mesas asignadas o cargando...</span>
                    )}
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="voter-grid">
                {votantes.length === 0 ? (
                    <div className="empty-state">No hay votantes registrados en las mesas asignadas.</div>
                ) : (
                    <table className="table-sigel">
                        <thead>
                            <tr>
                                <th>Mesa</th>
                                <th>Nombre y Apellido</th>
                                <th>Cédula</th>
                                <th>Estado Logística</th>
                                <th>Chofer Asignado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {votantes.map(v => (
                                <tr key={v.id} className={v.estado === 'voto' ? 'row-voted' : ''}>
                                    <td><strong>{v.mesa}</strong></td>
                                    <td>{v.nombre}</td>
                                    <td>{v.cedula}</td>
                                    <td>{getStatusBadge(v.estado)}</td>
                                    <td>
                                        {v.chofer ? (
                                            <div className="chofer-info">
                                                <span>{v.chofer.nombre}</span><br/>
                                                <small>{v.chofer.telefono}</small>
                                            </div>
                                        ) : <span className="text-muted">-</span>}
                                    </td>
                                    <td>
                                        {v.estado !== 'voto' ? (
                                            <button 
                                                className="btn-voto"
                                                onClick={() => marcarVoto(v.id)}
                                            >
                                                Registrar Voto ✅
                                            </button>
                                        ) : (
                                            <span className="text-success font-weight-bold">COMPLETADO</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .veedor-panel { background: #f8fafc; min-height: 80vh; border-radius: 12px; }
                .header-panel h2 { color: #1e293b; margin-bottom: 5px; }
                .mesa-info { background: #fff; padding: 10px 15px; border-radius: 8px; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: inline-block; margin-top: 10px; }
                
                .table-sigel { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .table-sigel th { background: #f1f5f9; padding: 12px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
                .table-sigel td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                
                .badge { padding: 4px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
                .badge-warning { background: #fef3c7; color: #92400e; }
                .badge-success { background: #dcfce7; color: #166534; }
                .badge-primary { background: #dbeafe; color: #1e40af; }
                .badge-secondary { background: #f1f5f9; color: #475569; }
                
                .btn-voto { background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
                .btn-voto:hover { background: #059669; transform: translateY(-1px); }
                
                .row-voted { background-color: #f0fdf4; }
                .chofer-info small { color: #64748b; }
                .empty-state { padding: 40px; text-align: center; color: #64748b; font-style: italic; }
            `}</style>
        </div>
    );
};

export default VeedorLocalPanel;
