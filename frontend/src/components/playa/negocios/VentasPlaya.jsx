import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './VentasPlaya.css';

const VentasPlaya = ({ setTab, preselectedVehicleId, setPreselectedVehicleId }) => {
    const [ventas, setVentas] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [escribanias, setEscribanias] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [cuentas, setCuentas] = useState([]); // New state for accounts
    const [loading, setLoading] = useState(true);
    const [showVendedorPopup, setShowVendedorPopup] = useState(false);
    const [vendedorSearch, setVendedorSearch] = useState('');
    const vendedorRef = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const [editingVenta, setEditingVenta] = useState(null);
    const [activeTab, setActiveTab] = useState('datos'); // 'datos' o 'financiamiento'
    const [showAfterSalePagares, setShowAfterSalePagares] = useState(false);
    const [justCreatedPagares, setJustCreatedPagares] = useState([]);
    const [searchTerms, setSearchTerms] = useState({
        text: '',
        startDate: '',
        endDate: ''
    });
    const [filterEstado, setFilterEstado] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const vehicleDropdownRef = useRef(null);

    const [newVenta, setNewVenta] = useState({
        numero_venta: `VNT-${Date.now()}`,
        id_cliente: '',
        id_producto: '',
        fecha_venta: new Date().toISOString().split('T')[0],
        tipo_venta: 'CONTADO',
        precio_venta: 0,
        descuento: 0,
        precio_final: 0,
        entrega_inicial: 0,
        saldo_financiar: 0,
        cantidad_cuotas: 0,
        monto_cuota: 0,
        cantidad_refuerzos: 0,
        monto_refuerzo: 0,
        periodo_int_mora: 'D',
        monto_int_mora: 0,
        tasa_interes: 0,
        dias_gracia: 0,
        id_vendedor: '',
        id_escribania: '',
        id_cuenta: '', // Account ID
        tipo_documento_propiedad: '',
        observaciones: '',
        pagos_cuentas: []
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowClientDropdown(false);
            }
            if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target)) {
                setShowVehicleDropdown(false);
            }
            if (vendedorRef.current && !vendedorRef.current.contains(event.target)) {
                setShowVendedorPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const [vRes, cRes, vntRes, eRes, vndRes, accountsRes] = await Promise.all([
                axios.get(`${API_URL}/playa/vehiculos?available_only=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/clientes`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/ventas`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/escribanias?active_only=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/vendedores?active_only=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/playa/cuentas?active_only=true`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const fetchedVehiculos = vRes.data;
            setVehiculos(fetchedVehiculos);
            setClientes(cRes.data);
            setVentas(vntRes.data);
            setEscribanias(eRes.data);
            setVendedores(vndRes.data);
            setCuentas(accountsRes.data);
            setLoading(false);

            // Manejar pre-selección desde inventario
            if (preselectedVehicleId) {
                const v = fetchedVehiculos.find(veh => veh.id_producto === parseInt(preselectedVehicleId));
                if (v) {
                    // Usar precio_contado_sugerido por defecto (tipo_venta inicial es CONTADO)
                    const precio = parseFloat(v.precio_contado_sugerido);
                    setNewVenta(prev => ({
                        ...prev,
                        id_producto: preselectedVehicleId,
                        precio_venta: precio,
                        precio_final: precio - prev.descuento
                    }));
                    setVehicleSearch(`${v.marca} ${v.modelo} (${v.chasis})`);
                    setShowModal(true);
                }
                setPreselectedVehicleId(null);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleAnularVenta = async (ventaId, numeroVenta) => {
        if (!confirm(
            `¿Está seguro de que desea ELIMINAR COMPLETAMENTE la venta ${numeroVenta || ventaId}?\n\n` +
            `Esta acción eliminará:\n` +
            `• La venta y sus detalles\n` +
            `• Todos los pagarés asociados\n` +
            `• El vehículo volverá a estar DISPONIBLE\n\n` +
            `Solo es posible si la venta no tiene cuotas pagadas.\n` +
            `Esta acción NO se puede deshacer.`
        )) return;
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/playa/ventas/${ventaId}/anular`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || 'Venta eliminada correctamente.');
            fetchData();
        } catch (error) {
            alert('Error al eliminar venta: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleFiniquitarVenta = async (ventaId, numeroVenta, pagares) => {
        const cuotasSinPago = (pagares || []).filter(p =>
            p.tipo_pagare !== 'ENTREGA_INICIAL' && (!p.pagos || p.pagos.length === 0)
        ).length;
        const cuotasConPago = (pagares || []).filter(p =>
            p.tipo_pagare === 'ENTREGA_INICIAL' || (p.pagos && p.pagos.length > 0)
        ).length;

        const confirmMsg =
            `¿Aplicar FINIQUITO a la venta ${numeroVenta || ventaId}?\n\n` +
            `Esta acción:\n` +
            `• Conserva la venta y los ${cuotasConPago} pagaré(s) con pago registrado.\n` +
            `• Elimina los ${cuotasSinPago} pagaré(s) que NO fueron pagados.\n` +
            `• Marca la venta como FINIQUITADA.\n` +
            `• Devuelve el vehículo al inventario como DISPONIBLE.\n\n` +
            `Esta acción NO se puede deshacer.`;
        if (!confirm(confirmMsg)) return;
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(`${API_URL}/playa/ventas/${ventaId}/finiquito`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || 'Finiquito aplicado correctamente.');
            fetchData();
        } catch (error) {
            alert('Error al aplicar finiquito: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditVenta = async (venta) => {
        setEditingVenta(venta);

        const vehiculoId = parseInt(venta.id_producto);
        if (!vehiculos.find(v => v.id_producto === vehiculoId)) {
            try {
                const token = sessionStorage.getItem('token');
                const vRes = await axios.get(`${API_URL}/playa/vehiculos/${vehiculoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setVehiculos(prev => [...prev, vRes.data]);
            } catch (e) {
                // Si falla, igual permitimos editar; el select podría quedar sin opción visible
            }
        }

        setNewVenta({
            numero_venta: venta.numero_venta,
            id_cliente: venta.id_cliente,
            id_producto: venta.id_producto,
            fecha_venta: venta.fecha_venta,
            tipo_venta: venta.tipo_venta,
            precio_venta: parseFloat(venta.precio_venta) || 0,
            descuento: parseFloat(venta.descuento) || 0,
            precio_final: parseFloat(venta.precio_final) || 0,
            entrega_inicial: parseFloat(venta.entrega_inicial) || 0,
            saldo_financiar: parseFloat(venta.saldo_financiar) || 0,
            cantidad_cuotas: parseInt(venta.cantidad_cuotas) || 0,
            monto_cuota: parseFloat(venta.monto_cuota) || 0,
            cantidad_refuerzos: parseInt(venta.cantidad_refuerzos) || 0,
            monto_refuerzo: parseFloat(venta.monto_refuerzo) || 0,
            periodo_int_mora: venta.periodo_int_mora || 'D',
            monto_int_mora: parseFloat(venta.monto_int_mora) || 0,
            tasa_interes: parseFloat(venta.tasa_interes) || 0,
            dias_gracia: parseInt(venta.dias_gracia) || 0,
            id_vendedor: venta.id_vendedor || '',
            id_escribania: venta.id_escribania || '',
            tipo_documento_propiedad: venta.tipo_documento_propiedad || '',
            observaciones: venta.observaciones || ''
        });
        if (venta.cliente) {
            setClientSearch(`${venta.cliente.nombre} ${venta.cliente.apellido} (${venta.cliente.numero_documento})`);
        }
        if (venta.producto) {
            setVehicleSearch(`${venta.producto.marca} ${venta.producto.modelo} (${venta.producto.chasis})`);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingVenta(null);
        setActiveTab('datos');
        setShowAfterSalePagares(false);
        setJustCreatedPagares([]);
        setClientSearch('');
        setShowClientDropdown(false);
        setVehicleSearch('');
        setShowVehicleDropdown(false);
        setNewVenta({
            numero_venta: `VNT-${Date.now()}`,
            id_cliente: '',
            id_producto: '',
            fecha_venta: new Date().toISOString().split('T')[0],
            tipo_venta: 'CONTADO',
            precio_venta: 0,
            descuento: 0,
            precio_final: 0,
            entrega_inicial: 0,
            saldo_financiar: 0,
            cantidad_cuotas: 0,
            monto_cuota: 0,
            cantidad_refuerzos: 0,
            monto_refuerzo: 0,
            periodo_int_mora: 'D',
            monto_int_mora: 0,
            tasa_interes: 0,
            dias_gracia: 0,
            id_vendedor: '',
            id_escribania: '',
            id_cuenta: '',
            tipo_documento_propiedad: '',
            observaciones: ''
        });
    };

    const handleVehiculoChange = (id) => {
        const v = vehiculos.find(veh => veh.id_producto === parseInt(id));
        if (v) {
            // Usar precio_financiado_sugerido si es venta financiada, sino precio_contado_sugerido
            const precio = newVenta.tipo_venta === 'FINANCIADO' && v.precio_financiado_sugerido
                ? parseFloat(v.precio_financiado_sugerido)
                : parseFloat(v.precio_contado_sugerido);
            setNewVenta(calculateFinancing({
                ...newVenta,
                id_producto: id,
                precio_venta: precio,
                precio_final: precio - newVenta.descuento
            }));
        }
    };

    const calculateFinancing = (updatedVenta) => {
        if (updatedVenta.tipo_venta === 'CONTADO') {
            return {
                ...updatedVenta,
                entrega_inicial: updatedVenta.precio_final,
                saldo_financiar: 0,
                cantidad_cuotas: 0,
                monto_cuota: 0,
                cantidad_refuerzos: 0,
                monto_refuerzo: 0
            };
        }

        // Suma de partes: Entrega + (Cuotas * Monto) + (Refuerzos * Monto) = Precio Final
        const totalCuotas = (updatedVenta.cantidad_cuotas || 0) * (updatedVenta.monto_cuota || 0);
        const totalRefuerzos = (updatedVenta.cantidad_refuerzos || 0) * (updatedVenta.monto_refuerzo || 0);
        const calculadoFinal = (updatedVenta.entrega_inicial || 0) + totalCuotas + totalRefuerzos;

        return {
            ...updatedVenta,
            precio_final: calculadoFinal,
            saldo_financiar: calculadoFinal - (updatedVenta.entrega_inicial || 0)
        };
    };

    const handleSaveVenta = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');

            // Validar distribución de pagos
            if (newVenta.entrega_inicial > 0) {
                const totalDistribuido = (newVenta.pagos_cuentas || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
                if (Math.abs(totalDistribuido - newVenta.entrega_inicial) >= 1) {
                    alert(`La distribución de pagos (Gs. ${totalDistribuido.toLocaleString('es-PY')}) no coincide con el total de la entrega inicial / contado (Gs. ${newVenta.entrega_inicial.toLocaleString('es-PY')}).`);
                    return;
                }
            }

            // Construir detalles
            const detalles = [];
            if (newVenta.entrega_inicial > 0 || newVenta.tipo_venta === 'CONTADO') {
                detalles.push({
                    concepto: newVenta.tipo_venta === 'CONTADO' ? 'Entrega Contado' : 'Entrega Inicial',
                    monto_unitario: newVenta.entrega_inicial,
                    cantidad: 1,
                    subtotal: newVenta.entrega_inicial
                });
            }

            if (newVenta.tipo_venta === 'FINANCIADO') {
                if (newVenta.cantidad_cuotas > 0) {
                    detalles.push({
                        concepto: 'Cuotas',
                        monto_unitario: newVenta.monto_cuota,
                        cantidad: newVenta.cantidad_cuotas,
                        subtotal: newVenta.monto_cuota * newVenta.cantidad_cuotas
                    });
                }
                if (newVenta.cantidad_refuerzos > 0) {
                    detalles.push({
                        concepto: 'Refuerzos',
                        monto_unitario: newVenta.monto_refuerzo,
                        cantidad: newVenta.cantidad_refuerzos,
                        subtotal: newVenta.monto_refuerzo * newVenta.cantidad_refuerzos
                    });
                }
            }

            const payload = { ...newVenta, detalles };

            let response;
            if (editingVenta) {
                response = await axios.put(`${API_URL}/playa/ventas/${editingVenta.id_venta}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await axios.post(`${API_URL}/playa/ventas`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            const savedVenta = response.data;

            if (!editingVenta && savedVenta.tipo_venta === 'FINANCIADO' && savedVenta.pagares?.length > 0) {
                setJustCreatedPagares(savedVenta.pagares);
                setShowAfterSalePagares(true);
                setShowModal(false); // Close the main sale modal
            } else {
                handleCloseModal();
            }
            fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleUpdateJustCreatedPagare = async (id, updatedData) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.put(`${API_URL}/playa/pagares/${id}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJustCreatedPagares(prev => prev.map(p => p.id_pagare === id ? res.data : p));
        } catch (error) {
            alert('Error al actualizar pagaré: ' + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <div className="ventas-container">
            <div className="header-actions">
                <h2>Ventas y Pagarés</h2>
                <div className="search-controls">
                    <div className="range-controls">
                        <input
                            type="date"
                            className="search-date"
                            value={searchTerms.startDate}
                            onChange={(e) => setSearchTerms({ ...searchTerms, startDate: e.target.value })}
                            title="Fecha desde"
                        />
                        <span className="range-separator">al</span>
                        <input
                            type="date"
                            className="search-date"
                            value={searchTerms.endDate}
                            onChange={(e) => setSearchTerms({ ...searchTerms, endDate: e.target.value })}
                            title="Fecha hasta"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por cliente, auto o contrato..."
                        className="search-input"
                        value={searchTerms.text}
                        onChange={(e) => setSearchTerms({ ...searchTerms, text: e.target.value })}
                    />
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    Nueva Venta / Contrato
                </button>
            </div>

            {loading && (
                <div className="loading">Cargando...</div>
            )}

            <div className="vnt-estado-filters">
                {['', 'ACTIVA', 'ANULADA', 'FINIQUITADO'].map(est => (
                    <button
                        key={est || 'TODAS'}
                        className={`vnt-filter-pill ${filterEstado === est ? 'active' : ''} ${est ? est.toLowerCase() : 'todas'}`}
                        onClick={() => setFilterEstado(est)}
                    >
                        {est || 'Todas'}
                    </button>
                ))}
            </div>

            <div className="ventas-grid">
                {ventas.filter(v => {
                    const ventaFecha = v.fecha_venta;
                    const matchesDate = (!searchTerms.startDate || ventaFecha >= searchTerms.startDate) &&
                        (!searchTerms.endDate || ventaFecha <= searchTerms.endDate);

                    const textSearch = searchTerms.text.toLowerCase();
                    const clientName = v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}`.toLowerCase() : '';
                    const clientDoc = v.cliente?.numero_documento?.toLowerCase() || '';
                    const vehicleInfo = v.producto ? `${v.producto.marca} ${v.producto.modelo} ${v.producto.chasis}`.toLowerCase() : '';
                    const ventaNum = v.numero_venta.toLowerCase();

                    const matchesText = !searchTerms.text ||
                        clientName.includes(textSearch) ||
                        clientDoc.includes(textSearch) ||
                        vehicleInfo.includes(textSearch) ||
                        ventaNum.includes(textSearch);

                    const estadoVenta = v.estado_venta || 'ACTIVA';
                    const matchesEstado = !filterEstado || estadoVenta === filterEstado;

                    return matchesDate && matchesText && matchesEstado;
                }).map(v => (
                    <div key={v.id_venta} className="venta-card">
                        <div className="card-header">
                            <span className="vnt-number">{v.numero_venta}</span>
                            <span className="vnt-type">{v.tipo_venta}</span>
                        </div>
                        <div className="card-body">
                            <p><strong>Cliente:</strong> {v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}` : 'N/A'}</p>
                            <p><strong>Vehículo:</strong> {v.producto ? `${v.producto.marca} ${v.producto.modelo} (${v.producto.año || ''})` : 'N/A'}</p>
                            <p><strong>Estado:</strong> <span className={`vnt-status ${(v.estado_venta || 'ACTIVA').toLowerCase()}`}>{v.estado_venta || 'ACTIVA'}</span></p>
                            <p><strong>Precio Final:</strong> Gs. {Math.round(parseFloat(v.precio_final || 0)).toLocaleString('es-PY')}</p>
                            {v.tipo_venta === 'FINANCIADO' && (
                                <>
                                    <p><strong>Cuotas:</strong> {(() => {
                                        const lista = Array.isArray(v.pagares) ? v.pagares : [];
                                        const cuotasPagares = lista.filter(p => String(p.tipo_pagare || 'CUOTA').toUpperCase() === 'CUOTA');

                                        // Intentar obtener de la venta, si no, del conteo de pagarés
                                        const vCant = Number(v.cantidad_cuotas);
                                        const numCuotas = (vCant > 0 ? vCant : (cuotasPagares.length || lista.length || 0));

                                        // Intentar obtener monto de la venta, si no, del primer pagaré
                                        const vMonto = Number(v.monto_cuota);
                                        const rawMonto = (vMonto > 0 ? vMonto : (cuotasPagares[0]?.monto_cuota ?? lista[0]?.monto_cuota ?? 0));

                                        const monto = Number(rawMonto) || parseFloat(String(rawMonto || '0').replace(/,/g, '.')) || 0;
                                        return `${numCuotas} de Gs. ${Math.round(monto).toLocaleString('es-PY')}`;
                                    })()}</p>
                                    <div className="pagares-summary">
                                        <strong>Pagarés Generados:</strong>
                                        <ul>
                                            {v.pagares?.map(p => (
                                                <li key={p.id_pagare} className={(p.estado_rel?.nombre || '').toLowerCase()}>
                                                    Cuota {p.numero_cuota}: {p.fecha_vencimiento} ({p.estado_rel?.nombre || 'N/A'})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="venta-actions">
                            <button
                                type="button"
                                className="btn-edit-venta"
                                disabled={['ANULADA', 'FINIQUITADO'].includes(v.estado_venta)}
                                onClick={() => handleEditVenta(v)}
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                className="btn-finiquito"
                                disabled={['ANULADA', 'FINIQUITADO'].includes(v.estado_venta)}
                                onClick={() => handleFiniquitarVenta(v.id_venta, v.numero_venta, v.pagares)}
                                title="Aplica finiquito: elimina cuotas no pagadas, marca la venta como finalizada y libera el vehículo"
                            >
                                ✂ Finiquito
                            </button>
                            <button
                                type="button"
                                className="btn-anular"
                                onClick={() => handleAnularVenta(v.id_venta, v.numero_venta)}
                            >
                                Eliminar Venta
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>{editingVenta ? 'Editar Venta' : 'Nueva Venta de Vehículo'}</h3>
                            <button className="btn-close-modal-top" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveVenta} className="modal-form">
                            <div className="modal-body">
                                {newVenta.tipo_venta === 'FINANCIADO' && (
                                    <div className="modal-tabs">
                                        <button
                                            type="button"
                                            className={`tab-btn ${activeTab === 'datos' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('datos')}
                                        >
                                            Datos de Venta
                                        </button>
                                        <button
                                            type="button"
                                            className={`tab-btn ${activeTab === 'financiamiento' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('financiamiento')}
                                        >
                                            Financiación
                                        </button>
                                    </div>
                                )}

                                <div className="tab-content">
                                    {activeTab === 'datos' ? (
                                        <>
                                            <div className="form-row">
                                                <div className="form-group searchable-select-container" ref={dropdownRef}>
                                                    <label>Buscar Cliente (Nombre o Documento)</label>
                                                    <div className="searchable-select">
                                                        <input
                                                            type="text"
                                                            placeholder="Escriba para buscar por nombre o documento..."
                                                            value={clientSearch}
                                                            onChange={(e) => {
                                                                setClientSearch(e.target.value);
                                                                setShowClientDropdown(true);
                                                            }}
                                                            onFocus={() => setShowClientDropdown(true)}
                                                            className="search-input-modal"
                                                        />
                                                        {showClientDropdown && (
                                                            <div className="select-dropdown">
                                                                {clientes
                                                                    .filter(c => {
                                                                        const search = clientSearch.toLowerCase();
                                                                        return (c.nombre + ' ' + c.apellido).toLowerCase().includes(search) ||
                                                                            c.numero_documento.toLowerCase().includes(search);
                                                                    })
                                                                    .map(c => (
                                                                        <div
                                                                            key={c.id_cliente}
                                                                            className="dropdown-item"
                                                                            onClick={() => {
                                                                                setNewVenta({ ...newVenta, id_cliente: c.id_cliente });
                                                                                setClientSearch(`${c.nombre} ${c.apellido} (${c.numero_documento})`);
                                                                                setShowClientDropdown(false);
                                                                            }}
                                                                        >
                                                                            {c.nombre} {c.apellido} ({c.numero_documento})
                                                                        </div>
                                                                    ))
                                                                }
                                                                {clientes.filter(c => {
                                                                    const search = clientSearch.toLowerCase();
                                                                    return (c.nombre + ' ' + c.apellido).toLowerCase().includes(search) ||
                                                                        c.numero_documento.toLowerCase().includes(search);
                                                                }).length === 0 && (
                                                                        <div className="dropdown-no-results">No se encontraron clientes</div>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input type="hidden" required value={newVenta.id_cliente} />
                                                    {newVenta.id_cliente && !showClientDropdown && (
                                                        <div className="selected-client-badge">
                                                            Cliente seleccionado: <strong>{clientes.find(c => c.id_cliente === parseInt(newVenta.id_cliente))?.nombre} {clientes.find(c => c.id_cliente === parseInt(newVenta.id_cliente))?.apellido}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="form-group searchable-select-container" ref={vehicleDropdownRef}>
                                                    <label>Vehículo Disponible (Marca, Modelo o Chasis)</label>
                                                    <div className="searchable-select">
                                                        <input
                                                            type="text"
                                                            placeholder="Escriba para buscar vehículo..."
                                                            disabled={!!editingVenta}
                                                            value={vehicleSearch}
                                                            onChange={(e) => {
                                                                setVehicleSearch(e.target.value);
                                                                setShowVehicleDropdown(true);
                                                            }}
                                                            onFocus={() => setShowVehicleDropdown(true)}
                                                            className="search-input-modal"
                                                        />
                                                        {showVehicleDropdown && !editingVenta && (
                                                            <div className="select-dropdown">
                                                                {vehiculos
                                                                    .filter(v => {
                                                                        const search = vehicleSearch.toLowerCase();
                                                                        return v.marca.toLowerCase().includes(search) ||
                                                                            v.modelo.toLowerCase().includes(search) ||
                                                                            v.chasis.toLowerCase().includes(search);
                                                                    })
                                                                    .map(v => (
                                                                        <div
                                                                            key={v.id_producto}
                                                                            className="dropdown-item"
                                                                            onClick={() => {
                                                                                handleVehiculoChange(v.id_producto);
                                                                                setVehicleSearch(`${v.marca} ${v.modelo} (${v.chasis})`);
                                                                                setShowVehicleDropdown(false);
                                                                            }}
                                                                        >
                                                                            <strong>{v.marca} {v.modelo}</strong> ({v.chasis})
                                                                        </div>
                                                                    ))
                                                                }
                                                                {vehiculos.filter(v => {
                                                                    const search = vehicleSearch.toLowerCase();
                                                                    return v.marca.toLowerCase().includes(search) ||
                                                                        v.modelo.toLowerCase().includes(search) ||
                                                                        v.chasis.toLowerCase().includes(search);
                                                                }).length === 0 && (
                                                                        <div className="dropdown-no-results">No se encontraron vehículos disponibles</div>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input type="hidden" required value={newVenta.id_producto} />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Fecha Venta</label>
                                                    <input type="date" value={newVenta.fecha_venta} onChange={(e) => setNewVenta({ ...newVenta, fecha_venta: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Descuento (Gs.)</label>
                                                    <input
                                                        type="number"
                                                        value={newVenta.descuento}
                                                        onChange={(e) => {
                                                            const descuento = parseFloat(e.target.value) || 0;
                                                            const updated = { ...newVenta, descuento, precio_final: (newVenta.precio_venta - descuento) };
                                                            setNewVenta(calculateFinancing(updated));
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Tipo de Venta</label>
                                                    <select value={newVenta.tipo_venta} onChange={(e) => {
                                                        const val = e.target.value;
                                                        // Si hay un vehículo seleccionado, actualizar el precio según el tipo de venta
                                                        let updatedVenta = { ...newVenta, tipo_venta: val };
                                                        if (newVenta.id_producto) {
                                                            const v = vehiculos.find(veh => veh.id_producto === parseInt(newVenta.id_producto));
                                                            if (v) {
                                                                const precio = val === 'FINANCIADO' && v.precio_financiado_sugerido
                                                                    ? parseFloat(v.precio_financiado_sugerido)
                                                                    : parseFloat(v.precio_contado_sugerido);
                                                                updatedVenta.precio_venta = precio;
                                                                updatedVenta.precio_final = precio - updatedVenta.descuento;
                                                            }
                                                        }
                                                        setNewVenta(calculateFinancing(updatedVenta));
                                                    }}>
                                                        <option value="CONTADO">Contado</option>
                                                        <option value="FINANCIADO">Financiado</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Precio Venta (Gs.)</label>
                                                    <input
                                                        type="number"
                                                        value={newVenta.precio_venta}
                                                        readOnly={newVenta.tipo_venta === 'FINANCIADO'}
                                                        className={newVenta.tipo_venta === 'FINANCIADO' ? 'readonly-input' : ''}
                                                        onChange={(e) => {
                                                            const precio = parseFloat(e.target.value) || 0;
                                                            const updated = {
                                                                ...newVenta,
                                                                precio_venta: precio,
                                                                precio_final: precio - (newVenta.descuento || 0)
                                                            };
                                                            setNewVenta(calculateFinancing(updated));
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Precio Final (Gs.)</label>
                                                    <input type="number" readOnly value={newVenta.precio_final} />
                                                </div>
                                            </div>

                                             <div className="payment-distribution-section">
                                                <div className="section-header">
                                                    <h3>Distribución de Ingreso (Entrega Inicial / Contado)</h3>
                                                    <button 
                                                        type="button" 
                                                        className="btn-add-payment"
                                                        onClick={() => {
                                                            const currentDistrib = newVenta.pagos_cuentas || [];
                                                            const totalMontoEnDistrib = currentDistrib.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
                                                            const pendiente = newVenta.entrega_inicial - totalMontoEnDistrib;
                                                            
                                                            setNewVenta({
                                                                ...newVenta,
                                                                pagos_cuentas: [
                                                                    ...currentDistrib,
                                                                    { id_cuenta: '', monto: pendiente > 0 ? pendiente : 0, forma_pago: 'EFECTIVO', numero_referencia: '' }
                                                                ]
                                                            });
                                                        }}
                                                    >
                                                        + Añadir Cuenta
                                                    </button>
                                                </div>

                                                {newVenta.pagos_cuentas?.length > 0 ? (
                                                    <div className="payment-rows">
                                                        {newVenta.pagos_cuentas.map((pago, index) => (
                                                            <div key={index} className="payment-row">
                                                                <div className="form-group flex-2">
                                                                    <label>Cuenta</label>
                                                                    <select
                                                                        value={pago.id_cuenta}
                                                                        required
                                                                        onChange={(e) => {
                                                                            const updated = [...newVenta.pagos_cuentas];
                                                                            updated[index].id_cuenta = e.target.value;
                                                                            setNewVenta({ ...newVenta, pagos_cuentas: updated });
                                                                        }}
                                                                    >
                                                                        <option value="">-- Seleccionar Cuenta --</option>
                                                                        {cuentas.map(cta => (
                                                                            <option key={cta.id_cuenta} value={cta.id_cuenta}>
                                                                                {cta.nombre} (Gs. {cta.saldo_actual?.toLocaleString('es-PY')})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="form-group flex-1">
                                                                    <label>Monto (Gs.)</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={pago.monto} 
                                                                        onChange={(e) => {
                                                                            const updated = [...newVenta.pagos_cuentas];
                                                                            updated[index].monto = parseFloat(e.target.value) || 0;
                                                                            setNewVenta({ ...newVenta, pagos_cuentas: updated });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="form-group flex-1">
                                                                    <label>Forma</label>
                                                                    <select
                                                                        value={pago.forma_pago}
                                                                        onChange={(e) => {
                                                                            const updated = [...newVenta.pagos_cuentas];
                                                                            updated[index].forma_pago = e.target.value;
                                                                            setNewVenta({ ...newVenta, pagos_cuentas: updated });
                                                                        }}
                                                                    >
                                                                        <option value="EFECTIVO">Efectivo</option>
                                                                        <option value="TRANSFERENCIA">Transferencia</option>
                                                                        <option value="CHEQUE">Cheque</option>
                                                                        <option value="TARJETA">Tarjeta</option>
                                                                        <option value="GIRO">Giro / Billetera</option>
                                                                    </select>
                                                                </div>
                                                                <div className="form-group flex-1">
                                                                    <label>Ref/Boleta</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={pago.numero_referencia} 
                                                                        placeholder="Opcional"
                                                                        onChange={(e) => {
                                                                            const updated = [...newVenta.pagos_cuentas];
                                                                            updated[index].numero_referencia = e.target.value;
                                                                            setNewVenta({ ...newVenta, pagos_cuentas: updated });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    className="btn-remove-payment"
                                                                    onClick={() => {
                                                                        const updated = newVenta.pagos_cuentas.filter((_, i) => i !== index);
                                                                        setNewVenta({ ...newVenta, pagos_cuentas: updated });
                                                                    }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ))}
                                                        
                                                        <div className="distribution-summary">
                                                            <div className={`summary-item ${Math.abs(newVenta.entrega_inicial - newVenta.pagos_cuentas.reduce((s, p) => s + (p.monto || 0), 0)) < 1 ? 'matching' : 'mismatch'}`}>
                                                                Total Distribuido: <strong>Gs. {newVenta.pagos_cuentas.reduce((s, p) => s + (p.monto || 0), 0).toLocaleString('es-PY')}</strong>
                                                                {Math.abs(newVenta.entrega_inicial - newVenta.pagos_cuentas.reduce((s, p) => s + (p.monto || 0), 0)) >= 1 && (
                                                                    <span className="diff-warning"> (Faltan: Gs. {(newVenta.entrega_inicial - newVenta.pagos_cuentas.reduce((s, p) => s + (p.monto || 0), 0)).toLocaleString('es-PY')})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="no-payments-placeholder">
                                                        <p>Selecciona una cuenta para el ingreso de la venta (Total: Gs. {newVenta.entrega_inicial.toLocaleString('es-PY')})</p>
                                                        <select
                                                            value={newVenta.id_cuenta || ''}
                                                            onChange={(e) => {
                                                                const id = e.target.value;
                                                                if (id) {
                                                                    setNewVenta({ 
                                                                        ...newVenta, 
                                                                        id_cuenta: id,
                                                                        pagos_cuentas: [{ id_cuenta: id, monto: newVenta.entrega_inicial, forma_pago: 'EFECTIVO', numero_referencia: '' }]
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <option value="">-- Seleccionar Cuenta Principal --</option>
                                                            {cuentas.map(cta => (
                                                                <option key={cta.id_cuenta} value={cta.id_cuenta}>
                                                                    {cta.nombre} (Saldo: Gs. {(cta.saldo_actual || 0).toLocaleString('es-PY')})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Escribanía</label>
                                                    <select
                                                        value={newVenta.id_escribania || ''}
                                                        onChange={(e) => setNewVenta({ ...newVenta, id_escribania: e.target.value })}
                                                    >
                                                        <option value="">-- Seleccionar Escribanía --</option>
                                                        {escribanias.map(esc => (
                                                            <option key={esc.id_escribania} value={esc.id_escribania}>
                                                                {esc.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Documento de Propiedad</label>
                                                    <select
                                                        value={newVenta.tipo_documento_propiedad || ''}
                                                        onChange={(e) => setNewVenta({ ...newVenta, tipo_documento_propiedad: e.target.value })}
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        <option value="TITULO_AL_CONTADO">Título al Contado</option>
                                                        <option value="PRENDADO">Prendado</option>
                                                        <option value="RECONOCIMIENTO_DE_DEUDA">Reconocimiento de Deuda</option>
                                                        <option value="CONTRATO_SIMPLE">Contrato Simple</option>
                                                        <option value="OTRO">Otro</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* ── Vendedor ── */}
                                            <div className="form-row">
                                                <div className="form-group vendedor-selector-group" ref={vendedorRef}>
                                                    <label>Vendedor</label>
                                                    <div className="vendedor-selector">
                                                        {newVenta.id_vendedor ? (
                                                            <div className="vendedor-selected-badge">
                                                                <span className="vendedor-icon">👤</span>
                                                                <span className="vendedor-nombre">
                                                                    {(() => {
                                                                        const v = vendedores.find(vnd => vnd.id_vendedor === parseInt(newVenta.id_vendedor));
                                                                        return v ? `${v.nombre} ${v.apellido}` : 'Vendedor seleccionado';
                                                                    })()}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="vendedor-clear-btn"
                                                                    onClick={() => setNewVenta({ ...newVenta, id_vendedor: '' })}
                                                                    title="Quitar vendedor"
                                                                >
                                                                    ×
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="vendedor-change-btn"
                                                                    onClick={() => { setVendedorSearch(''); setShowVendedorPopup(true); }}
                                                                    title="Cambiar vendedor"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="vendedor-picker-btn"
                                                                onClick={() => { setVendedorSearch(''); setShowVendedorPopup(true); }}
                                                            >
                                                                <span className="vendedor-picker-icon">👤</span>
                                                                <span>Asignar Vendedor</span>
                                                            </button>
                                                        )}

                                                        {showVendedorPopup && (
                                                            <div className="vendedor-popup">
                                                                <div className="vendedor-popup-header">
                                                                    <span>Seleccionar Vendedor</span>
                                                                    <button
                                                                        type="button"
                                                                        className="vendedor-popup-close"
                                                                        onClick={() => setShowVendedorPopup(false)}
                                                                    >×</button>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    className="vendedor-search-input"
                                                                    placeholder="Buscar por nombre..."
                                                                    value={vendedorSearch}
                                                                    onChange={(e) => setVendedorSearch(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <div className="vendedor-list">
                                                                    {vendedores
                                                                        .filter(v => {
                                                                            const s = vendedorSearch.toLowerCase();
                                                                            return `${v.nombre} ${v.apellido}`.toLowerCase().includes(s);
                                                                        })
                                                                        .map(v => (
                                                                            <div
                                                                                key={v.id_vendedor}
                                                                                className={`vendedor-list-item ${parseInt(newVenta.id_vendedor) === v.id_vendedor ? 'selected' : ''}`}
                                                                                onClick={() => {
                                                                                    setNewVenta({ ...newVenta, id_vendedor: v.id_vendedor });
                                                                                    setShowVendedorPopup(false);
                                                                                }}
                                                                            >
                                                                                <span className="vnd-avatar">{v.nombre[0]}{v.apellido[0]}</span>
                                                                                <span className="vnd-name">{v.nombre} {v.apellido}</span>
                                                                                {parseInt(newVenta.id_vendedor) === v.id_vendedor && <span className="vnd-check">✓</span>}
                                                                            </div>
                                                                        ))
                                                                    }
                                                                    {vendedores.filter(v => {
                                                                        const s = vendedorSearch.toLowerCase();
                                                                        return `${v.nombre} ${v.apellido}`.toLowerCase().includes(s);
                                                                    }).length === 0 && (
                                                                            <div className="vendedor-no-results">No se encontraron vendedores</div>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group full-width">
                                                    <label>Observaciones</label>
                                                    <textarea
                                                        value={newVenta.observaciones || ''}
                                                        onChange={(e) => setNewVenta({ ...newVenta, observaciones: e.target.value })}
                                                        rows="2"
                                                        className="observaciones-textarea"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="financing-section">
                                            <h4>Configuración de Cuotas y Refuerzos</h4>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Entrega Inicial (Gs.)</label>
                                                    <input type="number" value={newVenta.entrega_inicial}
                                                        onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, entrega_inicial: parseFloat(e.target.value) || 0 }))} />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Cant. Cuotas</label>
                                                    <input type="number" value={newVenta.cantidad_cuotas}
                                                        onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, cantidad_cuotas: parseInt(e.target.value) || 0 }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Monto Cuota (Gs.)</label>
                                                    <input type="number" value={newVenta.monto_cuota}
                                                        onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, monto_cuota: parseFloat(e.target.value) || 0 }))} />
                                                </div>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Cant. Refuerzos</label>
                                                    <input type="number" value={newVenta.cantidad_refuerzos}
                                                        onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, cantidad_refuerzos: parseInt(e.target.value) || 0 }))} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Monto Refuerzo (Gs.)</label>
                                                    <input type="number" value={newVenta.monto_refuerzo}
                                                        onChange={(e) => setNewVenta(calculateFinancing({ ...newVenta, monto_refuerzo: parseFloat(e.target.value) || 0 }))} />
                                                </div>
                                            </div>
                                            <div className="form-row" style={{ marginTop: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                                                <div className="form-group">
                                                    <label>Calcular Mora cada:</label>
                                                    <select value={newVenta.periodo_int_mora} onChange={(e) => setNewVenta({ ...newVenta, periodo_int_mora: e.target.value })}>
                                                        <option value="D">Día</option>
                                                        <option value="S">Semana</option>
                                                        <option value="M">Mes</option>
                                                        <option value="A">Año</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Interés Mora (%)</label>
                                                    <input
                                                        type="number"
                                                        value={newVenta.tasa_interes}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setNewVenta({
                                                                ...newVenta,
                                                                tasa_interes: val,
                                                                monto_int_mora: val > 0 ? 0 : newVenta.monto_int_mora
                                                            });
                                                        }}
                                                        placeholder="% sobre saldo"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Cargo Fijo por Período</label>
                                                    <input
                                                        type="number"
                                                        value={newVenta.monto_int_mora}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setNewVenta({
                                                                ...newVenta,
                                                                monto_int_mora: val,
                                                                tasa_interes: val > 0 ? 0 : newVenta.tasa_interes
                                                            });
                                                        }}
                                                        placeholder="Gs. por período de atraso"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Días Gracia</label>
                                                    <input
                                                        type="number"
                                                        value={newVenta.dias_gracia}
                                                        onChange={(e) => setNewVenta({ ...newVenta, dias_gracia: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="info-resumen" style={{ marginTop: '20px', padding: '15px', background: '#e2e8f0', borderRadius: '10px' }}>
                                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Entrega Inicial: Gs. {(newVenta.entrega_inicial || 0).toLocaleString('es-PY')}</p>
                                                <p style={{ margin: '0', fontWeight: 'bold', color: '#444' }}>Total Financiado (Cuotas + Refuerzos): Gs. {((newVenta.cantidad_cuotas * newVenta.monto_cuota) + (newVenta.cantidad_refuerzos * newVenta.monto_refuerzo)).toLocaleString('es-PY')}</p>
                                                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', borderTop: '1px solid #cbd5e1', paddingTop: '5px' }}>Total Venta: Gs. {(newVenta.precio_final || 0).toLocaleString('es-PY')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">{editingVenta ? 'Guardar Cambios' : 'Confirmar Venta y Generar Pagarés'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAfterSalePagares && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>Venta Registrada - Editar Pagarés Generados</h3>
                            <button className="btn-close-modal-top" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>A continuación puede ajustar las fechas y números de los pagarés generados automáticamente.</p>

                            <div className="pagares-edit-list">
                                <table className="custom-table">
                                    <thead>
                                        <tr>
                                            <th>Nro. Pagaré</th>
                                            <th>Cuota</th>
                                            <th>Monto</th>
                                            <th>Vencimiento</th>
                                            <th>Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {justCreatedPagares.map(p => (
                                            <tr key={p.id_pagare}>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={p.numero_pagare}
                                                        onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, numero_pagare: e.target.value })}
                                                        style={{ width: '120px' }}
                                                    />
                                                </td>
                                                <td>{p.numero_cuota} ({p.tipo_pagare})</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={p.monto_cuota}
                                                        onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, monto_cuota: e.target.value })}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        value={p.fecha_vencimiento}
                                                        onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, fecha_vencimiento: e.target.value })}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={p.observaciones || ''}
                                                        placeholder="Opcional"
                                                        onChange={(e) => handleUpdateJustCreatedPagare(p.id_pagare, { ...p, observaciones: e.target.value })}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-save" onClick={handleCloseModal}>Finalizar y Guardar Todo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasPlaya;
