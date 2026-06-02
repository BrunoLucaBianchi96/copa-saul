import { notFound } from 'next/navigation'
import { getDashboardState } from '@/lib/dashboard'
import { DashboardView } from './dashboard-view'

export const dynamic = 'force-dynamic'

// Public spectator dashboard — intentionally no session check, so it can be
// left open on a screen at the event without logging in.
export default async function DashboardPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  const initial = await getDashboardState(id)

  if (!initial) {
    notFound()
  }

  return <DashboardView tournamentId={id} initial={initial} />
}
