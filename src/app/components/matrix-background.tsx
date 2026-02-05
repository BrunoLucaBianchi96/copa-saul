'use client'

import { useEffect, useRef } from 'react'

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const characters =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]什仁仂仃仄仅仆仇仈仉今介仌仍从仏' +
        '仐仑仒仓仔仕他仗付仙仚仛仜仝仞仟' +
        '仠仡仢代令以仦仧仨仩仪仫们仭仮仯' +
        '仰仱仲仳仴仵件价仸仹仺任仼份仾仿亅了亇予争亊事二亍于亏'
    const charArray = characters.split('')
    const fontSize = 16
    let columns = Math.floor(canvas.width / fontSize)
    let drops: number[] = new Array(columns).fill(1)

    const handleResize = () => {
      resize()
      columns = Math.floor(canvas.width / fontSize)
      const newDrops = new Array(columns).fill(1)
      for (let i = 0; i < Math.min(drops.length, newDrops.length); i++) {
        newDrops[i] = drops[i]
      }
      drops = newDrops
    }
    window.removeEventListener('resize', resize)
    window.addEventListener('resize', handleResize)

    const interval = setInterval(() => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#00ff33'
      ctx.font = `${fontSize}px 'Courier New', Courier, monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }
    }, 35)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ filter: 'brightness(1.5) drop-shadow(0 0 6px #00ff33) drop-shadow(0 0 20px #00aa22)' }}
      />
    </div>
  )
}
