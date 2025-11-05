import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Auditor } from "@/types/auditor";
import { Mail, Phone, Building2, MapPin, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ViewAuditorModalProps {
  auditor: Auditor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAuditorModal({ auditor, open, onOpenChange }: ViewAuditorModalProps) {
  if (!auditor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <span className="text-lg font-bold text-orange-500">
                {auditor.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div>{auditor.name}</div>
              <Badge variant={auditor.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {auditor.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Informações detalhadas do avaliador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Informações de Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{auditor.email}</span>
              </div>
              {auditor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{auditor.phone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Linked Companies */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresas Vinculadas ({auditor.linked_companies.length})
            </h3>
            {auditor.linked_companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {auditor.linked_companies.map(company => (
                  <div
                    key={company.id}
                    className="p-3 border rounded-lg bg-accent/50"
                  >
                    <p className="text-sm font-medium">{company.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa vinculada
              </p>
            )}
          </div>

          <Separator />

          {/* Statistics */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Estatísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs">Ambientes Vinculados</span>
                </div>
                <p className="text-2xl font-bold">{auditor.environments_count}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Empresas</span>
                </div>
                <p className="text-2xl font-bold">{auditor.linked_companies.length}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Histórico</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cadastrado em:</span>
                <span className="font-medium">
                  {format(new Date(auditor.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {auditor.last_access && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Último acesso:</span>
                  <span className="font-medium">
                    {format(new Date(auditor.last_access), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
