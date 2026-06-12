import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ProgressBadge from '#/components/videos/ProgressBadge'
import TimelineView from '#/components/videos/TimelineView'

export const Route = createFileRoute('/videos/$id')({
  component: VideoDetailPage,
})

function VideoDetailPage() {
  const { id } = Route.useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      const res = await fetch(`/api/videos/${id}`)
      return res.json()
    },
    refetchInterval: (query) => {
      const video = query.state.data?.video
      if (!video) return false
      const processingStatuses = ['pending', 'extracting', 'transcribing', 'deduplicating']
      return processingStatuses.includes(video.status) ? 3000 : false
    },
  })

  if (isLoading) {
    return (
      <div className="page-wrap flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lagoon)]" />
      </div>
    )
  }

  if (!data?.video) {
    return <div className="page-wrap py-8 text-center text-[var(--sea-ink-soft)]">视频未找到</div>
  }

  const video = data.video
  const isProcessing = ['pending', 'extracting', 'transcribing', 'deduplicating'].includes(
    video.status,
  )

  return (
    <div className="page-wrap py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/videos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-[var(--sea-ink)]">{video.filename}</h1>
          <ProgressBadge status={video.status} progress={video.progress} />
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-[var(--line)] p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--sea-ink-soft)]">时长</p>
          <p className="text-sm font-medium text-[var(--sea-ink)]">
            {video.duration
              ? `${Math.floor(video.duration / 60)}分${Math.floor(video.duration % 60)}秒`
              : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--sea-ink-soft)]">分辨率</p>
          <p className="text-sm font-medium text-[var(--sea-ink)]">{video.resolution ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--sea-ink-soft)]">处理进度</p>
          <p className="text-sm font-medium text-[var(--sea-ink)]">{video.progress}%</p>
        </div>
        <div>
          <p className="text-xs text-[var(--sea-ink-soft)]">上传时间</p>
          <p className="text-sm font-medium text-[var(--sea-ink)]">
            {video.createdAt ? new Date(video.createdAt).toLocaleString() : '-'}
          </p>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="mb-6 rounded-xl border border-[var(--line)] p-6 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--lagoon)]" />
          <p className="text-sm text-[var(--sea-ink-soft)]">{video.currentStep ?? '处理中...'}</p>
          <div className="mx-auto mt-3 w-full max-w-sm overflow-hidden rounded-full bg-[var(--link-bg)]">
            <div
              className="h-2 rounded-full bg-[var(--lagoon)] transition-all"
              style={{ width: `${video.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {video.status === 'failed' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">
            处理失败: {video.error ?? '未知错误'}
          </p>
        </div>
      )}

      {/* Timeline */}
      {video.status === 'completed' && data?.segments && (
        <TimelineView segments={data.segments.segments ?? []} videoId={id} />
      )}
    </div>
  )
}
