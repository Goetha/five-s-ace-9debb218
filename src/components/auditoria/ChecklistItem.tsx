import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Camera, Check, X, Upload, Loader2, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AuditItem } from "@/types/audit";

interface ChecklistItemProps {
  item: AuditItem;
  index: number;
  onAnswerChange: (itemId: string, answer: boolean, photoUrls?: string[], comment?: string) => void;
}

const SENSO_LABELS: Record<string, string> = {
  '1S': 'Utilização',
  '2S': 'Organização',
  '3S': 'Limpeza',
  '4S': 'Padronização',
  '5S': 'Disciplina'
};

const getSensoLabel = (senso: string[] | null | undefined): string => {
  if (!senso || senso.length === 0) return 'Critério';
  // Return the first senso's label
  return SENSO_LABELS[senso[0]] || senso[0];
};

// Parse photos from JSON string or use empty array
const parsePhotos = (photoUrl: string | null): string[] => {
  if (!photoUrl) return [];
  try {
    const parsed = JSON.parse(photoUrl);
    return Array.isArray(parsed) ? parsed : [photoUrl];
  } catch {
    return [photoUrl];
  }
};

export function ChecklistItem({ item, index, onAnswerChange }: ChecklistItemProps) {
  // Use item props directly for answer, comment and photos to stay in sync with parent
  const localAnswer = item.answer;
  const comment = item.comment || "";
  const photoUrls = parsePhotos(item.photo_url);
  
  const [showDetails, setShowDetails] = useState(item.answer !== null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Expand details section when answer is set
  useEffect(() => {
    if (item.answer !== null && !showDetails) {
      setShowDetails(true);
    }
  }, [item.answer, showDetails]);

  const handleAnswer = (answer: boolean) => {
    setShowDetails(true);
    onAnswerChange(item.id, answer, photoUrls.length > 0 ? photoUrls : undefined, comment);
  };

  const handleCommentChange = (value: string) => {
    onAnswerChange(item.id, localAnswer!, photoUrls.length > 0 ? photoUrls : undefined, value);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${item.id}_${Date.now()}.${fileExt}`;
      const filePath = `audit-items/${fileName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('audit-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('audit-photos')
        .getPublicUrl(filePath);

      const updatedPhotos = [...photoUrls, publicUrl];
      onAnswerChange(item.id, localAnswer!, updatedPhotos, comment);

      toast({
        title: "Foto adicionada",
        description: `${updatedPhotos.length} foto(s) registrada(s).`,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro ao enviar foto",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedPhotos = photoUrls.filter((_, index) => index !== indexToRemove);
    onAnswerChange(item.id, localAnswer!, updatedPhotos.length > 0 ? updatedPhotos : undefined, comment);
    
    toast({
      title: "Foto removida",
      description: `${updatedPhotos.length} foto(s) restante(s).`,
    });
  };

  // Validation logic: only required for non-conforming (Não) answers
  const isNonConforming = localAnswer === false;
  const hasPhotos = photoUrls.length > 0;
  const hasComment = comment.trim().length > 0;
  const requiresPhoto = isNonConforming && !hasPhotos;
  const requiresComment = isNonConforming && !hasComment;
  const isValid = !isNonConforming || (hasPhotos && hasComment);

  return (
    <Card className={cn(
      "p-3 sm:p-4 transition-colors",
      localAnswer === true && "bg-success/10 border-success/30 dark:bg-success/20",
      localAnswer === false && isValid && "bg-destructive/10 border-destructive/30 dark:bg-destructive/20",
      localAnswer === false && !isValid && "bg-destructive/10 border-destructive/50 dark:bg-destructive/20 ring-2 ring-destructive/50"
    )}>
      <div className="space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs sm:text-sm text-foreground">
              <span className="text-muted-foreground mr-1">{getSensoLabel(item.senso)}:</span>
              {item.question}
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant={localAnswer === true ? "default" : "outline"}
              size="sm"
              onClick={() => handleAnswer(true)}
              className={cn(
                "flex-1 text-xs sm:text-sm",
                localAnswer === true && "bg-success hover:bg-success/90"
              )}
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Sim
            </Button>
            <Button
              variant={localAnswer === false ? "default" : "outline"}
              size="sm"
              onClick={() => handleAnswer(false)}
              className={cn(
                "flex-1 text-xs sm:text-sm",
                localAnswer === false && "bg-destructive hover:bg-destructive/90"
              )}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Não
            </Button>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            {/* Warning for non-conforming items */}
            {isNonConforming && !isValid && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                ⚠️ Foto e comentário são obrigatórios para não conformidades
              </div>
            )}

            <div>
              <label className={cn(
                "text-xs sm:text-sm font-medium mb-2 block",
                isNonConforming ? "text-foreground" : "text-muted-foreground"
              )}>
                Comentário {isNonConforming && <span className="text-destructive">*</span>}
                {!isNonConforming && <span className="text-muted-foreground text-xs"> (opcional)</span>}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder={isNonConforming 
                  ? "Descreva a não-conformidade encontrada..." 
                  : "Adicione observações sobre esta conformidade..."
                }
                className={cn(
                  "min-h-[60px] sm:min-h-[80px] bg-background text-foreground text-xs sm:text-sm",
                  requiresComment && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>

            <div className="space-y-2">
              <label className={cn(
                "text-xs sm:text-sm font-medium block",
                isNonConforming ? "text-foreground" : "text-muted-foreground"
              )}>
                <Camera className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                Fotos de Evidência {isNonConforming && <span className="text-destructive">*</span>}
                {!isNonConforming && <span className="text-muted-foreground text-xs"> (opcional)</span>}
                {' '}- {photoUrls.length} foto(s)
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <div 
                        className="w-full h-32 sm:h-40 rounded-lg border overflow-hidden cursor-pointer"
                        onClick={() => setPreviewImage(url)}
                      >
                        <img 
                          src={url} 
                          alt={`Evidência ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', url);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EErro%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      {/* Remove button - always visible on mobile, hover on desktop */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-2 shadow-lg z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                        aria-label={`Remover foto ${idx + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePhotoClick}
                disabled={isUploading}
                className={cn(
                  "w-full text-xs",
                  requiresPhoto ? "border-destructive hover:border-destructive text-destructive" : ""
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    {photoUrls.length > 0 ? 'Adicionar Mais Fotos' : 'Tirar Foto'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Preview da Foto */}
      <Dialog open={previewImage !== null} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0" aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <DialogTitle>Visualização da Foto</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative w-full h-full flex items-center justify-center bg-black/90">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
