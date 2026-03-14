import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CobrosPlaya.css';

const CobrosPlaya = () => {
    const [pagares, setPagares] = useState([]);
    const [allPagares, setAllPagares] = useState([]); // Todos los pagarés incluyendo cancelados
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [includeCancelados, setIncludeCancelados] = useState(false);
    const [selectedPagare, setSelectedPagare] = useState(null);
    const [cuentas, setCuentas] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'fecha_vencimiento', direction: 'asc' });
    const [newPago, setNewPago] = useState({
        id_pagare: '',
        id_venta: '',
        id_cuenta: '',
        numero_recibo: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        monto_pagado: 0,
        mora_aplicada: 0,
        forma_pago: 'EFECTIVO',
        numero_referencia: '',
        observaciones: '',
        cancelar_pagare: false
    });

    const [showPagosModal, setShowPagosModal] = useState(false);
    const [selectedPagos, setSelectedPagos] = useState([]);
    const [isEditingPago, setIsEditingPago] = useState(false);
    const [pagoToEdit, setPagoToEdit] = useState(null);
    const [recentPagos, setRecentPagos] = useState([]);
    const [fetchingRecent, setFetchingRecent] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchPagares();
        fetchAllPagares();
        fetchCuentas();
        fetchRecentPagos();
    }, []);

    useEffect(() => {
        if (includeCancelados) {
            fetchAllPagares();
        }
    }, [includeCancelados]);

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    const fetchCuentas = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/cuentas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCuentas(res.data.filter(c => c.activo));
        } catch (error) {
            console.error('Error fetching cuentas:', error);
        }
    };

    const fetchRecentPagos = async () => {
        setFetchingRecent(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/pagos?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentPagos(res.data);
        } catch (error) {
            console.error('Error fetching recent pagos:', error);
        } finally {
            setFetchingRecent(false);
        }
    };

    const fetchPagares = async () => {
        try {
            const token = sessionStorage.getItem('token');
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

    const fetchAllPagares = async () => {
        try {
            const token = sessionStorage.getItem('token');

            // ✅ CORRECCIÓN: Usar /pagares para traer TODOS los pagarés (incluyendo PAGADOS)
            // El endpoint /pagares/pendientes NO incluye pagarés con estado PAGADO,
            // lo que causaba que no se mostrara el historial de pagos de cuotas pagadas

            // Obtener pagarés y ventas en paralelo
            const [pagaresResponse, ventasResponse] = await Promise.all([
                axios.get(`${API_URL}/playa/pagares`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/playa/ventas`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (!pagaresResponse.data || pagaresResponse.data.length === 0) {
                setAllPagares([]);
                return;
            }

            // Crear un mapa de ventas por id_venta para búsqueda rápida
            const ventasMap = {};
            if (ventasResponse.data && Array.isArray(ventasResponse.data)) {
                ventasResponse.data.forEach(venta => {
                    if (venta && venta.id_venta) {
                        const clienteNombre = venta.cliente
                            ? `${venta.cliente.nombre || ''} ${venta.cliente.apellido || ''}`.trim()
                            : 'N/A';
                        const clienteDoc = venta.cliente?.numero_documento || '';
                        const vehiculoInfo = venta.producto
                            ? `${venta.producto.marca || ''} ${venta.producto.modelo || ''}`.trim()
                            : 'N/A';

                        ventasMap[venta.id_venta] = {
                            cliente: clienteNombre || 'N/A',
                            numero_documento: clienteDoc,
                            vehiculo: vehiculoInfo || 'N/A',
                            chasis: venta.producto?.chasis || '',
                            periodo_int_mora: venta.periodo_int_mora,
                            monto_int_mora: venta.monto_int_mora,
                            tasa_interes: venta.tasa_interes,
                            dias_gracia: venta.dias_gracia
                        };
                    }
                });
            }

            console.log('Ventas cargadas en mapa:', Object.keys(ventasMap).length, 'ventas');

            // Procesar pagarés con información de ventas
            const pagaresWithInfo = pagaresResponse.data.map(p => {
                const monto_cuota = typeof p.monto_cuota === 'object' && p.monto_cuota !== null
                    ? parseFloat(p.monto_cuota)
                    : parseFloat(p.monto_cuota || 0);

                const saldo_pendiente = p.saldo_pendiente
                    ? (typeof p.saldo_pendiente === 'object' && p.saldo_pendiente !== null
                        ? parseFloat(p.saldo_pendiente)
                        : parseFloat(p.saldo_pendiente))
                    : monto_cuota;

                // Formatear fecha_vencimiento
                let fecha_vencimiento = p.fecha_vencimiento;
                if (fecha_vencimiento && typeof fecha_vencimiento === 'object') {
                    if (fecha_vencimiento.isoformat) {
                        fecha_vencimiento = fecha_vencimiento.isoformat();
                    } else if (fecha_vencimiento instanceof Date) {
                        fecha_vencimiento = fecha_vencimiento.toISOString().split('T')[0];
                    } else {
                        fecha_vencimiento = String(fecha_vencimiento);
                    }
                } else if (!fecha_vencimiento) {
                    fecha_vencimiento = new Date().toISOString().split('T')[0];
                }

                // ✅ CORRECCIÓN: Usar estado_rel.nombre del backend
                const estadoCalculado = p.estado_rel?.nombre || 'PENDIENTE';

                // Obtener información de la venta
                const ventaInfo = ventasMap[p.id_venta];

                return {
                    id_pagare: p.id_pagare,
                    id_venta: p.id_venta,
                    numero_cuota: p.numero_cuota || 0,
                    total_cuotas: 0, // Se calculará después
                    monto_cuota: monto_cuota,
                    saldo_pendiente: saldo_pendiente,
                    fecha_vencimiento: fecha_vencimiento,
                    estado: estadoCalculado,
                    fecha_pago: p.fecha_pago || null,
                    cliente: ventaInfo?.cliente || 'N/A',
                    numero_documento: ventaInfo?.numero_documento || '',
                    vehiculo: ventaInfo?.vehiculo || 'N/A',
                    chasis: ventaInfo?.chasis || '',
                    periodo_int_mora: ventaInfo?.periodo_int_mora,
                    monto_int_mora: ventaInfo?.monto_int_mora,
                    tasa_interes: ventaInfo?.tasa_interes,
                    dias_gracia: ventaInfo?.dias_gracia,
                    cancelado: p.cancelado || false,
                    tipo_pagare: p.tipo_pagare || 'CUOTA',
                    // ✅ IMPORTANTE: Incluir el array de pagos que viene del backend
                    pagos: p.pagos || []
                };
            }).filter(p => p.id_venta); // Filtrar pagarés sin id_venta

            // Log para verificar cuántos pagarés tienen información de cliente/vehículo
            const pagaresConInfo = pagaresWithInfo.filter(p =>
                p.cliente && p.cliente !== 'N/A' && p.vehiculo && p.vehiculo !== 'N/A'
            );
            console.log('Pagarés con información completa:', pagaresConInfo.length, 'de', pagaresWithInfo.length);
            console.log('Pagarés con pagos:', pagaresWithInfo.filter(p => p.pagos && p.pagos.length > 0).length);

            // DEBUG: imprimir datos exactos de MILCIADES (1110978) como texto plano
            pagaresWithInfo
                .filter(p => p.numero_documento === '1110978')
                .forEach(p => {
                    const pago0 = (p.pagos || [])[0];
                    console.log(
                        `[MILCIADES] cuota=${p.numero_cuota} | cancelado=${p.cancelado} (tipo: ${typeof p.cancelado})` +
                        ` | estado=${p.estado} | monto_int_mora=${p.monto_int_mora} | periodo=${p.periodo_int_mora}` +
                        ` | id_venta=${p.id_venta} | pagos_count=${(p.pagos || []).length}` +
                        (pago0 ? ` | pago0: monto=${pago0.monto_pagado}, mora=${pago0.mora_aplicada}` : '')
                    );
                });

            // Calcular total de cuotas por venta (solo tipo CUOTA, excluyendo ENTREGA_INICIAL)
            const ventasCuotas = {};
            pagaresWithInfo.forEach(p => {
                if (p.id_venta && p.tipo_pagare === 'CUOTA') {
                    if (!ventasCuotas[p.id_venta]) {
                        ventasCuotas[p.id_venta] = 0;
                    }
                    ventasCuotas[p.id_venta]++;
                }
            });

            // Asignar total de cuotas
            pagaresWithInfo.forEach(p => {
                if (p.tipo_pagare === 'ENTREGA_INICIAL') {
                    p.total_cuotas = 0; // Muestra 0/0
                } else if (p.id_venta) {
                    p.total_cuotas = ventasCuotas[p.id_venta] || p.numero_cuota;
                }
            });

            setAllPagares(pagaresWithInfo);
        } catch (error) {
            console.error('Error fetching all pagares:', error);
            setAllPagares([]);
        }
    };

    const handleOpenCobro = async (pagare) => {
        // ✅ VALIDACIÓN: No permitir pagar una cuota sin haber cancelado la anterior
        const anteriorPendiente = allPagares.find(p =>
            p.id_venta === pagare.id_venta &&
            p.tipo_pagare === pagare.tipo_pagare &&
            p.numero_cuota < pagare.numero_cuota &&
            !p.cancelado
        );

        if (anteriorPendiente) {
            alert(`No se puede cobrar la cuota ${pagare.numero_cuota} sin haber cancelado la anterior (Cuota ${anteriorPendiente.numero_cuota})`);
            return;
        }

        // Si es la cuota 1, verificar que la Entrega Inicial esté cancelada
        if (pagare.tipo_pagare === 'CUOTA' && pagare.numero_cuota === 1) {
            const eiPendiente = allPagares.find(p =>
                p.id_venta === pagare.id_venta &&
                p.tipo_pagare === 'ENTREGA_INICIAL' &&
                !p.cancelado
            );
            if (eiPendiente) {
                alert('No se puede cobrar la cuota 1 sin haber cancelado la Entrega Inicial');
                return;
            }
        }

        setSelectedPagare(pagare);

        // Cargar pagos previos para mostrar en el desglose
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/pagares/${pagare.id_pagare}/pagos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedPagos(res.data);
        } catch (error) {
            console.error('Error fetching existing pagos:', error);
            setSelectedPagos([]);
        }

        const initialPago = {
            ...newPago,
            id_pagare: pagare.id_pagare,
            id_venta: pagare.id_venta,
            id_cuenta: '', // Reiniciar cuenta
            monto_pagado: pagare.saldo_pendiente,
            mora_aplicada: 0,
            numero_recibo: `REC-${Date.now()}`,
            cancelar_pagare: false
        };

        // Calcular mora inicial
        const mora = calcularMora(pagare, initialPago.fecha_pago);
        setNewPago({
            ...initialPago,
            mora_aplicada: mora
        });
        setShowModal(true);
    };

    const calcularMora = (pagare, fechaPagoStr) => {
        if (!pagare || !pagare.fecha_vencimiento) return 0;

        // Parsear fechas (YYYY-MM-DD)
        const [yV, mV, dV] = pagare.fecha_vencimiento.split('-').map(Number);
        const [yP, mP, dP] = fechaPagoStr.split('-').map(Number);

        const fecVenc = new Date(yV, mV - 1, dV);
        const fecRef = new Date(yP, mP - 1, dP);

        // Si la fecha de referencia es anterior o igual al vencimiento, no hay mora
        if (fecRef <= fecVenc) return 0;

        const montoIntMora = parseFloat(pagare.monto_int_mora || 0);
        const diasGracia = parseInt(pagare.dias_gracia || 0);
        const periodo = pagare.periodo_int_mora || 'D';

        // Diferencia total en días naturales (24h)
        const diffDaysTotal = Math.floor((fecRef.getTime() - fecVenc.getTime()) / (1000 * 60 * 60 * 24));
        
        // REGLA DE GRACIA: Si el atraso no supera los días de gracia, 0 interés.
        if (diffDaysTotal <= diasGracia) return 0;

        // REGLA DE CÁLCULO: Si supera los días de gracia, se cobra por TODOS los días de atraso.
        // Ejemplo: Venc 04, Hoy 14 -> 10 días de atraso. Si gracia es 5, 10 > 5 -> 10 * interes_diario.
        let diasPorPeriodo = 1;
        if (periodo === 'S') diasPorPeriodo = 7;
        else if (periodo === 'M') diasPorPeriodo = 30;
        else if (periodo === 'A') diasPorPeriodo = 365;

        const moraGenerada = (diffDaysTotal / diasPorPeriodo) * montoIntMora;

        return Math.floor(moraGenerada);
    };

    const handleFechaPagoChange = (e) => {
        const nuevaFecha = e.target.value;
        const mora = calcularMora(selectedPagare, nuevaFecha);
        setNewPago({
            ...newPago,
            fecha_pago: nuevaFecha,
            mora_aplicada: mora
        });
    };

    const handleConfirmPago = async (e) => {
        e.preventDefault();
        try {
            if (parseFloat(newPago.monto_pagado) < 0 || parseFloat(newPago.mora_aplicada) < 0) {
                alert('Los montos no pueden ser negativos');
                return;
            }

            const token = sessionStorage.getItem('token');
            if (isEditingPago) {
                await axios.put(`${API_URL}/playa/pagos/${pagoToEdit.id_pago}`, newPago, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Cobro actualizado exitosamente');
                setIsEditingPago(false);
                setPagoToEdit(null);
                // Si estamos editando desde el modal de pagos, refrescar esa lista
                if (selectedPagare) {
                    handleViewPagos(selectedPagare);
                }
            } else {
                await axios.post(`${API_URL}/playa/pagos`, newPago, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Cobro registrado exitosamente');
            }
            setShowModal(false);
            await Promise.all([fetchPagares(), fetchAllPagares(), fetchRecentPagos()]);
        } catch (error) {
            alert('Error al procesar cobro: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleViewPagos = async (pagare) => {
        try {
            setSelectedPagare(pagare);

            // Siempre obtener datos frescos al ver historial para asegurar que refleje cambios recientes
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/pagares/${pagare.id_pagare}/pagos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedPagos(res.data);

            setShowPagosModal(true);
        } catch (error) {
            console.error('Error fetching pagos:', error);
            setSelectedPagos([]);
            setShowPagosModal(true);
        }
    };

    const handleEditPago = (pago) => {
        setPagoToEdit(pago);
        setIsEditingPago(true);

        // Formatear fecha para el input type="date"
        let formattedDate = pago.fecha_pago;
        if (formattedDate && formattedDate.includes('T')) {
            formattedDate = formattedDate.split('T')[0];
        }

        setNewPago({
            ...pago,
            fecha_pago: formattedDate,
            cancelar_pagare: false // No es relevante en edición
        });
        setShowModal(true);
    };

    const handleDeletePago = async (id_pago) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este cobro? Esto revertirá el saldo del pagaré.')) return;

        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/pagos/${id_pago}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Cobro eliminado correctamente');
            // Refrescar datos
            await Promise.all([fetchPagares(), fetchAllPagares()]);
            // Refrescar el modal de pagos
            if (selectedPagare) {
                handleViewPagos(selectedPagare);
            }
        } catch (error) {
            alert('Error al eliminar cobro: ' + (error.response?.data?.detail || error.message));
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPagares = () => {
        // ✅ IMPORTANTE: Usar siempre allPagares porque esta lista ya está enriquecida con 
        // la configuración de intereses (monto_int_mora, tasa_interes, etc.) de las ventas.
        // La lista 'pagares' (pendientes) viene cruda del backend sin esos parámetros.
        const source = includeCancelados ? allPagares : allPagares.filter(p => !p.cancelado);
        const search = searchTerm.toLowerCase().trim();
        const searchClean = search.replace(/[-\s]/g, '');

        const filtered = source.filter(p => {
            if (!search) return true;

            const cliente = (p.cliente || '').toLowerCase();
            const documento = (p.numero_documento || '').toLowerCase();
            const vehiculo = (p.vehiculo || '').toLowerCase();
            const chasis = (p.chasis || '').toLowerCase();
            const chasisClean = chasis.replace(/[-\s]/g, '');

            return cliente.includes(search) ||
                documento.includes(search) ||
                vehiculo.includes(search) ||
                chasis.includes(search) ||
                (searchClean !== '' && chasisClean.includes(searchClean));
        });

        return filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'fecha_vencimiento') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '🔼' : '🔽';
    };

    const handleVerPlanPago = async () => {
        let pagaresToPrint;

        // Si se incluyen cancelados, asegurarse de tener los datos
        if (includeCancelados) {
            // Si allPagares está vacío, cargar primero
            if (!allPagares || allPagares.length === 0) {
                try {
                    const token = sessionStorage.getItem('token');
                    const response = await axios.get(`${API_URL}/playa/pagares`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!response.data || response.data.length === 0) {
                        alert('No hay pagarés disponibles en el sistema.');
                        return;
                    }

                    // Obtener todas las ventas de una vez
                    const ventasResponse = await axios.get(`${API_URL}/playa/ventas`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // Crear un mapa de ventas por id_venta para búsqueda rápida
                    const ventasInfo = {};
                    if (ventasResponse.data && Array.isArray(ventasResponse.data)) {
                        ventasResponse.data.forEach(venta => {
                            if (venta && venta.id_venta) {
                                // Asegurarse de que siempre se agregue al mapa, incluso si falta cliente o producto
                                const clienteNombre = venta.cliente
                                    ? `${venta.cliente.nombre || ''} ${venta.cliente.apellido || ''}`.trim()
                                    : 'N/A';
                                const clienteDoc = venta.cliente?.numero_documento || '';
                                const vehiculoInfo = venta.producto
                                    ? `${venta.producto.marca || ''} ${venta.producto.modelo || ''}`.trim()
                                    : 'N/A';

                                ventasInfo[venta.id_venta] = {
                                    cliente: clienteNombre || 'N/A',
                                    numero_documento: clienteDoc,
                                    vehiculo: vehiculoInfo || 'N/A',
                                    chasis: venta.producto?.chasis || ''
                                };
                            }
                        });
                    }

                    // Procesar pagarés
                    const pagaresWithInfo = response.data.map(p => {
                        const monto_cuota = typeof p.monto_cuota === 'object' && p.monto_cuota !== null
                            ? parseFloat(p.monto_cuota)
                            : parseFloat(p.monto_cuota || 0);

                        const saldo_pendiente = p.saldo_pendiente
                            ? (typeof p.saldo_pendiente === 'object' && p.saldo_pendiente !== null
                                ? parseFloat(p.saldo_pendiente)
                                : parseFloat(p.saldo_pendiente))
                            : monto_cuota;

                        let fecha_vencimiento = p.fecha_vencimiento;
                        if (fecha_vencimiento && typeof fecha_vencimiento === 'object') {
                            if (fecha_vencimiento.isoformat) {
                                fecha_vencimiento = fecha_vencimiento.isoformat();
                            } else if (fecha_vencimiento instanceof Date) {
                                fecha_vencimiento = fecha_vencimiento.toISOString().split('T')[0];
                            } else {
                                fecha_vencimiento = String(fecha_vencimiento);
                            }
                        } else if (!fecha_vencimiento) {
                            fecha_vencimiento = new Date().toISOString().split('T')[0];
                        }

                        return {
                            id_pagare: p.id_pagare,
                            id_venta: p.id_venta,
                            numero_cuota: p.numero_cuota || 0,
                            monto_cuota: monto_cuota,
                            saldo_pendiente: saldo_pendiente,
                            fecha_vencimiento: fecha_vencimiento,
                            estado: p.estado_rel?.nombre || p.estado ||
                                (saldo_pendiente <= 0 || p.cancelado ? 'PAGADO' : 'PENDIENTE'),
                            fecha_pago: p.fecha_pago || null,
                            cliente: ventasInfo[p.id_venta]?.cliente || 'N/A',
                            numero_documento: ventasInfo[p.id_venta]?.numero_documento || '',
                            vehiculo: ventasInfo[p.id_venta]?.vehiculo || 'N/A',
                            chasis: ventasInfo[p.id_venta]?.chasis || '',
                            tipo_pagare: p.tipo_pagare || 'CUOTA',
                            total_cuotas: 0
                        };
                    }).filter(p => p.id_venta);

                    // Calcular total de cuotas por venta
                    const ventasCuotas = {};
                    pagaresWithInfo.forEach(p => {
                        if (p.id_venta) {
                            if (!ventasCuotas[p.id_venta]) {
                                ventasCuotas[p.id_venta] = 0;
                            }
                            ventasCuotas[p.id_venta]++;
                        }
                    });

                    pagaresWithInfo.forEach(p => {
                        if (p.id_venta) {
                            p.total_cuotas = ventasCuotas[p.id_venta] || p.numero_cuota;
                        }
                    });

                    pagaresToPrint = pagaresWithInfo;
                    // Actualizar el estado para que esté disponible la próxima vez
                    setAllPagares(pagaresWithInfo);
                    console.log('Pagarés cargados dinámicamente:', pagaresToPrint.length);
                } catch (error) {
                    console.error('Error cargando pagarés:', error);
                    alert('Error al cargar los pagarés. Por favor, intente nuevamente.');
                    return;
                }
            } else {
                // Verificar que allPagares tiene datos Y que tienen información de cliente/vehículo
                const pagaresConInfo = allPagares.filter(p =>
                    p.cliente && p.cliente !== 'N/A' && p.vehiculo && p.vehiculo !== 'N/A'
                );

                // Si menos del 10% de los pagarés tienen información, recargar
                if (allPagares.length > 0 && pagaresConInfo.length < allPagares.length * 0.1) {
                    console.warn('⚠️ La mayoría de los pagarés no tienen información de cliente/vehículo. Recargando...');
                    await fetchAllPagares();
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Usar allPagares actualizado
                    if (allPagares && allPagares.length > 0) {
                        pagaresToPrint = allPagares;
                        console.log('Pagarés después de recargar:', pagaresToPrint.length);
                    } else {
                        // Si aún está vacío, cargar dinámicamente (código existente)
                        console.log('allPagares sigue vacío, cargando dinámicamente...');
                    }
                } else if (!allPagares || allPagares.length === 0) {
                    console.warn('allPagares está vacío aunque se esperaba que tuviera datos. Recargando...');
                    // Forzar recarga
                    await fetchAllPagares();
                    // Esperar un momento para que se actualice el estado
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Intentar usar allPagares de nuevo después de la recarga
                    if (allPagares && allPagares.length > 0) {
                        pagaresToPrint = allPagares;
                        console.log('Pagarés después de recargar:', pagaresToPrint.length);
                    } else {
                        // Si aún está vacío, cargar dinámicamente
                        console.log('allPagares sigue vacío, cargando dinámicamente...');
                        // Reutilizar la lógica de carga dinámica
                        const token = sessionStorage.getItem('token');
                        const [pagaresResponse, ventasResponse] = await Promise.all([
                            axios.get(`${API_URL}/playa/pagares`, {
                                headers: { Authorization: `Bearer ${token}` }
                            }),
                            axios.get(`${API_URL}/playa/ventas`, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                        ]);

                        const ventasMap = {};
                        if (ventasResponse.data && Array.isArray(ventasResponse.data)) {
                            ventasResponse.data.forEach(venta => {
                                if (venta && venta.id_venta) {
                                    // Asegurarse de que siempre se agregue al mapa, incluso si falta cliente o producto
                                    const clienteNombre = venta.cliente
                                        ? `${venta.cliente.nombre || ''} ${venta.cliente.apellido || ''}`.trim()
                                        : 'N/A';
                                    const clienteDoc = venta.cliente?.numero_documento || '';
                                    const vehiculoInfo = venta.producto
                                        ? `${venta.producto.marca || ''} ${venta.producto.modelo || ''}`.trim()
                                        : 'N/A';

                                    ventasMap[venta.id_venta] = {
                                        cliente: clienteNombre || 'N/A',
                                        numero_documento: clienteDoc,
                                        vehiculo: vehiculoInfo || 'N/A',
                                        chasis: venta.producto?.chasis || '',
                                        periodo_int_mora: venta.periodo_int_mora,
                                        monto_int_mora: venta.monto_int_mora,
                                        tasa_interes: venta.tasa_interes,
                                        dias_gracia: venta.dias_gracia
                                    };
                                }
                            });
                        }

                        const pagaresWithInfo = pagaresResponse.data.map(p => {
                            const monto_cuota = typeof p.monto_cuota === 'object' && p.monto_cuota !== null
                                ? parseFloat(p.monto_cuota)
                                : parseFloat(p.monto_cuota || 0);

                            const saldo_pendiente = p.saldo_pendiente
                                ? (typeof p.saldo_pendiente === 'object' && p.saldo_pendiente !== null
                                    ? parseFloat(p.saldo_pendiente)
                                    : parseFloat(p.saldo_pendiente))
                                : monto_cuota;

                            let fecha_vencimiento = p.fecha_vencimiento;
                            if (fecha_vencimiento && typeof fecha_vencimiento === 'object') {
                                if (fecha_vencimiento.isoformat) {
                                    fecha_vencimiento = fecha_vencimiento.isoformat();
                                } else if (fecha_vencimiento instanceof Date) {
                                    fecha_vencimiento = fecha_vencimiento.toISOString().split('T')[0];
                                } else {
                                    fecha_vencimiento = String(fecha_vencimiento);
                                }
                            } else if (!fecha_vencimiento) {
                                fecha_vencimiento = new Date().toISOString().split('T')[0];
                            }

                            // Obtener información de la venta, con valores por defecto
                            const ventaInfo = ventasMap[p.id_venta];
                            const cliente = ventaInfo?.cliente || 'N/A';
                            const numero_documento = ventaInfo?.numero_documento || '';
                            const vehiculo = ventaInfo?.vehiculo || 'N/A';

                            return {
                                id_pagare: p.id_pagare,
                                id_venta: p.id_venta,
                                numero_cuota: p.numero_cuota || 0,
                                monto_cuota: monto_cuota,
                                saldo_pendiente: saldo_pendiente,
                                fecha_vencimiento: fecha_vencimiento,
                                estado: p.estado_rel?.nombre || p.estado ||
                                    (saldo_pendiente <= 0 || p.cancelado ? 'PAGADO' : 'PENDIENTE'),
                                fecha_pago: p.fecha_pago || null,
                                cliente: cliente,
                                numero_documento: numero_documento,
                                vehiculo: vehiculo,
                                chasis: ventaInfo?.chasis || '',
                                tipo_pagare: p.tipo_pagare || 'CUOTA',
                                total_cuotas: 0
                            };
                        }).filter(p => p.id_venta);

                        const ventasCuotas = {};
                        pagaresWithInfo.forEach(p => {
                            if (p.id_venta) {
                                if (!ventasCuotas[p.id_venta]) {
                                    ventasCuotas[p.id_venta] = 0;
                                }
                                ventasCuotas[p.id_venta]++;
                            }
                        });

                        pagaresWithInfo.forEach(p => {
                            if (p.id_venta) {
                                p.total_cuotas = ventasCuotas[p.id_venta] || p.numero_cuota;
                            }
                        });

                        pagaresToPrint = pagaresWithInfo;
                        setAllPagares(pagaresWithInfo);
                        console.log('Pagarés cargados como fallback:', pagaresToPrint.length);
                    }
                } else {
                    pagaresToPrint = allPagares;
                    console.log('Usando allPagares existente:', pagaresToPrint.length);
                }
            }
        } else {
            pagaresToPrint = pagares;
            console.log('Usando pagares pendientes:', pagaresToPrint.length);
        }

        console.log('Pagarés a imprimir antes de filtrar:', pagaresToPrint?.length || 0);

        // Verificar que hay datos
        if (!pagaresToPrint || pagaresToPrint.length === 0) {
            alert(includeCancelados
                ? 'No hay pagarés disponibles para mostrar.'
                : 'No hay pagarés pendientes para mostrar.');
            return;
        }

        // Filtrar por búsqueda si hay
        const filteredForPrint = pagaresToPrint.filter(p => {
            // Verificar que el pagaré tenga id_venta (mínimo requerido)
            if (!p || !p.id_venta) {
                console.warn('Pagaré sin id_venta:', p);
                return false;
            }

            // Si no hay término de búsqueda, incluir todos los pagarés válidos
            if (!searchTerm || searchTerm.trim() === '') {
                return true;
            }

            // Si hay búsqueda, verificar que coincida con algún campo
            const search = searchTerm.toLowerCase().trim();

            // Normalizar los campos para búsqueda
            const cliente = (p.cliente || '').toLowerCase().trim();
            const documento = (p.numero_documento || '').toLowerCase().trim();
            const vehiculo = (p.vehiculo || '').toLowerCase().trim();
            const chasis = (p.chasis || '').toLowerCase().trim();

            // Buscar en todos los campos disponibles (incluso si son 'N/A', buscar en la cadena completa)
            // Esto permite encontrar coincidencias incluso si algunos campos están como 'N/A'
            const matches = cliente.includes(search) ||
                documento.includes(search) ||
                vehiculo.includes(search) ||
                chasis.includes(search);

            return matches;
        });

        console.log('Debug print plan:', {
            includeCancelados,
            totalPagaresToPrint: pagaresToPrint?.length || 0,
            totalFiltered: filteredForPrint.length,
            searchTerm,
            samplePagare: pagaresToPrint?.[0],
            sampleFiltered: filteredForPrint?.[0]
        });

        // Si hay búsqueda y no se encontraron resultados, mostrar algunos ejemplos para debug
        if (searchTerm && searchTerm.trim() !== '' && filteredForPrint.length === 0 && pagaresToPrint.length > 0) {
            const samplePagares = pagaresToPrint.slice(0, 10);
            console.warn('⚠️ No se encontraron pagarés con la búsqueda "' + searchTerm + '". Ejemplos de pagarés disponibles:',
                samplePagares.map(p => ({
                    id_pagare: p.id_pagare,
                    id_venta: p.id_venta,
                    cliente: p.cliente,
                    documento: p.numero_documento,
                    vehiculo: p.vehiculo,
                    estado: p.estado,
                    // Mostrar los valores normalizados para debug
                    cliente_normalized: (p.cliente || '').toLowerCase().trim(),
                    documento_normalized: (p.numero_documento || '').toLowerCase().trim(),
                    vehiculo_normalized: (p.vehiculo || '').toLowerCase().trim()
                }))
            );

            // Buscar manualmente si hay algún pagaré que contenga "Nery" en algún campo
            const manualSearch = pagaresToPrint.filter(p => {
                const cliente = (p.cliente || '').toLowerCase();
                const documento = (p.numero_documento || '').toLowerCase();
                const vehiculo = (p.vehiculo || '').toLowerCase();
                const search = searchTerm.toLowerCase();
                return cliente.includes(search) || documento.includes(search) || vehiculo.includes(search);
            });
            console.log('🔍 Búsqueda manual encontrada:', manualSearch.length, 'pagarés');

            // Si la búsqueda manual tampoco encuentra nada, buscar en todos los campos posibles
            if (manualSearch.length === 0) {
                console.log('🔍 Buscando en todos los campos del objeto...');
                const deepSearch = pagaresToPrint.filter(p => {
                    const pStr = JSON.stringify(p).toLowerCase();
                    return pStr.includes(searchTerm.toLowerCase());
                });
                console.log('🔍 Búsqueda profunda encontrada:', deepSearch.length, 'pagarés');
                if (deepSearch.length > 0) {
                    console.log('🔍 Primer pagaré encontrado en búsqueda profunda:', deepSearch[0]);
                }
            }
        }

        // Verificar que hay datos filtrados
        if (filteredForPrint.length === 0) {
            alert('No se encontraron pagarés que coincidan con los criterios de búsqueda.');
            return;
        }

        // Agrupar por venta para mostrar el plan completo
        const pagaresByVenta = {};
        filteredForPrint.forEach(p => {
            if (!p || !p.id_venta) {
                console.warn('Pagaré sin id_venta válido:', p);
                return;
            }

            if (!pagaresByVenta[p.id_venta]) {
                pagaresByVenta[p.id_venta] = {
                    venta: p.id_venta,
                    cliente: p.cliente || 'N/A',
                    numero_documento: p.numero_documento || '',
                    vehiculo: p.vehiculo || 'N/A',
                    chasis: p.chasis || '',
                    pagares: []
                };
            }
            pagaresByVenta[p.id_venta].pagares.push(p);
        });

        // Verificar que hay datos agrupados
        if (Object.keys(pagaresByVenta).length === 0) {
            alert('No se encontraron pagarés para mostrar en el plan de pago.');
            return;
        }

        // Ordenar pagarés por número de cuota dentro de cada venta
        Object.keys(pagaresByVenta).forEach(ventaId => {
            pagaresByVenta[ventaId].pagares.sort((a, b) => a.numero_cuota - b.numero_cuota);
        });

        const fechaActual = new Date().toLocaleDateString('es-PY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Plan de Pago - ${fechaActual}</title>
    <style>
        @media print {
            @page {
                margin: 1cm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: 10pt;
            }
            .no-print {
                display: none;
            }
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
            color: #000;
        }
        .report-header-formal {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
        }
        .header-left {
            display: flex;
            gap: 20px;
        }
        .report-logo {
            width: 150px;
            height: auto;
            object-fit: contain;
        }
        .company-info h2 {
            margin: 0;
            font-size: 14pt;
            color: #1e293b;
        }
        .company-info p {
            margin: 2px 0;
            font-size: 9pt;
            color: #475569;
        }
        .header-right {
            text-align: right;
            font-size: 9pt;
            font-weight: 600;
            color: #1e293b;
        }
        .report-title-section {
            margin-bottom: 20px;
            text-align: center;
        }
        .report-title {
            font-size: 18pt;
            margin: 0;
            color: #000;
            font-weight: bold;
            text-decoration: underline;
        }
        .print-filters {
            margin-bottom: 20px;
            font-size: 10pt;
            color: #475569;
            padding: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        .venta-group {
            margin-bottom: 25px;
            border: 1px solid #000;
            padding: 15px;
            page-break-inside: auto;
        }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        .venta-header {
            background: #f1f5f9;
            color: #000;
            padding: 10px;
            border-bottom: 1px solid #000;
            margin-bottom: 15px;
            page-break-after: avoid;
        }
        .venta-header h3 {
            margin: 0;
            font-size: 12pt;
            font-weight: bold;
        }
        .venta-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
            font-size: 10pt;
        }
        .venta-info-item {
            padding: 8px;
            background: white;
            border-radius: 4px;
        }
        .venta-info-item strong {
            color: #1e293b;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            background: white;
            border: 1px solid #000;
        }
        th {
            background-color: #eee;
            color: #000;
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            font-size: 9pt;
            text-transform: uppercase;
        }
        td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 9pt;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: bold;
            display: inline-block;
        }
        .status-badge.pendiente {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-badge.parcial {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .status-badge.pagado {
            background-color: #dcfce7;
            color: #166534;
        }
        .status-badge.vencido {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .status-badge.anulado {
            background-color: #f3f4f6;
            color: #6b7280;
        }
        .overdue {
            background-color: #fee2e2 !important;
        }
        .print-footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9pt;
            color: #64748b;
            border-top: 2px solid #e2e8f0;
            padding-top: 15px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
        .print-button:hover {
            background: #1d4ed8;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
    
    <div class="report-header-formal">
        <div class="header-left">
            <img src="/imágenes/Logo_oficial2.jpg" alt="Logo" class="report-logo" />
            <div class="company-info">
                <h2 class="company-name">PERALTA AUTOMOTORES</h2>
                <p>Ingavi, Fernando de la Mora</p>
                <p>RUC: 2349334-8</p>
                <p>Correo: peraltaautomotores@gmail.com</p>
            </div>
        </div>
        <div class="header-right">
            <p>${new Date().toLocaleDateString('es-PY')}</p>
            <p>${new Date().toLocaleTimeString('es-PY')}</p>
        </div>
    </div>
    
    <div class="report-title-section">
        <h1 class="report-title">Plan de Pago</h1>
    </div>
    
    ${searchTerm ? `
    <div class="print-filters">
        <strong>Filtros aplicados:</strong> Búsqueda: "${searchTerm}"
    </div>
    ` : ''}
    
    ${Object.values(pagaresByVenta).map(ventaData => {
            const todayStr = new Date().toISOString().split('T')[0];
            const pagados = ventaData.pagares.filter(p => (p.estado === 'PAGADO' || (parseFloat(p.saldo_pendiente || 0) <= 0))).length;
            const pendientes = ventaData.pagares.filter(p => {
                const est = p.estado;
                const saldo = parseFloat(p.saldo_pendiente || 0);
                return (est === 'PENDIENTE' || est === 'PARCIAL' || est === 'VENCIDO') && saldo > 0;
            }).length;

            // Calcular totales con la nueva lógica
            let totalMonto = 0;
            let totalMora = 0;
            let totalSaldoReal = 0;

            ventaData.pagares.forEach(p => {
                // ✅ Usar la misma lógica que en la tabla principal
                const esPagado = p.cancelado === true;
                const mc = parseFloat(p.monto_cuota || 0);

                const payments = p.pagos || [];
                const capitalPagado = payments.reduce((acc, pg) => acc + parseFloat(pg.monto_pagado || 0), 0);
                const interesesPagados = payments.reduce((acc, pg) => acc + parseFloat(pg.mora_aplicada || 0), 0);
                
                const capitalRestante = Math.max(0, mc - capitalPagado);
                const m = calcularMora(p, todayStr);
                const interesesPendientes = Math.max(0, m - interesesPagados);
                
                const sr = esPagado ? 0 : Math.max(0, capitalRestante + interesesPendientes);

                p._moraActual = esPagado ? interesesPagados : m;
                p._saldoReal = sr;
                p._interesesPendientes = interesesPendientes;

                totalMonto += mc;
                totalMora += p._moraActual;
                totalSaldoReal += sr;
            });


            return `
        <div class="venta-group">
            <div class="venta-header">
                <h3>Venta ID: ${ventaData.venta} - ${ventaData.cliente}</h3>
            </div>
            <div class="venta-info">
                <div class="venta-info-item">
                    <strong>Cliente:</strong> ${ventaData.cliente}
                </div>
                <div class="venta-info-item">
                    <strong>Documento:</strong> ${ventaData.numero_documento}
                </div>
                <div class="venta-info-item">
                    <strong>Vehículo:</strong> ${ventaData.vehiculo}
                </div>
                ${ventaData.chasis ? `
                <div class="venta-info-item">
                    <strong>Chasis:</strong> ${ventaData.chasis}
                </div>
                ` : ''}
                <div class="venta-info-item">
                    <strong>Total Cuotas:</strong> ${ventaData.pagares.length} | 
                    <strong>Pagadas:</strong> ${pagados} | 
                    <strong>Pendientes:</strong> ${pendientes}
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Cuota</th>
                        <th>Monto Cuota</th>
                        <th>Interés (Mora)</th>
                        <th>Saldo Real</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        ${includeCancelados ? '<th>Fecha de Pago</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${ventaData.pagares.map(p => {
                const currentStatus = p.estado_rel?.nombre || p.estado;
                const isOverdue = new Date(p.fecha_vencimiento + 'T12:00:00') < new Date() && (currentStatus === 'PENDIENTE' || currentStatus === 'PARCIAL' || currentStatus === 'VENCIDO');
                const fechaPagoFormat = p.fecha_pago ? p.fecha_pago.split('T')[0].split('-').reverse().join('/') : '-';
                const fechaVencFormat = p.fecha_vencimiento.split('-').reverse().join('/');
                return `
                        <tr class="${isOverdue ? 'overdue' : ''}">
                            <td>${p.tipo_pagare === 'ENTREGA_INICIAL' ? 'Entrega Inicial' : `${p.numero_cuota}/${p.total_cuotas || p.numero_cuota}`}</td>
                            <td>Gs. ${Math.round(parseFloat(p.monto_cuota || 0)).toLocaleString('es-PY')}</td>
                            <td style="color: ${p._interesesPendientes > 0 && !p.cancelado ? '#dc2626' : '#000'}">
                                Gs. ${Math.round(p._moraActual).toLocaleString('es-PY')}
                                ${p._interesesPendientes > 0 && !p.cancelado ? `<br/><small style="color: #dc2626">(Pend: Gs. ${Math.round(p._interesesPendientes).toLocaleString('es-PY')})</small>` : ''}
                            </td>
                            <td>Gs. ${Math.round(p._saldoReal).toLocaleString('es-PY')}</td>

                            <td>${fechaVencFormat}</td>
                            <td>
                                <span class="status-badge ${p.estado.toLowerCase()}">${p.estado}</span>
                            </td>
                            ${includeCancelados ? `<td>${fechaPagoFormat}</td>` : ''}
                        </tr>
                        `;
            }).join('')}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f1f5f9; font-weight: bold;">
                        <td>TOTAL</td>
                        <td>Gs. ${Math.round(totalMonto).toLocaleString('es-PY')}</td>
                        <td>Gs. ${Math.round(totalMora).toLocaleString('es-PY')}</td>
                        <td>Gs. ${Math.round(totalSaldoReal).toLocaleString('es-PY')}</td>
                        <td colspan="${includeCancelados ? '3' : '2'}"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        `;
        }).join('')}
    
    <div class="print-footer">
        <div>Total de ventas: ${Object.keys(pagaresByVenta).length}</div>
        <div>Total de cuotas: ${filteredForPrint.length}</div>
        <div>${includeCancelados ? 'Incluye cuotas canceladas' : 'Solo cuotas pendientes'}</div>
    </div>
</body>
</html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Quitamos el auto-print para que solo se visualice
        /*
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
        */
    };

    return (
        <div className="cobros-container">
            <div className="header-actions">
                <h2>Cobranzas y Recibos</h2>
                <div className="header-controls">
                    <div className="global-filters">
                        <label className="checkbox-label highlight">
                            <input
                                type="checkbox"
                                checked={includeCancelados}
                                onChange={(e) => setIncludeCancelados(e.target.checked)}
                            />
                            <span>Mostrar todos los pagarés (Incluir Pagados)</span>
                        </label>
                    </div>
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar por cliente, documento, vehículo o chasis..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="print-controls">
                        <button className="btn-print" onClick={handleVerPlanPago} title="Ver Plan de Pago">
                            📋Ver Plan de Pagos
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Cargando cuentas por cobrar...</div>
            ) : (
                <div className="table-responsive">
                    <table className="cobros-table">
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('fecha_vencimiento')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Vencimiento {getSortIcon('fecha_vencimiento')}
                                </th>
                                <th onClick={() => requestSort('cliente')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Cliente {getSortIcon('cliente')}
                                </th>
                                <th onClick={() => requestSort('vehiculo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Vehículo {getSortIcon('vehiculo')}
                                </th>
                                <th>Cuota N°</th>
                                <th>Total</th>
                                <th>Interés</th>
                                <th>Saldo</th>
                                <th onClick={() => requestSort('estado')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Estado {getSortIcon('estado')}
                                </th>
                                {includeCancelados && <th>Último Pago</th>}
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPagares().map(p => {
                                const isOverdue = new Date(p.fecha_vencimiento) < new Date();
                                return (
                                    <React.Fragment key={p.id_pagare}>
                                        <tr className={isOverdue ? 'overdue-row' : ''}>
                                            <td>
                                                <span className={`date-badge ${isOverdue ? 'danger' : ''}`}>
                                                    {p.fecha_vencimiento ? p.fecha_vencimiento.split('-').reverse().join('-') : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="client-cell">
                                                    <strong>{p.cliente}</strong>
                                                    <span>{p.numero_documento}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <strong>{p.vehiculo}</strong>
                                                {p.chasis && <span className="chasis-label"> ({p.chasis})</span>}
                                            </td>
                                            <td>
                                                {p.tipo_pagare === 'ENTREGA_INICIAL'
                                                    ? <span style={{ fontWeight: '600', color: '#0369a1' }}>Entrega Inicial</span>
                                                    : `${p.numero_cuota}/${p.total_cuotas || p.numero_cuota}`}
                                            </td>
                                            <td>Gs. {Math.round(parseFloat(p.monto_cuota)).toLocaleString('es-PY')}</td>
                                             {(() => {
                                                 // ✅ Lógica mejorada: se considera pagado SÓLO si está cancelado explícitamente.
                                                 // Si el capital se pagó pero quedan intereses, p.cancelado será false.
                                                 const esPagado = p.cancelado === true;
                                                 const today = new Date().toISOString().split('T')[0];

                                                 const totalCuota = parseFloat(p.monto_cuota || 0);

                                                 // Calcular lo pagado acumulado (de todos los pagos de este pagaré)
                                                 const payments = p.pagos || [];
                                                 const capitalPagado = payments.reduce((acc, pg) => acc + parseFloat(pg.monto_pagado || 0), 0);
                                                 const interesesPagados = payments.reduce((acc, pg) => acc + parseFloat(pg.mora_aplicada || 0), 0);

                                                 const capitalRestante = Math.max(0, totalCuota - capitalPagado);
                                                 
                                                 // ✅ Mora Total Generada: se calcula siempre para ver el histórico, 
                                                 // pero el saldo real dependerá de si está cancelado.
                                                 const moraTotalGenerada = calcularMora(p, today);
                                                 const interesesPendientes = Math.max(0, moraTotalGenerada - interesesPagados);
                                                 
                                                 // ✅ El saldo es la suma de ambos, a menos que esté marcado como cancelado
                                                 const saldoReal = esPagado ? 0 : Math.max(0, capitalRestante + interesesPendientes);

                                                 // Para mostrar en la columna de interés, usamos la mora total generada o 0 si está pagado
                                                 const interesMostrar = esPagado ? interesesPagados : moraTotalGenerada;

                                                 return (
                                                     <>
                                                         <td style={{ 
                                                             color: (interesesPendientes > 0 && !esPagado) ? '#dc2626' : '#6b7280', 
                                                             fontWeight: (interesesPendientes > 0 && !esPagado) ? '600' : 'normal' 
                                                         }}>
                                                             {interesMostrar > 0 ? `Gs. ${Math.round(interesMostrar).toLocaleString('es-PY')}` : '—'}
                                                             {interesesPendientes > 0 && !esPagado && (
                                                                 <div style={{ fontSize: '0.65rem', color: '#dc2626' }}>
                                                                     (Pend: Gs. {Math.round(interesesPendientes).toLocaleString('es-PY')})
                                                                 </div>
                                                             )}
                                                         </td>
                                                         <td><strong>Gs. {Math.round(saldoReal).toLocaleString('es-PY')}</strong></td>
                                                     </>
                                                 );
                                             })()}
                                            <td>
                                                <span className={`status-label ${(p.estado_rel?.nombre || p.estado || '').toLowerCase()} ${isOverdue && (p.estado_rel?.nombre || p.estado) !== 'PAGADO' ? 'vencido' : ''}`}>
                                                    {(p.estado_rel?.nombre || p.estado) === 'PAGADO'
                                                        ? 'PAGADO'
                                                        : (p.estado_rel?.nombre || p.estado) === 'PARCIAL'
                                                            ? (isOverdue ? 'PARCIAL(VENCIDO)' : 'PARCIAL')
                                                            : (isOverdue ? 'VENCIDO' : 'PENDIENTE')}
                                                </span>
                                            </td>
                                            {
                                                includeCancelados && (
                                                    <td>
                                                        {p.fecha_pago ? (
                                                            <span className="date-badge success">
                                                                {p.fecha_pago.split('T')[0].split('-').reverse().join('-')}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                )
                                            }
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-expand" onClick={() => toggleRow(p.id_pagare)} title="Ver detalles de pagos">
                                                        {expandedRow === p.id_pagare ? '🔼' : '🔽'}
                                                    </button>
                                                    {!p.cancelado && (
                                                        <button className="btn-cobrar" onClick={() => handleOpenCobro(p)}>
                                                            Agregar Pago
                                                        </button>
                                                    )}
                                                    {(p.pagos && p.pagos.length > 0) && (
                                                        <button className="btn-edit-pagos" onClick={() => handleViewPagos(p)} title="Ver historial y editar cobros">
                                                            ⚙️
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRow === p.id_pagare && (
                                            <tr className="expanded-detail-row">
                                                <td colSpan={includeCancelados ? 10 : 9}>
                                                    <div className="details-container">
                                                        <h5>Historial de Pagos de esta Cuota</h5>
                                                        {p.pagos && p.pagos.length > 0 ? (
                                                            <table className="pago-detail-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Fecha</th>
                                                                        <th>Recibo</th>
                                                                        <th>Forma</th>
                                                                        <th>Interés/Mora</th>
                                                                        <th>Monto Pagado</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {p.pagos.map(pg => (
                                                                        <tr key={pg.id_pago}>
                                                                            <td>{pg.fecha_pago ? pg.fecha_pago.split('T')[0].split('-').reverse().join('-') : '-'}</td>
                                                                            <td>{pg.numero_recibo}</td>
                                                                            <td>{pg.forma_pago}</td>
                                                                            <td>Gs. {Math.round(pg.mora_aplicada).toLocaleString('es-PY')}</td>
                                                                            <td><strong>Gs. {Math.round(pg.monto_pagado).toLocaleString('es-PY')}</strong></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className="no-pagos-msg">No se han registrado pagos para esta cuota aún.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {
                !loading && (
                    <div className="recent-payments-main-section">
                        <div className="section-header">
                            <h3>Últimos Cobros Registrados</h3>
                            <button className="btn-refresh" onClick={fetchRecentPagos} disabled={fetchingRecent}>
                                {fetchingRecent ? '⌛' : '🔄'} Actualizar
                            </button>
                        </div>
                        <div className="responsive-table">
                            <table className="main-table recent-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Recibo</th>
                                        <th>Cliente</th>
                                        <th>Vehículo</th>
                                        <th>Monto</th>
                                        <th>Caja/Cuenta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentPagos.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No hay cobros registrados recientemente.</td></tr>
                                    ) : (
                                        recentPagos.map(p => (
                                            <tr key={p.id_pago}>
                                                <td><span className="date-badge">{p.fecha_pago}</span></td>
                                                <td><strong>{p.numero_recibo}</strong></td>
                                                <td>{p.cliente_nombre || 'N/A'}</td>
                                                <td>
                                                    <strong>{p.vehiculo || 'N/A'}</strong>
                                                    {p.chasis && <small className="chasis-sub"> ({p.chasis})</small>}
                                                </td>
                                                <td><strong>Gs. {Math.round(p.monto_pagado).toLocaleString('es-PY')}</strong></td>
                                                <td>{cuentas.find(c => c.id_cuenta === p.id_cuenta)?.nombre || 'N/A'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                showPagosModal && (
                    <div className="modal-overlay">
                        <div className="modal-content pagos-history-modal">
                            <div className="modal-header">
                                <h3>Historial de Cobros - Cuota {selectedPagare?.numero_cuota}</h3>
                                <button className="btn-close" onClick={() => setShowPagosModal(false)}>×</button>
                            </div>
                            <div className="pagos-list">
                                {selectedPagos.length === 0 ? (
                                    <p>No hay cobros registrados para este pagaré.</p>
                                ) : (
                                    <table className="mini-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Recibo</th>
                                                <th>Monto</th>
                                                <th>Mora</th>
                                                <th>Caja/Cuenta</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPagos.map(pago => (
                                                <tr key={pago.id_pago}>
                                                    <td>{pago.fecha_pago}</td>
                                                    <td>{pago.numero_recibo}</td>
                                                    <td>Gs. {Math.round(parseFloat(pago.monto_pagado)).toLocaleString('es-PY')}</td>
                                                    <td>Gs. {Math.round(parseFloat(pago.mora_aplicada)).toLocaleString('es-PY')}</td>
                                                    <td>{cuentas.find(c => c.id_cuenta === pago.id_cuenta)?.nombre || 'N/A'}</td>
                                                    <td>
                                                        <div className="action-buttons-mini">
                                                            <button className="btn-mini-edit" onClick={() => handleEditPago(pago)} title="Editar Cobro">✏️</button>
                                                            <button className="btn-mini-delete" onClick={() => handleDeletePago(pago.id_pago)} title="Eliminar Cobro">🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button className="btn-save" onClick={() => setShowPagosModal(false)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>Gestión de Pagos - Recibo de Cobro</h3>
                                <button className="btn-close-modal-top" onClick={() => setShowModal(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleConfirmPago}>
                                <div className="modal-body">
                                    {selectedPagare && (
                                        <div className="payment-summary-full">
                                            <div className="summary-basic">
                                                <div className="client-header-modal">
                                                    <p><strong>Cliente:</strong> {selectedPagare.client_name || selectedPagare.cliente}</p>
                                                    <p><strong>Vehículo:</strong> {selectedPagare.vehiculo}</p>
                                                </div>
                                                <div className="concept-row-modal">
                                                    <p><strong>Concepto:</strong> {selectedPagare.tipo_pagare === 'ENTREGA_INICIAL' ? 'Entrega Inicial' : `Cuota ${selectedPagare.numero_cuota}/${selectedPagare.total_cuotas || selectedPagare.numero_cuota}`}</p>
                                                    <p><strong>Vencimiento:</strong> {selectedPagare.fecha_vencimiento}</p>
                                                </div>
                                                <div className="summary-amounts">
                                                    <p className="total-cuota-label"><strong>Importe Total:</strong> Gs. {Math.round(selectedPagare.monto_cuota).toLocaleString('es-PY')}</p>
                                                    <p className="saldo-actual-label"><strong>Saldo Pendiente:</strong> Gs. {Math.round(selectedPagare.saldo_pendiente).toLocaleString('es-PY')}</p>
                                                </div>
                                            </div>

                                            {selectedPagos.length > 0 && !isEditingPago && (
                                                <div className="previous-payments-table-section">
                                                    <h4>Pagos Registrados Anteriormente:</h4>
                                                    <table className="mini-payments-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Fecha</th>
                                                                <th>N° Recibo</th>
                                                                <th>Monto</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedPagos.map((p) => (
                                                                    <tr key={p.id_pago}>
                                                                        <td>{p.fecha_pago.split('T')[0].split('-').reverse().join('-')}</td>
                                                                        <td>{p.numero_recibo}</td>
                                                                    <td>Gs. {Math.round(p.monto_pagado).toLocaleString('es-PY')}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>N° Recibo</label>
                                            <input
                                                type="text"
                                                required
                                                readOnly
                                                className="readonly-highlight"
                                                value={newPago.numero_recibo}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha de Cobro</label>
                                            <input type="date" required value={newPago.fecha_pago} onChange={handleFechaPagoChange} />
                                        </div>
                                    </div>

                                    <div className="calculation-box">
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Monto de la Cuota (Gs.)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                    value={newPago.monto_pagado}
                                                    onChange={(e) => setNewPago({ ...newPago, monto_pagado: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Interés / Mora (Gs. - Editable)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={newPago.mora_aplicada}
                                                    onChange={(e) => setNewPago({ ...newPago, mora_aplicada: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Total a Cobrar (Capital + Int.)</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="total-highlight"
                                                    value={`Gs. ${Math.round(parseFloat(newPago.monto_pagado || 0) + parseFloat(newPago.mora_aplicada || 0)).toLocaleString('es-PY')}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Forma de Pago</label>
                                            <select value={newPago.forma_pago} onChange={(e) => setNewPago({ ...newPago, forma_pago: e.target.value })}>
                                                <option value="EFECTIVO">Efectivo</option>
                                                <option value="TRANSFERENCIA">Transferencia</option>
                                                <option value="CHEQUE">Cheque</option>
                                                <option value="DEPOSITO">Depósito Bancario</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Depositar en Cuenta / Caja</label>
                                            <select
                                                value={newPago.id_cuenta}
                                                onChange={(e) => setNewPago({ ...newPago, id_cuenta: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Seleccionar Cuenta --</option>
                                                {cuentas.map(c => (
                                                    <option key={c.id_cuenta} value={c.id_cuenta}>{c.nombre} ({c.tipo})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        {newPago.forma_pago !== 'EFECTIVO' && (
                                            <div className="form-group">
                                                <label>N° Referencia / Operación</label>
                                                <input type="text" value={newPago.numero_referencia} onChange={(e) => setNewPago({ ...newPago, numero_referencia: e.target.value })} placeholder="Ej: N° Transacción o Cheque" />
                                            </div>
                                        )}
                                        <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={newPago.cancelar_pagare}
                                                    onChange={(e) => setNewPago({ ...newPago, cancelar_pagare: e.target.checked })}
                                                    style={{ width: '20px', height: '20px' }}
                                                />
                                                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Dar por CANCELADO el pagaré</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Observaciones</label>
                                        <textarea rows="2" value={newPago.observaciones} onChange={(e) => setNewPago({ ...newPago, observaciones: e.target.value })} placeholder="Escribe aquí cualquier observación relevante..."></textarea>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cerrar</button>
                                    <button type="submit" className="btn-save">Agregar Pago e Imprimir</button>
                                </div>
                            </form>

                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CobrosPlaya;
