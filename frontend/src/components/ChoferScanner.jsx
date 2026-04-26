import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';

const ChoferScanner = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText, decodedResult) {
            console.log(`Code matched = ${decodedText}`, decodedResult);
            // El QR debería ser una URL como https://app.sigel.in/chofer/TOKEN
            // O simplemente el TOKEN
            let token = decodedText;
            if (decodedText.includes('/chofer/')) {
                token = decodedText.split('/chofer/')[1];
            }
            
            scanner.clear().then(() => {
                navigate(`/chofer/${token}`);
            }).catch(error => {
                console.error("Failed to clear scanner", error);
                navigate(`/chofer/${token}`);
            });
        }

        function onScanFailure(error) {
            // No hacemos nada en cada fallo de frame para no saturar el log
        }

        return () => {
            scanner.clear().catch(err => console.error("Error cleaning up scanner", err));
        };
    }, [navigate]);

    return (
        <div className="scanner-container">
            <header className="scanner-header">
                <button onClick={() => navigate('/login')} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <h1>Escanear QR de Chofer</h1>
            </header>

            <main className="scanner-main">
                <div className="instruction-card">
                    <Camera size={32} className="camera-icon" />
                    <p>Apunta tu cámara al código QR proporcionado por tu coordinador para iniciar el seguimiento.</p>
                </div>

                <div id="reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}></div>

                {error && <div className="error-msg">{error}</div>}
            </main>

            <style>{`
                .scanner-container {
                    min-height: 100vh;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                }
                .scanner-header {
                    background: #1e3a8a;
                    color: white;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .scanner-header h1 {
                    font-size: 1.2rem;
                    margin: 0;
                }
                .back-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 5px;
                }
                .scanner-main {
                    padding: 20px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .instruction-card {
                    background: white;
                    padding: 20px;
                    border-radius: 16px;
                    text-align: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    max-width: 400px;
                }
                .camera-icon {
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .instruction-card p {
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }
                #reader {
                    border: none !important;
                }
                #reader__scan_region {
                    background: #000;
                }
                #reader__dashboard_section_csr button {
                    background: #2563eb !important;
                    color: white !important;
                    border: none !important;
                    padding: 10px 20px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    margin-top: 10px !important;
                }
                .error-msg {
                    color: #ef4444;
                    background: #fef2f2;
                    padding: 10px;
                    border-radius: 8px;
                    margin-top: 20px;
                }
            `}</style>
        </div>
    );
};

export default ChoferScanner;
