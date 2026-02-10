import { BalatroBackground } from '../components/balatro-background'
import { BalatroCardRain } from '../components/balatro-card-rain'

export default function BalatroBgTestPage() {
  return (
    <div className="min-h-screen bg-black">
      <BalatroBackground />
      <BalatroCardRain />
      <div className="fixed bottom-4 left-4 z-50 text-white/50 text-sm">
        Balatro Background Test
      </div>
    </div>
  )
}
