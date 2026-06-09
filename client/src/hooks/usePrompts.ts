import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PromptWithDetails } from '@/types'
import type { Provider } from '@/lib/models'

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

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    staleTime: Infinity,
  })
}

// ---- Provider key connections ----

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => api.credentials.list(),
    staleTime: Infinity,
  })
}

export function useSaveKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, key }: { provider: Provider; key: string }) =>
      api.credentials.save(provider, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useDeleteKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: Provider) => api.credentials.remove(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.tags.list(),
    staleTime: Infinity,
  })
}

// ---- Tag CRUD (the caller's own tags) ----

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; hint: string; sort_order?: number }) => api.tags.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; hint?: string; sort_order?: number } }) =>
      api.tags.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tags.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

// ---- Admin: default_tags template ----

export function useDefaultTags(enabled: boolean) {
  return useQuery({
    queryKey: ['default-tags'],
    queryFn: () => api.defaultTags.list(),
    enabled,
  })
}

export function useCreateDefaultTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; hint: string; sort_order?: number }) => api.defaultTags.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['default-tags'] }),
  })
}

export function useUpdateDefaultTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; hint?: string; sort_order?: number } }) =>
      api.defaultTags.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['default-tags'] }),
  })
}

export function useDeleteDefaultTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.defaultTags.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['default-tags'] }),
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
