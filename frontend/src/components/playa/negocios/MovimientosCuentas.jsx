import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../parametros/CategoriasPlaya.css';

const MovimientosCuentas = () => {
    const [movimientos, setMovimientos] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        id_cuenta_origen: '',
        id_cuenta_destino: '',
        monto: '',
        concepto: '',
        referencia: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const [resMov, resCta] = await Promise.all([
                axios.get(`${API_URL}/playa/movimientos`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/cuentas`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setMovimientos(resMov.data);
            setCuentas(resCta.data.filter(c => c.activo));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setFormData({
            id_cuenta_origen: '',
            id_cuenta_destino: '',
            monto: '',
            concepto: '',
            referencia: ''
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id_cuenta_origen && !formData.id_cuenta_destino) {
            alert('Debe seleccionar al menos una cuenta (origen o destino)');
            return;
        }
        if (formData.id_cuenta_origen === formData.id_cuenta_destino) {
            alert('La cuenta origen y destino deben ser diferentes');
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const dataToSubmit = {
                ...formData,
                id_cuenta_origen: formData.id_cuenta_origen || null,
                id_cuenta_destino: formData.id_cuenta_destino || null,
                monto: parseFloat(formData.monto)
            };
            await axios.post(`${API_URL}/playa/movimientos`, dataToSubmit, {
                headers: { Authorization: `Bearer ${token}` }
            });
            closeModal();
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    const filteredMovimientos = movimientos.filter(m =>
        (m.concepto && m.concepto.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.cuenta_origen && m.cuenta_origen.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.cuenta_destino && m.cuenta_destino.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="categorias-container">
            <div className="header-actions">
                <h2>Movimientos entre Cuentas</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por concepto o cuenta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openModal}>
                    💸 Registrar Movimiento
                </button>
            </div>

            {loading ? (
                <div className="loading">Cargando movimientos...</div>
            ) : (
                <div className="categorias-table-wrapper">
                    <table className="categorias-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Origen</th>
                                <th>Destino</th>
                                <th style={{ textAlign: 'right' }}>Monto</th>
                                <th>Concepto</th>
                                <th>Ref.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovimientos.map(m => (
                                <tr key={m.id_movimiento}>
                                    <td>{formatDate(m.fecha)}</td>
                                    <td style={{ color: 'red' }}>{m.cuenta_origen?.nombre || 'Ingreso Externo'}</td>
                                    <td style={{ color: 'green' }}>{m.cuenta_destino?.nombre || 'Egreso Externo'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(m.monto)}</td>
                                    <td>{m.concepto}</td>
                                    <td>{m.referencia}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Nuevo Movimiento</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Cuenta Origen (Sale dinero)</label>
                                <select
                                    value={formData.id_cuenta_origen}
                                    onChange={(e) => setFormData({ ...formData, id_cuenta_origen: e.target.value })}
                                >
                                    <option value="">-- Seleccionar (Opcional si es ingreso externo) --</option>
                                    {cuentas.map(c => (
                                        <option key={c.id_cuenta} value={c.id_cuenta}>{c.nombre} (Sald: {formatCurrency(c.saldo_actual)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Cuenta Destino (Entra dinero)</label>
                                <select
                                    value={formData.id_cuenta_destino}
                                    onChange={(e) => setFormData({ ...formData, id_cuenta_destino: e.target.value })}
                                >
                                    <option value="">-- Seleccionar (Opcional si es egreso externo) --</option>
                                    {cuentas.map(c => (
                                        <option key={c.id_cuenta} value={c.id_cuenta}>{c.nombre} (Sald: {formatCurrency(c.saldo_actual)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Monto</label>
                                <input
                                    type="number"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                    required
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label>Concepto / Motivo</label>
                                <input
                                    type="text"
                                    value={formData.concepto}
                                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                                    required
                                    placeholder="Ej: Transferencia para pago de sueldos"
                                />
                            </div>

                            <div className="form-group">
                                <label>Referencia (Nº Operación, Documento...)</label>
                                <input
                                    type="text"
                                    value={formData.referencia}
                                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-save">Registrar Movimiento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovimientosCuentas;
