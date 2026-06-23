import React from 'react'
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const config = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      styles: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      styles: 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5" />,
      styles: 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300',
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      styles: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
    },
  }

  const { icon, styles } = config[type]

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border', styles, className)}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 p-0.5 hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
