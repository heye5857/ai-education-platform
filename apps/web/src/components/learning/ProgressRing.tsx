'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  variant?: 'default' | 'success' | 'warning' | 'math'
  className?: string
  animate?: boolean
  children?: React.ReactNode
}

const variants = {
  default: 'text-primary',
  success: 'text-success-500',
  warning: 'text-warning-500',
  math: 'text-math-500',
}

const bgVariants = {
  default: 'bg-primary/10',
  success: 'bg-success-500/10',
  warning: 'bg-warning-500/10',
  math: 'bg-math-500/10',
}

export function ProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  variant = 'default',
  className,
  animate = true,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className={cn('fill-none', bgVariants[variant])}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={cn('fill-none transition-all duration-1000', variants[variant])}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animate ? offset : circumference}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage && (
          <span className={cn('text-2xl font-bold', variants[variant])}>
            {Math.round(progress)}%
          </span>
        )}
        {!showPercentage && children}
      </div>
    </div>
  )
}