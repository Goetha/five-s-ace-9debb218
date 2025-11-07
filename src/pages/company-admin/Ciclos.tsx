import { useNavigate } from "react-router-dom";
import { CompanyAdminLayout } from "@/components/company-admin/CompanyAdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";

export default function Ciclos() {
  const navigate = useNavigate();

  return (
    <CompanyAdminLayout breadcrumbs={[{ label: "Ciclos de Auditoria" }]}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Ciclos de Auditoria</h1>
            <p className="text-muted-foreground">Gerencie seus ciclos de avaliação 5S</p>
          </div>
        </div>

        <Card className="p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Comece sua primeira auditoria</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No sistema simplificado, você pode criar auditorias diretamente sem precisar configurar ciclos complexos.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={() => navigate('/auditor/nova-auditoria')} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nova Auditoria
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auditor/minhas-auditorias')}
              size="lg"
            >
              Ver Minhas Auditorias
            </Button>
          </div>
        </Card>
      </div>
    </CompanyAdminLayout>
  );
}
