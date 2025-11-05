import { Eye, Edit, Link2, MoreVertical, Building, Mail, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Company } from "@/types/company";
import { formatDate, formatDateTime, getTimeAgo } from "@/lib/formatters";

interface CompanyCardsProps {
  companies: Company[];
  selectedCompanies: string[];
  onSelectionChange: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onView: (company: Company) => void;
  onEdit: (company: Company) => void;
  onAssignModels: (company: Company) => void;
  onToggleStatus: (company: Company) => void;
  onDelete: (company: Company) => void;
  onSendEmail: (company: Company) => void;
}

export function CompanyCards({
  companies,
  selectedCompanies,
  onSelectionChange,
  onSelectAll,
  onView,
  onEdit,
  onAssignModels,
  onToggleStatus,
  onDelete,
  onSendEmail,
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {companies.map((company) => (
          <Card
            key={company.id}
            className={`transition-all hover:shadow-md ${
              selectedCompanies.includes(company.id) ? 'ring-2 ring-primary' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedCompanies.includes(company.id)}
                    onCheckedChange={() => onSelectionChange(company.id)}
                    aria-label={`Selecionar ${company.name}`}
                    className="mt-1"
                  />
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {company.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {company.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">ID: {company.id}</p>
                    <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={company.status === 'active' ? 'default' : 'secondary'}
                    className={
                      company.status === 'active'
                        ? 'bg-success/10 text-success hover:bg-success/10'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }
                  >
                    {company.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(company)}>
                        👤 Gerenciar Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem>👥 Ver Usuários</DropdownMenuItem>
                      <DropdownMenuItem>📊 Ver Estatísticas</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendEmail(company)}>
                        📧 Enviar Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(company)}>
                        🔄 {company.status === 'active' ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(company)}
                        className="text-red-600 focus:text-red-600"
                      >
                        🗑️ Excluir Empresa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Admin Info */}
              <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Admin Principal</p>
                  <p className="text-sm font-medium text-foreground truncate">{company.admin.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{company.admin.email}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{company.total_users}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Cadastro</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(company.created_at)}</p>
                  <p className="text-xs text-muted-foreground">{getTimeAgo(company.created_at)}</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Atividade</p>
                  {company.last_activity ? (
                    <>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(company.last_activity).split(' ')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(company.last_activity).split(' ')[1]}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nunca acessou</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(company)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(company)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAssignModels(company)}
                  className="flex-1"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Modelos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
