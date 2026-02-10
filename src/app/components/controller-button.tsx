import {
  type ControllerPlatform,
  type PlayStationButton,
  type WiiButton,
  getControllerIconPath,
} from '@/lib/controller-icons'

const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
} as const

interface ControllerButtonProps {
  platform: ControllerPlatform
  button: PlayStationButton | WiiButton
  size?: keyof typeof SIZE_CLASSES
  className?: string
  alt?: string
}

export function ControllerButton({
  platform,
  button,
  size = 'md',
  className,
  alt,
}: ControllerButtonProps) {
  const src = getControllerIconPath(platform, button)
  const sizeClass = SIZE_CLASSES[size]

  return (
    <img
      src={src}
      alt={alt ?? `${platform} ${button}`}
      className={className ?? sizeClass}
    />
  )
}
