'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lock, CheckCircle, Play, Star, Clock } from 'lucide-react'

export interface LevelCardProps {
  levelNumber: number
  title: string
  description?: string
  status: 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered'
  videoDuration?: number
  cardCount?: number
  completedCards?: number
  testAttempts?: number
  bestScore?: number
  onClick?: () => void
  className?: string
}

const statusConfig = {
  locked: {
    icon: Lock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-border',
    label: 'Locked',
  },
  available: {
    icon: Play,
    color: 'text-math-500',
    bg: 'bg-math-500/10',
    border: 'border-math-500/30',
    label: 'Available',
  },
  'in-progress': {
    icon: Clock,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-success-500',
    bg: 'bg-success-500/10',
    border: 'border-success-500/30',
    label: 'Completed',
  },
  mastered: {
    icon: Star,
    color: 'text-warning-500',
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/30',
    label: 'Mastered',
  },
}

export function LevelCard({
  levelNumber,
  title,
  description,
  status,
  videoDuration,
  cardCount = 0,
  completedCards = 0,
  testAttempts = 0,
  bestScore,
  onClick,
  className,
}: LevelCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const isClickable = status !== 'locked' && onClick

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={status === 'locked'}
      className={cn(
        'relative group w-full p-4 rounded-xl transition-all duration-300',
        'flex flex-col gap-3',
        config.bg,
        config.border,
        'border',
        isClickable && 'hover:shadow-lg hover:border-2 hover:scale-[1.02] cursor-pointer',
        status === 'locked' && 'opacity-60 cursor-not-allowed',
        className
      )}
      whileHover={isClickable ? { scale: 1.02, y: -4 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      aria-label={title}
      aria-disabled={status === 'locked'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', config.bg, config.border, 'border')}>
            <StatusIcon className={cn('h-5 w-5', config.color)} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className={cn('font-semibold truncate', status === 'locked' ? 'text-muted-foreground' : 'text-foreground')}>
              Level {levelNumber}: {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {bestScore !== undefined && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
            <Star className="h-4 w-4 text-warning-500" aria-hidden="true" />
            <span className="font-semibold text-sm">{bestScore}%</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        {videoDuration && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {Math.floor(videoDuration / 60)} min
          </span>
        )}
        {cardCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {completedCards}/{cardCount} cards
          </span>
        )}
        {testAttempts > 0 && (
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {testAttempts} attempt{testAttempts > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {status === 'in-progress' && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', config.color.replace('text-', 'bg-'))}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCards / Math.max(cardCount, 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {status === 'locked' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
          <Lock className="h-8 w-8 text-white/80" aria-hidden="true" />
        </div>
      )}
    </motion.button>
  )
}