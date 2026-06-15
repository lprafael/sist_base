"use client";

import { useRef, useState, useCallback, Suspense } from "react";
import { Camera, RefreshCw, UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

function TestFacialContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [matchMessage, setMatchMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isMatch, setIsMatch] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera", error);
      setErrorMessage("No se pudo acceder a la cámara.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageBase64 = canvasRef.current.toDataURL("image/jpeg");
        setCapturedImage(imageBase64);
        stopCamera();
      }
    }
  };

  const testPhoto = async () => {
    if (!capturedImage) return;
    setStatus("loading");
    setMatchMessage("");
    setErrorMessage("");
    setIsMatch(false);
    
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append("file", blob, "face.jpg");

      const response = await fetch(`${API_URL}/cancha/torneos/jugadores/test-face`, { 
        method: "POST", 
        body: formData,
        credentials: "omit" 
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error en el servidor");
      }
      
      if (data.match) {
        setIsMatch(true);
        setMatchMessage(`¡Reconocido! Jugador: ${data.jugador.nombre}`);
      } else {
        setIsMatch(false);
        setMatchMessage(data.message || "Rostro no reconocido en la base de datos.");
      }
      setStatus("success");
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Hubo un error al procesar el rostro.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-gray-800"
      >
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Test de Reconocimiento</h1>
          <p className="text-gray-400 text-sm mb-6">
            Captura una foto para verificar a qué jugador pertenece.
          </p>

          <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            {!capturedImage ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!stream && (
                  <button 
                    onClick={startCamera}
                    className="z-10 flex flex-col items-center justify-center gap-2 text-white bg-primary/20 hover:bg-primary/40 p-6 rounded-full backdrop-blur-md transition-all"
                  >
                    <Camera className="w-8 h-8" />
                    <span>Activar Cámara</span>
                  </button>
                )}
                <div className="absolute inset-0 pointer-events-none border-[3px] border-dashed border-white/30 rounded-[100px] m-10" />
              </>
            ) : (
              <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-3">
            {errorMessage && <p className="text-red-400 text-sm font-semibold">{errorMessage}</p>}
            
            {!capturedImage && stream && (
              <button 
                onClick={capturePhoto}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Tomar Foto
              </button>
            )}

            {capturedImage && status === "idle" && (
              <div className="flex gap-3">
                <button 
                  onClick={() => { setCapturedImage(null); startCamera(); }}
                  className="flex-1 py-3 bg-surface border border-gray-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reintentar
                </button>
                <button 
                  onClick={testPhoto}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-5 h-5" />
                  Analizar
                </button>
              </div>
            )}

            {status === "loading" && (
              <div className="w-full py-3 bg-surface text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Buscando coincidencias...
              </div>
            )}

            {status === "success" && (
              <>
                <div className={`w-full py-4 px-3 rounded-xl font-bold flex flex-col items-center justify-center gap-2 border ${isMatch ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                  {isMatch ? <CheckCircle className="w-8 h-8 mb-1" /> : <AlertTriangle className="w-8 h-8 mb-1" />}
                  <span className="text-lg">{matchMessage}</span>
                </div>
                <button 
                  onClick={() => { setStatus("idle"); setCapturedImage(null); startCamera(); }}
                  className="w-full mt-2 py-3 bg-surface border border-gray-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Probar otra vez
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TestFacialPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <TestFacialContent />
    </Suspense>
  );
}
