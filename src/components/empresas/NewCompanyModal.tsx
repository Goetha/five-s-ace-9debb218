import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { CompanyFormData } from "@/types/company";
import { formatCNPJ, formatPhone, formatCEP } from "@/lib/formatters";

const companySchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().min(18, "CNPJ inválido"),
  address: z.string().min(5, "Endereço é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  cep: z.string().min(9, "CEP inválido"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  adminName: z.string().min(3, "Nome do admin é obrigatório"),
  adminEmail: z.string().email("Email do admin inválido"),
  sendCredentials: z.boolean(),
  status: z.enum(["active", "inactive"]),
  assignedModels: z.array(z.string()),
});

interface NewCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
}

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function NewCompanyModal({ open, onOpenChange, onSave }: NewCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    mode: "onChange",
    defaultValues: {
      sendCredentials: true,
      status: "active",
      assignedModels: [],
    },
  });

  const cnpj = watch("cnpj");
  const phone = watch("phone");
  const cep = watch("cep");

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setValue("cnpj", formatted, { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setValue("cep", formatted, { shouldValidate: true });
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSave(data);
    setIsSubmitting(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Cadastrar Nova Empresa</DialogTitle>
          <DialogDescription>
            Preencha os dados da empresa cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna Esquerda: Dados da Empresa */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">
                      Nome da Empresa <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Ex: Indústria XYZ Ltda"
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cnpj">
                      CNPJ <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cnpj"
                      value={cnpj || ""}
                      onChange={handleCNPJChange}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={errors.cnpj ? "border-red-500" : ""}
                    />
                    {errors.cnpj && (
                      <p className="text-sm text-red-500 mt-1">{errors.cnpj.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="Rua, número, complemento"
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        {...register("city")}
                        placeholder="São Paulo"
                        className={errors.city ? "border-red-500" : ""}
                      />
                      {errors.city && (
                        <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Select onValueChange={(value) => setValue("state", value, { shouldValidate: true })}>
                        <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.state && (
                        <p className="text-sm text-red-500 mt-1">{errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={cep || ""}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className={errors.cep ? "border-red-500" : ""}
                    />
                    {errors.cep && (
                      <p className="text-sm text-red-500 mt-1">{errors.cep.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Contato</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone || ""}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email da Empresa</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="contato@empresa.com.br"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Admin da Empresa */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Primeiro Usuário (Admin)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Este será o usuário administrador principal da empresa, com acesso total às configurações internas.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adminName">
                      Nome Completo do Admin <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="adminName"
                      {...register("adminName")}
                      placeholder="Ex: João da Silva"
                      className={errors.adminName ? "border-red-500" : ""}
                    />
                    {errors.adminName && (
                      <p className="text-sm text-red-500 mt-1">{errors.adminName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="adminEmail">
                      Email do Admin <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      {...register("adminEmail")}
                      placeholder="joao.silva@empresa.com.br"
                      className={errors.adminEmail ? "border-red-500" : ""}
                    />
                    {errors.adminEmail && (
                      <p className="text-sm text-red-500 mt-1">{errors.adminEmail.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Este email será usado para login</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendCredentials"
                      defaultChecked
                      onCheckedChange={(checked) => setValue("sendCredentials", checked as boolean)}
                    />
                    <Label htmlFor="sendCredentials" className="text-sm font-normal cursor-pointer">
                      Enviar credenciais por email
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    Uma senha temporária será gerada e enviada para o email informado
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Configurações Iniciais</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Status Inicial</Label>
                    <RadioGroup
                      defaultValue="active"
                      onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="active" />
                        <Label htmlFor="active" className="font-normal cursor-pointer">
                          Ativa - Empresa pode acessar imediatamente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inactive" id="inactive" />
                        <Label htmlFor="inactive" className="font-normal cursor-pointer">
                          Inativa - Empresa criada mas sem acesso
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Atribuir Modelos Mestre (opcional)</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="model1" />
                        <Label htmlFor="model1" className="font-normal cursor-pointer">
                          5S Industrial Completo (25 critérios)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="model2" />
                        <Label htmlFor="model2" className="font-normal cursor-pointer">
                          5S Administrativo Básico (15 critérios)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="model3" />
                        <Label htmlFor="model3" className="font-normal cursor-pointer">
                          5S Refeitórios e Banheiros (18 critérios)
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Você pode atribuir modelos depois também
                    </p>
                  </div>
                </div>
              </div>
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
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
