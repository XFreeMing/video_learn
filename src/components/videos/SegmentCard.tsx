import type { VideoSegment } from '#/services/video-processor/types'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface SegmentCardProps {
  segment: VideoSegment
  videoId: string
}

export default function SegmentCard({ segment, videoId }: SegmentCardProps) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--header-bg)] p-4">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-mono text-xs text-[var(--sea-ink-soft)]">
          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
        </span>
        <span className="text-xs text-[var(--sea-ink-soft)]">({segment.images.length} 张)</span>
      </div>
      {segment.transcript && (
        <p className="mb-3 text-sm leading-relaxed text-[var(--sea-ink)]">{segment.transcript}</p>
      )}
      {segment.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {segment.images.map((img) => (
            <img
              key={img.timestamp}
              src={`/api/videos/${videoId}/frame/${img.path.split('/').pop()}`}
              alt={`Frame at ${formatTime(img.timestamp)}`}
              className="h-16 w-auto flex-shrink-0 rounded-lg border border-[var(--line)] object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </article>
  )
}
