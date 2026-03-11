import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './PadronImpresion.css';

const PadronImpresion = ({ user }) => {
    const [filters, setFilters] = useState({
        departamento_id: user.departamento_id || '',
        distrito_id: user.distrito_id || '',
        local_id: '',
        mesa: ''
    });
    const [options, setOptions] = useState({
        departamentos: [],
        distritos: [],
        locales: [],
        mesas: []
    });
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [message, setMessage] = useState('');
    const [distritoStats, setDistritoStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        fetchDepartamentos();
        if (user.departamento_id) {
            fetchDistritos(user.departamento_id);
        }
        if (user.distrito_id) {
            fetchLocales(user.distrito_id, user.departamento_id);
            fetchDistritoStats(user.distrito_id);
        }
    }, [user]);

    const fetchDistritoStats = async (distId) => {
        if (!distId) {
            setDistritoStats(null);
            return;
        }
        setLoadingStats(true);
        try {
            const depId = filters.departamento_id || user.departamento_id;
            let url = `/electoral/distritos/${distId}/stats`;
            if (depId) url += `?departamento_id=${depId}`;

            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                setDistritoStats(data);
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchDepartamentos = async () => {
        try {
            const res = await authFetch('/electoral/departamentos');
            if (res.ok) {
                const data = await res.json();
                setOptions(prev => ({ ...prev, departamentos: data }));
            }
        } catch (e) { console.error(e); }
    };

    const fetchDistritos = async (depId) => {
        try {
            const res = await authFetch(`/electoral/distritos?departamento_id=${depId}`);
            if (res.ok) {
                const data = await res.json();
                setOptions(prev => ({ ...prev, distritos: data }));
            }
        } catch (e) { console.error(e); }
    };

    const fetchLocales = async (distId, depId = null) => {
        try {
            const actualDepId = depId || filters.departamento_id || user.departamento_id;
            let url = `/electoral/locales?distrito_id=${distId}`;
            if (actualDepId) url += `&departamento_id=${actualDepId}`;

            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                setOptions(prev => ({ ...prev, locales: data }));
            }
        } catch (e) { console.error(e); }
    };

    const fetchMesas = async (localId) => {
        if (!localId) return;
        try {
            const res = await authFetch(`/electoral/locales/${localId}/mesas`);
            if (res.ok) {
                const data = await res.json();
                setOptions(prev => ({ ...prev, mesas: data }));
            }
        } catch (e) { console.error(e); }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));

        if (name === 'departamento_id') {
            setFilters(prev => ({ ...prev, distrito_id: '', local_id: '', mesa: '' }));
            fetchDistritos(value);
        } else if (name === 'distrito_id') {
            setFilters(prev => ({ ...prev, local_id: '', mesa: '' }));
            fetchLocales(value, filters.departamento_id);
            fetchDistritoStats(value);
        } else if (name === 'local_id') {
            setFilters(prev => ({ ...prev, mesa: '' }));
            fetchMesas(value);
        }
    };

    const handleSearch = async () => {
        if (!filters.distrito_id) {
            setMessage('Debes seleccionar al menos un distrito.');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            let url = `/electoral/padron/reporte?distrito_id=${filters.distrito_id}`;
            if (filters.departamento_id) url += `&departamento_id=${filters.departamento_id}`;
            if (filters.local_id) url += `&local_id=${filters.local_id}`;
            if (filters.mesa) url += `&mesa=${filters.mesa}`;

            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                if (data.length === 0) setMessage('No se encontraron registros.');
            } else {
                setMessage('Error al obtener el padrón.');
            }
        } catch (e) {
            setMessage('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="padron-impresion">
            <header className="section-header no-print">
                <h2>🖨️ Impresión de Padrón</h2>
                <p>Genera reportes por localidad, local de votación y mesa para impresión.</p>
            </header>

            <div className="filter-card card no-print">
                <div className="filter-grid">
                    <div className="filter-group">
                        <label>Departamento</label>
                        <select
                            name="departamento_id"
                            value={filters.departamento_id}
                            onChange={handleFilterChange}
                            disabled={!!user.departamento_id && user.rol !== 'admin'}
                        >
                            <option value="">Seleccione...</option>
                            {options.departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Distrito / Localidad</label>
                        <select
                            name="distrito_id"
                            value={filters.distrito_id}
                            onChange={handleFilterChange}
                            disabled={!!user.distrito_id && user.rol !== 'admin'}
                        >
                            <option value="">Seleccione...</option>
                            {options.distritos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Local de Votación</label>
                        <select name="local_id" value={filters.local_id} onChange={handleFilterChange}>
                            <option value="">Todos los locales</option>
                            {options.locales.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Mesa</label>
                        <select name="mesa" value={filters.mesa} onChange={handleFilterChange}>
                            <option value="">Todas las mesas</option>
                            {options.mesas.map(m => <option key={m} value={m}>Mesa {m}</option>)}
                        </select>
                    </div>
                </div>
                <div className="filter-actions">
                    <button className="search-btn" onClick={handleSearch} disabled={loading}>
                        {loading ? 'Buscando...' : '🔍 Consultar Padrón'}
                    </button>
                    {results.length > 0 && (
                        <button className="print-btn" onClick={handlePrint}>
                            🖨️ Imprimir Reporte
                        </button>
                    )}
                </div>

                {distritoStats && (
                    <div className="stats-indicator">
                        <div className="stat-item">
                            <span className="stat-value">{distritoStats.total_votantes.toLocaleString()}</span>
                            <span className="stat-label">Votantes en Padron</span>
                        </div>
                        <div className="divider">|</div>
                        <div className="stat-item">
                            <span className="stat-value">{distritoStats.total_locales}</span>
                            <span className="stat-label">Locales habilitados</span>
                        </div>
                        <div className="divider">|</div>
                        <div className="stat-item">
                            <span className="stat-value">{distritoStats.total_mesas}</span>
                            <span className="stat-label">Mesas disponibles</span>
                        </div>
                    </div>
                )}
            </div>

            {message && <div className="alert warning no-print">{message}</div>}

            {results.length > 0 && (
                <div className="printable-report">
                    <div className="report-header">
                        <div className="report-logo">
                            <img src="/imágenes/Logo_chico.PNG" alt="SIGEL" />
                        </div>
                        <div className="report-title">
                            <h3>PADRÓN ELECTORAL - SIGEL</h3>
                            <p>
                                {filters.distrito_id && options.distritos.find(d => d.id == filters.distrito_id)?.nombre}
                                {filters.local_id && ` | ${options.locales.find(l => l.id == filters.local_id)?.nombre}`}
                                {filters.mesa && ` | Mesa: ${filters.mesa}`}
                            </p>
                            <span className="report-date">Fecha de impresión: {new Date().toLocaleString()}</span>
                        </div>
                    </div>

                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Cédula</th>
                                <th>Apellidos y Nombres</th>
                                <th>Mesa</th>
                                <th>Local de Votación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, idx) => (
                                <tr key={r.cedula || idx}>
                                    <td>{r.orden}</td>
                                    <td>{r.cedula}</td>
                                    <td className="text-left">{r.apellidos}, {r.nombres}</td>
                                    <td>{r.mesa}</td>
                                    <td className="text-left">{r.nombre_local}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="report-footer">
                        <p>Total de electores encontrados: {results.length}</p>
                        <p className="page-break-hint">SIGEL - Sistema de Gestión Electoral - Todos los derechos reservados</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PadronImpresion;
