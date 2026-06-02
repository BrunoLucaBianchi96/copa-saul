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

interface BountyBadgeProps {
  amount: number
  className?: string
}

// Bounty badge — shown above a player's card. Render this inside a `relative`
// wrapper around <PlayerCard> (PlayerCard itself is overflow-hidden and would
// clip it). Returns null when there is no bounty.
export function BountyBadge({ amount, className = '' }: BountyBadgeProps) {
  if (!amount || amount <= 0) return null
  return (
    <div
      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-5 z-30 flex items-center gap-1.5 bg-darcula-yellow text-darcula-bg text-base lg:text-xl font-bold px-3 py-1 lg:px-4 lg:py-1.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none ${className}`}
    >
      <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.5 2c-.6 0-1.1.4-1.3 1l-.9 2.8C7.6 6.6 6 8.6 6 11v.5l-2.2 6.1C3.3 19 4.3 20.5 5.8 20.5h12.4c1.5 0 2.5-1.5 2-2.9L18 11.5V11c0-2.4-1.6-4.4-3.3-5.2L13.8 3c-.2-.6-.7-1-1.3-1h-1zm.5 9.5c1.4 0 2.5.9 2.5 2s-1.1 2-2.5 2-2.5-.9-2.5-2 1.1-2 2.5-2zm-2-5h4l-.6 1.8c-.4-.1-.9-.2-1.4-.2s-1 .1-1.4.2L10 6.5z" />
      </svg>
      {amount}
    </div>
  )
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
