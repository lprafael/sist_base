"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Trophy, Search, MapPin, SlidersHorizontal, ArrowLeft, Star, Calendar, Clock, X, Check, Eye } from "lucide-react";

// Import Leaflet component dynamically to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "'Outfit', sans-serif" }}><div className="spinner" style={{ marginRight: 12 }} /> Cargando mapa interactivo...</div>
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Local dataset of complexes with real Paraguayan coordinates and details
const MOCK_COMPLEJOS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Complejo Deportivo Mburicao",
    direccion: "Av. Mcal. López c/ Perú",
    ciudad: "Asunción",
    pos: [-25.2867, -57.6470] as [number, number],
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400",
    hours: "07:00 - 23:00",
    activo: true,
    canchas: [
      { id: "c1", deporte: "Fútbol 5", precio: 120000, disponible: true },
      { id: "c2", deporte: "Fútbol 7", precio: 170000, disponible: true },
      { id: "c3", deporte: "Pádel", precio: 100000, disponible: false } // Booked out
    ]
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "La Quinta Sports",
    direccion: "Mcal. Estigarribia e/ Pratt Gill",
    ciudad: "Luque",
    pos: [-25.2680, -57.4850] as [number, number],
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=400",
    hours: "08:00 - 00:00",
    activo: true,
    canchas: [
      { id: "c4", deporte: "Fútbol 5", precio: 110000, disponible: true },
      { id: "c5", deporte: "Fútbol 7", precio: 160000, disponible: true },
      { id: "c6", deporte: "Pádel", precio: 90000, disponible: true },
      { id: "c7", deporte: "Tenis", precio: 80000, disponible: true }
    ]
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Padel Cristal España",
    direccion: "España y Brasilia",
    ciudad: "Asunción",
    pos: [-25.2950, -57.6200] as [number, number],
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400",
    hours: "06:00 - 23:00",
    activo: true,
    canchas: [
      { id: "c8", deporte: "Pádel", precio: 100000, disponible: true },
      { id: "c9", deporte: "Tenis", precio: 90000, disponible: false }
    ]
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Sajonia Tenis Club",
    direccion: "Cnel. Vicente Mongelos",
    ciudad: "Asunción",
    pos: [-25.3120, -57.6680] as [number, number],
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400",
    hours: "08:00 - 22:00",
    activo: true,
    canchas: [
      { id: "c10", deporte: "Tenis", precio: 85000, disponible: true },
      { id: "c11", deporte: "Básquet", precio: 70000, disponible: true }
    ]
  }
];

const DEPORTES = ["Todos", "Fútbol 5", "Fútbol 7", "Pádel", "Tenis", "Básquet"];

