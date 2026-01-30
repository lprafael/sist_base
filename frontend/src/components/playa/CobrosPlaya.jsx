import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CobrosPlaya.css';

const CobrosPlaya = () => {
    const [pagares, setPagares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedPagare, setSelectedPagare] = useState(null);
    const [newPago, setNewPago] = useState({
        id_pagare: '',
        id_venta: '',
        numero_recibo: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        monto_pagado: 0,
        forma_pago: 'EFECTIVO',
        numero_referencia: '',
        observaciones: ''
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchPagares();
    }, []);

    const fetchPagares = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/pagares/pendientes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPagares(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pagares:', error);
            setLoading(false);
        }
    };

    const handleOpenCobro = (pagare) => {
        setSelectedPagare(pagare);
        setNewPago({
            ...newPago,
            id_pagare: pagare.id_pagare,
            id_venta: pagare.id_venta,
            monto_pagado: pagare.monto_cuota,
            numero_recibo: `REC-${Date.now()}`
        });
        setShowModal(true);
    };

    const handleConfirmPago = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/playa/pagos`, newPago, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchPagares();
            alert('Cobro registrado exitosamente');
        } catch (error) {
            alert('Error al registrar cobro: ' + (error.response?.data?.detail || error.message));
        }
    };

    const filteredPagares = pagares.filter(p =>
        p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_documento.includes(searchTerm) ||
        p.vehiculo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="cobros-container">
            <div className="header-actions">
                <h2>Cobranzas y Recibos</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por cliente, documento o vehículo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading">Cargando cuentas por cobrar...</div>
            ) : (
                <div className="table-responsive">
                    <table className="cobros-table">
                        <thead>
                            <tr>
                                <th>Vencimiento</th>
                                <th>Cliente</th>
                                <th>Vehículo</th>
                                <th>Cuota N°</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPagares.map(p => {
                                const isOverdue = new Date(p.fecha_vencimiento) < new Date();
                                return (
                                    <tr key={p.id_pagare} className={isOverdue ? 'overdue-row' : ''}>
                                        <td>
                                            <span className={`date-badge ${isOverdue ? 'danger' : ''}`}>
                                                {p.fecha_vencimiento}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="client-cell">
                                                <strong>{p.cliente}</strong>
                                                <span>{p.numero_documento}</span>
                                            </div>
                                        </td>
                                        <td>{p.vehiculo}</td>
                                        <td>{p.numero_cuota}</td>
                                        <td><strong>Gs. {Math.round(parseFloat(p.monto_cuota)).toLocaleString('es-PY')}</strong></td>
                                        <td><span className="status-label">PENDIENTE</span></td>
                                        <td>
                                            <button className="btn-cobrar" onClick={() => handleOpenCobro(p)}>
                                                Cobrar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Registrar Recibo de Pago</h3>
                        {selectedPagare && (
                            <div className="payment-summary">
                                <p><strong>Cliente:</strong> {selectedPagare.cliente}</p>
                                <p><strong>Concepto:</strong> Cuota {selectedPagare.numero_cuota} - {selectedPagare.vehiculo}</p>
                            </div>
                        )}
                        <form onSubmit={handleConfirmPago}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>N° Recibo</label>
                                    <input type="text" required value={newPago.numero_recibo} onChange={(e) => setNewPago({ ...newPago, numero_recibo: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha Cobro</label>
                                    <input type="date" required value={newPago.fecha_pago} onChange={(e) => setNewPago({ ...newPago, fecha_pago: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Monto Cobrado (Gs.)</label>
                                    <input type="number" step="0.01" required value={newPago.monto_pagado} onChange={(e) => setNewPago({ ...newPago, monto_pagado: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Forma de Pago</label>
                                    <select value={newPago.forma_pago} onChange={(e) => setNewPago({ ...newPago, forma_pago: e.target.value })}>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="DEPOSITO">Depósito Bancario</option>
                                    </select>
                                </div>
                            </div>
                            {newPago.forma_pago !== 'EFECTIVO' && (
                                <div className="form-group">
                                    <label>N° Referencia / Operación</label>
                                    <input type="text" value={newPago.numero_referencia} onChange={(e) => setNewPago({ ...newPago, numero_referencia: e.target.value })} placeholder="Ej: N° Transacción o Cheque" />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea rows="2" value={newPago.observaciones} onChange={(e) => setNewPago({ ...newPago, observaciones: e.target.value })}></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Confirmar Cobro e Imprimir</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CobrosPlaya;
