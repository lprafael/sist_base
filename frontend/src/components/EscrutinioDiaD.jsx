import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EscrutinioDiaD.css";

const EscrutinioDiaD = ({ user }) => {
    const [candidatoInfo, setCandidatoInfo] = useState({ id: null, nombre: "" });
    const [comparativo, setComparativo] = useState([]);
    const [locales, setLocales] = useState([]);
    const [mesasDisponibles, setMesasDisponibles] = useState([]);
    
    // Filtros de Territorio
    const [territorio, setTerritorio] = useState({
        departamento_id: user?.departamento_id || "",
        distrito_id: user?.distrito_id || ""
    });
    const [catalogos, setCatalogos] = useState({
        departamentos: [],
        distritos: []
    });

    const [formData, setFormData] = useState({
        local_composite_all: "", // dep_dist_secc_loc
        nro_mesa: "",
        votos_obtenidos: "",
        votos_blancos: "0",
        votos_nulos: "0",
        total_votantes_acta: "",
        observaciones: ""
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (user) {
            initializeData();
        }
    }, [user]);

    const initializeData = async () => {
        try {
            setLoading(true);
            
            // 1. Cargar catálogos iniciales
            await fetchDepartamentos();
            
            const depId = user?.departamento_id || territorio.departamento_id;
            const distId = user?.distrito_id || territorio.distrito_id;

            if (depId) {
                await fetchDistritos(depId);
            }

            // 2. Cargar locales si ya tenemos territorio
            if (depId && distId) {
                await fetchLocales(depId, distId);
            }

            // 3. Obtener candidato vinculado (no bloquea si falla)
            try {
                const resMe = await axios.get(`${API_URL}/financiamiento/me/candidato`, { headers });
                if (resMe.data?.candidato_id) {
                    setCandidatoInfo({ 
                        id: resMe.data.candidato_id, 
                        nombre: resMe.data.nombre || "Candidato" 
                    });
                    fetchComparativo(resMe.data.candidato_id);
                }
            } catch (err) {
                console.warn("No se encontró candidato vinculado explícitamente.");
            }

        } catch (err) {
            console.error("Error al inicializar:", err);
            setError("Error al cargar configuración.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartamentos = async () => {
        try {
            const res = await axios.get(`${API_URL}/electoral/departamentos`, { headers });
            setCatalogos(prev => ({ ...prev, departamentos: res.data || [] }));
        } catch (err) { console.error(err); }
    };

    const fetchDistritos = async (depId) => {
        if (!depId) return;
        try {
            const res = await axios.get(`${API_URL}/electoral/distritos?departamento_id=${depId}`, { headers });
            setCatalogos(prev => ({ ...prev, distritos: res.data || [] }));
        } catch (err) { console.error(err); }
    };

    const fetchLocales = async (depId, distId) => {
        if (!depId || !distId) return;
        try {
            const resLocales = await axios.get(`${API_URL}/dia-d/locales-padron`, { 
                headers, 
                params: { distrito_id: distId, departamento_id: depId } 
            });
            setLocales(Array.isArray(resLocales.data) ? resLocales.data : []);
        } catch (err) {
            console.error("Error al cargar locales", err);
            setLocales([]);
        }
    };

    const fetchComparativo = async (cId) => {
        if (!cId) return;
        try {
            const resComp = await axios.get(`${API_URL}/dia-d/comparativo/${cId}`, { headers });
            setComparativo(Array.isArray(resComp.data) ? resComp.data : []);
        } catch (err) {
            console.error("Error al cargar comparativo", err);
            setComparativo([]);
        }
    };

    const handleTerritorioChange = (e) => {
        const { name, value } = e.target;
        const newVal = name === "departamento_id" ? { departamento_id: value, distrito_id: "" } : { ...territorio, distrito_id: value };
        
        setTerritorio(newVal);
        
        if (name === "departamento_id") {
            setLocales([]);
            if (value) fetchDistritos(value);
        } else if (name === "distrito_id") {
            setLocales([]);
            if (value && territorio.departamento_id) {
                fetchLocales(territorio.departamento_id, value);
            }
        }
    };

    const handleFormChange = async (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === "local_composite_all" && value) {
            try {
                const resMesas = await axios.get(`${API_URL}/dia-d/mesas-padron/${value}`, { headers });
                setMesasDisponibles(resMesas.data || []);
            } catch (err) {
                console.error("Error al cargar mesas", err);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Fallback: si no hay candidatoInfo.id, usamos un ID genérico o fallamos si es estrictamente necesario
        const targetCandId = candidatoInfo.id;
        
        if (!targetCandId) {
            alert("No se puede registrar resultado sin un candidato vinculado (puedes crearlo en Gestión de Usuarios -> Candidatos).");
            return;
        }
        
        try {
            const [dep, dist, secc, loc] = formData.local_composite_all.split("_").map(Number);
            await axios.post(`${API_URL}/dia-d/resultados`, {
                departamento_id: dep,
                distrito_id: dist,
                seccional_id: secc,
                local_id: loc,
                nro_mesa: parseInt(formData.nro_mesa),
                id_candidato: targetCandId,
                votos_obtenidos: parseInt(formData.votos_obtenidos),
                votos_blancos: parseInt(formData.votos_blancos),
                votos_nulos: parseInt(formData.votos_nulos),
                total_votantes_acta: parseInt(formData.total_votantes_acta || 0),
                observaciones: formData.observaciones
            }, { headers });
            
            alert("✅ Acta registrada correctamente");
            fetchComparativo(targetCandId);
            setFormData({
                local_composite_all: "", nro_mesa: "", votos_obtenidos: "",
                votos_blancos: "0", votos_nulos: "0", total_votantes_acta: "", observaciones: ""
            });
            setMesasDisponibles([]);
        } catch (err) {
            console.error(err);
            alert("❌ Error al registrar acta");
        }
    };

    const getEfectividadClass = (pct) => {
        if (pct >= 90) return "status-ok";
        if (pct >= 50) return "status-warning";
        return "status-danger";
    };

    if (loading) return <div className="loading">Cargando módulo de escrutinio...</div>;

    return (
        <div className="escrutinio-container">
            <header className="escrutinio-header">
                <div>
                    <h2>Escrutinio Día D</h2>
                    <p>Corroboración de resultados reales vs captación</p>
                </div>
                {user?.rol === 'admin' ? (
                    <div className="territorio-selector-header">
                        <select name="departamento_id" value={territorio.departamento_id} onChange={handleTerritorioChange}>
                            <option value="">Departamento...</option>
                            {catalogos.departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                        <select name="distrito_id" value={territorio.distrito_id} onChange={handleTerritorioChange} disabled={!territorio.departamento_id}>
                            <option value="">Distrito...</option>
                            {catalogos.distritos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="badge-distrito">
                        📍 {user?.distrito_nombre || "Mi Distrito"}
                    </div>
                )}
            </header>

            <div className="info-badge-row">
                {candidatoInfo.id ? (
                    <div className="status-info-box linked">
                        ✅ <strong>Candidato:</strong> {candidatoInfo.nombre}
                    </div>
                ) : (
                    <div className="status-info-box unlinked">
                        💡 <strong>Nota:</strong> Trabajando por territorio. Los resultados se guardarán para el candidato predeterminado del distrito.
                    </div>
                )}
            </div>

            <section className="card" style={{ marginBottom: "30px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Registrar Resultados de Mesa</h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Padrón ANR 2026</span>
                </div>
                <form className="form-acta" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Local de Votación</label>
                        <select name="local_composite_all" value={formData.local_composite_all} onChange={handleFormChange} required disabled={locales.length === 0}>
                            <option value="">{locales.length === 0 ? "Selecciona un Distrito" : "Seleccione Local..."}</option>
                            {locales.map(l => (
                                <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Nro. de Mesa</label>
                        <select name="nro_mesa" value={formData.nro_mesa} onChange={handleFormChange} required disabled={!formData.local_composite_all}>
                            <option value="">Seleccione Mesa...</option>
                            {mesasDisponibles.map(m => (
                                <option key={m} value={m}>Mesa {m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Votos Obtenidos</label>
                        <input type="number" name="votos_obtenidos" value={formData.votos_obtenidos} onChange={handleFormChange} required />
                    </div>
                    <div className="input-group">
                        <label>Total Votantes Mesa</label>
                        <input type="number" name="total_votantes_acta" value={formData.total_votantes_acta} onChange={handleFormChange} />
                    </div>
                    <div className="input-group">
                        <label>Blancos</label>
                        <input type="number" name="votos_blancos" value={formData.votos_blancos} onChange={handleFormChange} />
                    </div>
                    <div className="input-group">
                        <label>Nulos</label>
                        <input type="number" name="votos_nulos" value={formData.votos_nulos} onChange={handleFormChange} />
                    </div>
                    <div className="input-group" style={{ gridColumn: "span 2" }}>
                        <label>Observaciones</label>
                        <input type="text" name="observaciones" value={formData.observaciones} onChange={handleFormChange} placeholder="Ejem: mesa impugnada" />
                    </div>
                    <button type="submit" className="btn-registrar" style={{ gridColumn: "span 2" }}>
                        💾 Guardar Resultados de Mesa
                    </button>
                </form>
            </section>

            <section className="comparativo-table-container">
                <h3>📊 Comparativo: Expectativa vs Realidad</h3>
                <table className="comparativo-table">
                    <thead>
                        <tr>
                            <th>Local</th>
                            <th>Mesa</th>
                            <th>Simpatizantes</th>
                            <th>Votos Reales</th>
                            <th>Diferencia</th>
                            <th>Efectividad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!candidatoInfo.id ? (
                            <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Registra un acta para ver el análisis comparativo.</td></tr>
                        ) : comparativo.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Sin datos comparativos aún.</td></tr>
                        ) : comparativo.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.nombre_local}</td>
                                <td>{item.nro_mesa}</td>
                                <td>{item.simpatizantes_esperados}</td>
                                <td style={{fontWeight: 'bold'}}>{item.votos_reales}</td>
                                <td style={{color: item.diferencia < 0 ? "red" : "green"}}>{item.diferencia}</td>
                                <td>
                                    <span className={`status-badge ${getEfectividadClass(item.efectividad_porcentaje)}`}>
                                        {item.efectividad_porcentaje}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default EscrutinioDiaD;
