import React, { useState } from 'react';
import axios from 'axios';
import './ModalPublicarRedes.css';

const ModalPublicarRedes = ({ isOpen, onClose, imagenes, vehiculoInfo, getImageUrl }) => {
    const [postText, setPostText] = useState('');
    const [selectedNetworks, setSelectedNetworks] = useState([]);
    const [selectedImages, setSelectedImages] = useState([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isGeneratingText, setIsGeneratingText] = useState(false);

    const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';


    const generateAIText = async () => {
        setIsGeneratingText(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`${API_URL}/playa/vehiculos/${vehiculoInfo.id_producto}/generar-texto-redes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.texto) {
                setPostText(response.data.texto);
            }
        } catch (error) {
            console.error('Error generating AI text:', error);
            // Si falla, al menos ponemos algo básico
            setPostText(`🚗 ${vehiculoInfo.marca} ${vehiculoInfo.modelo} ${vehiculoInfo.año} 🚗\n\nConsultar precio y financiación.`);
        } finally {
            setIsGeneratingText(false);
        }
    };

    const networks = [
        { id: 'facebook', label: 'Facebook', icon: '🔵' },
        { id: 'instagram', label: 'Instagram', icon: '📸' },
        { id: 'twitter', label: 'X (Twitter)', icon: '✖️' },
        { id: 'whatsapp', label: 'WhatsApp', icon: '🟢' }
    ];

    if (!isOpen) return null;

    const toggleNetwork = (id) => {
        if (selectedNetworks.includes(id)) {
            setSelectedNetworks(selectedNetworks.filter(n => n !== id));
        } else {
            setSelectedNetworks([...selectedNetworks, id]);
        }
    };

    const toggleImage = (id_imagen) => {
        if (selectedImages.includes(id_imagen)) {
            setSelectedImages(selectedImages.filter(id => id !== id_imagen));
        } else {
            setSelectedImages([...selectedImages, id_imagen]);
        }
    };

    const handlePublish = async () => {
        if (selectedNetworks.length === 0) {
            alert('Por favor, selecciona al menos una red social.');
            return;
        }
        if (!postText.trim()) {
            alert('El texto de la publicación no puede estar vacío.');
            return;
        }

        setIsPublishing(true);
        try {
            const token = sessionStorage.getItem('token');
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
            const con_marca_agua = userData.username !== 'admin';

            const data = {
                id_producto: vehiculoInfo.id_producto,
                texto: postText,
                redes: selectedNetworks,
                imagenes: selectedImages,
                con_marca_agua: con_marca_agua
            };

            // Llamada al backend
            const response = await axios.post(`${API_URL}/playa/social-post`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const details = response.data.details || {};
            let feedback = 'Proceso completado:\n';
            Object.keys(details).forEach(red => {
                feedback += `- ${red.toUpperCase()}: ${details[red]}\n`;
            });

            alert(feedback);
            if (response.data.status === "success") {
                onClose();
            }
        } catch (error) {
            console.error('Error al publicar:', error);
            const detailMsg = error.response?.data?.detail || 'Error desconocido';
            alert(`Hubo un error al intentar publicar: ${detailMsg}`);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="modal-redes-overlay" onClick={onClose}>
            <div className="modal-redes-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-redes-header">
                    <h3>Publicar en Redes Sociales</h3>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-redes-body">
                    <div className="modal-redes-left">
                        <span className="section-title">1. Elige las Redes</span>
                        <div className="networks-selection">
                            {networks.map(net => (
                                <div
                                    key={net.id}
                                    className={`network-item ${selectedNetworks.includes(net.id) ? 'selected' : ''}`}
                                    onClick={() => toggleNetwork(net.id)}
                                >
                                    <span className="network-icon">{net.icon}</span>
                                    <span className="network-label">{net.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="section-header-row">
                            <span className="section-title">2. Texto de la Publicación</span>
                            <button
                                className="btn-regenerate"
                                onClick={generateAIText}
                                disabled={isGeneratingText}
                                title="Generar con IA"
                                style={{ width: 'auto', padding: '0 15px' }}
                            >
                                {isGeneratingText ? '⌛ Generando...' : '✨ Generar con IA'}
                            </button>
                        </div>
                        <textarea
                            className={`post-text-area ${isGeneratingText ? 'loading-text' : ''}`}
                            placeholder={isGeneratingText ? "Generando texto con IA..." : "Escribe aquí lo que quieres publicar..."}
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                            disabled={isGeneratingText}
                        />
                    </div>

                    <div className="modal-redes-right">
                        <span className="section-title">3. Selecciona las Imágenes ({selectedImages.length})</span>
                        <div className="post-images-grid">
                            {imagenes.map(img => (
                                <div
                                    key={img.id_imagen}
                                    className={`post-image-item ${selectedImages.includes(img.id_imagen) ? 'selected' : ''}`}
                                    onClick={() => toggleImage(img.id_imagen)}
                                >
                                    <img src={getImageUrl(img.ruta_archivo)} alt="Vehículo" />
                                    {selectedImages.includes(img.id_imagen) && (
                                        <div className="selection-overlay">
                                            {selectedImages.indexOf(img.id_imagen) + 1}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isPublishing && (
                        <div className="loading-overlay">
                            <div className="spinner"></div>
                            <p>Publicando...</p>
                        </div>
                    )}
                </div>

                <div className="modal-redes-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-publish"
                        onClick={handlePublish}
                        disabled={isPublishing || selectedNetworks.length === 0 || !postText}
                    >
                        Publicar Ahora
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalPublicarRedes;
