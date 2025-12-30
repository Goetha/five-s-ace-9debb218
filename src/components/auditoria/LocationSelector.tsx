import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Building, Warehouse, WifiOff, RefreshCw } from "lucide-react";
import { OfflineAwareSelect } from "@/components/ui/offline-aware-select";
import { useOfflineEnvironments } from "@/hooks/useOfflineEnvironments";
import { Badge } from "@/components/ui/badge";

interface LocationSelectorProps {
  onLocationSelected: (locationId: string, companyId: string) => void;
}

export function LocationSelector({ onLocationSelected }: LocationSelectorProps) {
  const { user } = useAuth();
  const {
    companies,
    getAreas,
    getEnvironments,
    getLocations,
    isLoading,
    isOffline,
    isFromCache,
    lastSyncAt,
    error,
    refetch,
  } = useOfflineEnvironments(user?.id);

  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Auto-select company if only one
  useEffect(() => {
    if (companies.length === 1 && !selectedCompany) {
      setSelectedCompany(companies[0].id);
    }
  }, [companies, selectedCompany]);

  // Get filtered data based on selections
  const areas = selectedCompany ? getAreas(selectedCompany) : [];
  const environments = selectedArea ? getEnvironments(selectedArea) : [];
  const locations = selectedEnvironment ? getLocations(selectedEnvironment) : [];

  // Reset downstream selections when parent changes
  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
    setSelectedArea("");
    setSelectedEnvironment("");
    setSelectedLocation("");
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedEnvironment("");
    setSelectedLocation("");
  };

  const handleEnvironmentChange = (value: string) => {
    setSelectedEnvironment(value);
    setSelectedLocation("");
  };

  const handleStartAudit = () => {
    if (selectedLocation && selectedCompany) {
      onLocationSelected(selectedLocation, selectedCompany);
    }
  };

  const formatLastSync = (isoDate: string | null) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Card>
    );
  }

  if (error && !isFromCache) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Nova Auditoria 5S</h2>
            {(isOffline || isFromCache) && (
              <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                <WifiOff className="h-3 w-3" />
                {isOffline ? 'Offline' : 'Cache'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Selecione a localização exata que deseja avaliar
          </p>
          {isFromCache && lastSyncAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Última sincronização: {formatLastSync(lastSyncAt)}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {companies.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Empresa
              </Label>
              <OfflineAwareSelect
                value={selectedCompany}
                onValueChange={handleCompanyChange}
                placeholder="Selecione uma empresa"
                items={companies}
                isOffline={isOffline}
                isFromCache={isFromCache}
                getItemValue={(c) => c.id}
                getItemLabel={(c) => c.name}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="area" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Área
            </Label>
            <OfflineAwareSelect
              value={selectedArea}
              onValueChange={handleAreaChange}
              placeholder={
                !selectedCompany
                  ? "Primeiro selecione uma empresa"
                  : areas.length === 0
                  ? "Nenhuma área disponível"
                  : "Selecione uma área"
              }
              items={areas}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(a) => a.id}
              getItemLabel={(a) => a.name}
              disabled={!selectedCompany || areas.length === 0}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ambiente
            </Label>
            <OfflineAwareSelect
              value={selectedEnvironment}
              onValueChange={handleEnvironmentChange}
              placeholder={
                !selectedArea
                  ? "Primeiro selecione uma área"
                  : environments.length === 0
                  ? "Nenhum ambiente disponível"
                  : "Selecione um ambiente"
              }
              items={environments}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(e) => e.id}
              getItemLabel={(e) => e.name}
              disabled={!selectedArea || environments.length === 0}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local
            </Label>
            <OfflineAwareSelect
              value={selectedLocation}
              onValueChange={setSelectedLocation}
              placeholder={
                !selectedEnvironment
                  ? "Primeiro selecione um ambiente"
                  : locations.length === 0
                  ? "Nenhum local disponível"
                  : "Selecione um local"
              }
              items={locations}
              isOffline={isOffline}
              isFromCache={isFromCache}
              getItemValue={(l) => l.id}
              getItemLabel={(l) => l.name}
              disabled={!selectedEnvironment || locations.length === 0}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {!isOffline && isFromCache && (
            <Button variant="outline" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          )}
          <Button 
            onClick={handleStartAudit} 
            disabled={!selectedLocation}
            className="flex-1"
            size="lg"
          >
            Iniciar Auditoria
          </Button>
        </div>
      </div>
    </Card>
  );
}