import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Factory, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import type { Environment } from "@/types/environment";

interface CompanyCardProps {
  company: Environment;
  totalEnvironments: number;
  totalLocations: number;
  onAddEnvironment: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CompanyCard({ company, totalEnvironments, totalLocations, onAddEnvironment, isExpanded, onToggleExpand }: CompanyCardProps) {
  return (
    <Card className="border-2 border-primary/50 bg-primary/5 card-hover touch-feedback transition-all duration-300 hover:border-primary/80 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Botão de Expandir/Colapsar */}
            {totalEnvironments > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-6 w-6 p-0 shrink-0 transition-all duration-200 hover:bg-primary/10"
              >
                <ChevronDown 
                  className={`h-4 w-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
                />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">{company.name}</h2>
                <Badge 
                  variant="outline" 
                  className="text-xs shrink-0 badge-hover transition-all duration-200 hover:bg-primary/10"
                >
                  Empresa
                </Badge>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {totalEnvironments} Áreas • {totalLocations} Ambientes/Locais
              </div>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={onAddEnvironment} 
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto shrink-0 btn-hover transition-all duration-200 hover:shadow-md hover:shadow-primary/20"
          >
            <Plus className="h-3 w-3 mr-1 transition-transform duration-200 group-hover:rotate-90" />
            Nova Área
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
