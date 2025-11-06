import { useState, useEffect } from "react";
import { Company, CompanyFormData } from "@/types/company";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCheck, Mail } from "lucide-react";
import { formatPhone } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface EditCompanyModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
}

interface LinkedAuditor {
  id: string;
  name: string;
  email: string;
}

export function EditCompanyModal({ company, open, onOpenChange, onSave }: EditCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAuditors, setIsLoadingAuditors] = useState(false);
  const [linkedAuditors, setLinkedAuditors] = useState<LinkedAuditor[]>([]);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        phone: company.phone,
        email: company.email || '',
        adminName: company.admin.name,
        adminEmail: company.admin.email,
      });
      
      // Fetch linked auditors
      fetchLinkedAuditors(company.id);
    }
  }, [company]);

  const fetchLinkedAuditors = async (companyId: string) => {
    setIsLoadingAuditors(true);
    try {
      // First, get all user_ids linked to this company from user_companies table
      const { data: userCompanies, error: userCompaniesError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', companyId);

      if (userCompaniesError) {
        console.error('Error fetching user_companies:', userCompaniesError);
        setLinkedAuditors([]);
        return;
      }

      // Extract user IDs
      const linkedUserIds = (userCompanies || []).map(uc => uc.user_id);

      if (linkedUserIds.length === 0) {
        setLinkedAuditors([]);
        return;
      }

      // Call list-all-auditors to get full auditor details
      const { data, error } = await supabase.functions.invoke('list-all-auditors');

      if (error) {
        console.error('Error calling list-all-auditors:', error);
        setLinkedAuditors([]);
        return;
      }

      // Filter auditors that are in our linked user IDs list
      const auditorsForCompany = data?.auditors?.filter((auditor: any) => 
        linkedUserIds.includes(auditor.id)
      ) || [];

      const auditorsData: LinkedAuditor[] = auditorsForCompany.map((auditor: any) => ({
        id: auditor.id,
        name: auditor.name,
        email: auditor.email,
      }));

      console.log(`✅ Encontrados ${auditorsData.length} avaliadores para empresa ${companyId}`);
      setLinkedAuditors(auditorsData);
    } catch (error) {
      console.error('Error fetching linked auditors:', error);
      setLinkedAuditors([]);
    } finally {
      setIsLoadingAuditors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(formData);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresa - {company.name}</DialogTitle>
          <DialogDescription>
            Atualize as informações essenciais da empresa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {/* Informações da Empresa */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Indústria XYZ Ltda"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email da Empresa *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com.br"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Avaliadores Vinculados */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Avaliadores Vinculados</h3>
              
              {isLoadingAuditors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando avaliadores...</span>
                </div>
              ) : linkedAuditors.length === 0 ? (
                <Card className="p-6 text-center border-dashed">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum avaliador vinculado a esta empresa
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {linkedAuditors.map((auditor) => (
                    <Card key={auditor.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{auditor.name}</p>
                              <Badge variant="secondary" className="text-xs">Avaliador</Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{auditor.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-3">
                Para adicionar ou remover avaliadores, use a página de Avaliadores
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
