import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface AdvancedFiltersProps {
  companyId: string | null;
  onCompanyChange: (companyId: string | null) => void;
  onClose: () => void;
}

const AdvancedFilters = ({ companyId, onCompanyChange, onClose }: AdvancedFiltersProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    onCompanyChange(null);
  };

  return (
    <Card className="border-2 border-primary/20 mb-4 animate-in slide-in-from-top-2 duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filtros Avançados</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Company Filter */}
          <div className="space-y-2">
            <Label>Filtrar por Empresa</Label>
            <Select
              value={companyId || "todos"}
              onValueChange={(value) => onCompanyChange(value === "todos" ? null : value)}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma empresa"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todas as Empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={handleClearFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={onClose}>Aplicar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
