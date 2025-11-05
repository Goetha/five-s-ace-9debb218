import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info, Loader2, Plus, X } from "lucide-react";
import { Criteria, SensoType, ScoreType, CriteriaTag } from "@/types/criteria";

// Validation Schema
const criterionSchema = z.object({
  name: z.string().min(10, "O nome deve ter no mínimo 10 caracteres").max(100, "O nome deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "A descrição deve ter no máximo 500 caracteres").optional(),
  senso: z.array(z.enum(["1S", "2S", "3S", "4S", "5S"]))
    .min(1, "Selecione pelo menos um senso"),
  scoreType: z.enum(["0-10", "C/NC", "0-5", "Percentual"], {
    required_error: "Selecione um tipo de avaliação"
  }),
  tags: z.array(z.string()).default([]),
  status: z.enum(["Ativo", "Inativo"]).default("Ativo")
});
type CriterionFormValues = z.infer<typeof criterionSchema>;
interface CriterionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (criterion: Omit<Criteria, "id" | "companiesUsing" | "modelsUsing">) => void;
  criterion?: Criteria | null;
  mode?: "create" | "edit";
}
const sensoDescriptions: Record<SensoType, string> = {
  "1S": "Separar o necessário do desnecessário",
  "2S": "Organizar e identificar para facilitar o uso",
  "3S": "Manter o ambiente limpo e higienizado",
  "4S": "Padronizar procedimentos e práticas",
  "5S": "Manter a disciplina e melhorar continuamente"
};
const sensoColors: Record<SensoType, string> = {
  "1S": "bg-senso-1s text-white",
  "2S": "bg-senso-2s text-white",
  "3S": "bg-senso-3s text-white",
  "4S": "bg-senso-4s text-white",
  "5S": "bg-senso-5s text-white"
};
const availableTags: CriteriaTag[] = ["Industrial", "Escritório", "Banheiro", "Refeitório", "Almoxarifado"];
const CriterionFormModal = ({
  open,
  onClose,
  onSave,
  criterion,
  mode = "create"
}: CriterionFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
const form = useForm<CriterionFormValues>({
  resolver: zodResolver(criterionSchema),
  mode: "onChange",
  // Validate on change to enable button in real-time
  defaultValues: {
    name: "",
    description: "",
    senso: [],
    scoreType: "0-10",
    tags: [],
    status: "Ativo"
  }
});
const selectedSensos = form.watch("senso");
const description = form.watch("description");
const selectedTags = form.watch("tags");

  // Reset form or load criterion data when modal opens
  useEffect(() => {
    if (open) {
      if (mode === "edit" && criterion) {
        // Load criterion data for editing
        form.reset({
          name: criterion.name,
          description: "",
          senso: Array.isArray(criterion.senso) ? criterion.senso : [criterion.senso],
          scoreType: criterion.scoreType,
          tags: criterion.tags,
          status: criterion.status
        });
      } else {
        // Reset form for new criterion
        form.reset({
          name: "",
          description: "",
          senso: undefined,
          scoreType: "0-10",
          tags: [],
          status: "Ativo"
        });
      }
      setCustomTags([]);
      setNewTagInput("");
    }
  }, [open, mode, criterion, form]);
  const handleAddCustomTag = () => {
    if (newTagInput.trim() && !customTags.includes(newTagInput.trim())) {
      const newTag = newTagInput.trim();
      setCustomTags([...customTags, newTag]);
      form.setValue("tags", [...selectedTags, newTag]);
      setNewTagInput("");
    }
  };
  const handleRemoveTag = (tag: string) => {
    const updatedTags = selectedTags.filter(t => t !== tag);
    form.setValue("tags", updatedTags);
    if (customTags.includes(tag)) {
      setCustomTags(customTags.filter(t => t !== tag));
    }
  };
  const onSubmit = async (data: CriterionFormValues) => {
    setIsSubmitting(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    onSave({
      name: data.name,
      senso: data.senso,
      scoreType: data.scoreType,
      tags: data.tags as CriteriaTag[],
      status: data.status
    });
    setIsSubmitting(false);
    onClose();
  };
  const handleCancel = () => {
    const hasChanges = form.formState.isDirty;
    if (hasChanges) {
      const confirmed = window.confirm("Deseja descartar as alterações?");
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };
  
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form Section - 2 columns */}
          <div className="md:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* SEÇÃO 1: Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Informações Básicas
                  </h3>

                  <FormField control={form.control} name="name" render={({
                  field
                }) => <FormItem>
                        <FormLabel>
                          Nome do Critério <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Ausência de materiais desnecessários" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormLabel>
                          Descrição/Instrução
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva como avaliar este critério. Ex: Verificar se há materiais, ferramentas ou equipamentos que não são utilizados no local..." rows={4} {...field} />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span className="text-muted-foreground">
                            Explique como avaliar este critério
                          </span>
                          <span className="text-muted-foreground">
                            {description?.length || 0}/500 caracteres
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* SEÇÃO 2: Classificação 5S */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Classificação 5S
                  </h3>

                  <FormField
                    control={form.control}
                    name="senso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Sensos 5S <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="space-y-2">
                          {(["1S","2S","3S","4S","5S"] as const).map((s) => (
                            <div key={s} className="flex items-start gap-3 p-2 rounded-md border hover:bg-accent/50">
                              <Checkbox
                                id={`senso-${s}`}
                                checked={field.value?.includes(s)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  field.onChange(
                                    checked
                                      ? [...current, s]
                                      : current.filter((v: any) => v !== s)
                                  );
                                }}
                                className="mt-1"
                              />
                              <Label htmlFor={`senso-${s}`} className="cursor-pointer flex items-center gap-2">
                                <Badge className={`bg-senso-${s.toLowerCase()} text-white`}>{s}</Badge>
                                <span>
                                  {s === "1S" && "Seiri (Utilização)"}
                                  {s === "2S" && "Seiton (Organização)"}
                                  {s === "3S" && "Seiso (Limpeza)"}
                                  {s === "4S" && "Seiketsu (Padronização)"}
                                  {s === "5S" && "Shitsuke (Disciplina)"}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />

                        {selectedSensos?.length > 0 && (
                          <Card className="p-3 bg-muted/50 border-none animate-fade-in mt-2">
                            <div className="flex flex-wrap gap-1">
                              {selectedSensos.map((s: any) => (
                                <Badge key={s} className={`bg-senso-${s.toLowerCase()} text-white`}>{s}</Badge>
                              ))}
                            </div>
                          </Card>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                 {/* SEÇÃO 3: Sistema de Pontuação com Níveis 5S */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Sistema de Pontuação 5S
                  </h3>

                  {/* Score Level Visual Guide */}
                  <Card className="p-4 bg-muted/30 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Níveis de Atendimento:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 rounded bg-red-50 border border-red-200">
                        <span className="text-2xl">🔴</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700">Não atende o padrão 5S</p>
                          <p className="text-xs text-red-600">De 0 a 4 pontos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-yellow-50 border border-yellow-200">
                        <span className="text-2xl">🟡</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-700">Atende parcialmente ao padrão 5S</p>
                          <p className="text-xs text-yellow-600">De 5 a 8 pontos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded bg-green-50 border border-green-200">
                        <span className="text-2xl">🟢</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-700">Atende ao padrão 5S</p>
                          <p className="text-xs text-green-600">De 9 a 10 pontos</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="scoreType" render={({
                    field
                  }) => <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Tipo de Avaliação <span className="text-destructive">*</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-2 text-sm">
                                  <p><strong>Sim/Não:</strong> Resposta binária (atende ou não atende)</p>
                                  <p><strong>0-10:</strong> Escala detalhada de 0 a 10 pontos</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="C/NC">Sim / Não (Conforme/Não Conforme)</SelectItem>
                              <SelectItem value="0-10">Escala 0-10 pontos</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </div>

                {/* SEÇÃO 4: Categorização */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Categorização
                  </h3>

                  <FormField control={form.control} name="tags" render={() => <FormItem>
                        <FormLabel>Tags/Categorias</FormLabel>
                        
                        {/* Selected Tags Display */}
                        {selectedTags.length > 0 && <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-md">
                            {selectedTags.map(tag => <Badge key={tag} variant="secondary" className="gap-1 animate-fade-in">
                                {tag}
                                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>)}
                          </div>}

                        <div className="space-y-3">
                          {/* Predefined Tags */}
                          <div className="grid grid-cols-2 gap-2">
                            {availableTags.map(tag => <FormField key={tag} control={form.control} name="tags" render={({
                        field
                      }) => <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox checked={field.value?.includes(tag)} onCheckedChange={checked => {
                            const updatedTags = checked ? [...field.value, tag] : field.value.filter(t => t !== tag);
                            field.onChange(updatedTags);
                          }} />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {tag}
                                    </FormLabel>
                                  </FormItem>} />)}
                          </div>

                          {/* Custom Tag Input */}
                          <div className="flex gap-2">
                            <Input placeholder="Nova tag customizada..." value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }} />
                            <Button type="button" variant="outline" size="icon" onClick={handleAddCustomTag} disabled={!newTagInput.trim()}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <FormDescription>
                          Ajuda a filtrar e organizar os critérios
                        </FormDescription>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="status" render={({
                  field
                }) => <FormItem className="space-y-3">
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Ativo" id="ativo" />
                              <Label htmlFor="ativo" className="cursor-pointer font-normal">
                                Ativo
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Inativo" id="inativo" />
                              <Label htmlFor="inativo" className="cursor-pointer font-normal">
                                Inativo
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Critérios inativos não ficam disponíveis para as empresas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* Hidden submit button for form */}
                <button type="submit" className="hidden" />
              </form>
            </Form>
          </div>

          {/* Preview Section - 1 column */}
          <div className="md:col-span-1">
            <Card className="p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                📋 Preview
              </h3>
              
              <div className="space-y-4">
                {/* Senso Badges */}
                {selectedSensos && selectedSensos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedSensos.map((s: any) => (
                      <Badge key={s} className={sensoColors[s]}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Criterion Name */}
                <div>
                  <h4 className="font-semibold text-foreground break-words">
                    {form.watch("name") || "Nome do critério"}
                  </h4>
                </div>

                {/* Score Type */}
                <div className="text-sm">
                  <span className="text-muted-foreground">Tipo: </span>
                  <span className="font-medium">{form.watch("scoreType")}</span>
                </div>

                {/* Tags */}
                {selectedTags.length > 0 && <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map(tag => <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>)}
                    </div>
                  </div>}

                {/* Status */}
                <div>
                  <span className="text-sm text-muted-foreground">Status: </span>
                  <Badge variant={form.watch("status") === "Ativo" ? "default" : "secondary"} className="text-xs">
                    {form.watch("status") === "Ativo" ? "🟢" : "⭕"} {form.watch("status")}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={!form.formState.isValid || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "edit" ? "Salvar Alterações" : "Salvar Critério"}
                </Button>
              </span>
            </TooltipTrigger>
            {!form.formState.isValid && <TooltipContent>
                <p>Preencha todos os campos obrigatórios</p>
              </TooltipContent>}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
export default CriterionFormModal;