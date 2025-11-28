import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AuditItem } from "@/types/audit";
import { Check, X } from "lucide-react";

interface ChecklistItemReadOnlyProps {
  item: AuditItem;
  index: number;
}

export function ChecklistItemReadOnly({ item, index }: ChecklistItemReadOnlyProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Parse photo URLs
  const photoUrls = item.photo_urls || [];

  return (
    <>
      <Card className={item.answer ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}>
        <CardContent className="p-4 space-y-3">
          {/* Question */}
          <div>
            <p className="font-medium text-sm text-muted-foreground mb-2">
              Pergunta {index + 1}
            </p>
            <p className="text-base font-medium">{item.question}</p>
          </div>

          {/* Answer Buttons (Read-Only) */}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled
              variant={item.answer === true ? "default" : "outline"}
              className={`flex-1 ${
                item.answer === true
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "opacity-50"
              }`}
            >
              <Check className="h-4 w-4 mr-1" />
              Conforme
            </Button>
            <Button
              type="button"
              disabled
              variant={item.answer === false ? "default" : "outline"}
              className={`flex-1 ${
                item.answer === false
                  ? "bg-red-600 hover:bg-red-600 text-white"
                  : "opacity-50"
              }`}
            >
              <X className="h-4 w-4 mr-1" />
              Não Conforme
            </Button>
          </div>

          {/* Comment (Read-Only) */}
          {item.comment && (
            <div className="bg-background/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-1 text-muted-foreground">Comentário:</p>
              <p className="text-sm">{item.comment}</p>
            </div>
          )}

          {/* Photos (Read-Only with Preview) */}
          {photoUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Evidências fotográficas ({photoUrls.length}):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewImage(url)}
                  >
                    <img
                      src={url}
                      alt={`Evidência ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Visualização da imagem</DialogTitle>
          </VisuallyHidden>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
