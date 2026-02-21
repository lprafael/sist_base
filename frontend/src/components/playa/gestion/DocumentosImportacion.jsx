import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DocumentosImportacion.css';

const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

export default function DocumentosImportacion({ preselectedDespacho, setPreselectedDespacho }) {
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModalCarga, setShowModalCarga] = useState(false);
    const [showModalVincular, setShowModalVincular] = useState(false);
    const [fileDespacho, setFileDespacho] = useState(null);
    const [fileCertificados, setFileCertificados] = useState(null);
    const [analizando, setAnalizando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [analisis, setAnalisis] = useState(null);
    const [vinculaciones, setVinculaciones] = useState([]);
    const [dragDespacho, setDragDespacho] = useState(false);
    const [dragCertificados, setDragCertificados] = useState(false);
    const [highlightedDespacho, setHighlightedDespacho] = useState(null);

    useEffect(() => {
        fetchDocumentos();
    }, []);

    useEffect(() => {
        if (preselectedDespacho) {
            setHighlightedDespacho(preselectedDespacho);
            // Scroll to the row
            setTimeout(() => {
                const row = document.querySelector(`.row-highlight`);
                if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);

            // Clear after some time or on interaction
            const timer = setTimeout(() => {
                setHighlightedDespacho(null);
                if (setPreselectedDespacho) setPreselectedDespacho(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [preselectedDespacho]);

    const fetchDocumentos = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/documentos-importacion`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocumentos(res.data);
        } catch (e) {
            console.error('Error listando documentos de importación', e);
        } finally {
            setLoading(false);
        }
    };

    const getToken = () => sessionStorage.getItem('token');

    const handleVerPDF = async (nro, type) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/documentos-importacion/${nro}/pdf-${type}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (e) {
            alert('Error al abrir el PDF: ' + (e.response?.data?.detail || e.message));
        }
    };

    const handleEditar = (d) => {
        // Convertir productos ya vinculados al formato del modal de vinculación
        const vList = (d.productos || []).map(p => ({
            id_producto: p.id_producto,
            chasis: p.chasis,
            marca: p.marca || '-',
            modelo: p.modelo || '-',
            nro_cert_nac: p.nro_cert_nac,
            existe: true,
            vincular: true
        }));
        setAnalisis({ nro_despacho: d.nro_despacho });
        setVinculaciones(vList);
        setShowModalVincular(true);
    };

    const handleDropDespacho = (e) => {
        e.preventDefault();
        setDragDespacho(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && f.type === 'application/pdf') setFileDespacho(f);
        else if (f) alert('Solo se permiten archivos PDF.');
    };
    const handleDropCertificados = (e) => {
        e.preventDefault();
        setDragCertificados(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && f.type === 'application/pdf') setFileCertificados(f);
        else if (f) alert('Solo se permiten archivos PDF.');
    };

    const handleAnalizar = async () => {
        if (!fileDespacho || !fileCertificados) {
            alert('Debe cargar ambos PDFs: Documento de Despacho y Certificados de Nacionalización.');
            return;
        }
        setAnalizando(true);
        try {
            const form = new FormData();
            form.append('file_despacho', fileDespacho);
            form.append('file_certificados', fileCertificados);
            const res = await axios.post(
                `${API_URL}/playa/documentos-importacion/analizar`,
                form,
                {
                    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' },
                    maxContentLength: 100 * 1024 * 1024, // 100 MB
                    maxBodyLength: 100 * 1024 * 1024,
                }
            );
            setAnalisis(res.data);
            if (res.data.ya_existe) {
                alert(`El número de despacho "${res.data.nro_despacho || '(extraído)'}" ya está registrado. No se puede guardar de nuevo.`);
                setAnalizando(false);
                return;
            }
            const allChasis = res.data.chasis_despacho || [];

            // Helper para normalizar chasis (quitar guiones, espacios y pasar a mayúsculas)
            const normalizeChasis = (c) => (c || '').toUpperCase().replace(/[-\s]/g, '');

            const vehiculosPlayaDict = {};
            (res.data.vehiculos_en_playa || []).forEach((v) => {
                vehiculosPlayaDict[normalizeChasis(v.chasis)] = v;
            });

            // Normalizar también las claves de certificados_por_chasis
            const certsDict = {};
            Object.entries(res.data.certificados_por_chasis || {}).forEach(([ch, val]) => {
                certsDict[normalizeChasis(ch)] = val;
            });

            const list = allChasis.map((chasis) => {
                const norm = normalizeChasis(chasis);
                const v = vehiculosPlayaDict[norm];
                if (v) {
                    return {
                        ...v,
                        vincular: true,
                        nro_cert_nac: v.nro_cert_nac || certsDict[norm] || '',
                        existe: true
                    };
                } else {
                    return {
                        id_producto: `not-found-${chasis}`,
                        chasis: chasis,
                        marca: '-',
                        modelo: '-',
                        nro_cert_nac: certsDict[norm] || '',
                        vincular: false,
                        existe: false
                    };
                }
            });
            setVinculaciones(list);
            setShowModalCarga(false);
            setShowModalVincular(true);
        } catch (err) {
            if (err.response?.status === 413) {
                alert(
                    'Los PDFs son demasiado grandes para el servidor (error 413). ' +
                    'Si usa nginx, agregue en el bloque location /api/: client_max_body_size 100M; y reinicie nginx. ' +
                    'O pruebe con PDFs más pequeños.'
                );
                return;
            }
            const msg = err.response?.data?.detail || err.message;
            alert('Error al analizar: ' + (Array.isArray(msg) ? msg.map((m) => m.msg || m).join(', ') : msg));
        } finally {
            setAnalizando(false);
        }
    };

    const toggleVincular = (index) => {
        setVinculaciones((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], vincular: !next[index].vincular };
            return next;
        });
    };

    const setCertNac = (index, value) => {
        setVinculaciones((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], nro_cert_nac: value };
            return next;
        });
    };

    const handleGuardar = async () => {
        const seleccionados = vinculaciones.filter((v) => v.vincular);
        if (!analisis?.nro_despacho) {
            alert('No se pudo obtener el número de despacho del PDF. Puede intentar con otro archivo.');
            return;
        }
        if (seleccionados.length === 0) {
            alert('Seleccione al menos un vehículo para vincular.');
            return;
        }
        setGuardando(true);
        try {
            const form = new FormData();
            form.append('file_despacho', fileDespacho);
            form.append('file_certificados', fileCertificados);
            form.append('nro_despacho', analisis.nro_despacho);
            form.append(
                'vinculaciones',
                JSON.stringify(seleccionados.map((v) => ({ chasis: v.chasis, nro_cert_nac: v.nro_cert_nac || null })))
            );
            await axios.post(`${API_URL}/playa/documentos-importacion`, form, {
                headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' },
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024,
            });
            setShowModalVincular(false);
            setShowModalCarga(false);
            setAnalisis(null);
            setFileDespacho(null);
            setFileCertificados(null);
            fetchDocumentos();
            alert('Documento de importación guardado y vehículos vinculados correctamente.');
        } catch (err) {
            if (err.response?.status === 413) {
                alert('Los PDFs son demasiado grandes (error 413). Configure client_max_body_size 100M en nginx o use archivos más pequeños.');
                return;
            }
            const msg = err.response?.data?.detail || err.message;
            alert('Error al guardar: ' + (Array.isArray(msg) ? msg.map((m) => m.msg || m).join(', ') : msg));
        } finally {
            setGuardando(false);
        }
    };

    const cerrarModalCarga = () => {
        setShowModalCarga(false);
        setFileDespacho(null);
        setFileCertificados(null);
        setAnalisis(null);
    };

    return (
        <div className="doc-importacion-container">
            <div className="header-actions">
                <h2>Documentos de Importación</h2>
                <button className="btn-primary" onClick={() => setShowModalCarga(true)}>
                    📄 Cargar documentos
                </button>
            </div>
            <p className="descripcion-seccion">
                Documento de Despacho y Certificados de Nacionalización por número de despacho. Cargue los PDFs, analice y vincule los vehículos.
            </p>
            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-wrapper">
                    <table className="doc-importacion-table">
                        <thead>
                            <tr>
                                <th>Nº Despacho</th>
                                <th>Fecha despacho</th>
                                <th>Cant. vehículos</th>
                                <th>Monto pagado</th>
                                <th>Registro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documentos.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>No hay documentos de importación registrados.</td>
                                </tr>
                            ) : (
                                documentos.map((d) => (
                                    <tr key={d.nro_despacho} className={highlightedDespacho === d.nro_despacho ? 'row-highlight' : ''}>
                                        <td><strong>{d.nro_despacho}</strong></td>
                                        <td>{d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleDateString('es-PY') : '-'}</td>
                                        <td>{d.cantidad_vehiculos ?? '-'}</td>
                                        <td>{d.monto_pagado != null ? Number(d.monto_pagado).toLocaleString('es-PY') : '-'}</td>
                                        <td>{d.fecha_registro ? new Date(d.fecha_registro).toLocaleString('es-PY') : '-'}</td>
                                        <td className="actions-cell">
                                            <div className="btn-group">
                                                <button className="btn-action edit" title="Editar vinculos / Ver detalles" onClick={() => handleEditar(d)}>
                                                    ✏️
                                                </button>
                                                <button className="btn-action view" title="Ver Despacho PDF" onClick={() => handleVerPDF(d.nro_despacho, 'despacho')}>
                                                    📄
                                                </button>
                                                <button className="btn-action view" title="Ver Certificados PDF" onClick={() => handleVerPDF(d.nro_despacho, 'certificados')}>
                                                    📜
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal: Carga de PDFs y Analizar */}
            {showModalCarga && (
                <div className="modal-overlay" onClick={() => cerrarModalCarga()}>
                    <div className="modal-content doc-importacion-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Cargar documentos de importación</h3>
                            <button type="button" className="modal-close" onClick={cerrarModalCarga}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="drop-zones">
                                <div
                                    className={`drop-zone ${dragDespacho ? 'drag-over' : ''} ${fileDespacho ? 'has-file' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragDespacho(true); }}
                                    onDragLeave={() => setDragDespacho(false)}
                                    onDrop={handleDropDespacho}
                                >
                                    <span className="drop-label">Documento de Despacho (PDF)</span>
                                    {fileDespacho ? (
                                        <span className="file-name">{fileDespacho.name}</span>
                                    ) : (
                                        <span className="drop-hint">Arrastre y suelte o haga clic para seleccionar</span>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="drop-input"
                                        onChange={(e) => setFileDespacho(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div
                                    className={`drop-zone ${dragCertificados ? 'drag-over' : ''} ${fileCertificados ? 'has-file' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragCertificados(true); }}
                                    onDragLeave={() => setDragCertificados(false)}
                                    onDrop={handleDropCertificados}
                                >
                                    <span className="drop-label">Certificados de Nacionalización (PDF)</span>
                                    {fileCertificados ? (
                                        <span className="file-name">{fileCertificados.name}</span>
                                    ) : (
                                        <span className="drop-hint">Arrastre y suelte o haga clic para seleccionar</span>
                                    )}
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="drop-input"
                                        onChange={(e) => setFileCertificados(e.target.files?.[0] || null)}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={cerrarModalCarga}>Cancelar</button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleAnalizar}
                                    disabled={analizando || !fileDespacho || !fileCertificados}
                                >
                                    {analizando ? 'Analizando...' : 'Analizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Vincular vehículos */}
            {showModalVincular && analisis && (
                <div className="modal-overlay" onClick={() => setShowModalVincular(false)}>
                    <div className="modal-content doc-vincular-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Vincular vehículos al despacho {analisis.nro_despacho}</h3>
                            <button type="button" className="modal-close" onClick={() => setShowModalVincular(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="vincular-desc">Seleccione los vehículos que corresponden a este despacho. Se guardará el número de despacho y el certificado de nacionalización en cada uno.</p>
                            <div className="vinculaciones-table-wrap">
                                <table className="vinculaciones-table">
                                    <thead>
                                        <tr>
                                            <th>Vincular</th>
                                            <th>Chasis</th>
                                            <th>Marca / Modelo</th>
                                            <th>Nº Cert. Nacionalización</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vinculaciones.map((v, idx) => (
                                            <tr key={v.id_producto} className={!v.existe ? 'row-inactivo' : ''}>
                                                <td>
                                                    <label className={`check-vincular ${!v.existe ? 'disabled' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!v.vincular}
                                                            onChange={() => v.existe && toggleVincular(idx)}
                                                            disabled={!v.existe}
                                                        />
                                                        <span>{v.existe ? 'Vincular' : <span className="badge-inactivo">Inactivo</span>}</span>
                                                    </label>
                                                </td>
                                                <td className="chasis-cell">{v.chasis}</td>
                                                <td>{v.marca !== '-' ? `${v.marca} ${v.modelo}` : <span className="text-muted">No encontrado en inventario</span>}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="input-cert"
                                                        value={v.nro_cert_nac || ''}
                                                        onChange={(e) => setCertNac(idx, e.target.value)}
                                                        placeholder="Nº certificado"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => { setShowModalVincular(false); setShowModalCarga(true); }}>Volver</button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleGuardar}
                                    disabled={guardando || !vinculaciones.some((v) => v.vincular)}
                                >
                                    {guardando ? 'Guardando...' : 'Guardar documento y vincular'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
