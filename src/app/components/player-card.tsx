'use client'

// Helper to format player name with alias on separate lines
export function formatPlayerName(name: string): React.ReactNode {
  // Match pattern: FirstName 'Alias' LastName
  const match = name.match(/^([^']+)'([^']+)'(.*)$/)
  if (match) {
    const [, firstName, alias, lastName] = match
    return (
      <>
        <span>{firstName.trim()}</span>
        <span className="block text-[0.7em] opacity-80">&quot;{alias.trim()}&quot;</span>
        <span>{lastName.trim()}</span>
      </>
    )
  }
  return name
}

// Helper to get initials from a name (ignoring quoted alias)
export function getInitials(name: string): string {
  const nameWithoutAlias = name.replace(/'[^']+'/g, '').trim()
  return nameWithoutAlias.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
}

interface PlayerCardProps {
  name: string
  avatar?: string | null
  gradientColors?: string
  className?: string
  nameClassName?: string
  initialsClassName?: string
}

export function PlayerCard({
  name,
  avatar,
  gradientColors = 'from-darcula-blue to-darcula-purple',
  className = 'w-32 h-44 sm:w-28 sm:h-36 md:w-36 md:h-48 lg:w-48 lg:h-64 xl:w-64 xl:h-80',
  nameClassName = 'text-sm sm:text-sm lg:text-base xl:text-lg',
  initialsClassName = 'text-3xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-6xl',
}: PlayerCardProps) {
  return (
    <div className={`relative rounded-t-lg overflow-hidden flex-shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradientColors} flex items-center justify-center`}>
          <span className={`text-darcula-text-bright ${initialsClassName} font-bold`}>
            {getInitials(name)}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-2 lg:p-4">
        <div className={`text-darcula-text-bright ${nameClassName} font-bold text-center leading-tight`}>
          {formatPlayerName(name)}
        </div>
      </div>
    </div>
  )
}
