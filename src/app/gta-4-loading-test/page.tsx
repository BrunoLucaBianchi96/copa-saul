import { GTA4LoadingBackground } from '../components/gta4-loading-background'

export default function GTA4LoadingTestPage() {
  return (
    <div className="min-h-screen bg-black">
      <GTA4LoadingBackground />

      {/* Optional: Info overlay for testing */}
      <div className="fixed bottom-4 left-4 z-50 text-white/50 text-sm">
        GTA 4 Loading Screen Test - cycling every 5 seconds
      </div>
    </div>
  )
}
