import { NavLink } from "react-router-dom";
import { BarChart3, Building2, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/admin-empresa", icon: LayoutDashboard },
  { title: "Ambientes", url: "/admin-empresa/ambientes", icon: Building2 },
  { title: "Auditorias", url: "/auditor/minhas-auditorias", icon: ClipboardCheck },
  { title: "Relatórios", url: "/admin-empresa/relatorios", icon: BarChart3 },
];

export function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[70px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
