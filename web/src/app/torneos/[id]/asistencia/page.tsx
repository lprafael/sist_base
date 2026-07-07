"use client";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Camera, RefreshCw, CheckCircle, XCircle, Loader2, Trophy, Users, CalendarCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

type Mode = "torneo" | "partido";

export default function AsistenciaPage() {
  const params = useParams();
  const torneoId = params.id as string;

  const [mode, setMode] = useState<Mode>("torneo");
  const [partidoId, setPartidoId] = useState("");
  const [partidos, setPartidos] = useState<any[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; jugador?: any; message: string } | null>(null);
  const [log, setLog] = useState<Array<{ nombre: string; equipo?: string; hora: string; ok: boolean }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(API_URL + "/" + torneoId + "/partidos")
      .then(r => r.ok ? r.json() : []).then(d => setPartidos(d)).catch(() => {});
  }, [torneoId]);

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } })
        .then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
        .catch(() => { alert("Sin acceso a camara."); setCameraOn(false); });
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [cameraOn]);

  const scan = async () => {
    if (!videoRef.current || !canvasRef.current || processing) return;
    const c = canvasRef.current;
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
    c.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    c.toBlob(async blob => {
      if (!blob) return;
      setProcessing(true); setResult(null);
      try {
        const data = new FormData();
        data.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }));
        const endpoint = mode === "torneo"
          ? API_URL + "/cancha/torneos/checkin-torneo/" + torneoId
          : API_URL + "/cancha/torneos/checkin-partido/" + partidoId;
        const res = await fetch(endpoint, { method: "POST", body: data });
        const rd = await res.json();
        const ok = rd.match === true;
        setResult({ ok, jugador: rd.jugador, message: rd.message });
        if (ok && rd.jugador) {
          setLog(prev => [{ nombre: rd.jugador.nombre, equipo: rd.jugador.equipo, hora: new Date().toLocaleTimeString(), ok: true }, ...prev.slice(0, 29)]);
        }
      } catch { setResult({ ok: false, message: "Error de conexion." }); }
      finally { setProcessing(false); }
    }, "image/jpeg", 0.85);
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <CalendarCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-black">Control de Asistencia</h1>
          <p className="text-slate-400 text-sm mt-1">Reconocimiento Facial en Tiempo Real</p>
        </div>

        {/* Mode selector */}
        <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1 mb-6">
          <button onClick={() => setMode("torneo")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition-all " + (mode === "torneo" ? "bg-blue-600 text-white" : "text-slate-400")}>
            <Trophy size={14} className="inline mr-1.5" />Check-in Torneo
          </button>
          <button onClick={() => setMode("partido")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition-all " + (mode === "partido" ? "bg-purple-600 text-white" : "text-slate-400")}>
            <Users size={14} className="inline mr-1.5" />Check-in Partido
          </button>
        </div>

        {mode === "partido" && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Seleccionar Partido</label>
            <select value={partidoId} onChange={e => setPartidoId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
              <option value="">-- Elegir partido --</option>
              {partidos.map(p => (
                <option key={p.id} value={p.id}>{p.local_nombre} vs {p.visitante_nombre} (J{p.jornada})</option>
              ))}
            </select>
          </div>
        )}

        {/* Camera */}
        {!cameraOn ? (
          <button onClick={() => setCameraOn(true)}
            className="w-full bg-slate-900 border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-3xl p-12 flex flex-col items-center gap-4 transition-all mb-6">
            <Camera className="w-16 h-16 text-blue-400" />
            <span className="font-black text-lg">Activar Cámara</span>
            <span className="text-slate-500 text-sm">Apunta la cámara al rostro del jugador</span>
          </button>
        ) : (
          <div className="mb-6">
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-video mb-4">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {processing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                </div>
              )}
              {result && (
                <div className={"absolute inset-0 flex items-center justify-center " + (result.ok ? "bg-green-500/20" : "bg-red-500/20")}>
                  <div className={"text-center p-6 rounded-2xl " + (result.ok ? "bg-green-500/30 border border-green-500/60" : "bg-red-500/30 border border-red-500/60")}>
                    {result.ok ? <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-2" /> : <XCircle className="w-16 h-16 text-red-400 mx-auto mb-2" />}
                    {result.jugador && <p className="text-xl font-black text-white">{result.jugador.nombre}</p>}
                    {result.jugador?.equipo && <p className="text-slate-300 text-sm">{result.jugador.equipo}</p>}
                    <p className={"text-sm mt-1 " + (result.ok ? "text-green-300" : "text-red-300")}>{result.message}</p>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={scan} disabled={processing || (mode === "partido" && !partidoId)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-lg">
                <Camera size={22} /> Escanear
              </button>
              <button onClick={() => { setCameraOn(false); setResult(null); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                <RefreshCw size={20} /> Pausar
              </button>
            </div>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-black uppercase text-slate-400 mb-3 tracking-wider">Registros de hoy</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{entry.nombre}</p>
                    {entry.equipo && <p className="text-slate-500 text-xs">{entry.equipo}</p>}
                  </div>
                  <span className="text-slate-500 text-xs flex-shrink-0">{entry.hora}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
