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
import { Loader2 } from "lucide-react";
import { CompanyFormData } from "@/types/company";
import { formatPhone } from "@/lib/formatters";

const companySchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  adminName: z.string().min(3, "Nome do admin é obrigatório"),
  adminEmail: z.string().email("Email do admin inválido"),
});

interface NewCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CompanyFormData) => void;
}

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
      name: "",
      phone: "",
      email: "",
      adminName: "",
      adminEmail: "",
    },
  });

  const phone = watch("phone");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Cadastrar Nova Empresa</DialogTitle>
          <DialogDescription>
            Preencha os dados essenciais da empresa cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {/* Informações da Empresa */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
              
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
                  <Label htmlFor="phone">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
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
                  <Label htmlFor="email">
                    Email da Empresa <span className="text-red-500">*</span>
                  </Label>
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

            {/* Primeiro Usuário Admin */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Primeiro Usuário (Admin)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Este será o usuário administrador principal da empresa
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
                  <p className="text-xs text-muted-foreground mt-1">Este email será usado para login</p>
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
