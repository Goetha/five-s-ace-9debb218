import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Play, 
  RotateCcw,
  Trophy
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AuditCycleWithDetails } from "@/types/auditCycle";

interface CycleProgressCardProps {
  companyId: string;
  companyName: string;
  activeCycle: AuditCycleWithDetails | null;
  onStartCycle: (companyId: string, companyName: string) => void;
  onContinueCycle: (companyId: string, companyName: string, cycleId: string) => void;
}

export function CycleProgressCard({ 
  companyId, 
  companyName, 
  activeCycle,
  onStartCycle,
  onContinueCycle
}: CycleProgressCardProps) {
  const progress = activeCycle 
    ? Math.round((activeCycle.completed_locations / activeCycle.total_locations) * 100) 
    : 0;
  
  const remaining = activeCycle 
    ? activeCycle.total_locations - activeCycle.completed_locations 
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3 p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg text-foreground truncate">
                {companyName}
              </CardTitle>
              {activeCycle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ciclo iniciado em {format(new Date(activeCycle.started_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
          
          {activeCycle ? (
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary border-primary/30 flex-shrink-0"
            >
              <Clock className="h-3 w-3 mr-1" />
              Em Andamento
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="bg-muted text-muted-foreground flex-shrink-0"
            >
              Sem ciclo ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-4">
        {activeCycle ? (
          <>
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso do Ciclo</span>
                <span className="font-semibold text-primary">
                  {activeCycle.completed_locations}/{activeCycle.total_locations} locais
                </span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress}% concluído</span>
                <span>{remaining} {remaining === 1 ? 'local restante' : 'locais restantes'}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700">Avaliados</span>
                </div>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {activeCycle.completed_locations}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-orange-700">Pendentes</span>
                </div>
                <p className="text-xl font-bold text-orange-700 mt-1">
                  {remaining}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={() => onContinueCycle(companyId, companyName, activeCycle.id)}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Continuar Ciclo
            </Button>

            {/* Completion Notice */}
            {progress === 100 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">Ciclo completo!</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Todos os locais foram avaliados. Você pode iniciar um novo ciclo.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* No Active Cycle */}
            <div className="text-center py-4 space-y-3">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nenhum ciclo de auditoria ativo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Inicie um novo ciclo para avaliar todos os locais desta empresa
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => onStartCycle(companyId, companyName)}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Novo Ciclo
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
