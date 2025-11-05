import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const notificationCount = 3;
  const location = useLocation();
  const { user, signOut, userRole } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };
  
  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'ifa_admin': return 'IFA Admin';
      case 'company_admin': return 'Admin da Empresa';
      case 'auditor': return 'Auditor';
      default: return 'Usuário';
    }
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
              to="/avaliadores"
              className={`text-sm font-medium transition-colors ${
                isActive("/avaliadores") 
                  ? "text-primary border-b-2 border-primary pb-1" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              Avaliadores
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
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getRoleLabel(userRole)}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
