import { FileArchive, Loader2, Upload } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useCallback, useState } from 'react'

interface UploadZoneProps {
  onUploadComplete: (result: { uploadId: string; videoCount: number }) => void
  onError: (error: string) => void
}

export default function UploadZone({ onUploadComplete, onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.zip')) {
        onError('Please upload a .zip file')
        return
      }

      setUploading(true)
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append('zip', file)

        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/videos/upload')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          setUploading(false)
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText)
            onUploadComplete(result)
          } else {
            const error = JSON.parse(xhr.responseText)
            onError(error.error || 'Upload failed')
          }
        }

        xhr.onerror = () => {
          setUploading(false)
          onError('Network error during upload')
        }

        xhr.send(formData)
      } catch {
        setUploading(false)
        onError('Upload failed')
      }
    },
    [onUploadComplete, onError],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleUpload(file)
    },
    [handleUpload],
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload],
  )

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition ${
        isDragging ? 'border-[var(--lagoon)] bg-[var(--link-bg)]' : 'border-[var(--line)]'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--lagoon)]" />
          <div>
            <p className="text-lg font-medium text-[var(--sea-ink)]">上传中...</p>
            <p className="text-sm text-[var(--sea-ink-soft)]">{progress}%</p>
          </div>
          <div className="w-full max-w-xs overflow-hidden rounded-full bg-[var(--link-bg)]">
            <div
              className="h-2 rounded-full bg-[var(--lagoon)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-3">
          <FileArchive className="h-12 w-12 text-[var(--sea-ink-soft)]" />
          <div>
            <p className="text-lg font-medium text-[var(--sea-ink)]">
              拖拽 zip 文件到此处，或点击选择
            </p>
            <p className="text-sm text-[var(--sea-ink-soft)]">支持 .zip 格式的视频压缩包</p>
          </div>
          <input type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
          <span className="rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            <Upload className="mr-1 inline h-4 w-4" />
            选择文件
          </span>
        </label>
      )}
    </div>
  )
}
