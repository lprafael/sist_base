'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube, MessageCircle, Send, X
} from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.micancha.com.py';

export default function AcademiaPublicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [academia, setAcademia] = useState<any>(null);
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatForm, setChatForm] = useState({ asunto: '', mensaje: '', tipo: 'conversacion' });
  const [chatStatus, setChatStatus] = useState('');

  useEffect(() => {
    if (slug) loadData();
  }, [slug]);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/academias/${slug}`);
      if (!res.ok) {
        if (res.status === 404) router.push('/academias');
        return;
      }
      const data = await res.json();
      setAcademia(data);

      if (data.id) {
        const resNoticias = await fetch(`${API_URL}/academias/${data.id}/noticias/publicas`);
        if (resNoticias.ok) {
          const nData = await resNoticias.json();
          setNoticias(nData);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const enviarMensaje = async (e: any) => {
    e.preventDefault();
    setChatStatus('Enviando...');
    try {
      const res = await fetch(`${API_URL}/academias/${academia.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatForm)
      });
      if (res.ok) {
        setChatStatus('Enviado!');
        setTimeout(() => {
          setChatOpen(false);
          setChatForm({ asunto: '', mensaje: '', tipo: 'conversacion' });
          setChatStatus('');
        }, 2000);
      } else {
        setChatStatus('Error al enviar');
      }
    } catch(err) {
      setChatStatus('Error de conexión');
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando academia...</div>;
  if (!academia) return null;

  const C_PR = academia.color_primario || '#1e3a8a';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER BANNER */}
      <div style={{
        height: 250, background: academia.banner_url ? `url(${academia.banner_url}) center/cover` : C_PR,
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0f172a 0%, transparent 100%)' }} />
        
        <div style={{ position: 'absolute', bottom: -50, left: 40, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          <div style={{
            width: 120, height: 120, borderRadius: 20, background: '#1e293b', border: '4px solid #0f172a',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {academia.logo_url ? <img src={academia.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{fontSize:40}}>🎓</span>}
          </div>
          <div style={{ paddingBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>{academia.nombre}</h1>
            <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: 16 }}>{academia.descripcion}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px 40px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
        
        {/* MAIN CONTENT */}
        <div>
          {academia.acerca_de && (
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 16, marginBottom: 30 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', color: C_PR }}>Acerca de nosotros</h2>
              <p style={{ margin: 0, lineHeight: 1.6, color: '#cbd5e1' }}>{academia.acerca_de}</p>
            </div>
          )}

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px' }}>Noticias y Avisos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {noticias.length > 0 ? noticias.map(n => (
              <div key={n.id} style={{ background: '#1e293b', borderRadius: 16, overflow: 'hidden' }}>
                {n.imagen_url && <img src={n.imagen_url} style={{ width: '100%', height: 200, objectFit: 'cover' }} />}
                <div style={{ padding: 20 }}>
                  <span style={{ fontSize: 12, color: C_PR, fontWeight: 700 }}>{n.fecha_publicacion?.split('T')[0]}</span>
                  <h3 style={{ margin: '8px 0 12px', fontSize: 20 }}>{n.titulo}</h3>
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.5 }}>{n.contenido}</p>
                </div>
              </div>
            )) : (
              <p style={{ color: '#64748b' }}>No hay noticias publicadas por el momento.</p>
            )}
          </div>
        </div>

        {/* SIDEBAR INFO */}
        <div>
          <div style={{ background: '#1e293b', padding: 24, borderRadius: 16, position: 'sticky', top: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', borderBottom: '1px solid #334155', paddingBottom: 10 }}>Contacto</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {academia.ciudad && <div style={{ display: 'flex', gap: 10, color: '#cbd5e1' }}><MapPin size={20} color={C_PR} /> {academia.ciudad}, {academia.departamento}</div>}
              {academia.telefono && <div style={{ display: 'flex', gap: 10, color: '#cbd5e1' }}><Phone size={20} color={C_PR} /> {academia.telefono}</div>}
              {academia.email && <div style={{ display: 'flex', gap: 10, color: '#cbd5e1' }}><Mail size={20} color={C_PR} /> {academia.email}</div>}
            </div>

            {(academia.facebook || academia.instagram || academia.youtube) && (
              <div style={{ display: 'flex', gap: 15, marginTop: 24, paddingTop: 20, borderTop: '1px solid #334155' }}>
                {academia.facebook && <a href={academia.facebook} target="_blank" rel="noreferrer"><Facebook size={24} color="#94a3b8" /></a>}
                {academia.instagram && <a href={academia.instagram} target="_blank" rel="noreferrer"><Instagram size={24} color="#94a3b8" /></a>}
                {academia.youtube && <a href={academia.youtube} target="_blank" rel="noreferrer"><Youtube size={24} color="#94a3b8" /></a>}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* FLOATING BOT / CHAT */}
      {academia.canal_comunicacion_habilitado && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 999 }}>
          {chatOpen ? (
            <div style={{
              background: '#1e293b', width: 340, borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: `1px solid ${C_PR}44`
            }}>
              <div style={{ background: C_PR, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Contacto Directo</div>
                <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              
              <form onSubmit={enviarMensaje} style={{ padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#cbd5e1' }}>
                  Envianos un mensaje, sugerencia o completá tu encuesta aquí.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display:'block', fontSize:12, marginBottom:4, color:'#94a3b8' }}>Asunto</label>
                  <input required value={chatForm.asunto} onChange={e => setChatForm({...chatForm, asunto: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing:'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display:'block', fontSize:12, marginBottom:4, color:'#94a3b8' }}>Mensaje</label>
                  <textarea required value={chatForm.mensaje} onChange={e => setChatForm({...chatForm, mensaje: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', minHeight: 90, boxSizing:'border-box', resize: 'none' }} />
                </div>
                <button type="submit" style={{
                  width: '100%', background: C_PR, color: '#fff', border: 'none', padding: 12, borderRadius: 8,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 8
                }}>
                  {chatStatus || <><Send size={18}/> Enviar</>}
                </button>
              </form>
            </div>
          ) : (
            <button onClick={() => setChatOpen(true)} style={{
              width: 60, height: 60, borderRadius: 30, background: C_PR, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)', transition: 'transform 0.2s'
            }}>
              <MessageCircle size={30} color="#fff" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
