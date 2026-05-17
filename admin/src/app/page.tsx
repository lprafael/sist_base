/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import TimelineGrid from '@/components/TimelineGrid';
import BookingModal from '@/components/BookingModal';
import AnnouncementToast from '@/components/AnnouncementToast';
import SidebarStats from '@/components/SidebarStats';
import Header from '@/components/Header';
import TournamentManagement from '@/components/TournamentManagement';
import { useWebSocket } from '@/hooks/useWebSocket';

const COMPLEJO_ID = process.env.NEXT_PUBLIC_COMPLEJO_ID || '11111111-1111-1111-1111-111111111111';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface Announcement {
  id: number;
  type: string;
  tipo: string;
  text: string;
  payload?: any;
}

interface Slot {
  cancha: any;
  horaInicio: string;
}

export default function AdminDashboard() {
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [canchas, setCanchas] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<any | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [complejo, setComplejo] = useState<any | null>(null);

  const handleAnnouncement = useCallback((msg: any) => {
    const id = Date.now();
    setAnnouncements(prev => [...prev, { ...msg, id } as Announcement]);

    if (audioEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg.text);
      utterance.lang = 'es-PY';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('es'));
      if (spanishVoice) utterance.voice = spanishVoice;
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => {
      setAnnouncements(prev => prev.filter((a: Announcement) => a.id !== id));
    }, 8000);
  }, [audioEnabled]);

  // WebSocket para notificaciones en tiempo real
  const { isConnected } = useWebSocket(
    `${API_URL.replace('http', 'ws')}/cancha/ws/${COMPLEJO_ID}`,
    {
      onMessage: (msg: any) => {
        if (msg.type === 'announcement') {
          handleAnnouncement(msg);
        } else if (msg.type === 'reserva_updated') {
          loadReservas();
        }
      }
    }
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [canchasRes, reservasRes, complejoRes] = await Promise.all([
        fetch(`${API_URL}/cancha/complejos/${COMPLEJO_ID}/canchas`),
        fetch(`${API_URL}/cancha/complejos/${COMPLEJO_ID}/reservas?fecha=${fecha}`),
        fetch(`${API_URL}/cancha/complejos/${COMPLEJO_ID}`),
      ]);
      const canchasData = await canchasRes.json();
      const reservasData = await reservasRes.json();
      const complejoData = await complejoRes.json();
      setCanchas(Array.isArray(canchasData) ? canchasData : []);
      setReservas(Array.isArray(reservasData) ? reservasData : []);
      if (complejoData && !complejoData.detail) setComplejo(complejoData);
    } catch (e) {
      console.error('Error cargando datos:', e);
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  const loadReservas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/cancha/complejos/${COMPLEJO_ID}/reservas?fecha=${fecha}`);
      setReservas(await res.json());
    } catch (_e) {}
  }, [fecha]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadReservas, 60000);
    return () => clearInterval(interval);
  }, [loadReservas]);

  const handleSlotClick = (cancha: any, horaInicio: string) => {
    setSelectedSlot({ cancha, horaInicio });
    setSelectedReserva(null);
  };

  const handleReservaClick = (reserva: any) => {
    setSelectedReserva(reserva);
    setSelectedSlot(null);
  };

  const handleBookingSaved = () => {
    setSelectedSlot(null);
    setSelectedReserva(null);
    loadReservas();
  };

  const enviarAnuncioManual = async (texto: string) => {
    try {
      await fetch(`${API_URL}/cancha/complejos/${COMPLEJO_ID}/anuncio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
    } catch (_e) {}
  };

  const statsHoy = {
    totalReservas: reservas.length,
    ingresos: reservas.reduce((s: number, r: any) => s + (r.precio_total || 0), 0),
    canchasActivas: canchas.length,
    ocupacion: canchas.length > 0
      ? Math.round((reservas.length / (canchas.length * 14)) * 100)
      : 0,
  };

  const [view, setView] = useState<'grid' | 'tournaments'>('grid');

  return (
    <div className="admin-layout">
      <Header
        complejo={complejo}
        fecha={fecha}
        onFechaChange={setFecha}
        isConnected={isConnected}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((p: boolean) => !p)}
        onAnuncioManual={enviarAnuncioManual}
        onViewChange={setView}
        currentView={view}
      />

      <div className="admin-body">
        <SidebarStats stats={statsHoy} canchas={canchas} reservas={reservas} />

        <main className="admin-main">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Cargando tablero...</p>
            </div>
          ) : view === 'grid' ? (
            <TimelineGrid
              canchas={canchas}
              reservas={reservas}
              fecha={fecha}
              onSlotClick={handleSlotClick}
              onReservaClick={handleReservaClick}
            />
          ) : (
            <TournamentManagement complejoId={COMPLEJO_ID} />
          )}
        </main>
      </div>

      {(selectedSlot || selectedReserva) && (
        <BookingModal
          slot={selectedSlot}
          reserva={selectedReserva}
          canchas={canchas}
          complejoId={COMPLEJO_ID}
          apiUrl={API_URL}
          fecha={fecha}
          onSave={handleBookingSaved}
          onClose={() => { setSelectedSlot(null); setSelectedReserva(null); }}
        />
      )}

      <div className="announcements-stack">
        {announcements.map((ann: Announcement) => (
          <AnnouncementToast
            key={ann.id}
            announcement={ann}
            onClose={() => setAnnouncements((prev: Announcement[]) => prev.filter((a: Announcement) => a.id !== ann.id))}
          />
        ))}
      </div>
    </div>
  );
}
