import { MatrixBackground } from '../components/matrix-background'

export default function MatrixBgTestPage() {
  return (
    <div className="min-h-screen bg-black">
      <MatrixBackground />

      <div className="fixed bottom-4 left-4 z-50 text-white/50 text-sm">
        Matrix Background Test
      </div>
    </div>
  )
}
