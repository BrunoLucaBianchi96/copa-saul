'use client'

import { useState, useEffect, useCallback } from 'react'

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // Resolve anyway to not block
    img.src = src
  })
}

interface BrightnessStats {
  slope: number
  intercept: number
}

function analyzeImageBrightness(src: string): Promise<BrightnessStats> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ slope: 1, intercept: 0 })
        return
      }

      // Sample at smaller size for performance
      const sampleSize = 100
      canvas.width = sampleSize
      canvas.height = sampleSize
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
      const data = imageData.data

      const brightnesses: number[] = []
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels
        if (data[i + 3] < 128) continue
        // Calculate perceived brightness (luminance)
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b
        brightnesses.push(brightness)
      }

      if (brightnesses.length === 0) {
        resolve({ slope: 1, intercept: 0 })
        return
      }

      // Sort and get percentiles to avoid outliers
      // Using 20th/80th percentiles for aggressive normalization
      brightnesses.sort((a, b) => a - b)
      const pLow = brightnesses[Math.floor(brightnesses.length * 0.20)]
      const pHigh = brightnesses[Math.floor(brightnesses.length * 0.80)]

      // Calculate normalization: output = slope * input + intercept
      // Maps [pLow, pHigh] to [0, 1]
      const range = pHigh - pLow
      if (range < 0.01) {
        // Image has very little contrast, don't normalize
        resolve({ slope: 1, intercept: 0 })
        return
      }

      const slope = 1 / range
      const intercept = -pLow * slope

      resolve({ slope, intercept })
    }
    img.onerror = () => resolve({ slope: 1, intercept: 0 })
    img.src = src
  })
}

interface GTA4LoadingBackgroundProps {
  cartoonFilter?: boolean
}

const GTA4_BACKGROUNDS = [
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

export function GTA4LoadingBackground({ cartoonFilter = false }: GTA4LoadingBackgroundProps) {
  const [images, setImages] = useState<string[]>([])
  const [brightnessStats, setBrightnessStats] = useState<BrightnessStats[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)
  const [randomOffset, setRandomOffset] = useState({ x: 0, y: 0 })
  const [backgroundsPreloaded, setBackgroundsPreloaded] = useState(false)

  // Preload background images on mount
  useEffect(() => {
    Promise.all(GTA4_BACKGROUNDS.map(preloadImage))
      .then(() => setBackgroundsPreloaded(true))
  }, [])

  // Fetch player avatars on mount
  useEffect(() => {
    async function fetchAvatars() {
      try {
        const res = await fetch('/api/players/avatars')
        if (res.ok) {
          const data = await res.json()
          const avatars = data.avatars || []
          // Preload all avatar images (and analyze brightness if filter enabled)
          if (cartoonFilter) {
            const [, stats] = await Promise.all([
              Promise.all(avatars.map(preloadImage)),
              Promise.all(avatars.map(analyzeImageBrightness))
            ])
            setBrightnessStats(stats)
          } else {
            await Promise.all(avatars.map(preloadImage))
          }
          setImages(avatars)
        }
      } catch {
        // Silently fail - component will just not render
      }
    }
    fetchAvatars()
  }, [cartoonFilter])

  const side = currentIndex % 2 === 0 ? 'left' : 'right'
  const currentBackground = GTA4_BACKGROUNDS[currentIndex % GTA4_BACKGROUNDS.length]
  const currentStats = brightnessStats[currentIndex] || { slope: 1, intercept: 0 }

  const generateRandomOffset = useCallback(() => {
    const angle = Math.random() * 2 * Math.PI
    const x = Math.cos(angle) * 50
    const y = Math.sin(angle) * 50
    return { x, y }
  }, [])

  useEffect(() => {
    setRandomOffset(generateRandomOffset())
  }, [animationKey, generateRandomOffset])

  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      // Start fade to black
      setIsFading(true)

      // After fade completes (500ms), change image
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length)
        setAnimationKey((prev) => prev + 1)
      }, 500)

      // After image change, fade back in (at 600ms)
      setTimeout(() => {
        setIsFading(false)
      }, 600)
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  // Show black screen until backgrounds are preloaded
  if (!backgroundsPreloaded) {
    return <div className="fixed inset-0 bg-black" />
  }

  if (images.length === 0) {
    // Show just the background while loading avatars or if no avatars
    return (
      <div className="fixed inset-0 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <img
            src={GTA4_BACKGROUNDS[0]}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* SVG filter for GTA4 cartoon effect */}
      {cartoonFilter && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="gta4-cartoon">
              {/* Normalize brightness based on image analysis */}
              <feComponentTransfer>
                <feFuncR type="linear" slope={currentStats.slope} intercept={currentStats.intercept} />
                <feFuncG type="linear" slope={currentStats.slope} intercept={currentStats.intercept} />
                <feFuncB type="linear" slope={currentStats.slope} intercept={currentStats.intercept} />
              </feComponentTransfer>
              {/* Posterize: more bands in dark range to preserve shadow detail */}
              <feComponentTransfer>
                <feFuncR type="discrete" tableValues="0 .06 .14 .25 .42 .65 1" />
                <feFuncG type="discrete" tableValues="0 .06 .14 .25 .42 .65 1" />
                <feFuncB type="discrete" tableValues="0 .06 .14 .25 .42 .65 1" />
              </feComponentTransfer>
              {/* Boost saturation */}
              <feColorMatrix type="saturate" values="1.1" />
            </filter>
          </defs>
        </svg>
      )}

      {/* Background image */}
      <div
        key={`bg-${animationKey}`}
        className="absolute inset-0 gta4-bg-zoom"
      >
        <img
          src={currentBackground}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Player image with animation */}
      <div
        key={animationKey}
        className={`absolute inset-0 flex items-start pt-[10vh] gta4-pan-zoom ${
          side === 'left' ? 'justify-start pl-[5%]' : 'justify-end pr-[5%]'
        }`}
        style={{
          '--pan-x': `${randomOffset.x}px`,
          '--pan-y': `${randomOffset.y}px`,
        } as React.CSSProperties}
      >
        <img
          src={images[currentIndex]}
          alt="Player"
          className="h-[100vh] w-auto object-contain"
          style={cartoonFilter ? { filter: 'url(#gta4-cartoon)' } : undefined}
        />
      </div>

      {/* Black fade overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-500 pointer-events-none ${
          isFading ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <style jsx>{`
        @keyframes gta4PanZoom {
          0% {
            transform: scale(1.1) translate(0, 0);
          }
          100% {
            transform: scale(1) translate(var(--pan-x), var(--pan-y));
          }
        }

        @keyframes gta4BgZoom {
          0% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .gta4-pan-zoom {
          animation: gta4PanZoom 5s ease-out forwards;
        }

        .gta4-bg-zoom {
          animation: gta4BgZoom 5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
