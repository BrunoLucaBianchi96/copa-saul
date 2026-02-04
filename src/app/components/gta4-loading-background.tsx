'use client'

import { useState, useEffect, useCallback } from 'react'

interface GTA4LoadingBackgroundProps {
  images: string[]
  backgrounds: string[]
}

export function GTA4LoadingBackground({ images, backgrounds }: GTA4LoadingBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)
  const [randomOffset, setRandomOffset] = useState({ x: 0, y: 0 })

  const side = currentIndex % 2 === 0 ? 'left' : 'right'
  const currentBackground = backgrounds.length > 0 ? backgrounds[currentIndex % backgrounds.length] : null

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

  if (images.length === 0) return null

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Background image */}
      {currentBackground && (
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
      )}

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
