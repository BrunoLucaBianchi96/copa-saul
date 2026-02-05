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

export function GTA4LoadingBackground() {
  const [images, setImages] = useState<string[]>([])
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
          // Preload all avatar images before setting state
          await Promise.all(avatars.map(preloadImage))
          setImages(avatars)
        }
      } catch {
        // Silently fail - component will just not render
      }
    }
    fetchAvatars()
  }, [])

  const side = currentIndex % 2 === 0 ? 'left' : 'right'
  const currentBackground = GTA4_BACKGROUNDS[currentIndex % GTA4_BACKGROUNDS.length]

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
