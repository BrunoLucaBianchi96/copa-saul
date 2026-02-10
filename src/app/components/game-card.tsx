'use client'

interface GameCardProps {
  name: string
  imageUrl?: string
  gradientColors?: string
  onClick?: () => void
}

export function GameCard({
  name,
  imageUrl,
  gradientColors = 'from-darcula-blue to-darcula-purple',
  onClick,
}: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-t-lg overflow-hidden flex-shrink-0 w-44 h-60 sm:w-48 sm:h-64 cursor-pointer transition-transform duration-200 hover:scale-[1.2] hover:z-10 focus:outline-none"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradientColors} flex items-center justify-center`}>
          <span className="text-darcula-text-bright text-4xl font-bold">
            {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-2 lg:p-4">
        <div className="text-darcula-text-bright text-base font-bold text-center leading-tight">
          {name}
        </div>
      </div>
    </button>
  )
}
