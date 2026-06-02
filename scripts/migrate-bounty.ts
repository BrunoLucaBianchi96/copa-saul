import { createClient } from '@libsql/client'

// One-off migration: add bounty-system columns to tournament_players without data loss.
// SQLite supports ADD COLUMN with NOT NULL DEFAULT, which backfills existing rows.
async function migrate() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

  const cols = await client.execute('PRAGMA table_info(tournament_players)')
  const existing = new Set(cols.rows.map((r) => String(r.name)))

  if (!existing.has('top_four_rounds')) {
    await client.execute(
      'ALTER TABLE tournament_players ADD COLUMN top_four_rounds INTEGER NOT NULL DEFAULT 0'
    )
    console.log('Added column top_four_rounds')
  } else {
    console.log('Column top_four_rounds already exists')
  }

  if (!existing.has('bounty')) {
    await client.execute(
      'ALTER TABLE tournament_players ADD COLUMN bounty INTEGER NOT NULL DEFAULT 0'
    )
    console.log('Added column bounty')
  } else {
    console.log('Column bounty already exists')
  }

  console.log('Done.')
}

migrate().catch((e) => {
  console.error(e)
  process.exit(1)
})
