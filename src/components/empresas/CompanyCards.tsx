import { Eye, Edit, Link2, MoreVertical, Building, Mail, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Company } from "@/types/company";
import { formatDate } from "@/lib/formatters";

interface CompanyCardsProps {
  companies: Company[];
  selectedCompanies: string[];
  onSelectionChange: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onView: (company: Company) => void;
  onEdit: (company: Company) => void;
  onAssignModels: (company: Company) => void;
  onAssignAuditors: (company: Company) => void;
}

export function CompanyCards({
  companies,
  selectedCompanies,
  onSelectionChange,
  onSelectAll,
  onView,
  onEdit,
  onAssignModels,
  onAssignAuditors,
}: CompanyCardsProps) {
  const allSelected = companies.length > 0 && selectedCompanies.length === companies.length;

  if (companies.length === 0) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-lg font-medium text-foreground">Nenhuma empresa encontrada</p>
        <p className="text-sm text-muted-foreground">Comece cadastrando sua primeira empresa cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select All Header */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Selecionar todos"
        />
        <span className="text-sm text-muted-foreground">
          {selectedCompanies.length > 0
            ? `${selectedCompanies.length} de ${companies.length} selecionadas`
            : 'Selecionar todas as empresas'}
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Card
            key={company.id}
            className={`transition-all hover:shadow-md border-l-4 border-l-success ${
              selectedCompanies.includes(company.id) ? 'ring-2 ring-primary' : ''
            }`}
          >
            <CardContent className="p-6 space-y-4">
              {/* Header with Checkbox and Menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedCompanies.includes(company.id)}
                    onCheckedChange={() => onSelectionChange(company.id)}
                    aria-label={`Selecionar ${company.name}`}
                    className="mt-1"
                  />
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {company.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-foreground truncate mb-1">
                      {company.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{company.cnpj}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onAssignAuditors(company)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Atribuir Avaliador
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{company.admin.email}</span>
              </div>

              {/* Responsible */}
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground text-xs block">Responsável</span>
                  <span className="text-foreground font-medium text-sm truncate block">{company.admin.name}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{company.total_users} usuário{company.total_users !== 1 ? 's' : ''}</span>
              </div>

              {/* Creation Date */}
              <div className="text-xs text-muted-foreground">
                Criado em {formatDate(company.created_at)}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(company)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(company)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>

              {/* Link Models Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => onAssignModels(company)}
                className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                <Link2 className="h-3 w-3 mr-1" />
                Vincular
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
