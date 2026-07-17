import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
} from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------

// Organizer public page profile (one per organizer/user).
export const organizerProfile = pgTable('organizer_profile', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  orgName: text('orgName').notNull(),
  slug: text('slug').notNull().unique(),
  bio: text('bio'),
  location: text('location'),
  isPublic: boolean('isPublic').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Championships / tournaments.
export const championships = pgTable('championships', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sport: text('sport').notNull().default('Fútbol'),
  format: text('format').notNull().default('Liga'), // Liga, Eliminación, Grupos
  kind: text('kind').notNull().default('Único'), // Único, Temporada
  status: text('status').notNull().default('Abierto'), // Abierto, En curso, Finalizado
  description: text('description'),
  isPublic: boolean('isPublic').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Teams registered in a championship.
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  championshipId: integer('championshipId').notNull(),
  name: text('name').notNull(),
  coach: text('coach'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Players registered to a team.
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  championshipId: integer('championshipId').notNull(),
  teamId: integer('teamId').notNull(),
  name: text('name').notNull(),
  number: integer('number'),
  position: text('position'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Matches / fixtures.
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  championshipId: integer('championshipId').notNull(),
  homeTeamId: integer('homeTeamId').notNull(),
  awayTeamId: integer('awayTeamId').notNull(),
  homeScore: integer('homeScore'),
  awayScore: integer('awayScore'),
  status: text('status').notNull().default('Programado'), // Programado, En vivo, Finalizado
  round: text('round'),
  venue: text('venue'),
  scheduledAt: timestamp('scheduledAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
