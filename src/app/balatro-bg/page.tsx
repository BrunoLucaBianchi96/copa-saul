import { BalatroBackground } from '../components/balatro-background'

export default function BalatroBgTestPage() {
  return (
    <div className="min-h-screen bg-black">
      <BalatroBackground />
      <div className="fixed bottom-4 left-4 z-50 text-white/50 text-sm">
        Balatro Background Test
      </div>
    </div>
  )
}
