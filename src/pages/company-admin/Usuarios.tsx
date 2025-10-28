import { useState } from "react";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users as UsersIcon, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { mockCompanyUsers } from "@/data/mockCompanyUsers";
import { UsersTable } from "@/components/company-admin/users/UsersTable";
import { NewUserModal } from "@/components/company-admin/users/NewUserModal";

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const filteredUsers = mockCompanyUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = mockCompanyUsers.length;
  const admins = mockCompanyUsers.filter((u) => u.role === "company_admin").length;
  const auditors = mockCompanyUsers.filter((u) => u.role === "auditor").length;
  const managers = mockCompanyUsers.filter((u) => u.role === "area_manager").length;
  const viewers = mockCompanyUsers.filter((u) => u.role === "viewer").length;

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Usuários" }]}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Usuários da Empresa</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, perfis e permissões
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground">🔵 Admins</p>
                <p className="text-2xl font-bold">{admins}</p>
                <p className="text-xs text-muted-foreground">(você)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground">🟢 Avaliadores</p>
                <p className="text-2xl font-bold">{auditors}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground">🟡 Gestores</p>
                <p className="text-2xl font-bold">{managers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground">⚪ Visualizadores</p>
                <p className="text-2xl font-bold">{viewers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Perfis</SelectItem>
              <SelectItem value="company_admin">Admin</SelectItem>
              <SelectItem value="auditor">Avaliador</SelectItem>
              <SelectItem value="area_manager">Gestor</SelectItem>
              <SelectItem value="viewer">Visualizador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Users Table */}
        <UsersTable users={filteredUsers} />
      </div>

      <NewUserModal open={isNewModalOpen} onOpenChange={setIsNewModalOpen} />
    </CompanyAdminLayout>
  );
}
