"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BiometricCheckinPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [matchId, setMatchId] = useState("partido_demo_123");
  const [equipoId, setEquipoId] = useState("equipo_demo_123");
  
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [playerData, setPlayerData] = useState<{name: string, confidence: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setStatus('error');
      setErrorMsg("No se pudo acceder a la cámara.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setStatus('scanning');
    
    // Draw current frame to canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if(ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      
      try {
        const res = await fetch("http://localhost:8001/futbol/arbitraje/asistencia/biometrica", {
          method: "POST",
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            partido_id: matchId,
            equipo_id: equipoId,
            imagen_base64: base64Image
          })
        });
        
        const data = await res.json();
        
        if (res.ok && data.match) {
          setStatus('success');
          setPlayerData({ name: data.player_name, confidence: data.confidence });
          // Reset after 3 seconds
          setTimeout(() => setStatus('idle'), 3000);
        } else {
          setStatus('error');
          setErrorMsg(data.detail || "Rostro no reconocido.");
          setTimeout(() => setStatus('idle'), 3000);
        }
      } catch(e) {
        setStatus('error');
        setErrorMsg("Error de conexión con el motor de IA.");
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      
      {/* Header */}
      <div className="p-6 absolute top-0 left-0 right-0 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent text-white">
        <button onClick={() => router.back()} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-widest uppercase">Check-in Biométrico</h1>
        <div className="w-12"></div> {/* Spacer */}
      </div>

      {/* Camara View */}
      <div className="flex-1 relative overflow-hidden flex justify-center items-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute min-w-full min-h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* OVAL OVERLAY (Estilo Face ID) */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
          {/* Sombreado externo simulado con bordes anchos, el centro es transparente */}
          <div className="w-[300px] h-[400px] border-[60px] border-black/60 rounded-[150px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] box-content relative">
            
            {/* Animación de escaneo (linea que baja) */}
            {status === 'scanning' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_15px_#4ade80] animate-[scandown_2s_ease-in-out_infinite]" />
            )}
            
            {/* Esquinas para guiar el rostro */}
            <div className="absolute -top-6 -left-6 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl opacity-50" />
            <div className="absolute -top-6 -right-6 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl opacity-50" />
            <div className="absolute -bottom-6 -left-6 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl opacity-50" />
            <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl opacity-50" />
          </div>
          
          <p className="text-white mt-12 font-bold text-lg tracking-wide z-20">
            {status === 'idle' ? 'Posiciona tu rostro en el centro' : 
             status === 'scanning' ? 'Analizando...' : ''}
          </p>
        </div>

        {/* FEEDBACK OVERLAYS */}
        {status === 'success' && playerData && (
          <div className="absolute inset-0 bg-green-500/90 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md animate-in fade-in duration-200">
            <CheckCircle2 size={100} className="mb-6 drop-shadow-xl" />
            <h2 className="text-4xl font-black mb-2 text-center">{playerData.name}</h2>
            <p className="text-xl font-bold bg-black/20 px-6 py-2 rounded-full">
              ✅ Asistencia Confirmada ({playerData.confidence}%)
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 bg-red-600/90 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md animate-in fade-in duration-200">
            <AlertCircle size={100} className="mb-6 drop-shadow-xl" />
            <h2 className="text-3xl font-black mb-2 text-center">No Reconocido</h2>
            <p className="text-lg font-bold bg-black/20 px-6 py-2 rounded-full">
              {errorMsg}
            </p>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="bg-black p-8 pb-12 z-20 flex flex-col items-center">
        <button 
          onClick={captureAndScan}
          disabled={status !== 'idle'}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
            status === 'idle' ? 'border-white bg-white/20' : 'border-gray-500 bg-gray-800 opacity-50'
          }`}
        >
          {status === 'scanning' ? (
            <Loader2 size={32} className="text-white animate-spin" />
          ) : (
            <div className="w-14 h-14 bg-white rounded-full" />
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes scandown {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
