import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface EmptyAuditWarningProps {
  auditId: string;
  locationName?: string;
}

export function EmptyAuditWarning({ auditId, locationName }: EmptyAuditWarningProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const backLink = userRole === 'ifa_admin' ? '/auditorias' : '/auditor/minhas-auditorias';

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-amber-900">
              Esta auditoria não possui critérios de avaliação
            </h3>
            {locationName && (
              <p className="text-sm text-amber-700">Local: {locationName}</p>
            )}
            <p className="text-sm text-amber-800 max-w-md">
              Isso pode ter ocorrido porque:
            </p>
            <ul className="text-sm text-amber-700 space-y-1 text-left max-w-md mx-auto">
              <li>• Não havia critérios ativos quando a auditoria foi criada</li>
              <li>• O ambiente/local não possui critérios vinculados</li>
              <li>• Houve um erro durante a criação da auditoria</li>
            </ul>
          </div>

          <div className="flex gap-3 flex-wrap justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(backLink)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              variant="default"
              onClick={() => {
                window.location.href = 'mailto:suporte@ifa.com?subject=Auditoria sem critérios&body=ID da Auditoria: ' + auditId;
              }}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Contatar Administrador
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
