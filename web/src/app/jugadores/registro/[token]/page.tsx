"use client";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, User, CheckCircle, ChevronRight, Loader2, RefreshCw, Trophy } from "lucide-react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export default function RegistroJugadorPage() {
  const params = useParams();
  const token = params.token as string;
  const [step, setStep] = useState<1|2|3>(1);
  const [equipo, setEquipo] = useState<any>(null);
  const [formData, setFormData] = useState({ nombre: "", dni: "", fecha_nacimiento: "", numero_camiseta: "", posicion: "Defensor" });
  const [cameraOn, setCameraOn] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(API_URL + "/cancha/torneos/equipos/token-jugadores/" + token)
      .then(r => r.ok ? r.json() : null).then(d => d && setEquipo(d)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
        .catch(() => { alert("No se pudo acceder a la camara."); setCameraOn(false); });
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [cameraOn]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
    c.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      setFotoFile(new File([blob], "foto.jpg", { type: "image/jpeg" }));
      setFotoPreview(URL.createObjectURL(blob));
      setCameraOn(false);
    }, "image/jpeg", 0.9);
  };

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.dni) { setMessage("Nombre y CI son obligatorios."); setStatus("error"); return; }
    setStatus("loading");
    const data = new FormData();
    data.append("nombre", formData.nombre); data.append("dni", formData.dni);
    if (formData.fecha_nacimiento) data.append("fecha_nacimiento", formData.fecha_nacimiento);
    if (formData.numero_camiseta) data.append("numero_camiseta", formData.numero_camiseta);
    if (formData.posicion) data.append("posicion", formData.posicion);
    if (fotoFile) data.append("file", fotoFile);
    try {
      const res = await fetch(API_URL + "/cancha/torneos/jugadores/self-register/" + token, { method: "POST", body: data });
      const rd = await res.json();
      if (res.ok) { setStatus("success"); setMessage(rd.message || "Exito!"); }
      else { setStatus("error"); setMessage(rd.detail || "Error en el registro."); }
    } catch { setStatus("error"); setMessage("Sin conexion."); }
  };

  if (status === "success") return (
    <div className="min-h-screen bg-[#080b12] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
        <h1 className="text-3xl font-black text-white mb-2">Registrado!</h1>
        {equipo && <p className="text-green-400 font-bold mb-2">{equipo.nombre}</p>}
        <p className="text-slate-400">{message}</p>
        {!fotoFile && <p className="mt-4 text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">Sin foto: pedile a tu delegado que agregue tu foto para el check-in facial.</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080b12] text-white p-4 pb-16">
      <div className="max-w-md mx-auto">
        <div className="text-center pt-10 pb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <Trophy className="w-8 h-8 text-green-400" />
          </div>
          {equipo && <p className="text-green-400 font-bold text-sm mb-1">{equipo.torneo_nombre}</p>}
          <h1 className="text-2xl font-black">Registro de Jugador</h1>
          {equipo && <p className="text-slate-400 text-sm mt-1">Equipo: <span className="text-white font-bold">{equipo.nombre}</span></p>}
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1,2,3] as const).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-black " + (step >= s ? "bg-green-500 text-black" : "bg-slate-800 text-slate-500")}>{s}</div>
              {s < 3 && <div className={"w-12 h-0.5 " + (step > s ? "bg-green-500" : "bg-slate-800")} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">Tus Datos</h2>
            {([["Nombre Completo *", "nombre", "text", "Juan Perez"],["CI / DNI *", "dni", "text", "4567890"],["Fecha de Nacimiento", "fecha_nacimiento", "date", ""],["Numero de Camiseta", "numero_camiseta", "number", "10"]] as const).map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                <input type={type} placeholder={ph} value={(formData as any)[key]}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Posicion</label>
              <select value={formData.posicion} onChange={e => setFormData({ ...formData, posicion: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 text-sm">
                {["Arquero","Defensor","Mediocampista","Delantero"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 mt-4">
              Continuar <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-black mb-2">Foto Biometrica</h2>
            <p className="text-slate-400 text-sm mb-6">Opcional. Se usara para reconocerte el dia del torneo.</p>
            {!cameraOn && !fotoPreview && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button onClick={() => setCameraOn(true)} className="bg-slate-900 border-2 border-dashed border-green-500/40 hover:border-green-500 rounded-2xl p-6 flex flex-col items-center gap-3">
                  <Camera className="w-10 h-10 text-green-400" /><span className="font-bold text-sm">Camara</span><span className="text-slate-500 text-xs">Recomendado</span>
                </button>
                <label className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer">
                  <Upload className="w-10 h-10 text-slate-400" /><span className="font-bold text-sm">Subir foto</span><span className="text-slate-500 text-xs">Galeria</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){setFotoFile(f);setFotoPreview(URL.createObjectURL(f));} }} />
                </label>
              </div>
            )}
            {cameraOn && (
              <div className="mb-6">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 mb-4">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 border-2 border-green-400 rounded-full opacity-60" />
                  <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-green-300 font-bold">Mira de frente con buena luz</p>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-3">
                  <button onClick={capturePhoto} className="flex-1 bg-green-500 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2"><Camera size={20}/>Capturar</button>
                  <button onClick={() => setCameraOn(false)} className="px-4 py-3 bg-slate-800 rounded-xl"><RefreshCw size={18}/></button>
                </div>
              </div>
            )}
            {fotoPreview && (
              <div className="mb-6">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900">
                  <img src={fotoPreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-green-500 text-black text-xs font-black px-2 py-1 rounded-full">OK</div>
                </div>
                <button onClick={() => {setFotoFile(null);setFotoPreview(null);}} className="mt-3 text-slate-400 text-sm flex items-center gap-1 mx-auto"><RefreshCw size={14}/>Cambiar</button>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-800 rounded-xl font-bold">Atras</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-green-500 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2">
                {fotoFile ? "Continuar" : "Omitir"} <ChevronRight size={20}/>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-black mb-6">Confirmar</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 mb-6">
              <div className="flex justify-center mb-4">
                {fotoPreview ? <img src={fotoPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-green-500/40"/>
                  : <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-10 h-10 text-slate-600"/></div>}
              </div>
              {([["Nombre", formData.nombre],["CI/DNI", formData.dni],["Posicion", formData.posicion]] as const).map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                  <span className="text-slate-400">{k}</span><span className="font-bold">{v}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-slate-400">Check-in facial</span>
                <span className={fotoFile ? "text-green-400 font-bold" : "text-yellow-500"}>{fotoFile ? "Habilitado" : "Sin foto"}</span>
              </div>
            </div>
            {status === "error" && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">{message}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-slate-800 rounded-xl font-bold">Atras</button>
              <button onClick={handleSubmit} disabled={status === "loading"} className="flex-1 bg-green-500 disabled:opacity-50 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2">
                {status === "loading" ? (<span>Enviando...</span>) : "Confirmar Registro"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
