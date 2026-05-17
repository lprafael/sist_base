import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const PadronImport = () => {
    const [elecciones, setElecciones] = useState([]);
    const [selectedEleccion, setSelectedEleccion] = useState('');
    const [csvData, setCsvData] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        const fetchElecciones = async () => {
            const res = await authFetch('/api/electoral/elecciones');
            if (res.ok) {
                const data = await res.json();
                setElecciones(data);
                if (data.length > 0) setSelectedEleccion(data[0].id);
            }
        };
        fetchElecciones();
    }, []);

    const handleImport = async () => {
        if (!selectedEleccion) { alert('Selecciona una elección'); return; }
        if (!csvData) { alert('Pega los datos CSV'); return; }

        setLoading(true);
        try {
            // Parse CSV simple (Cédula, Nombres, Apellidos, Dpto, Dist, Local, Mesa, Orden)
            const lines = csvData.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const jsonArray = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = values[i];
                });
                return obj;
            });

            const response = await authFetch(`/api/electoral/padron/import?eleccion_id=${selectedEleccion}`, {
                method: 'POST',
                body: JSON.stringify(jsonArray)
            });

            if (response.ok) {
                const resData = await response.json();
                setResults(resData);
                alert(`Importación completada: ${resData.imported} registros.`);
            } else {
                const err = await response.json();
                alert('Error: ' + (err.detail || 'Ocurrió un error'));
            }
        } catch (e) {
            console.error(e);
            alert('Error al procesar el archivo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="padron-import-container fade-in">
            <header className="section-header">
                <h2>📥 Importar Padrón Electoral</h2>
                <p>Carga masiva de personas y datos electorales para una elección específica.</p>
            </header>

            <div className="card" style={{ padding: '24px' }}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">1. Seleccionar Elección de Destino</label>
                    <select 
                        value={selectedEleccion} 
                        onChange={e => setSelectedEleccion(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                        <option value="">-- Seleccionar --</option>
                        {elecciones.map(e => <option key={e.id} value={e.id}>{e.nombre} ({e.partido})</option>)}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">2. Pegar Datos CSV (Sin cabeceras o con cabeceras: cedula, nombres, apellidos, departamento_id, distrito_id, local_id, mesa, orden)</label>
                    <textarea
                        value={csvData}
                        onChange={e => setCsvData(e.target.value)}
                        placeholder="cedula,nombres,apellidos,departamento_id,distrito_id,local_id,mesa,orden\n123456,Juan,Perez,11,2,10,5,123"
                        style={{ width: '100%', height: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                    />
                </div>

                <button 
                    className="btn-primary" 
                    onClick={handleImport} 
                    disabled={loading}
                    style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
                >
                    {loading ? '⏳ Importando registros...' : '🚀 Iniciar Importación Masiva'}
                </button>

                {results && (
                    <div className="results-box" style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                        <strong>✅ Resultado:</strong> {results.imported} registros procesados correctamente.
                    </div>
                )}
            </div>

            <div className="instructions-card card" style={{ marginTop: '24px', padding: '24px', background: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ℹ️ Instrucciones y Flexibilidad Multiorganización
                </h4>
                <ul style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '8px' }}>
                        Los encabezados del CSV deben ser exactos: <strong>cedula, nombres, apellidos, departamento_id, distrito_id, local_id, mesa, orden</strong>.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>Soporte Multi-Organización:</strong> El sistema admite padrones de cualquier partido (ANR, PLRA), movimientos independientes, gremios, sindicatos, clubes o cooperativas. Solo crea el proceso en el panel de <em>Gestión de Elecciones</em> y selecciónalo arriba.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>Flexibilidad Geográfica:</strong> Si tu organización es local (ej. Cooperativa, Gremio Universitario) y no se distribuye por departamentos tradicionales, puedes cargar todos los electores con <strong>departamento_id = 0</strong> y <strong>distrito_id = 0</strong> (Asunción / Contenedor General), asignándoles locales y mesas ficticias según corresponda.
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Si la cédula ya existe en la base de datos global de personas, se mantendrán sus datos de contacto de forma íntegra y solo se creará su vinculación en el padrón de esta elección.
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default PadronImport;
