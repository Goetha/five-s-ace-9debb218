import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditItem } from "@/types/audit";

interface ChecklistItemProps {
  item: AuditItem;
  index: number;
  onAnswerChange: (itemId: string, answer: boolean, photoUrl?: string, comment?: string) => void;
}

export function ChecklistItem({ item, index, onAnswerChange }: ChecklistItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [comment, setComment] = useState(item.comment || "");

  const handleAnswer = (answer: boolean) => {
    onAnswerChange(item.id, answer, item.photo_url || undefined, comment);
    if (!answer) {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    onAnswerChange(item.id, item.answer!, item.photo_url || undefined, value);
  };

  return (
    <Card className={cn(
      "p-4 transition-colors",
      item.answer === true && "bg-green-50 border-green-200",
      item.answer === false && "bg-red-50 border-red-200"
    )}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium mb-1">
              <span className="text-muted-foreground mr-2">Pergunta {index + 1}:</span>
              {item.question}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant={item.answer === true ? "default" : "outline"}
              size="lg"
              onClick={() => handleAnswer(true)}
              className={cn(
                "min-w-[80px]",
                item.answer === true && "bg-green-600 hover:bg-green-700"
              )}
            >
              <Check className="h-5 w-5 mr-1" />
              Sim
            </Button>
            <Button
              variant={item.answer === false ? "default" : "outline"}
              size="lg"
              onClick={() => handleAnswer(false)}
              className={cn(
                "min-w-[80px]",
                item.answer === false && "bg-red-600 hover:bg-red-700"
              )}
            >
              <X className="h-5 w-5 mr-1" />
              Não
            </Button>
          </div>
        </div>

        {(showDetails || item.answer === false) && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Adicione observações sobre esta não-conformidade..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Adicionar Foto (opcional)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
