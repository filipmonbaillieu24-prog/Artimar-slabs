import { OrderStatus } from '@/types/database.types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  let badgeStyles = ''
  let statusText = ''

  switch (status) {
    case 'bestelling doorgestuurd':
      badgeStyles = 'bg-blue-50 text-blue-700 border-blue-200'
      statusText = 'Bestelling doorgestuurd'
      break
    case 'bestelling ontvangen':
      badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200'
      statusText = 'Bestelling ontvangen'
      break
    case 'materiaal voorradig':
      badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      statusText = 'Materiaal voorradig'
      break
    case 'materiaal niet voorradig':
      badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200'
      statusText = 'Materiaal niet voorradig'
      break
    case 'bestelling ingepland voor levering':
      badgeStyles = 'bg-[#FFF0F5] text-[#D10056] border-[#FAD0E0]'
      statusText = 'Ingepland voor levering'
      break
    default:
      badgeStyles = 'bg-gray-100 text-gray-700 border-gray-200'
      statusText = status
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]',
        badgeStyles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current shrink-0" />
      {statusText}
    </span>
  )
}
