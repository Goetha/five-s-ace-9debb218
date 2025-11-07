import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Environment {
  id: string;
  name: string;
  parent_id: string | null;
}

interface LocationSelectorProps {
  onLocationSelected: (locationId: string) => void;
}

export function LocationSelector({ onLocationSelected }: LocationSelectorProps) {
  const { companyInfo } = useAuth();
  const { toast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [locations, setLocations] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEnvironments();
  }, [companyInfo]);

  useEffect(() => {
    if (selectedEnvironment) {
      fetchLocations(selectedEnvironment);
    } else {
      setLocations([]);
      setSelectedLocation("");
    }
  }, [selectedEnvironment]);

  const fetchEnvironments = async () => {
    if (!companyInfo) return;

    try {
      const { data, error } = await supabase
        .from('environments')
        .select('id, name, parent_id')
        .eq('company_id', companyInfo.id)
        .eq('status', 'active')
        .is('parent_id', null)
        .order('name');

      if (error) throw error;
      setEnvironments(data || []);
    } catch (error) {
      console.error('Error fetching environments:', error);
      toast({
        title: "Erro ao carregar ambientes",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async (environmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('id, name, parent_id')
        .eq('parent_id', environmentId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Erro ao carregar locais",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const handleStartAudit = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">Carregando...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Nova Auditoria 5S</h2>
          <p className="text-muted-foreground">
            Selecione o ambiente e o local que deseja avaliar
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="environment" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ambiente
            </Label>
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger id="environment">
                <SelectValue placeholder="Selecione um ambiente" />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local
            </Label>
            <Select 
              value={selectedLocation} 
              onValueChange={setSelectedLocation}
              disabled={!selectedEnvironment || locations.length === 0}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder={
                  !selectedEnvironment 
                    ? "Primeiro selecione um ambiente" 
                    : locations.length === 0 
                    ? "Nenhum local disponível"
                    : "Selecione um local"
                } />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleStartAudit} 
          disabled={!selectedLocation}
          className="w-full"
          size="lg"
        >
          Iniciar Auditoria
        </Button>
      </div>
    </Card>
  );
}
