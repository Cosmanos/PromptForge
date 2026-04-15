import { Play, Pencil, Trash2, Braces } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { PromptListItem } from '@/types'

interface PromptCardProps {
  prompt: PromptListItem
  onExecute: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PromptCard({ prompt, onExecute, onEdit, onDelete }: PromptCardProps) {
  const updated = new Date(prompt.updated_at).toLocaleDateString()

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <CardTitle className="text-base truncate">{prompt.name}</CardTitle>
        <p className="text-xs text-muted-foreground">{updated}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          {prompt.variable_count > 0 && (
            <span className="flex items-center gap-1">
              <Braces className="h-3 w-3" />
              {prompt.variable_count} variable{prompt.variable_count !== 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {prompt.model}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1" onClick={onExecute}>
            <Play className="h-3.5 w-3.5" />
            Execute
          </Button>
          <Button size="icon" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" onClick={onDelete}
            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
