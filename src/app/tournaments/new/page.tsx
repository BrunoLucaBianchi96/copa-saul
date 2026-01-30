'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTournament() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [rounds, setRounds] = useState(4)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, rounds }),
    })

    if (res.ok) {
      const { id } = await res.json()
      router.push(`/tournaments/${id}`)
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to create tournament')
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
