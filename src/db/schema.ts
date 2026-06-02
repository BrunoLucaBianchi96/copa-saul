import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  editToken: text('edit_token'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  rounds: integer('rounds').notNull().default(4),
  currentRound: integer('current_round').notNull().default(0),
  status: text('status', { enum: ['pending', 'active', 'overtime', 'completed'] }).notNull().default('pending'),
  overtimeRound: integer('overtime_round').default(0),
  overtimePlayers: text('overtime_players'), // JSON array of player IDs
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const tournamentPlayers = sqliteTable('tournament_players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  points: integer('points').notNull().default(0),
  buchholz: integer('buchholz').notNull().default(0), // Tiebreaker
  retired: integer('retired', { mode: 'boolean' }).notNull().default(false),
  topFourRounds: integer('top_four_rounds').notNull().default(0), // # of completed rounds finished in top 4
  bounty: integer('bounty').notNull().default(0), // accumulated bounty points
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
  player1PreferredGame: text('player1_preferred_game'), // game id player 1 wants, or null
  player2PreferredGame: text('player2_preferred_game'), // game id player 2 wants, or null
  pickBanComplete: integer('pick_ban_complete', { mode: 'boolean' }).default(false),
  backgroundMusicId: text('background_music_id'), // Theme ID for the match
  pointsAwarded: integer('points_awarded'), // Points awarded to winner, used by reset
})

export const playerBets = sqliteTable('player_bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').references(() => tournaments.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  gameId: text('game_id').notNull(),
  bet: integer('bet').notNull().default(20),
})

export type Player = typeof players.$inferSelect
export type Tournament = typeof tournaments.$inferSelect
export type TournamentPlayer = typeof tournamentPlayers.$inferSelect
export type Match = typeof matches.$inferSelect
export type PlayerBet = typeof playerBets.$inferSelect
