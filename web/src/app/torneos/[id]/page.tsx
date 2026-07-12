"use client";

import { useState, useEffect } from "react";
import { 
  Trophy
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SidebarTorneo from '@/components/torneo-admin/SidebarTorneo';
import PublicTournamentView from '@/components/torneo-admin/PublicTournamentView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id || id === "demo" || id === "ficticio") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tRes = await fetch(`${API_URL}/cancha/torneos/${id}`);
      if (tRes.ok) {
        const found = await tRes.json();
        setTournament(found);
      } else {
        throw new Error("Tournament not found");
      }
    } catch (e) {
      console.error("Error loading tournament details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Trophy className="w-16 h-16 text-blue-500 animate-bounce mb-4" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Torneo no encontrado</h2>
        <Link href="/buscar" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded transition-colors mt-4">
          Volver a Buscar
        </Link>
      </div>
    );
  }

  const colorSidebar = tournament?.configuracion?.color_sidebar || '#0c112b';

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Left Sidebar via Unified Component */}
      <SidebarTorneo 
        torneo={tournament} 
        activeTab="inicio" 
        setActiveTab={() => {}} 
        isOrganizer={false}
        isPublicView={true}
      />

      <PublicTournamentView tournament={tournament} />
    </div>
  );
}