export default function SearchPage() {
  const [selectedSport, setSelectedSport] = useState("Todos");
  const [selectedDate, setSelectedDate] = useState(""); // Empty initially to avoid hydration mismatch
  const [busqueda, setBusqueda] = useState("");
  const [complejos, setComplejos] = useState(MOCK_COMPLEJOS);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  // Sync complexes with database API if running
  useEffect(() => {
    const fetchRealComplejos = async () => {
      try {
        const res = await fetch(`${API_URL}/cancha/complejos`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Map real API complexes with coordinates and matching sub-courts
            const mapped = data.map((item: any, idx: number) => {
              const mockSeed = MOCK_COMPLEJOS[idx % MOCK_COMPLEJOS.length];
              return {
                id: item.id,
                name: item.nombre,
                direccion: item.direccion,
                ciudad: item.ciudad || "Asunción",
                pos: item.lat && item.lng ? [item.lat, item.lng] : mockSeed.pos,
                rating: mockSeed.rating,
                img: mockSeed.img,
                hours: `${item.horario_apertura || "07:00"} - ${item.horario_cierre || "23:00"}`,
                canchas: mockSeed.canchas
              };
            });
            setComplejos(mapped);
          }
        }
      } catch (_e) { }
    };
    fetchRealComplejos();
  }, []);

  // Load query parameters and set local client date on mount
  useEffect(() => {
    // Set client local date safely after mount
    setSelectedDate(new Date().toISOString().split('T')[0]);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sportParam = params.get('deporte');
      const queryParam = params.get('q');
      if (sportParam) {
        setSelectedSport(sportParam);
      }
      if (queryParam) {
        setBusqueda(queryParam);
      }
    }
  }, []);

  // Filter and compute pricing/availability dynamically (Google Flights style pricing engine)
  const processedVenues = useMemo(() => {
    return complejos.map(venue => {
      // 1. Filter courts inside complex that match the selected sport
      const matchingCourts = venue.canchas.filter(c => {
        return selectedSport === "Todos" || c.deporte === selectedSport;
      });

      // 2. Determine price and availability
      let available = false;
      let price = 0;

      if (matchingCourts.length > 0) {
        // Find cheapest court among matches
        const availableCourts = matchingCourts.filter(c => c.disponible);
        if (availableCourts.length > 0) {
          available = true;
          // Cheapest price
          price = Math.min(...availableCourts.map(c => c.precio));
        } else {
          // If courts exist but none are available, we take the price of the cheapest court but mark as unavailable
          available = false;
          price = Math.min(...matchingCourts.map(c => c.precio));
        }
      } else {
        // No courts of this sport exist in this complex
        available = false;
        price = 0;
      }

      // Add a slight mock variation based on date to feel extremely alive
      if (selectedDate) {
        const dayNumber = new Date(selectedDate).getDate();
        // Odd days have different availability configs to simulate slots occupancy
        if (dayNumber % 3 === 0 && venue.id.startsWith("1111")) {
          available = false; // Simulate fully booked
        }
      }

      return {
        ...venue,
        price,
        available,
        matchingCourtsCount: matchingCourts.length
      };
    }).filter(venue => {
      // Apply text search
      if (!busqueda) return true;
      const searchLower = busqueda.toLowerCase();
      return (
        venue.name.toLowerCase().includes(searchLower) ||
        venue.direccion.toLowerCase().includes(searchLower) ||
        venue.ciudad.toLowerCase().includes(searchLower)
      );
    });
  }, [complejos, selectedSport, selectedDate, busqueda]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>

      {/* HEADER (Google Flights Styled Filters Bar) */}
      <header style={{
        padding: "1rem 2rem",
        background: "#ffffff",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        zIndex: 10,
        boxShadow: "0 4px 12px rgba(15,23,42,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link href="/" style={{ color: "#475569", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem" }}>
              <ArrowLeft size={18} />
              <span>Volver</span>
            </Link>

            {/* Search query input */}
            <div style={{ position: "relative", width: "320px" }}>
              <Search style={{ position: "absolute", left: "1.1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={16} />
              <input
                type="text"
                placeholder="Complejo, barrio o ciudad..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{
                  width: "100%",
                  background: "#f1f5f9",
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: "100px",
                  padding: "0.7rem 1rem 0.7rem 2.8rem",
                  color: "#0f172a",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Dynamic Sport and Date Picker filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>

            {/* Deporte Select */}
            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: "12px", padding: "6px 12px", border: "1px solid rgba(15,23,42,0.08)" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", marginRight: "8px" }}>Deporte:</span>
              <select
                value={selectedSport}
                onChange={e => setSelectedSport(e.target.value)}
                style={{ background: "none", border: "none", outline: "none", color: "#0f172a", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}
              >
                {DEPORTES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Date Select */}
            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: "12px", padding: "6px 12px", border: "1px solid rgba(15,23,42,0.08)" }}>
              <Calendar size={14} style={{ color: "#16a34a", marginRight: "8px" }} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ background: "none", border: "none", outline: "none", color: "#0f172a", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}
              />
            </div>

          </div>
        </div>
      </header>

      {/* SEARCH INTERFACE BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* SIDEBAR: Complexes matched list */}
        <aside style={{
          width: "420px",
          background: "#ffffff",
          borderRight: "1px solid rgba(15,23,42,0.08)",
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "4px 0 15px rgba(0,0,0,0.01)"
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.5px" }}>Complejos Encontrados</h2>
            <span style={{ fontSize: "12px", background: "#dcfce7", color: "#16a34a", padding: "4px 10px", borderRadius: "100px", fontWeight: 700 }}>
              {processedVenues.length} clubes
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {processedVenues.map(venue => (
              <div key={venue.id}
                onClick={() => setSelectedVenue(venue)}
                style={{
                  background: selectedVenue?.id === venue.id ? "#f8fafc" : "transparent",
                  border: selectedVenue?.id === venue.id ? "2px solid #16a34a" : "1px solid rgba(15,23,42,0.08)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}>
                <div style={{ height: "130px", position: "relative" }}>
                  <img src={venue.img} alt={venue.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    background: "rgba(15,23,42,0.85)",
                    backdropFilter: "blur(4px)",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <Star size={12} fill="currentColor" /> {venue.rating.toFixed(1)}
                  </div>

                  {/* Google Flights price marker overlay on cards */}
                  <div style={{
                    position: "absolute",
                    bottom: "0.75rem",
                    left: "0.75rem",
                    background: venue.available ? "#16a34a" : "#64748b",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "12px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
                  }}>
                    {venue.available ? `${new Intl.NumberFormat('es-PY').format(venue.price)} Gs.` : "No disponible"}
                  </div>
                </div>

                <div style={{ padding: "1.2rem" }}>
                  <h3 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", marginBottom: "0.4rem" }}>{venue.name}</h3>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      📍 {venue.direccion}
                    </span>
                    <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#475569", fontWeight: 700 }}>
                      🕒 {venue.hours}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {processedVenues.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏟️</div>
                <h3>No hay complejos deportivos</h3>
                <p style={{ fontSize: 13, marginTop: 4 }}>Intentá cambiando el deporte o la fecha seleccionada.</p>
              </div>
            )}
          </div>
        </aside>

        {/* GEOGRAPHIC INTERACTIVE MAP VIEW */}
        <div style={{ flex: 1, position: "relative" }}>

          {/* Dynamic map with coordinates and prices */}
          <MapComponent
            venues={processedVenues}
            onSelectVenue={setSelectedVenue}
          />

          {/* SELECTED VENUE POPUP DRAWER (Google Flights bottom card style) */}
          {selectedVenue && (
            <div style={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 40px)",
              maxWidth: "520px",
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.1)",
              borderRadius: "24px",
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(15,23,42,0.15)",
              zIndex: 1000,
              display: "flex",
              gap: "1.5rem",
              animation: "modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
              <div style={{ width: "130px", height: "130px", borderRadius: "16px", overflow: "hidden", flexShrink: 0 }}>
                <img src={selectedVenue.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>{selectedVenue.name}</h3>
                  <button
                    onClick={() => setSelectedVenue(null)}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "6px 0 12px", display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} /> {selectedVenue.direccion}
                </p>

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                    <Calendar size={12} style={{ color: "#16a34a" }} />
                    {selectedVenue.available ? "Disponible hoy" : "Sin turnos hoy"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                    <Clock size={12} style={{ color: "#ea580c" }} /> {selectedVenue.hours}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
                  <Link
                    href={`/reservar`}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: selectedVenue.available ? "#16a34a" : "#64748b",
                      color: "white",
                      borderRadius: "12px",
                      fontWeight: 700,
                      fontSize: "14px",
                      textAlign: "center",
                      textDecoration: "none",
                      boxShadow: selectedVenue.available ? "0 4px 10px rgba(22,163,74,0.2)" : "none"
                    }}
                  >
                    {selectedVenue.available ? "Reservar Turno" : "Ver Calendario"}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
