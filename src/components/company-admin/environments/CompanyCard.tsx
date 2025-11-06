import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Factory, MapPin } from "lucide-react";
import type { Environment } from "@/types/environment";

interface CompanyCardProps {
  company: Environment;
  totalEnvironments: number;
  totalLocations: number;
  onAddEnvironment: () => void;
}

export function CompanyCard({ company, totalEnvironments, totalLocations, onAddEnvironment }: CompanyCardProps) {
  return (
    <Card className="border-2 border-primary/50 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/20 rounded-lg">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{company.name}</h2>
              <Badge variant="outline" className="text-xs">Empresa</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {company.description || "Ambiente principal da empresa"}
            </p>
            <div className="flex gap-6 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-orange-500" />
                <span><strong>{totalEnvironments}</strong> Ambientes</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span><strong>{totalLocations}</strong> Locais</span>
              </div>
            </div>
          </div>
          <Button onClick={onAddEnvironment} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ambiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
