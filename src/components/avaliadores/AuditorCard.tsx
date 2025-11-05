import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  MoreVertical,
  Edit,
  Eye
} from "lucide-react";
import { Auditor } from "@/types/auditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditorCardProps {
  auditor: Auditor;
  onEditCompanies: (auditor: Auditor) => void;
  onViewDetails: (auditor: Auditor) => void;
}

export function AuditorCard({ auditor, onEditCompanies, onViewDetails }: AuditorCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <span className="text-lg font-bold text-orange-500">
                {auditor.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-base">{auditor.name}</h3>
              <Badge variant={auditor.status === 'active' ? 'default' : 'secondary'}>
                {auditor.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(auditor)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCompanies(auditor)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Empresas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{auditor.email}</span>
          </div>
          {auditor.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{auditor.phone}</span>
            </div>
          )}
        </div>

        {/* Linked Companies */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Empresas Vinculadas ({auditor.linked_companies.length})</span>
          </div>
          {auditor.linked_companies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {auditor.linked_companies.slice(0, 3).map(company => (
                <Badge key={company.id} variant="outline" className="text-xs">
                  {company.name}
                </Badge>
              ))}
              {auditor.linked_companies.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{auditor.linked_companies.length - 3} mais
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{auditor.environments_count} ambientes</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Desde {format(new Date(auditor.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEditCompanies(auditor)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar Empresas
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails(auditor)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
