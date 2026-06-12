import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import ProgressBadge from '#/components/videos/ProgressBadge'
import type { VideoStatus } from '#/services/video-processor/types'

const searchSchema = z.object({
  status: z
    .enum(['pending', 'extracting', 'transcribing', 'deduplicating', 'completed', 'failed'])
    .optional(),
})

export const Route = createFileRoute('/videos/')({
  component: VideoListPage,
  validateSearch: searchSchema,
})

function VideoListPage() {
  const search = Route.useSearch()

  const { data, isLoading } = useQuery({
    queryKey: ['videos', search.status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.status) params.set('status', search.status)
      const res = await fetch(`/api/videos?${params}`)
      return res.json()
    },
    refetchInterval: (query) => {
      // Auto-refresh if there are processing videos
      const videos = query.state.data?.videos ?? []
      const hasProcessing = videos.some(
        (v: { status: VideoStatus }) =>
          v.status === 'pending' ||
          v.status === 'extracting' ||
          v.status === 'transcribing' ||
          v.status === 'deduplicating',
      )
      return hasProcessing ? 3000 : false
    },
  })

  return (
    <div className="page-wrap py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--sea-ink)]">视频列表</h1>
        <Link
          to="/videos/upload"
          className="rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          上传视频
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        <Link
          to="/videos"
          className="rounded-lg px-3 py-1.5 text-sm transition hover:bg-[var(--link-bg)]"
          activeProps={{
            className: 'bg-[var(--lagoon)] text-white',
          }}
        >
          全部
        </Link>
        {(
          ['pending', 'extracting', 'transcribing', 'deduplicating', 'completed', 'failed'] as const
        ).map((status) => {
          const label = ProgressBadge({ status, compact: true }).props.label ?? status
          return (
            <Link
              key={status}
              to="/videos"
              search={{ status }}
              className="rounded-lg px-3 py-1.5 text-sm transition hover:bg-[var(--link-bg)]"
              activeProps={{
                className: 'bg-[var(--lagoon)] text-white',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[var(--line)] p-8 text-center text-[var(--sea-ink-soft)]">
          加载中...
        </div>
      ) : !data?.videos?.length ? (
        <div className="rounded-xl border border-[var(--line)] p-8 text-center text-[var(--sea-ink-soft)]">
          暂无视频，
          <Link to="/videos/upload" className="text-[var(--lagoon)] underline">
            上传第一个
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--header-bg)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">文件名</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">状态</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">时长</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">分辨率</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">时间</th>
              </tr>
            </thead>
            <tbody>
              {data.videos.map((video: any) => (
                <tr
                  key={video.id}
                  className="border-b border-[var(--line)] transition hover:bg-[var(--link-bg)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/videos/$id"
                      params={{ id: video.id }}
                      className="font-medium text-[var(--lagoon)] hover:underline"
                    >
                      {video.filename}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBadge status={video.status} progress={video.progress} />
                  </td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                    {video.duration
                      ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60)
                          .toString()
                          .padStart(2, '0')}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                    {video.resolution ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)]">
                    {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
