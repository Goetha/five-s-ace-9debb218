import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Check, X, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AuditItem } from "@/types/audit";

interface ChecklistItemProps {
  item: AuditItem;
  index: number;
  onAnswerChange: (itemId: string, answer: boolean, photoUrl?: string, comment?: string) => void;
}

export function ChecklistItem({ item, index, onAnswerChange }: ChecklistItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [comment, setComment] = useState(item.comment || "");
  const [photoUrl, setPhotoUrl] = useState(item.photo_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAnswer = (answer: boolean) => {
    onAnswerChange(item.id, answer, photoUrl || undefined, comment);
    setShowDetails(true);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    onAnswerChange(item.id, item.answer!, photoUrl || undefined, value);
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

      setPhotoUrl(publicUrl);
      onAnswerChange(item.id, item.answer!, publicUrl, comment);

      toast({
        title: "Foto enviada",
        description: "A evidência foi registrada com sucesso.",
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

  return (
    <Card className={cn(
      "p-4 transition-colors",
      item.answer === true && "bg-success/10 border-success/30 dark:bg-success/20",
      item.answer === false && "bg-destructive/10 border-destructive/30 dark:bg-destructive/20"
    )}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium mb-1 text-foreground">
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
                item.answer === true && "bg-success hover:bg-success/90"
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
                item.answer === false && "bg-destructive hover:bg-destructive/90"
              )}
            >
              <X className="h-5 w-5 mr-1" />
              Não
            </Button>
          </div>
        </div>

        {showDetails && item.answer !== null && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                Comentário {item.answer === false ? "(obrigatório)" : "(opcional)"}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder={item.answer === false 
                  ? "Descreva a não-conformidade encontrada..." 
                  : "Adicione observações sobre esta conformidade..."
                }
                className="min-h-[80px] bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block text-red-600">
                <Camera className="h-4 w-4 inline mr-1" />
                Foto de Evidência (obrigatória)
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoUrl ? (
                <div className="space-y-2">
                  <img 
                    src={photoUrl} 
                    alt="Evidência" 
                    className="w-full max-h-64 object-cover rounded-lg border"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePhotoClick}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Trocar Foto
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePhotoClick}
                  disabled={isUploading}
                  className="w-full border-red-300 hover:border-red-400"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar Foto
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
