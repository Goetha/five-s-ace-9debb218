import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyUser } from "@/types/companyUser";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EditUserModal } from "./EditUserModal";

interface UsersTableProps {
  users: CompanyUser[];
  onRefresh?: () => void;
}

const roleColors: Record<string, string> = {
  company_admin: "bg-blue-100 text-blue-700 border-blue-200",
  auditor: "bg-green-100 text-green-700 border-green-200",
  area_manager: "bg-yellow-100 text-yellow-700 border-yellow-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
};

export function UsersTable({ users, onRefresh }: UsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CompanyUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<CompanyUser | null>(null);
  const { toast } = useToast();

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDeleteSelected = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-company-users', {
        body: { userIds: selectedUsers }
      });

      if (error || !data?.success) {
        const failedCount = Array.isArray((data as any)?.failed) ? (data as any).failed.length : 0;
        toast({
          title: "Erro ao excluir",
          description: failedCount > 0 
            ? `Falha ao excluir ${failedCount} usuário(s). Tente novamente.`
            : (data as any)?.message || error?.message || 'Falha ao excluir usuários',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✓ Usuários excluídos",
        description: `${selectedUsers.length} usuário(s) foram removidos.`,
      });

      setSelectedUsers([]);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting users:", error);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível excluir os usuários.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (user: CompanyUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-company-users', {
        body: { userIds: [userToDelete.id] }
      });
      
      if (error || !data?.success) {
        toast({
          title: "Erro ao excluir",
          description: data?.message || error?.message || 'Falha ao excluir usuário',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✓ Usuário excluído",
        description: `${userToDelete.name} foi removido.`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    }
  };

  // Environment names will be passed as prop or fetched separately
  const getEnvironmentNames = (envIds: string[]) => {
    // For now, just show count - parent component can fetch env names if needed
    return envIds.map(() => "Ambiente");
  };

  return (
    <>
      {selectedUsers.length > 0 && (
        <div className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedUsers.length} usuário(s) selecionado(s)
          </span>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Selecionados
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                />
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
                  <Checkbox 
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleSelectUser(user.id)}
                    aria-label={`Selecionar ${user.name}`}
                  />
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      title="Editar usuário"
                      onClick={() => {
                        setUserToEdit(user);
                        setEditModalOpen(true);
                      }}
                    >
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
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Usuário
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

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
            Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={confirmDelete}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <EditUserModal
      open={editModalOpen}
      onOpenChange={setEditModalOpen}
      user={userToEdit}
      onSuccess={() => {
        if (onRefresh) onRefresh();
      }}
    />
    </>
  );
}
