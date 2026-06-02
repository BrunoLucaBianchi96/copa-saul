import { getDashboardState, type DashboardState } from '@/lib/dashboard'

export const maxDuration = 60

// Public spectator stream — intentionally NO session check, unlike the rest of
// the app. Anyone with the link can watch a tournament update in real time.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tournamentId = parseInt(params.id)

  const initial = await getDashboardState(tournamentId)
  if (!initial) {
    return new Response(JSON.stringify({ error: 'Tournament not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let eventId = 0
  let lastStateHash = ''

  function hashState(state: DashboardState): string {
    return JSON.stringify(state)
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
      lastStateHash = hashState(initial)
      eventId++
      send(`id: ${eventId}\nevent: state\ndata: ${JSON.stringify(initial)}\n\n`)

      // Poll DB every 2 seconds for changes
      pollInterval = setInterval(async () => {
        try {
          const state = await getDashboardState(tournamentId)
          if (!state) return

          const hash = hashState(state)
          if (hash !== lastStateHash) {
            lastStateHash = hash
            eventId++
            send(`id: ${eventId}\nevent: state\ndata: ${JSON.stringify(state)}\n\n`)
          }
        } catch {
          // DB error — skip this poll cycle
        }
      }, 2000)

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
