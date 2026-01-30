import { createClient } from '@libsql/client'

async function check() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)

  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })

  const result = await client.execute('SELECT COUNT(*) as count FROM players')
  console.log('Player count:', result.rows[0])

  const players = await client.execute('SELECT id, name, avatar_url FROM players LIMIT 5')
  console.log('Sample players:', players.rows)
}

check().catch(console.error)
