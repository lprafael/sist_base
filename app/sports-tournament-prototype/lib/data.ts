export type TeamStanding = {
  id: string
  name: string
  short: string
  color: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export type Match = {
  id: string
  home: string
  homeShort: string
  homeColor: string
  away: string
  awayShort: string
  awayColor: string
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  venue: string
  status: "live" | "upcoming" | "finished"
  minute?: number
  round: string
}

export type Tournament = {
  id: string
  name: string
  sport: string
  format: string
  teams: number
  status: "En curso" | "Inscripción" | "Finalizado"
  progress: number
  startDate: string
  accent: string
}

export const tournaments: Tournament[] = [
  {
    id: "t1",
    name: "Liga Apertura 2026",
    sport: "Fútbol 11",
    format: "Todos contra todos",
    teams: 8,
    status: "En curso",
    progress: 62,
    startDate: "12 Mar",
    accent: "var(--chart-1)",
  },
  {
    id: "t2",
    name: "Copa Relámpago",
    sport: "Fútbol 7",
    format: "Eliminación directa",
    teams: 16,
    status: "En curso",
    progress: 40,
    startDate: "02 Abr",
    accent: "var(--chart-2)",
  },
  {
    id: "t3",
    name: "Torneo de Verano",
    sport: "Básquetbol",
    format: "Grupos + Playoffs",
    teams: 12,
    status: "Inscripción",
    progress: 0,
    startDate: "20 May",
    accent: "var(--chart-3)",
  },
  {
    id: "t4",
    name: "Liga Corporativa",
    sport: "Vóleibol",
    format: "Todos contra todos",
    teams: 6,
    status: "Finalizado",
    progress: 100,
    startDate: "10 Ene",
    accent: "var(--chart-5)",
  },
]

export const standings: TeamStanding[] = [
  { id: "e1", name: "Real Halcones", short: "RHA", color: "var(--chart-1)", played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 24, goalsAgainst: 8, points: 25 },
  { id: "e2", name: "Deportivo Águilas", short: "DAG", color: "var(--chart-4)", played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 20, goalsAgainst: 9, points: 23 },
  { id: "e3", name: "Atlético Central", short: "ATC", color: "var(--chart-3)", played: 10, won: 6, drawn: 1, lost: 3, goalsFor: 18, goalsAgainst: 12, points: 19 },
  { id: "e4", name: "Los Tigres FC", short: "TIG", color: "var(--chart-2)", played: 10, won: 5, drawn: 2, lost: 3, goalsFor: 16, goalsAgainst: 13, points: 17 },
  { id: "e5", name: "Unión Norte", short: "UNO", color: "var(--chart-5)", played: 10, won: 4, drawn: 2, lost: 4, goalsFor: 14, goalsAgainst: 15, points: 14 },
  { id: "e6", name: "Sporting Sur", short: "SSU", color: "var(--chart-1)", played: 10, won: 2, drawn: 3, lost: 5, goalsFor: 11, goalsAgainst: 18, points: 9 },
  { id: "e7", name: "Club Estrella", short: "CES", color: "var(--chart-4)", played: 10, won: 1, drawn: 3, lost: 6, goalsFor: 8, goalsAgainst: 20, points: 6 },
  { id: "e8", name: "Racing Valle", short: "RVA", color: "var(--chart-3)", played: 10, won: 1, drawn: 1, lost: 8, goalsFor: 7, goalsAgainst: 26, points: 4 },
]

export const matches: Match[] = [
  {
    id: "m1",
    home: "Real Halcones", homeShort: "RHA", homeColor: "var(--chart-1)",
    away: "Los Tigres FC", awayShort: "TIG", awayColor: "var(--chart-2)",
    homeScore: 2, awayScore: 1,
    date: "Hoy", time: "18:00", venue: "Cancha Central",
    status: "live", minute: 67, round: "Jornada 11",
  },
  {
    id: "m2",
    home: "Deportivo Águilas", homeShort: "DAG", homeColor: "var(--chart-4)",
    away: "Atlético Central", awayShort: "ATC", awayColor: "var(--chart-3)",
    homeScore: 0, awayScore: 0,
    date: "Hoy", time: "20:00", venue: "Estadio Norte",
    status: "live", minute: 23, round: "Jornada 11",
  },
  {
    id: "m3",
    home: "Unión Norte", homeShort: "UNO", homeColor: "var(--chart-5)",
    away: "Sporting Sur", awayShort: "SSU", awayColor: "var(--chart-1)",
    homeScore: null, awayScore: null,
    date: "Mañana", time: "17:30", venue: "Cancha 2",
    status: "upcoming", round: "Jornada 11",
  },
  {
    id: "m4",
    home: "Club Estrella", homeShort: "CES", homeColor: "var(--chart-4)",
    away: "Racing Valle", awayShort: "RVA", awayColor: "var(--chart-3)",
    homeScore: null, awayScore: null,
    date: "Sáb 18", time: "10:00", venue: "Cancha Central",
    status: "upcoming", round: "Jornada 12",
  },
  {
    id: "m5",
    home: "Atlético Central", homeShort: "ATC", homeColor: "var(--chart-3)",
    away: "Real Halcones", awayShort: "RHA", awayColor: "var(--chart-1)",
    homeScore: 1, awayScore: 3,
    date: "Dom 12", time: "16:00", venue: "Estadio Norte",
    status: "finished", round: "Jornada 10",
  },
  {
    id: "m6",
    home: "Los Tigres FC", homeShort: "TIG", homeColor: "var(--chart-2)",
    away: "Deportivo Águilas", awayShort: "DAG", awayColor: "var(--chart-4)",
    homeScore: 2, awayScore: 2,
    date: "Dom 12", time: "18:00", venue: "Cancha Central",
    status: "finished", round: "Jornada 10",
  },
]

export type Team = {
  id: string
  name: string
  short: string
  color: string
  players: number
  coach: string
  group: string
}

export const teams: Team[] = [
  { id: "e1", name: "Real Halcones", short: "RHA", color: "var(--chart-1)", players: 18, coach: "M. Rodríguez", group: "1º lugar" },
  { id: "e2", name: "Deportivo Águilas", short: "DAG", color: "var(--chart-4)", players: 20, coach: "L. Fernández", group: "2º lugar" },
  { id: "e3", name: "Atlético Central", short: "ATC", color: "var(--chart-3)", players: 17, coach: "J. Gómez", group: "3º lugar" },
  { id: "e4", name: "Los Tigres FC", short: "TIG", color: "var(--chart-2)", players: 19, coach: "P. Díaz", group: "4º lugar" },
  { id: "e5", name: "Unión Norte", short: "UNO", color: "var(--chart-5)", players: 16, coach: "C. Ruiz", group: "5º lugar" },
  { id: "e6", name: "Sporting Sur", short: "SSU", color: "var(--chart-1)", players: 18, coach: "A. Morales", group: "6º lugar" },
]
