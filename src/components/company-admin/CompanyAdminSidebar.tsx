import { BarChart3, Building2, ClipboardCheck, LayoutDashboard, Settings, User } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "Dashboard", url: "/admin-empresa", icon: LayoutDashboard },
  { title: "Ambientes", url: "/admin-empresa/ambientes", icon: Building2 },
  { title: "Ciclos de Auditoria", url: "/admin-empresa/ciclos", icon: ClipboardCheck },
  { title: "Minhas Auditorias", url: "/auditor/minhas-auditorias", icon: User },
  { title: "Relatórios", url: "/admin-empresa/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/admin-empresa/configuracoes", icon: Settings },
];

export function CompanyAdminSidebar() {
  const { open } = useSidebar();
  const { companyInfo } = useAuth();
  
  const companyName = companyInfo?.name || 'Empresa';
  const companyInitials = companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sidebar className={!open ? "w-14" : "w-64"}>
      <SidebarContent>
        {/* Company Header */}
        <div className="p-4 border-b border-sidebar-border">
          {open && (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {companyInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">
                  {companyName}
                </h2>
                <Badge variant="secondary" className="text-xs mt-1 bg-accent/20 text-accent-foreground">
                  Admin
                </Badge>
              </div>
            </div>
          )}
          {!open && (
            <Avatar className="h-10 w-10 bg-primary/10 mx-auto">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
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
                          ? "bg-primary/10 text-primary font-medium"
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
