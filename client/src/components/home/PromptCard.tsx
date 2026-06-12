import { Play, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { displayTitle } from '@/lib/utils'
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
    <Card className="hover:border-foreground/20 transition-colors group">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium truncate">{displayTitle(prompt)}</CardTitle>
        <p className="text-xs text-muted-foreground">{updated}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Variables as chips — what the prompt expects, visible before running. */}
        <div className="flex items-start gap-1 mb-4">
          {prompt.variable_names.length > 0 && (
            <div className="flex flex-wrap gap-1 min-w-0">
              {prompt.variable_names.map((name) => (
                <Badge key={name} variant="outline" className="font-mono">
                  {name}
                </Badge>
              ))}
            </div>
          )}
          <span className="ml-auto shrink-0 text-[11px] font-mono bg-track text-muted-foreground px-1.5 py-0.5 rounded-md">
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
