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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ToggleStatusDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ToggleStatusDialog({ 
  company, 
  open, 
  onOpenChange, 
  onConfirm 
}: ToggleStatusDialogProps) {
  const [reason, setReason] = useState('');
  const [notifyAdmin, setNotifyAdmin] = useState(true);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
    setReason('');
    setNotifyAdmin(true);
  };

  if (!company) return null;

  const isActivating = company.status === 'inactive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isActivating ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
            <DialogTitle>
              {isActivating ? '✅ Ativar Empresa?' : '⚠️ Desativar Empresa?'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isActivating ? (
            <div className="space-y-3">
              <p>
                Ao ativar <strong>"{company.name}"</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todos os usuários voltarão a ter acesso</li>
                <li>Auditorias pausadas serão retomadas</li>
                <li>Admin receberá notificação por email</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <p>
                Ao desativar <strong>"{company.name}"</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todos os {company.total_users} usuários perderão acesso ao sistema</li>
                <li>Dados não serão excluídos</li>
                <li>Auditorias em andamento serão pausadas</li>
                <li>Você pode reativar a empresa depois</li>
              </ul>

              <div className="mt-4">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da desativação..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {isActivating && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={notifyAdmin}
                onCheckedChange={(checked) => setNotifyAdmin(checked as boolean)}
              />
              <Label htmlFor="notify" className="cursor-pointer font-normal">
                Notificar admin da empresa
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant={isActivating ? "default" : "destructive"}
            onClick={handleConfirm}
            className={isActivating ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isActivating ? 'Ativar Empresa' : 'Desativar Empresa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
