import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import './ModalRecortarImagen.css';

const ModalRecortarImagen = ({ image, onClose, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        // set canvas size to match the path
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // draw rotated image and store data.
        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        // As a blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleSave = async () => {
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            onSave(croppedBlob);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="crop-modal-overlay">
            <div className="crop-modal-content">
                <div className="crop-header">
                    <h3>Recortar Imagen</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="crop-container">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={4 / 3}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="crop-controls">
                    <div className="zoom-control">
                        <span>Zoom:</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="zoom-range"
                        />
                    </div>
                    <div className="crop-actions">
                        <button className="btn-cancel" onClick={onClose}>Cancelar</button>
                        <button className="btn-save" onClick={handleSave}>Guardar Recorte</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalRecortarImagen;
