import { BarChart3, Building2, FileText, LayoutDashboard, Settings, User, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { currentCompany } from "@/data/mockCompanyData";

const menuItems = [
  { title: "Dashboard", url: "/admin-empresa", icon: LayoutDashboard },
  { title: "Ambientes", url: "/admin-empresa/ambientes", icon: Building2 },
  { title: "Usuários", url: "/admin-empresa/usuarios", icon: Users },
  { title: "Critérios", url: "/admin-empresa/criterios", icon: FileText },
  { title: "Ciclos de Auditoria", url: "/admin-empresa/ciclos", icon: User },
  { title: "Relatórios", url: "/admin-empresa/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/admin-empresa/configuracoes", icon: Settings },
];

export function CompanyAdminSidebar() {
  const { open } = useSidebar();
  const companyInitials = currentCompany.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sidebar className={!open ? "w-14" : "w-64"}>
      <SidebarContent>
        {/* Company Header */}
        <div className="p-4 border-b">
          {open && (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-emerald-100">
                <AvatarFallback className="bg-emerald-500 text-white font-semibold">
                  {companyInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">
                  {currentCompany.name}
                </h2>
                <Badge variant="secondary" className="text-xs mt-1 bg-emerald-100 text-emerald-700">
                  Admin
                </Badge>
              </div>
            </div>
          )}
          {!open && (
            <Avatar className="h-10 w-10 bg-emerald-100 mx-auto">
              <AvatarFallback className="bg-emerald-500 text-white font-semibold text-xs">
                {companyInitials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-emerald-50 text-emerald-700 font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
