import { db } from '@/db'
import { players } from '@/db/schema'
import { isNull } from 'drizzle-orm'
import { GTA4LoadingBackground } from '../components/gta4-loading-background'

const BACKGROUNDS = [
  '/bgs/gta-4-bgs/1_1.png',
  '/bgs/gta-4-bgs/2_1.png',
  '/bgs/gta-4-bgs/3_1.png',
  '/bgs/gta-4-bgs/4_1.png',
  '/bgs/gta-4-bgs/5_1.png',
  '/bgs/gta-4-bgs/6_1.png',
  '/bgs/gta-4-bgs/7_1.png',
  '/bgs/gta-4-bgs/8_1.png',
  '/bgs/gta-4-bgs/9_1.png',
  '/bgs/gta-4-bgs/10_1.png',
  '/bgs/gta-4-bgs/11_1.png',
  '/bgs/gta-4-bgs/12_1.png',
  '/bgs/gta-4-bgs/13_1.png',
]

export default async function GTA4LoadingTestPage() {
  // Get all active players with avatars
  const activePlayers = await db
    .select()
    .from(players)
    .where(isNull(players.deletedAt))

  const playerImages = activePlayers
    .filter((p) => p.avatarUrl)
    .map((p) => p.avatarUrl!)

  return (
    <div className="min-h-screen bg-black">
      <GTA4LoadingBackground images={playerImages} backgrounds={BACKGROUNDS} />

      {/* Optional: Info overlay for testing */}
      <div className="fixed bottom-4 left-4 z-50 text-white/50 text-sm">
        GTA 4 Loading Screen Test - {playerImages.length} players, cycling every 5 seconds
      </div>
    </div>
  )
}
