import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PromptWithDetails } from '@/types'

export function usePromptList() {
  return useQuery({
    queryKey: ['prompts'],
    queryFn: () => api.prompts.list(),
  })
}

export function usePrompt(id: number | undefined) {
  return useQuery({
    queryKey: ['prompts', id],
    queryFn: () => api.prompts.get(id!),
    enabled: id != null,
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
    staleTime: Infinity,
  })
}

export function useCreatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data?: { name?: string; model?: string }) => api.prompts.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })
}

export function useUpdatePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PromptWithDetails> & { tag_ids?: number[]; variables?: unknown[] } }) =>
      api.prompts.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['prompts'] })
      qc.invalidateQueries({ queryKey: ['prompts', id] })
    },
  })
}

export function useDeletePrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.prompts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  })
}

export function useAnalyzePrompt() {
  return useMutation({
    mutationFn: (id: number) => api.prompts.analyze(id),
  })
}

export function useRewritePrompt() {
  return useMutation({
    mutationFn: ({ id, tag_ids }: { id: number; tag_ids: number[] }) =>
      api.prompts.rewrite(id, tag_ids),
  })
}
