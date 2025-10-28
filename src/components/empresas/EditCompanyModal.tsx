import { useState, useEffect } from "react";
import { Company, CompanyFormData } from "@/types/company";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatCNPJ, formatPhone, formatCEP } from "@/lib/formatters";

interface EditCompanyModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
}

export function EditCompanyModal({ company, open, onOpenChange, onSave }: EditCompanyModalProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    sendCredentials: false,
    status: 'active',
    assignedModels: []
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        cnpj: company.cnpj,
        address: company.address,
        city: company.city || '',
        state: company.state || '',
        cep: company.cep || '',
        phone: company.phone,
        email: company.email || '',
        adminName: company.admin.name,
        adminEmail: company.admin.email,
        sendCredentials: false,
        status: company.status,
        assignedModels: []
      });
    }
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  if (!company) return null;

  const statusChanged = formData.status !== company.status;
  const showInactiveWarning = statusChanged && formData.status === 'inactive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresa - {company.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda: Dados da Empresa */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={3}
                />
              </div>

              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formatCNPJ(formData.cnpj)}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  title="CNPJ não pode ser alterado"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CNPJ não pode ser alterado
                </p>
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="UF"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, '') })}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label htmlFor="email">Email da Empresa</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Coluna Direita: Status e Observações */}
            <div className="space-y-4">
              <div>
                <Label>Status da Empresa *</Label>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => 
                    setFormData({ ...formData, status: value })
                  }
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active" className="cursor-pointer font-normal">
                      Ativa - Usuários podem acessar
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inactive" id="inactive" />
                    <Label htmlFor="inactive" className="cursor-pointer font-normal">
                      Inativa - Bloqueia acesso de todos os usuários
                    </Label>
                  </div>
                </RadioGroup>

                {showInactiveWarning && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>⚠️ Ao desativar esta empresa:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Todos os {company.total_users} usuários perderão acesso ao sistema</li>
                        <li>Dados não serão excluídos</li>
                        <li>Você pode reativar depois</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Notas internas do IFA (não visível para a empresa)"
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para uso interno do IFA
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
