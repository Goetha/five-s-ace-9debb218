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
import { Building2, Info, Loader2, Plus, X } from "lucide-react";
import { Criteria, SensoType, ScoreType, CriteriaTag } from "@/types/criteria";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

// Validation Schema
const criterionSchema = z.object({
  companyId: z.string().optional().default(""),
  name: z.string().min(1, "O nome é obrigatório"),
  description: z.string().optional(),
  senso: z.array(z.enum(["1S", "2S", "3S", "4S", "5S"]))
    .min(1, "Selecione pelo menos um senso"),
  scoreType: z.literal("conform-non-conform"),
  tags: z.array(z.string()).default([]),
  status: z.enum(["Ativo", "Inativo"]).default("Ativo")
});
type CriterionFormValues = z.infer<typeof criterionSchema>;
interface CriterionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (criterion: Omit<Criteria, "id" | "companiesUsing" | "modelsUsing">, companyId: string) => void;
  criterion?: Criteria | null;
  mode?: "create" | "edit";
  preSelectedCompanyId?: string | null;
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
  mode = "create",
  preSelectedCompanyId
}: CriterionFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

const form = useForm<CriterionFormValues>({
  resolver: zodResolver(criterionSchema),
  mode: "onChange",
  defaultValues: {
    companyId: "",
    name: "",
    description: "",
    senso: [],
    scoreType: "conform-non-conform",
    tags: [],
    status: "Ativo"
  }
});
const selectedSensos = form.watch("senso");
const description = form.watch("description");
const selectedTags = form.watch("tags");
const selectedCompanyId = form.watch("companyId");

  // Load companies when modal opens
  useEffect(() => {
    if (open && mode === "create") {
      loadCompanies();
    }
  }, [open, mode]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Reset form or load criterion data when modal opens
  useEffect(() => {
    if (open) {
      if (mode === "edit" && criterion) {
        form.reset({
          companyId: preSelectedCompanyId || "",
          name: criterion.name,
          description: "",
          senso: Array.isArray(criterion.senso) ? criterion.senso : [criterion.senso],
          scoreType: "conform-non-conform",
          tags: criterion.tags,
          status: criterion.status
        });
      } else {
        form.reset({
          companyId: preSelectedCompanyId || "",
          name: "",
          description: "",
          senso: undefined,
          scoreType: "conform-non-conform",
          tags: [],
          status: "Ativo"
        });
      }
      setCustomTags([]);
      setNewTagInput("");
    }
  }, [open, mode, criterion, form, preSelectedCompanyId]);
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

    await new Promise(resolve => setTimeout(resolve, 300));
    const companyId = data.companyId === "all" ? "" : (data.companyId || "");
    onSave({
      name: data.name,
      senso: data.senso,
      scoreType: data.scoreType,
      tags: data.tags as CriteriaTag[],
      status: data.status
    }, companyId);
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
                {/* SEÇÃO 1: Empresa Destino (apenas para criação) */}
                {mode === "create" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Empresa Destino
                    </h3>

                    <FormField control={form.control} name="companyId" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>
                              Empresa <span className="text-muted-foreground text-xs">(opcional)</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={loadingCompanies}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingCompanies ? "Carregando..." : "Todas as empresas"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">
                                  <span className="font-medium">Todas as empresas</span>
                                </SelectItem>
                                {companies.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Deixe em branco para disponibilizar para todas as empresas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>} />
                  </div>
                )}

                {/* SEÇÃO 2: Informações Básicas */}
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

                 {/* SEÇÃO 3: Tipo de Avaliação (Fixo) */}
                <div className="space-y-4">
                  <Card className="p-4 bg-muted/30 border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground mb-1">Tipo de Avaliação</p>
                        <p className="text-lg font-bold text-primary">Sim / Não (Conforme/Não Conforme)</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Todos os critérios são avaliados como Conforme ou Não Conforme
                        </p>
                      </div>
                      <div className="text-4xl">✓</div>
                    </div>
                  </Card>
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
                {/* Company */}
                {mode === "create" && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Empresa: </span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedCompanyId && selectedCompanyId !== "all" 
                        ? companies.find(c => c.id === selectedCompanyId)?.name 
                        : "Todas as empresas"}
                    </Badge>
                  </div>
                )}

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
                  <span className="text-muted-foreground">Avaliação: </span>
                  <Badge variant="outline" className="text-xs">
                    Conforme/Não Conforme
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