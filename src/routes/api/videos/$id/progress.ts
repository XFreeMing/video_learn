import { createFileRoute } from '@tanstack/react-router'
import { getJobProgress } from '#/services/video-processor/queue'

export const Route = createFileRoute('/api/videos/$id/progress')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ params }) => {
          const progress = await getJobProgress(params.id)

          if (!progress) {
            return Response.json({
              videoId: params.id,
              status: 'pending',
              progress: 0,
              currentStep: '等待中',
              updatedAt: Date.now(),
            })
          }

          return Response.json(progress)
        },
      }),
  },
})
