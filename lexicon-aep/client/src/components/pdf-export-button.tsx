import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PDFExportButtonProps {
  className?: string;
}

export function PDFExportButton({ className }: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (isExporting) return; // Prevent multiple clicks
    setIsExporting(true);
    
    try {
      // Direct the browser to download the PDF
      window.location.href = `/api/export/pdf?t=${Date.now()}`;
      
      // Show success toast
      toast({
        title: "PDF Export",
        description: "Your PDF is being generated and will download automatically.",
      });
      
      // Reset exporting state after a delay
      setTimeout(() => {
        setIsExporting(false);
      }, 2000);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className={cn("bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0", className)}
      disabled={isExporting}
    >
      <FileText className="h-4 w-4 mr-2" />
      {isExporting ? "Generating PDF..." : "Export to PDF"}
    </Button>
  );
}