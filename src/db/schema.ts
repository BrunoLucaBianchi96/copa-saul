import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

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

// Frozen bet snapshot for a started tournament. Written at tournament start /
// late-join from the player's rosterBets, and read by scoring during the
// tournament so a running tournament is immune to later edits of the shared
// per-roster bets. tournamentId is always set on rows we write now.
export const playerBets = sqliteTable('player_bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').references(() => tournaments.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  gameId: text('game_id').notNull(),
  bet: integer('bet').notNull().default(20),
})

// Editable, reusable bets keyed by a "game collection" rather than a tournament.
// rosterKey is the tournament's gameIds sorted and joined with ',' — so any two
// tournaments with an identical roster share one bet set and the player only
// re-bets when the roster actually changes.
export const rosterBets = sqliteTable('roster_bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull().references(() => players.id),
  rosterKey: text('roster_key').notNull(),
  gameId: text('game_id').notNull(),
  bet: integer('bet').notNull().default(40),
})

// Games are keyed by a human-readable slug (TEXT primary key). The slug matches
// the historical ids stored in matches.selectedGame / playerBets.gameId, so old
// references keep resolving with zero backfill. Removal is soft (deletedAt) so a
// deleted game's row survives for historical matches.
export const games = sqliteTable('games', {
  id: text('id').primaryKey(), // slug
  name: text('name').notNull(),
  descriptionEn: text('description_en'),
  descriptionEs: text('description_es'),
  howToPlayEn: text('how_to_play_en'),
  howToPlayEs: text('how_to_play_es'),
  imageUrl: text('image_url'),
  imageFit: text('image_fit', { enum: ['cover', 'contain'] }),
  videoUrl: text('video_url'),
  videoStart: integer('video_start'),
  controls: text('controls'), // JSON array of ControlEntry
  launchable: integer('launchable', { mode: 'boolean' }).notNull().default(false),
  steamAppId: integer('steam_app_id'),
  defaultLaunchUrl: text('default_launch_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Pick-ban background "themes" (music + animated/static background). Like games,
// keyed by a human-readable slug (TEXT primary key) that matches the historical
// ids stored in matches.backgroundMusicId, so old matches keep resolving. The
// three custom-renderer themes (balatro/matrix/gta-4) are NOT stored here — they
// live in CUSTOM_THEMES in src/lib/themes.ts and are merged in at runtime.
// Removal is soft (deletedAt) so a deleted theme's row survives for old matches.
export const themes = sqliteTable('themes', {
  id: text('id').primaryKey(), // slug
  name: text('name').notNull(),
  bpm: integer('bpm').notNull(),
  division: integer('division').notNull().default(1),
  audioUrl: text('audio_url'), // Vercel Blob URL
  audioOffset: integer('audio_offset'), // ms
  normalizeVolume: real('normalize_volume'), // default 1
  backgroundImage: text('background_image'), // Vercel Blob URL
  backgroundSize: text('background_size', { enum: ['cover', 'contain', 'repeat'] }),
  soundbites: text('soundbites'), // JSON: { onBan?, onPick?, onGameSelected?, onWinnerChosen? }
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Which games are in play for a given tournament. A new tournament defaults to
// all active games; the set is fixed at creation so historical matches keep the
// same roster even if a game is later soft-deleted.
export const tournamentGames = sqliteTable('tournament_games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id),
  gameId: text('game_id').notNull().references(() => games.id),
})

export type Player = typeof players.$inferSelect
export type Tournament = typeof tournaments.$inferSelect
export type TournamentPlayer = typeof tournamentPlayers.$inferSelect
export type Match = typeof matches.$inferSelect
export type PlayerBet = typeof playerBets.$inferSelect
export type RosterBet = typeof rosterBets.$inferSelect
export type GameRow = typeof games.$inferSelect
export type TournamentGame = typeof tournamentGames.$inferSelect
export type ThemeRow = typeof themes.$inferSelect
