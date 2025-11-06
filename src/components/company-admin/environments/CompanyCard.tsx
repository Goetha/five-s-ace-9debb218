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
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{company.name}</h2>
                <Badge variant="outline" className="text-xs">Empresa</Badge>
                <span className="text-sm text-muted-foreground">
                  • {totalEnvironments} Ambientes • {totalLocations} Locais
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={onAddEnvironment} className="bg-primary hover:bg-primary/90">
            <Plus className="h-3 w-3 mr-1" />
            Ambiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
