'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from 'lucide-react'

export interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  duration?: number
  currentTime?: number
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onPlay?: () => void
  onPause?: () => void
  className?: string
  triggerCards?: Array<{ time: number; id: string }>
  autoPlay?: boolean
}

export function VideoPlayer({
  src,
  poster,
  title,
  duration = 0,
  currentTime = 0,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  className,
  triggerCards = [],
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [volume, setVolume] = React.useState(1)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [playbackRate, setPlaybackRate] = React.useState(1)
  const [showControls, setShowControls] = React.useState(true)
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTogglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) videoRef.current.volume = newVolume
    setIsMuted(newVolume === 0)
  }

  const handleToggleMute = () => {
    if (!videoRef.current) return
    setIsMuted(!isMuted)
    videoRef.current.muted = !isMuted
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (videoRef.current) videoRef.current.currentTime = newTime
    onTimeUpdate?.(newTime)
  }

  const handleFullscreen = () => {
    if (!videoRef.current) return
    if (!isFullscreen) {
      videoRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (videoRef.current) videoRef.current.playbackRate = rate
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!videoRef.current) return
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault()
        handleTogglePlay()
        break
      case 'ArrowLeft':
        e.preventDefault()
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
        break
      case 'ArrowRight':
        e.preventDefault()
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10)
        break
      case 'ArrowUp':
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.1))
        break
      case 'm':
        handleToggleMute()
        break
      case 'f':
        handleFullscreen()
        break
    }
  }

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadedMetadata = () => onTimeUpdate?.(video.currentTime)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [onTimeUpdate, onEnded])

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
      videoRef.current.volume = volume
    }
  }, [playbackRate, volume])

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const cardTriggers = triggerCards.map(card => (card.time / duration) * 100)

  return (
    <div
      className={cn('relative w-full aspect-video bg-black rounded-xl overflow-hidden', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title || 'Video player'}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain"
        aria-label={title}
      />

      {/* Card trigger markers */}
      <div className="absolute bottom-16 left-0 right-0 h-2 pointer-events-none">
        {cardTriggers.map((pos, i) => (
          <div
            key={triggerCards[i].id}
            className="absolute top-0 bottom-0 w-1 bg-math-400/80"
            style={{ left: `${pos}%` }}
            title={`Interactive card at ${formatTime(triggerCards[i].time)}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleTogglePlay}
            className="p-2 text-white hover:text-math-300 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            onClick={() => videoRef.current && (videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10))}
            className="p-2 text-white hover:text-math-300 transition-colors"
            aria-label="Rewind 10 seconds"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-white text-sm monospace min-w-[50px] text-center">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-math-400 [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
              aria-label="Video progress"
            />
            <span className="text-white text-sm monospace min-w-[50px] text-center">
              {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={() => videoRef.current && (videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10))}
            className="p-2 text-white hover:text-math-300 transition-colors"
            aria-label="Forward 10 seconds"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="p-2 text-white hover:text-math-300 transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-2 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-math-400"
              aria-label="Volume"
            />
          </div>

          <select
            value={playbackRate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm bg-white/10 text-white rounded border border-white/20"
            aria-label="Playback speed"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>

          <button
            onClick={handleFullscreen}
            className="p-2 text-white hover:text-math-300 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}