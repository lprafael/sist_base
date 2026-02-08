import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PagaresPlaya.css';

const PagaresPlaya = () => {
    const [pagares, setPagares] = useState([]);
    const [clientesInfo, setClientesInfo] = useState({}); // Mapa de id_venta -> info del cliente
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [includeClientNames, setIncludeClientNames] = useState(false);
    const [selectedPagare, setSelectedPagare] = useState(null);
    const [editingData, setEditingData] = useState({
        numero_pagare: '',
        monto_cuota: '',
        fecha_vencimiento: '',
        observaciones: ''
    });

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchPagares();
    }, []);

    const fetchPagares = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/playa/pagares`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPagares(res.data);

            // Obtener información de clientes para las ventas
            const ventaIds = [...new Set(res.data.map(p => p.id_venta))];
            await fetchClientesInfo(ventaIds);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching pagares:', error);
            setLoading(false);
        }
    };

    const fetchClientesInfo = async (ventaIds) => {
        if (ventaIds.length === 0) return;

        try {
            const token = localStorage.getItem('token');
            const clientesMap = {};

            // Obtener todas las ventas de una vez (más eficiente)
            try {
                const ventasRes = await axios.get(`${API_URL}/playa/ventas`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const ventas = ventasRes.data;

                // Crear un mapa de id_venta -> cliente
                ventas.forEach(venta => {
                    if (ventaIds.includes(venta.id_venta) && venta.cliente) {
                        clientesMap[venta.id_venta] = {
                            nombre: venta.cliente.nombre || '',
                            apellido: venta.cliente.apellido || '',
                            nombre_completo: `${venta.cliente.nombre || ''} ${venta.cliente.apellido || ''}`.trim(),
                            numero_documento: venta.cliente.numero_documento || ''
                        };
                    }
                });
            } catch (err) {
                console.warn('No se pudo obtener información de ventas:', err);
                // Fallback: intentar obtener ventas individuales solo para las que faltan
                const missingIds = ventaIds.filter(id => !clientesMap[id]);
                for (const ventaId of missingIds) {
                    try {
                        // Intentar con endpoint alternativo si existe
                        const ventaRes = await axios.get(`${API_URL}/playa/ventas/${ventaId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const venta = ventaRes.data;
                        if (venta.cliente) {
                            clientesMap[ventaId] = {
                                nombre: venta.cliente.nombre || '',
                                apellido: venta.cliente.apellido || '',
                                nombre_completo: `${venta.cliente.nombre || ''} ${venta.cliente.apellido || ''}`.trim(),
                                numero_documento: venta.cliente.numero_documento || ''
                            };
                        }
                    } catch (individualErr) {
                        console.warn(`No se pudo obtener información de la venta ${ventaId}:`, individualErr);
                    }
                }
            }

            setClientesInfo(clientesMap);
        } catch (error) {
            console.error('Error fetching clientes info:', error);
        }
    };

    const handleEdit = (pagare) => {
        setSelectedPagare(pagare);
        setEditingData({
            numero_pagare: pagare.numero_pagare,
            monto_cuota: pagare.monto_cuota,
            fecha_vencimiento: pagare.fecha_vencimiento,
            observaciones: pagare.observaciones || ''
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/playa/pagares/${selectedPagare.id_pagare}`, editingData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedPagare(null);
            fetchPagares();
        } catch (error) {
            alert('Error updating pagare: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column) => {
        if (sortColumn !== column) return '⇅';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    const filteredAndSortedPagares = pagares
        .filter(p => {
            // Filtro por búsqueda de texto
            const matchesSearch =
                p.numero_pagare.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.id_venta.toString().includes(searchTerm);

            if (!matchesSearch) return false;

            // Filtro por rango de fechas
            if (fechaDesde || fechaHasta) {
                const fechaVencimiento = new Date(p.fecha_vencimiento);

                if (fechaDesde) {
                    const desde = new Date(fechaDesde);
                    desde.setHours(0, 0, 0, 0);
                    if (fechaVencimiento < desde) return false;
                }

                if (fechaHasta) {
                    const hasta = new Date(fechaHasta);
                    hasta.setHours(23, 59, 59, 999);
                    if (fechaVencimiento > hasta) return false;
                }
            }

            return true;
        })
        .sort((a, b) => {
            if (!sortColumn) return 0;

            let aValue, bValue;

            switch (sortColumn) {
                case 'numero_pagare':
                    aValue = a.numero_pagare.toLowerCase();
                    bValue = b.numero_pagare.toLowerCase();
                    break;
                case 'id_venta':
                    aValue = a.id_venta;
                    bValue = b.id_venta;
                    break;
                case 'monto_cuota':
                    aValue = parseFloat(a.monto_cuota);
                    bValue = parseFloat(b.monto_cuota);
                    break;
                case 'fecha_vencimiento':
                    aValue = new Date(a.fecha_vencimiento);
                    bValue = new Date(b.fecha_vencimiento);
                    break;
                case 'estado':
                    aValue = a.estado.toLowerCase();
                    bValue = b.estado.toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    const clearFilters = () => {
        setSearchTerm('');
        setFechaDesde('');
        setFechaHasta('');
        setSortColumn(null);
        setSortDirection('asc');
    };

    const handlePrint = () => {
        // Crear una ventana nueva para imprimir
        const printWindow = window.open('', '_blank');

        // Obtener la fecha actual para el encabezado
        const fechaActual = new Date().toLocaleDateString('es-PY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Construir el HTML para imprimir
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gestión de Pagarés - ${fechaActual}</title>
                <style>
                    @media print {
                        @page {
                            margin: 1cm;
                            size: A4 landscape;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                            font-size: 10pt;
                        }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .print-header h1 {
                        margin: 0;
                        font-size: 18pt;
                        color: #000;
                    }
                    .print-header .subtitle {
                        margin-top: 5px;
                        font-size: 12pt;
                        color: #666;
                    }
                    .print-filters {
                        margin-bottom: 15px;
                        font-size: 9pt;
                        color: #555;
                    }
                    .print-filters span {
                        margin-right: 15px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th {
                        background-color: #f0f0f0;
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                        font-weight: bold;
                        font-size: 9pt;
                    }
                    td {
                        border: 1px solid #000;
                        padding: 6px;
                        font-size: 9pt;
                    }
                    .status-badge {
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 8pt;
                        font-weight: bold;
                    }
                    .status-badge.pendiente {
                        background-color: #fef3c7;
                        color: #92400e;
                    }
                    .status-badge.pagado {
                        background-color: #dcfce7;
                        color: #166534;
                    }
                    .status-badge.anulado {
                        background-color: #fee2e2;
                        color: #991b1b;
                    }
                    .print-footer {
                        margin-top: 20px;
                        text-align: right;
                        font-size: 8pt;
                        color: #666;
                        border-top: 1px solid #ccc;
                        padding-top: 10px;
                    }
                    .no-print {
                        display: none;
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>Gestión de Pagarés</h1>
                    <div class="subtitle">Sistema de Gestión de Vehículos - Peralta Automotores</div>
                    <div class="subtitle">Fecha de impresión: ${fechaActual}</div>
                </div>
                
                ${(fechaDesde || fechaHasta || searchTerm) ? `
                <div class="print-filters">
                    <strong>Filtros aplicados:</strong>
                    ${searchTerm ? `<span>Búsqueda: "${searchTerm}"</span>` : ''}
                    ${fechaDesde ? `<span>Desde: ${new Date(fechaDesde).toLocaleDateString('es-PY')}</span>` : ''}
                    ${fechaHasta ? `<span>Hasta: ${new Date(fechaHasta).toLocaleDateString('es-PY')}</span>` : ''}
                </div>
                ` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>Número Pagaré</th>
                            <th>Venta</th>
                            ${includeClientNames ? '<th>Cliente</th>' : ''}
                            <th>Cuota</th>
                            <th>Monto</th>
                            <th>Vencimiento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredAndSortedPagares.map(p => {
            const clienteInfo = clientesInfo[p.id_venta];
            const nombreCliente = clienteInfo ? clienteInfo.nombre_completo : 'N/A';
            return `
                            <tr>
                                <td>${p.numero_pagare}</td>
                                <td>ID: ${p.id_venta}</td>
                                ${includeClientNames ? `<td>${nombreCliente}</td>` : ''}
                                <td>${p.numero_cuota} (${p.tipo_pagare})</td>
                                <td>Gs. ${Math.round(p.monto_cuota).toLocaleString('es-PY')}</td>
                                <td>${new Date(p.fecha_vencimiento).toLocaleDateString('es-PY')}</td>
                                <td>
                                    <span class="status-badge ${p.estado.toLowerCase()}">${p.estado}</span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                    </tbody>
                </table>
                
                <div class="print-footer">
                    <div>Total de pagarés: ${filteredAndSortedPagares.length}</div>
                    <div>Total monto: Gs. ${filteredAndSortedPagares.reduce((sum, p) => sum + parseFloat(p.monto_cuota || 0), 0).toLocaleString('es-PY')}</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();

        // Esperar a que se cargue el contenido y luego imprimir
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                // Cerrar la ventana después de imprimir (opcional)
                // printWindow.close();
            }, 250);
        };
    };

    return (
        <div className="pagares-container">
            <div className="header-actions">
                <h2>Gestión de Pagarés</h2>
                <div className="header-controls">
                    <div className="filters-container">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Buscar por número o venta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="date-filters">
                            <div className="date-filter-group">
                                <label>Desde:</label>
                                <input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                            </div>
                            <div className="date-filter-group">
                                <label>Hasta:</label>
                                <input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                            </div>
                            {(fechaDesde || fechaHasta || searchTerm) && (
                                <button className="btn-clear-filters" onClick={clearFilters}>
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="print-controls">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeClientNames}
                                onChange={(e) => setIncludeClientNames(e.target.checked)}
                            />
                            <span>Incluir nombres de clientes</span>
                        </label>
                        <button className="btn-print" onClick={handlePrint} title="Imprimir lista de pagarés">
                            🖨️ Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="pagares-grid">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('numero_pagare')}
                                    title="Ordenar por número"
                                >
                                    Número Pagaré {getSortIcon('numero_pagare')}
                                </th>
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('id_venta')}
                                    title="Ordenar por venta"
                                >
                                    Venta {getSortIcon('id_venta')}
                                </th>
                                <th>Cuota</th>
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('monto_cuota')}
                                    title="Ordenar por monto"
                                >
                                    Monto {getSortIcon('monto_cuota')}
                                </th>
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('fecha_vencimiento')}
                                    title="Ordenar por fecha de vencimiento"
                                >
                                    Vencimiento {getSortIcon('fecha_vencimiento')}
                                </th>
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('estado')}
                                    title="Ordenar por estado"
                                >
                                    Estado {getSortIcon('estado')}
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedPagares.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        No se encontraron pagarés con los filtros aplicados
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedPagares.map(p => (
                                    <tr key={p.id_pagare}>
                                        <td>{p.numero_pagare}</td>
                                        <td>ID: {p.id_venta}</td>
                                        <td>{p.numero_cuota} ({p.tipo_pagare})</td>
                                        <td>Gs. {Math.round(p.monto_cuota).toLocaleString('es-PY')}</td>
                                        <td>{p.fecha_vencimiento}</td>
                                        <td>
                                            <span className={`status-badge ${p.estado.toLowerCase()}`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-edit-small" onClick={() => handleEdit(p)}>
                                                ✏️ Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedPagare && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Editar Pagaré {selectedPagare.numero_pagare}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Número de Pagaré</label>
                                <input
                                    type="text"
                                    value={editingData.numero_pagare}
                                    onChange={(e) => setEditingData({ ...editingData, numero_pagare: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Monto (Gs.)</label>
                                <input
                                    type="number"
                                    value={editingData.monto_cuota}
                                    onChange={(e) => setEditingData({ ...editingData, monto_cuota: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de Vencimiento</label>
                                <input
                                    type="date"
                                    value={editingData.fecha_vencimiento}
                                    onChange={(e) => setEditingData({ ...editingData, fecha_vencimiento: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea
                                    value={editingData.observaciones}
                                    onChange={(e) => setEditingData({ ...editingData, observaciones: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setSelectedPagare(null)}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagaresPlaya;
