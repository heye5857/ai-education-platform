'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lock, CheckCircle, Play, Star, Clock, ArrowRight } from 'lucide-react'

export interface MapNodeProps {
  levelNumber: number
  title: string
  status: 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered'
  position: { x: number; y: number }
  onClick?: () => void
  isCurrent?: boolean
  connections?: Array<'next' | 'prev'>
  className?: string
}

const statusConfig = {
  locked: {
    icon: Lock,
    nodeColor: 'bg-muted',
    borderColor: 'border-border',
    iconColor: 'text-muted-foreground',
    glowColor: 'transparent',
    label: 'Locked',
  },
  available: {
    icon: Play,
    nodeColor: 'bg-math-500',
    borderColor: 'border-math-500',
    iconColor: 'text-white',
    glowColor: 'shadow-math-500/50',
    label: 'Available',
  },
  'in-progress': {
    icon: Clock,
    nodeColor: 'bg-primary',
    borderColor: 'border-primary',
    iconColor: 'text-white',
    glowColor: 'shadow-primary/50',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle,
    nodeColor: 'bg-success-500',
    borderColor: 'border-success-500',
    iconColor: 'text-white',
    glowColor: 'shadow-success-500/50',
    label: 'Completed',
  },
  mastered: {
    icon: Star,
    nodeColor: 'bg-warning-500',
    borderColor: 'border-warning-500',
    iconColor: 'text-white',
    glowColor: 'shadow-warning-500/50',
    label: 'Mastered',
  },
}

export function MapNode({
  levelNumber,
  title,
  status,
  position,
  onClick,
  isCurrent = false,
  connections = [],
  className,
}: MapNodeProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const isClickable = status !== 'locked' && onClick

  const nodeStyle: React.CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
  }

  return (
    <motion.div
      style={nodeStyle}
      className={cn('relative', className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, delay: levelNumber * 0.05 }}
    >
      {/* Connection lines */}
      {connections.includes('next') && (
        <motion.div
          className="absolute right-full top-1/2 h-0.5 w-16 -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '4rem', opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      )}
      {connections.includes('prev') && (
        <motion.div
          className="absolute left-full top-1/2 h-0.5 w-16 -translate-y-1/2 bg-gradient-to-l from-transparent via-border to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '4rem', opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      )}

      {/* Node */}
      <motion.button
        type="button"
        onClick={onClick}
        disabled={status === 'locked'}
        className={cn(
          'relative flex flex-col items-center gap-2',
          'w-16 h-16 rounded-2xl flex-shrink-0',
          config.nodeColor,
          config.borderColor,
          'border-2',
          'transition-all duration-300',
          isClickable && 'cursor-pointer hover:scale-110',
          status === 'locked' && 'cursor-not-allowed opacity-60',
          isCurrent && 'ring-4 ring-offset-2 ring-offset-background animate-pulse'
        )}
        whileHover={isClickable ? { scale: 1.15 } : {}}
        whileTap={isClickable ? { scale: 0.95 } : {}}
        aria-label={`Level ${levelNumber}: ${title} - ${statusConfig[status].label}`}
        aria-disabled={status === 'locked'}
      >
        <StatusIcon className={cn('h-7 w-7', config.iconColor, 'z-10')} aria-hidden="true" />
        <span className={cn('text-xs font-bold text-center px-1', config.iconColor, 'z-10')}>
          {levelNumber}
        </span>
      </motion.button>

      {/* Tooltip */}
      <motion.div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5',
          'rounded-lg bg-popover text-popover-foreground shadow-lg border',
          'text-sm font-medium whitespace-nowrap',
          'opacity-0 pointer-events-none',
          'group-hover:opacity-100'
        )}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-popover" />
      </motion.div>

      {/* Status badge */}
      {status !== 'locked' && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-background"
          style={{ backgroundColor: config.nodeColor.replace('bg-', '') }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          {status === 'mastered' && <Star className="h-3 w-3" />}
          {status === 'completed' && <CheckCircle className="h-3 w-3" />}
          {status === 'in-progress' && <Clock className="h-3 w-3" />}
          {status === 'available' && <Play className="h-3 w-3" />}
        </motion.div>
      )}
    </motion.div>
  )
}