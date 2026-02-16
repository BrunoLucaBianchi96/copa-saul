import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/session'

export const maxDuration = 60

export async function GET(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const role = await getSession()
  if (!role) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tournamentId = parseInt(params.id)
  const matchId = parseInt(params.matchId)

  // Verify match exists
  const match = await db.select().from(matches).where(eq(matches.id, matchId))
  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return new Response(JSON.stringify({ error: 'Match not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let eventId = 0
  let lastStateHash = ''

  function buildStateHash(m: typeof match[0]): string {
    return `${m.pickBanHistory ?? ''}|${m.selectedGame ?? ''}|${m.result}|${m.pointsAwarded ?? ''}`
  }

  function buildPayload(m: typeof match[0]) {
    return {
      pickBanHistory: m.pickBanHistory ? JSON.parse(m.pickBanHistory) : [],
      selectedGame: m.selectedGame,
      result: m.result,
      pointsAwarded: m.pointsAwarded,
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const abortSignal = request.signal
      let pollInterval: ReturnType<typeof setInterval>
      let keepaliveInterval: ReturnType<typeof setInterval>
      let closeTimeout: ReturnType<typeof setTimeout>

      function send(text: string) {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          // Controller closed
        }
      }

      function cleanup() {
        clearInterval(pollInterval)
        clearInterval(keepaliveInterval)
        clearTimeout(closeTimeout)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }

      // Send retry directive so EventSource reconnects quickly
      send('retry: 1000\n\n')

      // Send initial state immediately
      const initialHash = buildStateHash(match[0])
      lastStateHash = initialHash
      eventId++
      const initialPayload = JSON.stringify(buildPayload(match[0]))
      send(`id: ${eventId}\nevent: state\ndata: ${initialPayload}\n\n`)

      // Poll DB every 1 second for changes
      pollInterval = setInterval(async () => {
        try {
          const rows = await db.select().from(matches).where(eq(matches.id, matchId))
          if (!rows[0]) return

          const hash = buildStateHash(rows[0])
          if (hash !== lastStateHash) {
            lastStateHash = hash
            eventId++
            const payload = JSON.stringify(buildPayload(rows[0]))
            send(`id: ${eventId}\nevent: state\ndata: ${payload}\n\n`)
          }
        } catch {
          // DB error — skip this poll cycle
        }
      }, 1000)

      // Keepalive comment every 15s to prevent proxy timeouts
      keepaliveInterval = setInterval(() => {
        send(': keepalive\n\n')
      }, 15000)

      // Close before Vercel function timeout (60s max, close at 55s)
      closeTimeout = setTimeout(() => {
        send('retry: 1000\n\n')
        cleanup()
      }, 55000)

      // Clean up on client disconnect
      abortSignal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
