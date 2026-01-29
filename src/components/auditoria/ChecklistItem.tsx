import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Camera, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AuditItem } from "@/types/audit";
import {
  saveOfflinePhoto,
  getOfflinePhotoDataUrl,
  generateOfflinePhotoId,
  fileToBase64,
  isOfflinePhotoUrl,
} from "@/lib/offlineStorage";

interface ChecklistItemProps {
  item: AuditItem;
  index: number;
  // FIXED: Accept answer as boolean | null to allow photos before answering
  onAnswerChange: (itemId: string, answer: boolean | null, photoUrls?: string[], comment?: string) => void;
  isOfflineAudit?: boolean;
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

export function ChecklistItem({ item, index, onAnswerChange, isOfflineAudit = false }: ChecklistItemProps) {
  const localAnswer = item.answer;
  const comment = item.comment || "";
  const photoUrls = parsePhotos(item.photo_url);
  
  const [showDetails, setShowDetails] = useState(item.answer !== null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [offlinePhotoCache, setOfflinePhotoCache] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Load offline photo data URLs for display
  useEffect(() => {
    const loadOfflinePhotos = async () => {
      const newCache: Record<string, string> = {};
      for (const url of photoUrls) {
        if (isOfflinePhotoUrl(url) && !offlinePhotoCache[url]) {
          const dataUrl = await getOfflinePhotoDataUrl(url);
          if (dataUrl) {
            newCache[url] = dataUrl;
          }
        }
      }
      if (Object.keys(newCache).length > 0) {
        setOfflinePhotoCache(prev => ({ ...prev, ...newCache }));
      }
    };
    loadOfflinePhotos();
  }, [photoUrls]);

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
    // FIXED: Use localAnswer as-is (may be null) to allow comment changes before answering
    onAnswerChange(item.id, localAnswer ?? null, photoUrls.length > 0 ? photoUrls : undefined, value);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
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
      // Check if we're offline or if this is an offline audit
      // IMPORTANT: Always check navigator.onLine first, then the isOfflineAudit prop
      const currentlyOffline = !navigator.onLine || isOfflineAudit;
      
      console.log('📷 Photo upload - Online status:', navigator.onLine, 'isOfflineAudit:', isOfflineAudit, 'Will use offline mode:', currentlyOffline);

      if (currentlyOffline) {
        // OFFLINE MODE: Save photo as Base64 in IndexedDB
        console.log('📴 Saving photo offline to IndexedDB...');
        
        const base64 = await fileToBase64(file);
        console.log('📷 Base64 conversion complete, size:', Math.round(base64.length / 1024), 'KB');
        
        const photoId = generateOfflinePhotoId();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${item.id}_${Date.now()}.${fileExt}`;
        
        await saveOfflinePhoto({
          id: photoId,
          auditItemId: item.id,
          base64,
          fileName,
          createdAt: new Date().toISOString(),
        });
        
        console.log('📷 Photo saved to IndexedDB with ID:', photoId);
        
        // Cache the data URL for display
        setOfflinePhotoCache(prev => ({ ...prev, [photoId]: base64 }));
        
        const updatedPhotos = [...photoUrls, photoId];
        
        // FIXED: Use localAnswer as-is (can be null, true, or false)
        // No more forcing cast to boolean - parent handles null properly
        onAnswerChange(item.id, localAnswer ?? null, updatedPhotos, comment);

        toast({
          title: "✅ Foto salva (Offline)",
          description: `${updatedPhotos.length} foto(s) registrada(s). Será enviada quando online.`,
        });
      } else {
        // ONLINE MODE: Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${item.id}_${Date.now()}.${fileExt}`;
        const filePath = `audit-items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('audit-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('audit-photos')
          .getPublicUrl(filePath);

        const updatedPhotos = [...photoUrls, publicUrl];
        // FIXED: Use localAnswer as-is (can be null online too)
        onAnswerChange(item.id, localAnswer ?? null, updatedPhotos, comment);

        toast({
          title: "Foto adicionada",
          description: `${updatedPhotos.length} foto(s) registrada(s).`,
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro ao enviar foto",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedPhotos = photoUrls.filter((_, index) => index !== indexToRemove);
    // FIXED: Use localAnswer as-is to allow removal before answering
    onAnswerChange(item.id, localAnswer ?? null, updatedPhotos.length > 0 ? updatedPhotos : undefined, comment);
    
    toast({
      title: "Foto removida",
      description: `${updatedPhotos.length} foto(s) restante(s).`,
    });
  };

  // Get the display URL for a photo (handles offline photos)
  const getDisplayUrl = (url: string): string => {
    if (isOfflinePhotoUrl(url)) {
      return offlinePhotoCache[url] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ECarregando...%3C/text%3E%3C/svg%3E';
    }
    return url;
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
                onChange={handleFileChange}
                className="hidden"
              />

              {photoUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4 overflow-visible">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative overflow-visible">
                      {/* Offline indicator badge */}
                      {isOfflinePhotoUrl(url) && (
                        <div className="absolute top-1 left-1 z-40 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          📴 Offline
                        </div>
                      )}
                      
                      {/* Image container */}
                      <div 
                        className="w-full h-32 sm:h-40 rounded-lg border overflow-hidden cursor-pointer mt-3 mr-1"
                        onClick={() => setPreviewImage(getDisplayUrl(url))}
                      >
                        <img 
                          src={getDisplayUrl(url)} 
                          alt={`Evidência ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', url);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EErro%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      
                      {/* Remove button */}
                      <div 
                        className="absolute top-0 right-0 z-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemovePhoto(idx);
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ touchAction: 'manipulation' }}
                      >
                        <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-transform">
                          <X className="h-4 w-4 pointer-events-none" />
                        </div>
                      </div>
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
                    {!navigator.onLine || isOfflineAudit ? 'Salvando...' : 'Enviando...'}
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

      {/* Photo Preview Modal */}
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