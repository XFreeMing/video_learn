import type { VideoSegment } from '#/services/video-processor/types'
import SegmentCard from './SegmentCard'

interface TimelineViewProps {
  segments: VideoSegment[]
  videoId: string
}

export default function TimelineView({ segments, videoId }: TimelineViewProps) {
  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--line)] p-8 text-center">
        <p className="text-[var(--sea-ink-soft)]">暂无转写内容</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">时间线</h3>
        <span className="text-sm text-[var(--sea-ink-soft)]">共 {segments.length} 个片段</span>
      </div>
      {segments.map((segment, index) => (
        <SegmentCard key={index} segment={segment} videoId={videoId} />
      ))}
    </div>
  )
}
