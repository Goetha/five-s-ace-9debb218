import { useState } from "react";
import { Company } from "@/types/company";
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
import { AlertTriangle } from "lucide-react";

interface DeleteCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteCompanyDialog({ 
  company, 
  open, 
  onOpenChange, 
  onConfirm 
}: DeleteCompanyDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText === company?.name) {
      onConfirm();
      onOpenChange(false);
      setConfirmText('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setConfirmText('');
    }
  };

  if (!company) return null;

  const isConfirmed = confirmText === company.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="bg-destructive/10 -mt-6 -mx-6 px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <DialogTitle className="text-xl text-destructive">
              🗑️ EXCLUIR EMPRESA PERMANENTEMENTE?
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="font-semibold text-destructive mb-3">
              ⚠️ ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL!
            </p>
            
            <p className="text-sm mb-3">
              Ao excluir <strong>"{company.name}"</strong>:
            </p>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">❌ Todos os dados serão PERMANENTEMENTE excluídos:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>{company.total_users} usuários (incluindo o admin)</li>
                <li>8 ambientes</li>
                <li>45 auditorias realizadas</li>
                <li>5 planos de ação em aberto</li>
                <li>Todo o histórico</li>
              </ul>
            </div>

            <p className="font-bold text-destructive mt-4">
              🚨 ESTA AÇÃO NÃO PODE SER DESFEITA!
            </p>
          </div>

          <div>
            <Label htmlFor="confirm-name" className="text-sm font-medium">
              Para confirmar, digite o nome EXATO da empresa:
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Digite: ${company.name}`}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite: <strong>{company.name}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!isConfirmed}
          >
            EXCLUIR PERMANENTEMENTE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
