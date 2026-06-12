import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileVideo,
  ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react'
import type { VideoStatus } from '#/services/video-processor/types'

const STATUS_CONFIG: Record<VideoStatus, { label: string; icon: React.ReactNode; color: string }> =
  {
    pending: {
      label: '等待中',
      icon: <Clock className="h-3.5 w-3.5" />,
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
    extracting: {
      label: '提取中',
      icon: <FileVideo className="h-3.5 w-3.5 animate-pulse" />,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    },
    transcribing: {
      label: '转写中',
      icon: <Sparkles className="h-3.5 w-3.5 animate-pulse" />,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    },
    deduplicating: {
      label: '去重中',
      icon: <ImageIcon className="h-3.5 w-3.5 animate-pulse" />,
      color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    },
    completed: {
      label: '已完成',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    },
    failed: {
      label: '失败',
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    },
  }

interface ProgressBadgeProps {
  status: VideoStatus
  progress?: number
  compact?: boolean
}

export default function ProgressBadge({ status, progress, compact }: ProgressBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {status === 'extracting' || status === 'transcribing' || status === 'deduplicating' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        config.icon
      )}
      {compact ? config.label : `${config.label} ${progress ?? 0}%`}
    </span>
  )
}
