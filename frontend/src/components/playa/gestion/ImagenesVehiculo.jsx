import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ImagenesVehiculo.css';
import ModalPublicarRedes from './ModalPublicarRedes';
import ModalRecortarImagen from './ModalRecortarImagen';

const ImagenesVehiculo = ({ id_producto }) => {
    const [vehiculos, setVehiculos] = useState([]);
    const [selectedVehiculoId, setSelectedVehiculoId] = useState(id_producto || '');
    const [imagenes, setImagenes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isModalRedesOpen, setIsModalRedesOpen] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null);
    const fileInputRef = useRef(null);
    const searchContainerRef = useRef(null);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
    // URL base del backend para archivos estáticos (imágenes). Si no se define, se usa ruta relativa /static (proxy de Vite).
    const STATIC_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL || '';

    useEffect(() => {
        fetchVehiculos();
    }, []);

    useEffect(() => {
        if (selectedVehiculoId) {
            fetchImagenes(selectedVehiculoId);
        } else {
            setImagenes([]);
        }
    }, [selectedVehiculoId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchVehiculos = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/vehiculos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Ordenar por marca y modelo
            const sorted = response.data.sort((a, b) =>
                `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`)
            );
            setVehiculos(sorted);
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
        }
    };

    const fetchImagenes = async (id_producto) => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/vehiculos/${id_producto}/imagenes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setImagenes(response.data);
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files);
        }
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files);
        }
    };

    const addWatermark = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Establecer dimensiones del canvas
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Dibujar imagen original
                    ctx.drawImage(img, 0, 0);

                    // Cargar logo para marca de agua
                    const logo = new Image();
                    logo.onload = () => {
                        // Calcular tamaño del logo para que sea grande y centrado
                        const targetScale = 0.8; // Ocupar el 80% de la imagen
                        const scale = Math.min((canvas.width * targetScale) / logo.width, (canvas.height * targetScale) / logo.height);
                        const logoWidth = logo.width * scale;
                        const logoHeight = logo.height * scale;

                        // Centrar el logo
                        const x = (canvas.width - logoWidth) / 2;
                        const y = (canvas.height - logoHeight) / 2;

                        // Dibujar logo con opacidad baja (semitransparente)
                        ctx.globalAlpha = 0.35;
                        ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                        ctx.globalAlpha = 1.0;

                        // Convertir canvas a blob
                        canvas.toBlob((blob) => {
                            if (blob) {
                                // Crear un nuevo archivo a partir del blob
                                const watermarkedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(watermarkedFile);
                            } else {
                                reject(new Error('Error al procesar la imagen'));
                            }
                        }, 'image/jpeg', 0.9);
                    };
                    logo.onerror = () => {
                        console.warn('No se pudo cargar el logo de la marca de agua, subiendo original.');
                        resolve(file); // Continuar con el original si falla el logo
                    };
                    logo.src = '/imágenes/logo_micoche.png'; // Ruta desde public
                };
                img.onerror = () => reject(new Error('Error al cargar la imagen original'));
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpload = async (files) => {
        if (!selectedVehiculoId) {
            alert('Por favor, selecciona un vehículo primero.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            const processPromises = Array.from(files).map(async (file) => {
                if (file.type.startsWith('image/')) {
                    try {
                        const watermarkedFile = await addWatermark(file);
                        formData.append('imagenes', watermarkedFile);
                    } catch (err) {
                        console.error('Error watermarking file:', file.name, err);
                        formData.append('imagenes', file); // Fallback al original
                    }
                }
            });

            await Promise.all(processPromises);

            if (formData.getAll('imagenes').length === 0) {
                alert('No se procesaron imágenes válidas.');
                setLoading(false);
                return;
            }

            const token = sessionStorage.getItem('token');
            await axios.post(`${API_URL}/playa/vehiculos/${selectedVehiculoId}/imagenes`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            fetchImagenes(selectedVehiculoId);
        } catch (error) {
            console.error('Error uploading images:', error);
            alert('Error al subir las imágenes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id_imagen) => {
        if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) return;

        try {
            const token = sessionStorage.getItem('token');
            await axios.delete(`${API_URL}/playa/vehiculos/imagenes/${id_imagen}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setImagenes(prev => prev.filter(img => img.id_imagen !== id_imagen));
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const handleSetPrincipal = async (id_imagen) => {
        try {
            const token = sessionStorage.getItem('token');
            await axios.patch(`${API_URL}/playa/vehiculos/imagenes/${id_imagen}/principal`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Recargar imágenes para reflejar cambio de "es_principal"
            fetchImagenes(selectedVehiculoId);
        } catch (error) {
            console.error('Error setting principal image:', error);
        }
    };

    const handleStartCrop = (img) => {
        setCroppingImage(img);
    };

    const handleSaveCropped = async (id_imagen_original, croppedBlob) => {
        setLoading(true);
        try {
            const formData = new FormData();
            const file = new File([croppedBlob], `recortada_${Date.now()}.jpg`, { type: 'image/jpeg' });
            formData.append('imagenes', file);

            const token = sessionStorage.getItem('token');
            // Subir la nueva imagen
            await axios.post(`${API_URL}/playa/vehiculos/${selectedVehiculoId}/imagenes`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Opcional: Eliminar la original
            if (window.confirm('¿Deseas eliminar la imagen original y mantener solo la recortada?')) {
                await axios.delete(`${API_URL}/playa/vehiculos/imagenes/${id_imagen_original}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setCroppingImage(null);
            fetchImagenes(selectedVehiculoId);
        } catch (error) {
            console.error('Error saving cropped image:', error);
            alert('Error al guardar la imagen recortada');
        } finally {
            setLoading(false);
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredVehiculos = vehiculos.filter(v =>
        `${v.marca} ${v.modelo} ${v.chasis} ${v.color || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectVehiculo = (vehiculo) => {
        setSelectedVehiculoId(vehiculo.id_producto);
        setSearchTerm(`${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.color ? `(${vehiculo.color})` : ''} - Chasis: ${vehiculo.chasis}`);
        setShowDropdown(false);
    };

    const handleClearSelection = () => {
        setSelectedVehiculoId('');
        setSearchTerm('');
        setImagenes([]);
    };

    // URL de la imagen: si STATIC_BASE está definido (ej. http://localhost:8001), se usa para que las imágenes se pidan al mismo backend que subió los archivos.
    const getImageUrl = (path) => {
        if (!path) return '';
        const normalized = path.startsWith('/') ? path : `/${path}`;
        if (STATIC_BASE && normalized.startsWith('/static')) {
            const base = STATIC_BASE.replace(/\/$/, '');
            return `${base}${normalized}`;
        }
        return normalized;
    };

    return (
        <div className="imagenes-container">
            {!id_producto && (
                <>
                    <div className="header-actions">
                        <h2>Gestión de Imágenes de Vehículos</h2>
                    </div>

                    <div className="vehicle-search-container" ref={searchContainerRef} style={{ position: 'relative', marginBottom: '20px' }}>
                        <label>Buscar Vehículo:</label>
                        <div className="search-input-wrapper" style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Escribe marca, modelo, chasis o color..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                            {selectedVehiculoId && (
                                <button
                                    onClick={handleClearSelection}
                                    style={{
                                        padding: '0 15px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {showDropdown && !selectedVehiculoId && (
                            <div className="search-dropdown" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '0 0 4px 4px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                {filteredVehiculos.length > 0 ? (
                                    filteredVehiculos.map(v => (
                                        <div
                                            key={v.id_producto}
                                            onClick={() => handleSelectVehiculo(v)}
                                            style={{
                                                padding: '10px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #eee'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                        >
                                            <strong>{v.marca} {v.modelo} ({v.color || 'Sin color'})</strong>
                                            <div style={{ fontSize: '0.85em', color: '#666' }}>
                                                Chasis: {v.chasis} | Año: {v.año}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '10px', color: '#999' }}>No se encontraron vehículos</div>
                                )}
                            </div>
                        )}

                        {selectedVehiculoId && (
                            <div className="vehicle-info-row" style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="info-badge">
                                    {imagenes.length} {imagenes.length === 1 ? 'imagen' : 'imágenes'} registradas
                                </span>
                                <button
                                    onClick={() => setIsModalRedesOpen(true)}
                                    className="btn-publicar-redes"
                                >
                                    📢 Publicar en Redes
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {selectedVehiculoId && (
                <>
                    <div
                        className={`upload-section ${dragActive ? 'drag-active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileInputChange}
                        />
                        <div className="upload-icon">📸</div>
                        <p>Arrastra y suelta imágenes aquí o haz clic para seleccionar</p>
                        <p className="subtext">Soporta múltiples archivos (JPG, PNG, WebP)</p>
                    </div>

                    {loading && <div className="loading">Cargando...</div>}

                    <div className="images-grid">
                        {imagenes.map(img => (
                            <div key={img.id_imagen} className="image-card">
                                {img.es_principal && <div className="principal-badge">Principal</div>}
                                <img
                                    src={getImageUrl(img.ruta_archivo)}
                                    alt={img.nombre_archivo}
                                    onClick={() => setPreviewImage(getImageUrl(img.ruta_archivo))}
                                    style={{ cursor: 'pointer' }}
                                />
                                <div className="image-actions">
                                    <button
                                        className="btn-set-principal"
                                        onClick={() => handleSetPrincipal(img.id_imagen)}
                                        disabled={img.es_principal}
                                    >
                                        {img.es_principal ? 'Principal' : 'Hacer Principal'}
                                    </button>
                                    <button
                                        className="btn-crop-img"
                                        onClick={() => handleStartCrop(img)}
                                        title="Recortar imagen"
                                    >
                                        ✂️
                                    </button>
                                    <button
                                        className="btn-delete-img"
                                        onClick={() => handleDelete(img.id_imagen)}
                                        title="Eliminar imagen"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!selectedVehiculoId && (
                <div className="no-selection-message">
                    <p>Busca y selecciona un vehículo para gestionar sus imágenes.</p>
                </div>
            )}

            {previewImage && (
                <div className="preview-modal" onClick={() => setPreviewImage(null)}>
                    <span className="close-preview">&times;</span>
                    <img src={previewImage} alt="Vista previa" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            {isModalRedesOpen && (
                <ModalPublicarRedes
                    isOpen={isModalRedesOpen}
                    onClose={() => setIsModalRedesOpen(false)}
                    imagenes={imagenes}
                    vehiculoInfo={vehiculos.find(v => v.id_producto === selectedVehiculoId)}
                    getImageUrl={getImageUrl}
                />
            )}

            {croppingImage && (
                <ModalRecortarImagen
                    image={getImageUrl(croppingImage.ruta_archivo)}
                    onClose={() => setCroppingImage(null)}
                    onSave={(blob) => handleSaveCropped(croppingImage.id_imagen, blob)}
                />
            )}
        </div>
    );
};

export default ImagenesVehiculo;
