import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import './VoterRegistration.css'; // Reutilizamos estilos si es posible

const PlraPadronConsult = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 3) {
                performSearch();
            } else {
                setSearchResults([]);
                setMessage({ type: '', text: '' });
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const response = await authFetch(`/electoral/plra/search?query=${searchQuery}`);
            const data = await response.json();
            setSearchResults(data);

            if (data.length === 0) {
                setMessage({ type: 'warning', text: 'No se encontraron resultados en el padrón PLRA.' });
            } else {
                setMessage({ type: '', text: '' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al buscar en el padrón PLRA.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="voter-registration-container">
            <header className="section-header">
                <h2>🔍 Consulta Padrón PLRA</h2>
                <p>Busca ciudadanos afiliados al PLRA por nombre o número de cédula.</p>
            </header>

            <section className="search-section card">
                <form onSubmit={(e) => { e.preventDefault(); performSearch(); }}>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Buscar por Cédula o Nombre (mín. 3 caracteres)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="search-btn" disabled={loading}>
                            {loading ? 'Buscando...' : '🔍 Buscar'}
                        </button>
                    </div>
                </form>

                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="results-list">
                        <table className="padron-table">
                            <thead>
                                <tr>
                                    <th>CI</th>
                                    <th>Nombre Completo</th>
                                    <th>Datos Personales</th>
                                    <th>Ubicación / Territorio</th>
                                    <th>Local de Votación</th>
                                    <th>Info Partidaria</th>
                                    <th>Dirección</th>
                                </tr>
                            </thead>
                            <tbody>
                                {searchResults.map((person) => (
                                    <tr key={person.cedula}>
                                        <td className="ci-cell">{parseInt(person.cedula).toLocaleString('es-PY')}</td>
                                        <td>
                                            <strong>{person.nombre} {person.apellido}</strong>
                                            <div className="sexo-tag">{person.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                                        </td>
                                        <td>
                                            <div className="small-text">
                                                <strong>Nac:</strong> {person.fec_nac ? new Date(person.fec_nac).toLocaleDateString('es-PY') : '-'}
                                                <br />
                                                <strong>Insc:</strong> {person.fec_inscri ? new Date(person.fec_inscri).toLocaleDateString('es-PY') : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="small-text">
                                                <span className="location-tag">{person.departamento_nombre}</span>
                                                <span className="location-sub">{person.distrito_nombre}</span>
                                                <div className="territorio-detalle">
                                                    <strong>Zona:</strong> {person.zona_nombre || '-'}
                                                    <br />
                                                    <strong>Comité:</strong> {person.comite_nombre || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="small-text">
                                            <div><strong>Grales:</strong> {person.local_generales}</div>
                                            {person.local_interna && person.local_interna !== person.local_generales && (
                                                <div className="interna-tag"><strong>Interna:</strong> {person.local_interna}</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="afiliaciones-tag">
                                                {person.afiliacion_plra_2025 === 'S' && <span className="badge plra">PLRA 2025</span>}
                                                {person.voto_anr === 'S' && <span className="badge anr">VOTO ANR</span>}
                                            </div>
                                            <div className="afiliaciones-txt">{person.afiliaciones}</div>
                                        </td>
                                        <td className="small-text">{person.direcc || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <style jsx>{`
                .padron-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 1rem;
                    font-size: 0.9rem;
                }
                .padron-table th, .padron-table td {
                    padding: 0.75rem;
                    text-align: left;
                    border-bottom: 1px solid #eee;
                }
                .padron-table th {
                    background: #f8f9fa;
                    font-weight: 600;
                    color: #444;
                }
                .ci-cell {
                    font-family: monospace;
                    font-weight: bold;
                    color: var(--primary-color, #2c3e50);
                    white-space: nowrap;
                }
                .sexo-tag {
                    font-size: 0.75rem;
                    color: #777;
                }
                .territorio-detalle {
                    margin-top: 4px;
                    border-top: 1px dashed #ddd;
                    padding-top: 4px;
                    font-size: 0.75rem;
                }
                .afiliaciones-txt {
                    font-size: 0.7rem;
                    color: #666;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .location-tag {
                    display: block;
                    font-weight: 500;
                }
                .location-sub {
                    font-size: 0.8rem;
                    color: #666;
                }
                .small-text {
                    font-size: 0.85rem;
                    line-height: 1.2;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    margin-right: 4px;
                }
                .badge.plra { background: #e3f2fd; color: #0d47a1; border: 1px solid #bbdefb; }
                .badge.anr { background: #ffebee; color: #b71c1c; border: 1px solid #ffcdd2; }
                .interna-tag {
                    font-size: 0.75rem;
                    color: #ef5350;
                    font-style: italic;
                    margin-top: 4px;
                }
            `}</style>
        </div>
    );
};

export default PlraPadronConsult;
