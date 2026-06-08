'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Game } from '@/lib/games'

export default function NewTournament() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [rounds, setRounds] = useState(4)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  // Game ids included in this tournament; defaults to all active games.
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        if (data.role !== 'host') {
          router.push('/')
        } else {
          setChecking(false)
        }
      } else {
        router.push('/')
      }
    }
    checkAuth()
  }, [router])

  // Load the active game roster and pre-select all of them.
  useEffect(() => {
    async function loadGames() {
      const res = await fetch('/api/games')
      if (res.ok) {
        const data = await res.json()
        const list: Game[] = data.games ?? []
        setGames(list)
        setSelectedGameIds(new Set(list.map((g) => g.id)))
      }
    }
    loadGames()
  }, [])

  function toggleGame(id: string) {
    setSelectedGameIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedGameIds.size === 0) {
      toast.error('Select at least one game')
      return
    }
    setLoading(true)

    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rounds, gameIds: Array.from(selectedGameIds) }),
    })

    if (res.ok) {
      const { id } = await res.json()
      router.push(`/tournaments/${id}`)
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to create tournament')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <p className="text-darcula-text-muted text-center">Loading...</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-3xl font-bold mb-6 text-darcula-text-bright">New Tournament</h1>

      <form onSubmit={handleSubmit} className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-darcula-text mb-1">
            Tournament Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-darcula-elevated border border-darcula-border rounded px-3 py-2 focus:ring-2 focus:ring-darcula-blue focus:border-darcula-blue text-darcula-text placeholder-darcula-text-muted"
            placeholder="Copa Saul 2024"
          />
        </div>

        <div>
          <label htmlFor="rounds" className="block text-sm font-medium text-darcula-text mb-1">
            Number of Rounds
          </label>
          <input
            id="rounds"
            type="number"
            min={1}
            max={10}
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value))}
            className="w-full bg-darcula-elevated border border-darcula-border rounded px-3 py-2 focus:ring-2 focus:ring-darcula-blue focus:border-darcula-blue text-darcula-text"
          />
          <p className="text-sm text-darcula-text-muted mt-1">
            Recommended: 4 rounds for 12 players
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-darcula-text mb-1">
            Games ({selectedGameIds.size}/{games.length})
          </label>
          <p className="text-sm text-darcula-text-muted mb-2">
            Which games are in play for this tournament.
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {games.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-3 p-2 rounded bg-darcula-elevated cursor-pointer hover:bg-darcula-border transition"
              >
                <input
                  type="checkbox"
                  checked={selectedGameIds.has(g.id)}
                  onChange={() => toggleGame(g.id)}
                  className="w-4 h-4 accent-darcula-blue"
                />
                {g.imageUrl && (
                  <img
                    src={g.imageUrl}
                    alt={g.name}
                    className={`w-8 h-8 rounded ${g.imageFit === 'contain' ? 'object-contain' : 'object-cover'} flex-shrink-0`}
                  />
                )}
                <span className="text-darcula-text text-sm">{g.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-darcula-blue text-darcula-bg py-2 rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 font-medium"
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </form>
    </main>
  )
}
