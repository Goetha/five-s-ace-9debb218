import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchAuditReportData, fetchCompanyReportData } from '@/lib/reports/reportDataFormatter';
import { generateAuditPDF, generateCompanyReportPDF } from '@/lib/reports/pdfGenerator';
import { generateAuditExcel, generateCompanyExcel } from '@/lib/reports/excelGenerator';

interface ExportAuditButtonProps {
  auditId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportAuditButton({ auditId, variant = 'outline', size = 'default' }: ExportAuditButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'pdf' | 'excel' | null>(null);
  const { toast } = useToast();

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsLoading(true);
    setLoadingType(type);

    try {
      const data = await fetchAuditReportData(auditId);
      
      if (!data) {
        toast({
          title: 'Erro ao gerar relatório',
          description: 'Não foi possível carregar os dados da auditoria.',
          variant: 'destructive',
        });
        return;
      }

      if (type === 'pdf') {
        await generateAuditPDF(data);
        toast({
          title: 'PDF gerado com sucesso!',
          description: 'O download foi iniciado.',
        });
      } else {
        generateAuditExcel(data);
        toast({
          title: 'Excel gerado com sucesso!',
          description: 'O download foi iniciado.',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Gerando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          Baixar PDF
          {loadingType === 'pdf' && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Baixar Excel
          {loadingType === 'excel' && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ExportCompanyButtonProps {
  companyId: string;
  companyName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportCompanyButton({ companyId, companyName, variant = 'outline', size = 'default' }: ExportCompanyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'pdf' | 'excel' | null>(null);
  const { toast } = useToast();

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsLoading(true);
    setLoadingType(type);

    // Global timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setLoadingType(null);
      toast({
        title: 'Tempo esgotado',
        description: 'A geração do relatório demorou muito. Tente novamente.',
        variant: 'destructive',
      });
    }, 60000); // 60 seconds max

    try {
      console.log('[Export] Starting company report export:', type);
      const data = await fetchCompanyReportData(companyId);
      
      if (!data) {
        clearTimeout(timeoutId);
        toast({
          title: 'Erro ao gerar relatório',
          description: 'Não foi possível carregar os dados da empresa.',
          variant: 'destructive',
        });
        return;
      }

      if (data.total_audits === 0) {
        clearTimeout(timeoutId);
        toast({
          title: 'Sem dados',
          description: 'Esta empresa não possui auditorias concluídas.',
          variant: 'destructive',
        });
        return;
      }

      console.log('[Export] Data loaded, generating', type, '- audits:', data.total_audits, 'nc:', data.non_conformities.length);

      if (type === 'pdf') {
        await generateCompanyReportPDF(data);
        toast({
          title: 'PDF gerado com sucesso!',
          description: 'O download foi iniciado.',
        });
      } else {
        generateCompanyExcel(data);
        toast({
          title: 'Excel gerado com sucesso!',
          description: 'O download foi iniciado.',
        });
      }
      
      console.log('[Export] Export complete');
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Gerando...' : 'Relatório'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          PDF Executivo
          {loadingType === 'pdf' && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel Detalhado
          {loadingType === 'excel' && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
