import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import UploadZone from '#/components/videos/UploadZone'

export const Route = createFileRoute('/videos/upload')({
  component: VideoUploadPage,
})

function VideoUploadPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ uploadId: string; videoCount: number } | null>(null)

  return (
    <div className="page-wrap py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--sea-ink)]">上传视频</h1>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          上传成功！共 {success.videoCount} 个视频，正在处理中...
          <button className="ml-2 underline" onClick={() => navigate({ to: '/videos' })}>
            查看列表
          </button>
        </div>
      )}

      <UploadZone
        onUploadComplete={(result) => {
          setSuccess(result)
          setError(null)
        }}
        onError={(msg) => {
          setError(msg)
          setSuccess(null)
        }}
      />
    </div>
  )
}
