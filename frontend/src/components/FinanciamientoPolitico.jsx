import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FinanciamientoPolitico.css';

const FinanciamientoPolitico = ({ user }) => {
    const [candidatoId, setCandidatoId] = useState(null);
    const [tipoFinanciamiento, setTipoFinanciamiento] = useState("Subsidio Electoral"); // Por defecto campaña
    const [activeTab, setActiveTab] = useState("ingresos");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data states
    const [ingresos, setIngresos] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [cumplimiento, setCumplimiento] = useState([]);
    const [resumen, setResumen] = useState({
        total_ingresos: 0,
        total_egresos: 0,
        balance: 0,
        cumplimiento_porcentaje: 0
    });

    // Form states
    const [newIngreso, setNewIngreso] = useState({
        monto: '', fecha: new Date().toISOString().split('T')[0], origen: '',
        nombre_aportante: '', ci_ruc_aportante: '', descripcion: '', comprobante_nro: '',
        tipo_comprobante: 'Recibo', timbrado: ''
    });
    const [newEgreso, setNewEgreso] = useState({
        monto: '', fecha: new Date().toISOString().split('T')[0], categoria: '',
        descripcion: '', proveedor_nombre: '', proveedor_ruc: '', factura_nro: '',
        tipo_comprobante: 'Factura', timbrado: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchCandidatoId();
    }, []);

    useEffect(() => {
        if (candidatoId) {
            fetchAllData();
        }
    }, [candidatoId, tipoFinanciamiento]);

    const fetchCandidatoId = async () => {
        try {
            const res = await axios.get(`${API_URL}/financiamiento/me/candidato`, { headers });
            if (res.data && res.data.candidato_id) {
                setCandidatoId(res.data.candidato_id);
            } else {
                setError("Tu usuario no tiene un candidato asignado. Para gestionar finanzas, debes estar vinculado a una candidatura.");
                setLoading(false);
            }
        } catch (err) {
            console.error("Error identificando candidato:", err);
            setError("Error al conectar con el servidor. Verifica tu conexión.");
            setLoading(false);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [resIngresos, resEgresos, resCumplimiento, resResumen] = await Promise.all([
                axios.get(`${API_URL}/financiamiento/ingresos/${candidatoId}?tipo=${tipoFinanciamiento}`, { headers }),
                axios.get(`${API_URL}/financiamiento/egresos/${candidatoId}?tipo=${tipoFinanciamiento}`, { headers }),
                axios.get(`${API_URL}/financiamiento/cumplimiento/${candidatoId}?tipo=${tipoFinanciamiento}`, { headers }),
                axios.get(`${API_URL}/financiamiento/resumen/${candidatoId}?tipo=${tipoFinanciamiento}`, { headers })
            ]);

            setIngresos(Array.isArray(resIngresos.data) ? resIngresos.data : []);
            setEgresos(Array.isArray(resEgresos.data) ? resEgresos.data : []);
            setCumplimiento(Array.isArray(resCumplimiento.data) ? resCumplimiento.data : []);
            
            if (resResumen.data && !Array.isArray(resResumen.data)) {
                setResumen(resResumen.data);
            }
        } catch (err) {
            console.error("Error al cargar datos de financiamiento:", err);
            setIngresos([]);
            setEgresos([]);
            setCumplimiento([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIngreso = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/financiamiento/ingresos`, {
                ...newIngreso,
                id_candidato: candidatoId,
                tipo_financiamiento: tipoFinanciamiento,
                monto: parseFloat(newIngreso.monto)
            }, { headers });
            setNewIngreso({
                monto: '', fecha: new Date().toISOString().split('T')[0], origen: '',
                nombre_aportante: '', ci_ruc_aportante: '', descripcion: '', comprobante_nro: '',
                tipo_comprobante: 'Recibo', timbrado: ''
            });
            fetchAllData();
        } catch (err) {
            alert("Error al registrar ingreso");
        }
    };

    const handleAddEgreso = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/financiamiento/egresos`, {
                ...newEgreso,
                id_candidato: candidatoId,
                tipo_financiamiento: tipoFinanciamiento,
                monto: parseFloat(newEgreso.monto)
            }, { headers });
            setNewEgreso({
                monto: '', fecha: new Date().toISOString().split('T')[0], categoria: '',
                descripcion: '', proveedor_nombre: '', proveedor_ruc: '', factura_nro: '',
                tipo_comprobante: 'Factura', timbrado: ''
            });
            fetchAllData();
        } catch (err) {
            alert("Error al registrar egreso");
        }
    };

    const toggleCumplimiento = async (id, currentStatus) => {
        try {
            await axios.put(`${API_URL}/financiamiento/cumplimiento/${id}`, {
                completado: !currentStatus
            }, { headers });
            fetchAllData();
        } catch (err) {
            alert("Error al actualizar requisito");
        }
    };

    const handleExportSINAFIP = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/financiamiento/export/sinafip/${candidatoId}?tipo=${tipoFinanciamiento}`,
                { headers, responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sinafip_${tipoFinanciamiento.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Error al exportar datos");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
    };

    if (error) return <div className="financiamiento-container"><div className="error-msg">{error}</div></div>;
    if (loading && !candidatoId) return <div>Cargando...</div>;

    return (
        <div className="financiamiento-container fade-in">
            <header className="financiamiento-header">
                <div>
                    <h2>Financiamiento Político</h2>
                    <p>Gestión de rendición de cuentas ante el TSJE</p>
                </div>
                <div className="tipo-selector">
                    <button className="btn-add" style={{marginRight: '10px', background: '#10b981'}} onClick={handleExportSINAFIP}>
                        📥 Exportar SINAFIP
                    </button>
                    <button 
                        className={`tipo-btn ${tipoFinanciamiento === "Subsidio Electoral" ? "active" : ""}`}
                        onClick={() => setTipoFinanciamiento("Subsidio Electoral")}
                    >
                        Subsidio Electoral (Campaña)
                    </button>
                    <button 
                        className={`tipo-btn ${tipoFinanciamiento === "Aporte Estatal" ? "active" : ""}`}
                        onClick={() => setTipoFinanciamiento("Aporte Estatal")}
                    >
                        Aporte Estatal (Anual)
                    </button>
                </div>
            </header>

            <section className="resumen-cards">
                <div className="resumen-card">
                    <h3>Ingresos Totales</h3>
                    <div className="valor positivo">{formatCurrency(resumen.total_ingresos)}</div>
                </div>
                <div className="resumen-card">
                    <h3>Egresos Totales</h3>
                    <div className="valor negativo">{formatCurrency(resumen.total_egresos)}</div>
                </div>
                <div className="resumen-card">
                    <h3>Balance</h3>
                    <div className={`valor ${resumen.balance >= 0 ? "positivo" : "negativo"}`}>
                        {formatCurrency(resumen.balance)}
                    </div>
                </div>
                <div className="resumen-card">
                    <h3>Cumplimiento TSJE</h3>
                    <div className="valor" style={{color: '#1a2a6c'}}>
                        {resumen.cumplimiento_porcentaje.toFixed(1)}%
                    </div>
                </div>
            </section>

            <div className="alert-info" style={{background: '#e0f2fe', padding: '15px', borderRadius: '12px', borderLeft: '5px solid #0ea5e9', marginBottom: '20px', fontSize: '0.9rem'}}>
                <strong>ℹ️ Nota Legal:</strong> El Candidato y el Administrador de Campaña son personal y solidariamente responsables de la veracidad de la información. El uso del sistema <strong>SINAFIP</strong> es obligatorio para la carga oficial.
            </div>

            <main className="tabs-container">
                <div className="tabs-header">
                    <button className={`tab-btn ${activeTab === "ingresos" ? "active" : ""}`} onClick={() => setActiveTab("ingresos")}>Ingresos (Donaciones)</button>
                    <button className={`tab-btn ${activeTab === "egresos" ? "active" : ""}`} onClick={() => setActiveTab("egresos")}>Egresos (Gastos)</button>
                    <button className={`tab-btn ${activeTab === "checklist" ? "active" : ""}`} onClick={() => setActiveTab("checklist")}>Checklist Documental</button>
                </div>

                <div className="tab-content">
                    {activeTab === "ingresos" && (
                        <div>
                            <div className="form-tip">
                                💡 <strong>Aviso para Ingresos:</strong> Identifica correctamente al aportante (Nombre y CI/RUC). Los aportes anónimos tienen restricciones legales severas por el TSJE.
                            </div>
                            <form className="form-grid" onSubmit={handleAddIngreso}>
                                <div className="input-group">
                                    <label>Monto (Gs)</label>
                                    <input type="number" required value={newIngreso.monto} onChange={e => setNewIngreso({...newIngreso, monto: e.target.value})} placeholder="Ej: 500000" />
                                </div>
                                <div className="input-group">
                                    <label>Fecha</label>
                                    <input type="date" required value={newIngreso.fecha} onChange={e => setNewIngreso({...newIngreso, fecha: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>Origen</label>
                                    <select value={newIngreso.origen} onChange={e => setNewIngreso({...newIngreso, origen: e.target.value})}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Contribución">Contribución</option>
                                        <option value="Donación">Donación</option>
                                        <option value="Aporte Propio">Aporte Propio</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Aportante (Nombre/CI)</label>
                                    <input type="text" value={newIngreso.nombre_aportante} onChange={e => setNewIngreso({...newIngreso, nombre_aportante: e.target.value})} placeholder="Nombre completo" />
                                </div>
                                <div className="input-group">
                                    <label>Tipo Comprobante</label>
                                    <select value={newIngreso.tipo_comprobante} onChange={e => setNewIngreso({...newIngreso, tipo_comprobante: e.target.value})}>
                                        <option value="Recibo">Recibo de Donación</option>
                                        <option value="Factura">Factura</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Timbrado (opcional)</label>
                                    <input type="text" value={newIngreso.timbrado} onChange={e => setNewIngreso({...newIngreso, timbrado: e.target.value})} placeholder="13 dígitos" />
                                    <span className="field-help">Si el comprobante lo posee.</span>
                                </div>
                                <div className="input-group" style={{gridColumn: 'span 2'}}>
                                    <label>Descripción</label>
                                    <input type="text" value={newIngreso.descripcion} onChange={e => setNewIngreso({...newIngreso, descripcion: e.target.value})} placeholder="Detalle del ingreso..." />
                                </div>
                                <button type="submit" className="btn-add">Registrar Ingreso</button>
                            </form>

                            <div className="data-table-container">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Origen</th>
                                            <th>Aportante</th>
                                            <th>Descripción</th>
                                            <th>Monto</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingresos.map(ing => (
                                            <tr key={ing.id}>
                                                <td>{new Date(ing.fecha).toLocaleDateString()}</td>
                                                <td>{ing.origen}</td>
                                                <td>{ing.nombre_aportante}</td>
                                                <td>{ing.descripcion}</td>
                                                <td className="valor positivo">{formatCurrency(ing.monto)}</td>
                                                <td>
                                                    <button className="delete-btn" onClick={async () => {
                                                        if(window.confirm("¿Eliminar este registro?")) {
                                                            await axios.delete(`${API_URL}/financiamiento/ingresos/${ing.id}`, { headers });
                                                            fetchAllData();
                                                        }
                                                    }}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "egresos" && (
                        <div>
                            <div className="form-tip">
                                ⚠️ <strong>Recomendación de Uso:</strong> Al momento de registrar un gasto, asegúrate de completar el campo <strong>Timbrado (13 dígitos)</strong> que aparece en la factura legal. Esto garantiza que la exportación sea aceptada por el portal SINAFIP.
                            </div>
                            <form className="form-grid" onSubmit={handleAddEgreso}>
                                <div className="input-group">
                                    <label>Monto (Gs)</label>
                                    <input type="number" required value={newEgreso.monto} onChange={e => setNewEgreso({...newEgreso, monto: e.target.value})} placeholder="Ej: 150000" />
                                </div>
                                <div className="input-group">
                                    <label>Fecha</label>
                                    <input type="date" required value={newEgreso.fecha} onChange={e => setNewEgreso({...newEgreso, fecha: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>Categoría</label>
                                    <select value={newEgreso.categoria} onChange={e => setNewEgreso({...newEgreso, categoria: e.target.value})}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Propaganda - Redes Sociales">Propaganda - Redes Sociales / Digital</option>
                                        <option value="Propaganda - Vía Pública">Propaganda - Vía Pública (Gigantografías)</option>
                                        <option value="Propaganda - TV/Radio/Prensa">Propaganda - TV/Radio/Prensa</option>
                                        <option value="Movilidad/Combustible">Movilidad/Combustible</option>
                                        <option value="Eventos - Alquileres">Eventos - Alquileres/Locales</option>
                                        <option value="Papelería/Imprenta">Papelería/Imprenta</option>
                                        <option value="Capacitación (Art 70)">Capacitación (Art 70 - 30% obligatorio)</option>
                                        <option value="Honorarios Profesionales">Honorarios Profesionales</option>
                                        <option value="Gastos Bancarios">Gastos Bancarios</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Proveedor (Nombre/RUC)</label>
                                    <input type="text" value={newEgreso.proveedor_nombre} onChange={e => setNewEgreso({...newEgreso, proveedor_nombre: e.target.value})} placeholder="Razón social" />
                                </div>
                                <div className="input-group">
                                    <label>Tipo Comprobante</label>
                                    <select value={newEgreso.tipo_comprobante} onChange={e => setNewEgreso({...newEgreso, tipo_comprobante: e.target.value})}>
                                        <option value="Factura">Factura</option>
                                        <option value="Auto-factura">Auto-factura</option>
                                        <option value="Recibo">Recibo</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Timbrado (Oblig. Py)</label>
                                    <input type="text" value={newEgreso.timbrado} onChange={e => setNewEgreso({...newEgreso, timbrado: e.target.value})} placeholder="13 dígitos" />
                                    <span className="field-help">Número de 13 dígitos de la factura legal.</span>
                                </div>
                                <div className="input-group" style={{gridColumn: 'span 2'}}>
                                    <label>Factura Nro / Descripción</label>
                                    <input type="text" value={newEgreso.descripcion} onChange={e => setNewEgreso({...newEgreso, descripcion: e.target.value})} placeholder="Nro de factura y detalle..." />
                                </div>
                                <button type="submit" className="btn-add">Registrar Gasto</button>
                            </form>

                            <div className="data-table-container">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Categoría</th>
                                            <th>Proveedor</th>
                                            <th>Detalle</th>
                                            <th>Monto</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {egresos.map(egr => (
                                            <tr key={egr.id}>
                                                <td>{new Date(egr.fecha).toLocaleDateString()}</td>
                                                <td>{egr.categoria}</td>
                                                <td>{egr.proveedor_nombre}</td>
                                                <td>{egr.descripcion}</td>
                                                <td className="valor negativo">{formatCurrency(egr.monto)}</td>
                                                <td>
                                                    <button className="delete-btn" onClick={async () => {
                                                        if(window.confirm("¿Eliminar este gasto?")) {
                                                            await axios.delete(`${API_URL}/financiamiento/egresos/${egr.id}`, { headers });
                                                            fetchAllData();
                                                        }
                                                    }}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "checklist" && (
                        <div className="checklist-container">
                            <div style={{marginBottom: '20px', color: '#64748b'}}>
                                <p>Requisitos oficiales exigidos para el cumplimiento del <strong>{tipoFinanciamiento}</strong>.</p>
                            </div>
                            {cumplimiento.map(item => (
                                <div key={item.id} className="checklist-item">
                                    <input 
                                        type="checkbox" 
                                        className="checklist-checkbox" 
                                        checked={item.completado} 
                                        onChange={() => toggleCumplimiento(item.id, item.completado)}
                                    />
                                    <div className="checklist-info">
                                        <span className="checklist-name">{item.requisito_nombre}</span>
                                        {item.fecha_cumplimiento && (
                                            <span className="checklist-date">Marcado el {new Date(item.fecha_cumplimiento).toLocaleString()}</span>
                                        )}
                                    </div>
                                    <span className={`checklist-status ${item.completado ? 'done' : 'pending'}`}>
                                        {item.completado ? 'Completado' : 'Pendiente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default FinanciamientoPolitico;
