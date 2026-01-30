import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  rounds: integer('rounds').notNull().default(4),
  currentRound: integer('current_round').notNull().default(0),
  status: text('status', { enum: ['pending', 'active', 'completed'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const tournamentPlayers = sqliteTable('tournament_players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  points: integer('points').notNull().default(0),
  buchholz: integer('buchholz').notNull().default(0), // Tiebreaker
})

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id),
  round: integer('round').notNull(),
  player1Id: integer('player1_id').notNull().references(() => players.id),
  player2Id: integer('player2_id').references(() => players.id), // null for bye
  winnerId: integer('winner_id').references(() => players.id), // null for draw or pending
  result: text('result', { enum: ['pending', 'player1', 'player2', 'draw', 'bye'] }).notNull().default('pending'),
  // Pick-ban phase data
  pickBanHistory: text('pick_ban_history'), // JSON array of actions
  selectedGame: text('selected_game'), // The game chosen after pick-ban
  pickBanComplete: integer('pick_ban_complete', { mode: 'boolean' }).default(false),
  backgroundMusicId: text('background_music_id'), // Theme ID for the match
})

export type Player = typeof players.$inferSelect
export type Tournament = typeof tournaments.$inferSelect
export type TournamentPlayer = typeof tournamentPlayers.$inferSelect
export type Match = typeof matches.$inferSelect
