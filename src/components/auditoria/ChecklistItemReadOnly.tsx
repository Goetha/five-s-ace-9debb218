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
      <Card className={item.answer ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}>
        <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Question */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground/70 mb-1.5">
              Pergunta {index + 1}
            </p>
            <p className="text-sm sm:text-base font-medium leading-snug text-foreground">{item.question}</p>
          </div>

          {/* Answer Buttons (Read-Only) */}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled
              size="sm"
              variant={item.answer === true ? "default" : "outline"}
              className={`flex-1 text-xs sm:text-sm ${
                item.answer === true
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600"
                  : "opacity-40 bg-transparent"
              }`}
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Conforme
            </Button>
            <Button
              type="button"
              disabled
              size="sm"
              variant={item.answer === false ? "default" : "outline"}
              className={`flex-1 text-xs sm:text-sm ${
                item.answer === false
                  ? "bg-red-600 hover:bg-red-600 text-white border-red-600"
                  : "opacity-40 bg-transparent"
              }`}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Não Conforme
            </Button>
          </div>

          {/* Comment (Read-Only) */}
          {item.comment && (
            <div className="bg-muted/30 p-2.5 sm:p-3 rounded-md border border-border/30">
              <p className="text-xs sm:text-sm font-medium mb-1 text-muted-foreground/70">Comentário:</p>
              <p className="text-xs sm:text-sm leading-relaxed text-foreground">{item.comment}</p>
            </div>
          )}

          {/* Photos (Read-Only with Preview) */}
          {photoUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground/70">
                Evidências fotográficas ({photoUrls.length}):
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted/20 cursor-pointer hover:opacity-80 transition-opacity border border-border/30"
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
