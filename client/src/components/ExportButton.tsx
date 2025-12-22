import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2, MessageSquare, Activity } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportButton({ variant = "outline", size = "default", className }: ExportButtonProps) {
  const performanceReportMutation = trpc.export.performanceReport.useMutation({
    onSuccess: (data) => {
      downloadFile(data.data, data.filename, data.contentType);
      toast.success(`Rapport exporté: ${data.filename}`);
    },
    onError: (error) => {
      toast.error(`Erreur d'export: ${error.message}`);
    },
  });

  const downloadFile = (base64Data: string, filename: string, contentType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportPerformance = () => {
    performanceReportMutation.mutate({
      includeHardware: true,
      includeTasks: true,
      includeJobs: true,
    });
  };

  const isLoading = performanceReportMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exporter en PDF/HTML</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPerformance} disabled={isLoading}>
          <Activity className="h-4 w-4 mr-2" />
          Rapport de Performance
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <MessageSquare className="h-4 w-4 mr-2" />
          Historique Chat (depuis le chat)
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FileText className="h-4 w-4 mr-2" />
          Document (depuis la base)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for chat export
export function useChatExport() {
  const chatHistoryMutation = trpc.export.chatHistory.useMutation({
    onSuccess: (data) => {
      downloadFile(data.data, data.filename, data.contentType);
      toast.success(`Historique exporté: ${data.messageCount} messages`);
    },
    onError: (error) => {
      toast.error(`Erreur d'export: ${error.message}`);
    },
  });

  const downloadFile = (base64Data: string, filename: string, contentType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return {
    exportChat: chatHistoryMutation.mutate,
    isExporting: chatHistoryMutation.isPending,
  };
}

// Hook for document export
export function useDocumentExport() {
  const documentMutation = trpc.export.knowledgeDocument.useMutation({
    onSuccess: (data) => {
      downloadFile(data.data, data.filename, data.contentType);
      toast.success(`Document exporté: ${data.title}`);
    },
    onError: (error) => {
      toast.error(`Erreur d'export: ${error.message}`);
    },
  });

  const downloadFile = (base64Data: string, filename: string, contentType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return {
    exportDocument: documentMutation.mutate,
    isExporting: documentMutation.isPending,
  };
}
