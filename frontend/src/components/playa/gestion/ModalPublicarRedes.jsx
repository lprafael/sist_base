import React, { useState } from 'react';
import axios from 'axios';
import './ModalPublicarRedes.css';

const ModalPublicarRedes = ({ isOpen, onClose, imagenes, vehiculoInfo, getImageUrl }) => {
    const [postText, setPostText] = useState('');
    const [selectedNetworks, setSelectedNetworks] = useState([]);
    const [selectedImages, setSelectedImages] = useState([]);
    const [isPublishing, setIsPublishing] = useState(false);

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
            const data = {
                id_producto: vehiculoInfo.id_producto,
                texto: postText,
                redes: selectedNetworks,
                imagenes: selectedImages
            };

            // Llamada al backend
            const API_URL = import.meta.env.VITE_REACT_APP_API_URL || '/api';
            await axios.post(`${API_URL}/playa/social-post`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('¡Publicación enviada exitosamente!');
            onClose();
        } catch (error) {
            console.error('Error al publicar:', error);
            alert('Hubo un error al intentar publicar. Verifica la configuración en el backend.');
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

                        <span className="section-title">2. Texto de la Publicación</span>
                        <textarea
                            className="post-text-area"
                            placeholder="Escribe aquí lo que quieres publicar..."
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
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
                                        <div className="selection-overlay">✓</div>
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
