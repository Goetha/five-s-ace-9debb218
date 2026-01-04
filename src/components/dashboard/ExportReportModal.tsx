import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Search, Building2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { fetchCompanyReportData, generateCompanyReportPDFPremium } from "@/lib/reports";

interface Company {
  id: string;
  name: string;
}

interface ExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
}

export function ExportReportModal({ open, onOpenChange, companies }: ExportReportModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const term = searchTerm.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(term));
  }, [companies, searchTerm]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleExport = async () => {
    if (!selectedCompanyId) return;
    
    setIsExporting(true);
    
    try {
      toast({
        title: "Gerando relatório...",
        description: "Aguarde enquanto o PDF é gerado.",
      });

      const reportData = await fetchCompanyReportData(selectedCompanyId);
      
      if (!reportData) {
        throw new Error("Não foi possível carregar os dados do relatório");
      }

      if (reportData.total_audits === 0) {
        toast({
          title: "Sem dados para exportar",
          description: "Esta empresa ainda não possui auditorias concluídas.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      await generateCompanyReportPDFPremium(reportData);
      
      toast({
        title: "Relatório exportado!",
        description: `PDF gerado com ${reportData.total_audits} auditorias.`,
      });
      
      onOpenChange(false);
      setSelectedCompanyId(null);
      setSearchTerm("");
    } catch (error: any) {
      console.error("[ExportReportModal] Error:", error);
      toast({
        title: "Erro ao exportar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onOpenChange(false);
      setSelectedCompanyId(null);
      setSearchTerm("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-48px)] mx-auto mt-12 sm:mt-0 sm:max-w-[460px] p-0 flex flex-col overflow-hidden rounded-2xl border-border/50">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 p-5 pb-4 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Exportar Relatório</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Selecione a empresa para gerar o PDF
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-background/50"
            />
          </div>

          {/* Company List */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Empresas ({filteredCompanies.length})
            </Label>
            <ScrollArea className="h-[240px] rounded-xl border border-border/50 bg-card">
              <div className="p-2 space-y-1">
                {filteredCompanies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? "Nenhuma empresa encontrada" : "Nenhuma empresa disponível"}
                    </p>
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompanyId(company.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        selectedCompanyId === company.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedCompanyId === company.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        <span className="text-sm font-semibold">
                          {company.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium flex-1 truncate">{company.name}</span>
                      {selectedCompanyId === company.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Info */}
          {selectedCompany && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-muted-foreground">Empresa selecionada:</p>
              <p className="font-semibold text-primary">{selectedCompany.name}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-4 border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
            className="flex-1 h-12 text-base font-medium"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedCompanyId || isExporting}
            className="flex-1 h-12 text-base font-medium"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
