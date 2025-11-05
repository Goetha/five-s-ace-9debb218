import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { generateTemporaryPassword } from "@/lib/passwordGenerator";

interface NewAuditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Company {
  id: string;
  name: string;
}

export function NewAuditorModal({ open, onOpenChange, onSuccess }: NewAuditorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password_type: "auto" as "auto" | "manual",
    password: "",
    send_email: true,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        password_type: "auto",
        password: "",
        send_email: true,
      });
      setSelectedCompanyIds([]);
    }
  }, [open]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: "Erro ao carregar empresas",
        description: "Não foi possível carregar a lista de empresas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.email) {
      toast({
        title: "Validação",
        description: "Nome e email são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCompanyIds.length === 0) {
      toast({
        title: "Validação",
        description: "Selecione pelo menos uma empresa.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password_type === 'manual' && !formData.password) {
      toast({
        title: "Validação",
        description: "Informe uma senha.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const password = formData.password_type === 'auto' 
        ? generateTemporaryPassword() 
        : formData.password;

      // Create user for the first company (primary)
      const primaryCompanyId = selectedCompanyIds[0];
      
      const { data, error } = await supabase.functions.invoke('create-company-user', {
        body: {
          email: formData.email,
          password: password,
          full_name: formData.name,
          phone: formData.phone || undefined,
          role: 'auditor',
          company_id: primaryCompanyId,
          linked_environments: [],
          send_credentials_email: formData.send_email,
        },
      });

      if (error) throw error;

      // If more than one company, link to additional companies
      if (selectedCompanyIds.length > 1 && data.user_id) {
        const additionalCompanyIds = selectedCompanyIds.slice(1);
        
        await supabase.functions.invoke('update-auditor-companies', {
          body: {
            auditor_id: data.user_id,
            company_ids: selectedCompanyIds, // All companies
          },
        });
      }

      toast({
        title: "Sucesso!",
        description: `Avaliador ${formData.name} cadastrado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating auditor:', error);
      toast({
        title: "Erro ao criar avaliador",
        description: error.message || "Não foi possível criar o avaliador.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Avaliador</DialogTitle>
          <DialogDescription>
            Cadastre um novo avaliador e vincule às empresas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao@empresa.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>

          {/* Password Type */}
          <div>
            <Label>Tipo de Senha</Label>
            <RadioGroup
              value={formData.password_type}
              onValueChange={(value: "auto" | "manual") =>
                setFormData({ ...formData, password_type: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">Gerar senha automaticamente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Definir senha manualmente</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.password_type === 'manual' && (
            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          {/* Companies */}
          <div>
            <Label>Empresas Vinculadas *</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Selecione as empresas que este avaliador terá acesso
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                {companies.map(company => (
                  <div
                    key={company.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                    onClick={() => handleToggleCompany(company.id)}
                  >
                    <Checkbox
                      id={`company-${company.id}`}
                      checked={selectedCompanyIds.includes(company.id)}
                      onCheckedChange={() => handleToggleCompany(company.id)}
                    />
                    <Label
                      htmlFor={`company-${company.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {company.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {selectedCompanyIds.length} empresa(s) selecionada(s)
            </p>
          </div>

          {/* Send Email */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send_email"
              checked={formData.send_email}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, send_email: checked as boolean })
              }
            />
            <Label htmlFor="send_email">
              Enviar credenciais por email
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar Avaliador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
