import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PromptCard } from './PromptCard'
import type { PromptListItem } from '@/types'

interface PromptGridProps {
  prompts: PromptListItem[]
  onNew: () => void
  onExecute: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export function PromptGrid({ prompts, onNew, onExecute, onEdit, onDelete }: PromptGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* New Prompt Card */}
      <Card
        className="border-dashed hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
        onClick={onNew}
      >
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3 p-6">
          <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/40 group-hover:border-primary/50 flex items-center justify-center transition-colors">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground group-hover:text-primary font-medium transition-colors">
            New Prompt
          </p>
        </CardContent>
      </Card>

      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onExecute={() => onExecute(prompt.id)}
          onEdit={() => onEdit(prompt.id)}
          onDelete={() => onDelete(prompt.id)}
        />
      ))}
    </div>
  )
}
