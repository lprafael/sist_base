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
    const [sortConfig, setSortConfig] = useState({ key: 'fecha_vencimiento', direction: 'asc' });
    const [newPago, setNewPago] = useState({
        id_pagare: '',
        id_venta: '',
        numero_recibo: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        monto_pagado: 0,
        mora_aplicada: 0,
        forma_pago: 'EFECTIVO',
        numero_referencia: '',
        observaciones: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchPagares();
        // Cargar todos los pagarés al inicio para tenerlos disponibles
        fetchAllPagares();
    }, []);

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

            // Obtener todos los pagarés y todas las ventas en paralelo
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
                            periodo_int_mora: venta.periodo_int_mora,
                            monto_int_mora: venta.monto_int_mora,
                            tasa_interes: venta.tasa_interes,
                            dias_gracia: venta.dias_gracia
                        };
                    }
                });
            }

            console.log('Ventas cargadas en mapa:', Object.keys(ventasMap).length, 'ventas');

            // Agregar información a los pagarés y convertir Decimal a float
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
                    estado: p.estado || 'PENDIENTE',
                    fecha_pago: p.fecha_pago || null,
                    cliente: cliente,
                    numero_documento: numero_documento,
                    vehiculo: vehiculo,
                    total_cuotas: 0, // Se calculará después
                    periodo_int_mora: ventaInfo?.periodo_int_mora,
                    monto_int_mora: ventaInfo?.monto_int_mora,
                    tasa_interes: ventaInfo?.tasa_interes,
                    dias_gracia: ventaInfo?.dias_gracia
                };
            }).filter(p => p.id_venta); // Filtrar pagarés sin id_venta

            // Log para verificar cuántos pagarés tienen información de cliente/vehículo
            const pagaresConInfo = pagaresWithInfo.filter(p =>
                p.cliente && p.cliente !== 'N/A' && p.vehiculo && p.vehiculo !== 'N/A'
            );
            console.log('Pagarés con información completa:', pagaresConInfo.length, 'de', pagaresWithInfo.length);

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

            // Asignar total de cuotas
            pagaresWithInfo.forEach(p => {
                if (p.id_venta) {
                    p.total_cuotas = ventasCuotas[p.id_venta] || p.numero_cuota;
                }
            });

            setAllPagares(pagaresWithInfo);
        } catch (error) {
            console.error('Error fetching all pagares:', error);
            setAllPagares([]);
        }
    };

    const handleOpenCobro = (pagare) => {
        setSelectedPagare(pagare);
        const initialPago = {
            ...newPago,
            id_pagare: pagare.id_pagare,
            id_venta: pagare.id_venta,
            monto_pagado: pagare.saldo_pendiente,
            mora_aplicada: 0,
            numero_recibo: `REC-${Date.now()}`
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

        // Parsear fechas manualmente para evitar problemas de zona horaria (YYYY-MM-DD)
        const [yV, mV, dV] = pagare.fecha_vencimiento.split('-').map(Number);
        const [yP, mP, dP] = fechaPagoStr.split('-').map(Number);
        
        const fecVenc = new Date(yV, mV - 1, dV);
        const fecPago = new Date(yP, mP - 1, dP);

        if (fecPago <= fecVenc) return 0;

        const diffTime = fecPago.getTime() - fecVenc.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const diasGracia = parseInt(pagare.dias_gracia || 0);
        
        // Si el atraso no supera los días de gracia, no se cobra mora
        if (diffDays <= diasGracia) return 0;

        const periodo = pagare.periodo_int_mora || 'D';
        const montoIntMora = parseFloat(pagare.monto_int_mora || 0);
        const tasaIntMora = parseFloat(pagare.tasa_interes || 0);
        const saldoPendiente = parseFloat(pagare.saldo_pendiente || 0);

        let interesCalculado = 0;

        if (periodo === 'D') {
            // Cálculo Diario: Días de atraso * monto_int_mora
            interesCalculado = diffDays * montoIntMora;
        } else {
            // Otros periodos (Semanal, Mensual, Anual) - Proporcional
            let diasPorPeriodo = 1;
            if (periodo === 'S') diasPorPeriodo = 7;
            else if (periodo === 'M') diasPorPeriodo = 30;
            else if (periodo === 'A') diasPorPeriodo = 365;
            
            const numPeriodos = diffDays / diasPorPeriodo;
            interesCalculado = numPeriodos * montoIntMora;
        }

        // Si hay una tasa de interés configurada, sumarla al proporcional (opcional según el usuario, pero lo mantenemos si existe)
        if (tasaIntMora > 0) {
            interesCalculado += (saldoPendiente * (tasaIntMora / 100));
        }

        console.log(`Cálculo de mora: Días atraso: ${diffDays}, Periodo: ${periodo}, Monto Mora: ${montoIntMora}, Interés: ${interesCalculado}`);
        
        return Math.round(interesCalculado);
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
            const token = sessionStorage.getItem('token');
            await axios.post(`${API_URL}/playa/pagos`, newPago, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            // Actualizar ambos estados antes de avisar al usuario
            // allPagares es el que suele usarse para el Plan de Pago completo
            await Promise.all([fetchPagares(), fetchAllPagares()]);
            alert('Cobro registrado exitosamente');
        } catch (error) {
            alert('Error al registrar cobro: ' + (error.response?.data?.detail || error.message));
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
        const filtered = pagares.filter(p =>
            p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.numero_documento.includes(searchTerm) ||
            p.vehiculo.toLowerCase().includes(searchTerm.toLowerCase())
        );

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

    const handlePrintPlanPago = async () => {
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
                                    vehiculo: vehiculoInfo || 'N/A'
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
                            estado: p.estado || 'PENDIENTE',
                            fecha_pago: p.fecha_pago || null,
                            cliente: ventasInfo[p.id_venta]?.cliente || 'N/A',
                            numero_documento: ventasInfo[p.id_venta]?.numero_documento || '',
                            vehiculo: ventasInfo[p.id_venta]?.vehiculo || 'N/A',
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
                                        vehiculo: vehiculoInfo || 'N/A'
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
                                estado: p.estado || 'PENDIENTE',
                                fecha_pago: p.fecha_pago || null,
                                cliente: cliente,
                                numero_documento: numero_documento,
                                vehiculo: vehiculo,
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

            // Buscar en todos los campos disponibles (incluso si son 'N/A', buscar en la cadena completa)
            // Esto permite encontrar coincidencias incluso si algunos campos están como 'N/A'
            const matches = cliente.includes(search) ||
                documento.includes(search) ||
                vehiculo.includes(search);

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
            page-break-inside: avoid;
            border: 1px solid #000;
            padding: 15px;
        }
        .venta-header {
            background: #f1f5f9;
            color: #000;
            padding: 10px;
            border-bottom: 1px solid #000;
            margin-bottom: 15px;
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
            const totalMonto = ventaData.pagares.reduce((sum, p) => sum + parseFloat(p.monto_cuota || 0), 0);
            const totalSaldo = ventaData.pagares.reduce((sum, p) => sum + parseFloat(p.saldo_pendiente || 0), 0);
            const pagados = ventaData.pagares.filter(p => p.estado === 'PAGADO').length;
            const pendientes = ventaData.pagares.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PARCIAL').length;

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
                        <th>Saldo Pendiente</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        ${includeCancelados ? '<th>Fecha de Pago</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${ventaData.pagares.map(p => {
                const isOverdue = new Date(p.fecha_vencimiento) < new Date() && (p.estado === 'PENDIENTE' || p.estado === 'PARCIAL');
                const fechaPagoFormat = p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-PY') : '-';
                return `
                        <tr class="${isOverdue ? 'overdue' : ''}">
                            <td>${p.numero_cuota}/${p.total_cuotas || p.numero_cuota}</td>
                            <td>Gs. ${Math.round(parseFloat(p.monto_cuota || 0)).toLocaleString('es-PY')}</td>
                            <td>Gs. ${Math.round(parseFloat(p.saldo_pendiente || 0)).toLocaleString('es-PY')}</td>
                            <td>${new Date(p.fecha_vencimiento).toLocaleDateString('es-PY')}</td>
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
                        <td colspan="2">TOTAL</td>
                        <td>Gs. ${Math.round(totalMonto).toLocaleString('es-PY')}</td>
                        <td colspan="${includeCancelados ? '3' : '2'}">Saldo Pendiente: Gs. ${Math.round(totalSaldo).toLocaleString('es-PY')}</td>
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

        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    };

    return (
        <div className="cobros-container">
            <div className="header-actions">
                <h2>Cobranzas y Recibos</h2>
                <div className="header-controls">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar por cliente, documento o vehículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="print-controls">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeCancelados}
                                onChange={(e) => setIncludeCancelados(e.target.checked)}
                            />
                            <span>Mostrar cuotas canceladas</span>
                        </label>
                        <button className="btn-print" onClick={handlePrintPlanPago} title="Imprimir Plan de Pago">
                            🖨️ Imprimir Plan de Pago
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
                                <th>Vehículo</th>
                                <th>Cuota N°</th>
                                <th>Total</th>
                                <th>Saldo</th>
                                <th onClick={() => requestSort('estado')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    Estado {getSortIcon('estado')}
                                </th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPagares().map(p => {
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
                                        <td>
                                            {p.numero_cuota}/{p.total_cuotas || p.numero_cuota}
                                        </td>
                                        <td>Gs. {Math.round(parseFloat(p.monto_cuota)).toLocaleString('es-PY')}</td>
                                        <td><strong>Gs. {Math.round(parseFloat(p.saldo_pendiente)).toLocaleString('es-PY')}</strong></td>
                                        <td><span className={`status-label ${p.estado.toLowerCase()}`}>{p.estado}</span></td>
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
                                <p><strong>Saldo Actual:</strong> Gs. {Math.round(selectedPagare.saldo_pendiente).toLocaleString('es-PY')}</p>
                            </div>
                        )}
                        <form onSubmit={handleConfirmPago}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>N° Recibo</label>
                                    <input type="text" required value={newPago.numero_recibo} onChange={(e) => setNewPago({ ...newPago, numero_recibo: e.target.value })} />
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
                                {newPago.forma_pago !== 'EFECTIVO' && (
                                    <div className="form-group">
                                        <label>N° Referencia / Operación</label>
                                        <input type="text" value={newPago.numero_referencia} onChange={(e) => setNewPago({ ...newPago, numero_referencia: e.target.value })} placeholder="Ej: N° Transacción o Cheque" />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea rows="2" value={newPago.observaciones} onChange={(e) => setNewPago({ ...newPago, observaciones: e.target.value })} placeholder="Escribe aquí cualquier observación relevante..."></textarea>
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
