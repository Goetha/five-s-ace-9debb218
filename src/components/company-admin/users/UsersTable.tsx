import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyUser } from "@/types/companyUser";
import { Eye, MoreVertical, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


interface UsersTableProps {
  users: CompanyUser[];
}

const roleColors: Record<string, string> = {
  company_admin: "bg-blue-100 text-blue-700 border-blue-200",
  auditor: "bg-green-100 text-green-700 border-green-200",
  area_manager: "bg-yellow-100 text-yellow-700 border-yellow-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
};

export function UsersTable({ users }: UsersTableProps) {
  // Environment names will be passed as prop or fetched separately
  const getEnvironmentNames = (envIds: string[]) => {
    // For now, just show count - parent component can fetch env names if needed
    return envIds.map(() => "Ambiente");
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Ambientes Vinculados</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Último Acesso</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const envNames = getEnvironmentNames(user.linked_environments);
            const displayEnvs = envNames.slice(0, 2);
            const moreCount = envNames.length - 2;

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleColors[user.role]}>
                    {user.role_label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {envNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {displayEnvs.map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      {moreCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{moreCount} mais
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {user.role === "company_admin" ? "Todos" : "Nenhum"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {user.status === "active" ? (
                    <Badge className="bg-emerald-500">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.last_access ? (
                    <span className="text-sm">
                      {format(new Date(user.last_access), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nunca acessou</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>🔑 Resetar Senha</DropdownMenuItem>
                        <DropdownMenuItem>📧 Enviar Email</DropdownMenuItem>
                        <DropdownMenuItem>🔄 Alternar Status</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          🗑️ Excluir Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
