"use client";

import { useRef, useState, useCallback, Suspense } from "react";
import { Camera, RefreshCw, UploadCloud, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

function RegistroFacialContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const searchParams = useSearchParams();
  const jugadorId = searchParams.get("jugadorId");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

  const uploadPhoto = async () => {
    if (!capturedImage) return;
    if (!jugadorId) {
      setStatus("error");
      setErrorMessage("ID de jugador no especificado en la URL.");
      return;
    }
    
    setStatus("loading");
    
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append("file", blob, "face.jpg");

      const response = await fetch(`${API_URL}/cancha/torneos/jugadores/${jugadorId}/upload-face`, { 
        method: "POST", 
        body: formData,
        credentials: "omit" 
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error en el servidor");
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
          <h1 className="text-2xl font-bold text-white mb-2">Verificación Facial</h1>
          <p className="text-gray-400 text-sm mb-6">
            Asegúrate de estar en un lugar iluminado y mirar directamente a la cámara.
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
                {/* Overlay guides */}
                <div className="absolute inset-0 pointer-events-none border-[3px] border-dashed border-white/30 rounded-[100px] m-10" />
              </>
            ) : (
              <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-3">
            {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}
            
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
                  onClick={uploadPhoto}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-5 h-5" />
                  Confirmar
                </button>
              </div>
            )}

            {status === "loading" && (
              <div className="w-full py-3 bg-surface text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analizando rostro...
              </div>
            )}

            {status === "success" && (
              <div className="w-full py-3 bg-accent/20 text-accent rounded-xl font-medium flex items-center justify-center gap-2 border border-accent/30">
                <CheckCircle className="w-5 h-5" />
                Identidad Verificada
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegistroFacialPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RegistroFacialContent />
    </Suspense>
  );
}
