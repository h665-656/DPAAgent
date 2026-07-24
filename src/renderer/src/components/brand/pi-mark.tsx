import { memo } from 'react'
import { cn } from '@renderer/lib/utils'

/** App mark — DPA open-chat logo (View/MainWindow/Resource/MainIcon/logo.png). */
function PiMarkImpl({ className, size = 16 }: { className?: string; size?: number; inverted?: boolean }) {
  return (
    <img
      src="/app-icon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={cn('shrink-0 object-contain', className)}
      draggable={false}
    />
  )
}

export const PiMark = memo(PiMarkImpl)
