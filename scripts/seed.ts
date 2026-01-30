import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { players } from '../src/db/schema'

const PARTICIPANTS = [
  { name: 'Carlos García', avatar: '/avatars/1600px-SKT_Faker_Worlds_2013_.jpg' },
  { name: 'María López', avatar: null },
  { name: 'Juan Rodríguez', avatar: '/avatars/S1mple_at_DH_Tours_2015.jpg' },
  { name: 'Ana Martínez', avatar: null },
  { name: 'Pedro Sánchez', avatar: '/avatars/OG_Aleksib_2019.png' },
  { name: 'Laura Fernández', avatar: null },
  { name: 'Miguel Torres', avatar: null },
  { name: 'Carmen Ruiz', avatar: '/avatars/856px-Uzi_at_Worlds_2025_Finals_MVP_Ceremony.jpg' },
  { name: 'José Hernández', avatar: null },
  { name: 'Isabel Díaz', avatar: null },
  { name: 'Francisco Moreno', avatar: null },
  { name: 'Elena Jiménez', avatar: null },
  { name: 'Diego Navarro', avatar: null },
  { name: 'Sofía Romero', avatar: null },
]

async function seed() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

  const db = drizzle(client)

  // Drop and recreate tables to ensure schema is up to date
  await client.execute(`DROP TABLE IF EXISTS tournament_players`)
  await client.execute(`DROP TABLE IF EXISTS matches`)
  await client.execute(`DROP TABLE IF EXISTS tournaments`)
  await client.execute(`DROP TABLE IF EXISTS players`)

  // Create tables
  await client.execute(`
    CREATE TABLE players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at INTEGER
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rounds INTEGER NOT NULL DEFAULT 4,
      current_round INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
      player_id INTEGER NOT NULL REFERENCES players(id),
      points INTEGER NOT NULL DEFAULT 0,
      buchholz INTEGER NOT NULL DEFAULT 0
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
      round INTEGER NOT NULL,
      player1_id INTEGER NOT NULL REFERENCES players(id),
      player2_id INTEGER REFERENCES players(id),
      winner_id INTEGER REFERENCES players(id),
      result TEXT NOT NULL DEFAULT 'pending',
      pick_ban_history TEXT,
      selected_game TEXT,
      pick_ban_complete INTEGER DEFAULT 0
    )
  `)

  // Insert participants
  console.log('Inserting participants...')
  for (const participant of PARTICIPANTS) {
    console.log(`  Inserting ${participant.name}...`)
    await db.insert(players).values({
      name: participant.name,
      avatarUrl: participant.avatar,
    })
  }

  // Verify
  const count = await client.execute('SELECT COUNT(*) as count FROM players')
  console.log(`Seeded ${PARTICIPANTS.length} players, DB count: ${JSON.stringify(count.rows[0])}`)
}

seed().catch(console.error)
