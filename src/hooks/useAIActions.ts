import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

// Query keys for AI Actions
export const aiActionQueryKeys = {
  all: ['ai-actions'] as const,
  thread: (threadId: string) => [...aiActionQueryKeys.all, 'thread', threadId] as const,
}

// Hook to fetch AI actions for a thread
// Note: AI actions endpoints not yet implemented in boxzero-api
export function useAIActions(threadId: string) {
  return useQuery({
    queryKey: aiActionQueryKeys.thread(threadId),
    queryFn: async () => {
      // AI actions not yet implemented - return empty actions
      console.log('⚠️ AI actions not yet implemented in boxzero-api')
      return { actions: [] }
    },
    enabled: !!threadId,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

// Hook to approve AI action
// Note: AI actions endpoints not yet implemented in boxzero-api
export function useApproveAIAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionId: string) => {
      console.log('⚠️ AI action approval not yet implemented in boxzero-api')
      return { success: true, actionId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiActionQueryKeys.all })
      toast.success('AI action approved')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve action')
    },
  })
}

// Hook to generate AI response
// Note: AI endpoints not yet implemented in boxzero-api
export function useGenerateAIResponse() {
  return useMutation({
    mutationFn: async ({ prompt, context }: { prompt: string; context?: any }) => {
      console.log('⚠️ AI response generation not yet implemented in boxzero-api')
      return { response: 'AI features coming soon!' }
    },
    onSuccess: () => {
      toast.success('AI response generated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate response')
    },
  })
}