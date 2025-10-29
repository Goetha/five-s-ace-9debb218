import { SidebarProvider } from "@/components/ui/sidebar";
import { CompanyAdminSidebar } from "./CompanyAdminSidebar";
import { CompanyAdminHeader } from "./CompanyAdminHeader";

interface CompanyAdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs: { label: string; href?: string }[];
}

export function CompanyAdminLayout({ children, breadcrumbs }: CompanyAdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CompanyAdminSidebar />
        <div className="flex-1 flex flex-col">
          <CompanyAdminHeader breadcrumbs={breadcrumbs} />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
