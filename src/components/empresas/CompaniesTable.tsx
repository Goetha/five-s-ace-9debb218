import { Eye, Edit, Link2, MoreVertical, Building, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface CompaniesTableProps {
  companies: Company[];
  selectedCompanies: string[];
  onSelectionChange: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onView: (company: Company) => void;
  onEdit: (company: Company) => void;
  onAssignModels: (company: Company) => void;
  onToggleStatus: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompaniesTable({
  companies,
  selectedCompanies,
  onSelectionChange,
  onSelectAll,
  onView,
  onEdit,
  onAssignModels,
  onToggleStatus,
  onDelete,
}: CompaniesTableProps) {
  const allSelected = companies.length > 0 && selectedCompanies.length === companies.length;

  return (
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead className="w-16">ID</TableHead>
            <TableHead className="w-16"></TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Admin Principal</TableHead>
            <TableHead className="text-center">Usuários</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>Última Atividade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                <Building className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium">Nenhuma empresa encontrada</p>
                <p className="text-sm">Comece cadastrando sua primeira empresa cliente</p>
              </TableCell>
            </TableRow>
          ) : (
            companies.map((company) => (
              <TableRow key={company.id} className="hover:bg-gray-50 transition-colors">
                <TableCell>
                  <Checkbox
                    checked={selectedCompanies.includes(company.id)}
                    onCheckedChange={() => onSelectionChange(company.id)}
                    aria-label={`Selecionar ${company.name}`}
                  />
                </TableCell>
                <TableCell className="text-xs text-gray-500">{company.id}</TableCell>
                <TableCell>
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {company.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-500">{company.cnpj}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{company.admin.name}</p>
                      <p className="text-xs text-gray-500">{company.admin.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
                    {company.total_users}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm text-gray-900">{formatDate(company.created_at)}</p>
                    <p className="text-xs text-gray-500">{getTimeAgo(company.created_at)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {company.last_activity ? (
                    <div>
                      <p className="text-sm text-gray-900">{formatDateTime(company.last_activity)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Nunca acessou</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={company.status === 'active' ? 'default' : 'secondary'}
                    className={
                      company.status === 'active'
                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    }
                  >
                    {company.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(company)}
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(company)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssignModels(company)}
                      title="Atribuir Modelos"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
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
                        <DropdownMenuItem>📧 Enviar Email</DropdownMenuItem>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
