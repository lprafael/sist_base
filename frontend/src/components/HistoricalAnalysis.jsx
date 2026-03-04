import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './HistoricalAnalysis.css';

const HistoricalAnalysis = ({ user }) => {
    const [dptoId, setDptoId] = useState(user.departamento_id || 11); // Central por defecto
    const [distId, setDistId] = useState(user.distrito_id ? String(user.distrito_id) : "");
    const [bancas, setBancas] = useState(12);
    const [data, setData] = useState(null);
    const [electos, setElectos] = useState(null);
    const [estimates, setEstimates] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [catalog, setCatalog] = useState({ dptos: [], dists: [] });

    const isAdmin = user.rol === 'admin';

    useEffect(() => {
        if (isAdmin) fetchCatalog();
    }, []);

    // Carga de Distritos (Solo cuando cambia el Departamento)
    useEffect(() => {
        if (isAdmin && dptoId) {
            fetchDistritos(dptoId);
        }
    }, [dptoId]);

    // Carga de Datos (Cuando hay una selección completa)
    useEffect(() => {
        if (dptoId && distId) {
            fetchData();
        }
    }, [dptoId, distId, bancas]);

    const fetchCatalog = async () => {
        try {
            const resp = await authFetch('/electoral/geo/stats/departamentos');
            if (resp.ok) {
                const dptos = await resp.json();
                setCatalog(prev => ({ ...prev, dptos }));
            }
        } catch (e) { console.error("Error catalog:", e); }
    };

    const fetchDistritos = async (did) => {
        try {
            const resp = await authFetch(`/electoral/geo/stats/distritos/${did}`);
            if (resp.ok) {
                const dists = await resp.json();
                setCatalog(prev => ({ ...prev, dists }));
            }
        } catch (e) { console.error("Error distritos:", e); }
    };

    const fetchData = async () => {
        if (!dptoId || !distId) return;
        setLoading(true);
        setError(null);
        try {
            const [respData, respEstimates, respElectos] = await Promise.all([
                authFetch(`/electoral/analisis/historico/${dptoId}/${distId}`),
                authFetch(`/electoral/analisis/estimativo/${dptoId}/${distId}?bancas=${bancas}`),
                authFetch(`/electoral/analisis/electos/${dptoId}/${distId}`)
            ]);

            if (!respData.ok || !respEstimates.ok || !respElectos.ok) throw new Error("Error al cargar datos");

            const resultsData = await respData.json();
            const estData = await respEstimates.json();
            const electData = await respElectos.json();

            setData(resultsData);
            setEstimates(estData);
            setElectos(electData);
        } catch (e) {
            console.error(e);
            setError("No se pudieron cargar los datos históricos para este distrito.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-results">📊 Analizando historia electoral...</div>;
    // El mensaje de error también lo movemos dentro del layout principal si prefieres, 
    // pero por ahora mantenemos el flujo de error separado.
    if (error) return <div className="error-box">{error}</div>;

    return (
        <div className="historical-analysis FadeIn">
            <header className="analysis-header">
                <div className="header-main">
                    <h2>📊 Comparativa de Resultados Históricos</h2>
                    <p>Análisis de Intendencia y Junta Municipal (1996 - 2023)</p>
                </div>
                <div className="analysis-controls">
                    <div className="control-group">
                        <label>📍 Departamento:</label>
                        <select
                            value={dptoId}
                            onChange={e => {
                                setDptoId(parseInt(e.target.value));
                                setDistId("");
                                setData(null);
                                setEstimates(null);
                                setElectos(null);
                            }}
                            disabled={!isAdmin}
                        >
                            {!isAdmin && <option value={dptoId}>Heredado de Perfil</option>}
                            {isAdmin && catalog.dptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>

                    <div className="control-group">
                        <label>🏘️ Distrito:</label>
                        <select
                            value={String(distId || "")}
                            onChange={e => setDistId(e.target.value)}
                            disabled={!isAdmin || !dptoId}
                        >
                            <option value="">-- Seleccione Distrito --</option>
                            {catalog.dists.map(d => (
                                <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="control-group">
                        <label>🪑 Bancas (Junta):</label>
                        <select value={bancas} onChange={e => setBancas(parseInt(e.target.value))}>
                            <option value={9}>9 Concejales</option>
                            <option value={12}>12 Concejales</option>
                            <option value={24}>24 Concejales (Asunción)</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="analysis-grid">
                {!distId ? (
                    <div className="select-hint card">
                        <h3>📍 Distrito no seleccionado</h3>
                        <p>Por favor, selecciona un distrito en el panel superior para visualizar el historial electoral y los estimativos de votos.</p>
                    </div>
                ) : (
                    <>
                        {/* Panel de Estimativos */}
                        <div className="estimates-panel card">
                            <h3>🎯 Estimación de Votos Necesarios</h3>
                            <div className="estimates-container">
                                {estimates && Object.keys(estimates).map(cargo => (
                                    <div key={cargo} className="estimate-card">
                                        <h4>{cargo === 'INTENDENTE' ? '🏙️ Intendencia' : '👥 Junta Municipal'}</h4>
                                        <div className="estimate-stats">
                                            <div className="est-stat">
                                                <span>Promedio Histórico:</span>
                                                <strong>{estimates[cargo].promedio_historico.toLocaleString()}</strong>
                                            </div>
                                            <div className="est-stat">
                                                <span>Última Elección:</span>
                                                <strong>{estimates[cargo].ultimo_periodo.toLocaleString()}</strong>
                                            </div>
                                            <div className="est-stat highlighted">
                                                <span>Mínimo Recomendado:</span>
                                                <strong className="goal">{estimates[cargo].recomendado.toLocaleString()}</strong>
                                            </div>
                                        </div>
                                        <p className="est-note">
                                            {cargo === 'INTENDENTE'
                                                ? "* Basado en los votos del ganador anterior."
                                                : `* Basado en el costo real del último electo (D'Hondt) para ${bancas} bancas.`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comparativa por años */}
                        <div className="history-details card">
                            <h3>📜 Historial Detallado por Periodo</h3>
                            <div className="years-list">
                                {data && Object.keys(data).sort((a, b) => b - a).map(year => (
                                    <details key={year} className="year-details">
                                        <summary>
                                            <span className="year-badge">{year}</span>
                                            <span>Resultados y Autoridades Electas</span>
                                        </summary>
                                        <div className="period-content">
                                            {/* Sub-tabs o secciones para Resultados vs Electos */}
                                            <div className="period-section">
                                                <h4>🏆 Resumen de Ganadores</h4>
                                                <div className="electos-grid">
                                                    {electos?.[year] && Object.keys(electos[year]).map(cargo => {
                                                        // Filtrar solo los electos que entraron según la cantidad de bancas (solo aplica a Junta)
                                                        const electosFiltrados = cargo === 'JUNTA MUNICIPAL'
                                                            ? electos[year][cargo].filter(el => el.orden <= bancas)
                                                            : electos[year][cargo];

                                                        return (
                                                            <div key={cargo} className="cargo-electos">
                                                                <h5>{cargo} {cargo === 'JUNTA MUNICIPAL' ? `(Titulares: ${bancas})` : ''}</h5>
                                                                <div className="electos-list">
                                                                    {electosFiltrados.map((el, i) => (
                                                                        <div key={i} className={`electo-item ${i === 0 ? 'top-voted' : ''}`}>
                                                                            <span className="el-pos">{el.orden || (i + 1)}°</span>
                                                                            <div className="el-info">
                                                                                <strong>{el.nombre} {i === 0 && cargo === 'JUNTA MUNICIPAL' ? '🌟' : ''}</strong>
                                                                                <span>{el.lista} • {el.votos.toLocaleString()} votos</span>
                                                                                {el.votos_preferenciales > 0 && (
                                                                                    <small className="preferential">({el.votos_preferenciales} pref.)</small>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="period-results">
                                                <h4>🗳️ Detalle de Votación por Lista</h4>
                                                {Object.keys(data[year]).map(cargo => (
                                                    <div key={cargo} className="cargo-results-box">
                                                        <h5>{cargo}</h5>
                                                        <table className="results-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Lista/Partido</th>
                                                                    {cargo === 'JUNTA MUNICIPAL' && <th className="cell-center" style={{ textAlign: 'center' }}>Cant. Concejales</th>}
                                                                    <th className="cell-right">Votos</th>
                                                                    <th>%</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {data[year][cargo].slice(0, 10).map((res, i) => {
                                                                    const totalVotosCargo = data[year][cargo].reduce((acc, curr) => acc + curr.votos, 0);
                                                                    const percent = ((res.votos / totalVotosCargo) * 100).toFixed(1);

                                                                    let cantConcejales = 0;
                                                                    if (cargo === 'JUNTA MUNICIPAL' && electos?.[year]?.[cargo]) {
                                                                        cantConcejales = electos[year][cargo]
                                                                            .filter(el => el.orden <= bancas && el.lista === res.siglas)
                                                                            .length;
                                                                    }

                                                                    return (
                                                                        <tr key={i} className={i === 0 ? 'winner-row' : ''}>
                                                                            <td>
                                                                                <div className="party-info">
                                                                                    <span className="party-siglas">{res.siglas}</span>
                                                                                    <span className="party-name">{res.nombre}</span>
                                                                                </div>
                                                                            </td>
                                                                            {cargo === 'JUNTA MUNICIPAL' && (
                                                                                <td className="cell-center" style={{ textAlign: 'center' }}>
                                                                                    {cantConcejales > 0 ? (
                                                                                        <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>{cantConcejales}</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#94a3b8' }}>-</span>
                                                                                    )}
                                                                                </td>
                                                                            )}
                                                                            <td className="cell-right"><strong>{res.votos.toLocaleString()}</strong></td>
                                                                            <td className="cell-percent">{percent}%</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HistoricalAnalysis;
