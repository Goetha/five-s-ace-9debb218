import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const notificationCount = 3;
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              5S
            </div>
            <span className="text-xl font-bold text-foreground">Manager</span>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive("/") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/empresas"
              className={`text-sm font-medium transition-colors ${
                isActive("/empresas") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              Empresas
            </Link>
            <Link
              to="/modelos-mestre"
              className={`text-sm font-medium transition-colors ${
                isActive("/modelos-mestre") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              Modelos Mestre
            </Link>
            <Link
              to="/criterios"
              className={`text-sm font-medium transition-colors ${
                isActive("/criterios") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              Biblioteca
            </Link>
          </nav>
        </div>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">Admin IFA</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Meu Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-error">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
